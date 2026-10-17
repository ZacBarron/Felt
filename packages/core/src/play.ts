import { type Card, FULL_DECK } from './cards';
import type { Rng } from './equity';
import { CATEGORY_NAMES, categoryOf, evaluate } from './evaluator';
import { type Position, positionsFor } from './settings';

/**
 * No limit hold'em hand engine for Play.
 *
 * Pure and immutable: every function takes a state and returns a new one, so
 * a hand can be replayed, graded and tested step by step. Amounts are in big
 * blinds. Dealing is seeded, so the same seed deals the same hand.
 *
 * Rules follow standard no limit cash play: blinds (and an optional ante),
 * the big blind's option, a minimum raise of the last full raise, an all in
 * short of a full raise that does not reopen betting for players who already
 * acted, side pots by contribution, and split pots on ties.
 */

export type PlayStreet = 'preflop' | 'flop' | 'turn' | 'river';
export const PLAY_STREETS: PlayStreet[] = ['preflop', 'flop', 'turn', 'river'];

export interface TableSetup {
  /** Starting stack of each seat, in seat order. 2 to 10 seats. */
  stacks: number[];
  /** Seat with the dealer button. */
  button: number;
  /** Small blind. Default 0.5. */
  sb?: number;
  /** Big blind. Default 1. */
  bb?: number;
  /** Ante from every seat. Default 0. */
  ante?: number;
  /**
   * A live straddle: the seat after the big blind posts this much blind,
   * usually 2bb. It acts like a third blind, so the action starts after it
   * and it gets the last word preflop. Needs 3 or more seats. Default 0.
   */
  straddle?: number;
}

export interface PlayerState {
  seat: number;
  position: Position;
  /** Chips behind. */
  stack: number;
  /** Put in on this street. */
  street: number;
  /** Put in this hand, blinds and antes included. */
  total: number;
  folded: boolean;
  allIn: boolean;
  /** Whether this player may still raise on this street. A short all in does not reopen it. */
  canRaise: boolean;
  cards: [Card, Card];
}

export type PlayAction = { kind: 'fold' } | { kind: 'check' } | { kind: 'call' } | { kind: 'bet'; to: number } | { kind: 'raise'; to: number };

export interface ActionRecord {
  seat: number;
  street: PlayStreet;
  kind: 'ante' | 'sb' | 'bb' | 'straddle' | PlayAction['kind'];
  /** Chips this action added. */
  amount: number;
  /** The player's total on this street after the action. */
  to: number;
  allIn: boolean;
  /** Pot before the action, every street included. */
  potBefore: number;
  /** Chips needed to call before the action. */
  toCall: number;
}

export interface PotResult {
  amount: number;
  eligible: number[];
  winners: number[];
}

export interface HandResult {
  /** True when two or more players showed their cards. */
  showdown: boolean;
  pots: PotResult[];
  /** Chips each seat won back from the pot. */
  won: number[];
  /** Won minus put in, per seat. */
  net: number[];
  /** Best five card hand name per seat that showed down. */
  hands: Record<number, string>;
}

export interface HandState {
  players: PlayerState[];
  button: number;
  bb: number;
  street: PlayStreet;
  board: Card[];
  /** Undealt cards, top first. */
  deck: Card[];
  /** Seat to act, or null when the hand is over. */
  toAct: number | null;
  /** Highest street total. */
  currentBet: number;
  /** Size of the last full bet or raise, the minimum raise increment. */
  lastRaise: number;
  /** Seats that must still act on this street. */
  pending: number[];
  log: ActionRecord[];
  result?: HandResult;
}

export interface LegalActions {
  /** Folding is offered only when there is something to call. */
  fold: boolean;
  check: boolean;
  /** Chips a call adds, 0 when there is nothing to call. */
  call: number;
  /** Calling puts the player all in. */
  callAllIn: boolean;
  /** Range of street totals for a bet or raise, when one is allowed. `max` is all in. */
  raise?: { kind: 'bet' | 'raise'; min: number; max: number };
}

const EPS = 1e-9;

/** Fisher-Yates with a seeded generator. */
export function shuffledDeck(rng: Rng): Card[] {
  const deck = [...FULL_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Position names by seat: the button is BTN and the names run in preflop order. */
export function seatPositions(seats: number, button: number): Position[] {
  const names = positionsFor(seats);
  // Preflop action starts at the button heads up, else three seats after it.
  const start = seats === 2 ? button : button + 3;
  const out = new Array<Position>(seats);
  names.forEach((name, k) => (out[(start + k) % seats] = name));
  return out;
}

export function potSize(state: Pick<HandState, 'players'>): number {
  return state.players.reduce((s, p) => s + p.total, 0);
}

const live = (p: PlayerState) => !p.folded;
const canAct = (p: PlayerState) => !p.folded && !p.allIn;

function nextSeat(state: HandState, from: number, ok: (p: PlayerState) => boolean): number | null {
  const n = state.players.length;
  for (let k = 1; k <= n; k++) {
    const s = (from + k) % n;
    if (ok(state.players[s])) return s;
  }
  return null;
}

function put(state: HandState, seat: number, amount: number, kind: ActionRecord['kind']) {
  const p = state.players[seat];
  const toCall = Math.max(0, state.currentBet - p.street);
  const pay = Math.min(amount, p.stack);
  const potBefore = potSize(state);
  p.stack -= pay;
  if (kind !== 'ante') p.street += pay;
  p.total += pay;
  if (p.stack <= EPS) {
    p.stack = 0;
    p.allIn = true;
  }
  state.log.push({ seat, street: state.street, kind, amount: pay, to: p.street, allIn: p.allIn, potBefore, toCall });
}

function clone(state: HandState): HandState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    board: [...state.board],
    deck: [...state.deck],
    pending: [...state.pending],
    log: [...state.log],
  };
}

/** Deals a new hand: posts antes and blinds and deals two cards to each seat. */
export function startHand(setup: TableSetup, rng: Rng): HandState {
  const deck = shuffledDeck(rng);
  return startHandWithDeck(setup, deck);
}

/** Like `startHand` with a known deck, top card first. Cards go one at a time from the small blind. */
export function startHandWithDeck(setup: TableSetup, deckIn: readonly Card[]): HandState {
  const n = setup.stacks.length;
  if (n < 2 || n > 10) throw new Error('A table needs 2 to 10 seats');
  if (setup.stacks.some((s) => !(s > 0))) throw new Error('Every seat needs chips');
  const bb = setup.bb ?? 1;
  const sb = setup.sb ?? bb / 2;
  const ante = setup.ante ?? 0;
  const button = ((setup.button % n) + n) % n;
  const deck = [...deckIn];
  const names = seatPositions(n, button);
  const sbSeat = n === 2 ? button : (button + 1) % n;
  const bbSeat = (sbSeat + 1) % n;
  const hands: Card[][] = Array.from({ length: n }, () => []);
  for (let round = 0; round < 2; round++) for (let k = 0; k < n; k++) hands[(sbSeat + k) % n].push(deck.shift()!);
  const state: HandState = {
    players: setup.stacks.map((stack, seat) => ({
      seat,
      position: names[seat],
      stack,
      street: 0,
      total: 0,
      folded: false,
      allIn: false,
      canRaise: true,
      cards: hands[seat] as [Card, Card],
    })),
    button,
    bb,
    street: 'preflop',
    board: [],
    deck,
    toAct: null,
    currentBet: 0,
    lastRaise: bb,
    pending: [],
    log: [],
  };
  if (ante > 0) for (let s = 0; s < n; s++) put(state, s, ante, 'ante');
  put(state, sbSeat, sb, 'sb');
  put(state, bbSeat, bb, 'bb');
  let lastBlind = bbSeat;
  const straddle = n >= 3 ? (setup.straddle ?? 0) : 0;
  if (straddle > bb) {
    lastBlind = (bbSeat + 1) % n;
    put(state, lastBlind, straddle, 'straddle');
    // A straddle is a full raise of the big blind: the next raise goes to twice the straddle.
    state.lastRaise = straddle;
  }
  state.currentBet = Math.max(...state.players.map((p) => p.street));
  state.pending = state.players.filter(canAct).map((p) => p.seat);
  return settle(state, lastBlind);
}

/** What the player to act may do. */
export function legalActions(state: HandState): LegalActions {
  if (state.toAct === null) throw new Error('The hand is over');
  const p = state.players[state.toAct];
  const toCall = Math.max(0, state.currentBet - p.street);
  const call = Math.min(toCall, p.stack);
  const legal: LegalActions = { fold: toCall > EPS, check: toCall <= EPS, call, callAllIn: toCall > EPS && call >= p.stack - EPS };
  const max = p.street + p.stack;
  // Someone must be left to call a raise.
  const others = state.players.some((o) => o.seat !== p.seat && canAct(o));
  if (p.canRaise && max > state.currentBet + EPS && others) {
    const kind = state.currentBet > EPS ? 'raise' : 'bet';
    const min = kind === 'bet' ? Math.max(state.bb, 0) : state.currentBet + state.lastRaise;
    legal.raise = { kind, min: Math.min(min, max), max };
  }
  return legal;
}

/** Applies the acting player's action and moves the hand on. */
export function act(state: HandState, action: PlayAction): HandState {
  const legal = legalActions(state);
  const next = clone(state);
  const seat = state.toAct!;
  const p = next.players[seat];
  next.pending = next.pending.filter((s) => s !== seat);
  switch (action.kind) {
    case 'fold':
      if (!legal.fold) throw new Error('Nothing to fold to: check instead');
      p.folded = true;
      next.log.push({ seat, street: next.street, kind: 'fold', amount: 0, to: p.street, allIn: false, potBefore: potSize(next), toCall: next.currentBet - p.street });
      break;
    case 'check':
      if (!legal.check) throw new Error('There is a bet to call');
      next.log.push({ seat, street: next.street, kind: 'check', amount: 0, to: p.street, allIn: false, potBefore: potSize(next), toCall: 0 });
      break;
    case 'call':
      if (legal.call <= EPS) throw new Error('Nothing to call');
      put(next, seat, legal.call, 'call');
      break;
    case 'bet':
    case 'raise': {
      const r = legal.raise;
      if (!r || r.kind !== action.kind) throw new Error(`Cannot ${action.kind} now`);
      const to = Math.min(action.to, r.max);
      if (to < r.min - EPS) throw new Error(`The smallest ${action.kind} is to ${r.min}`);
      const before = next.currentBet;
      put(next, seat, to - p.street, action.kind);
      const increment = p.street - before;
      if (increment >= next.lastRaise - EPS) {
        // A full raise reopens the betting for everyone still able to act.
        next.lastRaise = increment;
        for (const o of next.players) if (o.seat !== seat && canAct(o)) o.canRaise = true;
        next.pending = next.players.filter((o) => o.seat !== seat && canAct(o)).map((o) => o.seat);
      } else {
        // A short all in: everyone must answer it, but those who already acted cannot raise again.
        for (const o of next.players) {
          if (o.seat === seat || !canAct(o)) continue;
          if (!next.pending.includes(o.seat)) {
            o.canRaise = false;
            next.pending.push(o.seat);
          }
        }
      }
      next.currentBet = Math.max(next.currentBet, p.street);
      break;
    }
  }
  return settle(next, seat);
}

/** After an action: pick who acts next, or close the street, or end the hand. */
function settle(state: HandState, from: number): HandState {
  const alive = state.players.filter(live);
  if (alive.length === 1) return finish(state);
  state.pending = state.pending.filter((s) => canAct(state.players[s]));
  // A player facing no bet who is the only one able to act has nothing to decide.
  const actors = state.players.filter(canAct);
  if (state.pending.length > 0 && !(actors.length === 1 && actors[0].street >= state.currentBet - EPS)) {
    state.toAct = nextSeat(state, from, (p) => state.pending.includes(p.seat));
    return state;
  }
  return nextStreet(state);
}

function nextStreet(state: HandState): HandState {
  if (state.street === 'river') return finish(state);
  const street = PLAY_STREETS[PLAY_STREETS.indexOf(state.street) + 1];
  state.street = street;
  state.board.push(...state.deck.splice(0, street === 'flop' ? 3 : 1));
  for (const p of state.players) {
    p.street = 0;
    p.canRaise = true;
  }
  state.currentBet = 0;
  state.lastRaise = state.bb;
  const actors = state.players.filter(canAct);
  if (actors.length < 2) {
    state.pending = [];
    return nextStreet(state);
  }
  state.pending = actors.map((p) => p.seat);
  state.toAct = nextSeat(state, state.button, (p) => state.pending.includes(p.seat));
  return state;
}

/** Splits the pot into main and side pots by contribution and pays the best hands. */
function finish(state: HandState): HandState {
  state.toAct = null;
  state.pending = [];
  const n = state.players.length;
  const alive = state.players.filter(live);
  const won = new Array<number>(n).fill(0);
  const hands: Record<number, string> = {};
  const pots: PotResult[] = [];
  const showdown = alive.length > 1;
  if (!showdown) {
    won[alive[0].seat] = potSize(state);
    pots.push({ amount: potSize(state), eligible: [alive[0].seat], winners: [alive[0].seat] });
  } else {
    // Deal out any board cards still to come: everyone left is all in or has called.
    while (state.board.length < 5) state.board.push(state.deck.shift()!);
    const score = new Map<number, number>();
    for (const p of alive) {
      const s = evaluate([...p.cards, ...state.board]);
      score.set(p.seat, s);
      hands[p.seat] = CATEGORY_NAMES[categoryOf(s)];
    }
    const levels = [...new Set(state.players.map((p) => p.total).filter((t) => t > EPS))].sort((a, b) => a - b);
    let prev = 0;
    let carry = 0;
    for (const level of levels) {
      const amount = state.players.reduce((s, p) => s + Math.min(p.total, level) - Math.min(p.total, prev), 0) + carry;
      prev = level;
      const eligible = alive.filter((p) => p.total >= level - EPS).map((p) => p.seat);
      if (eligible.length === 0) {
        carry = amount;
        continue;
      }
      carry = 0;
      const best = Math.max(...eligible.map((s) => score.get(s)!));
      const winners = eligible.filter((s) => score.get(s) === best);
      for (const w of winners) won[w] += amount / winners.length;
      // A layer only one player reached is their own uncalled chips coming back.
      const last = pots[pots.length - 1];
      if (last && last.eligible.join() === eligible.join()) last.amount += amount;
      else pots.push({ amount, eligible, winners });
    }
  }
  state.result = { showdown, pots, won, net: state.players.map((p, i) => won[i] - p.total), hands };
  return state;
}

/** The pot to show on the table: chips in the middle plus this street's bets. */
export function streetBets(state: HandState): number {
  return state.players.reduce((s, p) => s + p.street, 0);
}

/** The straddle posted this hand, 0 when there is none. */
export function straddleOf(state: Pick<HandState, 'log'>): number {
  return state.log.find((a) => a.kind === 'straddle')?.amount ?? 0;
}

/** Each seat's stack once a finished hand is paid out: what was behind plus what came back. */
export function stacksAfter(state: HandState): number[] {
  if (!state.result) throw new Error('The hand is not over');
  return state.players.map((p, i) => p.stack + state.result!.won[i]);
}

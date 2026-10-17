import { type Card, rankIndex, remainingDeck, suitIndex } from './cards';
import type { HandMix } from './charts';
import type { Rng } from './equity';
import { evaluate } from './evaluator';
import { type HandState, legalActions, type PlayAction, PLAY_STREETS, potSize, straddleOf } from './play';
import { preflopPercentile } from './preflopStrength';
import { handClassOf, type HandClass, type WeightedCombo } from './ranges';
import type { Position } from './settings';

/**
 * Play's bots. A bot's policy returns a mix over legal actions, never a
 * single forced action, and depends only on the state and the bot's cards.
 * That makes it possible to work out a bot's real range after any history:
 * weigh every holding by how likely the bot was to take the actions it took.
 *
 * Preflop the baseline is Aced's chart for the spot when one exists
 * (through an advisor the app supplies) and a hand strength order elsewhere.
 * Postflop the baseline is a rule based policy on how strong the hand is now
 * against all possible holdings, draws, the price and the number of players.
 * Every postflop number here is a model choice, not a solver result, so the
 * app labels these bots approximate.
 */

export interface BotStyle {
  /** How wide it plays preflop against the baseline: 1 is the baseline, 2 twice as many hands. */
  looseness: number;
  /** How often it raises rather than calls, 0 to 1. 0.5 keeps the baseline's split. */
  aggression: number;
  /** How much a bet scares it: 1 is the baseline, below 1 calls more, above 1 folds more. */
  foldiness: number;
  /** How often it bets or raises with weak hands, 0 to 1. */
  bluff: number;
  /** Share of its opening hands it limps rather than raises, 0 to 1. */
  limp: number;
  /** Bet sizes it likes, as shares of the pot, smallest first. */
  sizes: number[];
  /** Its open size in big blinds. Online it is 2.5 (3 from the small blind); live games open bigger. */
  openTo?: number;
}

export interface BotProfile {
  style: BotStyle;
  /** 0 to 1. Lower strength makes decisions noisier and less tied to the price. */
  strength: number;
}

export type PreflopKind = 'open' | 'limped' | 'raised' | '3bet' | '4bet';

export interface PreflopSpot {
  kind: PreflopKind;
  position: Position;
  tableSize: number;
  /** Players who limped before the first raise. */
  limpers: number;
  /** Positions of every raiser, in order. */
  raisers: Position[];
  /** Players who called the last raise. */
  callers: number;
  /** This seat made one of the raises (it faces a 3bet or more after raising). */
  reraised: boolean;
  /** Current bet to match. */
  raiseTo: number;
  /** Effective stack at the start of the hand. */
  stackBb: number;
  /** Every call and raise before this decision, in order: who, what and to how much. */
  line?: { position: Position; kind: 'call' | 'raise'; to: number }[];
}

export interface PreflopAdvice {
  /** Action ids to frequencies: 'fold', 'call' and raise ids such as 'raise', '3bet' or '4bet'. */
  mix: HandMix;
  /** Share of all starting combos that continue in this spot. */
  width: number;
}

/** Aced's chart advice for a spot and hand, when a chart covers it. Supplied by the app. */
export type PreflopAdvisor = (spot: PreflopSpot, hand: HandClass) => PreflopAdvice | undefined;

export interface ActionChance {
  action: PlayAction;
  p: number;
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const round = (x: number) => Math.round(x * 10) / 10;

/** Preflop order index of a seat: 0 acts first. */
function preflopIndex(state: HandState, seat: number): number {
  const n = state.players.length;
  const start = n === 2 ? state.button : state.button + 3;
  return (((seat - start) % n) + n) % n;
}

/** What has happened before this seat's preflop decision. */
export function preflopSpot(state: HandState, seat: number): PreflopSpot {
  const raisers: Position[] = [];
  let limpers = 0;
  let callers = 0;
  let reraised = false;
  const line: NonNullable<PreflopSpot['line']> = [];
  for (const a of state.log) {
    if (a.street !== 'preflop') continue;
    if (a.kind === 'raise' || a.kind === 'call') line.push({ position: state.players[a.seat].position, kind: a.kind, to: a.to });
    if (a.kind === 'raise') {
      raisers.push(state.players[a.seat].position);
      if (a.seat === seat) reraised = true;
      callers = 0;
    } else if (a.kind === 'call') {
      if (raisers.length === 0) limpers++;
      else callers++;
    }
  }
  const kinds: PreflopKind[] = ['raised', '3bet', '4bet'];
  const kind: PreflopKind = raisers.length === 0 ? (limpers > 0 ? 'limped' : 'open') : kinds[Math.min(raisers.length, 3) - 1];
  const stacks = state.players.map((p) => p.stack + p.total);
  const own = stacks[seat];
  const biggestOther = Math.max(...stacks.filter((_, i) => i !== seat));
  return {
    kind,
    position: state.players[seat].position,
    tableSize: state.players.length,
    limpers,
    raisers,
    callers,
    reraised: reraised && raisers.length > 1,
    raiseTo: state.currentBet,
    stackBb: Math.min(own, biggestOther),
    line,
  };
}

/** Continue and raise widths, as shares of combos, when no chart covers a spot. */
function fallbackWidths(spot: PreflopSpot, behind: number): { cont: number; raise: number } {
  const multi = 0.85 ** spot.callers;
  switch (spot.kind) {
    case 'open': {
      if (spot.position === 'BB') return { cont: 1, raise: 0 };
      const byBehind = [0.45, 0.45, 0.42, 0.26, 0.2, 0.17, 0.15, 0.13, 0.12, 0.11];
      const w = byBehind[Math.min(behind, 9)];
      return { cont: w, raise: w };
    }
    case 'limped':
      if (spot.position === 'BB') return { cont: 1, raise: 0.08 };
      return { cont: 0.3, raise: 0.1 };
    case 'raised':
      if (spot.position === 'BB') return { cont: 0.32 * multi, raise: 0.06 };
      return { cont: (spot.position === 'SB' ? 0.1 : 0.12) * multi, raise: 0.035 };
    case '3bet':
      return { cont: (spot.reraised ? 0.07 : 0.035) * multi, raise: 0.022 };
    case '4bet':
      return { cont: 0.025, raise: 0.012 };
  }
}

/** Whether a seat will act after the last raiser on later streets. */
function inPosition(state: HandState, seat: number, spot: PreflopSpot): boolean {
  const last = state.log.filter((a) => a.street === 'preflop' && a.kind === 'raise').at(-1);
  if (!last) return false;
  const n = state.players.length;
  // Postflop order runs from the seat after the button.
  const order = (s: number) => (((s - state.button - 1) % n) + n) % n;
  return spot.position !== 'SB' && spot.position !== 'BB' ? order(seat) > order(last.seat) : false;
}

/** The street total a preflop raise goes to, all in when it would commit most of the stack. */
function preflopRaiseTo(state: HandState, seat: number, spot: PreflopSpot, style: BotStyle): number {
  const p = state.players[seat];
  const max = p.street + p.stack;
  // In a straddled pot the straddle is the blind to raise: opens scale with it.
  const unit = Math.max(1, straddleOf(state) / state.bb);
  let to: number;
  if (spot.kind === 'open') to = unit * (spot.position === 'SB' ? Math.max(3, style.openTo ?? 3) : (style.openTo ?? 2.5));
  else if (spot.kind === 'limped') to = unit * (4 + spot.limpers);
  else if (spot.kind === 'raised') to = spot.raiseTo * (inPosition(state, seat, spot) ? 3 : 4) + spot.callers * spot.raiseTo;
  else if (spot.kind === '3bet') to = spot.raiseTo * 2.3;
  else to = max;
  return to >= 0.45 * max ? max : round(to);
}

function preflopMix(state: HandState, seat: number, cards: [Card, Card], profile: BotProfile, advisor?: PreflopAdvisor): ActionChance[] {
  const spot = preflopSpot(state, seat);
  const hand = handClassOf(cards[0], cards[1]);
  const pct = preflopPercentile(hand);
  const { style } = profile;
  const advice = advisor?.(spot, hand);
  const behind = state.players.length - 1 - preflopIndex(state, seat);
  let cont: number;
  let raiseShare: number;
  let width: number;
  if (advice) {
    const fold = advice.mix.fold ?? 0;
    const raise = Object.entries(advice.mix).reduce((s, [id, f]) => (id === 'fold' || id === 'call' ? s : s + f), 0);
    cont = 1 - fold;
    raiseShare = cont > 0 ? raise / cont : 0;
    width = advice.width;
  } else {
    const w = fallbackWidths(spot, behind);
    cont = pct < w.cont ? 1 : 0;
    raiseShare = pct < w.raise ? 1 : 0;
    width = w.cont;
  }
  // Style: loose bots add hands beyond the baseline, tight bots drop the weaker part of it.
  if (style.looseness >= 1) {
    if (pct < Math.min(1, width * style.looseness) && cont < 0.85) {
      cont = 0.85;
      raiseShare = Math.max(raiseShare * 0.5, style.aggression * 0.3);
    }
  } else if (pct >= width * style.looseness) cont *= 0.15;
  raiseShare = clamp(raiseShare * (0.5 + style.aggression), 0, 1);
  // Weaker bots stray from both.
  const noise = (1 - profile.strength) * 0.15;
  cont = clamp(cont * (1 - noise) + noise * (pct < 0.5 ? 0.5 : 0.1));

  const legal = legalActions(state);
  let raiseP = cont * raiseShare;
  let callP = cont - raiseP;
  if (spot.kind === 'open' && legal.raise) {
    // Limping is a style choice: some opening hands limp instead.
    callP += raiseP * style.limp;
    raiseP *= 1 - style.limp;
  }
  const out: ActionChance[] = [];
  const foldP = 1 - cont;
  if (legal.check) out.push({ action: { kind: 'check' }, p: foldP + callP });
  else {
    out.push({ action: { kind: 'fold' }, p: foldP });
    out.push({ action: { kind: 'call' }, p: callP });
  }
  if (legal.raise) out.push({ action: { kind: legal.raise.kind, to: clamp(preflopRaiseTo(state, seat, spot, profile.style), legal.raise.min, legal.raise.max) }, p: raiseP });
  else if (legal.check) out[0].p += raiseP;
  else out[1].p += raiseP;
  return normalize(out);
}

// Postflop ------------------------------------------------------------------------------

const boardCache = new Map<string, Float64Array>();

/** Sorted scores of every holding on a board, ignoring card removal between holdings. */
function boardScores(board: readonly Card[]): Float64Array {
  const key = board.join(',');
  let scores = boardCache.get(key);
  if (scores) return scores;
  const deck = remainingDeck(board);
  const list: number[] = [];
  for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) list.push(evaluate([deck[i], deck[j], ...board]));
  scores = Float64Array.from(list).sort();
  if (boardCache.size > 64) boardCache.clear();
  boardCache.set(key, scores);
  return scores;
}

/** Share of all holdings this hand beats now, ties counted half. */
export function madeStrength(cards: readonly [Card, Card], board: readonly Card[]): number {
  const scores = boardScores(board);
  const s = evaluate([...cards, ...board]);
  let lo = 0;
  let hi = scores.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (scores[mid] < s) lo = mid + 1;
    else hi = mid;
  }
  let eq = lo;
  while (eq < scores.length && scores[eq] === s) eq++;
  return (lo + (eq - lo) / 2) / scores.length;
}

/** Flush and straight draws that use a hole card, before the river. */
export function drawsOf(cards: readonly [Card, Card], board: readonly Card[]): { flush: boolean; openEnded: boolean; gutshot: boolean } {
  const all = [...cards, ...board];
  const flush = [0, 1, 2, 3].some((s) => all.filter((c) => suitIndex(c) === s).length === 4 && cards.some((c) => suitIndex(c) === s));
  const ranks = new Set(all.map(rankIndex));
  if (ranks.has(12)) ranks.add(-1);
  const holeRanks = new Set(cards.flatMap((c) => (rankIndex(c) === 12 ? [12, -1] : [rankIndex(c)])));
  let windows = 0;
  let made = false;
  for (let low = -1; low <= 8; low++) {
    const span = [0, 1, 2, 3, 4].map((k) => low + k);
    const have = span.filter((r) => ranks.has(r)).length;
    if (have === 5) made = true;
    if (have === 4 && span.some((r) => holeRanks.has(r) && ranks.has(r))) windows++;
  }
  if (made) return { flush, openEnded: false, gutshot: false };
  return { flush, openEnded: windows >= 2, gutshot: windows === 1 };
}

/** How strong a hand plays postflop, 0 to 1: made strength against every opponent, plus draws. */
export function postflopStrength(cards: readonly [Card, Card], board: readonly Card[], opponents: number): number {
  const made = madeStrength(cards, board);
  let value = made ** Math.max(1, opponents);
  if (board.length < 5) {
    const d = drawsOf(cards, board);
    const bonus = (d.flush ? 0.18 : 0) + (d.openEnded ? 0.14 : d.gutshot ? 0.06 : 0);
    value += bonus * (board.length === 3 ? 1 : 0.55);
  }
  return clamp(value);
}

function postflopMix(state: HandState, seat: number, cards: [Card, Card], profile: BotProfile): ActionChance[] {
  const { style, strength } = profile;
  const legal = legalActions(state);
  const p = state.players[seat];
  const opponents = state.players.filter((o) => !o.folded && o.seat !== seat).length;
  const e = postflopStrength(cards, state.board, opponents);
  const temp = 0.04 + (1 - strength) * 0.1;
  const pot = potSize(state);
  const river = state.street === 'river';
  const sizes = style.sizes.length ? style.sizes : [0.5];
  const out: ActionChance[] = [];

  if (legal.check) {
    const valueBet = sigmoid((e - 0.62) / temp) * clamp(0.35 + style.aggression);
    const bluffBet = e < 0.35 ? style.bluff * (river ? 0.8 : 1) : 0;
    const betP = legal.raise ? clamp(valueBet + bluffBet * (1 - valueBet)) : 0;
    out.push({ action: { kind: 'check' }, p: 1 - betP });
    if (legal.raise && betP > 0) {
      // Strong bots use one size for value and bluffs. Weaker ones size up with value.
      const pick = e >= 0.62 ? sizes[sizes.length - 1] : strength >= 0.6 ? sizes[sizes.length - 1] : sizes[0];
      out.push({ action: { kind: 'bet', to: sizeTo(pot * pick, legal.raise) }, p: betP });
    }
    return normalize(out);
  }

  const toCall = legal.call;
  const price = toCall / (pot + toCall);
  const betFrac = toCall / Math.max(pot - toCall, state.bb);
  const pressure = style.foldiness * (0.04 + 0.12 * Math.min(betFrac, 2));
  const cont = sigmoid((e - pressure - price) / temp);
  const raiseValue = legal.raise ? cont * clamp(0.2 + style.aggression * 0.6) * sigmoid((e - 0.88) / temp) : 0;
  const raiseBluff = legal.raise && !river && e < 0.3 ? (1 - cont) * style.bluff * 0.25 : 0;
  out.push({ action: { kind: 'fold' }, p: 1 - cont - raiseBluff });
  out.push({ action: { kind: 'call' }, p: cont - raiseValue });
  if (legal.raise) {
    const to = Math.max(legal.raise.min, 3 * state.currentBet - 2 * p.street);
    out.push({ action: { kind: 'raise', to: sizeTo(to, legal.raise) }, p: raiseValue + raiseBluff });
  }
  return normalize(out);
}

/** Rounds a bet to 0.1bb inside the legal range, and goes all in when little would be left behind. */
function sizeTo(to: number, range: { min: number; max: number }): number {
  to = clamp(round(to), range.min, range.max);
  return range.max - to < range.max * 0.25 ? range.max : to;
}

function normalize(list: ActionChance[]): ActionChance[] {
  const kept = list.map((a) => ({ ...a, p: Math.max(0, a.p) }));
  const sum = kept.reduce((s, a) => s + a.p, 0);
  return kept.filter((a) => a.p > 1e-9).map((a) => ({ ...a, p: a.p / sum }));
}

/** The bot's mix over legal actions for the seat to act, holding `cards`. */
export function botMix(state: HandState, cards: [Card, Card], profile: BotProfile, advisor?: PreflopAdvisor): ActionChance[] {
  if (state.toAct === null) throw new Error('The hand is over');
  return state.street === 'preflop' ? preflopMix(state, state.toAct, cards, profile, advisor) : postflopMix(state, state.toAct, cards, profile);
}

/** Picks one action from a mix. */
export function sampleAction(mix: readonly ActionChance[], rng: Rng): PlayAction {
  let r = rng();
  for (const a of mix) {
    if ((r -= a.p) <= 0) return a.action;
  }
  return mix[mix.length - 1].action;
}

const sameAction = (a: PlayAction, b: PlayAction) => a.kind === b.kind && ('to' in a ? Math.abs(a.to - (b as { to: number }).to) < 0.05 : true);

/** One decision as it happened: the state before it and the action taken. */
export interface PlayDecision {
  state: HandState;
  action: PlayAction;
}

/**
 * A bot's range after the decisions so far: every holding not in `dead`,
 * weighed by the chance the bot takes each action it took. Exact for the
 * bot's own policy. Holdings that could not have acted this way get weight 0.
 */
export function botRange(history: readonly PlayDecision[], seat: number, dead: readonly Card[], profile: BotProfile, advisor?: PreflopAdvisor): WeightedCombo[] {
  const deck = remainingDeck(dead);
  const mine = history.filter((d) => d.state.toAct === seat);
  const out: WeightedCombo[] = [];
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const cards: [Card, Card] = [deck[i], deck[j]];
      let weight = 1;
      for (const d of mine) {
        // Board cards dealt later cannot be in an earlier holding either way.
        if (d.state.board.includes(cards[0]) || d.state.board.includes(cards[1])) {
          weight = 0;
          break;
        }
        const chance = botMix(d.state, cards, profile, advisor).find((a) => sameAction(a.action, d.action));
        weight *= chance?.p ?? 0;
        if (weight === 0) break;
      }
      if (weight > 0) out.push({ cards, weight });
    }
  }
  return out;
}

export interface CallGrade {
  /** Hero's share of the final pot against the bettor's range. */
  equity: number;
  evCall: number;
  /** Folding gives up nothing more, so its EV is 0 against calling. */
  evFold: 0;
  /** Exact when the board is complete and only the bettor is left. Otherwise sampled runouts. */
  exact: boolean;
  /** Players still to act after hero, whose actions the EV leaves out. */
  stillToAct: number;
}

/**
 * EV of calling against known ranges: hero's equity times the pot after the
 * call, minus the call. Before the river it assumes the hand checks down from
 * here, so it leaves out later bets.
 */
export function gradeCall(state: HandState, hero: number, ranges: { seat: number; range: readonly WeightedCombo[] }[], rng: Rng, samples = 2000): CallGrade {
  const legal = legalActions(state);
  const me = state.players[hero];
  const dead = new Set([...me.cards, ...state.board]);
  const live = ranges.map((r) => r.range.filter((c) => c.weight > 0 && !dead.has(c.cards[0]) && !dead.has(c.cards[1])));
  if (live.some((r) => r.length === 0)) throw new Error('A range is empty after card removal');
  const finalPot = potSize(state) + legal.call;
  const stillToAct = state.pending.filter((s) => s !== hero).length;
  let equity: number;
  let exact = false;
  if (state.board.length === 5 && live.length === 1) {
    exact = true;
    const mine = evaluate([...me.cards, ...state.board]);
    let won = 0;
    let total = 0;
    for (const c of live[0]) {
      const theirs = evaluate([...c.cards, ...state.board]);
      won += c.weight * (mine > theirs ? 1 : mine === theirs ? 0.5 : 0);
      total += c.weight;
    }
    equity = won / total;
  } else {
    const cumulative = live.map((r) => {
      let t = 0;
      return r.map((c) => (t += c.weight));
    });
    const pick = (k: number) => {
      const cum = cumulative[k];
      const target = rng() * cum[cum.length - 1];
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] > target) hi = mid;
        else lo = mid + 1;
      }
      return live[k][lo].cards;
    };
    let won = 0;
    let done = 0;
    for (let n = 0; n < samples * 4 && done < samples; n++) {
      const used = new Set(dead);
      const hands: (readonly [Card, Card])[] = [];
      let clash = false;
      for (let k = 0; k < live.length; k++) {
        const h = pick(k);
        if (used.has(h[0]) || used.has(h[1])) {
          clash = true;
          break;
        }
        used.add(h[0]);
        used.add(h[1]);
        hands.push(h);
      }
      if (clash) continue;
      const deck = remainingDeck([...used]);
      const board = [...state.board];
      while (board.length < 5) board.push(deck.splice(Math.floor(rng() * deck.length), 1)[0]);
      const mine = evaluate([...me.cards, ...board]);
      const best = Math.max(...hands.map((h) => evaluate([...h, ...board])));
      if (mine > best) won += 1;
      else if (mine === best) won += 1 / (1 + hands.filter((h) => evaluate([...h, ...board]) === mine).length);
      done++;
    }
    if (done === 0) throw new Error('No runouts left');
    equity = won / done;
  }
  return { equity, evCall: equity * finalPot - legal.call, evFold: 0, exact, stillToAct };
}

/** Street index, for ordering decisions. */
export const streetIndex = (s: HandState['street']) => PLAY_STREETS.indexOf(s);

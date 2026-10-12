import { type Card, parseCards } from './cards';
import { handClassOf, type HandClass } from './ranges';
import { positionsFor } from './settings';

/**
 * Hand history import.
 *
 * Reads the plain text format PokerStars writes, which GGPoker and most
 * tracking software (PokerTracker, Holdem Manager) also read and export.
 * Amounts are kept in the hand's own units (money or chips) and also
 * converted to big blinds.
 */

export type HandStreet = 'preflop' | 'flop' | 'turn' | 'river';

export interface HandAction {
  street: HandStreet;
  player: string;
  kind: 'post' | 'ante' | 'fold' | 'check' | 'call' | 'bet' | 'raise';
  /** Chips added to the pot by this action. */
  amount: number;
  allIn: boolean;
}

export interface ParsedHand {
  site: 'pokerstars' | 'ggpoker' | 'other';
  id: string;
  game: 'cash' | 'tournament';
  date?: Date;
  sb: number;
  bb: number;
  currency?: string;
  tableMax: number;
  players: { seat: number; name: string; stack: number; position?: string }[];
  hero?: string;
  heroCards?: [Card, Card];
  board: Card[];
  actions: HandAction[];
  /** Showdown cards by player. */
  shown: Record<string, [Card, Card]>;
  /** Total each player put in, after uncalled bets were returned. */
  invested: Record<string, number>;
  collected: Record<string, number>;
  rake: number;
  /** The hand reached a showdown. */
  showdown: boolean;
  /** Someone posted a straddle: preflop positions and ranges change. */
  straddled: boolean;
}

const AMOUNT = String.raw`[$€£]?[\d,]+(?:\.\d+)?`;
const num = (s: string) => Number(s.replace(/[$€£,]/g, ''));
const START = /^(?:PokerStars(?: Zoom| Home Game)?|Poker) Hand #[A-Z]*\d+/m;

/** Splits a file of many hands into one string per hand. */
export function splitHands(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const starts: number[] = [];
  const re = new RegExp(START.source, 'gm');
  for (let m = re.exec(normalized); m; m = re.exec(normalized)) starts.push(m.index);
  return starts.map((s, i) => normalized.slice(s, starts[i + 1] ?? normalized.length).trim());
}

function parseDate(header: string): Date | undefined {
  // Prefer the bracketed ET time PokerStars adds; otherwise the first date on the line.
  const m = header.match(/\[(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})/) ?? header.match(/(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2})/);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi, s);
}

/** Seat labels for the players dealt in, clockwise from the button. */
export function assignPositions(seats: readonly number[], button: number): Map<number, string> {
  const sorted = [...seats].sort((a, b) => a - b);
  const start = sorted.findIndex((s) => s >= button);
  const order = [...sorted.slice(start < 0 ? 0 : start), ...sorted.slice(0, start < 0 ? 0 : start)];
  const n = order.length;
  const out = new Map<number, string>();
  if (n < 2) return out;
  if (n === 2) {
    out.set(order[0], 'BTN');
    out.set(order[1], 'BB');
    return out;
  }
  const early = positionsFor(Math.min(n, 10)).slice(0, n - 3);
  out.set(order[0], 'BTN');
  out.set(order[1], 'SB');
  out.set(order[2], 'BB');
  order.slice(3).forEach((seat, i) => out.set(seat, early[i]));
  return out;
}

/**
 * Seat labels counted back from the big blind, the seat that actually posted
 * it. This stays right when the small blind is missing or the button seat is
 * empty, where counting from the button goes wrong.
 */
export function positionsFromBlinds(seats: readonly number[], bbSeat: number, hasSmallBlind: boolean): Map<number, string> {
  const sorted = [...seats].sort((a, b) => a - b);
  const i = sorted.indexOf(bbSeat);
  // Preflop action order: the seat after the big blind first, the big blind last.
  const order = [...sorted.slice(i + 1), ...sorted.slice(0, i + 1)];
  const n = order.length;
  const out = new Map<number, string>();
  if (n < 2) return out;
  const labels = hasSmallBlind ? positionsFor(Math.min(n, 10)) : positionsFor(Math.min(n + 1, 10)).filter((p) => p !== 'SB');
  // Long tables beyond the label set keep their order from the back.
  const offset = labels.length - n;
  order.forEach((seat, k) => out.set(seat, labels[k + offset] ?? `Seat ${seat}`));
  return out;
}

/** Parses one hand. Throws on text that is not a recognizable hand. */
export function parseHand(text: string): ParsedHand {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  const header = lines[0] ?? '';
  const idMatch = header.match(/Hand #([A-Z]*\d+)/);
  if (!idMatch) throw new Error('Not a hand history');
  const site = header.startsWith('PokerStars') ? 'pokerstars' : /^Poker Hand #[A-Z]+\d+/.test(header) ? 'ggpoker' : 'other';
  const blinds = header.match(new RegExp(String.raw`\((${AMOUNT})\/(${AMOUNT})(?:\s+([A-Z]{3}))?\)`));
  if (!blinds) throw new Error('No blinds in the header');
  const sb = num(blinds[1]);
  const bb = num(blinds[2]);
  const symbol = blinds[1].match(/[$€£]/)?.[0];
  const currency = blinds[3] ?? (symbol === '$' ? 'USD' : symbol === '€' ? 'EUR' : symbol === '£' ? 'GBP' : undefined);

  const table = lines.find((l) => l.startsWith('Table '));
  const tableMatch = table?.match(/(\d+)-max.*Seat #(\d+) is the button/);
  const tableMax = tableMatch ? Number(tableMatch[1]) : 9;
  const button = tableMatch ? Number(tableMatch[2]) : 1;

  const players: ParsedHand['players'] = [];
  const actions: HandAction[] = [];
  const invested: Record<string, number> = {};
  const collected: Record<string, number> = {};
  const shown: Record<string, [Card, Card]> = {};
  let hero: string | undefined;
  let heroCards: [Card, Card] | undefined;
  let board: Card[] = [];
  let street: HandStreet = 'preflop';
  let streetIn: Record<string, number> = {};
  let rake = 0;
  let inSummary = false;
  let showdown = false;
  let straddled = false;
  let sbPoster: string | undefined;
  let bbPoster: string | undefined;
  let runout = 0;

  const add = (name: string, amount: number) => {
    invested[name] = (invested[name] ?? 0) + amount;
  };

  for (const line of lines.slice(1)) {
    if (line.startsWith('*** SUMMARY')) {
      inSummary = true;
      continue;
    }
    if (inSummary) {
      const r = line.match(new RegExp(String.raw`Rake (${AMOUNT})`));
      if (r) rake = num(r[1]);
      continue;
    }
    const seat = line.match(new RegExp(String.raw`^Seat (\d+): (.+?) \((${AMOUNT}) in chips`));
    if (seat && street === 'preflop' && !line.includes('is sitting out') && !line.includes('out of hand')) {
      players.push({ seat: Number(seat[1]), name: seat[2], stack: num(seat[3]) });
      continue;
    }
    if (/^\*\*\* (SHOW DOWN|SHOWDOWN|FIRST SHOW DOWN|SECOND SHOW DOWN)/.test(line)) {
      showdown = true;
      continue;
    }
    const streetMark = line.match(/^\*\*\* (FIRST |SECOND )?(FLOP|TURN|RIVER) \*\*\*\s*(.*)$/);
    if (streetMark) {
      // Run it twice: keep the first board.
      if (streetMark[1] === 'SECOND ') {
        runout = 2;
        continue;
      }
      street = streetMark[2].toLowerCase() as HandStreet;
      streetIn = {};
      const cards = [...streetMark[3].matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]).join(' ');
      board = parseCards(cards);
      continue;
    }
    if (line.startsWith('***')) continue;
    const dealt = line.match(/^Dealt to (.+?) \[(\S\S) (\S\S)\]/);
    if (dealt) {
      hero = dealt[1];
      heroCards = parseCards(dealt[2] + dealt[3]) as [Card, Card];
      continue;
    }
    const uncalled = line.match(new RegExp(String.raw`^Uncalled bet \((${AMOUNT})\) returned to (.+)$`));
    if (uncalled) {
      add(uncalled[2], -num(uncalled[1]));
      continue;
    }
    const won = line.match(new RegExp(String.raw`^(.+?) collected (${AMOUNT})`));
    if (won) {
      collected[won[1]] = (collected[won[1]] ?? 0) + num(won[2]);
      continue;
    }
    const shows = line.match(/^(.+?): shows \[(\S\S) (\S\S)\]/);
    if (shows) {
      shown[shows[1]] = parseCards(shows[2] + shows[3]) as [Card, Card];
      continue;
    }
    const act = line.match(
      new RegExp(
        String.raw`^(.+?): (posts small & big blinds|posts small blind|posts big blind|posts the ante|posts straddle|folds|checks|calls|bets|raises)(?: (${AMOUNT}))?(?: to (${AMOUNT}))?(.*)$`,
      ),
    );
    if (act) {
      const [, name, verb, a, to, rest] = act;
      const allIn = rest.includes('all-in');
      const before = streetIn[name] ?? 0;
      let kind: HandAction['kind'];
      let amount = 0;
      if (verb === 'posts small blind' && !sbPoster) sbPoster = name;
      if ((verb === 'posts big blind' || verb === 'posts small & big blinds') && !bbPoster) bbPoster = name;
      if (verb === 'posts straddle') straddled = true;
      if (verb === 'posts the ante') {
        kind = 'ante';
        amount = num(a);
      } else if (verb.startsWith('posts')) {
        kind = 'post';
        amount = num(a);
        // Small and big blinds together: only the big blind counts toward matching bets.
        streetIn[name] = before + (verb === 'posts small & big blinds' ? bb : amount);
      } else if (verb === 'raises') {
        kind = 'raise';
        const target = num(to ?? a);
        amount = target - before;
        streetIn[name] = target;
      } else if (verb === 'calls' || verb === 'bets') {
        kind = verb === 'calls' ? 'call' : 'bet';
        amount = num(a);
        streetIn[name] = before + amount;
      } else {
        kind = verb === 'folds' ? 'fold' : 'check';
      }
      if (amount) add(name, amount);
      actions.push({ street, player: name, kind, amount, allIn });
    }
  }

  void runout;
  const bbSeat = players.find((p) => p.name === bbPoster)?.seat;
  const positions =
    bbSeat !== undefined
      ? positionsFromBlinds(
          players.map((p) => p.seat),
          bbSeat,
          sbPoster !== undefined,
        )
      : assignPositions(
          players.map((p) => p.seat),
          button,
        );
  for (const p of players) p.position = positions.get(p.seat);

  return {
    site,
    id: `${site}:${idMatch[1]}`,
    game: /Tournament #/.test(header) ? 'tournament' : 'cash',
    date: parseDate(header),
    sb,
    bb,
    currency,
    tableMax,
    players,
    hero,
    heroCards,
    board,
    actions,
    shown,
    invested,
    collected,
    rake,
    showdown,
    straddled,
  };
}

export interface ImportResult {
  hands: ParsedHand[];
  errors: { index: number; message: string }[];
}

/** Parses a whole file, keeping the hands that parse and reporting the rest. */
export function parseHandHistories(text: string): ImportResult {
  const hands: ParsedHand[] = [];
  const errors: ImportResult['errors'] = [];
  splitHands(text).forEach((chunk, index) => {
    try {
      hands.push(parseHand(chunk));
    } catch (e) {
      errors.push({ index, message: e instanceof Error ? e.message : String(e) });
    }
  });
  return { hands, errors };
}

// The hero's view of a hand ----------------------------------------------

export interface HeroHand {
  id: string;
  date?: Date;
  game: ParsedHand['game'];
  bb: number;
  position?: string;
  players: number;
  /** Players left to act after the hero preflop, which decides which opening chart applies. */
  behind?: number;
  /** Hero's starting stack in big blinds. */
  stackBb?: number;
  straddled?: boolean;
  hand?: HandClass;
  /** Net result in the hand's units, and in big blinds. */
  net: number;
  netBb: number;
  /** Folded to the hero in the big blind: not counted in VPIP or PFR. */
  walk?: boolean;
  vpip: boolean;
  pfr: boolean;
  /** Faced exactly one raise, the first time the hero did. */
  threeBetChance: boolean;
  threeBet: boolean;
  /** Folded to the hero with only blinds in (not in the big blind). */
  openChance: boolean;
  /** What the hero did when folded to: raise, limp or fold. */
  openAction?: 'raise' | 'limp' | 'fold';
  sawFlop: boolean;
  /** Reached showdown without folding. */
  showdown: boolean;
  wonAtShowdown?: boolean;
}

/** Seat order from first to act preflop to last. */
export const PREFLOP_ORDER = ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

/** Summarizes a hand from the hero's seat. Undefined when there is no hero in the hand. */
export function heroView(h: ParsedHand): HeroHand | undefined {
  if (!h.hero || !h.players.some((p) => p.name === h.hero)) return undefined;
  const me = h.players.find((p) => p.name === h.hero)!;
  const pre = h.actions.filter((a) => a.street === 'preflop' && a.kind !== 'post' && a.kind !== 'ante');
  const firstMine = pre.findIndex((a) => a.player === h.hero);
  const before = firstMine < 0 ? pre : pre.slice(0, firstMine);
  const voluntaryBefore = before.some((a) => a.kind === 'call' || a.kind === 'raise' || a.kind === 'bet');
  const mine = pre.filter((a) => a.player === h.hero);
  const first = mine[0];
  const net = (h.collected[h.hero] ?? 0) - (h.invested[h.hero] ?? 0);
  const openChance = !voluntaryBefore && me.position !== 'BB' && !!first && !h.straddled;
  const folded = h.actions.find((a) => a.player === h.hero && a.kind === 'fold');
  const walk = me.position === 'BB' && mine.length === 0 && pre.every((a) => a.kind === 'fold');

  // 3bet chance: the first time the hero acts facing exactly one raise.
  let raises = 0;
  let threeBetChance = false;
  let threeBet = false;
  for (const a of pre) {
    if (a.player === h.hero && raises === 1 && !threeBetChance) {
      threeBetChance = true;
      threeBet = a.kind === 'raise';
    }
    if (a.kind === 'raise' || a.kind === 'bet') raises++;
  }

  const myIndex = PREFLOP_ORDER.indexOf(me.position ?? '');
  const behind = myIndex < 0 ? undefined : h.players.filter((p) => PREFLOP_ORDER.indexOf(p.position ?? '') > myIndex).length;
  const showdown = h.showdown && !folded;
  return {
    id: h.id,
    date: h.date,
    game: h.game,
    bb: h.bb,
    position: me.position,
    players: h.players.length,
    behind,
    stackBb: me.stack / h.bb,
    straddled: h.straddled,
    hand: h.heroCards ? handClassOf(h.heroCards[0], h.heroCards[1]) : undefined,
    net,
    netBb: net / h.bb,
    walk,
    vpip: mine.some((a) => a.kind === 'call' || a.kind === 'raise' || a.kind === 'bet'),
    pfr: mine.some((a) => a.kind === 'raise'),
    threeBetChance,
    threeBet,
    openChance,
    openAction: openChance ? (first.kind === 'raise' ? 'raise' : first.kind === 'call' ? 'limp' : first.kind === 'fold' ? 'fold' : undefined) : undefined,
    sawFlop: h.board.length >= 3 && (!folded || folded.street !== 'preflop'),
    showdown,
    wonAtShowdown: showdown && (h.collected[h.hero] ?? 0) > 0,
  };
}

export interface HeroStats {
  hands: number;
  netBb: number;
  bbPer100: number;
  /** Measured standard deviation of results per 100 hands, when there are enough hands. */
  sd100?: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  /** Went to showdown, of hands that saw a flop. */
  wtsd: number;
  /** Won money at showdown, of showdowns. */
  wsd: number;
  byPosition: { position: string; hands: number; netBb: number; bbPer100: number; vpip: number }[];
}

const share = (n: number, d: number) => (d > 0 ? n / d : 0);

export function heroStats(hands: readonly HeroHand[]): HeroStats {
  const n = hands.length;
  const netBb = hands.reduce((s, h) => s + h.netBb, 0);
  const mean = n ? netBb / n : 0;
  const sd100 = n > 1 ? Math.sqrt(hands.reduce((s, h) => s + (h.netBb - mean) ** 2, 0) / (n - 1)) * 10 : undefined;
  const playable = hands.filter((h) => !h.walk);
  const groups = new Map<string, HeroHand[]>();
  for (const h of hands) {
    const key = h.position ?? '?';
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }
  const order = [...PREFLOP_ORDER, '?'];
  const sawFlop = hands.filter((h) => h.sawFlop);
  const showdowns = hands.filter((h) => h.showdown);
  return {
    hands: n,
    netBb,
    bbPer100: share(netBb * 100, n),
    sd100,
    vpip: share(playable.filter((h) => h.vpip).length, playable.length),
    pfr: share(playable.filter((h) => h.pfr).length, playable.length),
    threeBet: share(hands.filter((h) => h.threeBet).length, hands.filter((h) => h.threeBetChance).length),
    wtsd: share(sawFlop.filter((h) => h.showdown).length, sawFlop.length),
    wsd: share(showdowns.filter((h) => h.wonAtShowdown).length, showdowns.length),
    byPosition: [...groups]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([position, hs]) => {
        const pnet = hs.reduce((s, h) => s + h.netBb, 0);
        const p = hs.filter((h) => !h.walk);
        return { position, hands: hs.length, netBb: pnet, bbPer100: share(pnet * 100, hs.length), vpip: share(p.filter((h) => h.vpip).length, p.length) };
      }),
  };
}

/** The 9 handed opening seat with this many players left to act behind it. */
export const SEAT_BY_BEHIND: Record<number, string> = { 8: 'UTG', 7: 'UTG+1', 6: 'UTG+2', 5: 'LJ', 4: 'HJ', 3: 'CO', 2: 'BTN', 1: 'SB' };

/**
 * Hands that fit the opening charts: cash, at least 60bb deep, no straddle,
 * six or more players dealt, and folded to the hero.
 */
export function chartComparable(h: HeroHand): boolean {
  return h.game === 'cash' && !h.straddled && (h.stackBb ?? 0) >= 60 && h.players >= 6 && h.openChance && h.behind !== undefined && !!SEAT_BY_BEHIND[h.behind];
}

export interface OpenDeviation {
  /** The chart seat used for comparison (9 handed). */
  seat: string;
  hand: HandClass;
  /** Raise frequency in the chart for this hand. */
  chartRaise: number;
  heroAction: 'raise' | 'limp' | 'fold';
  kind: 'too loose' | 'too tight' | 'limp';
  count: number;
}

/**
 * Compares first in decisions with the opening charts, hand by hand. Only
 * near pure deviations count, because each hand comes up rarely: a raise
 * with a hand the chart opens 5% of the time or less, or a fold with one it
 * opens 95% or more. Limps are flagged, except from the small blind, where
 * limping is a valid strategy.
 */
export function openDeviations(hands: readonly HeroHand[], raiseFreq: (seat: string, hand: HandClass) => number | undefined): OpenDeviation[] {
  const found = new Map<string, OpenDeviation>();
  for (const h of hands) {
    if (!chartComparable(h) || !h.openAction || !h.hand) continue;
    const seat = SEAT_BY_BEHIND[h.behind!];
    const f = raiseFreq(seat, h.hand);
    if (f === undefined) continue;
    const kind =
      h.openAction === 'limp' ? (seat === 'SB' ? undefined : 'limp') : h.openAction === 'raise' && f <= 0.05 ? 'too loose' : h.openAction === 'fold' && f >= 0.95 ? 'too tight' : undefined;
    if (!kind) continue;
    const key = `${seat}:${h.hand}:${kind}`;
    const existing = found.get(key);
    if (existing) existing.count++;
    else found.set(key, { seat, hand: h.hand, chartRaise: f, heroAction: h.openAction, kind, count: 1 });
  }
  return [...found.values()].sort((a, b) => b.count - a.count);
}

export interface OpenRate {
  seat: string;
  chances: number;
  opens: number;
  rate: number;
  /** 95% range for the true rate from this sample (normal approximation). */
  low: number;
  high: number;
}

/** First in raise rate by chart seat, the number coaches read before single hands. */
export function openRates(hands: readonly HeroHand[]): OpenRate[] {
  const by = new Map<string, { chances: number; opens: number }>();
  for (const h of hands) {
    if (!chartComparable(h)) continue;
    const seat = SEAT_BY_BEHIND[h.behind!];
    const e = by.get(seat) ?? { chances: 0, opens: 0 };
    e.chances++;
    if (h.openAction === 'raise') e.opens++;
    by.set(seat, e);
  }
  return [...by]
    .sort((a, b) => PREFLOP_ORDER.indexOf(a[0]) - PREFLOP_ORDER.indexOf(b[0]))
    .map(([seat, { chances, opens }]) => {
      const rate = opens / chances;
      const half = 1.96 * Math.sqrt((rate * (1 - rate)) / chances);
      return { seat, chances, opens, rate, low: Math.max(0, rate - half), high: Math.min(1, rate + half) };
    });
}

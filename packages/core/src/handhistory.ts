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
    const streetMark = line.match(/^\*\*\* (FLOP|TURN|RIVER) \*\*\*\s*(.*)$/);
    if (streetMark) {
      street = streetMark[1].toLowerCase() as HandStreet;
      streetIn = {};
      const cards = [...streetMark[2].matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]).join(' ');
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

  const positions = assignPositions(
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
  hand?: HandClass;
  /** Net result in the hand's units, and in big blinds. */
  net: number;
  netBb: number;
  vpip: boolean;
  pfr: boolean;
  /** Faced exactly one raise before acting voluntarily. */
  threeBetChance: boolean;
  threeBet: boolean;
  /** Folded to the hero with only blinds in (not in the big blind). */
  openChance: boolean;
  /** What the hero did when folded to: raise, limp or fold. */
  openAction?: 'raise' | 'limp' | 'fold';
  sawFlop: boolean;
  showdown: boolean;
}

/** Summarizes a hand from the hero's seat. Undefined when there is no hero in the hand. */
export function heroView(h: ParsedHand): HeroHand | undefined {
  if (!h.hero || !h.players.some((p) => p.name === h.hero)) return undefined;
  const me = h.players.find((p) => p.name === h.hero)!;
  const pre = h.actions.filter((a) => a.street === 'preflop' && a.kind !== 'post' && a.kind !== 'ante');
  const firstMine = pre.findIndex((a) => a.player === h.hero);
  const before = firstMine < 0 ? pre : pre.slice(0, firstMine);
  const raisesBefore = before.filter((a) => a.kind === 'raise' || a.kind === 'bet').length;
  const voluntaryBefore = before.some((a) => a.kind === 'call' || a.kind === 'raise' || a.kind === 'bet');
  const mine = pre.filter((a) => a.player === h.hero);
  const first = mine[0];
  const net = (h.collected[h.hero] ?? 0) - (h.invested[h.hero] ?? 0);
  const openChance = !voluntaryBefore && me.position !== 'BB' && !!first;
  const folded = h.actions.find((a) => a.player === h.hero && a.kind === 'fold');
  return {
    id: h.id,
    date: h.date,
    game: h.game,
    bb: h.bb,
    position: me.position,
    players: h.players.length,
    hand: h.heroCards ? handClassOf(h.heroCards[0], h.heroCards[1]) : undefined,
    net,
    netBb: net / h.bb,
    vpip: mine.some((a) => a.kind === 'call' || a.kind === 'raise' || a.kind === 'bet'),
    pfr: mine.some((a) => a.kind === 'raise'),
    threeBetChance: raisesBefore === 1 && !!first,
    threeBet: raisesBefore === 1 && first?.kind === 'raise',
    openChance,
    openAction: openChance ? (first.kind === 'raise' ? 'raise' : first.kind === 'call' ? 'limp' : first.kind === 'fold' ? 'fold' : undefined) : undefined,
    sawFlop: h.board.length >= 3 && (!folded || folded.street !== 'preflop'),
    showdown: h.hero in h.shown,
  };
}

export interface HeroStats {
  hands: number;
  netBb: number;
  bbPer100: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  wentToShowdown: number;
  byPosition: { position: string; hands: number; netBb: number; bbPer100: number; vpip: number }[];
}

const share = (n: number, d: number) => (d > 0 ? n / d : 0);

export function heroStats(hands: readonly HeroHand[]): HeroStats {
  const n = hands.length;
  const netBb = hands.reduce((s, h) => s + h.netBb, 0);
  const groups = new Map<string, HeroHand[]>();
  for (const h of hands) {
    const key = h.position ?? '?';
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }
  const order = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB', '?'];
  const sawFlop = hands.filter((h) => h.sawFlop);
  return {
    hands: n,
    netBb,
    bbPer100: share(netBb * 100, n),
    vpip: share(hands.filter((h) => h.vpip).length, n),
    pfr: share(hands.filter((h) => h.pfr).length, n),
    threeBet: share(hands.filter((h) => h.threeBet).length, hands.filter((h) => h.threeBetChance).length),
    wentToShowdown: share(sawFlop.filter((h) => h.showdown).length, sawFlop.length),
    byPosition: [...groups]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([position, hs]) => {
        const pnet = hs.reduce((s, h) => s + h.netBb, 0);
        return { position, hands: hs.length, netBb: pnet, bbPer100: share(pnet * 100, hs.length), vpip: share(hs.filter((h) => h.vpip).length, hs.length) };
      }),
  };
}

export interface OpenDeviation {
  position: string;
  hand: HandClass;
  /** Raise frequency in the chart for this hand. */
  chartRaise: number;
  heroAction: 'raise' | 'limp' | 'fold';
  kind: 'too loose' | 'too tight' | 'limp';
  count: number;
}

/**
 * Compares the hero's first in decisions with opening charts. A raise with a
 * hand the chart opens under 25% of the time is too loose; a fold with a hand
 * it opens over 75% of the time is too tight; any limp is flagged, because
 * the charts are raise or fold. Hands in between are mixes and never flagged.
 */
export function openDeviations(hands: readonly HeroHand[], raiseFreq: (position: string, hand: HandClass) => number | undefined): OpenDeviation[] {
  const found = new Map<string, OpenDeviation>();
  for (const h of hands) {
    if (!h.openChance || !h.openAction || !h.hand || !h.position) continue;
    const f = raiseFreq(h.position, h.hand);
    if (f === undefined) continue;
    const kind = h.openAction === 'limp' ? 'limp' : h.openAction === 'raise' && f < 0.25 ? 'too loose' : h.openAction === 'fold' && f > 0.75 ? 'too tight' : undefined;
    if (!kind) continue;
    const key = `${h.position}:${h.hand}:${kind}`;
    const existing = found.get(key);
    if (existing) existing.count++;
    else found.set(key, { position: h.position, hand: h.hand, chartRaise: f, heroAction: h.openAction, kind, count: 1 });
  }
  return [...found.values()].sort((a, b) => b.count - a.count);
}

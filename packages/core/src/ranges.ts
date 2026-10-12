import { type Card, parseCard, RANKS, type Rank, makeCard, SUITS } from './cards';

/**
 * Hand classes and range notation.
 *
 * A hand class is one of the 169 strategically distinct starting hands:
 * pairs ("TT"), suited ("AKs") and offsuit ("AKo"). A range maps hand
 * classes to a frequency in [0, 1], which is how solver output expresses
 * mixed strategies (e.g. "raise 60%, call 40%").
 */

export type HandClass = string;
export type Range = Map<HandClass, number>;

export interface WeightedCombo {
  cards: [Card, Card];
  weight: number;
}

/** Ranks ordered high to low, which is how charts are drawn. */
export const GRID_RANKS: readonly Rank[] = [...RANKS].reverse();

const rankValue = (r: Rank): number => RANKS.indexOf(r);

/**
 * The 13x13 grid used by every solver and chart tool. Row and column 0 are aces.
 * Pairs sit on the diagonal, suited hands above it, offsuit hands below it.
 */
export function gridHandClass(row: number, col: number): HandClass {
  const a = GRID_RANKS[row];
  const b = GRID_RANKS[col];
  if (row === col) return a + b;
  return row < col ? `${a}${b}s` : `${b}${a}o`;
}

export const ALL_HAND_CLASSES: readonly HandClass[] = Array.from({ length: 169 }, (_, i) =>
  gridHandClass(Math.floor(i / 13), i % 13),
);

export function comboCount(hand: HandClass): number {
  if (hand.length === 2) return 6;
  return hand.endsWith('s') ? 4 : 12;
}

/** All specific two-card combos for a hand class. */
export function handClassCombos(hand: HandClass): [Card, Card][] {
  const hi = hand[0] as Rank;
  const lo = hand[1] as Rank;
  const combos: [Card, Card][] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (hand.length === 2) {
        if (j > i) combos.push([makeCard(hi, SUITS[i]), makeCard(lo, SUITS[j])]);
      } else if (hand.endsWith('s') ? i === j : i !== j) {
        combos.push([makeCard(hi, SUITS[i]), makeCard(lo, SUITS[j])]);
      }
    }
  }
  return combos;
}

function normalizeClass(token: string): HandClass {
  const t = token.trim();
  const a = t[0]?.toUpperCase() as Rank;
  const b = t[1]?.toUpperCase() as Rank;
  const suffix = t.slice(2).toLowerCase();
  if (!RANKS.includes(a) || !RANKS.includes(b) || !['', 's', 'o'].includes(suffix)) {
    throw new Error(`Invalid hand "${token}"`);
  }
  if (a === b) {
    if (suffix) throw new Error(`Pairs take no suffix: "${token}"`);
    return a + b;
  }
  const [hi, lo] = rankValue(a) > rankValue(b) ? [a, b] : [b, a];
  return hi + lo + suffix;
}

/** Expands "AK" into AKs and AKo; leaves everything else as is. */
function withSuitedness(hand: HandClass): HandClass[] {
  if (hand.length === 2 && hand[0] !== hand[1]) return [hand + 's', hand + 'o'];
  return [hand];
}

function expandToken(token: string): HandClass[] {
  const plus = token.endsWith('+');
  const body = plus ? token.slice(0, -1) : token;

  if (body.includes('-')) {
    const [fromRaw, toRaw] = body.split('-');
    const from = normalizeClass(fromRaw);
    const to = normalizeClass(toRaw);
    const isPair = from.length === 2 && from[0] === from[1];
    if (isPair) {
      if (!(to.length === 2 && to[0] === to[1])) throw new Error(`Mismatched span "${token}"`);
      const [lo, hi] = [rankValue(from[0] as Rank), rankValue(to[0] as Rank)].sort((x, y) => x - y);
      return RANKS.slice(lo, hi + 1).map((r) => r + r);
    }
    if (from[0] !== to[0] || from.slice(2) !== to.slice(2)) throw new Error(`Mismatched span "${token}"`);
    const [lo, hi] = [rankValue(from[1] as Rank), rankValue(to[1] as Rank)].sort((x, y) => x - y);
    return RANKS.slice(lo, hi + 1).flatMap((r) => withSuitedness(from[0] + r + from.slice(2)));
  }

  const hand = normalizeClass(body);
  if (!plus) return withSuitedness(hand);

  if (hand[0] === hand[1]) {
    return RANKS.slice(rankValue(hand[0] as Rank)).map((r) => r + r);
  }
  // "K9s+" raises the kicker up to just below the top card: K9s, KTs, KJs, KQs.
  const top = rankValue(hand[0] as Rank);
  return RANKS.slice(rankValue(hand[1] as Rank), top).flatMap((r) => withSuitedness(hand[0] + r + hand.slice(2)));
}

/**
 * Parses standard range notation, e.g. "22+, A2s-A5s, KQo, T9s:0.5".
 * A ":x" suffix sets the frequency (0..1) for that token. Later tokens
 * overwrite earlier ones, so "AA-QQ, QQ:0.5" works as expected.
 */
export function parseRange(text: string): Range {
  const range: Range = new Map();
  for (const raw of text.split(',')) {
    const token = raw.trim();
    if (!token) continue;
    const [handPart, freqPart] = token.split(':');
    const freq = freqPart === undefined ? 1 : Number(freqPart);
    if (!Number.isFinite(freq) || freq < 0 || freq > 1) throw new Error(`Invalid frequency in "${token}"`);
    for (const hand of expandToken(handPart.trim())) range.set(hand, freq);
  }
  return range;
}

/** Number of weighted combos in a range (max 1326). */
export function rangeComboCount(range: Range): number {
  let total = 0;
  for (const [hand, freq] of range) total += comboCount(hand) * freq;
  return total;
}

/** Share of all 1326 starting combos covered by a range. */
export function rangePercent(range: Range): number {
  return rangeComboCount(range) / 1326;
}

const EXACT_COMBO = /^[2-9TJQKA][cdhs][2-9TJQKA][cdhs]$/i;

/**
 * Parses range text that may also name exact combos, e.g. "KJ, 88, QhJh,
 * JhTh:0.5", into concrete combos. Exact combos let a postflop range hold
 * only the draws that would really have called, which hand classes cannot.
 * Later tokens overwrite earlier ones, as in parseRange.
 */
export function parseComboRange(text: string, dead: readonly Card[] = []): WeightedCombo[] {
  const blocked = new Set(dead);
  const weights = new Map<string, WeightedCombo>();
  const put = (a: Card, b: Card, weight: number) => {
    const cards: [Card, Card] = a > b ? [a, b] : [b, a];
    weights.set(`${cards[0]}-${cards[1]}`, { cards, weight });
  };
  for (const raw of text.split(',')) {
    const token = raw.trim();
    if (!token) continue;
    const [handPart, freqPart] = token.split(':');
    const freq = freqPart === undefined ? 1 : Number(freqPart);
    if (!Number.isFinite(freq) || freq < 0 || freq > 1) throw new Error(`Invalid frequency in "${token}"`);
    const body = handPart.trim();
    if (EXACT_COMBO.test(body)) {
      const a = parseCard(body.slice(0, 2));
      const b = parseCard(body.slice(2));
      if (a === b) throw new Error(`Duplicate card in "${token}"`);
      put(a, b, freq);
      continue;
    }
    for (const hand of expandToken(body)) for (const [a, b] of handClassCombos(hand)) put(a, b, freq);
  }
  return [...weights.values()].filter((c) => c.weight > 0 && !blocked.has(c.cards[0]) && !blocked.has(c.cards[1]));
}

/** Expands a range into concrete combos, dropping any that collide with dead cards. */
export function rangeToCombos(range: Range, dead: readonly Card[] = []): WeightedCombo[] {
  const blocked = new Set(dead);
  const out: WeightedCombo[] = [];
  for (const [hand, weight] of range) {
    if (weight <= 0) continue;
    for (const cards of handClassCombos(hand)) {
      if (!blocked.has(cards[0]) && !blocked.has(cards[1])) out.push({ cards, weight });
    }
  }
  return out;
}

/** Hand class for two specific hole cards. */
export function handClassOf(a: Card, b: Card): HandClass {
  const [hi, lo] = a >> 2 >= b >> 2 ? [a, b] : [b, a];
  const r1 = RANKS[hi >> 2];
  const r2 = RANKS[lo >> 2];
  if (r1 === r2) return r1 + r2;
  return r1 + r2 + ((hi & 3) === (lo & 3) ? 's' : 'o');
}

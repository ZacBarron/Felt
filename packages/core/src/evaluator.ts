import { type Card, rankIndex, suitIndex } from './cards';

export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
}

export const CATEGORY_NAMES: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'High card',
  [HandCategory.Pair]: 'Pair',
  [HandCategory.TwoPair]: 'Two pair',
  [HandCategory.Trips]: 'Three of a kind',
  [HandCategory.Straight]: 'Straight',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full house',
  [HandCategory.Quads]: 'Four of a kind',
  [HandCategory.StraightFlush]: 'Straight flush',
};

/**
 * Packs a category and up to five tiebreak ranks into one comparable number.
 * Higher is better. Category sits above 20 bits of tiebreakers (4 bits each).
 */
function score(category: HandCategory, kickers: number[]): number {
  let value = category;
  for (let i = 0; i < 5; i++) value = value * 16 + (kickers[i] ?? 0);
  return value;
}

/** Highest straight in a 13-bit rank mask, as the top rank index, or -1. Handles the wheel. */
function straightHigh(mask: number): number {
  // Shift so bit 0 is a low ace and bit r+1 is rank r.
  const m = (mask << 1) | ((mask >> 12) & 1);
  for (let top = 13; top >= 4; top--) {
    if (((m >> (top - 4)) & 0x1f) === 0x1f) return top - 1;
  }
  return -1;
}

function topRanks(mask: number, count: number): number[] {
  const out: number[] = [];
  for (let r = 12; r >= 0 && out.length < count; r--) if (mask & (1 << r)) out.push(r);
  return out;
}

/** Evaluates the best five-card hand from 5 to 7 cards. Higher scores win. */
export function evaluate(cards: readonly Card[]): number {
  const counts = new Array<number>(13).fill(0);
  const suitMasks = [0, 0, 0, 0];
  const suitCounts = [0, 0, 0, 0];
  let rankMask = 0;

  for (const c of cards) {
    const r = rankIndex(c);
    const s = suitIndex(c);
    counts[r]++;
    suitMasks[s] |= 1 << r;
    suitCounts[s]++;
    rankMask |= 1 << r;
  }

  const flushSuit = suitCounts.findIndex((n) => n >= 5);
  if (flushSuit >= 0) {
    const sf = straightHigh(suitMasks[flushSuit]);
    if (sf >= 0) return score(HandCategory.StraightFlush, [sf]);
  }

  let quad = -1;
  const trips: number[] = [];
  const pairs: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (counts[r] === 4) quad = r;
    else if (counts[r] === 3) trips.push(r);
    else if (counts[r] === 2) pairs.push(r);
  }

  if (quad >= 0) {
    return score(HandCategory.Quads, [quad, topRanks(rankMask & ~(1 << quad), 1)[0]]);
  }

  if (trips.length > 0 && trips.length + pairs.length >= 2) {
    // A second set of trips plays as the pair.
    const pair = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
    return score(HandCategory.FullHouse, [trips[0], pair]);
  }

  if (flushSuit >= 0) return score(HandCategory.Flush, topRanks(suitMasks[flushSuit], 5));

  const straight = straightHigh(rankMask);
  if (straight >= 0) return score(HandCategory.Straight, [straight]);

  if (trips.length > 0) {
    return score(HandCategory.Trips, [trips[0], ...topRanks(rankMask & ~(1 << trips[0]), 2)]);
  }

  if (pairs.length >= 2) {
    const [hi, lo] = pairs;
    return score(HandCategory.TwoPair, [hi, lo, topRanks(rankMask & ~(1 << hi) & ~(1 << lo), 1)[0]]);
  }

  if (pairs.length === 1) {
    return score(HandCategory.Pair, [pairs[0], ...topRanks(rankMask & ~(1 << pairs[0]), 3)]);
  }

  return score(HandCategory.HighCard, topRanks(rankMask, 5));
}

export function categoryOf(handScore: number): HandCategory {
  return Math.floor(handScore / 16 ** 5) as HandCategory;
}

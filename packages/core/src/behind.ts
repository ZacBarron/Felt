import type { Card } from './cards';

/**
 * Odds about the players still to act after you. Two questions come up when
 * you compare table sizes: how often someone behind holds a strong hand, and
 * how often the action folds round to a seat.
 */

/**
 * Exact chance that at least one of `players` other players holds one of the
 * `targets` combos, when their cards are dealt at random from the cards not in
 * `dead` (usually your own hand). Card removal between players is counted
 * exactly, by inclusion and exclusion over how many players hold a target.
 */
export function chanceAnyoneHolds(targets: readonly (readonly [Card, Card])[], dead: readonly Card[], players: number): number {
  if (!Number.isInteger(players) || players < 0) throw new Error('Players must be a whole number of at least 0');
  const gone = new Set(dead);
  const live = targets.filter(([a, b]) => a !== b && !gone.has(a) && !gone.has(b));
  const unseen = 52 - gone.size;
  if (2 * players > unseen) throw new Error('Not enough cards for that many players');

  // sets[k]: unordered sets of k target combos that share no card.
  const sets: number[] = new Array(players + 1).fill(0);
  sets[0] = 1;
  const used = new Set<Card>();
  const walk = (from: number, k: number) => {
    for (let i = from; i < live.length; i++) {
      const [a, b] = live[i];
      if (used.has(a) || used.has(b)) continue;
      sets[k + 1]++;
      if (k + 1 < players) {
        used.add(a);
        used.add(b);
        walk(i + 1, k + 1);
        used.delete(a);
        used.delete(b);
      }
    }
  };
  if (players > 0) walk(0, 0);

  // P(k named players all hold a target) = k! × sets[k] / (ordered deals of k disjoint hands).
  let total = 0;
  let namedWays = 1; // ways to choose k of the players, C(players, k)
  let factorial = 1;
  let deals = 1; // ordered deals of k disjoint 2 card hands from the unseen cards
  for (let k = 1; k <= players; k++) {
    namedWays = (namedWays * (players - k + 1)) / k;
    factorial *= k;
    const left = unseen - 2 * (k - 1);
    deals *= (left * (left - 1)) / 2;
    const allHold = (factorial * sets[k]) / deals;
    total += (k % 2 === 1 ? 1 : -1) * namedWays * allHold;
  }
  return total;
}

/**
 * Where first-in opens come from when each seat, in turn, opens at its own
 * rate if everyone before it folded. Seats are treated as independent, which
 * ignores card removal: a simple model, not exact.
 */
export function firstInShares(openRates: readonly number[]): { reached: number[]; opens: number[]; nobody: number } {
  const reached: number[] = [];
  const opens: number[] = [];
  let p = 1;
  for (const rate of openRates) {
    if (rate < 0 || rate > 1) throw new Error('Open rates must be between 0 and 1');
    reached.push(p);
    opens.push(p * rate);
    p *= 1 - rate;
  }
  return { reached, opens, nobody: p };
}

import { type Card, remainingDeck } from './cards';
import { evaluate } from './evaluator';
import type { WeightedCombo } from './ranges';

export interface EquityResult {
  /** Hero's share of the pot: wins plus half of ties. */
  equity: number;
  win: number;
  tie: number;
  lose: number;
  samples: number;
  exact: boolean;
}

export type Rng = () => number;

/** Small seeded PRNG (mulberry32) so drills and tests are reproducible. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finish(win: number, tie: number, lose: number, exact: boolean): EquityResult {
  const samples = win + tie + lose;
  if (samples === 0) throw new Error('No valid runouts: hero, villain and board cards overlap');
  return { equity: (win + tie / 2) / samples, win: win / samples, tie: tie / samples, lose: lose / samples, samples, exact };
}

/**
 * Exact hand vs hand equity by enumerating every runout. Fast once the flop
 * is out (at most 990 runouts); preflop it is 1.7M boards, so use
 * `equityVsRange` with sampling there instead.
 */
export function exactEquity(hero: [Card, Card], villain: [Card, Card], board: readonly Card[]): EquityResult {
  const deck = remainingDeck([...hero, ...villain, ...board]);
  const missing = 5 - board.length;
  let win = 0;
  let tie = 0;
  let lose = 0;
  const runout: Card[] = [];

  const walk = (start: number) => {
    if (runout.length === missing) {
      const full = [...board, ...runout];
      const h = evaluate([...hero, ...full]);
      const v = evaluate([...villain, ...full]);
      if (h > v) win++;
      else if (h === v) tie++;
      else lose++;
      return;
    }
    for (let i = start; i < deck.length; i++) {
      runout.push(deck[i]);
      walk(i + 1);
      runout.pop();
    }
  };
  walk(0);
  return finish(win, tie, lose, true);
}

export interface EquityOptions {
  iterations?: number;
  rng?: Rng;
}

/**
 * Monte Carlo equity of a specific hand against a weighted range.
 * Villain combos that collide with hero's cards or the board are removed
 * before sampling, which is the card removal (blocker) effect.
 */
export function equityVsRange(
  hero: [Card, Card],
  villainRange: readonly WeightedCombo[],
  board: readonly Card[],
  { iterations = 10_000, rng = Math.random }: EquityOptions = {},
): EquityResult {
  const dead = new Set([...hero, ...board]);
  const combos = villainRange.filter((c) => c.weight > 0 && !dead.has(c.cards[0]) && !dead.has(c.cards[1]));
  if (combos.length === 0) throw new Error('Villain range is empty after card removal');

  const cumulative: number[] = [];
  let totalWeight = 0;
  for (const c of combos) cumulative.push((totalWeight += c.weight));

  const missing = 5 - board.length;
  const baseDeck = remainingDeck([...hero, ...board]);
  const full: Card[] = new Array(7);
  let win = 0;
  let tie = 0;
  let lose = 0;

  for (let n = 0; n < iterations; n++) {
    const target = rng() * totalWeight;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] > target) hi = mid;
      else lo = mid + 1;
    }
    const [v1, v2] = combos[lo].cards;

    // Partial Fisher-Yates over a copy of the deck, skipping villain's cards.
    const deck = baseDeck.filter((c) => c !== v1 && c !== v2);
    for (let i = 0; i < board.length; i++) full[i] = board[i];
    for (let i = 0; i < missing; i++) {
      const j = i + Math.floor(rng() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
      full[board.length + i] = deck[i];
    }

    full[5] = hero[0];
    full[6] = hero[1];
    const h = evaluate(full);
    full[5] = v1;
    full[6] = v2;
    const v = evaluate(full);
    if (h > v) win++;
    else if (h === v) tie++;
    else lose++;
  }
  return finish(win, tie, lose, false);
}

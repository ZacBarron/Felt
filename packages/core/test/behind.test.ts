import { describe, expect, it } from 'vitest';
import { chanceAnyoneHolds, firstInShares, handClassCombos, parseCards, seededRng, type Card } from '../src';

const premium = ['AA', 'KK', 'QQ', 'AKs', 'AKo'].flatMap((h) => handClassCombos(h));

/** Deals `players` hands from the cards not in `dead` and checks whether any holds a target. */
function simulate(targets: [Card, Card][], dead: Card[], players: number, trials: number, seed: number): number {
  const rng = seededRng(seed);
  const keys = new Set(targets.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`)));
  const gone = new Set(dead);
  const deck = Array.from({ length: 52 }, (_, i) => i).filter((c) => !gone.has(c));
  let hits = 0;
  for (let t = 0; t < trials; t++) {
    for (let i = 0; i < 2 * players; i++) {
      const j = i + Math.floor(rng() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    for (let p = 0; p < players; p++) {
      const a = deck[2 * p];
      const b = deck[2 * p + 1];
      if (keys.has(a < b ? `${a}-${b}` : `${b}-${a}`)) {
        hits++;
        break;
      }
    }
  }
  return hits / trials;
}

describe('chanceAnyoneHolds', () => {
  it('is the plain combo share for one player', () => {
    expect(chanceAnyoneHolds(premium, parseCards('JsTs'), 1)).toBeCloseTo(34 / 1225, 12);
    // Your own ace and king remove combos: 3 AA, 3 KK, 6 QQ and 9 AK are left of 1,225.
    expect(chanceAnyoneHolds(premium, parseCards('AhKd'), 1)).toBeCloseTo(21 / 1225, 12);
    expect(chanceAnyoneHolds(premium, [], 0)).toBe(0);
  });

  it('counts card removal between 2 players exactly', () => {
    // AA only: 2 × 6/1225 minus both holding AA, which splits the 4 aces 3 ways over 50·49·48·47/4 ordered deals.
    const aces = handClassCombos('AA');
    const both = 6 / ((50 * 49 * 48 * 47) / 4);
    expect(chanceAnyoneHolds(aces, parseCards('7s2d'), 2)).toBeCloseTo((2 * 6) / 1225 - both, 15);
  });

  it('agrees with dealing the cards out', () => {
    const dead = parseCards('JsTs');
    for (const players of [5, 8]) {
      const exact = chanceAnyoneHolds(premium, dead, players);
      expect(Math.abs(simulate(premium, dead, players, 200_000, players) - exact)).toBeLessThan(0.004);
    }
  });

  it('sits just above the independent guess, since 2 players rarely share the strong cards', () => {
    const p = 34 / 1225;
    const exact = chanceAnyoneHolds(premium, parseCards('JsTs'), 8);
    expect(exact).toBeGreaterThan(1 - (1 - p) ** 8);
    expect(exact).toBeLessThan(8 * p);
  });

  it('rejects impossible deals', () => {
    expect(() => chanceAnyoneHolds(premium, [], 27)).toThrow();
    expect(() => chanceAnyoneHolds(premium, [], 1.5)).toThrow();
  });
});

describe('firstInShares', () => {
  it('walks the seats in order', () => {
    const f = firstInShares([0.5, 0.2, 1]);
    expect(f.reached).toEqual([1, 0.5, 0.4]);
    expect(f.opens.map((x) => Math.round(x * 1e9) / 1e9)).toEqual([0.5, 0.1, 0.4]);
    expect(f.nobody).toBe(0);
  });

  it('sums to 1 with the hands nobody opens', () => {
    const f = firstInShares([0.18, 0.22, 0.28, 0.43, 0.42]);
    expect(f.opens.reduce((a, b) => a + b, 0) + f.nobody).toBeCloseTo(1, 12);
  });

  it('rejects rates outside 0 to 1', () => {
    expect(() => firstInShares([1.2])).toThrow();
  });
});

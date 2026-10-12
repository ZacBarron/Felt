import { describe, expect, it } from 'vitest';
import { equityVsRange, exactEquity, parseCards, parseRange, rangeToCombos, seededRng } from '../src';

const hand = (s: string) => parseCards(s) as [number, number];

describe('exactEquity', () => {
  it('counts outs exactly on the turn', () => {
    // QQ vs AK on A K 7 2: only the two remaining queens win.
    const r = exactEquity(hand('QhQc'), hand('AhKs'), parseCards('AsKd7c2h'));
    expect(r.equity).toBeCloseTo(2 / 44, 10);
    expect(r.exact).toBe(true);
  });

  it('splits a board that plays', () => {
    const r = exactEquity(hand('2c3d'), hand('2h3s'), parseCards('AsKsQdJdTh'));
    expect(r.tie).toBe(1);
    expect(r.equity).toBe(0.5);
  });
});

describe('equityVsRange', () => {
  it('matches known preflop equity for AA vs KK', () => {
    const villain = rangeToCombos(parseRange('KK'));
    const r = equityVsRange(hand('AhAs'), villain, [], { iterations: 20_000, rng: seededRng(7) });
    expect(r.equity).toBeGreaterThan(0.8);
    expect(r.equity).toBeLessThan(0.84);
  });

  it('agrees with exact enumeration on the flop', () => {
    const board = parseCards('Kh7h2c');
    const exact = exactEquity(hand('AhQh'), hand('KsJd'), board);
    const mc = equityVsRange(hand('AhQh'), [{ cards: hand('KsJd'), weight: 1 }], board, {
      iterations: 20_000,
      rng: seededRng(1),
    });
    expect(Math.abs(mc.equity - exact.equity)).toBeLessThan(0.015);
  });
});

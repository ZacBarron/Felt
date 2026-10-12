import { describe, expect, it } from 'vitest';
import { blendWithResults, defaultAssumptions, estimateWinRate, handsForPrecision, PRESETS, skillEdge, tableCosts } from '../src';

const live13 = PRESETS['live-1-3'].settings;

describe('table costs', () => {
  it('turn the rake rules into bb per 100 hands per player', () => {
    // 1/3, 10% capped at $5 plus a $1 drop, no flop no drop.
    const a = { ...defaultAssumptions(live13), flopShare: 0.8, flopPotBb: 20, tipPerPot: 1 };
    const c = tableCosts(live13, a);
    // A 20bb ($60) pot pays $5 + $1 = $6 = 2bb; 80% of hands: 1.6bb per hand.
    expect(c.rakePerHand).toBeCloseTo(1.6, 10);
    expect(c.rakePer100).toBeCloseTo(160 / 9, 10);
    // $1 tip per pot is 1/3 bb per hand, shared by nine players.
    expect(c.tipsPer100).toBeCloseTo(100 / 3 / 9, 10);
  });
});

describe('win rate model', () => {
  it('gives a pool average player exactly minus the costs', () => {
    const a = defaultAssumptions(live13);
    const e = estimateWinRate(a.poolRating, 50, live13, a);
    expect(e.edge).toBeCloseTo(0, 10);
    expect(e.mean).toBeCloseTo(e.average, 10);
    expect(e.average).toBeLessThan(0);
  });

  it('grows with rating and is symmetric around the pool', () => {
    const a = defaultAssumptions(live13);
    expect(skillEdge(a.poolRating + 300, a)).toBeCloseTo(-skillEdge(a.poolRating - 300, a), 10);
    expect(skillEdge(a.poolRating + 300, a)).toBeGreaterThan(skillEdge(a.poolRating + 100, a));
    expect(skillEdge(5000, a)).toBeLessThan(a.edgeScale);
  });

  it('is less certain with a provisional rating', () => {
    const a = defaultAssumptions(live13);
    expect(estimateWinRate(1500, 300, live13, a).sd).toBeGreaterThan(estimateWinRate(1500, 50, live13, a).sd);
  });
});

describe('blending with results', () => {
  it('weights results by their precision', () => {
    // Prior 5 +/- 10; 10,000 hands at 15 bb/100 with sd 100 gives a standard error of 10: equal weights.
    const b = blendWithResults({ mean: 5, sd: 10 }, 15, 10_000, 100);
    expect(b.mean).toBeCloseTo(10, 10);
    expect(b.sd).toBeCloseTo(Math.sqrt(50), 10);
    expect(b.weightOnResults).toBeCloseTo(0.5, 10);
    expect(blendWithResults({ mean: 5, sd: 10 }, 15, 0, 100)).toEqual({ mean: 5, sd: 10, weightOnResults: 0 });
  });

  it('says how many hands results alone need', () => {
    // Pinning a live win rate to within 5 bb/100 takes about 154,000 hands.
    expect(handsForPrecision(5, 100)).toBeCloseTo(153_664, 0);
  });
});

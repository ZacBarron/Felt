import { describe, expect, it } from 'vitest';
import { averageRake, blendWithResults, defaultAssumptions, estimateWinRate, handsForPrecision, PRESETS, rakeFor, resultsAreNoise, skillEdge, tableCosts } from '../src';

const live13 = PRESETS['live-1-3'].settings;

describe('table costs', () => {
  const rake = live13.rake;

  it('averages rake over skewed pot sizes, so the cap is not charged on every pot', () => {
    // A $60 average pot always hits the $5 cap; spread out, many pots pay less.
    expect(rakeFor(60, rake, true)).toBe(6);
    const avg = averageRake(60, rake, true);
    expect(avg).toBeLessThan(6);
    expect(avg).toBeGreaterThan(3.5);
    // With no spread it is the single pot rake.
    expect(averageRake(60, rake, true, 1e-9)).toBeCloseTo(6, 6);
  });

  it('turn the rake rules into bb per 100 hands per player, tips only on flop pots', () => {
    const a = { ...defaultAssumptions(live13), flopShare: 0.8, flopPotBb: 20, tipPerPot: 1 };
    const c = tableCosts(live13, a);
    expect(c.rakePerHand).toBeCloseTo((0.8 * averageRake(60, rake, true)) / 3, 10);
    expect(c.rakePer100).toBeCloseTo((c.rakePerHand * 100) / 9, 10);
    // A $1 tip on 80% of pots is 0.267bb per hand, shared by nine players.
    expect(c.tipsPer100).toBeCloseTo(((0.8 / 3) * 100) / 9, 10);
  });

  it('uses stake bands for live defaults', () => {
    const at = (bb: number) => defaultAssumptions({ ...live13, stakes: { ...live13.stakes, bb } });
    expect(at(3).poolRating).toBe(1200);
    expect(at(5).poolRating).toBe(1350);
    expect(at(10).poolRating).toBe(1450);
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
    // Pinning a win rate to within 5 bb/100 takes about 154,000 hands at sd 100.
    expect(handsForPrecision(5, 100)).toBeCloseTo(153_664, 0);
    // Results stay noise until the 95% range is within 10 bb/100.
    expect(resultsAreNoise(20_000, 120)).toBe(true);
    expect(resultsAreNoise(60_000, 120)).toBe(false);
  });
});

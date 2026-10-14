import { describe, expect, it } from 'vitest';
import {
  averageDepthBelowPeak,
  bbPer100ForHourly,
  bbPerHour,
  chanceResultsBelow,
  chanceToFallWithin,
  deepestDrop,
  handsForPrecision,
  handsToRecover,
  moneyPerHour,
  normalCdf,
  resultsHalfWidth,
  resultsSpreadBb,
  riskOfRuin,
  shareOfTimeBelowPeak,
  simulatedDownswingChance,
  simulateResults,
  winRateRange,
} from '../src';

describe('per hour', () => {
  it('turns bb/100 into bb and money per hour', () => {
    // 10 bb/100 at 27 hands an hour is 2.7bb an hour, $8.10 at 1/3.
    expect(bbPerHour(10, 27)).toBeCloseTo(2.7, 12);
    expect(moneyPerHour(10, 27, 3)).toBeCloseTo(8.1, 12);
    // 5 bb/100 at 75 hands an hour is 3.75bb an hour.
    expect(bbPerHour(5, 75)).toBeCloseTo(3.75, 12);
    expect(bbPerHour(-15.9, 27)).toBeCloseTo(-4.293, 12);
  });

  it('inverts back to bb/100', () => {
    expect(bbPer100ForHourly(bbPerHour(7, 27), 27)).toBeCloseTo(7, 12);
    // $12 an hour at a $3 big blind and 27 hands an hour is 14.8 bb/100.
    expect(bbPer100ForHourly(12 / 3, 27)).toBeCloseTo(14.815, 3);
  });
});

describe('normal model', () => {
  it('matches known values of the normal distribution', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 15);
    expect(normalCdf(-1)).toBeCloseTo(0.158655253931457, 12);
    expect(normalCdf(1.96)).toBeCloseTo(0.975002104851780, 12);
    expect(normalCdf(-3)).toBeCloseTo(0.00134989803163, 13);
    expect(normalCdf(-5)).toBeCloseTo(2.866515718791939e-7, 16);
    expect(normalCdf(-40)).toBe(0);
    expect(normalCdf(1) - normalCdf(-1)).toBeCloseTo(0.682689492137086, 12);
  });

  it('agrees with the win rate range used by the app', () => {
    const r = winRateRange(15, 10_000, 120);
    expect(r.halfWidth).toBe(resultsHalfWidth(10_000, 120));
    expect(r.low).toBeCloseTo(15 - 23.52, 10);
    expect(r.high).toBeCloseTo(15 + 23.52, 10);
    expect(winRateRange(0, 10_000, 100, 1).halfWidth).toBeCloseTo(10, 12);
    // The hands for a given precision give back that precision.
    expect(resultsHalfWidth(handsForPrecision(10, 120), 120)).toBeCloseTo(10, 10);
    expect(resultsSpreadBb(10_000, 120)).toBeCloseTo(1200, 10);
  });

  it('gives the chance a true winner is behind', () => {
    // The mindset lesson's case: 10 bb/100, SD 100, 10,000 hands is one standard error.
    expect(chanceResultsBelow(10, 100, 10_000)).toBeCloseTo(normalCdf(-1), 12);
    expect(chanceResultsBelow(10, 120, 10_000)).toBeCloseTo(normalCdf(-10 / 12), 12);
    expect(chanceResultsBelow(0, 120, 5000)).toBeCloseTo(0.5, 12);
  });
});

describe('ruin and downswings', () => {
  it('computes risk of ruin, with no safe roll for a non winner', () => {
    expect(riskOfRuin(10, 100, 2000)).toBeCloseTo(Math.exp(-4), 12);
    // Doubling the win rate does as much as doubling the roll.
    expect(riskOfRuin(5, 100, 4000)).toBeCloseTo(riskOfRuin(10, 100, 2000), 12);
    // Doubling the SD needs four times the roll.
    expect(riskOfRuin(10, 200, 8000)).toBeCloseTo(riskOfRuin(10, 100, 2000), 12);
    expect(riskOfRuin(0, 100, 1e6)).toBe(1);
    expect(riskOfRuin(-3, 100, 1e6)).toBe(1);
  });

  it('gives the chance to fall a depth below the start within a number of hands', () => {
    // It grows with the hands and tends to the risk of ruin.
    const a = chanceToFallWithin(10, 120, 1000, 10_000);
    const b = chanceToFallWithin(10, 120, 1000, 50_000);
    expect(b).toBeGreaterThan(a);
    expect(chanceToFallWithin(10, 120, 1000, 1e9)).toBeCloseTo(riskOfRuin(10, 120, 1000), 10);
    // With no drift, the reflection principle: twice the chance of ending below.
    expect(chanceToFallWithin(0, 100, 1000, 10_000)).toBeCloseTo(2 * normalCdf(-1), 12);
    // A simulation of the same walk agrees.
    const sim = simulateResults({ winRate: 10, sd100: 120, hands: 10_000, paths: 4000, seed: 11, steps: 1000 });
    const share = sim.paths.filter((p) => Math.min(...p) <= -1000).length / sim.paths.length;
    expect(share).toBeCloseTo(a, 1);
  });

  it('says how far below the peak a winner sits over a long run', () => {
    expect(shareOfTimeBelowPeak(10, 120, 1000)).toBeCloseTo(Math.exp(-20_000 / 14_400), 12);
    expect(averageDepthBelowPeak(10, 120)).toBe(720);
    expect(averageDepthBelowPeak(0, 120)).toBe(Infinity);
    // Check against one long simulated career: the average distance below the peak.
    const { paths } = simulateResults({ winRate: 10, sd100: 120, hands: 20_000_000, paths: 1, seed: 5, steps: 200_000 });
    let peak = 0;
    let depth = 0;
    let below = 0;
    for (const x of paths[0]) {
      peak = Math.max(peak, x);
      depth += peak - x;
      if (peak - x >= 1000) below++;
    }
    // Checked every 100 hands, so a little shallower than the continuous model.
    expect(depth / paths[0].length).toBeGreaterThan(620);
    expect(depth / paths[0].length).toBeLessThan(760);
    expect(below / paths[0].length).toBeCloseTo(shareOfTimeBelowPeak(10, 120, 1000), 1);
  });

  it('counts the hands to climb back', () => {
    expect(handsToRecover(1000, 10)).toBe(10_000);
    expect(handsToRecover(500, 5)).toBe(10_000);
    expect(handsToRecover(500, 0)).toBe(Infinity);
    expect(handsToRecover(0, 0)).toBe(0);
  });
});

describe('simulated results', () => {
  const opts = { winRate: 10, sd100: 120, hands: 10_000, paths: 8, seed: 7 };

  it('is the same for the same seed and starts at zero', () => {
    const a = simulateResults(opts);
    const b = simulateResults(opts);
    expect(a).toEqual(b);
    expect(a.hands).toHaveLength(101);
    expect(a.hands.at(-1)).toBe(10_000);
    expect(a.paths).toHaveLength(8);
    for (const p of a.paths) expect(p[0]).toBe(0);
    expect(simulateResults({ ...opts, seed: 8 }).paths).not.toEqual(a.paths);
  });

  it('draws the band and expected line from the model', () => {
    const a = simulateResults(opts);
    expect(a.expected.at(-1)).toBeCloseTo(1000, 10);
    expect(a.high.at(-1)! - a.expected.at(-1)!).toBeCloseTo(1.96 * 1200, 10);
    expect(a.low[0]).toBe(0);
  });

  it('has the right mean and spread over many paths', () => {
    const { paths } = simulateResults({ ...opts, paths: 5000, seed: 3 });
    const ends = paths.map((p) => p.at(-1)!);
    const mean = ends.reduce((s, x) => s + x, 0) / ends.length;
    const sd = Math.sqrt(ends.reduce((s, x) => s + (x - mean) ** 2, 0) / ends.length);
    // Standard error of the mean is 1200 / sqrt(5000), about 17.
    expect(Math.abs(mean - 1000)).toBeLessThan(60);
    expect(Math.abs(sd - 1200)).toBeLessThan(50);
    expect(ends.filter((e) => e < 0).length / ends.length).toBeCloseTo(chanceResultsBelow(10, 120, 10_000), 1);
  });

  it('finds the deepest drop below a running peak', () => {
    expect(deepestDrop([0, 5, 2, 8, 1, 4])).toBe(7);
    expect(deepestDrop([0, 1, 2, 3])).toBe(0);
    expect(deepestDrop([0, -4, -1])).toBe(4);
  });

  it('estimates downswing chances that grow with the hands and shrink with the depth', () => {
    const at = (depthBb: number, hands: number) => simulatedDownswingChance({ winRate: 10, sd100: 120, depthBb, hands, trials: 1500, seed: 1 });
    expect(at(500, 10_000)).toBeGreaterThan(at(1000, 10_000));
    expect(at(1000, 50_000)).toBeGreaterThan(at(1000, 10_000));
    // A drop below the peak is at least as likely as the same drop below the start.
    expect(at(1000, 10_000)).toBeGreaterThan(chanceToFallWithin(10, 120, 1000, 10_000));
    expect(Number.isNaN(simulatedDownswingChance({ winRate: 10, sd100: 120, depthBb: 1, hands: 100, trials: 0, seed: 1 }))).toBe(true);
  });
});

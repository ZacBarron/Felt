import { describe, expect, it } from 'vitest';
import {
  expectedScore,
  inflateRd,
  isProvisional,
  ratingInterval,
  replayRatings,
  START_RD,
  tierFor,
  updateRating,
  updateRatingPeriod,
} from '../src';

describe('Glicko rating', () => {
  it('reproduces the worked example in Glickman (1999)', () => {
    // Player 1500 (rd 200) beats a 1400 (rd 30), loses to a 1550 (rd 100) and a 1700 (rd 300).
    const r = updateRatingPeriod({ rating: 1500, rd: 200, games: 0 }, [
      { difficulty: 1400, itemRd: 30, score: 1 },
      { difficulty: 1550, itemRd: 100, score: 0 },
      { difficulty: 1700, itemRd: 300, score: 0 },
    ]);
    expect(r.rating).toBeCloseTo(1464.1, 0);
    expect(r.rd).toBeCloseTo(151.4, 0);
  });

  it('is an even game against an item of equal difficulty', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
    expect(expectedScore(1900, 1500, 0)).toBeCloseTo(1 / (1 + Math.pow(10, -1)), 10);
  });

  it('moves new players fast and settled players slowly', () => {
    const fresh = updateRating({ rating: 1200, rd: 350, games: 0 }, 1200, 1);
    const settled = updateRating({ rating: 1200, rd: 60, games: 200 }, 1200, 1);
    expect(fresh.rating - 1200).toBeGreaterThan(5 * (settled.rating - 1200));
    expect(fresh.rd).toBeLessThan(350);
  });

  it('widens uncertainty after time away, up to the starting value', () => {
    expect(inflateRd(50, 0)).toBe(50);
    expect(inflateRd(50, 30)).toBeGreaterThan(190);
    expect(inflateRd(50, 1000)).toBe(START_RD);
  });

  it('converges toward a steady accuracy against fixed items', () => {
    // A player who gets 1500 rated items right 76% of the time is about 200 points stronger.
    const events = Array.from({ length: 400 }, (_, i) => ({
      at: i * 60_000,
      itemId: `q${i}`,
      domain: 'preflop' as const,
      difficulty: 1500,
      score: i % 25 < 19 ? 1 : 0,
    }));
    const { overall, domains, history } = replayRatings(events);
    expect(overall.rating).toBeGreaterThan(1620);
    expect(overall.rating).toBeLessThan(1780);
    expect(isProvisional(overall)).toBe(false);
    expect(domains.preflop.games).toBe(400);
    expect(domains.math.games).toBe(0);
    expect(history).toHaveLength(400);
    const [lo, hi] = ratingInterval(overall);
    expect(hi - lo).toBeCloseTo(2 * 1.96 * overall.rd, 6);
  });

  it('names tiers by rating', () => {
    expect(tierFor(950)).toBe('Beginner');
    expect(tierFor(1450)).toBe('Regular');
    expect(tierFor(2100)).toBe('Elite');
  });
});

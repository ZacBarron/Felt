import { describe, expect, it } from 'vitest';
import {
  difficultyFor,
  DIFFICULTY,
  expectedScore,
  gainPerAnswer,
  newRating,
  type SkillRating,
  TIERS,
  tierAt,
  tierProgress,
  inflateRd,
  isProvisional,
  nextTier,
  pickAdaptive,
  tierLabel,
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

  it('names tiers every 150 points and shows the next one', () => {
    expect(tierFor(850)).toBe('Newcomer');
    expect(tierFor(1200)).toBe('Solid');
    expect(tierFor(1499)).toBe('Sharp');
    expect(tierFor(2300)).toBe('Elite');
    expect(nextTier(1460)).toEqual({ name: 'Regular', min: 1500, pointsAway: 40, progress: 110 / 150 });
    expect(nextTier(2000)).toBeUndefined();
    expect(tierLabel({ rating: 1500, rd: 300, games: 3 })).toBe('Still settling');
    expect(tierLabel({ rating: 1500, rd: 80, games: 90 })).toBe('Regular');
    // One tier apart is about a 70% expected score.
    expect(expectedScore(1500, 1350, 0)).toBeCloseTo(0.70, 2);
  });
});

describe('adaptive practice', () => {
  const items = [
    ...Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, domain: 'preflop' as const, difficulty: i < 10 ? 1050 : 1550 })),
    ...Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, domain: 'math' as const, difficulty: i < 10 ? 1300 : 1600 })),
  ];
  const ratings = { preflop: 1300, math: 1600, postflop: 1200, exploit: 1200, theory: 1200 };
  const rand = (() => {
    let s = 1;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();

  it('aims near 80% expected success, favors the weaker area, and interleaves', () => {
    const picked = pickAdaptive(items, (d) => ratings[d], { n: 9, rand });
    expect(picked).toHaveLength(9);
    // Preflop at 1300: the 1050 items are about 80%; math at 1600: the 1300 items are about 85%.
    expect(picked.filter((p) => p.domain === 'preflop').every((p) => p.difficulty === 1050)).toBe(true);
    expect(picked.filter((p) => p.domain === 'preflop').length).toBeGreaterThan(picked.filter((p) => p.domain === 'math').length);
    for (let i = 1; i < picked.length; i++) {
      if (picked[i].domain === picked[i - 1].domain) expect(picked.slice(i).every((p) => p.domain === picked[i].domain)).toBe(true);
    }
  });

  it('skips excluded items', () => {
    const exclude = new Set(items.filter((i) => i.domain === 'preflop').map((i) => i.id));
    expect(pickAdaptive(items, (d) => ratings[d], { n: 5, exclude, rand }).every((p) => p.domain === 'math')).toBe(true);
  });
});

describe('Tier ladder and progress', () => {
  const settled = (rating: number, rd = 45): SkillRating => ({ rating, rd, games: 300 });

  it('gives every tier a short thinking line and a skills line in the house style', () => {
    expect(TIERS.map((t) => t.name)).toEqual(['Newcomer', 'Beginner', 'Developing', 'Solid', 'Sharp', 'Regular', 'Strong regular', 'Expert', 'Elite']);
    for (const [i, t] of TIERS.entries()) {
      if (i > 0) expect(t.min - TIERS[i - 1].min).toBe(i === 1 ? Infinity : 150);
      for (const line of [t.thinks, t.skills]) {
        expect(line.split(/\s+/).length).toBeLessThanOrEqual(12);
        expect((line.match(/,/g) ?? []).length).toBeLessThanOrEqual(1);
        expect(line).not.toMatch(/[—–;!]/);
      }
      expect(t.thinks.endsWith('?')).toBe(true);
    }
    expect(tierAt(1400)).toBe(TIERS[4]);
  });

  it('backs the skills claims for the top tiers with the rating model', () => {
    // Expert: advanced questions (1600) right about 3 times in 4. Elite: nearly 9 in 10.
    expect(expectedScore(1800, DIFFICULTY.lessonAdvanced)).toBeCloseTo(0.75, 1);
    expect(expectedScore(1950, DIFFICULTY.lessonAdvanced)).toBeGreaterThan(0.85);
    expect(expectedScore(1950, DIFFICULTY.lessonAdvanced)).toBeLessThan(0.9);
  });

  it('finds the item difficulty for an expected score', () => {
    for (const p of [0.2, 0.5, 0.8, 0.95]) expect(expectedScore(1400, difficultyFor(1400, p))).toBeCloseTo(p, 10);
    expect(difficultyFor(1400, 0.5)).toBe(1400);
  });

  it('derives the gain per answer from the update rule', () => {
    for (const rd of [45, 80, 200]) {
      for (const p of [0.5, 0.8]) {
        const d = difficultyFor(1400, p);
        const r = { rating: 1400, rd, games: 100 };
        expect(updateRating(r, d, 1, 0).rating - 1400).toBeCloseTo(gainPerAnswer(rd, p, 1), 9);
        expect(updateRating(r, d, 0, 0).rating - 1400).toBeCloseTo(gainPerAnswer(rd, p, 0), 9);
      }
    }
    // At your level a miss undoes a right answer. On practice questions a miss costs 4 right answers.
    expect(gainPerAnswer(45, 0.5, 1)).toBeCloseTo(-gainPerAnswer(45, 0.5, 0), 12);
    expect(-gainPerAnswer(45, 0.8, 0) / gainPerAnswer(45, 0.8, 1)).toBeCloseTo(4, 12);
    // Answering exactly as expected keeps the rating where it is.
    expect(gainPerAnswer(45, 0.8)).toBe(0);
    expect(gainPerAnswer(45, 0.8, 0.9)).toBeGreaterThan(0);
  });

  it('matches nextTier for points and progress', () => {
    const p = tierProgress(settled(1460));
    expect(p.settling).toBe(false);
    expect(p.tier.name).toBe('Sharp');
    expect(p.next?.name).toBe('Regular');
    expect(p.pointsAway).toBe(40);
    expect(p.progress).toBeCloseTo(110 / 150, 12);
  });

  it('counts right answers exactly as a run of right answers replays', () => {
    for (const [rating, rd] of [
      [1420, 45],
      [1420, 60],
      [1201, 45],
      [1949, 90],
    ]) {
      const p = tierProgress(settled(rating, rd));
      let r: SkillRating = settled(rating, rd);
      for (let i = 0; i < p.rightAnswers!; i++) r = updateRating(r, r.rating, 1, 0);
      expect(r.rating).toBeGreaterThanOrEqual(p.next!.min);
      // One fewer is not enough.
      let s: SkillRating = settled(rating, rd);
      for (let i = 0; i < p.rightAnswers! - 1; i++) s = updateRating(s, s.rating, 1, 0);
      expect(s.rating).toBeLessThan(p.next!.min);
    }
  });

  it('is close to the net right answers in a random run with misses', () => {
    // 70% right on questions at your level: count rights minus misses when the next tier is reached.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const start = settled(1380);
    const want = tierProgress(start).rightAnswers!;
    const nets: number[] = [];
    for (let trial = 0; trial < 40; trial++) {
      let r = start;
      let net = 0;
      while (r.rating < 1500) {
        const right = rand() < 0.7;
        net += right ? 1 : -1;
        r = updateRating(r, r.rating, right ? 1 : 0, 0);
      }
      nets.push(net);
    }
    const mean = nets.reduce((a, b) => a + b, 0) / nets.length;
    expect(Math.abs(mean - want) / want).toBeLessThan(0.1);
  });

  it('needs more answers further from the next tier and fewer with a wider rd', () => {
    let last = 0;
    for (let rating = 1499; rating >= 1350; rating -= 10) {
      const n = tierProgress(settled(rating)).rightAnswers!;
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    expect(tierProgress(settled(1400, 100)).rightAnswers!).toBeLessThan(tierProgress(settled(1400, 45)).rightAnswers!);
  });

  it('stops at Elite and still works far below Beginner', () => {
    const top = tierProgress(settled(2400));
    expect(top.tier.name).toBe('Elite');
    expect(top.next).toBeUndefined();
    expect(top.rightAnswers).toBeUndefined();
    const low = tierProgress(settled(300));
    expect(low.tier.name).toBe('Newcomer');
    expect(low.next?.name).toBe('Beginner');
    expect(low.progress).toBe(0);
    expect(low.pointsAway).toBe(600);
    expect(low.rightAnswers).toBeGreaterThan(100);
    expect(Number.isFinite(low.rightAnswers)).toBe(true);
  });

  it('gives a settling rating no estimate, only answers until it settles', () => {
    const fresh = tierProgress(newRating());
    expect(fresh.settling).toBe(true);
    expect(fresh.next).toBeUndefined();
    expect(fresh.rightAnswers).toBeUndefined();
    const { atLevel, inPractice } = fresh.answersToSettle!;
    // Easier practice questions tell the rating less, so settling takes more of them.
    expect(inPractice).toBeGreaterThan(atLevel);
    // Replaying that many answers settles the rating, and one fewer does not, whatever the results.
    for (const score of [0, 1]) {
      let r = newRating();
      for (let i = 0; i < atLevel; i++) r = updateRating(r, r.rating, score, 0);
      expect(isProvisional(r)).toBe(false);
      let s = newRating();
      for (let i = 0; i < atLevel - 1; i++) s = updateRating(s, s.rating, score, 0);
      expect(isProvisional(s)).toBe(true);
    }
    // A nearly settled rating needs fewer.
    expect(tierProgress({ rating: 1300, rd: 130, games: 12 }).answersToSettle!.atLevel).toBeLessThan(atLevel);
  });
});

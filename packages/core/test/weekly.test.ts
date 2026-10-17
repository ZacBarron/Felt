import { describe, expect, it } from 'vitest';
import { isoWeek, type WeeklyCandidate, weeklyPicks, type WeeklySlot, weeklySummary, weekRange } from '../src';

describe('ISO weeks', () => {
  it('matches known ISO weeks, including around New Year', () => {
    expect(isoWeek(new Date(2026, 9, 14, 12)).id).toBe('2026-W42');
    // 2026 starts on a Thursday, so Monday Dec 29 2025 opens week 1 of 2026.
    expect(isoWeek(new Date(2025, 11, 29, 0, 0)).id).toBe('2026-W01');
    expect(isoWeek(new Date(2025, 11, 28, 23, 59)).id).toBe('2025-W52');
    // 2026 has 53 weeks; Friday Jan 1 2027 still belongs to it.
    expect(isoWeek(new Date(2026, 11, 31, 9)).id).toBe('2026-W53');
    expect(isoWeek(new Date(2027, 0, 1, 9)).id).toBe('2026-W53');
    expect(isoWeek(new Date(2027, 0, 4, 9)).id).toBe('2027-W01');
    expect(isoWeek(new Date(2021, 0, 3)).id).toBe('2020-W53');
  });

  it('turns at local midnight between Sunday and Monday', () => {
    const sunday = isoWeek(new Date(2026, 9, 18, 23, 59, 59));
    const monday = isoWeek(new Date(2026, 9, 19, 0, 0, 0));
    expect(sunday.id).toBe('2026-W42');
    expect(monday.id).toBe('2026-W43');
    expect(monday.number).toBe(sunday.number + 1);
    // Every day from Monday to Sunday is the same week.
    const ids = new Set([12, 13, 14, 15, 16, 17, 18].map((d) => isoWeek(new Date(2026, 9, d, 7)).id));
    expect([...ids]).toEqual(['2026-W42']);
  });

  it('numbers weeks from the first week of 2026 and keeps counting across years', () => {
    expect(isoWeek(new Date(2026, 0, 1)).number).toBe(1);
    expect(isoWeek(new Date(2026, 9, 14)).number).toBe(42);
    expect(isoWeek(new Date(2027, 0, 4)).number).toBe(54);
  });

  it('is not moved by daylight saving changes', () => {
    // Late March and late October are when most clocks change.
    for (const [m, d] of [
      [2, 29],
      [2, 30],
      [9, 25],
      [9, 26],
    ]) {
      const early = isoWeek(new Date(2026, m, d, 0, 30));
      const late = isoWeek(new Date(2026, m, d, 23, 30));
      expect(early).toEqual(late);
    }
    expect(isoWeek(new Date(2026, 2, 29, 12)).id).toBe('2026-W13');
    expect(isoWeek(new Date(2026, 2, 30, 12)).id).toBe('2026-W14');
  });

  it('gives the Monday and Sunday of the week', () => {
    const { start, end } = weekRange(new Date(2026, 9, 14, 15));
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 9, 12, 0]);
    expect([end.getFullYear(), end.getMonth(), end.getDate()]).toEqual([2026, 9, 18]);
    const turn = weekRange(new Date(2027, 0, 1));
    expect([turn.start.getFullYear(), turn.start.getMonth(), turn.start.getDate()]).toEqual([2026, 11, 28]);
  });
});

type Item = WeeklyCandidate & { tag: string };

/** A pool with an easy and a hard band in each kind, so the harder half is visible. */
function pool(): Item[] {
  const items: Item[] = [];
  const kinds: [string, number, number][] = [
    ['math', 12, 1250],
    ['mixed', 40, 1250],
    ['edge', 40, 1350],
    ['river', 13, 1500],
    ['lesson', 50, 1600],
  ];
  for (const [kind, n, base] of kinds) {
    for (let i = 0; i < n; i++) {
      // Half of each kind is 100 points easier than the rest.
      const difficulty = i % 2 === 0 ? base : base - 100;
      items.push({ id: `${kind}:${i}`, kind, difficulty, tag: kind });
    }
  }
  return items;
}

const SLOTS: WeeklySlot[] = [
  { kind: 'math', count: 1 },
  { kind: 'mixed', count: 3 },
  { kind: 'edge', count: 2 },
  { kind: 'river', count: 2 },
  { kind: 'lesson', count: 2 },
];

const ids = (items: readonly WeeklyCandidate[]) => items.map((i) => i.id);

describe('weekly picks', () => {
  it('is the same set for everyone in a week, whatever order the pool arrives in', () => {
    const week = isoWeek(new Date(2026, 9, 14));
    const a = weeklyPicks(pool(), week, SLOTS);
    const b = weeklyPicks([...pool()].reverse(), isoWeek(new Date(2026, 9, 18, 23)), SLOTS);
    expect(ids(a)).toEqual(ids(b));
    expect(a).toHaveLength(10);
    expect(new Set(ids(a)).size).toBe(10);
  });

  it('changes from one week to the next', () => {
    const a = weeklyPicks(pool(), 42, SLOTS);
    const b = weeklyPicks(pool(), 43, SLOTS);
    expect(ids(a)).not.toEqual(ids(b));
  });

  it('balances spot types by the slots', () => {
    const picks = weeklyPicks(pool(), 42, SLOTS);
    const count = (k: string) => picks.filter((p) => p.kind === k).length;
    expect(SLOTS.map((s) => count(s.kind))).toEqual(SLOTS.map((s) => s.count));
  });

  it('draws only from the harder half of each spot type', () => {
    for (let w = 1; w <= 20; w++) {
      for (const p of weeklyPicks(pool(), w, SLOTS)) {
        const base = { math: 1250, mixed: 1250, edge: 1350, river: 1500, lesson: 1600 }[p.kind]!;
        expect(p.difficulty).toBe(base);
      }
    }
  });

  it('gets harder as it goes, alternating spot types on ties', () => {
    for (let w = 1; w <= 20; w++) {
      const d = weeklyPicks(pool(), w, SLOTS).map((p) => p.difficulty);
      expect(d).toEqual([...d].sort((a, b) => a - b));
    }
    const kinds = weeklyPicks(pool(), 42, SLOTS).map((p) => p.kind);
    // Math and mixed hands share a difficulty, so they alternate before the second mixed hand.
    expect(kinds.slice(0, 3)).toEqual(['math', 'mixed', 'mixed']);
    expect(kinds.slice(-2)).toEqual(['lesson', 'lesson']);
  });

  it('uses every item of a spot type before repeating any', () => {
    // 13 rivers: the harder half is 7, two a week, so 3 weeks use 6 different ones.
    const seen = [1, 2, 3].flatMap((w) => weeklyPicks(pool(), w, SLOTS).filter((p) => p.kind === 'river').map((p) => p.id));
    expect(new Set(seen).size).toBe(6);
  });

  it('never repeats an item within half its pool, even where one pass meets the next', () => {
    // 20 harder mixed hands, three a week: a pass turns over about every 7 weeks.
    const runs = Array.from({ length: 60 }, (_, w) => weeklyPicks(pool(), w + 1, SLOTS).filter((p) => p.kind === 'mixed').map((p) => p.id)).flat();
    runs.forEach((id, i) => {
      const before = runs.slice(Math.max(0, i - 10), i);
      expect(before, `pick ${i}`).not.toContain(id);
    });
    expect(new Set(runs).size).toBe(20);
  });

  it('tops up a short spot type from the others and never repeats within a week', () => {
    const small = pool().filter((p) => p.kind !== 'river' || p.id === 'river:0');
    const picks = weeklyPicks(small, 42, SLOTS);
    expect(picks).toHaveLength(10);
    expect(new Set(ids(picks)).size).toBe(10);
    expect(picks.filter((p) => p.kind === 'river')).toHaveLength(1);
  });

  it('returns what it can from a tiny pool', () => {
    const tiny = pool().filter((p) => p.id === 'math:0' || p.id === 'lesson:0');
    expect(ids(weeklyPicks(tiny, 42, SLOTS))).toEqual(['math:0', 'lesson:0']);
    expect(weeklyPicks([], 42, SLOTS)).toEqual([]);
  });
});

describe('weekly summary', () => {
  it('counts right, partial and missed answers, with partial credit in the accuracy', () => {
    const s = weeklySummary([1, 1, 0.5, 0, 1, 1, 0.5, 1, 0, 1]);
    expect(s).toMatchObject({ total: 10, right: 6, partial: 2, missed: 2, first: true, personalBest: false });
    expect(s.accuracy).toBeCloseTo(0.7);
    expect(s.previousBest).toBeUndefined();
  });

  it('compares with earlier weeks', () => {
    const better = weeklySummary([1, 1, 1, 1, 1, 1, 1, 1, 0, 0], [0.6, 0.75]);
    expect(better.personalBest).toBe(true);
    expect(better.previousBest).toBeCloseTo(0.75);
    expect(better.previousAverage).toBeCloseTo(0.675);
    // Matching the best is not a new best.
    expect(weeklySummary([1, 1, 1, 0], [0.75]).personalBest).toBe(false);
  });

  it('handles an empty week', () => {
    expect(weeklySummary([])).toMatchObject({ total: 0, accuracy: 0, right: 0 });
  });
});

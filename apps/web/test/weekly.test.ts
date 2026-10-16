import 'fake-indexeddb/auto';
import { SCENARIOS } from '@felt/content';
import { DIFFICULTY, isMixed, mathFact, mixAnswerOptions, primaryAction, scoreMixAnswer } from '@felt/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { getChart } from '../src/state/charts';
import { db } from '../src/state/db';
import { entryFor } from '../src/state/lessons';
import {
  addWeeklyMissesToReview,
  WEEKLY_SIZE,
  WEEKLY_SLOTS,
  weeklyAvailable,
  weeklyKind,
  weeklyMisses,
  weeklyPool,
  weeklySet,
} from '../src/state/weekly';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('weekly pool', () => {
  it('has enough of every spot type for weeks without repeats', () => {
    const pool = weeklyPool();
    for (const slot of WEEKLY_SLOTS) expect(pool.filter((p) => p.kind === slot.kind).length).toBeGreaterThanOrEqual(slot.count * 3);
    expect(new Set(pool.map((p) => p.id)).size).toBe(pool.length);
  });

  it('only holds decisions Suited grades objectively, from real content', () => {
    for (const { decision: d, kind } of weeklyPool()) {
      if (d.kind === 'chart') {
        const chart = getChart(d.chartId)!;
        expect(chart.spec.basis).toBe('gto');
        const mix = chart.mixes.get(d.hand)!;
        // Mixed hands keep their mix: only the right mix earns full credit.
        if (kind === 'mixed') {
          expect(isMixed(mix)).toBe(true);
          expect(scoreMixAnswer(mix, { [primaryAction(mix)]: 1 }).accuracy).toBeLessThan(1);
          expect(mixAnswerOptions(chart).some((o) => scoreMixAnswer(mix, o.mix).accuracy === 1)).toBe(true);
        } else {
          expect(['vs-open', 'vs-3bet']).toContain(chart.spec.spot);
        }
      } else if (d.kind === 'quiz') {
        expect(entryFor(d.key)?.content?.level).toBe('advanced');
        expect(entryFor(d.key)?.content?.steps[d.step]?.kind).toBe('quiz');
      } else if (d.kind === 'math') {
        expect(mathFact(d.factId)).toBeDefined();
      } else {
        expect(SCENARIOS.some((s) => s.id === d.scenarioId)).toBe(true);
      }
    }
  });
});

describe('weekly set', () => {
  it('is ten decisions, the same all week, balanced and getting harder', () => {
    const a = weeklySet(new Date(2026, 9, 12, 0, 1));
    const b = weeklySet(new Date(2026, 9, 18, 23, 59));
    expect(a.week.id).toBe('2026-W42');
    expect(a.items.map((i) => i.id)).toEqual(b.items.map((i) => i.id));
    expect(a.items).toHaveLength(WEEKLY_SIZE);
    for (const slot of WEEKLY_SLOTS) expect(a.items.filter((i) => i.kind === slot.kind)).toHaveLength(slot.count);
    const d = a.items.map((i) => i.difficulty);
    expect(d).toEqual([...d].sort((x, y) => x - y));
    expect(d[d.length - 1]).toBe(DIFFICULTY.lessonAdvanced);
    expect(a.items.map((i) => weeklyKind(i.decision))).toEqual(a.items.map((i) => i.kind));
  });

  it('changes the next week', () => {
    const a = weeklySet(new Date(2026, 9, 18, 23, 59)).items.map((i) => i.id);
    const b = weeklySet(new Date(2026, 9, 19, 0, 1)).items.map((i) => i.id);
    expect(a).not.toEqual(b);
  });
});

describe('weekly access and review', () => {
  it('is for Suited Pro', () => {
    expect(weeklyAvailable({ pro: false })).toBe(false);
    expect(weeklyAvailable({ pro: true })).toBe(true);
    expect(weeklyAvailable({ pro: false, devMode: true, devPro: true })).toBe(true);
  });

  it('adds missed hands and lesson questions to review', async () => {
    const { items } = weeklySet(new Date(2026, 9, 14));
    const decisions = items.map((i) => i.decision);
    const scores = decisions.map(() => 0);
    const misses = weeklyMisses(decisions, scores);
    expect(misses.count).toBe(decisions.filter((d) => d.kind === 'chart' || d.kind === 'quiz').length);
    await addWeeklyMissesToReview(decisions, scores);
    expect(await db.cards.count()).toBe(misses.hands.length);
    expect(await db.saved.count()).toBe(misses.questions.length);
  });
});

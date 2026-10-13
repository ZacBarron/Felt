import 'fake-indexeddb/auto';
import { PRESETS } from '@felt/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { chartsForGame } from '../src/state/charts';
import { db } from '../src/state/db';
import { buildSession, deckCounts } from '../src/state/decks';
import { markTested } from '../src/state/lessons';
import { recordAnswer } from '../src/state/review';
import type { StudySettings } from '../src/state/settings';

const { charts } = chartsForGame(PRESETS['live-1-3'].settings);
const study: StudySettings = { newPerDay: 4, decks: { lessons: { newPerDay: 3 }, math: { newPerDay: 2 } } };

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.reviews.clear(), db.lessons.clear(), db.saved.clear()]);
});

describe('review decks', () => {
  it('counts new cards per deck with each deck limit', async () => {
    const counts = await deckCounts(charts, study);
    const by = Object.fromEntries(counts.map((c) => [c.deck, c]));
    expect(by.charts.fresh).toBe(4);
    expect(by.math.fresh).toBe(2);
    // No finished lessons yet, so no lesson questions.
    expect(by.lessons.fresh).toBe(0);
  });

  it('adds questions from finished lessons and mixes decks in a session', async () => {
    await markTested(['foundations/math/pot-odds']);
    const session = await buildSession(charts, study, { kind: 'today' });
    const modes = new Set(session.map((i) => i.mode));
    expect(modes.has('quiz')).toBe(true);
    expect(modes.has('math')).toBe(true);
    expect(session.filter((i) => i.mode === 'quiz').every((i) => i.lessonKey === 'foundations/math/pot-odds')).toBe(true);
    // Round robin: the first new cards come from different decks.
    expect(new Set(session.slice(0, 3).map((i) => i.chartId)).size).toBe(3);
  });

  it('honors turned off decks, the session limit and studying one deck', async () => {
    const off: StudySettings = { ...study, decks: { ...study.decks, charts: { on: false } } };
    expect((await buildSession(charts, off, { kind: 'today' })).some((i) => i.mode === 'quick' || i.mode === 'paint')).toBe(false);
    expect(await buildSession(charts, study, { kind: 'today', limit: 3 })).toHaveLength(3);
    expect((await buildSession(charts, study, { kind: 'today', decks: ['math'] })).every((i) => i.mode === 'math')).toBe(true);
  });

  it('schedules a math card and finds it again as missed and weak', async () => {
    const [math] = await buildSession(charts, study, { kind: 'today', decks: ['math'] });
    await recordAnswer(math, { accuracy: 0, responseMs: 5000, targetMs: 8000 });
    expect((await buildSession(charts, study, { kind: 'missed' })).map((i) => i.id)).toEqual([math.id]);
    expect((await buildSession(charts, study, { kind: 'weak' }))[0].id).toBe(math.id);
    const counts = await deckCounts(charts, study);
    expect(counts.find((c) => c.deck === 'math')!.total).toBe(1);
  });
});

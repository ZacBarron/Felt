import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/state/db';
import { buildQueue, buildSavedDeck, recordAnswer } from '../src/state/review';
import { lessonStepId, savedCardId, saveLessonStep, saveSolverSpot, unsave } from '../src/state/saved';

beforeEach(async () => {
  await Promise.all([db.saved.clear(), db.cards.clear(), db.reviews.clear()]);
});

const spot = {
  board: 'Kc8h5h2s2d',
  pot: 30,
  player: 1 as const,
  line: ['OOP Check'],
  hand: 'AKo',
  actions: [
    { id: 'check', label: 'Check' },
    { id: 'bet75', label: 'Bet 22.5' },
  ],
  mix: [0.2, 0.8],
  exploitability: 0.1,
};

describe('saves in review', () => {
  it('enter the queue first as new cards, outside the new card limit', async () => {
    await saveLessonStep('foundations/math/pot-odds', 2);
    await saveSolverSpot(spot);
    const { fresh } = await buildQueue([], 0);
    expect(fresh.map((f) => f.mode)).toEqual(['saved', 'saved']);
    expect(fresh[0].savedId).toBe(lessonStepId('foundations/math/pot-odds', 2));
  });

  it('use the lesson step title, and the solver hand and board', async () => {
    const step = await saveLessonStep('foundations/math/pot-odds', 2);
    expect(step.title).toBe('Learn these by heart');
    const s = await saveSolverSpot(spot);
    expect(s.title).toBe('AKo on Kc8h5h2s2d');
  });

  it('are scheduled after a review, and leave the queue until due', async () => {
    await saveLessonStep('foundations/math/pot-odds', 2);
    const [item] = (await buildQueue([], 0)).fresh;
    const due = await recordAnswer(item, { accuracy: 1, responseMs: 3000, targetMs: 12000 });
    expect(due.getTime()).toBeGreaterThan(Date.now());
    const q = await buildQueue([], 0);
    expect([...q.due, ...q.fresh]).toHaveLength(0);
    // A saved only session still offers it.
    expect(await buildSavedDeck()).toHaveLength(1);
    expect((await db.cards.get(item.id))?.savedId).toBe(item.savedId);
  });

  it('remove their review card when unsaved', async () => {
    const saved = await saveLessonStep('foundations/math/pot-odds', 2);
    const [item] = (await buildQueue([], 0)).fresh;
    await recordAnswer(item, { accuracy: 0, responseMs: 3000, targetMs: 12000 });
    await unsave(saved.id);
    expect(await db.cards.get(savedCardId(saved.id))).toBeUndefined();
    expect(await buildSavedDeck()).toHaveLength(0);
  });
});

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/state/db';
import { LESSON_ENTRIES, lessonProgress, nextLesson, pickNextLesson, saveLesson } from '../src/state/lessons';

beforeEach(async () => {
  await db.lessons.clear();
});

describe('lesson progress', () => {
  const playable = LESSON_ENTRIES.filter((e) => e.content);

  it('starts with the first written lesson', async () => {
    expect(pickNextLesson(await lessonProgress())?.key).toBe(playable[0].key);
  });

  it('resumes a started lesson and never moves backwards', async () => {
    const key = playable[2].key;
    await saveLesson(key, { step: 3 });
    await saveLesson(key, { step: 1 });
    const progress = await lessonProgress();
    expect(progress.get(key)?.step).toBe(3);
    expect(pickNextLesson(progress)?.key).toBe(key);
  });

  it('keeps a finished lesson finished and moves on', async () => {
    const key = playable[0].key;
    await saveLesson(key, { status: 'done', step: 7, correct: 2, answered: 2 });
    await saveLesson(key, { step: 0 });
    const progress = await lessonProgress();
    expect(progress.get(key)?.status).toBe('done');
    expect(pickNextLesson(progress)?.key).toBe(playable[1].key);
    expect(nextLesson(key)?.key).toBe(playable[1].key);
  });
});

import { startPlacement } from '@felt/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ENTRIES, quizSteps } from '../src/state/lessons';
import { clearPlacement, loadPlacement, savePlacement } from '../src/state/placementProgress';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

const entry = LESSON_ENTRIES.find((e) => e.content && quizSteps(e).length > 0)!;
const modules = [{ id: entry.key.split('/').slice(0, 2).join('/'), lessons: [{ key: entry.key, quizSteps: quizSteps(entry) }] }];

describe('placement progress', () => {
  it('resumes a test left halfway', () => {
    const state = startPlacement(modules);
    savePlacement({ state, tally: { right: 1, asked: 2 } });
    expect(loadPlacement()?.tally).toEqual({ right: 1, asked: 2 });
    clearPlacement();
    expect(loadPlacement()).toBeUndefined();
  });

  it('drops a saved test whose lessons no longer exist', () => {
    const state = startPlacement(modules);
    savePlacement({ state: { ...state, questions: [{ lessonKey: 'gone/gone/gone', step: 0 }] }, tally: { right: 0, asked: 1 } });
    expect(loadPlacement()).toBeUndefined();
  });

  it('ignores a finished test', () => {
    savePlacement({ state: { ...startPlacement(modules), done: true }, tally: { right: 1, asked: 1 } });
    expect(loadPlacement()).toBeUndefined();
  });
});

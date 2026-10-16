import { CURRICULUM } from '@felt/content';
import { beforeEach, describe, expect, it } from 'vitest';
import type { StoredLesson } from '../src/state/db';
import { moduleEntries } from '../src/state/lessons';
import {
  markModuleIntroSeen,
  MODULE_INTROS_KEY,
  moduleKeyOf,
  seenModuleIntros,
  shouldShowModuleIntro,
  topicInfo,
  topicTarget,
} from '../src/state/moduleIntros';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

const lessons = moduleEntries('basics', 'rules').filter((e) => e.content);
const first = lessons[0].key;
const row = (key: string, status: StoredLesson['status'], step = 0): [string, StoredLesson] => [
  key,
  { key, status, step, correct: 0, answered: 0, updatedAt: new Date() },
];
const all = () => true;

describe('topic intros', () => {
  it('finds every topic by its key', () => {
    for (const t of CURRICULUM) for (const m of t.modules) expect(topicInfo(`${t.id}/${m.id}`)?.intro).toBe(m.intro);
    expect(topicInfo('basics/nope')).toBeUndefined();
    expect(moduleKeyOf('basics/rules/goal')).toBe('basics/rules');
  });

  it('shows once before the first lesson of an untouched topic', () => {
    expect(shouldShowModuleIntro(first, new Map())).toBe(true);
    markModuleIntroSeen('basics/rules');
    expect(shouldShowModuleIntro(first, new Map())).toBe(false);
    expect(JSON.parse(store.get(MODULE_INTROS_KEY)!)).toEqual(['basics/rules']);
    // Other topics still show theirs.
    expect(shouldShowModuleIntro('basics/money/stakes', new Map())).toBe(true);
  });

  it('never shows for a topic the player already started or skipped', () => {
    expect(shouldShowModuleIntro(first, new Map([row(lessons[2].key, 'started', 3)]))).toBe(false);
    expect(shouldShowModuleIntro(first, new Map([row(lessons[1].key, 'tested')]))).toBe(false);
    // Progress in another topic does not count.
    expect(shouldShowModuleIntro(first, new Map([row('basics/money/stakes', 'done')]))).toBe(true);
  });

  it('survives broken or blocked storage', () => {
    store.set(MODULE_INTROS_KEY, '{not json');
    expect(seenModuleIntros().size).toBe(0);
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => markModuleIntroSeen('basics/rules')).not.toThrow();
    expect(shouldShowModuleIntro(first, new Map())).toBe(true);
  });

  it('points the button at the right lesson', () => {
    expect(topicTarget('basics/rules', new Map(), all)).toMatchObject({ entry: { key: first }, action: 'start' });
    expect(topicTarget('basics/rules', new Map(), all, lessons[3].key)?.entry.key).toBe(lessons[3].key);
    const midway = new Map([row(lessons[0].key, 'done'), row(lessons[2].key, 'started', 2)]);
    expect(topicTarget('basics/rules', midway, all)).toMatchObject({ entry: { key: lessons[2].key }, action: 'continue' });
    const firstDone = new Map([row(lessons[0].key, 'done')]);
    expect(topicTarget('basics/rules', firstDone, all)).toMatchObject({ entry: { key: lessons[1].key }, action: 'start' });
    const allDone = new Map(lessons.map((e) => row(e.key, 'done')));
    expect(topicTarget('basics/rules', allDone, all)).toMatchObject({ entry: { key: first }, action: 'again' });
    expect(topicTarget('basics/rules', new Map(), () => false)?.action).toBe('locked');
  });
});

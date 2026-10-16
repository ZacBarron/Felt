import { describe, expect, it } from 'vitest';
import type { StoredLesson } from '../src/state/db';
import { LESSON_ENTRIES } from '../src/state/lessons';
import { nextUp, reminderLine } from '../src/state/nudge';

const lesson = (key: string, patch: Partial<StoredLesson>): [string, StoredLesson] => [key, { key, status: 'started', step: 0, correct: 0, answered: 0, updatedAt: new Date(), ...patch }];

describe('the daily reminder line', () => {
  it('names the next lesson and its length', () => {
    expect(reminderLine({ title: 'Hand rankings', minutes: 6, steps: 12 })).toBe('Hand rankings is next. It takes 6 min.');
  });

  it('says where a half finished lesson stopped', () => {
    expect(reminderLine({ title: 'Your options on your turn', minutes: 5, steps: 13, reached: 4 })).toBe('Your options on your turn is waiting at step 5 of 13.');
  });

  it('says nothing when there is nothing to name', () => {
    expect(reminderLine(undefined)).toBeUndefined();
  });

  it('follows the real path: a lesson in progress comes first', () => {
    const written = LESSON_ENTRIES.filter((e) => e.content);
    const first = written[0];
    const later = written[5];
    expect(nextUp(new Map(), () => true, {})?.title).toBe(first.title);
    const progress = new Map([lesson(first.key, { status: 'done', step: first.content!.steps.length }), lesson(later.key, { step: 3 })]);
    const up = nextUp(progress, () => true, {});
    expect(up).toMatchObject({ title: later.title, reached: 3, steps: later.content!.steps.length });
    expect(reminderLine(up)).toBe(`${later.title} is waiting at step 4 of ${later.content!.steps.length}.`);
  });

  it('stays short and follows the voice rules for every lesson', () => {
    for (const e of LESSON_ENTRIES.filter((x) => x.content)) {
      const line = reminderLine({ title: e.title, minutes: e.content!.minutes, steps: e.content!.steps.length })!;
      expect(line.length).toBeLessThanOrEqual(140);
      expect(line).not.toMatch(/[—–]/);
    }
  });
});

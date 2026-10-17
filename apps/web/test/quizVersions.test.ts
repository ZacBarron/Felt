import { quizVersions, type QuizStep } from '@felt/content';
import { describe, expect, it } from 'vitest';
import { freshSeed, LESSON_ENTRIES, quizAt, quizSteps, sharedSeed } from '../src/state/lessons';

/** Lesson questions deal another version per visit, and the same one to everyone in a challenge. */
describe('quiz versions in the app', () => {
  const entry = LESSON_ENTRIES.find((e) => e.key === 'preflop/vs-open/defend-by-size')!;
  const step = quizSteps(entry)[0];
  const base = entry.content!.steps[step] as QuizStep;

  it('deals the question as written at seed 0 and another version at other seeds', () => {
    expect(quizAt(entry.key, step, 0)!.question).toBe(base.question);
    const all = new Set(quizVersions(base).map((v) => v.question));
    const dealt = new Set(Array.from({ length: 12 }, (_, s) => quizAt(entry.key, step, s)!.question));
    expect(dealt).toEqual(all);
    expect(all.size).toBeGreaterThan(1);
  });

  it('returns nothing for a step that is not a question', () => {
    expect(quizAt(entry.key, 0, 0)).toBeUndefined();
    expect(quizAt('gone/gone/gone', 3, 0)).toBeUndefined();
  });

  it('seeds challenges by period and visits at random', () => {
    expect(sharedSeed(entry.key, step, '2026-10-17')).toBe(sharedSeed(entry.key, step, '2026-10-17'));
    expect(sharedSeed(entry.key, step, '2026-W42')).not.toBe(sharedSeed(entry.key, step, '2026-W43'));
    const s = freshSeed();
    expect(Number.isInteger(s) && s > 0).toBe(true);
  });
});

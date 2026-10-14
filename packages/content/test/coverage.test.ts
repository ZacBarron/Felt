import { describe, expect, it } from 'vitest';
import { LESSON_CONTENT, type LessonStep } from '../src';

/**
 * Every lesson teaches with pictures, which matters most for beginners. A
 * picture step is a visual, a hand, a board or a chart. Quiz cards help but
 * do not count. Two text steps never sit next to each other.
 */

const PICTURES: ReadonlySet<LessonStep['kind']> = new Set(['visual', 'hand', 'board', 'chart']);

describe('picture coverage', () => {
  const lessons = [...LESSON_CONTENT.values()];

  it('gives every lesson at least 3 picture steps', () => {
    const short = lessons
      .map((l) => ({ key: l.key, pictures: l.steps.filter((s) => PICTURES.has(s.kind)).length }))
      .filter((l) => l.pictures < 3)
      .map((l) => `${l.key} (${l.pictures})`);
    expect(short, 'lessons with fewer than 3 picture steps').toEqual([]);
  });

  it('never puts 2 text steps in a row', () => {
    const runs = lessons
      .filter((l) => l.steps.some((s, i) => i > 0 && s.kind === 'text' && l.steps[i - 1].kind === 'text'))
      .map((l) => l.key);
    expect(runs, 'lessons with back to back text steps').toEqual([]);
  });
});

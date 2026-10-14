import { describe, expect, it } from 'vitest';
import { LESSON_CONTENT, type LessonStep } from '../src';

/**
 * Every question reinforces something the lesson asks the player to
 * remember: each quiz names one takeaway point, and every takeaway point is
 * tested by at least one question. That keeps questions tied to what was
 * taught, and makes clear what to remember.
 */
type Quiz = Extract<LessonStep, { kind: 'quiz' }>;

describe('questions reinforce what to remember', () => {
  for (const lesson of LESSON_CONTENT.values()) {
    it(lesson.key, () => {
      const takeaways = lesson.steps.filter((s) => s.kind === 'takeaway');
      expect(takeaways, 'one takeaway').toHaveLength(1);
      const points = (takeaways[0] as Extract<LessonStep, { kind: 'takeaway' }>).points;
      expect(points.length, 'two to four points to remember').toBeGreaterThanOrEqual(2);
      expect(points.length, 'two to four points to remember').toBeLessThanOrEqual(4);
      const quizzes = lesson.steps.filter((s): s is Quiz => s.kind === 'quiz');
      for (const q of quizzes) {
        expect(q.point, `"${q.question}" names the point it reinforces`).toBeTypeOf('number');
        expect(q.point!, `"${q.question}" point in range`).toBeGreaterThanOrEqual(0);
        expect(q.point!, `"${q.question}" point in range`).toBeLessThan(points.length);
      }
      const tested = new Set(quizzes.map((q) => q.point));
      points.forEach((p, i) => expect(tested.has(i), `point ${i} is tested: "${p}"`).toBe(true));
    });
  }
});

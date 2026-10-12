import { describe, expect, it } from 'vitest';
import { answerPlacement, checkpointQuestions, placementProgress, scoreCheckpoint, startPlacement } from '../src';

const lessons = [
  { key: 'a', quizSteps: [3, 6, 8] },
  { key: 'b', quizSteps: [5] },
  { key: 'c', quizSteps: [] },
];

describe('checkpoints', () => {
  it('take the last and first quiz of each lesson, in lesson order', () => {
    expect(checkpointQuestions(lessons)).toEqual([
      { lessonKey: 'a', step: 3 },
      { lessonKey: 'a', step: 8 },
      { lessonKey: 'b', step: 5 },
    ]);
    expect(checkpointQuestions(lessons, 1)).toEqual([
      { lessonKey: 'a', step: 8 },
      { lessonKey: 'b', step: 5 },
    ]);
  });

  it('skip a lesson only when every one of its questions is right', () => {
    const qs = checkpointQuestions(lessons);
    expect(scoreCheckpoint(qs, [true, false, true])).toEqual({ passed: ['b'], failed: ['a'], correct: 2, total: 3 });
    expect(() => scoreCheckpoint(qs, [true])).toThrow();
  });
});

describe('placement', () => {
  const modules = [
    { id: 'm1', lessons: [{ key: 'm1/a', quizSteps: [2] }, { key: 'm1/b', quizSteps: [2] }] },
    { id: 'empty', lessons: [{ key: 'x', quizSteps: [] }] },
    { id: 'm2', lessons: [{ key: 'm2/a', quizSteps: [2] }, { key: 'm2/b', quizSteps: [2] }, { key: 'm2/c', quizSteps: [2] }, { key: 'm2/d', quizSteps: [2] }] },
    { id: 'm3', lessons: [{ key: 'm3/a', quizSteps: [2] }] },
  ];

  it('clears modules until one falls below the bar, keeping lessons proven there', () => {
    let s = startPlacement(modules);
    expect(s.modules.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    s = answerPlacement(s, true);
    s = answerPlacement(s, true);
    expect(s.cleared).toEqual(['m1']);
    expect(placementProgress(s)).toEqual({ answered: 2, remainingMax: 5 });
    // m2: 2 of 4 right is under 75%, so placement stops here.
    for (const ok of [true, false, true, false]) s = answerPlacement(s, ok);
    expect(s.done).toBe(true);
    expect(s.placedAt).toBe('m2');
    expect(s.passed).toEqual(['m1/a', 'm1/b', 'm2/a', 'm2/c']);
  });

  it('places past everything when every module is cleared', () => {
    let s = startPlacement(modules);
    for (let i = 0; i < 7; i++) s = answerPlacement(s, true);
    expect(s.done).toBe(true);
    expect(s.placedAt).toBeUndefined();
    expect(s.cleared).toEqual(['m1', 'm2', 'm3']);
    expect(answerPlacement(s, false)).toBe(s);
  });

  it('allows one miss in a module of four', () => {
    let s = startPlacement(modules);
    s = answerPlacement(answerPlacement(s, true), true);
    for (const ok of [true, true, false, true]) s = answerPlacement(s, ok);
    expect(s.cleared).toEqual(['m1', 'm2']);
    expect(s.passed).not.toContain('m2/c');
  });
});

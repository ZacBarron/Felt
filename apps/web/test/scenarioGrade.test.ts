import { describe, expect, it } from 'vitest';
import type { HandView } from '../src/solver/protocol';
import { gradeChoice } from '../src/state/scenarioSolve';

const view = (evs: number[], strategy: number[], pot = 20): HandView => ({
  actions: evs.map((_, i) => ({ id: `a${i}`, label: `A${i}` })) as HandView['actions'],
  evs,
  strategy,
  pot,
});

describe('gradeChoice', () => {
  it('calls the top EV action best', () => {
    expect(gradeChoice(view([5, 3], [0.9, 0.1]), 0)).toMatchObject({ grade: 'best', lossBb: 0, best: 0 });
  });

  it('treats a mixed action the solver plays often as good', () => {
    expect(gradeChoice(view([5, 4], [0.6, 0.4]), 1).grade).toBe('good');
  });

  it('grades by EV lost as a share of the pot', () => {
    // Pot 20: 2% is 0.4bb, 6% is 1.2bb, 15% is 3bb.
    expect(gradeChoice(view([5, 4.7], [1, 0]), 1).grade).toBe('good');
    expect(gradeChoice(view([5, 4], [1, 0]), 1).grade).toBe('inaccuracy');
    expect(gradeChoice(view([5, 3], [1, 0]), 1).grade).toBe('mistake');
    const r = gradeChoice(view([5, 1], [1, 0]), 1);
    expect(r.grade).toBe('blunder');
    expect(r.lossBb).toBeCloseTo(4);
    expect(r.lossPct).toBeCloseTo(0.2);
  });
});

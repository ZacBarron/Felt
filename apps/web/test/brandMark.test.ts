import { describe, expect, it } from 'vitest';
import { MARK, MARK_GRID, markCell } from '../src/ui/Brand';

describe('brand mark', () => {
  it('is a 7x7 grid', () => {
    expect(MARK).toHaveLength(MARK_GRID);
    for (const row of MARK) expect(row).toHaveLength(MARK_GRID);
  });

  it('is an arrow: the ace row, the ace column, the pair diagonal and the premium corner', () => {
    for (let r = 0; r < MARK_GRID; r++)
      for (let c = 0; c < MARK_GRID; c++) {
        const lit = r === 0 || c === 0 || r === c || r + c <= 3;
        expect(markCell(r, c) !== 'off', `cell ${r},${c}`).toBe(lit);
      }
  });

  it('is mirror symmetric and keeps pairs on the diagonal', () => {
    for (let r = 0; r < MARK_GRID; r++)
      for (let c = 0; c < MARK_GRID; c++) {
        expect(markCell(r, c)).toBe(markCell(c, r));
        expect(markCell(r, c) === 'pair').toBe(r === c);
      }
  });
});

import { describe, expect, it } from 'vitest';
import { HANDS, mixLine, spotMix, verdict } from '../src/spots';

describe('your move spot', () => {
  it('reads each hand from the real chart', () => {
    for (const h of HANDS) {
      const m = spotMix(h.hand);
      expect(m.raise + m.call + m.fold).toBeCloseTo(1, 6);
    }
  });

  it('keeps 55 a mix of raise and limp behind', () => {
    const m = spotMix('55');
    expect(m.raise).toBeCloseTo(0.5);
    expect(m.call).toBeCloseTo(0.5);
    expect(verdict(m, 'raise')).toBe('Part of the mix');
    expect(verdict(m, 'call')).toBe('Part of the mix');
    expect(verdict(m, 'fold')).toBe('Not quite');
    expect(mixLine(m)).toBe('The chart raises to $10 half the time and limps behind half the time.');
  });

  it('folds K9o and raises A5s', () => {
    expect(verdict(spotMix('K9o'), 'fold')).toBe('Correct');
    expect(verdict(spotMix('K9o'), 'raise')).toBe('Not quite');
    expect(verdict(spotMix('A5s'), 'raise')).toBe('Correct');
    expect(mixLine(spotMix('K9o'))).toBe('The chart always folds.');
  });
});

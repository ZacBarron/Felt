import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { describeHand } from './handName';

const d = (s: string) => describeHand(parseCards(s));

describe('describeHand', () => {
  it('names every category with its ranks', () => {
    expect(d('AsJd8c5h3d2c7s')).toBe('Ace high');
    expect(d('KsKd8c5h3d')).toBe('Pair of kings');
    expect(d('KsKd8c8h3d2s')).toBe('Kings and eights');
    expect(d('7s7d7c5h3d')).toBe('Three sevens');
    expect(d('9s8d7c6h5d')).toBe('Straight to the nine');
    expect(d('As2d3c4h5d')).toBe('Straight to the five');
    expect(d('Ah9h7h5h3hKs')).toBe('Flush, ace high');
    expect(d('7s7d7cAhAd')).toBe('Sevens full of aces');
    expect(d('7s7d7c7hAd')).toBe('Four sevens');
    expect(d('9h8h7h6h5h')).toBe('Straight flush to the nine');
    expect(d('AhKhQhJhTh')).toBe('Royal flush');
  });
});

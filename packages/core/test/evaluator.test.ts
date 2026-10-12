import { describe, expect, it } from 'vitest';
import { categoryOf, evaluate, HandCategory, parseCards } from '../src';

const ev = (s: string) => evaluate(parseCards(s));
const cat = (s: string) => categoryOf(ev(s));

describe('evaluate', () => {
  it('identifies every category', () => {
    expect(cat('AsKsQsJsTs2d3c')).toBe(HandCategory.StraightFlush);
    expect(cat('9h9d9s9c2d3c4h')).toBe(HandCategory.Quads);
    expect(cat('KhKdKs2c2d7h8s')).toBe(HandCategory.FullHouse);
    expect(cat('Ah9h7h4h2h3cKd')).toBe(HandCategory.Flush);
    expect(cat('9c8d7h6s5c2d2h')).toBe(HandCategory.Straight);
    expect(cat('7c7d7hAsKd2c3h')).toBe(HandCategory.Trips);
    expect(cat('AcAdKhKs2c3d4h')).toBe(HandCategory.TwoPair);
    expect(cat('QcQd9h7s5c3d2h')).toBe(HandCategory.Pair);
    expect(cat('AcJd9h7s5c3d2h')).toBe(HandCategory.HighCard);
  });

  it('handles the wheel and wheel straight flush', () => {
    expect(cat('Ac2d3h4s5cKdQh')).toBe(HandCategory.Straight);
    expect(ev('Ac2d3h4s5c')).toBeLessThan(ev('2c3d4h5s6c'));
    expect(cat('Ah2h3h4h5h9c9d')).toBe(HandCategory.StraightFlush);
  });

  it('uses kickers and ignores the sixth and seventh cards', () => {
    expect(ev('AcAdKh7s5c3d2h')).toBeGreaterThan(ev('AhAsQh7d5d3c2c'));
    expect(ev('AcAdKhQsJc3d2h')).toBe(ev('AhAsKdQdJd4c2s'));
  });

  it('picks the best full house from two sets of trips', () => {
    expect(ev('KhKdKs2c2d2hAs')).toBe(ev('KhKdKs2c2dQcJh'));
  });

  it('plays the best two pair out of three', () => {
    expect(ev('AcAdKhKs2c2d7h')).toBe(ev('AhAsKdKc7s3d4c'));
  });
});

import { describe, expect, it } from 'vitest';
import { betEV, bluffBreakeven, bluffEV, callEV, mdf, optimalBluffShare, outsToEquity, potOdds } from '../src';

describe('pot math', () => {
  it('computes pot odds, MDF and alpha for a pot sized bet', () => {
    // Pot 10, villain bets 10: we call 10 into 20.
    expect(potOdds(20, 10)).toBeCloseTo(1 / 3);
    expect(mdf(10, 10)).toBeCloseTo(0.5);
    expect(bluffBreakeven(10, 10)).toBeCloseTo(0.5);
    expect(optimalBluffShare(10, 10)).toBeCloseTo(1 / 3);
  });

  it('makes a call at exactly pot odds break even', () => {
    expect(callEV(20, 10, 1 / 3)).toBeCloseTo(0);
    expect(bluffEV(10, 10, 0.5)).toBeCloseTo(0);
  });

  it('reduces betEV to bluffEV with zero equity', () => {
    expect(betEV(10, 5, 0.4, 0)).toBeCloseTo(bluffEV(10, 5, 0.4));
  });

  it('computes exact draw odds', () => {
    // Nine outs, flop to river, 47 unseen.
    expect(outsToEquity(9, 47, 2)).toBeCloseTo(0.3497, 3);
    expect(outsToEquity(9, 46, 1)).toBeCloseTo(9 / 46);
  });
});

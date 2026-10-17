import { describe, expect, it } from 'vitest';
import { bbCallEquity, openRange, raiseOverLimpers, rangeShare, SEATS } from '../src/charts';
import { MARK } from '../src/mark';

describe('site charts', () => {
  it('paints the real starter charts, tight to wide', () => {
    const shares = SEATS.map((s) => s.share);
    expect(shares[0]).toBeGreaterThan(0.1);
    expect(shares[0]).toBeLessThan(0.14);
    expect(shares[3]).toBeGreaterThan(0.38);
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan(shares[i - 1]);
  });

  it('keeps mixed hands mixed', () => {
    const utg = SEATS[0].range;
    expect(utg.get('AA')).toBe(1);
    const mixed = [...utg.values()].filter((f) => f > 0 && f < 1);
    expect(mixed.length).toBeGreaterThan(3);
  });

  it('counts a full range as every combo', () => {
    const all = new Map([...openRange('9max-100-rfi-btn').keys()].map((h) => [h, 1]));
    expect(rangeShare(all)).toBeCloseTo(1, 6);
  });

  it('prices the big blind call with plain pot odds', () => {
    expect(bbCallEquity(2.5)).toBeCloseTo(1.5 / 5.5, 6);
    expect(Math.round(bbCallEquity(5) * 100)).toBe(38);
    expect(Math.round(bbCallEquity(10) * 100)).toBe(44);
    // A limper's chip is dead money, so the big blind gets a better price.
    expect(bbCallEquity(6, 1)).toBeLessThan(bbCallEquity(6, 0));
  });

  it('adds 1bb per limper to the open', () => {
    expect(raiseOverLimpers(5, 0)).toBe(5);
    expect(raiseOverLimpers(5, 2)).toBe(7);
  });
});

describe('site mark', () => {
  it('matches the app mark: symmetric, with pairs on the diagonal', () => {
    MARK.forEach((row, r) =>
      [...row].forEach((k, c) => {
        expect(MARK[c][r]).toBe(k);
        expect(k === 'P').toBe(r === c);
        expect(k !== '.').toBe(r === 0 || c === 0 || r === c || r + c <= 3);
      }),
    );
  });
});

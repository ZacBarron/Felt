import { describe, expect, it } from 'vitest';
import {
  allInValues,
  bubbleFactor,
  chipChop,
  chipRequiredEquity,
  finishChances,
  icmCallEV,
  icmEquity,
  icmRequiredEquity,
  icmShoveEV,
  icmValueAfter,
  riskPremium,
} from '../src';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('finishChances', () => {
  it('matches the hand computed chances for 5,000 / 3,000 / 2,000', () => {
    const [a, b, c] = finishChances([5000, 3000, 2000]);
    // 1st is the chip share.
    expect([a[0], b[0], c[0]]).toEqual([0.5, 0.3, 0.2]);
    // A 2nd: B wins then A takes 5/7, or C wins then A takes 5/8.
    expect(a[1]).toBeCloseTo(0.3 * (5 / 7) + 0.2 * (5 / 8), 12);
    expect(b[1]).toBeCloseTo(0.5 * (3 / 5) + 0.2 * (3 / 8), 12);
    expect(c[1]).toBeCloseTo(0.5 * (2 / 5) + 0.3 * (2 / 7), 12);
    // Third is what is left.
    for (const row of [a, b, c]) expect(sum(row)).toBeCloseTo(1, 12);
  });

  it('fills every place exactly once', () => {
    const st = [9, 7, 5, 3, 1, 4];
    const m = finishChances(st);
    for (const row of m) expect(sum(row)).toBeCloseTo(1, 12);
    for (let p = 0; p < st.length; p++) expect(sum(m.map((r) => r[p]))).toBeCloseTo(1, 12);
  });

  it('stops at the places asked for and skips busted players', () => {
    expect(finishChances([1, 1, 1, 1], 1)).toEqual([[0.25], [0.25], [0.25], [0.25]]);
    const m = finishChances([3, 0, 1]);
    expect(m[1]).toEqual([0, 0]);
    expect(m[0]).toEqual([0.75, 0.25]);
  });

  it('rejects bad stacks', () => {
    expect(() => finishChances([1, -1])).toThrow(RangeError);
    expect(() => finishChances([1, Number.NaN])).toThrow(RangeError);
  });
});

describe('icmEquity', () => {
  it('gives the values of the ICM lesson: $38.39, $32.75 and $28.86', () => {
    const money = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    expect(money.map((m) => m.toFixed(2))).toEqual(['38.39', '32.75', '28.86']);
    // A by hand: 50 × 0.5 + 30 × P(A 2nd) + 20 × P(A 3rd).
    const a2 = 0.3 * (5 / 7) + 0.2 * (5 / 8);
    expect(money[0]).toBeCloseTo(50 * 0.5 + 30 * a2 + 20 * (1 - 0.5 - a2), 12);
    expect(sum(money)).toBeCloseTo(100, 12);
  });

  it('gives the values of the bubble and final table lessons', () => {
    expect(icmEquity([4000, 3000, 2000, 1000], [50, 30, 20]).map((m) => m.toFixed(2))).toEqual(['33.60', '29.49', '23.59', '13.32']);
    expect(icmEquity([30000, 20000, 20000, 15000, 15000], [400, 250, 160, 110, 80]).map((m) => m.toFixed(2))).toEqual([
      '240.61',
      '201.98',
      '201.98',
      '177.71',
      '177.71',
    ]);
  });

  it('is linear heads up and equal for equal stacks', () => {
    const [a, b] = icmEquity([60000, 40000], [400, 250]);
    expect(a).toBeCloseTo(250 + 0.6 * 150, 12);
    expect(b).toBeCloseTo(250 + 0.4 * 150, 12);
    for (const m of icmEquity([5, 5, 5, 5], [50, 30, 20])) expect(m).toBeCloseTo(25, 12);
  });

  it('pays chip share when the winner takes all', () => {
    const st = [7, 2, 1];
    icmEquity(st, [100]).forEach((m, i) => expect(m).toBeCloseTo((100 * st[i]) / 10, 12));
  });

  it('does not depend on chip units or seat order', () => {
    const a = icmEquity([5, 3, 2], [50, 30, 20]);
    const b = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    a.forEach((m, i) => expect(m).toBeCloseTo(b[i], 12));
    const c = icmEquity([2, 5, 3], [50, 30, 20]);
    expect(c[1]).toBeCloseTo(a[0], 12);
    expect(c[0]).toBeCloseTo(a[2], 12);
  });

  it('values chips below face value for the leader and above it for the short stack', () => {
    const money = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    expect(money[0]).toBeLessThan(50);
    expect(money[2]).toBeGreaterThan(20);
  });

  it('handles a busted player and more payouts than players', () => {
    const money = icmEquity([3, 0, 1], [50, 30, 20]);
    expect(money[1]).toBe(0);
    expect(sum(money)).toBeCloseTo(80, 12);
    expect(icmEquity([1, 1], [50, 30, 20])).toEqual([40, 40]);
  });

  it('runs a 9 player final table quickly', () => {
    const st = [45, 38, 30, 25, 22, 18, 12, 6, 4];
    const pay = [300, 200, 140, 100, 80, 65, 50, 40, 25];
    const money = icmEquity(st, pay);
    expect(sum(money)).toBeCloseTo(sum(pay), 9);
    for (let i = 1; i < st.length; i++) expect(money[i]).toBeLessThan(money[i - 1]);
  });
});

describe('icmValueAfter', () => {
  it('pays a busted player the place just below everyone still in', () => {
    expect(icmValueAfter([6000, 0, 2000, 2000], [50, 30, 20, 0], 1)).toBe(0);
    expect(icmValueAfter([6000, 0, 4000], [50, 30, 20], 1)).toBe(20);
    // The others share the places above the bust.
    expect(icmValueAfter([6000, 0, 4000], [50, 30, 20], 0)).toBeCloseTo(30 + 0.6 * 20, 12);
  });
});

describe('allInValues and the prices it gives', () => {
  it('reproduces B calling A in the ICM lesson: 12.75 ÷ 21 = 60.7%', () => {
    const v = allInValues([5000, 3000, 2000], [50, 30, 20], 1, 0);
    expect(v.risk).toBe(3000);
    expect(v.call).toBe(3000);
    expect(v.fold).toBeCloseTo(32.75, 2);
    expect(v.win).toBeCloseTo(41, 12);
    expect(v.lose).toBe(20);
    expect(icmRequiredEquity(v)).toBeCloseTo((v.fold - 20) / 21, 12);
    expect((icmRequiredEquity(v) * 100).toFixed(1)).toBe('60.7');
    expect(chipRequiredEquity(v)).toBe(0.5);
    expect((riskPremium(v) * 100).toFixed(1)).toBe('10.7');
  });

  it('reproduces the bubble, final table and satellite prices', () => {
    const bubble = [4000, 3000, 2000, 1000];
    const pay = [50, 30, 20, 0];
    const need = (st: number[], p: number[], caller: number, shover: number) => (icmRequiredEquity(allInValues(st, p, caller, shover)) * 100).toFixed(1);
    expect([need(bubble, pay, 3, 0), need(bubble, pay, 2, 0), need(bubble, pay, 1, 0)]).toEqual(['61.1', '70.2', '72.9']);
    expect([need(bubble, pay, 0, 3), need(bubble, pay, 0, 1), need(bubble, pay, 1, 3)]).toEqual(['52.9', '63.1', '53.7']);
    const ft = [30000, 20000, 20000, 15000, 15000];
    const ftPay = [400, 250, 160, 110, 80];
    expect([need(ft, ftPay, 1, 0), need(ft, ftPay, 0, 1)]).toEqual(['62.8', '57.6']);
    expect(need([30000, 20000, 20000, 28000, 2000], ftPay, 1, 0)).toBe('64.9');
    expect(need([40, 30, 20, 7, 3], [1000, 1000, 1000, 1000], 2, 1)).toBe('95.8');
  });

  it('heads up, ICM prices equal chip prices, with blinds and dead money too', () => {
    const st = [6000, 4000];
    const pay = [50, 30];
    const bare = allInValues(st, pay, 1, 0);
    expect(icmRequiredEquity(bare)).toBeCloseTo(0.5, 12);
    expect(riskPremium(bare)).toBeCloseTo(0, 12);
    // Big blind 200 against a small blind 100 shove: call 3,800 into 8,000.
    const blinds = allInValues(st, pay, 1, 0, { heroLive: 200, villainLive: 100 });
    expect(blinds.call).toBe(3800);
    expect(chipRequiredEquity(blinds)).toBeCloseTo(3800 / 8000, 12);
    expect(icmRequiredEquity(blinds)).toBeCloseTo(3800 / 8000, 12);
    // 300 of dead money: call 4,000 into 8,300.
    const dead = allInValues([6000, 4000, 1000], [50, 30, 20], 1, 0, { dead: 300 });
    expect(chipRequiredEquity(dead)).toBeCloseTo(4000 / 8300, 12);
  });

  it('moves the chips the right way in each outcome', () => {
    const pay = [50, 30, 20];
    const st = [5000, 3000, 2000];
    const v = allInValues(st, pay, 1, 0, { heroLive: 200, villainLive: 100, dead: 50 });
    const at = (s: number[]) => icmEquity(s, pay)[1];
    expect(v.fold).toBeCloseTo(at([5250, 2800, 2000]), 12);
    expect(v.steal).toBeCloseTo(at([4900, 3150, 2000]), 12);
    expect(v.win).toBeCloseTo(at([2000, 6050, 2000]), 12);
    expect(v.lose).toBe(20);
  });

  it('prices calls and shoves from the outcomes', () => {
    const v = allInValues([5000, 3000, 1200, 800], [50, 30, 20, 0], 0, 1, { heroLive: 100, villainLive: 200 });
    expect(icmCallEV(v, 1)).toBeCloseTo(v.win, 12);
    expect(icmCallEV(v, 0)).toBeCloseTo(v.lose, 12);
    expect(icmShoveEV(v, 1, 0)).toBeCloseTo(v.steal, 12);
    expect(icmShoveEV(v, 0, 0.4)).toBeCloseTo(icmCallEV(v, 0.4), 12);
    expect(icmShoveEV(v, 0.5, 0.4)).toBeCloseTo(0.5 * v.steal + 0.5 * (0.4 * v.win + 0.6 * v.lose), 12);
    // A call at exactly the required equity breaks even against folding.
    expect(icmCallEV(v, icmRequiredEquity(v))).toBeCloseTo(v.fold, 12);
  });

  it('rejects impossible spots', () => {
    expect(() => allInValues([1, 1], [1], 0, 0)).toThrow(RangeError);
    expect(() => allInValues([1, 0], [1], 0, 1)).toThrow(RangeError);
    expect(() => allInValues([1, 1], [1], 0, 1, { dead: -1 })).toThrow(RangeError);
    expect(() => allInValues([1, 1], [1], 0, 1, { heroLive: 2 })).toThrow(RangeError);
  });
});

describe('bubbleFactor', () => {
  it('is money lost over money won, and sets the price BF ÷ (1 + BF)', () => {
    const st = [5000, 3000, 1000, 1000];
    const pay = [50, 30, 20, 0];
    const v = allInValues(st, pay, 1, 0);
    const bf = bubbleFactor(st, pay, 1, 0);
    expect(bf).toBeCloseTo((v.fold - v.lose) / (v.win - v.fold), 12);
    expect(icmRequiredEquity(v)).toBeCloseTo(bf / (1 + bf), 12);
    expect(bf.toFixed(2)).toBe('3.21');
  });

  it('is 1 heads up and above 1 for a covered stack on the bubble', () => {
    expect(bubbleFactor([7000, 3000], [50, 30], 1, 0)).toBeCloseTo(1, 12);
    expect(bubbleFactor([4000, 3000, 2000, 1000], [50, 30, 20], 1, 0)).toBeGreaterThan(1);
    // The covering stack pays less than the covered one.
    expect(bubbleFactor([4000, 3000, 2000, 1000], [50, 30, 20], 0, 1)).toBeLessThan(bubbleFactor([4000, 3000, 2000, 1000], [50, 30, 20], 1, 0));
  });

  it('is 1 when the winner takes all, since chips are then money', () => {
    expect(bubbleFactor([5, 3, 2], [100], 1, 0)).toBeCloseTo(1, 12);
  });
});

describe('chipChop', () => {
  it('locks in the last payout and splits the rest by chips', () => {
    expect(chipChop([600000, 250000, 150000], [5000, 3000, 2000])).toEqual([4400, 3000, 2600]);
    expect(sum(chipChop([3, 2, 1], [60, 30, 10]))).toBeCloseTo(100, 12);
    // Equal stacks split evenly.
    expect(chipChop([1, 1], [70, 30])).toEqual([50, 50]);
  });

  it('pays the leader more than ICM does', () => {
    const st = [600000, 250000, 150000];
    const pay = [5000, 3000, 2000];
    expect(chipChop(st, pay)[0]).toBeGreaterThan(icmEquity(st, pay)[0]);
    expect(chipChop(st, pay)[2]).toBeLessThan(icmEquity(st, pay)[2]);
  });

  it('needs a payout for each player and chips in play', () => {
    expect(() => chipChop([1, 1, 1], [10, 5])).toThrow(RangeError);
    expect(() => chipChop([0, 0], [10, 5])).toThrow(RangeError);
  });
});

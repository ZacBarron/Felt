import { betEV, bluffBreakeven, bluffEV, callEV, equityVsRange, exactEquity, parseCards, parseComboRange, potOdds, rakeFor, seededRng, type Card } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { LESSON_CONTENT, type LessonArt, type LessonContent } from '../src';

/**
 * Numbers in the hand reading, semi bluff, rake, reshove, bubble and final
 * table lessons, recomputed with @felt/core. Each lesson states these values;
 * if the math or the lesson changes, this file says which one moved.
 */

const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
const text = (key: string) => JSON.stringify(lesson(key));
const visuals = (key: string) => lesson(key).steps.flatMap((s) => (s.kind === 'visual' ? [s.art] : []));
function pick<K extends LessonArt['kind']>(art: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(art.kind).toBe(kind);
  return art as Extract<LessonArt, { kind: K }>;
}
const bars = (art: LessonArt) => pick(art, 'bars').bars.map((b) => b.value);
const pct = (x: number, digits = 1) => (x * 100).toFixed(digits);
const pc = (s: string) => parseCards(s) as [Card, Card];

/** Malmuth-Harville ICM: each finishing order weighted by stack shares. */
function icm(stacks: number[], payouts: number[]): number[] {
  const money = stacks.map(() => 0);
  const walk = (left: number[], place: number, p: number) => {
    if (place >= payouts.length) return;
    const total = left.reduce((s, i) => s + stacks[i], 0);
    for (const i of left) {
      const q = (p * stacks[i]) / total;
      money[i] += q * payouts[place];
      walk(
        left.filter((j) => j !== i),
        place + 1,
        q,
      );
    }
  };
  walk(
    stacks.flatMap((s, i) => (s > 0 ? [i] : [])),
    0,
    1,
  );
  return money;
}

/** Caller's $EV after folding, winning and losing an all in against the shover, blinds ignored. */
function allIn(stacks: number[], payouts: number[], shover: number, caller: number) {
  const risk = Math.min(stacks[shover], stacks[caller]);
  const after = (delta: number) => stacks.map((s, i) => (i === caller ? s + delta : i === shover ? s - delta : s));
  const value = (st: number[]) => {
    const alive = st.filter((s) => s > 0).length;
    // A busted caller finishes just below everyone still in.
    if (st[caller] === 0) return payouts[alive] ?? 0;
    return icm(st, payouts.slice(0, alive))[caller];
  };
  const fold = icm(stacks, payouts)[caller];
  const win = value(after(risk));
  const lose = value(after(-risk));
  return { fold, win, lose, need: (fold - lose) / (win - lose) };
}

describe('hand reading', () => {
  const key = 'postflop/hand-reading/narrowing';
  const dead = parseCards('QcJcQh9h5c2s3d');
  const count = (range: string, d = dead) => parseComboRange(range, d).length;
  const opens = '77+, ATs+, KTs+, QTs+, JTs, T9s, 98s, AJo+, KQo';
  const value = 'AA, KK, QQ, 99, AQ, KQ';
  const draws = 'AhKh, AhJh, AhTh, KhJh, KhTh, JhTh, JsTs, JdTd';

  it('counts the range on every street', () => {
    // The two draws listed by hand are the open enders left after Q♣J♣ removes J♣T♣.
    expect(count('JTs')).toBe(3);
    expect(count(draws)).toBe(8);
    expect([count(opens, []), count(opens), count(`${value}, QJs, QTs, ${draws}`), count(`${value}, ${draws}`)]).toEqual([144, 105, 44, 40]);
    expect(bars(lesson(key).cover)).toEqual([144, 105, 44, 40]);
    // Every hand kept on the river comes from the opening range.
    const open = new Set(parseComboRange(opens, dead).map((c) => c.cards.join()));
    for (const c of parseComboRange(`${value}, QJs, QTs, ${draws}`, dead)) expect(open.has(c.cards.join())).toBe(true);
    expect(count(value)).toBe(32);
    expect(count('AQ', parseCards('QcJcQh9h5c'))).toBe(8);
    expect(count('AQ', parseCards('Qh9h5c'))).toBe(12);
    expect(count('AQ', [])).toBe(16);
  });

  it('beats only the draws, so the call needs more than it wins', () => {
    const board = parseCards('Qh9h5c2s3d');
    const showdown = (range: string) => parseComboRange(range, dead).map((c) => exactEquity(pc('QcJc'), c.cards as [Card, Card], board).equity);
    expect(showdown(value).every((e) => e === 0)).toBe(true);
    expect(showdown(draws).every((e) => e === 1)).toBe(true);
    const ring = pick(visuals(key)[0], 'ring');
    expect(ring.value).toBe(8 / 40);
    expect(pct(potOdds(2, 1))).toBe('33.3');
  });
});

describe('semi bluffs', () => {
  const key = 'postflop/hand-reading/semi-bluffs';
  it('turn shove with a flush draw', () => {
    const eq = exactEquity(pc('9h8h'), pc('KcQd'), parseCards('Kh7h2c4s')).equity;
    expect(eq).toBe(9 / 44);
    expect(pct(eq)).toBe('20.5');
    const called = eq * 60 - 20;
    expect(called.toFixed(2)).toBe('-7.73');
    const breakeven = -called / (20 - called);
    expect(pct(breakeven)).toBe('27.9');
    expect(betEV(20, 20, breakeven, eq)).toBeCloseTo(0, 12);
    expect(bluffBreakeven(20, 20)).toBe(0.5);
    // The tree: folds 40%, called and hit, called and miss.
    expect([pct(0.6 * eq), pct(0.6 * (1 - eq))]).toEqual(['12.3', '47.7']);
    expect([(0.6 * eq * 40).toFixed(2), (0.6 * (1 - eq) * 20).toFixed(2)]).toEqual(['4.91', '9.55']);
    expect(betEV(20, 20, 0.4, eq).toFixed(2)).toBe('3.36');
    expect(bluffEV(20, 20, 0.4)).toBe(-4);
    const tree = pick(visuals(key)[0], 'tree');
    expect(tree.branches.map((b) => b.label)).toEqual(['Villain folds, 40%', 'Called and you hit, 12.3%', 'Called and you miss, 47.7%']);
  });

  it('combo draws are favorites', () => {
    expect(pct(exactEquity(pc('JhTh'), pc('AsAd'), parseCards('9h8c2h')).equity)).toBe('56.3');
    expect(pct(exactEquity(pc('QsJs'), pc('AhTd'), parseCards('Ts9s3h')).equity)).toBe('68.9');
    expect(text(key)).toContain('56.3%');
    expect(text(key)).toContain('68.9%');
  });
});

describe('rake', () => {
  const key = 'preflop/stack-depth/rake';
  const live = { percent: 0.1, cap: 5, dropExtra: 1, noFlopNoDrop: true };
  const online = { percent: 0.05, cap: 3, dropExtra: 0, noFlopNoDrop: true };

  it('live drop table', () => {
    expect([20, 31, 60, 200].map((p) => rakeFor(p, live))).toEqual([3, 4.1, 6, 6]);
    expect([20, 31, 60, 200].map((p) => pct(rakeFor(p, live) / p))).toEqual(['15.0', '13.2', '10.0', '3.0']);
    expect(rakeFor(31, live, false)).toBe(0);
  });

  it('prices with and without rake', () => {
    // BB calls $12 against a $15 open: pot $19 before the call, $31 after.
    expect(pct(potOdds(19, 12))).toBe('38.7');
    expect(pct(12 / (31 - rakeFor(31, live)))).toBe('44.6');
    expect(pct(12 / (31 - 6))).toBe('48.0');
    expect(bars(lesson(key).cover)).toEqual([38.7, 44.6]);
    // Online: 5% capped at 3bb, BB against a 2.5bb open.
    expect(pct(potOdds(4, 1.5))).toBe('27.3');
    expect(rakeFor(5.5, online)).toBeCloseTo(0.275, 12);
    expect(pct(1.5 / (5.5 - rakeFor(5.5, online)))).toBe('28.7');
    expect(callEV(4, 1.5, 0.28).toFixed(2)).toBe('0.04');
    expect((0.28 * (5.5 - rakeFor(5.5, online)) - 1.5).toFixed(2)).toBe('-0.04');
  });
});

describe('bubble', () => {
  const key = 'tournaments/mtt-basics/bubble';
  const stacks = [4000, 3000, 2000, 1000];
  const pay = [50, 30, 20, 0];

  it('chips against money', () => {
    const money = icm(stacks, pay);
    expect(money.map((m) => m.toFixed(2))).toEqual(['33.60', '29.49', '23.59', '13.32']);
    expect(money.reduce((a, b) => a + b)).toBeCloseTo(100, 9);
    expect(pick(lesson(key).cover, 'chips').stacks.map((s) => s.bb)).toEqual(stacks.map((s) => s / 200));
  });

  it('prices to call an all in', () => {
    const need = (shover: number, caller: number) => pct(allIn(stacks, pay, shover, caller).need);
    const b = allIn(stacks, pay, 0, 1);
    expect([b.fold.toFixed(2), b.win.toFixed(2), b.lose]).toEqual(['29.49', '40.45', 0]);
    expect([need(0, 3), need(0, 2), need(0, 1)]).toEqual(['61.1', '70.2', '72.9']);
    expect(bars(visuals(key)[0])).toEqual([50, 61.1, 70.2, 72.9]);
    expect([need(3, 0), need(1, 0), need(3, 1)]).toEqual(['52.9', '63.1', '53.7']);
  });
});

describe('final table', () => {
  const key = 'tournaments/mtt-basics/final-table';
  const pay = [400, 250, 160, 110, 80];
  const stacks = [30000, 20000, 20000, 15000, 15000];

  it('chips against money and the payout curve', () => {
    const money = icm(stacks, pay);
    expect(money.map((m) => m.toFixed(2))).toEqual(['240.61', '201.98', '201.98', '177.71', '177.71']);
    expect(pct(money[0] / 1000)).toBe('24.1');
    expect(pick(lesson(key).cover, 'curve').points).toEqual(pay.map((p, i) => [i + 1, (p / 1000) * 100]));
  });

  it('covering stacks call lighter, and a tiny stack adds pressure', () => {
    const bCallsA = allIn(stacks, pay, 0, 1);
    expect([bCallsA.fold.toFixed(2), bCallsA.win.toFixed(2), bCallsA.lose]).toEqual(['201.98', '274.15', 80]);
    expect(bars(visuals(key)[0])).toEqual([50, Number(pct(allIn(stacks, pay, 1, 0).need)), Number(pct(bCallsA.need))]);
    expect([pct(allIn(stacks, pay, 1, 0).need), pct(bCallsA.need)]).toEqual(['57.6', '62.8']);
    expect(pct(allIn([30000, 20000, 20000, 28000, 2000], pay, 0, 1).need)).toBe('64.9');
  });

  it('heads up, money is linear in chips', () => {
    const [a, b] = icm([60000, 40000], [400, 250]);
    expect(a).toBeCloseTo(250 + 0.6 * 150, 9);
    expect(a).toBeCloseTo(340, 9);
    expect(b).toBeCloseTo(310, 9);
  });
});

describe('reshoves', () => {
  const key = 'tournaments/mtt-basics/reshoves';
  const button = '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 76s, 65s, A2o+, K8o+, Q9o+, J9o+, T9o';
  const lojack = '33+, A8s+, KTs+, QTs+, JTs, T9s, AJo+, KQo';
  const calls = '88+, ATs+, KQs, AJo+';
  // Exact over every board, averaged over the calling combos (computed once by enumeration; checked below by sampling).
  const EQ = { As5d: 0.293749, '7s6s': 0.320474 };
  const fold = (opens: string, hand: string) => {
    const dead = parseCards(hand);
    return 1 - parseComboRange(calls, dead).length / parseComboRange(opens, dead).length;
  };
  // Big blind with S bb after a 1bb ante: pot 4.7bb, risk S − 1, final pot 2S + 1.5.
  const ev = (f: number, eq: number, s: number) => f * 4.7 + (1 - f) * (eq * (2 * s + 1.5) - (s - 1));

  it('pot, risk and the zero equity price', () => {
    expect(0.5 + 1 + 1 + 2.2).toBe(4.7);
    expect(4.7 + 19 + 17.8).toBe(41.5);
    expect(pct(19 / (4.7 + 19))).toBe('80.2');
    expect(pct(19 / (3.7 + 19))).toBe('83.7');
    expect(pct(19 / 41.5)).toBe('45.8');
  });

  it('fold equity from each opener', () => {
    expect([parseComboRange(button).length, parseComboRange(lojack).length]).toEqual([526, 172]);
    expect([pct(526 / 1326), pct(172 / 1326)]).toEqual(['39.7', '13.0']);
    const dead = parseCards('As5d');
    expect([parseComboRange(calls, dead).length, parseComboRange(calls, parseCards('7s6s')).length]).toEqual([82, 98]);
    expect([pct(fold(button, 'As5d')), pct(fold(lojack, 'As5d')), pct(fold(button, '7s6s'))]).toEqual(['82.4', '45.7', '80.4']);
    expect(ev(fold(button, 'As5d'), EQ.As5d, 20).toFixed(2)).toBe('2.67');
    expect(ev(fold(lojack, 'As5d'), EQ.As5d, 20).toFixed(2)).toBe('-1.55');
    expect(bars(visuals(key)[0])).toEqual([12, 20, 25].map((s) => Number(ev(fold(lojack, 'As5d'), EQ.As5d, s).toFixed(2))));
  });

  it('equity against the calls', () => {
    for (const [hand, eq] of Object.entries(EQ)) {
      const range = parseComboRange(calls, parseCards(hand));
      const sampled = equityVsRange(pc(hand), range, [], { iterations: 200_000, rng: seededRng(7) }).equity;
      expect(Math.abs(sampled - eq), hand).toBeLessThan(0.004);
    }
    expect([pct(EQ.As5d), pct(EQ['7s6s'])]).toEqual(['29.4', '32.0']);
  }, 60_000);
});

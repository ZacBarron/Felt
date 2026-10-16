import {
  ALL_HAND_CLASSES,
  allInValues,
  bubbleFactor,
  chipChop,
  chipRequiredEquity,
  equityVsRange,
  finishChances,
  icmCallEV,
  icmEquity,
  icmRequiredEquity,
  icmShoveEV,
  parseCards,
  parseComboRange,
  rangeToCombos,
  riskPremium,
  seededRng,
  type Card,
  type WeightedCombo,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, LESSON_CONTENT, type LessonArt, type LessonContent, type LessonStep } from '../src';

/**
 * Every number in the advanced tournament lessons, recomputed with the ICM
 * functions in @felt/core (exact Malmuth-Harville) and, for hand equities,
 * the equity tool. If the math or a lesson changes, this file says which one
 * moved. It also checks that core ICM reproduces the values the earlier ICM,
 * bubble and final table lessons show.
 */

const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
const text = (key: string) => JSON.stringify(lesson(key));
const step = (key: string, title: string): LessonStep => {
  const s = lesson(key).steps.find((x) => 'title' in x && x.title === title);
  if (!s) throw new Error(`${key}: no step "${title}"`);
  return s;
};
const art = (key: string, title: string): LessonArt => {
  const s = step(key, title);
  if (s.kind !== 'visual') throw new Error(`${key}: "${title}" is not a visual`);
  return s.art;
};
const caption = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind !== 'visual') throw new Error(`${key}: "${title}" is not a visual`);
  return s.caption;
};
const rows = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind !== 'table') throw new Error(`${key}: "${title}" is not a table`);
  return s.rows;
};
const example = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind !== 'formula') throw new Error(`${key}: "${title}" is not a formula`);
  return s;
};
const quiz = (key: string, question: string) => {
  const q = lesson(key).steps.find((s) => s.kind === 'quiz' && s.question === question);
  if (!q || q.kind !== 'quiz') throw new Error(`${key}: no quiz "${question}"`);
  return q;
};
const answerOf = (key: string, question: string) => {
  const q = quiz(key, question);
  return q.choices[q.answer];
};
function pick<K extends LessonArt['kind']>(a: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(a.kind).toBe(kind);
  return a as Extract<LessonArt, { kind: K }>;
}
const bars = (a: LessonArt) => pick(a, 'bars').bars.map((b) => b.value);
const chips = (a: LessonArt) => pick(a, 'chips').stacks.map((s) => s.bb);
const pct = (x: number, digits = 1) => (x * 100).toFixed(digits);
const num = (x: number, digits = 2) => Number(x.toFixed(digits));
const usd = (x: number) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pc = (s: string) => parseCards(s) as [Card, Card];

const BUBBLE_PAY = [50, 30, 20, 0];

describe('the topic', () => {
  it('sits in the tournaments track with 5 advanced lessons', () => {
    const mod = CURRICULUM.find((t) => t.id === 'tournaments')!.modules.find((m) => m.id === 'icm-play')!;
    expect(mod.title).toBe('Advanced tournament play');
    expect(mod.lessons.map((l) => l.id)).toEqual(['bubble-factor', 'big-stack', 'middle-stacks', 'pay-jumps', 'deals']);
    for (const l of mod.lessons) expect(lesson(`tournaments/icm-play/${l.id}`).level).toBe('advanced');
  });
});

describe('core ICM agrees with the earlier tournament lessons', () => {
  it('the ICM lesson: 5,000 / 3,000 / 2,000 paying $50 / $30 / $20', () => {
    const key = 'tournaments/mtt-basics/icm';
    const st = [5000, 3000, 2000];
    const pay = [50, 30, 20];
    const money = icmEquity(st, pay);
    expect(rows(key, 'Chips against money').map((r) => r[3])).toEqual(money.map(usd));
    expect(rows(key, 'Finishing chances').map((r) => r.slice(1))).toEqual(finishChances(st).map((r) => r.map((p) => `${pct(p)}%`)));
    const b = allInValues(st, pay, 1, 0);
    expect([b.fold.toFixed(2), b.win.toFixed(2), b.lose.toFixed(2)]).toEqual(['32.75', '41.00', '20.00']);
    expect(pct(icmRequiredEquity(b))).toBe('60.7');
    expect(pct(riskPremium(b))).toBe('10.7');
    expect(pct(icmRequiredEquity(allInValues(st, pay, 0, 2)))).toBe('52.1');
  });

  it('the bubble lesson: 4 left, 3 paid', () => {
    const key = 'tournaments/mtt-basics/bubble';
    const st = [4000, 3000, 2000, 1000];
    expect(rows(key, 'Four left, three paid').map((r) => r[3])).toEqual(icmEquity(st, BUBBLE_PAY).map(usd));
    const need = (caller: number, shover: number) => Number(pct(icmRequiredEquity(allInValues(st, BUBBLE_PAY, caller, shover))));
    expect(bars(art(key, 'Equity needed to call the big stack'))).toEqual([50, need(3, 0), need(2, 0), need(1, 0)]);
    expect(bars(art(key, 'The big stack covers everyone'))).toEqual([need(0, 3), need(1, 3), need(0, 1), need(1, 0)]);
  });

  it('the final table lesson: 5 left', () => {
    const key = 'tournaments/mtt-basics/final-table';
    const st = [30000, 20000, 20000, 15000, 15000];
    const pay = [400, 250, 160, 110, 80];
    expect(rows(key, 'Five left, chips against money').map((r) => r[3])).toEqual(icmEquity(st, pay).map(usd));
    const need = (s: number[], caller: number, shover: number) => Number(pct(icmRequiredEquity(allInValues(s, pay, caller, shover))));
    expect(bars(art(key, 'Covering against covered'))).toEqual([50, need(st, 0, 1), need(st, 1, 0)]);
    expect(bars(art(key, 'A tiny stack adds pressure'))).toEqual([need(st, 1, 0), need([30000, 20000, 20000, 28000, 2000], 1, 0)]);
  });
});

/* Bubble factor and risk premium ------------------------------------------- */

describe('bubble factor and risk premium', () => {
  const key = 'tournaments/icm-play/bubble-factor';
  /** A covers with 5,000; the other 2 split what is left evenly. */
  const stacksFor = (you: number) => [5000, you, (5000 - you) / 2, (5000 - you) / 2];
  const spot = (you: number) => allInValues(stacksFor(you), BUBBLE_PAY, 1, 0);

  it('values the 4 stacks', () => {
    const st = stacksFor(3000);
    expect(st).toEqual([5000, 3000, 1000, 1000]);
    expect(rows(key, 'Four left, three paid')).toEqual(
      ['A', 'You', 'C', 'D'].map((p, i) => [p, st[i].toLocaleString('en-US'), usd(icmEquity(st, BUBBLE_PAY)[i])]),
    );
  });

  it('prices the all in against A', () => {
    const v = spot(3000);
    expect([usd(v.fold), usd(v.win), usd(v.lose)]).toEqual(['$30.83', '$40.45', '$0.00']);
    expect(usd(v.win - v.fold)).toBe('$9.62');
    expect(v.risk).toBe(3000);
    const tree = pick(art(key, 'One all in against A'), 'tree');
    expect(tree.branches.map((b) => b.value)).toEqual([usd(v.fold), `${usd(v.win)}, up ${usd(v.win - v.fold)}`, `$0, down ${usd(v.fold)}`]);
    expect(caption(key, 'One all in against A')).toContain('6,000 chips');

    const bf = bubbleFactor(stacksFor(3000), BUBBLE_PAY, 1, 0);
    expect(bf.toFixed(1)).toBe('3.2');
    // From the rounded dollars too.
    expect((30.83 / 9.62).toFixed(1)).toBe('3.2');
    expect(example(key, 'The bubble factor').example).toContain('30.83 ÷ 9.62 is about **3.2**');

    expect(pct(icmRequiredEquity(v))).toBe('76.2');
    expect(icmRequiredEquity(v)).toBeCloseTo(bf / (1 + bf), 12);
    expect(pct(30.83 / 40.45)).toBe('76.2');
    expect(chipRequiredEquity(v)).toBe(0.5);
    expect(pct(riskPremium(v))).toBe('26.2');
    expect(example(key, 'From bubble factor to equity').example).toContain('30.83 ÷ 40.45 = **76.2%**');
    expect(example(key, 'From bubble factor to equity').example).toContain('26.2 points');
    expect(bars(art(key, 'Chips against money'))).toEqual([50, Number(pct(icmRequiredEquity(v)))]);
  });

  it('shows the same spot at 3 stacks, and the curve', () => {
    expect(rows(key, 'Same spot, three stacks')).toEqual(
      [1000, 2000, 3000].map((you) => {
        const v = spot(you);
        return [
          you.toLocaleString('en-US'),
          bubbleFactor(stacksFor(you), BUBBLE_PAY, 1, 0).toFixed(2),
          `${pct(icmRequiredEquity(v))}%`,
          `${pct(riskPremium(v))} points`,
        ];
      }),
    );
    const points = [1000, 1500, 2000, 2500, 3000].map((you): [number, number] => [you, Number(pct(icmRequiredEquity(spot(you))))]);
    const curve = pick(art(key, 'Bigger stack, higher price'), 'curve');
    expect(curve.points).toEqual(points);
    expect(curve.mark).toEqual(points[4]);
    expect(pick(lesson(key).cover, 'curve').points).toEqual(points);
    expect(caption(key, 'Bigger stack, higher price')).toContain('63.4% at 1,000 chips to 76.2% at 3,000');
  });

  it('explains the rise: the loss is the whole $EV, the win grows slowly', () => {
    for (const you of [1000, 1500, 2000, 2500, 3000]) expect(spot(you).lose).toBe(0);
    const [low, high] = [spot(1000), spot(3000)];
    const body = step(key, 'Why the price rises');
    if (body.kind !== 'text') throw new Error('expected text');
    expect(body.body[1]).toContain(`${usd(low.fold)} to ${usd(high.fold)}`);
    expect(body.body[1]).toContain(`${usd(low.win - low.fold)} to ${usd(high.win - high.fold)}`);
  });

  it('fades after the bubble and is exactly 1 heads up', () => {
    const bubble = bubbleFactor([5000, 2000, 1500, 1500], BUBBLE_PAY, 1, 0);
    const itm = bubbleFactor([5000, 2000, 3000], [50, 30, 20], 1, 0);
    const hu = bubbleFactor([5000, 2000], [50, 30], 1, 0);
    expect([num(bubble), num(itm), num(hu)]).toEqual([2.5, 1.35, 1]);
    expect(hu).toBeCloseTo(1, 12);
    expect(bars(art(key, 'After the bubble'))).toEqual([num(bubble), num(itm), num(hu)]);
    expect(allInValues([5000, 2000, 3000], [50, 30, 20], 1, 0).lose).toBe(20);
    expect(caption(key, 'After the bubble')).toContain('busting pays $20');
  });

  it('quizzes: a bubble factor of 3 needs 75%', () => {
    expect(30 / 10).toBe(3);
    expect(answerOf(key, 'Losing an all in costs you $30. Winning it adds $10. What is your bubble factor?')).toBe('3');
    expect(3 / (1 + 3)).toBe(0.75);
    expect(answerOf(key, 'Your bubble factor is 3. What equity do you need to call?')).toBe('75%');
    expect(icmRequiredEquity(spot(3000))).toBeGreaterThan(icmRequiredEquity(spot(1000)));
  });
});

/* The big stack on the bubble ------------------------------------------------ */

const TABLE = [5000, 3000, 1200, 800];
/** B in the big blind (200) against a small blind (100) shove. */
const BLINDS = { heroLive: 200, villainLive: 100 };
const ANY_TWO = new Map(ALL_HAND_CLASSES.map((h) => [h, 1]));

describe('the big stack on the bubble', () => {
  const key = 'tournaments/icm-play/big-stack';
  const bVsA = allInValues(TABLE, BUBBLE_PAY, 1, 0, BLINDS);
  const bVsD = allInValues(TABLE, BUBBLE_PAY, 1, 3, BLINDS);
  const need = icmRequiredEquity(bVsA);

  it('sets the table in big blinds and in money', () => {
    expect(chips(art(key, 'Four left, three paid'))).toEqual(TABLE.map((s) => s / 200));
    expect(chips(lesson(key).cover)).toEqual(TABLE.map((s) => s / 200));
    const money = icmEquity(TABLE, BUBBLE_PAY);
    expect(rows(key, 'Chips against money')).toEqual(['A', 'B', 'C', 'D'].map((p, i) => [p, `${TABLE[i] / 200}bb`, `${(TABLE[i] / 100).toFixed(0)}%`, usd(money[i])]));
  });

  it('prices B’s call against A and against D', () => {
    expect([usd(bVsA.fold), usd(bVsA.win), usd(bVsA.lose)]).toEqual(['$30.10', '$40.47', '$0.00']);
    expect(pick(art(key, 'A shoves from the small blind'), 'tree').branches.map((b) => b.value)).toEqual([usd(bVsA.fold), usd(bVsA.win), '$0']);
    expect(bVsA.risk).toBe(3000);
    expect(bVsA.call).toBe(2800);
    expect(pct(need)).toBe('74.4');
    expect(pct(30.1 / 40.47)).toBe('74.4');
    expect(pct(chipRequiredEquity(bVsA))).toBe(pct(2800 / 6000));
    expect(pct(chipRequiredEquity(bVsA))).toBe('46.7');
    expect(pct(riskPremium(bVsA))).toBe('27.7');
    const f = example(key, 'B’s price to call A');
    expect(f.formula).toBe(`eq × ${bVsA.win.toFixed(2)} + (1 − eq) × 0 ≥ ${bVsA.fold.toFixed(2)}`);
    expect(f.example).toContain('**74.4%**');
    expect(f.example).toContain('2,800 ÷ 6,000 = 46.7%');
    expect(f.example).toContain('27.7 points');

    expect(bVsD.risk).toBe(800);
    expect(pct(icmRequiredEquity(bVsD))).toBe('40.3');
    expect(pct(chipRequiredEquity(bVsD))).toBe(pct(600 / 1600));
    expect(bars(art(key, 'Big stack against short stack'))).toEqual(
      [chipRequiredEquity(bVsA), need, chipRequiredEquity(bVsD), icmRequiredEquity(bVsD)].map((x) => Number(pct(x))),
    );
    expect(3000 - 800).toBe(2200);
    expect(text(key)).toContain('2,200 chips');
  });

  it('only TT or better has 74.4% against any 2 cards', () => {
    const t = rows(key, 'Which hands can call A?');
    for (const [hand, eqText, verdict] of t) {
      const cards = { AA: 'AsAd', TT: 'TsTd', '99': '9s9d', AKs: 'AsKs', AKo: 'AsKd' }[hand]!;
      const hero = pc(cards);
      const eq = equityVsRange(hero, rangeToCombos(ANY_TWO, hero), [], { iterations: 400_000, rng: seededRng(3) }).equity;
      expect(eqText, hand).toBe(`About ${Math.round(eq * 100)}%`);
      expect(verdict, hand).toBe(eq >= need ? 'Call' : 'Fold');
    }
    expect(t.map((r) => r[0])).toEqual(['AA', 'TT', '99', 'AKs', 'AKo']);
  }, 120_000);

  it('is an equilibrium: A shoves every hand and B calls with TT or better', () => {
    // B's best response to A shoving everything: call exactly the hands with the price against any 2 cards.
    const calls = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT']);
    for (const hc of ALL_HAND_CLASSES) {
      const hero = rangeToCombos(new Map([[hc, 1]]))[0].cards as [Card, Card];
      const eq = equityVsRange(hero, rangeToCombos(ANY_TWO, hero), [], { iterations: 10_000, rng: seededRng(9) }).equity;
      if (calls.has(hc)) expect(eq, hc).toBeGreaterThan(need + 0.005);
      else expect(eq, hc).toBeLessThan(need - 0.015);
    }
    // A's reply to those calls: every hand gains by shoving.
    const aVsB = allInValues(TABLE, BUBBLE_PAY, 0, 1, { heroLive: 100, villainLive: 200 });
    const tt = parseComboRange('TT+');
    for (const hc of ALL_HAND_CLASSES) {
      const hero = rangeToCombos(new Map([[hc, 1]]))[0].cards as [Card, Card];
      const gain = shoveGain(aVsB, tt, hero, 4_000);
      expect(gain, hc).toBeGreaterThan(0.5);
    }
  }, 120_000);

  it('shows what shoving adds for 4 hands', () => {
    const aVsB = allInValues(TABLE, BUBBLE_PAY, 0, 1, { heroLive: 100, villainLive: 200 });
    const tt = parseComboRange('TT+');
    const hands = ['Kd5s', 'Ts9s', '2s2d', '7c2d'];
    const gains = hands.map((h) => num(shoveGain(aVsB, tt, pc(h), 200_000)));
    expect(bars(art(key, 'What shoving adds for A'))).toEqual(gains);
    expect(gains).toEqual([0.72, 0.71, 0.68, 0.65]);
    // The fewest folds come from hands that block no TT or better.
    const folds = hands.map((h) => 1 - removed(tt, pc(h)).length / 1225);
    expect(pct(Math.min(...folds))).toBe('97.6');
    expect(caption(key, 'What shoving adds for A')).toContain('at least 97.6%');
    expect(caption(key, 'What shoving adds for A')).toContain('**$0.65**');
  }, 60_000);

  it('quizzes', () => {
    expect(answerOf(key, 'A covers B and shoves from the small blind. B is in the big blind. What equity does B need to call?')).toBe(`${pct(need)}%`);
    expect(quiz(key, 'B holds this hand in the big blind. A shoves every hand from the small blind. What should B do?').cards).toBe('AsKd');
  });
});

function removed(range: readonly WeightedCombo[], hero: [Card, Card]) {
  return range.filter((c) => !c.cards.includes(hero[0]) && !c.cards.includes(hero[1]));
}

/** What A's shove adds over folding when B calls with `calls`: all 1,225 hands B can hold are equally likely. */
function shoveGain(v: ReturnType<typeof allInValues>, calls: readonly WeightedCombo[], hero: [Card, Card], iterations: number) {
  const live = removed(calls, hero);
  const fold = 1 - live.length / 1225;
  const eq = equityVsRange(hero, live, [], { iterations, rng: seededRng(5) }).equity;
  return icmShoveEV(v, fold, eq) - v.fold;
}

/* Short and medium stacks ----------------------------------------------------- */

describe('short and medium stacks on the bubble', () => {
  const key = 'tournaments/icm-play/middle-stacks';
  const bf = (st: number[], caller: number, shover: number) => bubbleFactor(st, BUBBLE_PAY, caller, shover);
  const need = (st: number[], caller: number, shover: number) => icmRequiredEquity(allInValues(st, BUBBLE_PAY, caller, shover));

  it('shows the same 4 stacks', () => {
    expect(chips(art(key, 'Four stacks on the bubble'))).toEqual(TABLE.map((s) => s / 200));
  });

  it('lists bubble factors and prices by matchup', () => {
    const names = 'ABCD';
    expect(rows(key, 'Bubble factor by matchup')).toEqual(
      [
        [1, 0],
        [2, 0],
        [3, 0],
        [2, 1],
        [1, 3],
        [0, 3],
      ].map(([c, s]) => [`${names[c]} calls ${names[s]}`, bf(TABLE, c, s).toFixed(2), `${pct(need(TABLE, c, s))}%`]),
    );
    const vsA = [1, 2, 3].map((c) => num(bf(TABLE, c, 0)));
    expect(vsA).toEqual([3.23, 2.33, 1.76]);
    expect(bars(art(key, 'Calling the big stack'))).toEqual(vsA);
    expect(bars(lesson(key).cover)).toEqual(vsA);
    // Without dead money, the price is BF ÷ (1 + BF).
    for (const c of [1, 2, 3]) expect(need(TABLE, c, 0)).toBeCloseTo(bf(TABLE, c, 0) / (1 + bf(TABLE, c, 0)), 12);
  });

  it('gives each stack its chance to finish 4th, and what folding keeps', () => {
    const fourth = finishChances(TABLE).map((r) => Number(pct(r[3])));
    expect(fourth).toEqual([3.2, 8.8, 34.3, 53.7]);
    expect(bars(art(key, 'Chance to finish 4th'))).toEqual(fourth);
    const money = icmEquity(TABLE, BUBBLE_PAY);
    expect(usd(allInValues(TABLE, BUBBLE_PAY, 3, 0).fold)).toBe(usd(money[3]));
    expect(text(key)).toContain(`keeps D only ${usd(money[3])}`);
    expect(text(key)).toContain(`B’s fold keeps ${usd(money[1])}`);
  });

  it('squeezes C as D gets shorter, and eases D', () => {
    const cases = [1000, 500, 200].map((d) => [5000, 3000, 2000 - d, d]);
    const c = cases.map((st) => num(bf(st, 2, 0)));
    const d = cases.map((st) => num(bf(st, 3, 0)));
    expect(c).toEqual([2.03, 2.91, 3.69]);
    expect(d).toEqual([2.03, 1.43, 1.16]);
    expect(bars(art(key, 'As D gets shorter'))).toEqual(c);
    expect(bars(art(key, 'D pays less'))).toEqual(d);
  });
});

/* Folding into a pay jump ------------------------------------------------------ */

describe('folding into a pay jump', () => {
  const key = 'tournaments/icm-play/pay-jumps';
  const pay = [400, 250, 160, 110, 80];
  const st = [35000, 25000, 20000, 18000, 2000];
  const v = allInValues(st, pay, 2, 0);

  it('shows the stacks and the pay jumps', () => {
    expect(chips(art(key, 'Five left'))).toEqual(st.map((s) => s / 1000));
    expect(pick(lesson(key).cover, 'curve').points).toEqual(pay.map((p, i) => [i + 1, p]));
    expect(rows(key, 'The pay jumps').map((r) => r[1])).toEqual(pay.map((p) => `$${p}`));
    expect(rows(key, 'The pay jumps').slice(0, 4).map((r) => r[2])).toEqual(pay.slice(0, 4).map((p, i) => `$${p - pay[i + 1]}`));
    expect(pay.reduce((a, b) => a + b)).toBe(1000);
    expect(icmEquity(st, pay).reduce((a, b) => a + b)).toBeCloseTo(1000, 9);
  });

  it('prices your call against A', () => {
    expect([usd(v.fold), usd(v.win), v.lose]).toEqual(['$210.11', '$277.44', 80]);
    expect(pick(art(key, 'A shoves into you'), 'tree').branches.map((b) => b.value)).toEqual([usd(v.fold), usd(v.win), '$80 for 5th']);
    expect(usd(icmEquity(st, pay)[2])).toBe(usd(v.fold));
    const f = example(key, 'Your price to call');
    expect(f.formula).toBe(`eq × ${v.win.toFixed(2)} + (1 − eq) × ${v.lose} ≥ ${v.fold.toFixed(2)}`);
    expect([(v.fold - v.lose).toFixed(2), (v.win - v.lose).toFixed(2)]).toEqual(['130.11', '197.44']);
    expect(pct(icmRequiredEquity(v))).toBe('65.9');
    expect(f.example).toContain('130.11 ÷ 197.44 = **65.9%**');
  });

  it('shows a good chip call that loses money', () => {
    const at = (eq: number) => icmCallEV(v, eq) - v.fold;
    expect([at(0.6).toFixed(2), at(0.7).toFixed(2)]).toEqual(['-11.64', '8.10']);
    expect(bars(art(key, 'A good chip call that loses money'))).toEqual([num(at(0.6)), num(at(0.7))]);
    // In chips the 60% call wins 0.6 × 40bb − 20bb = 4bb on average.
    expect(0.6 * 40 - 20).toBeCloseTo(4, 12);
    expect(caption(key, 'A good chip call that loses money')).toContain('**$11.64**');
  });

  it('gives each stack its chance to finish 5th', () => {
    const fifth = finishChances(st).map((r) => Number(pct(r[4])));
    expect(fifth).toEqual([1.6, 3.4, 5.2, 6.3, 83.5]);
    expect(bars(art(key, 'Chance to finish 5th'))).toEqual(fifth);
    expect(text(key)).toContain('**83.5%**');
    expect(text(key)).toContain('only 5.2%');
  });

  it('a tiny stack raises your price, and the tiny stack itself should not wait', () => {
    const even = icmRequiredEquity(allInValues([35000, 25000, 20000, 10000, 10000], pay, 2, 0));
    const tiny = icmRequiredEquity(v);
    expect([pct(even), pct(tiny)]).toEqual(['64.7', '65.9']);
    expect(bars(art(key, 'The tiny stack raises your price'))).toEqual([even, tiny].map((x) => Number(pct(x))));
    expect(Number(pct(tiny)) - Number(pct(even))).toBeCloseTo(1.2, 9);
    expect(pct(tiny - even)).toBe('1.2');
    expect(18 - 10).toBe(8);

    const e = allInValues(st, pay, 4, 0);
    expect(pct(icmRequiredEquity(e))).toBe('52.5');
    expect([usd(e.fold), usd(e.fold - e.lose)]).toEqual(['$96.52', '$16.52']);
    expect(bars(art(key, 'The tiny stack should not wait'))).toEqual([icmRequiredEquity(e), tiny].map((x) => Number(pct(x))));
    expect(answerOf(key, 'Moving 8bb from E to D leaves E with 2bb. What happens to your price to call A?')).toBe(`It rises from ${pct(even)}% to ${pct(tiny)}%`);
  });

  it('quizzes', () => {
    expect(answerOf(key, 'You bust in 5th instead of 4th at this final table. How much less do you win?')).toBe(`$${pay[3] - pay[4]}`);
  });
});

/* ICM deals ---------------------------------------------------------------------- */

describe('ICM deals', () => {
  const key = 'tournaments/icm-play/deals';
  const st = [600000, 250000, 150000];
  const pay = [5000, 3000, 2000];
  const icm = icmEquity(st, pay);
  const chop = chipChop(st, pay);

  it('shows the stacks and the money left', () => {
    expect(chips(art(key, 'Three left'))).toEqual(st.map((s) => s / 10000));
    expect(pay.reduce((a, b) => a + b)).toBe(10000);
  });

  it('computes the chip chop', () => {
    expect(chop).toEqual([4400, 3000, 2600]);
    expect(2000 + 0.6 * 4000).toBe(4400);
    expect(example(key, 'A chip chop').example).toContain('**$4,400**');
    // A plain split by chips pays C less than 3rd place.
    const plain = (10000 * st[2]) / 1000000;
    expect(plain).toBe(1500);
    expect(plain).toBeLessThan(pay[2]);
    expect(bars(art(key, 'Why 3rd place comes first'))).toEqual([plain, pay[2], chop[2]]);
  });

  it('compares the chip chop with the ICM chop', () => {
    expect(rows(key, 'Chip chop against ICM chop')).toEqual(['A', 'B', 'C'].map((p, i) => [p, `${(st[i] / 10000).toFixed(0)}%`, usd(chop[i]), usd(icm[i])]));
    expect(icm.reduce((a, b) => a + b)).toBeCloseTo(10000, 9);
    expect(chop.reduce((a, b) => a + b)).toBeCloseTo(10000, 9);
    const diff = icm.map((x, i) => num(x - chop[i]));
    expect(diff).toEqual([-294.12, 169.12, 125]);
    expect(bars(art(key, 'What ICM moves'))).toEqual(diff);
    expect(bars(lesson(key).cover)).toEqual([chop[0], num(icm[0])]);
  });

  it('quizzes', () => {
    expect(answerOf(key, 'Three players chip chop $10,000. 3rd place pays $2,000. A has 60% of the chips. What does A get?')).toBe(usd(chop[0]).replace('.00', ''));
    expect(quiz(key, 'Three players chip chop $10,000. 3rd place pays $2,000. A has 60% of the chips. What does A get?').choices).toContain(
      `$${Math.round(icm[0]).toLocaleString('en-US')}`,
    );
    expect(answerOf(key, 'In this example, who gets more from an ICM chop than from a chip chop?')).toBe('B and C');
  });
});

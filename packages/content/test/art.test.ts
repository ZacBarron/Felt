import {
  bluffBreakeven,
  callEV,
  comboCount,
  exactEquity,
  geometricBetFraction,
  mdf,
  outsToEquity,
  parseCards,
  parseComboRange,
  positionsFor,
  potOdds,
  ruleOf2And4,
  ruleOfFourCorrected,
  spr,
  suitIndex,
  rankOf,
  type Card,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { LESSON_CONTENT, STARTER_CHARTS, type LessonArt, type LessonContent } from '../src';

const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
/** The lesson's one visual step, or the one with this title when a lesson has several. */
const visual = (key: string, title?: string) => {
  const steps = lesson(key).steps.flatMap((s) => (s.kind === 'visual' && (title === undefined || s.title === title) ? [s] : []));
  expect(steps, `${key} ${title ?? ''}`).toHaveLength(1);
  return steps[0].art;
};
const cover = (key: string) => lesson(key).cover;
function pick<K extends LessonArt['kind']>(art: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(art.kind).toBe(kind);
  return art as Extract<LessonArt, { kind: K }>;
}
const bars = (art: LessonArt) => pick(art, 'bars').bars.map((b) => b.value);
const r1 = (x: number) => Math.round(x * 10) / 10;

describe('lesson art', () => {
  const chartIds = new Set(STARTER_CHARTS.map((c) => c.id));
  const arts = [...LESSON_CONTENT.values()].flatMap((l) => [
    { key: l.key, art: l.cover },
    ...l.steps.flatMap((s) => (s.kind === 'visual' ? [{ key: l.key, art: s.art }] : [])),
  ]);

  it('is valid for every kind it draws', () => {
    for (const { key, art } of arts) {
      const where = `${key}: ${art.kind}`;
      switch (art.kind) {
        case 'chart':
          expect(chartIds.has(art.chartId), where).toBe(true);
          break;
        case 'cards': {
          const cards = [...parseCards(art.cards), ...parseCards(art.board ?? '')];
          expect(cards.length, where).toBeGreaterThan(0);
          expect(new Set(cards).size, where).toBe(cards.length);
          if (art.board) expect([3, 4, 5], where).toContain(parseCards(art.board).length);
          break;
        }
        case 'ring':
          expect(art.value, where).toBeGreaterThanOrEqual(0);
          expect(art.value, where).toBeLessThanOrEqual(1);
          break;
        case 'bars':
          expect(art.bars.length, where).toBeGreaterThan(0);
          if (art.unit === '%') for (const b of art.bars) expect(Math.abs(b.value), where).toBeLessThanOrEqual(100);
          break;
        case 'table': {
          const seats = positionsFor(art.seats);
          for (const s of [art.button, art.hero, ...(art.highlight ?? [])]) if (s) expect(seats, where).toContain(s);
          break;
        }
        case 'ladder':
          for (const r of art.rungs) expect(() => parseCards(r.cards), where).not.toThrow();
          break;
        case 'chips':
          for (const s of art.stacks) expect(s.bb, where).toBeGreaterThan(0);
          break;
        case 'tree':
          expect(art.branches.length, where).toBeGreaterThanOrEqual(2);
          break;
        case 'curve': {
          expect(art.points.length, where).toBeGreaterThanOrEqual(2);
          if (art.mark) expect(art.points.some(([x, y]) => x === art.mark![0] && y === art.mark![1]), `${where} mark is a point`).toBe(true);
          break;
        }
      }
    }
  });

  it('keeps quiz cards real, distinct and one set per choice', () => {
    for (const l of LESSON_CONTENT.values()) {
      for (const step of l.steps) {
        if (step.kind !== 'quiz') continue;
        const shown = [...parseCards(step.cards ?? ''), ...parseCards(step.board ?? '')];
        expect(new Set(shown).size, step.question).toBe(shown.length);
        if (step.board) expect([3, 4, 5], step.question).toContain(parseCards(step.board).length);
        if (!step.choiceCards) continue;
        expect(step.choiceCards, step.question).toHaveLength(step.choices.length);
        for (const c of step.choiceCards) {
          const all = [...parseCards(step.board ?? ''), ...parseCards(c)];
          expect(new Set(all).size, `${step.question} ${c}`).toBe(all.length);
        }
      }
    }
  });

  it('teaches with pictures: no long runs of text, and core lessons show at least 2 pictures', () => {
    const textOnly = new Set(['intro', 'text', 'callout']);
    for (const l of LESSON_CONTENT.values()) {
      let run = 0;
      let longest = 0;
      let pictures = 0;
      for (const s of l.steps) {
        run = textOnly.has(s.kind) ? run + 1 : 0;
        longest = Math.max(longest, run);
        if (['visual', 'hand', 'board', 'chart', 'table'].includes(s.kind)) pictures++;
        if (s.kind === 'quiz' && (s.cards || s.board || s.choiceCards)) pictures++;
      }
      expect(longest, `${l.key}: text steps in a row`).toBeLessThanOrEqual(2);
      if (l.level === 'core') expect(pictures, `${l.key}: pictures`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('numbers in lesson art agree with the core math', () => {
  it('pot odds, MDF and bluff prices', () => {
    // A half pot bet: the pot before the call holds 1 + 0.5.
    expect(pick(cover('foundations/math/pot-odds'), 'ring').value).toBe(potOdds(1.5, 0.5));
    for (const [x, y] of pick(visual('foundations/math/pot-odds', 'Bigger bets, worse prices'), 'curve').points) expect(y).toBeCloseTo(r1(potOdds(1 + x, x) * 100), 5);
    expect(pick(cover('foundations/math/mdf-alpha'), 'ring').value).toBeCloseTo(mdf(1, 0.5), 12);
    for (const [x, y] of pick(visual('foundations/math/mdf-alpha'), 'curve').points) expect(y).toBeCloseTo(r1(mdf(1, x) * 100), 5);
    expect(pick(cover('postflop/defense/vs-cbet'), 'ring').value).toBeCloseTo(potOdds(1 + 1 / 3, 1 / 3), 12);
    expect(pick(cover('mindset/study/hand-review'), 'ring').value).toBeCloseTo(potOdds(175, 75), 12);
    expect(pick(cover('exploit/adjustments/vs-aggro'), 'ring').value).toBeCloseTo(potOdds(200, 100), 12);
    // BB against a 2.5bb open, SB against it, and a call of an 11bb 3bet.
    expect(pick(visual('preflop/vs-open/bb-defense'), 'ring').value).toBeCloseTo(potOdds(4, 1.5), 12);
    expect(pick(cover('preflop/vs-open/sb-vs-open'), 'ring').value).toBeCloseTo(potOdds(4, 2), 12);
    expect(pick(cover('preflop/3bet-pots/vs-3bet'), 'ring').value).toBeCloseTo(potOdds(14, 8.5), 12);
    // Bigger opens: the BB pays the open minus its blind into 1.5 + open.
    expect(bars(cover('preflop/live-preflop/big-opens'))).toEqual([2.5, 5, 8].map((o) => r1(potOdds(1.5 + o, o - 1) * 100)));
    for (const [o, y] of pick(cover('preflop/stack-depth/open-sizing'), 'curve').points) expect(y).toBeCloseTo(r1(potOdds(1.5 + o, o - 1) * 100), 5);
    // A shove of SPR times the pot.
    for (const [s, y] of pick(visual('postflop/3bet-postflop/low-spr'), 'curve').points) expect(y).toBeCloseTo(r1(potOdds(1 + s, s) * 100), 5);
  });

  it('EV trees and bars', () => {
    const call = pick(cover('foundations/math/ev'), 'tree');
    expect(call.branches.map((b) => b.value)).toEqual(['+150', '−50']);
    expect(0.3 * 150 - 0.7 * 50).toBeCloseTo(callEV(150, 50, 0.3));
    const bet = pick(visual('foundations/math/ev', 'A bet, branch by branch'), 'tree');
    expect(bet.branches.map((b) => b.label)).toEqual(['Villain folds, 40%', 'Called and you win, 18%', 'Called and you lose, 42%']);
    expect(0.4 * 100 + 0.6 * 0.3 * 150 - 0.6 * 0.7 * 50).toBeCloseTo(46);
    // A balanced river bet: pot 10, bet 10, two value combos per bluff.
    const gto = pick(cover('foundations/theory/what-is-gto'), 'tree');
    expect(gto.branches.map((b) => b.value)).toEqual(['+10bb', '+10bb', '+10bb']);
    const ev = (callShare: number) => (2 * (10 + callShare * 10) + (1 - callShare) * 10 - callShare * 10) / 3;
    expect([ev(0), ev(1), ev(0.5)]).toEqual([10, 10, 10]);
    // Node lock: calling 100 into 200 against 10% bluffs.
    expect(0.1 * 200 - 0.9 * 100).toBe(-70);
    // A tell nudging a close call: pot 100, bet 100.
    expect(bars(cover('exploit/tells/physical'))).toEqual([0.3, 0.36].map((b) => Math.round(b * 300 - 100)));
    for (const [b, y] of pick(visual('exploit/adjustments/vs-aggro'), 'curve').points) expect(y).toBeCloseTo((b / 100) * 300 - 100, 9);
    // Regret matching: +6 bet, +2 check, -3 fold.
    expect(bars(cover('foundations/theory/solvers'))).toEqual([75, 25, 0]);
    // Implied odds: 20 / (8/46) = 115 against a final pot of 100.
    expect(bars(cover('foundations/math/implied-odds'))).toEqual([100, 20 / (8 / 46)]);
    // The tilt illustration: 0.8 x 10 + 0.2 x -20.
    expect(bars(visual('mindset/mental/tilt'))).toEqual([10, -20, 0.8 * 10 + 0.2 * -20]);
  });

  it('outs and equity', () => {
    expect(bars(visual('foundations/math/outs', '15 outs, flop to river'))).toEqual([ruleOf2And4(15, 2) * 100, ruleOfFourCorrected(15) * 100, r1(outsToEquity(15, 47, 2) * 100)]);
    // The outs cover: 9 hearts left on a two heart flop with no other draw.
    const c = pick(cover('foundations/math/outs'), 'cards');
    const seen = [...parseCards(c.cards), ...parseCards(c.board!)];
    expect(13 - seen.filter((x) => suitIndex(x) === 2).length).toBe(9);
    const aaKK = exactEquity(parseCards('AsAh') as [Card, Card], parseCards('KdKc') as [Card, Card], []).equity;
    expect(pick(cover('foundations/theory/equity-benchmarks'), 'ring').value).toBeCloseTo(aaKK, 4);
  }, 20_000);

  it('preflop matchups, exact over every board', () => {
    const eq = (a: string, b: string) => r1(exactEquity(parseCards(a) as [Card, Card], parseCards(b) as [Card, Card], []).equity * 100);
    expect(bars(visual('foundations/theory/equity-benchmarks'))).toEqual([
      eq('AsAh', 'KdKc'),
      eq('AsKd', 'AhQc'),
      eq('8s8h', 'AdKc'),
      eq('AsKd', '2c2h'),
      eq('AsKd', 'QhQc'),
    ]);
  }, 60_000);

  it('combos', () => {
    expect(bars(cover('foundations/math/combos'))).toEqual([comboCount('QQ'), comboCount('AKs'), comboCount('AKo')]);
    // QQ+ and AK left after your cards.
    const left = (hand: string) => {
      const dead = new Set(parseCards(hand));
      return parseComboRange('QQ+, AK').filter((c) => !dead.has(c.cards[0]) && !dead.has(c.cards[1])).length;
    };
    expect(bars(cover('preflop/3bet-pots/4bet'))).toEqual([left('7s6s'), left('As5s')]);
    // Thin value on Ks9d8c3h2s with KhJc: ahead of 16 and behind 28 of the regular's calls, 51 and 28 of the station's.
    const dead = new Set(parseCards('KhJcKs9d8c3h2s'));
    const count = (range: string) => parseComboRange(range).filter((c) => !dead.has(c.cards[0]) && !dead.has(c.cards[1])).length;
    const behind = count('KQ, K9s, K8s, K3s, K2s, 98s, 99, 88, 33, 22');
    const ahead = count('KT, K7s, K6s, K5s, K4s');
    const extra = count('QQ, JJ, TT, A9, Q9s, J9s, T9s');
    expect([behind, ahead, extra, count('KJ')]).toEqual([28, 16, 35, 6]);
    expect(bars(visual('postflop/river/thin-value', 'Share of calls you beat'))).toEqual([r1((ahead / (ahead + behind)) * 100), r1(((ahead + extra) / (ahead + extra + behind)) * 100)]);
    expect(rankOf(parseCards('Kh')[0])).toBe('K');
  });

  it('stacks, SPR and geometric sizing', () => {
    const chips = (art: LessonArt) => pick(art, 'chips').stacks.map((s) => s.bb);
    // 100bb, BTN opens 2.5bb and BB calls: 5.5bb pot, 97.5bb behind.
    expect(chips(cover('foundations/math/spr'))).toEqual([2.5 + 2.5 + 0.5, 100 - 2.5]);
    // BB 3bets to 11bb and BTN calls: 22.5bb pot, 89bb behind.
    expect(chips(visual('foundations/math/spr', 'A 3bet pot is shallow'))).toEqual([11 + 11 + 0.5, 100 - 11]);
    expect(chips(cover('postflop/3bet-postflop/cbet-3bp'))).toEqual([22.5, 89]);
    expect(spr(89, 22.5)).toBeCloseTo(4, 1);
    // The same 3bet pot at 40bb and 200bb.
    expect(chips(cover('preflop/stack-depth/depth'))).toEqual([22.5, 40 - 11, 200 - 11]);
    // Dead money in a squeeze and the pot with antes.
    expect(chips(cover('preflop/vs-open/squeeze')).reduce((a, b) => a + b)).toBe(6.5);
    expect(chips(cover('tournaments/mtt-basics/antes'))).toEqual([0.5 + 1, 0.5 + 1 + 1]);
    for (const [s, y] of pick(cover('postflop/cbet/sizing'), 'curve').points) expect(y).toBeCloseTo(r1(geometricBetFraction(1, s, 3) * 100), 5);
    // River bets as amounts: 2x pot, a block bet of 10 into 40, a raise to 3x.
    expect(bars(cover('postflop/river/overbets'))).toEqual([100, 200]);
    expect(bluffBreakeven(40, 10)).toBeCloseTo(0.2);
    expect(bars(cover('postflop/river/river-raises'))).toEqual([100, 50, 150]);
  });

  it('multiway folds, variance, bankroll and stat error', () => {
    expect(bars(cover('postflop/multiway/multiway'))).toEqual([1, 2, 3, 4].map((n) => r1(0.6 ** n * 100)));
    for (const [n, y] of pick(cover('mindset/mental/variance'), 'curve').points) expect(y).toBeCloseTo(r1((1.96 * 100) / Math.sqrt((n * 1000) / 100)), 5);
    for (const [b, y] of pick(cover('mindset/mental/bankroll'), 'curve').points) {
      const ror = Math.exp((-2 * 10 * b * 100) / 100 ** 2) * 100;
      expect(y).toBeCloseTo(ror < 1 ? Math.round(ror * 100) / 100 : r1(ror), 5);
    }
    for (const [n, y] of pick(cover('exploit/profiling/hud-stats'), 'curve').points) expect(y).toBeCloseTo(r1(Math.sqrt((0.25 * 0.75) / n) * 100), 5);
  });

  it('tournaments: shove EV and ICM', () => {
    // The assumed BB calling range, with the shover's 9c3d removed: 425 of 1,225 hands call.
    const dead = new Set(parseCards('9c3d'));
    const calls = parseComboRange('22+, A2s+, A2o+, K2s+, K7o+, Q8s+, QTo+, J9s+, JTo').filter((c) => !dead.has(c.cards[0]) && !dead.has(c.cards[1])).length;
    expect(calls).toBe(425);
    const fold = 1 - calls / 1225;
    // Equity when called is 30.7%, exact over every board (stated in the lesson).
    const shoveEV = (stack: number) => fold * 2.5 + (1 - fold) * (0.307 * (2.5 + (stack - 0.5) + (stack - 1)) - (stack - 0.5));
    expect(bars(visual('tournaments/mtt-basics/push-fold', 'One hand, three stacks'))).toEqual([10, 15, 20].map((s) => Math.round(shoveEV(s) * 100) / 100));
    // Malmuth-Harville for stacks 5,000 / 3,000 / 2,000 paying 50 / 30 / 20.
    const st = [5000, 3000, 2000];
    const pay = [50, 30, 20];
    const money = st.map(() => 0);
    const walk = (left: number[], place: number, p: number) => {
      const total = left.reduce((s, i) => s + st[i], 0);
      for (const i of left) {
        const q = (p * st[i]) / total;
        money[i] += q * pay[place];
        walk(
          left.filter((j) => j !== i),
          place + 1,
          q,
        );
      }
    };
    walk([0, 1, 2], 0, 1);
    expect(bars(visual('tournaments/mtt-basics/icm', 'Chips against money'))).toEqual([50, r1(money[0]), 20, r1(money[2])]);
    expect(bars(cover('tournaments/mtt-basics/icm'))).toEqual([50, r1(money[0])]);
  });
});

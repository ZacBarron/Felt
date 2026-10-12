import { actionRange, buildChart, positionsFor, rangePercent } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, STARTER_CHARTS } from '../src';

describe('starter charts', () => {
  it('use real seat names for their table size', () => {
    for (const spec of STARTER_CHARTS) expect(positionsFor(spec.tableSize)).toContain(spec.hero);
  });

  it('all parse and have unique ids', () => {
    const ids = new Set(STARTER_CHARTS.map((c) => c.id));
    expect(ids.size).toBe(STARTER_CHARTS.length);
    for (const spec of STARTER_CHARTS) expect(() => buildChart(spec)).not.toThrow();
  });

  it('open wider in later position', () => {
    const open = (id: string) => rangePercent(actionRange(buildChart(STARTER_CHARTS.find((c) => c.id === id)!), 'raise'));
    const order = ['utg', 'utgp1', 'utgp2', 'lj', 'hj', 'co', 'btn'].map((p) => open(`9max-100-rfi-${p}`));
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(open('6max-100-rfi-utg')).toBeLessThan(open('6max-100-rfi-hj'));
  });
});

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    const ids = CURRICULUM.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => `${t.id}/${m.id}/${l.id}`)));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { IDEAS, ideaForDay } from '../src';

describe('ideas', () => {
  it('have unique ids and rotate by day', () => {
    expect(new Set(IDEAS.map((i) => i.id)).size).toBe(IDEAS.length);
    expect(ideaForDay(new Date(2026, 0, 1)).id).not.toBe(ideaForDay(new Date(2026, 0, 2)).id);
  });
});

import { parseCards } from '@felt/core';
import { LESSON_CONTENT, lessonKey } from '../src';

describe('lessons', () => {
  const curriculumKeys = new Set(CURRICULUM.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => lessonKey(t.id, m.id, l.id)))));
  const chartIds = new Set(STARTER_CHARTS.map((c) => c.id));

  it('match the curriculum and reference real charts and cards', () => {
    expect(LESSON_CONTENT.size).toBeGreaterThanOrEqual(10);
    for (const lesson of LESSON_CONTENT.values()) {
      expect(curriculumKeys.has(lesson.key)).toBe(true);
      expect(lesson.steps[0].kind).toBe('intro');
      for (const id of lesson.practice ?? []) expect(chartIds.has(id)).toBe(true);
      if (lesson.cover.kind === 'chart') expect(chartIds.has(lesson.cover.chartId)).toBe(true);
      if (lesson.cover.kind === 'cards') expect(() => parseCards(lesson.cover.kind === 'cards' ? lesson.cover.cards : '')).not.toThrow();
      for (const step of lesson.steps) {
        if (step.kind === 'chart') {
          expect(chartIds.has(step.chartId)).toBe(true);
        }
        if (step.kind === 'hand' || step.kind === 'board') {
          const cards = parseCards((step.kind === 'hand' ? step.cards : '') + (step.board ?? ''));
          expect(new Set(cards).size, `${lesson.key}: repeated card`).toBe(cards.length);
          if (step.board) expect([0, 3, 4, 5]).toContain(parseCards(step.board).length);
        }
        if (step.kind === 'quiz') {
          expect(step.answer).toBeGreaterThanOrEqual(0);
          expect(step.answer).toBeLessThan(step.choices.length);
        }
        if (step.kind === 'table') for (const row of step.rows) expect(row).toHaveLength(step.columns.length);
      }
    }
  });

  it('never use em dashes', () => {
    for (const lesson of LESSON_CONTENT.values()) expect(JSON.stringify(lesson), lesson.key).not.toContain('\u2014');
  });

  it('state numbers that agree with the core math', async () => {
    const o = await import('@felt/core');
    const pct = (x: number, digits = 1) => Number((x * 100).toFixed(digits));
    // Pot odds table and quizzes.
    expect(pct(o.potOdds(1.75, 0.75))).toBe(30);
    expect(pct(o.potOdds(1.25, 0.25))).toBe(16.7);
    expect(pct(o.potOdds(1.667, 0.667))).toBe(28.6);
    expect(pct(o.potOdds(3, 2))).toBe(40);
    // MDF, alpha and bluff share.
    for (const [bet, alpha, mdf, share] of [
      [1 / 3, 25, 75, 20],
      [0.5, 33.3, 66.7, 25],
      [0.75, 42.9, 57.1, 30],
      [1, 50, 50, 33.3],
      [2, 66.7, 33.3, 40],
    ]) {
      expect(pct(o.bluffBreakeven(1, bet))).toBe(alpha);
      expect(pct(o.mdf(1, bet))).toBe(mdf);
      expect(pct(o.optimalBluffShare(1, bet))).toBe(share);
    }
    // EV lesson and node locking.
    expect(o.callEV(150, 50, 0.3)).toBeCloseTo(10);
    expect(o.betEV(100, 50, 0.4, 0.3)).toBeCloseTo(46);
    expect(o.bluffEV(100, 75, 0.5)).toBeCloseTo(12.5);
    expect(o.bluffEV(100, 100, 0.6)).toBeCloseTo(20);
    expect(o.callEV(200, 100, 0.1)).toBeCloseTo(-70);
    expect(o.callEV(200, 100, 0.2)).toBeCloseTo(-40);
    // Outs table, exact.
    for (const [outs, flop, turn] of [
      [4, 16.5, 8.7],
      [8, 31.5, 17.4],
      [9, 35, 19.6],
      [12, 45, 26.1],
      [15, 54.1, 32.6],
    ]) {
      expect(pct(o.outsToEquity(outs, 47, 2))).toBe(flop);
      expect(pct(o.outsToEquity(outs, 46, 1))).toBe(turn);
    }
    expect(pct(o.ruleOfFourCorrected(12), 0)).toBe(44);
    expect(pct(o.ruleOfFourCorrected(15), 0)).toBe(53);
    // Implied odds.
    expect(o.impliedOddsNeeded(80, 20, 8 / 46)).toBeCloseTo(15);
    expect(o.impliedOddsNeeded(40, 10, 9 / 46)).toBeCloseTo(1.1, 1);
    // SPR and geometric sizing.
    expect(o.spr(97.5, 5.5)).toBeCloseTo(17.7, 1);
    expect(o.spr(89, 22.5)).toBeCloseTo(4, 1);
    expect(pct(o.geometricBetFraction(5.5, 97.5, 3), 0)).toBe(116);
    expect(pct(o.geometricBetFraction(22.5, 89, 3), 0)).toBe(54);
    expect(pct(o.geometricBetFraction(10, 35, 2), 0)).toBe(91);
    // BB price against a 2.5bb open.
    expect(pct(o.potOdds(4, 1.5), 0)).toBe(27);
  });

  it('count combos the way the lessons do', async () => {
    const { parseCards, rankOf, suitIndex } = await import('@felt/core');
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const combosWith = (dead: string, keep: (a: number, b: number) => boolean) => {
      const gone = new Set(parseCards(dead));
      const live = deck.filter((c) => !gone.has(c));
      let n = 0;
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (keep(live[i], live[j])) n++;
      return n;
    };
    const hearts = (a: number, b: number) => suitIndex(a) === 2 && suitIndex(b) === 2;
    // Bluff selection on Kc8h5h2s2d.
    expect(combosWith('Kc8h5h2s2d7c6c', hearts)).toBe(55);
    expect(combosWith('Kc8h5h2s2d7h6h', hearts)).toBe(36);
    // Bluff catching on AhKh7c4h2s.
    expect(combosWith('AhKh7c4h2sQsQc', hearts)).toBe(45);
    expect(combosWith('AhKh7c4h2sQhQd', hearts)).toBe(36);
    // Combos lesson: sets on K72 and AK with an ace in hand and a king on board.
    const pairOf = (r: string) => (a: number, b: number) => rankOf(a) === r && rankOf(b) === r;
    expect(['K', '7', '2'].reduce((n, r) => n + combosWith('Ks7d2c', pairOf(r)), 0)).toBe(9);
    const ak = (a: number, b: number) => new Set([rankOf(a), rankOf(b)]).size === 2 && [rankOf(a), rankOf(b)].every((r) => r === 'A' || r === 'K');
    expect(combosWith('AsKd', ak)).toBe(9);
  });

  it('quiz answers agree with the charts they test', async () => {
    const { buildChart, primaryAction, scoreRecall } = await import('@felt/core');
    const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
    const mix = (id: string, hand: string) => chart(id).mixes.get(hand)!;
    expect(primaryAction(mix('9max-100-rfi-utg', 'KJo'))).toBe('fold');
    expect(primaryAction(mix('9max-100-rfi-lj', 'A3s'))).toBe('raise');
    expect(primaryAction(mix('9max-100-rfi-btn', 'K5s'))).toBe('raise');
    expect(primaryAction(mix('9max-100-rfi-co', 'Q7s'))).toBe('fold');
    expect(primaryAction(mix('9max-100-rfi-sb', 'Q4s'))).toBe('raise');
    expect(primaryAction(mix('9max-100-bb-vs-btn', 'J6s'))).toBe('call');
    expect(scoreRecall(mix('9max-100-bb-vs-btn', 'A4s'), '3bet')).toBe(1);
    expect(scoreRecall(mix('9max-100-bb-vs-btn', 'A4s'), 'call')).toBe(1);
    expect(mix('9max-100-iso-btn-vs-1limp', '44')).toEqual({ raise: 0.5, call: 0.5 });
    expect(primaryAction(mix('9max-100-iso-btn-vs-1limp', 'ATo'))).toBe('raise');
  });
});

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
        if (step.kind === 'hand') expect(() => parseCards(step.cards + (step.board ?? ''))).not.toThrow();
        if (step.kind === 'quiz') {
          expect(step.answer).toBeGreaterThanOrEqual(0);
          expect(step.answer).toBeLessThan(step.choices.length);
        }
        if (step.kind === 'table') for (const row of step.rows) expect(row).toHaveLength(step.columns.length);
      }
    }
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

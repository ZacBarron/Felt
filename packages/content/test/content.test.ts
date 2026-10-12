import { buildChart, rangePercent, actionRange } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, STARTER_CHARTS } from '../src';

describe('starter charts', () => {
  it('all parse and have unique ids', () => {
    const ids = new Set(STARTER_CHARTS.map((c) => c.id));
    expect(ids.size).toBe(STARTER_CHARTS.length);
    for (const spec of STARTER_CHARTS) expect(() => buildChart(spec)).not.toThrow();
  });

  it('open wider in later position', () => {
    const open = (id: string) => rangePercent(actionRange(buildChart(STARTER_CHARTS.find((c) => c.id === id)!), 'raise'));
    expect(open('6max-100-rfi-utg')).toBeLessThan(open('6max-100-rfi-hj'));
    expect(open('6max-100-rfi-hj')).toBeLessThan(open('6max-100-rfi-co'));
    expect(open('6max-100-rfi-co')).toBeLessThan(open('6max-100-rfi-btn'));
  });
});

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    const ids = CURRICULUM.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => `${t.id}/${m.id}/${l.id}`)));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

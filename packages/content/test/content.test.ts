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

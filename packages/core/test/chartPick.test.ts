import { describe, expect, it } from 'vitest';
import { type ChartMeta, chartFit, closestCharts, closestVariant, coversVillain, fitIsExact, nearestOf, nearestTableSize, spotKey, variantDistance } from '../src';

const meta = (over: Partial<ChartMeta>): ChartMeta => ({
  id: 'x',
  title: 'X',
  game: 'cash',
  tableSize: 9,
  stackBb: 100,
  openBb: 2.5,
  hero: 'BB',
  spot: 'vs-open',
  villains: ['BTN'],
  basis: 'gto',
  source: 'starter-approx',
  ...over,
});

const LIB: ChartMeta[] = [
  meta({ id: '9-100' }),
  meta({ id: '9-40', stackBb: 40, source: 'model-approx' }),
  meta({ id: '9-200', stackBb: 200, source: 'model-approx' }),
  meta({ id: '9-100-o4', openBb: 4, source: 'model-approx' }),
  meta({ id: '9-200-o4', stackBb: 200, openBb: 4, source: 'model-approx' }),
  meta({ id: '9-co', villains: ['CO'] }),
  meta({ id: '6-100', tableSize: 6 }),
];

describe('chart picking', () => {
  it('keys spots without the stack or size', () => {
    expect(spotKey(LIB[0])).toBe(spotKey(LIB[1]));
    expect(spotKey(LIB[0])).not.toBe(spotKey(LIB[5]));
  });

  it('finds the nearest table size, ties to the larger table', () => {
    expect(nearestTableSize([6, 9], 8)).toBe(9);
    expect(nearestTableSize([6, 9], 5)).toBe(6);
    expect(nearestTableSize([6, 9], 7)).toBe(6);
    expect(nearestTableSize([6, 8], 7)).toBe(8);
    expect(nearestTableSize([], 7)).toBeUndefined();
  });

  it('measures stack and size on a log scale', () => {
    expect(variantDistance({ stackBb: 100, openBb: 2.5 }, { stackBb: 150, openBb: 2.5 })).toBeCloseTo(Math.log(1.5));
    expect(variantDistance({ stackBb: 40, openBb: 2.5 }, { stackBb: 60, openBb: 2.5 })).toBeCloseTo(Math.log(1.5));
  });

  it('picks the closest variant of a spot', () => {
    const spot = LIB.filter((m) => spotKey(m) === spotKey(LIB[0]) && m.tableSize === 9);
    expect(closestVariant(spot, { stackBb: 100, openBb: 2.5 })?.id).toBe('9-100');
    expect(closestVariant(spot, { stackBb: 45, openBb: 2.5 })?.id).toBe('9-40');
    expect(closestVariant(spot, { stackBb: 180, openBb: 5 })?.id).toBe('9-200-o4');
    expect(closestVariant(spot, { stackBb: 110, openBb: 4 })?.id).toBe('9-100-o4');
  });

  it('picks one chart per spot for a game', () => {
    const live = closestCharts(LIB, { format: 'cash', tableSize: 9, stackBb: 200, openBb: 5 });
    expect(live.charts.map((c) => c.id)).toEqual(['9-200-o4', '9-co']);
    expect(live.exact).toBe(true);
    const sixish = closestCharts(LIB, { format: 'cash', tableSize: 5, stackBb: 100, openBb: 2.5 });
    expect(sixish).toMatchObject({ tableSize: 6, exact: false });
    expect(sixish.charts.map((c) => c.id)).toEqual(['6-100']);
  });

  it('says which parts of a match are approximate', () => {
    const q = { format: 'cash' as const, tableSize: 8, stackBb: 110, openBb: 3 };
    expect(chartFit(LIB[0], q)).toEqual({ table: false, stack: true, open: false });
    expect(fitIsExact(chartFit(LIB[0], { ...q, tableSize: 9, openBb: 2.5 }))).toBe(true);
    expect(chartFit(LIB[0], { ...q, stackBb: 200 }).stack).toBe(false);
  });

  it('defaults pickers to the nearest value on offer', () => {
    expect(nearestOf([40, 60, 100, 150, 200], 125)).toBe(150);
    expect(nearestOf([40, 60, 100, 150, 200], 75)).toBe(60);
    expect(nearestOf([2.5, 3, 4, 5], 6)).toBe(5);
  });

  it('matches a villain seat to the charts that cover it', () => {
    expect(coversVillain(meta({ villains: ['SB', 'BB'] }), 'BB')).toBe(true);
    expect(coversVillain(meta({ villains: ['SB', 'BB'] }), 'BTN')).toBe(false);
    expect(coversVillain(meta({ villains: undefined }), 'BTN')).toBe(true);
  });
});

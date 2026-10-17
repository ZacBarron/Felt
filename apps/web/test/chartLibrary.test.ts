import { CHART_LIBRARY } from '@felt/content';
import { PRESETS, spotKey } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { dailyFacing, dailyItems } from '../src/pages/DailyPage';
import { FAMILIES, familiesOf, isBlindBattle, resolveVariant, spotOptions, variantAxes, variantsOf } from '../src/state/chartPicker';
import { chartsForGame, closestForGame, fitForGame, getChart, libraryForGame } from '../src/state/charts';
import { weeklyPool } from '../src/state/weekly';

const live = PRESETS['live-1-3'].settings;
const nine = CHART_LIBRARY.filter((m) => m.tableSize === 9);

describe('review set', () => {
  it('keeps every chart that existed before the library, so saved cards stay in review', () => {
    const ids = chartsForGame(live).charts.map((c) => c.spec.id);
    for (const id of ['9max-100-rfi-utg', '9max-100-bb-vs-btn', '9max-100-btn-vs-3bet', '9max-100-utg-vs-3bet', '9max-100-iso-btn-vs-2limp']) expect(ids).toContain(id);
    // Old charts come first, in their old order, so new cards are introduced as before.
    expect(ids.slice(0, 3)).toEqual(['9max-100-rfi-utg', '9max-100-rfi-utgp1', '9max-100-rfi-utgp2']);
  });

  it('grows by a few dozen hand written charts, not the whole library', () => {
    const { charts } = chartsForGame(live);
    expect(charts.length).toBeLessThanOrEqual(40);
    expect(charts.every((c) => c.spec.source === 'starter-approx')).toBe(true);
    // Defense, 3bet, 4bet and squeeze spots join review, not just opens.
    for (const spot of ['vs-open', 'vs-3bet', 'vs-4bet', 'squeeze']) expect(charts.some((c) => c.spec.spot === spot), spot).toBe(true);
  });

  it('does not change when the stack or open size changes', () => {
    const a = chartsForGame(live).charts.map((c) => c.spec.id);
    const deep = { ...live, stackBb: 200, openBb: 5 };
    const b = chartsForGame(deep).charts.map((c) => c.spec.id);
    expect(b).toEqual(a);
  });
});

describe('closest charts for a game', () => {
  it('picks the variant for the stack and open size, and says so when it is approximate', () => {
    const deep = { ...live, stackBb: 200, openBb: 5 };
    const { charts } = closestForGame(deep);
    const bb = charts.find((c) => c.spot === 'vs-open' && c.hero === 'BB' && c.villains?.[0] === 'BTN')!;
    expect(bb.id).toBe('9max-200-o5-bb-vs-btn');
    expect(fitForGame(bb, deep)).toEqual({ table: true, stack: true, open: true });
    // Limped pots have only 100bb charts: the closest is honest about the stack.
    const iso = charts.find((c) => c.spot === 'vs-limp')!;
    expect(fitForGame(iso, deep).stack).toBe(false);
  });

  it('lists the library for the nearest table size', () => {
    const { tableSize, exact, charts } = libraryForGame({ ...live, tableSize: 8 });
    expect([tableSize, exact]).toEqual([9, false]);
    expect(charts.length).toBeGreaterThan(1000);
    expect(charts.every((c) => c.tableSize === 9)).toBe(true);
  });

  it('builds derived charts on demand', () => {
    expect(getChart('9max-60-o4-utg-vs-btn-3bet')?.spec.source).toBe('model-approx');
    expect(getChart('nope')).toBeUndefined();
  });
});

describe('Ranges picker', () => {
  it('offers every spot type with charts', () => {
    for (const f of FAMILIES) expect(spotOptions(nine, f.id).length, f.id).toBeGreaterThan(0);
  });

  it('lists blind battles under their own type too', () => {
    const bbVsSb = nine.find((m) => m.id === '9max-100-bb-vs-sb')!;
    expect(isBlindBattle(bbVsSb)).toBe(true);
    expect(familiesOf(bbVsSb)).toEqual(['vs-open', 'bvb']);
    expect(spotOptions(nine, 'bvb').map((o) => o.label)).toEqual(expect.arrayContaining(['BB vs SB', 'SB vs BB 3bet', 'BB vs SB 4bet', 'SB open', 'BB vs SB limp']));
  });

  it('gives one option per 3bettor seat, even when seats share a chart', () => {
    const utg = spotOptions(nine, 'vs-3bet').filter((o) => o.first === 'UTG');
    expect(utg.map((o) => o.second)).toEqual(['UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
    expect(new Set(utg.slice(0, 5).map((o) => o.key)).size).toBe(1);
  });

  it('orders seats in table order', () => {
    const firsts = [...new Set(spotOptions(nine, 'vs-open').map((o) => o.first))];
    expect(firsts).toEqual(['UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
  });

  it('resolves a spot at a stack and size, or the nearest', () => {
    const key = spotKey(nine.find((m) => m.id === '9max-100-bb-vs-btn')!);
    expect(variantAxes(variantsOf(nine, key))).toEqual({ stacks: [40, 60, 100, 150, 200], opens: [2.5, 3, 4, 5] });
    expect(resolveVariant(nine, key, 150, 4)?.id).toBe('9max-150-o4-bb-vs-btn');
    expect(resolveVariant(nine, key, 120, 6)?.id).toBe('9max-100-o5-bb-vs-btn');
    const iso = spotKey(nine.find((m) => m.id === '9max-100-iso-btn-vs-1limp')!);
    expect(resolveVariant(nine, iso, 200, 5)?.id).toBe('9max-100-iso-btn-vs-1limp');
  });
});

describe('challenges draw more than opens', () => {
  it('rotates the daily challenge through defense, 3bets, 4bets, squeezes and blind battles', () => {
    const spots = new Set<string>();
    for (let d = 1; d <= 14; d++) {
      const date = new Date(2026, 9, d);
      const last = dailyItems(date).filter((i) => i.kind === 'chart').at(-1)!;
      const spot = getChart((last as { chartId: string }).chartId)!.spec.spot;
      expect(dailyFacing(date)).toContain(spot);
      spots.add(spot);
    }
    for (const s of ['vs-open', 'vs-3bet', 'squeeze', 'bvb']) expect(spots, s).toContain(s);
    expect(spots.has('vs-4bet') || spots.has('vs-squeeze')).toBe(true);
  });

  it('puts 3bet, 4bet and defense spots in the weekly pool', () => {
    const spots = new Set(weeklyPool().flatMap((p) => (p.decision.kind === 'chart' ? [getChart(p.decision.chartId)!.spec.spot] : [])));
    for (const s of ['vs-open', 'vs-3bet', 'vs-4bet', 'squeeze']) expect(spots, s).toContain(s);
  });
});

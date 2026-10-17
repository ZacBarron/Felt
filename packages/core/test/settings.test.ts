import { describe, expect, it } from 'vitest';
import { CHART_OPEN_BB, chartsForTable, DEFAULT_SETTINGS, formatAmount, openSize, positionsFor, PRESETS, rakeFor, sameGame, stakesLabel } from '../src';

describe('positionsFor', () => {
  it('names seats for every table size', () => {
    expect(positionsFor(2)).toEqual(['BTN', 'BB']);
    expect(positionsFor(3)).toEqual(['BTN', 'SB', 'BB']);
    expect(positionsFor(6)).toEqual(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(9)).toEqual(['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(10)).toHaveLength(10);
    expect(() => positionsFor(11)).toThrow();
  });
});

describe('money', () => {
  const live = PRESETS['live-1-3'].settings;

  it('formats in money or big blinds', () => {
    expect(formatAmount(2.5, live)).toBe('$7.5');
    expect(formatAmount(100, live)).toBe('$300');
    expect(formatAmount(2.5, { ...live, units: 'bb' })).toBe('2.5bb');
    expect(formatAmount(-0.5, live)).toBe('-$1.5');
    expect(stakesLabel({ sb: 1, bb: 3, straddle: 6, currency: 'USD' })).toBe('1/3/6');
  });

  it('caps rake and respects no flop no drop', () => {
    expect(rakeFor(30, live.rake)).toBeCloseTo(4); // 10% = 3, plus 1 drop
    expect(rakeFor(200, live.rake)).toBeCloseTo(6); // capped at 5, plus 1
    expect(rakeFor(10, live.rake, false)).toBe(0);
  });
});

describe('chartsForTable', () => {
  const charts = [
    { id: 'a', tableSize: 6, game: 'cash' as const },
    { id: 'b', tableSize: 9, game: 'cash' as const },
  ];

  it('prefers an exact match and falls back to the nearest size', () => {
    expect(chartsForTable(charts, 9, 'cash')).toMatchObject({ tableSize: 9, exact: true });
    expect(chartsForTable(charts, 8, 'cash')).toMatchObject({ tableSize: 9, exact: false });
    expect(chartsForTable(charts, 5, 'cash')).toMatchObject({ tableSize: 6, exact: false });
  });
});

describe('open size', () => {
  it('defaults to the size the charts assume', () => {
    expect(openSize(DEFAULT_SETTINGS)).toBe(CHART_OPEN_BB);
    expect(openSize({ ...DEFAULT_SETTINGS, openBb: 4 })).toBe(4);
  });

  it('does not stop a game from matching its preset', () => {
    expect(sameGame({ ...DEFAULT_SETTINGS, openBb: 5 }, DEFAULT_SETTINGS)).toBe(true);
    expect(sameGame({ ...DEFAULT_SETTINGS, tableSize: 6 }, DEFAULT_SETTINGS)).toBe(false);
  });
});

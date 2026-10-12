import { describe, expect, it } from 'vitest';
import {
  ALL_HAND_CLASSES,
  parseComboRange,
  gridHandClass,
  handClassOf,
  parseCards,
  parseRange,
  rangeComboCount,
  rangePercent,
  rangeToCombos,
} from '../src';

describe('hand classes', () => {
  it('lays out the 13x13 grid', () => {
    expect(ALL_HAND_CLASSES).toHaveLength(169);
    expect(gridHandClass(0, 0)).toBe('AA');
    expect(gridHandClass(0, 1)).toBe('AKs');
    expect(gridHandClass(1, 0)).toBe('AKo');
    expect(gridHandClass(12, 12)).toBe('22');
  });

  it('names specific combos', () => {
    const [a, b] = parseCards('KdAd');
    expect(handClassOf(a, b)).toBe('AKs');
    const [c, d] = parseCards('7h7c');
    expect(handClassOf(c, d)).toBe('77');
  });
});

describe('parseRange', () => {
  it('expands plus and dash notation', () => {
    expect([...parseRange('TT+').keys()]).toEqual(['TT', 'JJ', 'QQ', 'KK', 'AA']);
    expect([...parseRange('K9s+').keys()]).toEqual(['K9s', 'KTs', 'KJs', 'KQs']);
    expect([...parseRange('A2s-A5s').keys()]).toEqual(['A2s', 'A3s', 'A4s', 'A5s']);
    expect([...parseRange('55-22').keys()]).toEqual(['22', '33', '44', '55']);
    expect([...parseRange('AK').keys()]).toEqual(['AKs', 'AKo']);
  });

  it('applies frequencies, last token wins', () => {
    const r = parseRange('QQ+, QQ:0.5');
    expect(r.get('QQ')).toBe(0.5);
    expect(r.get('AA')).toBe(1);
  });

  it('counts combos', () => {
    expect(rangeComboCount(parseRange('AA, AKs, AKo'))).toBe(6 + 4 + 12);
    expect(rangePercent(parseRange('22+'))).toBeCloseTo(78 / 1326);
  });

  it('removes blocked combos', () => {
    const combos = rangeToCombos(parseRange('AA'), parseCards('As'));
    expect(combos).toHaveLength(3);
  });

  it('rejects bad input', () => {
    expect(() => parseRange('AXs')).toThrow();
    expect(() => parseRange('AKs:2')).toThrow();
  });
});

describe('parseComboRange', () => {
  it('mixes hand classes with exact combos and drops dead cards', () => {
    const board = parseCards('Kc8h5h2s2d');
    const combos = parseComboRange('KJ, QhJh, JhTh:0.5', board);
    // KJ has 16 combos, minus the 4 that use the Kc.
    expect(combos.filter((c) => c.weight === 1).length).toBe(13);
    expect(combos.find((c) => c.weight === 0.5)?.cards.sort()).toEqual(parseCards('JhTh').sort());
    expect(parseComboRange('Kc8h', board)).toEqual([]);
  });

  it('lets a later token override an earlier one', () => {
    const combos = parseComboRange('QJs, QhJh:0.25');
    expect(combos).toHaveLength(4);
    expect(combos.filter((c) => c.weight === 0.25)).toHaveLength(1);
  });

  it('rejects bad combos', () => {
    expect(() => parseComboRange('AhAh')).toThrow();
    expect(() => parseComboRange('QhJh:3')).toThrow();
  });
});

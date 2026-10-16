import { describe, expect, it } from 'vitest';
import { FULL_DECK } from './cards';
import { seededRng } from './equity';
import { evaluate } from './evaluator';
import { HAND_STRENGTH_ORDER, preflopPercentile } from './preflopStrength';
import { ALL_HAND_CLASSES, comboCount, handClassCombos, type HandClass } from './ranges';

/** Equity of a hand class against one random hand, by sampling. */
function sampleEquity(hand: HandClass, samples: number, seed: number) {
  const rng = seededRng(seed);
  const combos = handClassCombos(hand);
  let eq = 0;
  for (let i = 0; i < samples; i++) {
    const hero = combos[Math.floor(rng() * combos.length)];
    const rest = FULL_DECK.filter((c) => c !== hero[0] && c !== hero[1]);
    for (let k = 0; k < 7; k++) {
      const j = k + Math.floor(rng() * (rest.length - k));
      [rest[k], rest[j]] = [rest[j], rest[k]];
    }
    const board = rest.slice(2, 7);
    const a = evaluate([...hero, ...board]);
    const b = evaluate([rest[0], rest[1], ...board]);
    eq += a > b ? 1 : a === b ? 0.5 : 0;
  }
  return eq / samples;
}

describe('HAND_STRENGTH_ORDER', () => {
  it('lists every hand class once, best first', () => {
    expect(HAND_STRENGTH_ORDER).toHaveLength(169);
    expect(new Set(HAND_STRENGTH_ORDER.map((h) => h.hand))).toEqual(new Set(ALL_HAND_CLASSES));
    for (let i = 1; i < HAND_STRENGTH_ORDER.length; i++) expect(HAND_STRENGTH_ORDER[i].equity).toBeLessThanOrEqual(HAND_STRENGTH_ORDER[i - 1].equity);
    expect(HAND_STRENGTH_ORDER[0].hand).toBe('AA');
    expect(HAND_STRENGTH_ORDER[168].hand).toBe('32o');
  });

  it('matches a fresh sample with a different seed', () => {
    for (const { hand, equity } of HAND_STRENGTH_ORDER.filter((_, i) => i % 21 === 0)) {
      expect(Math.abs(sampleEquity(hand, 20000, 99) - equity)).toBeLessThan(0.012);
    }
  });
});

describe('preflopPercentile', () => {
  it('counts the combos stronger than a hand', () => {
    expect(preflopPercentile('AA')).toBe(0);
    expect(preflopPercentile('KK')).toBe(6 / 1326);
    expect(preflopPercentile('32o')).toBe((1326 - comboCount('32o')) / 1326);
    expect(preflopPercentile('AKs')).toBeLessThan(preflopPercentile('AKo'));
  });
});

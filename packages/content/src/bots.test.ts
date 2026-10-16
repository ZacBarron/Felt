import { describe, expect, it } from 'vitest';
import { BOTS, playerTypeOf, TABLE_PRESETS } from './bots';

describe('bots', () => {
  it('each bot is a known player type with a sane profile', () => {
    const ids = new Set<string>();
    for (const b of BOTS) {
      expect(ids.has(b.id)).toBe(false);
      ids.add(b.id);
      expect(playerTypeOf(b)).toBeDefined();
      const { style, strength } = b.profile;
      expect(strength).toBeGreaterThan(0);
      expect(strength).toBeLessThanOrEqual(1);
      for (const x of [style.aggression, style.bluff, style.limp]) expect(x).toBeGreaterThanOrEqual(0);
      for (const x of [style.aggression, style.bluff, style.limp]) expect(x).toBeLessThanOrEqual(1);
      expect(style.sizes.length).toBeGreaterThan(0);
      expect(b.blurb.split(',').length).toBeLessThanOrEqual(2);
      expect(b.blurb).not.toMatch(/—/);
    }
  });

  it('presets fill a full table with distinct known bots', () => {
    for (const p of TABLE_PRESETS) {
      expect(p.bots.length).toBeGreaterThanOrEqual(9);
      expect(new Set(p.bots).size).toBe(p.bots.length);
      for (const id of p.bots) expect(BOTS.some((b) => b.id === id)).toBe(true);
    }
  });
});

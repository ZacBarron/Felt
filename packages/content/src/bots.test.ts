import { describe, expect, it } from 'vitest';
import { BOTS, botAtTable, botById, LINEUP_TYPES, lineupBots, playerTypeOf, TABLE_PRESETS } from './bots';

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

describe('bots at a table', () => {
  it('open to the live size at live presets and keep their own style elsewhere', () => {
    const live = TABLE_PRESETS.find((p) => p.id === 'casino')!;
    const online = TABLE_PRESETS.find((p) => p.id === 'tough')!;
    expect(botAtTable('lou', live)?.profile.style.openTo).toBe(5);
    expect(botAtTable('lou', online)?.profile.style.openTo).toBeUndefined();
    expect(botById('lou')?.profile.style.openTo).toBeUndefined();
  });
});

describe('custom lineups', () => {
  it('every lineup type has a bot', () => {
    for (const t of LINEUP_TYPES) expect(BOTS.some((b) => b.type === t)).toBe(true);
  });

  it('seats roster bots first, then stand ins with their own names', () => {
    const ids = lineupBots(['nit', 'nit', 'nit', 'maniac', 'nit']);
    expect(ids.slice(0, 2)).toEqual(['nora', 'ike']);
    expect(ids[3]).toBe('max');
    expect(new Set(ids).size).toBe(5);
    const bots = ids.map((id) => botById(id)!);
    expect(new Set(bots.map((b) => b.name)).size).toBe(5);
    expect(bots.every((b) => b.type === 'nit' || b.type === 'maniac')).toBe(true);
    // A stand in plays exactly like its roster bot.
    expect(bots[2].profile).toEqual(botById('nora')!.profile);
    expect(BOTS.some((b) => b.name === bots[2].name)).toBe(false);
    expect(() => lineupBots(['nobody'])).toThrow();
    expect(botById('nora.x')).toBeUndefined();
  });

  it('opens to the chosen size at a custom table', () => {
    expect(botAtTable('nora.1', { openBb: 4 })?.profile.style.openTo).toBe(4);
    expect(botAtTable('nora.1', {})?.profile.style.openTo).toBeUndefined();
  });
});

import { DEFAULT_SETTINGS, PRESETS } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { GAME_CHOICES, hasDefaultGame, introCharts, markRangesIntroSeen, rangesIntroSeen, splitHand } from '../src/components/RangesIntro';

describe('Ranges intro', () => {
  it('offers only games that exist as presets', () => {
    for (const c of GAME_CHOICES) expect(PRESETS[c.id], c.id).toBeDefined();
  });

  it('asks for the game only while the default game is set', () => {
    expect(hasDefaultGame(DEFAULT_SETTINGS)).toBe(true);
    expect(hasDefaultGame({ ...DEFAULT_SETTINGS })).toBe(true);
    expect(hasDefaultGame(PRESETS['online-6max'].settings)).toBe(false);
    expect(hasDefaultGame({ ...DEFAULT_SETTINGS, stackBb: 200 })).toBe(false);
  });

  it('has an open chart and a split hand to picture for every preset', () => {
    for (const [id, p] of Object.entries(PRESETS)) {
      const { open, defend } = introCharts(p.settings);
      expect(open, id).toBeDefined();
      expect(defend, id).toBeDefined();
      const mix = defend!.mixes.get(splitHand(defend!)) ?? {};
      expect(Object.values(mix).filter((f) => f >= 0.25).length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('remembers it was seen even without storage', () => {
    expect(rangesIntroSeen()).toBe(false);
    markRangesIntroSeen();
    expect(rangesIntroSeen()).toBe(true);
  });
});

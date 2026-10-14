import { PRESETS, scoreMixAnswer } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { firstHandSpot } from '../src/state/charts';

describe('firstHandSpot', () => {
  it('finds an open spot for every preset game', () => {
    for (const [id, preset] of Object.entries(PRESETS)) {
      const spot = firstHandSpot(preset.settings);
      expect(spot, id).toBeDefined();
      expect(spot!.chart.spec.spot).toBe('rfi');
    }
  });

  it('picks a hand where opening counts as right', () => {
    for (const preset of Object.values(PRESETS)) {
      const { chart, hand } = firstHandSpot(preset.settings)!;
      const mix = chart.mixes.get(hand)!;
      const open = chart.spec.actions[0].id;
      expect(scoreMixAnswer(mix, { [open]: 1 }).verdict).toBe('right');
    }
  });
});

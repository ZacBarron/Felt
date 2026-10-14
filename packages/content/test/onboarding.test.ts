import { exactEquity, parseCards } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { FIRST_HAND_NEW, FIRST_HAND_NEW_MATCHUP, TESTIMONIALS } from '../src';

describe('onboarding content', () => {
  it('states the exact chance for the first hand', () => {
    const { hero, villain, winPct } = FIRST_HAND_NEW_MATCHUP;
    const r = exactEquity(parseCards(hero) as [number, number], parseCards(villain) as [number, number], []);
    expect(Math.round(r.win * 100)).toBe(winPct);
    expect(FIRST_HAND_NEW.explain).toContain(`${winPct}%`);
    expect(FIRST_HAND_NEW.choiceCards?.[FIRST_HAND_NEW.answer]).toBe(hero);
  }, 60_000);

  it('only holds complete testimonials', () => {
    for (const t of TESTIMONIALS) {
      expect(t.quote.trim().length).toBeGreaterThan(10);
      expect(t.name.trim().length).toBeGreaterThan(0);
    }
  });
});

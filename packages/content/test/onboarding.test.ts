import { exactEquity, parseCards } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { FIRST_HAND_CASUAL, FIRST_HAND_NEW, FIRST_HAND_NEW_MATCHUP, TESTIMONIALS } from '../src';

describe('onboarding content', () => {
  it('states the exact chance for the first hand', () => {
    const { hero, villain, winPct } = FIRST_HAND_NEW_MATCHUP;
    const r = exactEquity(parseCards(hero) as [number, number], parseCards(villain) as [number, number], []);
    expect(Math.round(r.win * 100)).toBe(winPct);
    expect(FIRST_HAND_NEW.explain).toContain(`${winPct}%`);
    expect(FIRST_HAND_NEW.cards).toBe(hero);
    expect(FIRST_HAND_NEW.choices[FIRST_HAND_NEW.answer]).toContain(`${winPct}%`);
    // "Loses about 1 time in 8": aces lose 12.4% of the time.
    expect(Math.abs(r.lose - 1 / 8)).toBeLessThan(0.005);
  }, 60_000);

  it('finds the first hand for players who know the rules', () => {
    expect(FIRST_HAND_CASUAL?.kind).toBe('quiz');
    expect(FIRST_HAND_CASUAL.choices.length).toBeGreaterThan(1);
  });

  it('only holds complete testimonials', () => {
    for (const t of TESTIMONIALS) {
      expect(t.quote.trim().length).toBeGreaterThan(10);
      expect(t.name.trim().length).toBeGreaterThan(0);
    }
  });
});

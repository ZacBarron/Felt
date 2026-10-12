import { describe, expect, it } from 'vitest';
import { challengeNumber, dailyPicks, shareGrid, streakWithFreezes } from '../src';

const day = (n: number) => new Date(2026, 5, n, 20);

describe('streaks with freezes', () => {
  it('counts consecutive days and does not break on a today with no study yet', () => {
    const s = streakWithFreezes([day(1), day(2), day(3)], day(4));
    expect(s).toMatchObject({ streak: 3, activeToday: false, bank: 1 });
  });

  it('starts with one freeze, earns one every seven days, and spends them on missed days', () => {
    const active = [1, 2, 3, 4, 5, 6, 7, 9, 10].map(day);
    const s = streakWithFreezes(active, day(10));
    expect(s.streak).toBe(9);
    expect(s.frozen).toEqual(['2026-6-8']);
    expect(s.bank).toBe(1);
    expect(s.activeToday).toBe(true);
    // The starting freeze covers one early miss.
    expect(streakWithFreezes([1, 2, 3, 5, 6].map(day), day(6)).streak).toBe(5);
  });

  it('resets when a day is missed with no freeze banked, but keeps the best', () => {
    const s = streakWithFreezes([1, 2, 3, 5, 6, 8].map(day), day(8));
    expect(s.streak).toBe(1);
    expect(s.best).toBe(5);
  });

  it('caps the bank', () => {
    const active = Array.from({ length: 28 }, (_, i) => day(i + 1));
    expect(streakWithFreezes(active, day(28)).bank).toBe(2);
  });
});

describe('daily challenge', () => {
  it('numbers days from the epoch', () => {
    expect(challengeNumber(new Date(2026, 0, 1, 9))).toBe(1);
    expect(challengeNumber(new Date(2026, 0, 31, 23))).toBe(31);
  });

  it('picks the same items for everyone on a day, and different ones the next day', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const a = dailyPicks(items, new Date(2026, 9, 12, 8), 5);
    expect(dailyPicks(items, new Date(2026, 9, 12, 22), 5)).toEqual(a);
    expect(dailyPicks(items, new Date(2026, 9, 13), 5)).not.toEqual(a);
    expect(new Set(a).size).toBe(5);
  });

  it('shares results without spoilers', () => {
    expect(shareGrid([1, 0.5, 0, 1])).toBe('🟩🟨🟥🟩');
  });
});

import { describe, expect, it } from 'vitest';
import { streakLine, type StreakWeekData } from '../src/components/StreakWeek';

const day = (over: Partial<StreakWeekData['days'][number]> = {}) => ({ key: 'k', label: 'M', name: 'Monday', done: false, frozen: false, today: false, ...over });
const data = (streak: Partial<StreakWeekData['streak']>, yesterday = day()): StreakWeekData => ({
  streak: { streak: 0, frozen: [], bank: 1, activeToday: false, best: 0, ...streak },
  days: [day(), day(), day(), day(), day(), yesterday, day({ today: true })],
});

describe('streakLine', () => {
  it('invites a first streak', () => {
    expect(streakLine(data({}))).toBe('Study today to start your streak.');
  });
  it('starts over calmly after a lost streak', () => {
    expect(streakLine(data({ best: 4 }))).toBe('Study today to start a new streak.');
  });
  it('counts today once studied', () => {
    expect(streakLine(data({ streak: 8, activeToday: true }))).toBe('Today counts. Tomorrow makes 9 days.');
  });
  it('says what today adds before studying', () => {
    expect(streakLine(data({ streak: 1 }))).toBe('Study today to make it 2 days.');
  });
  it('names a freeze that covered yesterday', () => {
    expect(streakLine(data({ streak: 8 }, day({ frozen: true })))).toBe('A streak freeze covered yesterday. Study today to make it 9 days.');
  });
});

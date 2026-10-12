import { dayKey } from './drills';

/**
 * Habit mechanics: streaks with earned freezes, and a daily challenge that is
 * the same for everyone on a given day so results can be compared and shared.
 */

export interface StreakState {
  /** Consecutive days kept, counting active days only. */
  streak: number;
  /** Missed days that a freeze covered, as day keys. */
  frozen: string[];
  /** Freezes in the bank. */
  bank: number;
  activeToday: boolean;
  /** Longest streak ever. */
  best: number;
}

export interface StreakRules {
  /** One freeze is earned for every this many active days in a row. */
  earnEvery: number;
  maxBank: number;
  /** Freezes a new player starts with, so one early miss does not end a young habit. */
  startBank: number;
}

export const STREAK_RULES: StreakRules = { earnEvery: 7, maxBank: 2, startBank: 1 };

/**
 * Replays study days from the first one to today. A missed day spends a
 * freeze if one is banked, otherwise the streak resets. Today never breaks a
 * streak: there is still time to study.
 */
export function streakWithFreezes(activeDays: readonly Date[], now: Date, rules: StreakRules = STREAK_RULES): StreakState {
  const days = new Set(activeDays.map(dayKey));
  const activeToday = days.has(dayKey(now));
  if (days.size === 0) return { streak: 0, frozen: [], bank: rules.startBank, activeToday, best: 0 };
  const first = new Date(Math.min(...activeDays.map((d) => d.getTime())));
  const cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let streak = 0;
  let run = 0;
  let bank = rules.startBank;
  let best = 0;
  let frozen: string[] = [];
  while (cursor <= end) {
    const key = dayKey(cursor);
    const isToday = cursor.getTime() === end.getTime();
    if (days.has(key)) {
      streak++;
      run++;
      if (run % rules.earnEvery === 0) bank = Math.min(rules.maxBank, bank + 1);
    } else if (!isToday) {
      run = 0;
      if (streak > 0 && bank > 0) {
        bank--;
        frozen.push(key);
      } else {
        streak = 0;
        frozen = [];
      }
    }
    best = Math.max(best, streak);
    cursor.setDate(cursor.getDate() + 1);
  }
  return { streak, frozen, bank, activeToday, best };
}

/** Daily challenge numbering starts on this day. */
export const CHALLENGE_EPOCH = new Date(2026, 0, 1);

export function challengeNumber(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((d.getTime() - CHALLENGE_EPOCH.getTime()) / 86_400_000) + 1;
}

/** A small deterministic generator (mulberry32) so every player gets the same picks on a given day. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks `n` distinct items for a day, the same for everyone. */
export function dailyPicks<T>(items: readonly T[], date: Date, n: number, salt = 0): T[] {
  const rand = seededRandom(challengeNumber(date) * 7919 + salt);
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** A spoiler free result line for sharing: green right, yellow partly right, red wrong. */
export function shareGrid(scores: readonly number[]): string {
  return scores.map((s) => (s >= 1 ? '🟩' : s > 0 ? '🟨' : '🟥')).join('');
}

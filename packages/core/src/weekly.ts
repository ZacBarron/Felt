import { seededRandom } from './habits';

/**
 * The weekly challenge: ten harder decisions, the same for every player in an
 * ISO week. Picks are balanced across spot types, cycle through each type's
 * pool before repeating, and are ordered so the set gets harder as it goes.
 */

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Thursday of ISO week 1 of 2026, in UTC. Weekly challenge numbering starts that week. */
const WEEKLY_EPOCH_THURSDAY = Date.UTC(2026, 0, 1);

export interface IsoWeek {
  /** Like '2026-W42'. */
  id: string;
  /** The ISO week year, which can differ from the calendar year around New Year. */
  year: number;
  /** 1 to 53. */
  week: number;
  /** Weekly challenge number: 1 for the first ISO week of 2026, counting on across years. */
  number: number;
}

/** Thursday of the date's ISO week, in UTC milliseconds, from the local calendar day. */
function thursdayOf(date: Date): number {
  // The local calendar day, measured in UTC so daylight saving never moves it.
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (new Date(day).getUTCDay() + 6) % 7; // Monday 0 to Sunday 6
  return day + (3 - weekday) * DAY_MS;
}

/**
 * The ISO week (Monday to Sunday) holding the local calendar day of `date`.
 * Like the daily challenge, the week turns at local midnight.
 */
export function isoWeek(date: Date): IsoWeek {
  const thursday = thursdayOf(date);
  const year = new Date(thursday).getUTCFullYear();
  // Week 1 is the week with the year's first Thursday.
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / WEEK_MS) + 1;
  const number = Math.round((thursday - WEEKLY_EPOCH_THURSDAY) / WEEK_MS) + 1;
  return { id: `${year}-W${String(week).padStart(2, '0')}`, year, week, number };
}

/** First and last local calendar day (Monday and Sunday, at midnight) of the week holding `date`. */
export function weekRange(date: Date): { start: Date; end: Date } {
  const thursday = new Date(thursdayOf(date));
  const local = (offsetDays: number) => new Date(thursday.getUTCFullYear(), thursday.getUTCMonth(), thursday.getUTCDate() + offsetDays);
  return { start: local(-3), end: local(3) };
}

export interface WeeklyCandidate {
  id: string;
  /** Spot type, such as a mixed hand or a river decision. Picks are balanced across types. */
  kind: string;
  /** Item difficulty on the Suited Rating scale. */
  difficulty: number;
}

export interface WeeklySlot {
  kind: string;
  count: number;
}

/** A small string hash (FNV-1a) so each spot type gets its own stable seed. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** The harder half of a spot type: items at or above its median difficulty. */
function harderHalf<T extends WeeklyCandidate>(items: readonly T[]): T[] {
  if (items.length === 0) return [];
  const sorted = items.map((i) => i.difficulty).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return items.filter((i) => i.difficulty >= median);
}

/**
 * An endless, deterministic run through `items`: one seeded shuffle per pass,
 * a fresh shuffle for the next pass. Starting at `start` lets week n pick up
 * where week n - 1 stopped, so nothing repeats until the whole pool is used.
 */
function* cycle<T>(items: readonly T[], salt: number, start: number): Generator<T> {
  const n = items.length;
  if (n === 0) return;
  let pass = -1;
  let order: T[] = [];
  for (let p = start; ; p++) {
    const now = Math.floor(p / n);
    if (now !== pass) {
      pass = now;
      const rand = seededRandom(salt + pass * 7919);
      order = [...items];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    yield order[p % n];
  }
}

/**
 * Picks the week's set from a pool. Each slot takes `count` items of its
 * kind from the harder half of that kind; a kind with too few items is
 * topped up from the others in turn. The result is sorted from easiest to
 * hardest, with ties alternating between kinds. Input order never matters.
 */
export function weeklyPicks<T extends WeeklyCandidate>(pool: readonly T[], week: IsoWeek | number, slots: readonly WeeklySlot[]): T[] {
  const number = typeof week === 'number' ? week : week.number;
  const byId = new Map<string, T>();
  for (const item of pool) if (!byId.has(item.id)) byId.set(item.id, item);
  const unique = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const streams = slots.map((slot, order) => {
    const items = harderHalf(unique.filter((i) => i.kind === slot.kind));
    // Week 1 starts at the top of the run; weeks before the epoch share that start.
    const start = Math.max(0, number - 1) * Math.max(1, slot.count);
    return { slot, order, items, run: cycle(items, hashString(slot.kind), start) };
  });

  const used = new Set<string>();
  const picks: { item: T; order: number; rank: number }[] = [];
  const take = (s: (typeof streams)[number], k: number) => {
    let got = 0;
    // Two passes over the pool always find any unused item.
    for (let tries = 0; got < k && tries < s.items.length * 2; tries++) {
      const next = s.run.next();
      if (next.done) break;
      if (used.has(next.value.id)) continue;
      used.add(next.value.id);
      picks.push({ item: next.value, order: s.order, rank: picks.filter((p) => p.order === s.order).length });
      got++;
    }
    return got;
  };

  for (const s of streams) take(s, s.slot.count);
  const total = slots.reduce((t, s) => t + s.count, 0);
  // Top up a short kind from the others, one at a time, so the set stays balanced.
  let progress = true;
  while (picks.length < total && progress) {
    progress = false;
    for (const s of streams) {
      if (picks.length >= total) break;
      if (take(s, 1)) progress = true;
    }
  }

  return picks.sort((a, b) => a.item.difficulty - b.item.difficulty || a.rank - b.rank || a.order - b.order).map((p) => p.item);
}

export interface WeeklySummary {
  total: number;
  /** Full credit. */
  right: number;
  /** Partial credit, such as a mix within about one step. */
  partial: number;
  missed: number;
  /** Mean score, 0 to 1. Partial answers count for their partial credit. */
  accuracy: number;
  /** No earlier week to compare with. */
  first: boolean;
  /** Better than every earlier week. */
  personalBest: boolean;
  previousBest?: number;
  previousAverage?: number;
}

/** Sums up a week's scores and compares its accuracy with earlier weeks' accuracies. */
export function weeklySummary(scores: readonly number[], previous: readonly number[] = []): WeeklySummary {
  const clamped = scores.map((s) => Math.max(0, Math.min(1, s)));
  const right = clamped.filter((s) => s >= 1).length;
  const missed = clamped.filter((s) => s <= 0).length;
  const accuracy = clamped.length ? clamped.reduce((t, s) => t + s, 0) / clamped.length : 0;
  const first = previous.length === 0;
  const previousBest = first ? undefined : Math.max(...previous);
  const previousAverage = first ? undefined : previous.reduce((t, s) => t + s, 0) / previous.length;
  return {
    total: clamped.length,
    right,
    partial: clamped.length - right - missed,
    missed,
    accuracy,
    first,
    personalBest: previousBest !== undefined && accuracy > previousBest + 1e-9,
    previousBest,
    previousAverage,
  };
}

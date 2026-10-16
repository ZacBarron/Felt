import { createEmptyCard, fsrs, type Grade, State } from 'ts-fsrs';
import type { FsrsCard } from './srs';

/**
 * How a player's memory is doing, read from the review scheduler only.
 * Nothing here is estimated beyond what FSRS itself stores: due dates,
 * and stability replayed from the grades it gave.
 */

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

/** The same day `n` days after `d`, at local midnight. Safe across daylight saving changes. */
function addDays(d: Date, n: number): Date {
  const s = startOfDay(d);
  s.setDate(s.getDate() + n);
  return s;
}

/**
 * Cards due on each of the next `days` days, today first. Cards already
 * overdue count toward today, as they are waiting now.
 */
export function dueForecast(dues: readonly Date[], now: Date, days = 7): number[] {
  const out = new Array<number>(days).fill(0);
  const ends = Array.from({ length: days }, (_, i) => addDays(now, i + 1).getTime());
  for (const due of dues) {
    const t = due.getTime();
    const i = ends.findIndex((end) => t < end);
    if (i >= 0) out[i]++;
  }
  return out;
}

export interface Comeback {
  /** Due again before the end of today. */
  today: number;
  tomorrow: number;
  /** Due in 2 to 6 days. */
  week: number;
  /** Due in 7 days or more. */
  later: number;
}

/** Sorts cards by when they come back, for the end of a review session. */
export function comebackGroups(dues: readonly Date[], now: Date): Comeback {
  const out: Comeback = { today: 0, tomorrow: 0, week: 0, later: 0 };
  const tomorrow = addDays(now, 1).getTime();
  const dayAfter = addDays(now, 2).getTime();
  const week = addDays(now, 7).getTime();
  for (const due of dues) {
    const t = due.getTime();
    if (t < tomorrow) out.today++;
    else if (t < dayAfter) out.tomorrow++;
    else if (t < week) out.week++;
    else out.later++;
  }
  return out;
}

/** One stored review: which card, when, and the FSRS grade it got (1 Again to 4 Easy). */
export interface MemoryReview {
  cardId: string;
  at: Date;
  grade: number;
}

/**
 * How many cards were solid at the end of each of the last `days` days,
 * oldest first, ending today. Solid has the meaning of `cardStrength`: in
 * long term review and expected to hold for at least `solidDays` days.
 *
 * Each card's stored grades are replayed through FSRS with the scheduler's
 * own settings. Fuzz only moves due dates, never stability, so the replay
 * gives the same strength the scheduler stored at the time.
 */
export function solidHistory(reviews: readonly MemoryReview[], now: Date, days = 30, solidDays = 7, requestRetention = 0.9): number[] {
  const scheduler = fsrs({ request_retention: requestRetention, enable_fuzz: false });
  const ends = Array.from({ length: days }, (_, i) => addDays(now, i + 2 - days).getTime());
  const counts = new Array<number>(days).fill(0);
  const byCard = new Map<string, MemoryReview[]>();
  for (const r of reviews) {
    const list = byCard.get(r.cardId);
    if (list) list.push(r);
    else byCard.set(r.cardId, [r]);
  }
  for (const list of byCard.values()) {
    list.sort((a, b) => a.at.getTime() - b.at.getTime());
    let card: FsrsCard = createEmptyCard(list[0].at);
    let next = 0;
    for (let d = 0; d < days; d++) {
      while (next < list.length && list[next].at.getTime() < ends[d]) {
        const grade = Math.min(4, Math.max(1, Math.round(list[next].grade))) as Grade;
        card = scheduler.next(card, list[next].at, grade).card;
        next++;
      }
      if (card.state === State.Review && card.stability >= solidDays) counts[d]++;
    }
  }
  return counts;
}

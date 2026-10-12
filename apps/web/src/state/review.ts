import { type Chart, createScheduler, deckForCharts, type DrillOutcome, selectQueue, studyStreak } from '@felt/core';
import { db, type StoredCard } from './db';

const scheduler = createScheduler();

/** Cards due again within this window come back later in the same session. */
export const RELEARN_WINDOW_MS = 15 * 60 * 1000;

export interface QueueItem {
  id: string;
  chartId: string;
  mode: 'quick' | 'paint';
  hand?: string;
  targetMs: number;
  isNew: boolean;
}

export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

const toItem = (c: Omit<StoredCard, 'fsrs' | 'due' | 'createdAt'>, isNew: boolean): QueueItem => ({
  id: c.id,
  chartId: c.chartId,
  mode: c.mode,
  hand: c.hand,
  targetMs: c.targetMs,
  isNew,
});

/** Today's queue for the charts that match the current game settings. */
export async function buildQueue(charts: readonly Chart[], newPerDay: number, now = new Date()) {
  const chartIds = new Set(charts.map((c) => c.spec.id));
  const known = (await db.cards.toArray()).filter((c) => chartIds.has(c.chartId));
  const newIntroducedToday = (await db.cards.where('createdAt').aboveOrEqual(startOfToday(now)).toArray()).filter((c) =>
    chartIds.has(c.chartId),
  ).length;
  const { due, fresh } = selectQueue(known, deckForCharts(charts), { now, newPerDay, newIntroducedToday });
  return {
    due: due.map((c) => toItem(c, false)),
    fresh: fresh.map((s) => toItem(s, true)),
  };
}

/** Schedules the card with FSRS and logs the review. Returns the next due date. */
export async function recordAnswer(item: QueueItem, outcome: DrillOutcome, now = new Date()): Promise<Date> {
  const existing = await db.cards.get(item.id);
  const { card, log } = scheduler.review(existing?.fsrs ?? scheduler.newCard(now), outcome, now);
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put({
      id: item.id,
      chartId: item.chartId,
      mode: item.mode,
      hand: item.hand,
      targetMs: item.targetMs,
      fsrs: card,
      due: card.due,
      createdAt: existing?.createdAt ?? now,
    });
    await db.reviews.add({
      cardId: item.id,
      chartId: item.chartId,
      at: now,
      accuracy: outcome.accuracy,
      responseMs: outcome.responseMs,
      grade: log.rating,
    });
  });
  return card.due;
}

export interface TodayStats {
  dueNow: number;
  newAvailable: number;
  reviewedToday: number;
  accuracyToday: number | null;
  avgSecondsToday: number | null;
  streak: number;
  totalCardsStarted: number;
}

export async function todayStats(charts: readonly Chart[], newPerDay: number, now = new Date()): Promise<TodayStats> {
  const { due, fresh } = await buildQueue(charts, newPerDay, now);
  const today = await db.reviews.where('at').aboveOrEqual(startOfToday(now)).toArray();
  const allDates = (await db.reviews.orderBy('at').keys()) as Date[];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const quick = today.filter((r) => r.cardId.startsWith('recall:'));
  return {
    dueNow: due.length,
    newAvailable: fresh.length,
    reviewedToday: today.length,
    accuracyToday: avg(today.map((r) => r.accuracy)),
    avgSecondsToday: quick.length ? avg(quick.map((r) => r.responseMs / 1000)) : null,
    streak: studyStreak(allDates, now),
    totalCardsStarted: await db.cards.count(),
  };
}

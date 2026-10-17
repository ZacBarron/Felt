import {
  boundaryHands,
  chartItemDifficulty,
  DIFFICULTY,
  cardStrength,
  type CardStrength,
  type Chart,
  createScheduler,
  dayKey,
  mixedDeck,
  type DrillOutcome,
  RECALL_TARGET_MS,
  selectExtra,
  selectQueue,
  studyStreak,
} from '@felt/core';
import { db, type StoredCard } from './db';
import { getChart } from './charts';
import { entryFor } from './lessons';
import { recordLessonQuiz, recordRated } from './rating';
import { SAVED_TARGET_MS, savedCardId } from './saved';

/** chartId used by review cards made from saved items. */
export const SAVED_CHART = 'saved';

const scheduler = createScheduler();

/** Cards due again within this window come back later in the same session. */
export const RELEARN_WINDOW_MS = 15 * 60 * 1000;

/**
 * Puts chart hands at the front of the review queue: new recall cards for
 * hands not yet in the deck, and existing cards made due now.
 */
export async function addHandsToReview(items: readonly { chartId: string; hand: string }[], now = new Date()) {
  for (const { chartId, hand } of items) {
    const id = `recall:${chartId}:${hand}`;
    if (await db.cards.get(id)) await db.cards.update(id, { due: now });
    else await db.cards.put({ id, chartId, mode: 'quick', hand, targetMs: RECALL_TARGET_MS, fsrs: scheduler.newCard(now), due: now, createdAt: now });
  }
}

export interface QueueItem {
  id: string;
  chartId: string;
  mode: 'quick' | 'paint' | 'saved' | 'quiz' | 'math';
  hand?: string;
  savedId?: string;
  lessonKey?: string;
  step?: number;
  factId?: string;
  targetMs: number;
  isNew: boolean;
}

export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const toItem = (c: Omit<StoredCard, 'fsrs' | 'due' | 'createdAt'>, isNew: boolean): QueueItem => ({
  id: c.id,
  chartId: c.chartId,
  mode: c.mode,
  hand: c.hand,
  savedId: c.savedId,
  lessonKey: c.lessonKey,
  step: c.step,
  factId: c.factId,
  targetMs: c.targetMs,
  isNew,
});

/**
 * Extra practice beyond today's due cards: soonest due and new cards mixed,
 * skipping anything answered this session. Review never runs dry.
 */
export async function buildExtra(charts: readonly Chart[], n: number, exclude: ReadonlySet<string>): Promise<QueueItem[]> {
  const chartIds = new Set(charts.map((c) => c.spec.id));
  const known = (await db.cards.toArray()).filter((c) => chartIds.has(c.chartId));
  return selectExtra(known, mixedDeck(charts, { known: new Set(known.map((c) => c.id)) }), { n, exclude }).map((c) => toItem(c, !('fsrs' in c)));
}

/** Today's queue for the charts that match the current game settings. */
export async function buildQueue(charts: readonly Chart[], newPerDay: number, now = new Date()) {
  const chartIds = new Set(charts.map((c) => c.spec.id));
  const known = (await db.cards.toArray()).filter((c) => chartIds.has(c.chartId));
  const newIntroducedToday = (await db.cards.where('createdAt').aboveOrEqual(startOfToday(now)).toArray()).filter((c) =>
    chartIds.has(c.chartId),
  ).length;
  const { due, fresh } = selectQueue(known, mixedDeck(charts, { known: new Set(known.map((c) => c.id)) }), { now, newPerDay, newIntroducedToday });
  const saved = await savedQueue(now);
  return {
    due: [...due.map((c) => toItem(c, false)), ...saved.due],
    // Saves were chosen by the player, so they skip the new card limit and come first.
    fresh: [...saved.fresh, ...fresh.map((s) => toItem(s, true))],
  };
}

/** Every saved item, due or not, for a saved only session. Reviewing early is fine with FSRS. */
export async function buildSavedDeck(): Promise<QueueItem[]> {
  const items = await db.saved.orderBy('createdAt').toArray();
  const cards = new Set((await db.cards.where('chartId').equals(SAVED_CHART).primaryKeys()) as string[]);
  return items.map((item) => {
    const id = savedCardId(item.id);
    return { id, chartId: SAVED_CHART, mode: 'saved', savedId: item.id, targetMs: SAVED_TARGET_MS, isNew: !cards.has(id) };
  });
}

/** Saved items: cards that are due, and saves that have no card yet. */
export async function savedQueue(now: Date) {
  const items = await db.saved.toArray();
  const cards = new Map((await db.cards.where('chartId').equals(SAVED_CHART).toArray()).map((c) => [c.id, c]));
  const due: QueueItem[] = [];
  const fresh: QueueItem[] = [];
  for (const item of items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const id = savedCardId(item.id);
    const card = cards.get(id);
    const q: QueueItem = { id, chartId: SAVED_CHART, mode: 'saved', savedId: item.id, targetMs: SAVED_TARGET_MS, isNew: !card };
    if (!card) fresh.push(q);
    else if (card.due <= now) due.push(q);
  }
  return { due, fresh };
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
      savedId: item.savedId,
      lessonKey: item.lessonKey,
      step: item.step,
      factId: item.factId,
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
  await rateReview(item, outcome.accuracy, now);
  return card.due;
}

/** Objective review answers also count toward the Aced Rating. */
async function rateReview(item: QueueItem, score: number, at: Date) {
  if (item.mode === 'quiz') {
    if (item.lessonKey !== undefined && item.step !== undefined) await recordLessonQuiz(item.lessonKey, item.step, score >= 1, 'review');
    return;
  }
  if (item.mode === 'math') {
    await recordRated({ itemId: item.id, domain: 'math', difficulty: DIFFICULTY.mathFact, score, source: 'review' }, at);
    return;
  }
  if (item.mode === 'saved') {
    const saved = item.savedId ? await db.saved.get(item.savedId) : undefined;
    if (saved?.kind === 'solver-spot') {
      await recordRated({ itemId: `solver:${saved.id}`, domain: 'postflop', difficulty: DIFFICULTY.solverSpot, score, source: 'review' }, at);
    } else if (saved?.lessonKey !== undefined && saved.step !== undefined) {
      // Only quizzes are graded objectively; self graded flashcards do not move the rating.
      const isQuiz = entryFor(saved.lessonKey)?.content?.steps[saved.step]?.kind === 'quiz';
      if (isQuiz) await recordLessonQuiz(saved.lessonKey, saved.step, score >= 1, 'review');
    }
    return;
  }
  const chart = getChart(item.chartId);
  if (!chart) return;
  const difficulty =
    item.mode === 'paint'
      ? DIFFICULTY.chartPaint
      : chartItemDifficulty(chart.mixes.get(item.hand ?? '') ?? { fold: 1 }, [...chart.spec.actions.map((a) => a.id), 'fold']);
  if (difficulty === undefined || chart.spec.basis !== 'gto') return;
  await recordRated({ itemId: item.id, domain: 'preflop', difficulty, score, source: 'review' }, at);
}

export interface TodayStats {
  dueNow: number;
  newAvailable: number;
  reviewedToday: number;
  accuracyToday: number | null;
  avgSecondsToday: number | null;
  streak: number;
  totalCardsStarted: number;
  /** The last seven days, oldest first, ending today. */
  week: { label: string; done: boolean; today: boolean }[];
}

function lastSevenDays(studyDates: readonly Date[], now: Date) {
  const studied = new Set(studyDates.map(dayKey));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), done: studied.has(dayKey(d)), today: i === 6 };
  });
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
    week: lastSevenDays(allDates, now),
    totalCardsStarted: await db.cards.count(),
  };
}

export interface ChartMastery {
  chart: Chart;
  /** Strength of each edge hand's recall card. */
  hands: Map<string, CardStrength>;
  total: number;
  solid: number;
  learning: number;
}

/** How far along each chart is, in deck order, from the cards stored so far. */
export async function masteryForCharts(charts: readonly Chart[]): Promise<ChartMastery[]> {
  const ids = new Set(charts.map((c) => c.spec.id));
  const stored = new Map((await db.cards.toArray()).filter((c) => ids.has(c.chartId)).map((c) => [c.id, c]));
  return charts.map((chart) => {
    const hands = new Map<string, CardStrength>();
    for (const hand of boundaryHands(chart)) {
      hands.set(hand, cardStrength(stored.get(`recall:${chart.spec.id}:${hand}`)?.fsrs));
    }
    const values = [...hands.values()];
    return {
      chart,
      hands,
      total: values.length,
      solid: values.filter((v) => v === 'solid').length,
      learning: values.filter((v) => v === 'learning').length,
    };
  });
}

import { type Chart, deckForCharts, MATH_FACTS, State } from '@felt/core';
import { db, type StoredCard } from './db';
import { isComplete, LESSON_ENTRIES, lessonProgress } from './lessons';
import { type QueueItem, SAVED_CHART, savedQueue, startOfToday, toItem } from './review';
import type { StudySettings } from './settings';

/**
 * Review decks, like Anki's: each has its own cards, its own new card limit
 * and can be switched off. A session draws from the decks that are on.
 */
export type DeckId = 'charts' | 'lessons' | 'math' | 'saved';

export const DECKS: { id: DeckId; title: string; note: string }[] = [
  { id: 'charts', title: 'Preflop charts', note: 'Edge hands for your game' },
  { id: 'lessons', title: 'Lesson questions', note: 'From lessons you finished' },
  { id: 'math', title: 'Math facts', note: 'Pot odds, outs and combos' },
  { id: 'saved', title: 'Saved', note: 'Your saved lessons and spots' },
];

/** chartId stored on cards of the non chart decks. */
export const LESSON_DECK = 'lessons';
export const MATH_DECK = 'math';

const DEFAULT_NEW: Record<DeckId, number> = { charts: 15, lessons: 5, math: 5, saved: 999 };

export interface DeckPref {
  on: boolean;
  newPerDay: number;
}

export function deckPrefs(study: StudySettings): Record<DeckId, DeckPref> {
  const d = study.decks ?? {};
  const pref = (id: DeckId): DeckPref => ({
    on: d[id]?.on ?? true,
    newPerDay: id === 'charts' ? study.newPerDay : (d[id]?.newPerDay ?? DEFAULT_NEW[id]),
  });
  return { charts: pref('charts'), lessons: pref('lessons'), math: pref('math'), saved: pref('saved') };
}

const QUIZ_TARGET_MS = 12_000;
const MATH_TARGET_MS = 8_000;

/** Which deck a stored card belongs to. */
export function deckOf(card: Pick<StoredCard, 'chartId' | 'mode'>): DeckId {
  if (card.chartId === SAVED_CHART || card.mode === 'saved') return 'saved';
  if (card.mode === 'quiz') return 'lessons';
  if (card.mode === 'math') return 'math';
  return 'charts';
}

/**
 * Review strengthens what was taught, so a deck starts dealing new cards only
 * after the lesson that introduces it. Someone brand new is never quizzed on
 * a range chart before they know what one is. A passed lesson counts too, so
 * placement unlocks these at once for players who already know them.
 */
const CHART_INTRO = 'basics/first-strategy/starting-hands';
const MATH_INTRO = 'basics/first-strategy/odds';

export function chartsTaught(progress: ReadonlyMap<string, Parameters<typeof isComplete>[0]>): boolean {
  return isComplete(progress.get(CHART_INTRO)) || [...progress].some(([key, l]) => key.startsWith('preflop/') && isComplete(l));
}

export function mathTaught(progress: ReadonlyMap<string, Parameters<typeof isComplete>[0]>): boolean {
  return isComplete(progress.get(MATH_INTRO)) || [...progress].some(([key, l]) => key.startsWith('foundations/math/') && isComplete(l));
}

/** Every card a deck could hold, in the order new ones are introduced. */
async function seedsFor(deck: DeckId, charts: readonly Chart[]): Promise<QueueItem[]> {
  if (deck === 'charts') return chartsTaught(await lessonProgress()) ? deckForCharts(charts).map((s) => toItem(s, true)) : [];
  if (deck === 'math') {
    if (!mathTaught(await lessonProgress())) return [];
    return MATH_FACTS.map((f) => ({ id: f.id, chartId: MATH_DECK, mode: 'math', factId: f.id, targetMs: MATH_TARGET_MS, isNew: true }));
  }
  if (deck === 'lessons') {
    // Only lessons already read or passed: review strengthens what was taught.
    const progress = await lessonProgress();
    return LESSON_ENTRIES.filter((e) => e.content && isComplete(progress.get(e.key))).flatMap((e) =>
      e.content!.steps.flatMap((step, i) =>
        step.kind === 'quiz'
          ? [{ id: `lq:${e.key}#${i}`, chartId: LESSON_DECK, mode: 'quiz' as const, lessonKey: e.key, step: i, targetMs: QUIZ_TARGET_MS, isNew: true }]
          : [],
      ),
    );
  }
  return [];
}

async function knownFor(deck: DeckId, charts: readonly Chart[]): Promise<StoredCard[]> {
  const all = await db.cards.toArray();
  if (deck === 'charts') {
    const ids = new Set(charts.map((c) => c.spec.id));
    return all.filter((c) => deckOf(c) === 'charts' && ids.has(c.chartId));
  }
  return all.filter((c) => deckOf(c) === deck);
}

export interface DeckCount {
  deck: DeckId;
  /** New cards available today, after the deck's daily limit. */
  fresh: number;
  /** Due cards still in their first steps or relearning after a miss. */
  learning: number;
  /** Due cards in long term review. */
  due: number;
  /** Cards in the deck so far. */
  total: number;
}

interface DeckQueue {
  deck: DeckId;
  due: QueueItem[];
  fresh: QueueItem[];
  known: StoredCard[];
  seeds: QueueItem[];
  learning: number;
}

async function deckQueue(deck: DeckId, charts: readonly Chart[], pref: DeckPref, now: Date): Promise<DeckQueue> {
  if (deck === 'saved') {
    const s = await savedQueue(now);
    const known = (await db.cards.where('chartId').equals(SAVED_CHART).toArray()) as StoredCard[];
    return { deck, due: s.due, fresh: s.fresh, known, seeds: s.fresh, learning: 0 };
  }
  const [known, seeds] = await Promise.all([knownFor(deck, charts), seedsFor(deck, charts)]);
  const knownIds = new Set(known.map((c) => c.id));
  const dueCards = known.filter((c) => c.due <= now).sort((a, b) => a.due.getTime() - b.due.getTime());
  const introducedToday = known.filter((c) => c.createdAt >= startOfToday(now)).length;
  const budget = Math.max(0, pref.newPerDay - introducedToday);
  const fresh = seeds.filter((s) => !knownIds.has(s.id)).slice(0, budget);
  const learning = dueCards.filter((c) => c.fsrs.state === State.Learning || c.fsrs.state === State.Relearning).length;
  return { deck, due: dueCards.map((c) => toItem(c, false)), fresh, known, seeds, learning };
}

/** New, learning and due counts for every deck, for the review overview. */
export async function deckCounts(charts: readonly Chart[], study: StudySettings, now = new Date()): Promise<DeckCount[]> {
  const prefs = deckPrefs(study);
  return Promise.all(
    DECKS.map(async ({ id }) => {
      const q = await deckQueue(id, charts, prefs[id], now);
      return { deck: id, fresh: q.fresh.length, learning: q.learning, due: q.due.length - q.learning, total: q.known.length };
    }),
  );
}

/** Round robin across piles, so one deck never crowds out the rest. */
function interleave<T>(piles: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...piles.map((p) => p.length));
  for (let i = 0; i < max; i++) for (const p of piles) if (i < p.length) out.push(p[i]);
  return out;
}

export type SessionKind = 'today' | 'extra' | 'ahead' | 'weak' | 'missed';

export interface SessionConfig {
  kind: SessionKind;
  /** Decks to draw from; defaults to every deck that is on. */
  decks?: DeckId[];
  /** Cards in the session; 0 or missing means no limit. */
  limit?: number;
}

/**
 * Builds a review session.
 * - today: due cards (oldest due first), then new cards mixed across decks.
 * - extra: the cards closest to slipping, mixed with new ones. Never runs dry.
 * - ahead: cards due in the next three days, earliest first.
 * - weak: cards you have missed most, then the least stable.
 * - missed: cards you got wrong today.
 */
export async function buildSession(
  charts: readonly Chart[],
  study: StudySettings,
  config: SessionConfig,
  exclude: ReadonlySet<string> = new Set(),
  now = new Date(),
): Promise<QueueItem[]> {
  const prefs = deckPrefs(study);
  const decks = config.decks ?? DECKS.map((d) => d.id).filter((id) => prefs[id].on);
  const queues = await Promise.all(decks.map((id) => deckQueue(id, charts, prefs[id], now)));
  const limit = config.limit && config.limit > 0 ? config.limit : Infinity;
  const take = (items: QueueItem[]) => items.filter((i) => !exclude.has(i.id)).slice(0, limit === Infinity ? undefined : limit);

  if (config.kind === 'today') {
    const dueAt = new Map(queues.flatMap((q) => q.known.map((c) => [c.id, c.due.getTime()] as const)));
    const due = queues.flatMap((q) => q.due).sort((a, b) => (dueAt.get(a.id) ?? 0) - (dueAt.get(b.id) ?? 0));
    return take([...due, ...interleave(queues.map((q) => q.fresh))]);
  }

  const known = queues.flatMap((q) => q.known.map((c) => ({ card: c, deck: q.deck })));
  if (config.kind === 'ahead') {
    const horizon = now.getTime() + 3 * 24 * 3600 * 1000;
    return take(
      known
        .filter(({ card }) => card.due > now && card.due.getTime() <= horizon)
        .sort((a, b) => a.card.due.getTime() - b.card.due.getTime())
        .map(({ card }) => toItem(card, false)),
    );
  }
  if (config.kind === 'weak') {
    return take(
      known
        .filter(({ card }) => card.fsrs.reps > 0)
        .sort((a, b) => b.card.fsrs.lapses - a.card.fsrs.lapses || a.card.fsrs.stability - b.card.fsrs.stability)
        .slice(0, 30)
        .map(({ card }) => toItem(card, false)),
    );
  }
  if (config.kind === 'missed') {
    const today = await db.reviews.where('at').aboveOrEqual(startOfToday(now)).toArray();
    const missed = new Set(today.filter((r) => r.accuracy < 1).map((r) => r.cardId));
    return take(known.filter(({ card }) => missed.has(card.id)).map(({ card }) => toItem(card, false)));
  }

  // Extra practice: per deck, two known cards closest to due for every new one, then mixed across decks.
  const n = limit === Infinity ? 20 : limit;
  const piles = queues.map((q) => {
    const soon = q.known.filter((c) => !exclude.has(c.id)).sort((a, b) => a.due.getTime() - b.due.getTime());
    const knownIds = new Set(q.known.map((c) => c.id));
    const unseen = q.seeds.filter((s) => !knownIds.has(s.id) && !exclude.has(s.id));
    const out: QueueItem[] = [];
    let k = 0;
    let u = 0;
    while (out.length < n && (k < soon.length || u < unseen.length)) {
      const wantNew = out.length % 3 === 2;
      if ((wantNew && u < unseen.length) || k >= soon.length) out.push(unseen[u++]);
      else out.push(toItem(soon[k++], false));
    }
    return out;
  });
  return interleave(piles).slice(0, n);
}

/** Due plus new cards today across the decks that are on, for badges and the Today screen. */
export async function reviewTotal(charts: readonly Chart[], study: StudySettings, now = new Date()): Promise<number> {
  const counts = await deckCounts(charts, study, now);
  const prefs = deckPrefs(study);
  return counts.filter((c) => prefs[c.deck].on).reduce((t, c) => t + c.fresh + c.learning + c.due, 0);
}


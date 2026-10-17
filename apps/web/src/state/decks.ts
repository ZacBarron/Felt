import { STARTER_CHARTS } from '@felt/content';
import { type Chart, growDeck, MATH_FACTS, mixedDeck, spreadOrder, State } from '@felt/core';
import { getChart } from './charts';
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
  { id: 'charts', title: 'Preflop charts', note: 'Close calls for your game' },
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

/** Cards in long term review it takes to add one more chart to the review deck. */
export const CARDS_PER_NEW_CHART = 30;

/** Hand written charts at the deck's table size that are not review charts yet, mixed across spot types. */
function extraCharts(charts: readonly Chart[]): Chart[] {
  const first = charts[0]?.spec;
  if (!first) return [];
  const ids = new Set(charts.map((c) => c.spec.id));
  const rest = STARTER_CHARTS.filter((s) => s.tableSize === first.tableSize && s.game === first.game && !ids.has(s.id)).map((s) => getChart(s.id)!);
  const bySpot = new Map<string, Chart[]>();
  for (const c of rest) bySpot.set(c.spec.spot, [...(bySpot.get(c.spec.spot) ?? []), c]);
  const lists = [...bySpot.values()];
  const out: Chart[] = [];
  for (let i = 0; out.length < rest.length; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

/**
 * The charts in the review deck: the review charts for the game, plus more
 * hand written charts as the deck matures (one per CARDS_PER_NEW_CHART cards
 * in long term review). A chart that has cards always stays, so saved cards
 * keep their place.
 */
export async function reviewCharts(charts: readonly Chart[]): Promise<Chart[]> {
  const cards = (await db.cards.toArray()).filter((c) => deckOf(c) === 'charts');
  const started = new Set(cards.map((c) => c.chartId));
  const mature = cards.filter((c) => c.fsrs.state === State.Review && charts.some((ch) => ch.spec.id === c.chartId)).length;
  return growDeck(charts, extraCharts(charts), { mature, started, perChart: CARDS_PER_NEW_CHART });
}

/** Every card a deck could hold, in the order new ones are introduced. */
async function seedsFor(deck: DeckId, charts: readonly Chart[], known: readonly StoredCard[] = []): Promise<QueueItem[]> {
  if (deck === 'charts') {
    if (!chartsTaught(await lessonProgress())) return [];
    // A few charts at a time from different spot types, mixed together.
    return mixedDeck(charts, { known: new Set(known.map((c) => c.id)) }).map((s) => toItem(s, true));
  }
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
  const deckCharts = deck === 'charts' ? await reviewCharts(charts) : charts;
  const known = await knownFor(deck, deckCharts);
  const seeds = await seedsFor(deck, deckCharts, known);
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
    // Mixed together: neighbours come from different charts and spot types where the due order allows.
    return take(spreadOrder([...due, ...interleave(queues.map((q) => q.fresh))], itemFacets));
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
  return spreadOrder(interleave(piles), itemFacets).slice(0, n);
}

/** What a queue item is about, so a session can keep neighbours apart. */
export function itemFacets(item: QueueItem): string[] {
  if (item.mode === 'quick' || item.mode === 'paint') {
    const spec = getChart(item.chartId)?.spec;
    return [`chart:${item.chartId}`, `spot:${spec?.spot ?? ''}`, `seat:${spec?.hero ?? ''}`];
  }
  if (item.mode === 'quiz') return [`lesson:${item.lessonKey}`, `module:${item.lessonKey?.split('/').slice(0, 2).join('/')}`];
  return [`deck:${item.mode}`];
}

/** Due plus new cards today across the decks that are on, for badges and the Today screen. */
export async function reviewTotal(charts: readonly Chart[], study: StudySettings, now = new Date()): Promise<number> {
  const counts = await deckCounts(charts, study, now);
  const prefs = deckPrefs(study);
  return counts.filter((c) => prefs[c.deck].on).reduce((t, c) => t + c.fresh + c.learning + c.due, 0);
}


import { CURRICULUM, LESSON_CONTENT, type LessonContent, lessonKey, quizVersion, quizVersions, type QuizStep, SUIT_ORDERS, variantSeed } from '@felt/content';
import { markSeen, recentKeys, versionKey } from './seen';
import { db, type StoredLesson } from './db';

export interface LessonEntry {
  key: string;
  trackId: string;
  trackTitle: string;
  moduleTitle: string;
  title: string;
  content?: LessonContent;
}

/** Every curriculum lesson in order, with its content when it has been written. */
export const LESSON_ENTRIES: LessonEntry[] = CURRICULUM.flatMap((t) =>
  t.modules.flatMap((m) =>
    m.lessons.map((l) => {
      const key = lessonKey(t.id, m.id, l.id);
      return { key, trackId: t.id, trackTitle: t.title, moduleTitle: m.title, title: l.title, content: LESSON_CONTENT.get(key) };
    }),
  ),
);

export const lessonPath = (key: string) => `/learn/${key}`;

export function entryFor(key: string): LessonEntry | undefined {
  return LESSON_ENTRIES.find((e) => e.key === key);
}

/** The next playable lesson after `key`, in curriculum order. */
export function nextLesson(key: string): LessonEntry | undefined {
  const i = LESSON_ENTRIES.findIndex((e) => e.key === key);
  return LESSON_ENTRIES.slice(i + 1).find((e) => e.content);
}

/** Finished by reading it or by testing out of it. */
export const isComplete = (l?: StoredLesson) => l?.status === 'done' || l?.status === 'tested';

/** Lessons in a module, in order. */
export function moduleEntries(trackId: string, moduleId: string): LessonEntry[] {
  return LESSON_ENTRIES.filter((e) => e.key.startsWith(`${trackId}/${moduleId}/`));
}

/** Quiz step indices of a lesson, for test outs. */
export function quizSteps(entry: LessonEntry): number[] {
  return (entry.content?.steps ?? []).flatMap((s, i) => (s.kind === 'quiz' ? [i] : []));
}

/**
 * The lesson question at `step` in the version `seed` picks, or undefined
 * when that step is not a question any more. Seed 0 is the question as written.
 */
export function quizAt(key: string, step: number, seed: number): QuizStep | undefined {
  const s = entryFor(key)?.content?.steps[step];
  return s?.kind === 'quiz' ? quizVersion(s, seed) : undefined;
}

/** A fresh seed, so each visit can show another version of a question. */
export const freshSeed = () => Math.floor(Math.random() * 0x7fffffff) + 1;

/**
 * A seed for a lesson question that shows a version other than the ones
 * shown lately on this device, when the question has more than one. With n
 * versions, the last n - 1 shown wait, so a replay or a skip ahead quiz
 * walks through every version before any comes back. Suits are dealt fresh
 * each time when the question allows it. The version shown is remembered.
 */
export function dealQuizSeed(key: string, step: number, rand: () => number = Math.random): number {
  const s = entryFor(key)?.content?.steps[step];
  if (s?.kind !== 'quiz') return freshSeed();
  const n = quizVersions(s).length;
  const prefix = `v:${key}#${step}:`;
  const recent = new Set(recentKeys(prefix, Math.max(0, n - 1)).map((k) => Number(k.slice(prefix.length))));
  const open = Array.from({ length: n }, (_, i) => i).filter((i) => !recent.has(i));
  const pool = open.length ? open : Array.from({ length: n }, (_, i) => i);
  const version = pool[Math.floor(rand() * pool.length)];
  const suits = s.shuffleSuits ? Math.floor(rand() * SUIT_ORDERS.length) : 0;
  markSeen([versionKey(key, step, version)]);
  return version + n * suits;
}

/** The version a seed shows, as dealQuizSeed counts them. */
export function versionIndex(key: string, step: number, seed: number): number {
  const s = entryFor(key)?.content?.steps[step];
  if (s?.kind !== 'quiz') return 0;
  return (Math.abs(Math.trunc(seed)) || 0) % quizVersions(s).length;
}

/**
 * A seed shared by everyone who plays the same challenge: the daily challenge
 * by local day, the weekly Pro challenge by ISO week id.
 */
export const sharedSeed = (key: string, step: number, period: string) => variantSeed(key, step, period);

/** Marks lessons as tested out. Lessons already read stay done. */
export async function markTested(keys: readonly string[]) {
  await db.transaction('rw', db.lessons, async () => {
    for (const key of keys) {
      const existing = await db.lessons.get(key);
      if (existing?.status === 'done') continue;
      await db.lessons.put({ step: 0, correct: 0, answered: 0, ...existing, key, status: 'tested', updatedAt: new Date() });
    }
  });
}

export async function lessonProgress(): Promise<Map<string, StoredLesson>> {
  return new Map((await db.lessons.toArray()).map((l) => [l.key, l]));
}

export async function saveLesson(key: string, patch: Partial<Omit<StoredLesson, 'key'>>) {
  const existing = await db.lessons.get(key);
  const merged: StoredLesson = {
    key,
    status: existing?.status === 'done' ? 'done' : existing?.status === 'tested' ? 'tested' : 'started',
    step: 0,
    correct: 0,
    answered: 0,
    ...existing,
    ...patch,
    updatedAt: new Date(),
  };
  // Never move a finished lesson back to started, or the furthest step backwards.
  if (existing?.status === 'done') merged.status = 'done';
  else if (existing?.status === 'tested' && patch.status !== 'done') merged.status = 'tested';
  merged.step = Math.max(existing?.step ?? 0, patch.step ?? 0);
  await db.lessons.put(merged);
}

/** What shapes the order of a player's path. */
export interface PathPrefs {
  /** Module placement stopped at, as `track/module`. */
  placedAt?: string;
  /** Modules the player asked to focus on, as `track/module`. */
  focus?: readonly string[];
  /** Regular and pro players: the rules track goes to the end of the path instead of the start. */
  basicsLast?: boolean;
}

const moduleOf = (key: string) => key.split('/').slice(0, 2).join('/');

/**
 * The player's path: the lesson in progress, then the module placement put
 * them in, then their focus areas, then everything else in curriculum order.
 */
export function recommendedLessons(
  progress: Map<string, StoredLesson>,
  prefs: PathPrefs = {},
  canOpen: (key: string) => boolean = () => true,
): LessonEntry[] {
  const open = LESSON_ENTRIES.filter((e) => e.content && canOpen(e.key) && !isComplete(progress.get(e.key)));
  const started = open
    .filter((e) => progress.get(e.key)?.status === 'started')
    .sort((a, b) => progress.get(b.key)!.updatedAt.getTime() - progress.get(a.key)!.updatedAt.getTime());
  const placed = open.filter((e) => moduleOf(e.key) === prefs.placedAt);
  // Focus modules in the order given: the player's own picks first, then their goal's.
  const focus = (prefs.focus ?? []).flatMap((m) => open.filter((e) => moduleOf(e.key) === m));
  const rest = prefs.basicsLast ? [...open.filter((e) => !e.key.startsWith('basics/')), ...open.filter((e) => e.key.startsWith('basics/'))] : open;
  const seen = new Set<string>();
  return [...started, ...placed, ...focus, ...rest].filter((e) => !seen.has(e.key) && seen.add(e.key));
}

/** Continue the lesson in progress, else the next lesson on the path, else the first lesson. */
export function pickNextLesson(
  progress: Map<string, StoredLesson>,
  canOpen: (key: string) => boolean = () => true,
  prefs: PathPrefs = {},
): LessonEntry | undefined {
  return recommendedLessons(progress, prefs, canOpen)[0] ?? LESSON_ENTRIES.find((e) => e.content && canOpen(e.key));
}

/**
 * Minutes studied today: review time as measured, plus each lesson finished
 * today at its listed length. Lessons tested out of do not count: no time was spent.
 */
export async function studyMinutesToday(now = new Date()): Promise<number> {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reviews = await db.reviews.where('at').aboveOrEqual(start).toArray();
  const lessons = await db.lessons.where('updatedAt').aboveOrEqual(start).toArray();
  const reviewMinutes = reviews.reduce((m, r) => m + r.responseMs, 0) / 60_000;
  const lessonMinutes = lessons.reduce(
    (m, l) => m + (l.status === 'done' ? (entryFor(l.key)?.content?.minutes ?? 0) : 0),
    0,
  );
  return reviewMinutes + lessonMinutes;
}

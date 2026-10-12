import { CURRICULUM, LESSON_CONTENT, type LessonContent, lessonKey } from '@felt/content';
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

export async function lessonProgress(): Promise<Map<string, StoredLesson>> {
  return new Map((await db.lessons.toArray()).map((l) => [l.key, l]));
}

export async function saveLesson(key: string, patch: Partial<Omit<StoredLesson, 'key'>>) {
  const existing = await db.lessons.get(key);
  const merged: StoredLesson = {
    key,
    status: existing?.status === 'done' ? 'done' : 'started',
    step: 0,
    correct: 0,
    answered: 0,
    ...existing,
    ...patch,
    updatedAt: new Date(),
  };
  // Never move a finished lesson back to started, or the furthest step backwards.
  if (existing?.status === 'done') merged.status = 'done';
  merged.step = Math.max(existing?.step ?? 0, patch.step ?? 0);
  await db.lessons.put(merged);
}

/** Continue the lesson in progress, else start the first unfinished one. */
export function pickNextLesson(progress: Map<string, StoredLesson>): LessonEntry | undefined {
  const playable = LESSON_ENTRIES.filter((e) => e.content);
  const inProgress = playable
    .filter((e) => progress.get(e.key)?.status === 'started')
    .sort((a, b) => progress.get(b.key)!.updatedAt.getTime() - progress.get(a.key)!.updatedAt.getTime())[0];
  return inProgress ?? playable.find((e) => progress.get(e.key)?.status !== 'done') ?? playable[0];
}

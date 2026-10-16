import { CURRICULUM, type ModuleIntro } from '@felt/content';
import type { StoredLesson } from './db';
import { isComplete, type LessonEntry, moduleEntries } from './lessons';

/**
 * Topic intros: the sheet that says why a topic matters, when it comes up
 * and what the player will be able to do. It shows once, the first time a
 * player opens a lesson in a topic they have not started. Seen topics are a
 * per device convenience, so they live in localStorage and never sync.
 */

export const MODULE_INTROS_KEY = 'felt.moduleIntros';

/** `track/module` for a lesson key `track/module/lesson`. */
export const moduleKeyOf = (lessonKey: string) => lessonKey.split('/').slice(0, 2).join('/');

export interface TopicInfo {
  key: string;
  trackTitle: string;
  title: string;
  intro: ModuleIntro;
}

export function topicInfo(moduleKey: string): TopicInfo | undefined {
  const [trackId, moduleId] = moduleKey.split('/');
  const track = CURRICULUM.find((t) => t.id === trackId);
  const m = track?.modules.find((x) => x.id === moduleId);
  return track && m ? { key: moduleKey, trackTitle: track.title, title: m.title, intro: m.intro } : undefined;
}

export function seenModuleIntros(): Set<string> {
  try {
    const raw = localStorage.getItem(MODULE_INTROS_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markModuleIntroSeen(moduleKey: string) {
  try {
    const seen = seenModuleIntros();
    if (seen.has(moduleKey)) return;
    seen.add(moduleKey);
    localStorage.setItem(MODULE_INTROS_KEY, JSON.stringify([...seen]));
  } catch {
    // Storage can be full or blocked. The intro may then show again, which is harmless.
  }
}

/** Whether the player has opened, finished or skipped any lesson in the topic. */
export function moduleStarted(moduleKey: string, progress: ReadonlyMap<string, StoredLesson>): boolean {
  for (const key of progress.keys()) if (moduleKeyOf(key) === moduleKey) return true;
  return false;
}

/** Show the intro before this lesson: its topic is untouched and its intro was never seen here. */
export function shouldShowModuleIntro(lessonKey: string, progress: ReadonlyMap<string, StoredLesson>): boolean {
  const moduleKey = moduleKeyOf(lessonKey);
  return !!topicInfo(moduleKey) && !moduleStarted(moduleKey, progress) && !seenModuleIntros().has(moduleKey);
}

export type TopicAction = 'start' | 'continue' | 'again' | 'locked';

/**
 * Where the sheet's button goes: the lesson asked for, else the lesson in
 * progress, else the first one not finished, else the first one again.
 */
export function topicTarget(
  moduleKey: string,
  progress: ReadonlyMap<string, StoredLesson>,
  canOpen: (key: string) => boolean,
  requested?: string,
): { entry: LessonEntry; action: TopicAction } | undefined {
  const [trackId, moduleId] = moduleKey.split('/');
  const lessons = moduleEntries(trackId, moduleId).filter((e) => e.content);
  const entry =
    lessons.find((e) => e.key === requested) ??
    lessons.find((e) => progress.get(e.key)?.status === 'started') ??
    lessons.find((e) => !isComplete(progress.get(e.key))) ??
    lessons[0];
  if (!entry) return undefined;
  const state = progress.get(entry.key);
  const action: TopicAction = !canOpen(entry.key)
    ? 'locked'
    : state?.status === 'started'
      ? 'continue'
      : isComplete(state)
        ? 'again'
        : 'start';
  return { entry, action };
}

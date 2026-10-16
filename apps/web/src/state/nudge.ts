import { canOpenLesson } from './access';
import type { StoredLesson } from './db';
import { pathPrefs } from './goals';
import { lessonProgress, pickNextLesson } from './lessons';
import { loadSettings } from './settings';

/** What the next lesson looks like to the daily reminder. */
export interface NextUp {
  title: string;
  minutes: number;
  /** Screens in the lesson, and the furthest one reached when it is half done. */
  steps: number;
  reached?: number;
}

/**
 * The daily reminder's line: the lesson that is actually waiting, in plain
 * words. A half finished lesson says where it stopped; otherwise it names
 * the next lesson and its length. No guilt, no countdown (VOICE.md).
 */
export function reminderLine(next: NextUp | undefined): string | undefined {
  if (!next) return undefined;
  if (next.reached && next.reached > 0 && next.reached < next.steps) return `${next.title} is waiting at step ${next.reached + 1} of ${next.steps}.`;
  return `${next.title} is next. It takes ${next.minutes} min.`;
}

/** The next lesson on this player's path, as the reminder should name it. */
export function nextUp(progress: Map<string, StoredLesson>, canOpen: (key: string) => boolean, prefs: Parameters<typeof pickNextLesson>[2]): NextUp | undefined {
  const entry = pickNextLesson(progress, canOpen, prefs);
  if (!entry?.content) return undefined;
  const saved = progress.get(entry.key);
  return { title: entry.title, minutes: entry.content.minutes, steps: entry.content.steps.length, reached: saved?.status === 'started' ? saved.step : undefined };
}

/** The reminder line for this device right now. */
export async function currentReminderLine(): Promise<string | undefined> {
  const settings = loadSettings();
  const progress = await lessonProgress();
  return reminderLine(nextUp(progress, (key) => canOpenLesson(key, settings.access), pathPrefs(settings.profile)));
}

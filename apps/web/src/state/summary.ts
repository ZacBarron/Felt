import { currentRating, isProvisional, replayRatings, streakWithFreezes, tierLabel, type RatingEvent } from '@felt/core';
import { type Backup, exportBackup, parseBackup } from './backup';
import type { StoredAnswer, StoredDaily, StoredLesson, StoredReview } from './db';

/**
 * What a copy of Felt's data holds, in the terms a player cares about: their
 * Felt Rating, lessons done and streak. Shown when signing in brings progress
 * back, and when the player has to choose between this device and the cloud.
 */
export interface ProgressSummary {
  /** Overall Felt Rating, once there is at least one graded answer. */
  rating?: number;
  /** "Still settling" or the tier name. */
  tier?: string;
  settled: boolean;
  answers: number;
  /** Lessons finished or skipped ahead. */
  lessonsDone: number;
  streak: number;
  /** The last day with any study. */
  lastStudied?: Date;
  /** Finished onboarding in this copy. */
  onboarded: boolean;
  name?: string;
}

const time = (d: unknown) => (d instanceof Date ? d.getTime() : typeof d === 'string' ? Date.parse(d) : NaN);

/** Summarizes a backup (the snapshot format sync uses). Item difficulties can be mapped, as the app does with fitted values. */
export function summarizeBackup(
  backup: Backup | string,
  { now = new Date(), difficulty = (_id: string, d: number) => d }: { now?: Date; difficulty?: (itemId: string, prior: number) => number } = {},
): ProgressSummary {
  const b = typeof backup === 'string' ? parseBackup(backup) : backup;
  const answers = (b.tables.answers ?? []) as StoredAnswer[];
  const lessons = (b.tables.lessons ?? []) as StoredLesson[];
  const reviews = (b.tables.reviews ?? []) as StoredReview[];
  const daily = (b.tables.daily ?? []) as StoredDaily[];

  const events: RatingEvent[] = answers
    .map((a) => ({ at: time(a.at), itemId: a.itemId, domain: a.domain, difficulty: difficulty(a.itemId, a.difficulty), score: a.score }))
    .filter((e) => Number.isFinite(e.at));
  const overall = currentRating(replayRatings(events).overall, now.getTime());

  const activity = [...reviews.map((r) => r.at), ...lessons.map((l) => l.updatedAt), ...answers.map((a) => a.at), ...daily.map((d) => d.at)]
    .map((d) => new Date(time(d)))
    .filter((d) => Number.isFinite(d.getTime()));
  const last = activity.length ? new Date(Math.max(...activity.map((d) => d.getTime()))) : undefined;
  const profile = (b.settings as { profile?: { onboarded?: boolean; name?: string } } | null)?.profile;

  return {
    rating: overall.games > 0 ? Math.round(overall.rating) : undefined,
    tier: overall.games > 0 ? tierLabel(overall) : undefined,
    settled: overall.games > 0 && !isProvisional(overall),
    answers: answers.length,
    lessonsDone: lessons.filter((l) => l.status === 'done' || l.status === 'tested').length,
    streak: streakWithFreezes(activity, now).streak,
    lastStudied: last,
    onboarded: !!profile?.onboarded,
    name: profile?.name?.trim() || undefined,
  };
}

/** True when a copy holds study a player would miss. */
export const hasProgress = (s: ProgressSummary) => s.answers + s.lessonsDone > 0 || !!s.lastStudied;

/** This device's progress. */
export async function summarizeDevice(options?: Parameters<typeof summarizeBackup>[1]): Promise<ProgressSummary> {
  return summarizeBackup(await exportBackup(), options);
}

import { DIFFICULTY, type RatingEvent, type RatingSnapshot, replayRatings, type SkillDomain, streakWithFreezes } from '@felt/core';
import { db, type StoredAnswer } from './db';
import { entryFor } from './lessons';
import { calibratedDifficulty } from './calibration';

/**
 * Records graded answers and turns them into the Suited Rating. Only objective
 * answers count: quizzes, chart decisions and solver decisions. Self graded
 * flashcards never move the rating.
 */

export const DOMAIN_LABELS: Record<SkillDomain, string> = {
  preflop: 'Preflop',
  postflop: 'Postflop',
  math: 'Math',
  exploit: 'Exploits',
  theory: 'Theory and mindset',
};

/** The skill a lesson trains. */
export function domainForLesson(key: string): SkillDomain {
  const [track, module] = key.split('/');
  if (track === 'foundations') return module === 'math' ? 'math' : 'theory';
  if (track === 'basics') return key.endsWith('/odds') || key.endsWith('/big-blinds') ? 'math' : 'theory';
  if (track === 'preflop' || track === 'postflop' || track === 'exploit') return track;
  if (track === 'tournaments' || track === 'results') return 'math';
  return 'theory';
}

export function lessonQuizDifficulty(key: string): number {
  return entryFor(key)?.content?.level === 'advanced' ? DIFFICULTY.lessonAdvanced : DIFFICULTY.lessonCore;
}

/** The same item answered again this soon is recall from the screen, not from memory: it does not count. */
const REPEAT_WINDOW_MS = 10 * 60 * 1000;

export async function recordRated(answer: Omit<StoredAnswer, 'id' | 'at'>, at = new Date()) {
  const recent = await db.answers.where('itemId').equals(answer.itemId).last();
  if (recent && at.getTime() - recent.at.getTime() < REPEAT_WINDOW_MS) return;
  await db.answers.add({ ...answer, at });
}

/** Quiz step `step` of lesson `key`, answered right or wrong. */
export function recordLessonQuiz(key: string, step: number, correct: boolean, source: StoredAnswer['source']) {
  return recordRated({
    itemId: `quiz:${key}#${step}`,
    domain: domainForLesson(key),
    difficulty: lessonQuizDifficulty(key),
    score: correct ? 1 : 0,
    source,
  });
}

export async function ratingSnapshot(): Promise<RatingSnapshot> {
  const answers = await db.answers.toArray();
  const events: RatingEvent[] = answers.map((a) => ({
    at: a.at.getTime(),
    itemId: a.itemId,
    domain: a.domain,
    difficulty: calibratedDifficulty(a.itemId, a.difficulty),
    score: a.score,
  }));
  return replayRatings(events);
}

/** Every day with any study: reviews, lessons, graded answers or a daily challenge. */
export async function activityDates(): Promise<Date[]> {
  const [reviews, lessons, answers, daily] = await Promise.all([
    db.reviews.orderBy('at').keys(),
    db.lessons.toArray(),
    db.answers.orderBy('at').keys(),
    db.daily.toArray(),
  ]);
  return [...(reviews as Date[]), ...lessons.map((l) => l.updatedAt), ...(answers as Date[]), ...daily.map((d) => d.at)];
}

export async function streakNow(now = new Date()) {
  return streakWithFreezes(await activityDates(), now);
}

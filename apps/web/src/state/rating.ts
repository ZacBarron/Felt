import { DIFFICULTY, type RatingEvent, type RatingSnapshot, replayRatings, type SkillDomain, streakWithFreezes } from '@felt/core';
import { db, type StoredAnswer } from './db';
import { entryFor } from './lessons';
import { calibratedDifficulty } from './calibration';
import { track } from './events';

/**
 * Records graded answers and turns them into the Aced Rating. Only objective
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

/**
 * How hard a lesson quiz is. Basics are easy items. A quiz answered inside the
 * lesson, moments after reading the answer, counts as easier than the same
 * question recalled later in Review, a check or a challenge.
 */
export function lessonQuizDifficulty(key: string, source?: StoredAnswer['source']): number {
  const base = key.startsWith('basics/') ? DIFFICULTY.lessonBasics : entryFor(key)?.content?.level === 'advanced' ? DIFFICULTY.lessonAdvanced : DIFFICULTY.lessonCore;
  return source === 'lesson' ? base - DIFFICULTY.inLessonEase : base;
}

/** Play rated every preflop hand at first, trivial folds included. Those answers no longer count. */
const legacyPlay = (a: StoredAnswer) => a.source === 'play' && a.domain === 'preflop' && !a.itemId.startsWith('play:edge:');

/** The same item answered again this soon is recall from the screen, not from memory: it does not count. */
const REPEAT_WINDOW_MS = 10 * 60 * 1000;

export async function recordRated(answer: Omit<StoredAnswer, 'id' | 'at'>, at = new Date()) {
  const recent = await db.answers.where('itemId').equals(answer.itemId).last();
  if (recent && at.getTime() - recent.at.getTime() < REPEAT_WINDOW_MS) return;
  await db.answers.add({ ...answer, at });
  // Every objective answer, for activation. Never the question or the answer itself.
  const lesson = answer.itemId.startsWith('quiz:') ? answer.itemId.slice(5).split('#')[0] : undefined;
  track('answer_graded', { source: answer.source, domain: answer.domain, correct: answer.score >= 1, score: Math.round(answer.score * 100) / 100, lesson });
}

/** Quiz step `step` of lesson `key`, answered right or wrong. */
export function recordLessonQuiz(key: string, step: number, correct: boolean, source: StoredAnswer['source']) {
  return recordRated({
    itemId: `quiz:${key}#${step}`,
    domain: domainForLesson(key),
    difficulty: lessonQuizDifficulty(key, source),
    score: correct ? 1 : 0,
    source,
  });
}

export async function ratingSnapshot(): Promise<RatingSnapshot> {
  const answers = (await db.answers.toArray()).filter((a) => !legacyPlay(a));
  const events: RatingEvent[] = answers.map((a) => ({
    at: a.at.getTime(),
    itemId: a.itemId,
    domain: a.domain,
    // Quiz difficulty is worked out again, so answers saved before a change in it count fairly.
    difficulty: calibratedDifficulty(a.itemId, a.itemId.startsWith('quiz:') ? lessonQuizDifficulty(a.itemId.slice(5).split('#')[0], a.source) : a.difficulty),
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

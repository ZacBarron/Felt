import { type GameSettings, pickAdaptive, type PracticeItem, type SkillDomain } from '@felt/core';
import type { Decision } from '../drills/DecisionItem';
import type { StoredLesson } from './db';
import { isComplete, LESSON_ENTRIES, quizSteps } from './lessons';
import { domainForLesson, lessonQuizDifficulty } from './rating';
import { ratedChartPicks } from './spotQuiz';

export type PracticeCandidate = PracticeItem & { decision: Decision };

/** Chart candidates per session, spread across spots before the rating model picks among them. */
const CHART_CANDIDATES = 30;

/**
 * A practice session: chart decisions from every spot type in the player's
 * game (hand written charts only, so every answer can count toward the
 * rating), plus questions from lessons they finished, picked near 80%
 * expected success by the rating model.
 */
export function practiceSession(
  game: Pick<GameSettings, 'tableSize' | 'format'>,
  progress: ReadonlyMap<string, StoredLesson>,
  ratingFor: (d: SkillDomain) => number,
  { n = 10, exclude = new Set<string>(), rand = Math.random, now = Date.now() }: { n?: number; exclude?: ReadonlySet<string>; rand?: () => number; now?: number } = {},
): PracticeCandidate[] {
  const chartItems: PracticeCandidate[] = ratedChartPicks(game, CHART_CANDIDATES, rand, now).map(({ chartId, hand, difficulty }) => ({
    id: `chart:${chartId}:${hand}`,
    domain: 'preflop' as SkillDomain,
    difficulty,
    decision: { kind: 'chart' as const, chartId, hand },
  }));
  // Questions from lessons you have finished or tested out of; if there are few, the core lessons too.
  const learned = LESSON_ENTRIES.filter((e) => e.content && isComplete(progress.get(e.key)));
  const lessons = learned.length >= 5 ? learned : LESSON_ENTRIES.filter((e) => e.content?.level === 'core');
  const quizItems: PracticeCandidate[] = lessons.flatMap((e) =>
    quizSteps(e).map((step) => ({
      id: `quiz:${e.key}#${step}`,
      domain: domainForLesson(e.key),
      difficulty: lessonQuizDifficulty(e.key),
      decision: { kind: 'quiz' as const, key: e.key, step },
    })),
  );
  return pickAdaptive([...chartItems, ...quizItems], ratingFor, { n, exclude, rand });
}

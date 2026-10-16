import { BASICS_LESSONS } from './lessons/basics';
import type { LessonStep } from './lessons/types';

type Quiz = Extract<LessonStep, { kind: 'quiz' }>;

/**
 * The first question in setup, for new and casual players. Not a test of
 * knowledge: a guess with a surprising answer that teaches the idea the
 * whole app rests on. Even the best hand loses often, so poker is judged by
 * decisions over many hands, not by single results. The chances are exact
 * and checked by the content tests.
 */
export const FIRST_HAND_NEW: Quiz = {
  kind: 'quiz',
  question: 'Aces against 7 2. How often do the aces win?',
  cards: 'AsAh',
  choices: ['About 99% of the time', 'About 87% of the time', 'About 70% of the time'],
  answer: 1,
  explain: 'About 87%. Even the best starting hand loses about 1 time in 8. So good players judge decisions, not single results. Felt trains those decisions.',
};

/**
 * The first hand for someone who knows the rules: a hand ranking question
 * from the rankings lesson, so it is checked like every lesson quiz.
 */
export const FIRST_HAND_CASUAL: Quiz = BASICS_LESSONS.find((l) => l.key === 'basics/rules/rankings')!.steps.find(
  (s): s is Quiz => s.kind === 'quiz' && s.question.startsWith('You have a full house'),
)!;

/** The hands behind FIRST_HAND_NEW's chance, for the test that checks it. */
export const FIRST_HAND_NEW_MATCHUP = { hero: 'AsAh', villain: '7c2d', winPct: 87 } as const;

/**
 * What players say about Felt. Only real quotes from real players, used with
 * their permission. The welcome screen shows nothing while this is empty, so
 * never fill it with placeholders.
 */
export interface Testimonial {
  quote: string;
  name: string;
  /** Who they are as a player, like "Plays 1/3 live". */
  detail?: string;
}

export const TESTIMONIALS: Testimonial[] = [];

import type { LessonStep } from './lessons/types';

type Quiz = Extract<LessonStep, { kind: 'quiz' }>;

/**
 * The first hand someone plays during setup, before they have learned
 * anything. It is meant to be winnable: an early success is the strongest
 * source of belief that you can learn a skill (Bandura 1977). The chance is
 * exact and checked by the content tests.
 */
export const FIRST_HAND_NEW: Quiz = {
  kind: 'quiz',
  question: 'Which starting hand would you rather hold?',
  choiceCards: ['AsAh', '7c2d'],
  choices: ['Two aces', 'A seven and a two'],
  answer: 0,
  explain: 'Two aces is the best starting hand in poker. It beats 7 2 about 87% of the time. Felt teaches you which hands to play and when.',
};

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

import { type Card as FsrsCard, createEmptyCard, fsrs, type Grade, Rating, type ReviewLog, State } from 'ts-fsrs';

/**
 * Spaced repetition on top of FSRS (the scheduler modern Anki uses).
 *
 * Suited does not ask the learner to self-grade. A drill answer is graded
 * from correctness and speed, because at the table a range you need five
 * seconds to recall is not really known yet.
 */

export { Rating, State } from 'ts-fsrs';

export type CardStrength = 'new' | 'learning' | 'solid';

/**
 * How well a card is known: never seen, still being learned, or solid once
 * FSRS expects to hold it for at least `solidDays` without a review.
 */
export function cardStrength(card: Pick<FsrsCard, 'state' | 'stability'> | undefined, solidDays = 7): CardStrength {
  if (!card) return 'new';
  return card.state === State.Review && card.stability >= solidDays ? 'solid' : 'learning';
}
export type { FsrsCard, ReviewLog };

export interface DrillOutcome {
  /** 1 = fully correct, 0 = wrong. Partial credit allowed (e.g. 0.8 of a range painted right). */
  accuracy: number;
  responseMs: number;
  /** Time a confident, automatic answer should take for this card type. */
  targetMs: number;
}

/** Maps an objective drill result to an FSRS grade. */
export function gradeOutcome({ accuracy, responseMs, targetMs }: DrillOutcome): Grade {
  if (accuracy < 0.6) return Rating.Again;
  if (accuracy < 0.9) return Rating.Hard;
  if (responseMs <= targetMs) return Rating.Easy;
  if (responseMs <= targetMs * 2.5) return Rating.Good;
  return Rating.Hard;
}

export function createScheduler(requestRetention = 0.9) {
  const scheduler = fsrs({ request_retention: requestRetention, enable_fuzz: true });
  return {
    newCard: (now: Date = new Date()): FsrsCard => createEmptyCard(now),
    review: (card: FsrsCard, outcome: DrillOutcome, now: Date = new Date()) =>
      scheduler.next(card, now, gradeOutcome(outcome)),
    retrievability: (card: FsrsCard, now: Date = new Date()) => scheduler.get_retrievability(card, now, false),
  };
}

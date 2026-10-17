import { BASICS_LESSONS } from './basics';
import { BASICS_MONEY_LESSONS } from './basics-money';
import { BASICS_TABLE_LESSONS } from './basics-table';
import { EXPLOIT_LESSONS } from './exploit';
import { GAPS_BASICS_LESSONS } from './gaps-basics';
import { GAPS_MINDSET_LESSONS } from './gaps-mindset';
import { GAPS_STRATEGY_LESSONS } from './gaps-strategy';
import { GAPS_TOURNAMENT_LESSONS } from './gaps-tournaments';
import { EXPLOIT_MORE_LESSONS } from './exploit-more';
import { FORMATS_HEADS_UP_LESSONS } from './formats-heads-up';
import { FORMATS_SHORT_DEEP_LESSONS } from './formats-short-deep';
import { MINDSET_LESSONS } from './mindset';
import { POSTFLOP_MORE_LESSONS } from './postflop-more';
import { POSTFLOP_READING_LESSONS } from './postflop-reading';
import { POSTFLOP_RIVER_LESSONS } from './postflop-river';
import { POSTFLOP_VALUE_LESSONS } from './postflop-value';
import { PREFLOP_LIVE_LESSONS } from './preflop-live';
import { PREFLOP_MORE_LESSONS } from './preflop-more';
import { PREFLOP_RAKE_LESSONS } from './preflop-rake';
import { PREFLOP_DEFENSE_LESSONS } from './preflop-defense';
import { PREFLOP_3BET_LESSONS } from './preflop-3bets';
import { PREFLOP_MULTIWAY_LESSONS } from './preflop-multiway';
import { PREFLOP_LIVE_MORE_LESSONS } from './preflop-live-more';
import { POSTFLOP_3BP_LESSONS } from './postflop-3bp';
import { POSTFLOP_MULTIWAY_MORE_LESSONS } from './postflop-multiway-more';
import { FORMATS_6MAX_DEFENSE_LESSONS } from './formats-6max-defense';
import { RESULTS_LESSONS } from './results';
import { THEORY_LESSONS } from './theory';
import { TOURNAMENT_LESSONS } from './tournaments';
import { TOURNAMENT_MORE_LESSONS } from './tournaments-more';
import { TOURNAMENT_ICM_LESSONS } from './tournaments-icm';
import { FOUNDATIONS_LESSONS } from './foundations';
import { POSTFLOP_LESSONS } from './postflop';
import { PREFLOP_LESSONS } from './preflop';
import { withGenerated } from './generated';
import type { LessonContent } from './types';

export * from './types';
export * from './variants';
export { GENERATED_QUESTIONS, cardsFor, verdictFor } from './generated';

const ALL: LessonContent[] = [
  ...BASICS_LESSONS,
  ...BASICS_TABLE_LESSONS,
  ...BASICS_MONEY_LESSONS,
  ...FOUNDATIONS_LESSONS,
  ...THEORY_LESSONS,
  ...PREFLOP_LESSONS,
  ...PREFLOP_MORE_LESSONS,
  ...PREFLOP_LIVE_LESSONS,
  ...PREFLOP_RAKE_LESSONS,
  ...PREFLOP_DEFENSE_LESSONS,
  ...PREFLOP_3BET_LESSONS,
  ...PREFLOP_MULTIWAY_LESSONS,
  ...PREFLOP_LIVE_MORE_LESSONS,
  ...POSTFLOP_LESSONS,
  ...POSTFLOP_MORE_LESSONS,
  ...POSTFLOP_RIVER_LESSONS,
  ...POSTFLOP_VALUE_LESSONS,
  ...POSTFLOP_READING_LESSONS,
  ...POSTFLOP_3BP_LESSONS,
  ...POSTFLOP_MULTIWAY_MORE_LESSONS,
  ...EXPLOIT_LESSONS,
  ...EXPLOIT_MORE_LESSONS,
  ...FORMATS_HEADS_UP_LESSONS,
  ...FORMATS_SHORT_DEEP_LESSONS,
  ...FORMATS_6MAX_DEFENSE_LESSONS,
  ...MINDSET_LESSONS,
  ...RESULTS_LESSONS,
  ...TOURNAMENT_LESSONS,
  ...TOURNAMENT_MORE_LESSONS,
  ...TOURNAMENT_ICM_LESSONS,
  ...GAPS_BASICS_LESSONS,
  ...GAPS_STRATEGY_LESSONS,
  ...GAPS_TOURNAMENT_LESSONS,
  ...GAPS_MINDSET_LESSONS,
];

export const LESSON_CONTENT: ReadonlyMap<string, LessonContent> = new Map(withGenerated(ALL).map((l) => [l.key, l]));

export function lessonKey(trackId: string, moduleId: string, lessonId: string): string {
  return `${trackId}/${moduleId}/${lessonId}`;
}

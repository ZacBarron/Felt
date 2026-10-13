import { BASICS_LESSONS } from './basics';
import { BASICS_TABLE_LESSONS } from './basics-table';
import { EXPLOIT_LESSONS } from './exploit';
import { EXPLOIT_MORE_LESSONS } from './exploit-more';
import { MINDSET_LESSONS } from './mindset';
import { POSTFLOP_MORE_LESSONS } from './postflop-more';
import { POSTFLOP_READING_LESSONS } from './postflop-reading';
import { POSTFLOP_RIVER_LESSONS } from './postflop-river';
import { PREFLOP_LIVE_LESSONS } from './preflop-live';
import { PREFLOP_MORE_LESSONS } from './preflop-more';
import { PREFLOP_RAKE_LESSONS } from './preflop-rake';
import { THEORY_LESSONS } from './theory';
import { TOURNAMENT_LESSONS } from './tournaments';
import { TOURNAMENT_MORE_LESSONS } from './tournaments-more';
import { FOUNDATIONS_LESSONS } from './foundations';
import { POSTFLOP_LESSONS } from './postflop';
import { PREFLOP_LESSONS } from './preflop';
import type { LessonContent } from './types';

export * from './types';

const ALL: LessonContent[] = [
  ...BASICS_LESSONS,
  ...BASICS_TABLE_LESSONS,
  ...FOUNDATIONS_LESSONS,
  ...THEORY_LESSONS,
  ...PREFLOP_LESSONS,
  ...PREFLOP_MORE_LESSONS,
  ...PREFLOP_LIVE_LESSONS,
  ...PREFLOP_RAKE_LESSONS,
  ...POSTFLOP_LESSONS,
  ...POSTFLOP_MORE_LESSONS,
  ...POSTFLOP_RIVER_LESSONS,
  ...POSTFLOP_READING_LESSONS,
  ...EXPLOIT_LESSONS,
  ...EXPLOIT_MORE_LESSONS,
  ...MINDSET_LESSONS,
  ...TOURNAMENT_LESSONS,
  ...TOURNAMENT_MORE_LESSONS,
];

export const LESSON_CONTENT: ReadonlyMap<string, LessonContent> = new Map(ALL.map((l) => [l.key, l]));

export function lessonKey(trackId: string, moduleId: string, lessonId: string): string {
  return `${trackId}/${moduleId}/${lessonId}`;
}

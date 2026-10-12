import { EXPLOIT_LESSONS } from './exploit';
import { FOUNDATIONS_LESSONS } from './foundations';
import { POSTFLOP_LESSONS } from './postflop';
import { PREFLOP_LESSONS } from './preflop';
import type { LessonContent } from './types';

export * from './reading';
export * from './types';

const ALL: LessonContent[] = [...FOUNDATIONS_LESSONS, ...PREFLOP_LESSONS, ...POSTFLOP_LESSONS, ...EXPLOIT_LESSONS];

export const LESSON_CONTENT: ReadonlyMap<string, LessonContent> = new Map(ALL.map((l) => [l.key, l]));

export function lessonKey(trackId: string, moduleId: string, lessonId: string): string {
  return `${trackId}/${moduleId}/${lessonId}`;
}

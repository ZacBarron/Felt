import type { LessonCover as Cover } from '@felt/content';
import { LessonArt } from './LessonArt';

/** The art on a lesson card: the picture that says the lesson's idea, drawn by LessonArt. */
export function LessonCover({ cover, size = 'md' }: { cover: Cover; size?: 'sm' | 'md' }) {
  return (
    <div className={`cover cover-${size} cover-${cover.kind}`}>
      <LessonArt art={cover} size={size} />
    </div>
  );
}

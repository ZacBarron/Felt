import type { LessonCover as Cover } from '@felt/content';
import { LessonArt } from './LessonArt';

/**
 * Drawings with words in them (a tree, a table, axis labels) are drawn at
 * reading size on the lesson intro. The rest keep their cover drawing there.
 */
const READ_ON_INTRO = new Set<Cover['kind']>(['tree', 'bars', 'chips', 'curve', 'paths', 'table', 'streets', 'ladder']);

/** The art on a lesson card: the picture that says the lesson's idea, drawn by LessonArt. */
export function LessonCover({ cover, size = 'md' }: { cover: Cover; size?: 'sm' | 'md' | 'intro' }) {
  if (size === 'intro' && READ_ON_INTRO.has(cover.kind)) {
    return (
      // Not a `.cover`: cover rules size art by the box, and here the art sets the height.
      <div className={`intro-art intro-art-${cover.kind}`}>
        <LessonArt art={cover} size="step" />
      </div>
    );
  }
  const box = size === 'intro' ? 'md' : size;
  return (
    <div className={`cover cover-${box} cover-${cover.kind}`}>
      <LessonArt art={cover} size={box} />
    </div>
  );
}

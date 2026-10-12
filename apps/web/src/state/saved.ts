import { db, type SavedItem, type SavedSolverSpot } from './db';
import { entryFor } from './lessons';

/**
 * Saves: anything worth coming back to. Every saved item is also a card in
 * the daily review, so what you found interesting gets remembered, not just
 * bookmarked.
 */

/** Review card id for a saved item. */
export const savedCardId = (savedId: string) => `saved:${savedId}`;

export const lessonStepId = (lessonKey: string, step: number) => `lesson:${lessonKey}#${step}`;

/** How long a confident recall of a saved card should take. */
export const SAVED_TARGET_MS = 12_000;

export async function saveLessonStep(lessonKey: string, step: number): Promise<SavedItem> {
  const entry = entryFor(lessonKey);
  const s = entry?.content?.steps[step];
  const title =
    !s ? 'Lesson step'
    : s.kind === 'quiz' ? s.question
    : s.kind === 'takeaway' ? `${entry!.title}: key points`
    : 'title' in s ? s.title
    : 'Lesson step';
  const item: SavedItem = {
    id: lessonStepId(lessonKey, step),
    kind: 'lesson-step',
    title,
    source: entry ? `${entry.title}, ${entry.moduleTitle}` : lessonKey,
    createdAt: new Date(),
    lessonKey,
    step,
  };
  await db.saved.put(item);
  return item;
}

export async function saveSolverSpot(spot: SavedSolverSpot): Promise<SavedItem> {
  const id = `solver:${spot.board}:${spot.line.join('>')}:${spot.hand}`;
  const item: SavedItem = {
    id,
    kind: 'solver-spot',
    title: `${spot.hand} on ${spot.board}`,
    source: spot.line.length ? spot.line.join(', ') : `${spot.player === 0 ? 'Out of position' : 'In position'} first to act`,
    createdAt: new Date(),
    spot,
  };
  await db.saved.put(item);
  return item;
}

/** Removes a save and its review card. */
export async function unsave(id: string) {
  await db.transaction('rw', db.saved, db.cards, async () => {
    await db.saved.delete(id);
    await db.cards.delete(savedCardId(id));
  });
}

export async function setNote(id: string, note: string) {
  await db.saved.update(id, { note: note.trim() || undefined });
}

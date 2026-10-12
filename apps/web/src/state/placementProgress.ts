import type { PlacementState } from '@felt/core';
import { entryFor } from './lessons';

const KEY = 'felt.placement.v1';

export interface SavedPlacement {
  state: PlacementState;
  tally: { right: number; asked: number };
}

/** A placement test left halfway, if its questions still exist in the curriculum. */
export function loadPlacement(): SavedPlacement | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as SavedPlacement | null;
    if (!saved || saved.state.done) return undefined;
    const keys = [...saved.state.questions, ...saved.state.modules.flatMap((m) => m.lessons.map((l) => ({ lessonKey: l.key })))];
    if (!keys.every((q) => entryFor(q.lessonKey)?.content)) return undefined;
    return saved;
  } catch {
    return undefined;
  }
}

export function savePlacement(saved: SavedPlacement) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage can be blocked; the test still works, it just will not resume.
  }
}

export function clearPlacement() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Item difficulties fitted by the server from every player's answers (see
 * the server's /api/calibration). They replace the design priors once an
 * item has enough answers; ratings are replayed with them, so history is
 * recalibrated without losing anything.
 */

const KEY = 'felt.calibration.v1';

let cache: Record<string, number> | undefined;

function load(): Record<string, number> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
  } catch {
    cache = {};
  }
  return cache;
}

export function setCalibration(items: Record<string, number>) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage blocked: priors stay in use.
  }
}

/** The fitted difficulty for an item, or the design prior when there is none yet. */
export function calibratedDifficulty(itemId: string, prior: number): number {
  return load()[itemId] ?? prior;
}

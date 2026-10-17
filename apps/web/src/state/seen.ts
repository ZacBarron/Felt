import { lastSeen, rememberSeen, SEEN_CAP, type SeenEntry } from '@felt/core';

/**
 * What this player saw recently, on this device only: spots, hands, dealt
 * cards, scenarios and question versions. Quizzes, review, drills and
 * scenarios read it so the next set brings something new. Losing it costs
 * nothing but a little variety, so browser storage is enough. When storage
 * is blocked it lives in memory for the visit.
 *
 * Keys are short and namespaced:
 * - `h:<chartId>:<hand>` a chart hand shown
 * - `c:<chartId>` a chart used for a question
 * - `d:<hand>:<combo>` cards dealt for a hand class
 * - `s:<scenarioId>` a scenario played
 * - `v:<lessonKey>#<step>:<version>` a question version shown
 */

const KEY = 'felt.seen';
/** Stored as [key, minutes since the epoch] pairs to keep it small. */
type Stored = [string, number][];

let memory: SeenEntry[] | undefined;

function load(): SeenEntry[] {
  if (memory) return memory;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Stored;
    memory = Array.isArray(raw) ? raw.filter((e) => Array.isArray(e) && typeof e[0] === 'string').map(([key, m]) => ({ key, at: m * 60_000 })) : [];
  } catch {
    memory = [];
  }
  return memory;
}

function save(log: SeenEntry[]) {
  memory = log;
  try {
    const out: Stored = log.map((e) => [e.key, Math.round(e.at / 60_000)]);
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    // Blocked storage: the memory lasts for this visit only.
  }
}

/** Notes keys as seen now. */
export function markSeen(keys: readonly string[], now = Date.now()) {
  if (keys.length === 0) return;
  save(rememberSeen(load(), keys, now, SEEN_CAP));
}

/** When each key was last seen, for keys with this prefix (all keys without one). */
export function seenMap(prefix = ''): Map<string, number> {
  const all = lastSeen(load());
  if (!prefix) return all;
  return new Map([...all].filter(([k]) => k.startsWith(prefix)));
}

/** The keys with this prefix, newest first. Keys seen in the same moment keep the order they were marked in. */
export function recentKeys(prefix: string, limit = 50): string[] {
  return [...seenMap(prefix)]
    .map(([k, at], i) => ({ k, at, i }))
    .sort((a, b) => b.at - a.at || b.i - a.i)
    .slice(0, limit)
    .map(({ k }) => k);
}

/** Forgets everything, for tests and a reset. */
export function clearSeen() {
  memory = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}

export const handKey = (chartId: string, hand: string) => `h:${chartId}:${hand}`;
export const chartKey = (chartId: string) => `c:${chartId}`;
export const dealKey = (hand: string, combo: string) => `d:${hand}:${combo}`;
export const scenarioKey = (id: string) => `s:${id}`;
export const versionKey = (lessonKey: string, step: number, version: number) => `v:${lessonKey}#${step}:${version}`;

/** Combos dealt lately for a hand class, newest first. */
export function recentCombos(hand: string, limit = 3): string[] {
  return recentKeys(`d:${hand}:`, limit).map((k) => k.slice(`d:${hand}:`.length));
}

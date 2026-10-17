import { type Card, cardsToString } from './cards';
import { hashString } from './hash';
import { seededRandom } from './habits';
import { handClassCombos, type HandClass } from './ranges';

/**
 * Variety: what a player saw recently, and samplers that use it.
 *
 * Practice that repeats the same few spots teaches the spots, not the game.
 * These helpers pick items that were not seen recently, spread a set across
 * spot types, seats, stacks and hands, and walk fixed rotations so a shared
 * challenge never repeats an exact decision inside a window. Everything is
 * pure and takes its random source as an argument, so tests can replay it.
 */

/** One thing the player saw, by key, and when (epoch milliseconds). */
export interface SeenEntry {
  key: string;
  at: number;
}

/** How many entries the memory keeps. Old entries fall off first. */
export const SEEN_CAP = 700;

/** Adds `keys` seen at `at`. Each key keeps only its newest entry, and the log keeps the newest `cap`. */
export function rememberSeen(log: readonly SeenEntry[], keys: readonly string[], at: number, cap = SEEN_CAP): SeenEntry[] {
  const fresh = new Set(keys);
  const kept = log.filter((e) => !fresh.has(e.key));
  const out = [...kept, ...[...fresh].map((key) => ({ key, at }))];
  out.sort((a, b) => a.at - b.at);
  return out.slice(Math.max(0, out.length - cap));
}

/** When each key was last seen. */
export function lastSeen(log: readonly SeenEntry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of log) if ((out.get(e.key) ?? -Infinity) < e.at) out.set(e.key, e.at);
  return out;
}

/** A shuffled copy (Fisher Yates). */
export function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export { hashString };

export interface NoveltyOptions<T> {
  /** How many to pick. Fewer come back only when the pool is smaller. */
  n: number;
  key: (item: T) => string;
  /** Relative chance before novelty and spread. Zero or less never picks. Default 1. */
  weight?: (item: T) => number;
  /**
   * Labels to spread a set across, like "spot:vs-open", "seat:BTN" and
   * "hand:A5s". Each earlier pick that shares a label cuts an item's chance.
   */
  facets?: (item: T) => readonly string[];
  /** When each key was last seen, in epoch milliseconds. */
  seen?: ReadonlyMap<string, number>;
  now?: number;
  /** Items seen within this window wait until nothing fresher is left. Default: anything seen. */
  windowMs?: number;
  /** Multiplier per earlier pick that shares a label. Default 0.25. */
  spread?: number;
  /** Extra multiplier for sharing a label with the pick just before. Default 0.3. */
  neighbour?: number;
  rand: () => number;
}

/**
 * Picks up to `n` distinct items, weighted, that were not seen recently,
 * spread across facets. Items seen inside the window are used only once the
 * fresh ones run out, oldest first, so a session never comes up short.
 */
export function noveltyPick<T>(items: readonly T[], opts: NoveltyOptions<T>): T[] {
  const { n, key, rand } = opts;
  const weight = opts.weight ?? (() => 1);
  const facets = opts.facets ?? (() => []);
  const spread = opts.spread ?? 0.25;
  const neighbour = opts.neighbour ?? 0.3;
  const now = opts.now ?? 0;
  const window = opts.windowMs ?? Infinity;
  const seen = opts.seen;

  const byKey = new Map<string, T>();
  for (const it of items) if (!byKey.has(key(it)) && weight(it) > 0) byKey.set(key(it), it);
  const pool = [...byKey.values()].map((item) => {
    const at = seen?.get(key(item));
    const stale = at !== undefined && now - at < window;
    return { item, w: weight(item), f: facets(item), stale, at: at ?? -Infinity };
  });

  const counts = new Map<string, number>();
  let last: readonly string[] = [];
  const out: T[] = [];
  const left = new Set(pool.map((_, i) => i));
  while (out.length < n && left.size > 0) {
    // Fresh items first. Once they are gone, the ones seen longest ago.
    let tier = [...left].filter((i) => !pool[i].stale);
    if (tier.length === 0) {
      const oldest = Math.min(...[...left].map((i) => pool[i].at));
      tier = [...left].filter((i) => pool[i].at === oldest);
    }
    const scores = tier.map((i) => {
      const p = pool[i];
      let s = p.w;
      for (const f of p.f) {
        s *= spread ** (counts.get(f) ?? 0);
        if (last.includes(f)) s *= neighbour;
      }
      return s;
    });
    const total = scores.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let pick = tier[tier.length - 1];
    for (let k = 0; k < tier.length; k++) {
      r -= scores[k];
      if (r < 0) {
        pick = tier[k];
        break;
      }
    }
    const p = pool[pick];
    left.delete(pick);
    out.push(p.item);
    for (const f of p.f) counts.set(f, (counts.get(f) ?? 0) + 1);
    last = p.f;
  }
  return out;
}

/**
 * Reorders items so neighbours share as few labels as possible, keeping the
 * original order otherwise. Looks at most `lookahead` items ahead, so due
 * cards stay roughly in due order.
 */
export function spreadOrder<T>(items: readonly T[], facets: (item: T) => readonly string[], lookahead = 6): T[] {
  const rest = [...items];
  const out: T[] = [];
  let prev: readonly string[] = [];
  while (rest.length) {
    let best = 0;
    let bestShared = Infinity;
    for (let i = 0; i < Math.min(lookahead, rest.length); i++) {
      const shared = facets(rest[i]).filter((f) => prev.includes(f)).length;
      if (shared < bestShared) {
        best = i;
        bestShared = shared;
        if (shared === 0) break;
      }
    }
    const [item] = rest.splice(best, 1);
    out.push(item);
    prev = facets(item);
  }
  return out;
}

/**
 * A fixed rotation through `items`: each group shuffled with a seed from its
 * name, its order spread by `facets`, then the groups dealt round robin. The
 * same input always gives the same rotation, and an item comes back only
 * after the whole rotation has gone by.
 */
export function rotation<T>(
  items: readonly T[],
  { salt, group, key, facets }: { salt: string; group: (item: T) => string; key: (item: T) => string; facets?: (item: T) => readonly string[] },
): T[] {
  const groups = new Map<string, T[]>();
  // Input order never matters: sort by key first.
  const sorted = [...items].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  for (const it of sorted) {
    const g = group(it);
    const list = groups.get(g);
    if (list) list.push(it);
    else groups.set(g, [it]);
  }
  const names = shuffled([...groups.keys()].sort(), seededRandom(hashString(`${salt}|groups`)));
  const piles = names.map((g) => {
    const mixed = shuffled(groups.get(g)!, seededRandom(hashString(`${salt}|${g}`)));
    return facets ? spreadOrder(mixed, facets, 12) : mixed;
  });
  // Deal in proportion to group size, so a big group does not run dry later than a small one.
  const out: T[] = [];
  const taken = piles.map(() => 0);
  const total = piles.reduce((t, p) => t + p.length, 0);
  while (out.length < total) {
    let best = -1;
    let bestShare = Infinity;
    piles.forEach((p, i) => {
      if (taken[i] >= p.length) return;
      const share = (taken[i] + 0.5) / p.length;
      if (share < bestShare - 1e-12) {
        best = i;
        bestShare = share;
      }
    });
    out.push(piles[best][taken[best]++]);
  }
  return out;
}

/** The item a rotation holds at `index`, wrapping both ways. */
export function rotationAt<T>(order: readonly T[], index: number): T | undefined {
  if (order.length === 0) return undefined;
  return order[((index % order.length) + order.length) % order.length];
}

/** Two cards as text, like "AhKd". */
export const comboText = (cards: readonly [Card, Card]) => cardsToString(cards);

/**
 * One combo of a hand class, dealt at random in fresh suits. `avoid` names
 * combos shown recently, which are skipped while another is left.
 */
export function dealCombo(hand: HandClass, rand: () => number, avoid: readonly string[] = []): [Card, Card] {
  const all = handClassCombos(hand);
  const fresh = all.filter((c) => !avoid.includes(comboText(c)));
  const pool = fresh.length ? fresh : all;
  return pool[Math.floor(rand() * pool.length)];
}

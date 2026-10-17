import { type ChartMeta, chartOpenBb } from './charts';
import type { GameFormat, Position } from './settings';

/**
 * Picking charts for a game. The library holds one chart per spot for each
 * table format, stack depth and open size it covers. A player's game rarely
 * matches one exactly, so these helpers find the closest chart and say which
 * parts of the match are approximate.
 */

export interface ChartQuery {
  format: GameFormat;
  tableSize: number;
  /** Effective stack in big blinds. */
  stackBb: number;
  /** The game's standard open in big blinds. */
  openBb: number;
}

/** Which parts of a chart match the game. */
export interface ChartFit {
  /** The chart is for this table size. */
  table: boolean;
  /** The chart's stack is within about 15% of the game's. */
  stack: boolean;
  /** The chart's open size is within 0.25bb of the game's. */
  open: boolean;
}

/** Everything that names a spot, apart from the format, stack and open size. Variants of one spot share it. */
export function spotKey(m: Pick<ChartMeta, 'spot' | 'hero' | 'villains' | 'caller' | 'limpers'>): string {
  return [m.spot, m.hero, (m.villains ?? []).join('/'), (m.caller ?? []).join('/'), m.limpers ?? ''].join('|');
}

/** The table size with charts nearest to the one asked for. Ties go to the larger table (ranges err tight). */
export function nearestTableSize(sizes: readonly number[], tableSize: number): number | undefined {
  if (sizes.length === 0) return undefined;
  return sizes.reduce((a, b) => {
    const da = Math.abs(a - tableSize);
    const db = Math.abs(b - tableSize);
    return db < da || (db === da && b > a) ? b : a;
  });
}

/**
 * How far a chart is from the game: stack and open size on a log scale, so
 * 100bb against 150bb counts the same as 40bb against 60bb.
 */
export function variantDistance(m: Pick<ChartMeta, 'stackBb' | 'openBb'>, q: Pick<ChartQuery, 'stackBb' | 'openBb'>): number {
  const stack = Math.abs(Math.log(m.stackBb / Math.max(1, q.stackBb)));
  const open = Math.abs(Math.log(chartOpenBb(m) / Math.max(1, q.openBb)));
  // Stack mismatches first, then size: a 4bb chart at 100bb beats a 2.5bb chart at 100bb for a 4bb game.
  return stack + open * 0.9;
}

export function chartFit(m: Pick<ChartMeta, 'tableSize' | 'stackBb' | 'openBb'>, q: ChartQuery): ChartFit {
  const ratio = m.stackBb / Math.max(1, q.stackBb);
  return {
    table: m.tableSize === q.tableSize,
    stack: ratio >= 0.85 && ratio <= 1.18,
    open: Math.abs(chartOpenBb(m) - q.openBb) <= 0.25,
  };
}

export const fitIsExact = (f: ChartFit) => f.table && f.stack && f.open;

/** The closest of several variants of one spot. Curated charts win ties over derived ones. */
export function closestVariant<T extends ChartMeta>(variants: readonly T[], q: Pick<ChartQuery, 'stackBb' | 'openBb'>): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const v of variants) {
    const d = variantDistance(v, q) + (v.source === 'model-approx' ? 1e-6 : 0);
    if (d < bestD - 1e-12) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

/**
 * The closest chart for every spot in the player's game: the nearest table
 * size for the format, then for each spot the variant nearest in stack and
 * open size. Returns charts in library order.
 */
export function closestCharts<T extends ChartMeta>(library: readonly T[], q: ChartQuery): { charts: T[]; tableSize: number; exact: boolean } {
  const pool = library.some((c) => c.game === q.format) ? library.filter((c) => c.game === q.format) : [...library];
  const tableSize = nearestTableSize([...new Set(pool.map((c) => c.tableSize))], q.tableSize);
  if (tableSize === undefined) return { charts: [], tableSize: q.tableSize, exact: false };
  const groups = new Map<string, T[]>();
  for (const c of pool) {
    if (c.tableSize !== tableSize) continue;
    const key = spotKey(c);
    const g = groups.get(key);
    if (g) g.push(c);
    else groups.set(key, [c]);
  }
  const picked = new Set<T>();
  for (const g of groups.values()) {
    const best = closestVariant(g, q);
    if (best) picked.add(best);
  }
  return { charts: pool.filter((c) => picked.has(c)), tableSize, exact: tableSize === q.tableSize };
}

/** Values on offer, nearest first: used to default a picker to the player's stack or size. */
export function nearestOf(values: readonly number[], target: number): number | undefined {
  let best: number | undefined;
  for (const v of values) if (best === undefined || Math.abs(Math.log(v / target)) < Math.abs(Math.log(best / target)) - 1e-12) best = v;
  return best;
}

/** True when a chart covers this villain seat (or names none). */
export function coversVillain(m: Pick<ChartMeta, 'villains'>, seat: Position | undefined): boolean {
  return !m.villains || m.villains.length === 0 || (seat !== undefined && m.villains.includes(seat));
}

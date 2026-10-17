import { ALL_HAND_CLASSES, comboCount, type HandClass, parseRange } from './ranges';
import { CHART_OPEN_BB, type GameFormat, type Position } from './settings';

/**
 * Preflop charts with mixed strategies.
 *
 * Each action carries its own range. Actions are listed in priority order and
 * each one can only take the frequency left over by the actions before it,
 * so "3bet A5s:0.6" followed by "call A2s-AJs" gives A5s 60% 3bet / 40% call
 * without the author computing remainders by hand. Whatever is left is fold.
 */

export interface ChartActionSpec {
  id: string;
  label: string;
  range: string;
}

/**
 * Spot families, in the order a hand plays out.
 * - rfi: folded to you, you open.
 * - vs-open: one player opened, no callers yet.
 * - vs-3bet: you opened and someone 3bet.
 * - vs-4bet: you 3bet and the opener 4bet.
 * - squeeze: an open and one caller before you.
 * - vs-squeeze: you opened, someone called and someone behind squeezed.
 * - bvb: blind vs blind spots with a limp (SB limp or raise, BB vs a limp, SB facing a raise after limping).
 * - vs-limp: limpers before you.
 * - straddle: you open in a straddled pot, the straddle acting as the big blind.
 */
export type ChartSpot = 'rfi' | 'vs-open' | 'vs-3bet' | 'vs-4bet' | 'squeeze' | 'vs-squeeze' | 'bvb' | 'vs-limp' | 'straddle' | 'push-fold';

/**
 * Where the numbers come from.
 * - starter-approx: written by hand to match published solver results. Close, not exact.
 * - model-approx: derived by rule from a starter chart (see chartModel.ts). An estimate, never a solve.
 */
export type ChartSource = 'starter-approx' | 'model-approx' | 'solver-import' | 'custom';

export interface ChartSpec {
  id: string;
  title: string;
  game: GameFormat;
  tableSize: number;
  stackBb: number;
  hero: Position;
  /** Who acted before hero and how, e.g. "BTN opens 2.5bb". Empty for opens. */
  versus?: string;
  /** Spot family, used to group charts and order the drill deck. */
  spot: ChartSpot;
  /** Equilibrium baseline, or a deliberate exploit of a player pool. */
  basis: 'gto' | 'exploit';
  /** Where the numbers come from. Starter charts are approximations. */
  source: ChartSource;
  /** What the chart assumes that a player might not, such as the open size. Shown with the chart. */
  note?: string;
  /**
   * Hands that can reach this spot, e.g. the opening range for a chart that
   * faces a 3bet. Other hands are never drilled or scored. Omit when every
   * hand can be dealt into the spot.
   */
  reach?: string;
  actions: ChartActionSpec[];
  /**
   * The game's standard open in big blinds (the first raise from any seat
   * but the small blind). Missing means CHART_OPEN_BB. For a defense chart it
   * is the size faced; for an open or a 3bet answer it is your own.
   */
  openBb?: number;
  /**
   * The seats this chart covers for the player hero is up against: the
   * opener, the 3bettor, the 4bettor or the squeezer (the last raiser), or the
   * limper in a blind vs blind pot. Several seats when they play alike.
   */
  villains?: Position[];
  /** Seats the caller can sit in, for squeeze spots. */
  caller?: Position[];
  /** Limpers before hero. */
  limpers?: number;
  /** For model-approx charts: the starter chart it comes from and what changed, in words. */
  derived?: { from: string; how: string };
  /** In the review deck for its table size. Other charts are for viewing, practice and Play. */
  core?: boolean;
}

/** A chart's identity and labels without its ranges: enough to list and pick it. */
export type ChartMeta = Omit<ChartSpec, 'actions' | 'reach'>;

/** Stack depths the library covers, in big blinds. */
export const CHART_STACKS = [40, 60, 100, 150, 200] as const;
/** Standard open sizes the library covers, in big blinds: online 2.5bb, then 3bb and the live 4bb and 5bb. */
export const CHART_OPENS = [2.5, 3, 4, 5] as const;

/** The open size a chart assumes. */
export function chartOpenBb(spec: Pick<ChartSpec, 'openBb'>): number {
  return spec.openBb ?? CHART_OPEN_BB;
}

export function chartFormatLabel(spec: ChartSpec): string {
  const game = spec.game === 'mtt' ? 'tournament' : 'cash';
  return `${spec.tableSize}-handed ${game}, ${spec.stackBb}bb`;
}

/** Charts for a table size, falling back to the nearest size that has charts. */
export function chartsForTable<T extends Pick<ChartSpec, 'tableSize' | 'game'>>(
  charts: readonly T[],
  tableSize: number,
  game: GameFormat,
): { charts: T[]; tableSize: number; exact: boolean } {
  const pool = charts.filter((c) => c.game === game).length > 0 ? charts.filter((c) => c.game === game) : [...charts];
  if (pool.length === 0) return { charts: [], tableSize, exact: false };
  const sizes = [...new Set(pool.map((c) => c.tableSize))];
  // Nearest size wins; ties go to the larger table (ranges err tight).
  const best = sizes.reduce((a, b) => {
    const da = Math.abs(a - tableSize);
    const db = Math.abs(b - tableSize);
    return db < da || (db === da && b > a) ? b : a;
  });
  return { charts: pool.filter((c) => c.tableSize === best), tableSize: best, exact: best === tableSize };
}

/** Frequency of each action (plus "fold") for one hand class. */
export type HandMix = Record<string, number>;

export interface Chart {
  spec: ChartSpec;
  mixes: Map<HandClass, HandMix>;
  /** Hands that can reach the spot, when the spec limits them. */
  reach?: ReadonlySet<HandClass>;
}

/** Whether a hand can be in this spot at all. */
export function reaches(chart: Chart, hand: HandClass): boolean {
  return !chart.reach || chart.reach.has(hand);
}

export function buildChart(spec: ChartSpec): Chart {
  const ranges = spec.actions.map((a) => ({ id: a.id, range: parseRange(a.range) }));
  const mixes = new Map<HandClass, HandMix>();
  for (const hand of ALL_HAND_CLASSES) {
    const mix: HandMix = {};
    let left = 1;
    for (const { id, range } of ranges) {
      const take = Math.min(range.get(hand) ?? 0, left);
      if (take > 0) {
        mix[id] = take;
        left -= take;
      }
    }
    if (left > 1e-9) mix.fold = left;
    mixes.set(hand, mix);
  }
  if (!spec.reach) return { spec, mixes };
  const reach = new Set([...parseRange(spec.reach)].filter(([, f]) => f > 0).map(([h]) => h));
  return { spec, mixes, reach };
}

/** Share of all combos that take each action. */
export function actionFrequencies(chart: Chart): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const [hand, mix] of chart.mixes) {
    for (const [action, freq] of Object.entries(mix)) {
      totals[action] = (totals[action] ?? 0) + (freq * comboCount(hand)) / 1326;
    }
  }
  return totals;
}

/** Hand classes and frequencies that take a given action, as a range map. */
export function actionRange(chart: Chart, actionId: string): Map<HandClass, number> {
  const out = new Map<HandClass, number>();
  for (const [hand, mix] of chart.mixes) if (mix[actionId]) out.set(hand, mix[actionId]);
  return out;
}

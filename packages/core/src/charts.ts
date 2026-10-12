import { ALL_HAND_CLASSES, comboCount, type HandClass, parseRange } from './ranges';
import type { GameFormat, Position } from './settings';

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
  spot: 'rfi' | 'vs-open' | 'vs-3bet' | 'vs-limp' | 'push-fold';
  /** Equilibrium baseline, or a deliberate exploit of a player pool. */
  basis: 'gto' | 'exploit';
  /** Where the numbers come from. Starter charts are approximations. */
  source: 'starter-approx' | 'solver-import' | 'custom';
  /** What the chart assumes that a player might not, such as the open size. Shown with the chart. */
  note?: string;
  /**
   * Hands that can reach this spot, e.g. the opening range for a chart that
   * faces a 3bet. Other hands are never drilled or scored. Omit when every
   * hand can be dealt into the spot.
   */
  reach?: string;
  actions: ChartActionSpec[];
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

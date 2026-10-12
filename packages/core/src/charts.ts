import { ALL_HAND_CLASSES, comboCount, type HandClass, parseRange } from './ranges';

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
  /** e.g. "6-max cash, 100bb" */
  format: string;
  hero: string;
  /** Who acted before hero and how, e.g. "BTN opens 2.5bb". Empty for opens. */
  versus?: string;
  /** Where the numbers come from. Starter charts are approximations. */
  source: 'starter-approx' | 'solver-import' | 'custom';
  actions: ChartActionSpec[];
}

/** Frequency of each action (plus "fold") for one hand class. */
export type HandMix = Record<string, number>;

export interface Chart {
  spec: ChartSpec;
  mixes: Map<HandClass, HandMix>;
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
  return { spec, mixes };
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

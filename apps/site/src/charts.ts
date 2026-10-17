import { buildChart, comboCount, gridHandClass, type HandClass } from '@felt/core';
import { STARTER_CHARTS } from '@felt/content/charts';

/** The 13x13 grid in chart order: row and column 0 is the ace, suited hands above the diagonal. */
export const GRID: HandClass[][] = Array.from({ length: 13 }, (_, r) => Array.from({ length: 13 }, (_, c) => gridHandClass(r, c)));

/** Open frequency of every hand in one of the app's starter charts. */
export function openRange(chartId: string, action = 'raise'): Map<HandClass, number> {
  const spec = STARTER_CHARTS.find((c) => c.id === chartId);
  if (!spec) throw new Error(`No chart ${chartId}`);
  const chart = buildChart(spec);
  const out = new Map<HandClass, number>();
  for (const [hand, mix] of chart.mixes) out.set(hand, mix[action] ?? 0);
  return out;
}

/** Share of all 1326 combos a range plays, counting mixed hands by their frequency. */
export function rangeShare(range: Map<HandClass, number>): number {
  let combos = 0;
  for (const [hand, f] of range) combos += comboCount(hand) * f;
  return combos / 1326;
}

export interface Seat {
  key: string;
  short: string;
  name: string;
  range: Map<HandClass, number>;
  share: number;
}

/** The four seats the site paints, from the app's 9 handed, 100bb opening charts. */
export const SEATS: Seat[] = [
  { key: 'utg', short: 'UTG', name: 'Under the gun' },
  { key: 'hj', short: 'HJ', name: 'Hijack' },
  { key: 'co', short: 'CO', name: 'Cutoff' },
  { key: 'btn', short: 'BTN', name: 'Button' },
].map((s) => {
  const range = openRange(`9max-100-rfi-${s.key}`);
  return { ...s, range, share: rangeShare(range) };
});

/** Whole percent, as players say it. */
export const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Equity the big blind needs to call an open when everyone else folds, before
 * rake. Limpers fold too, so their chips are dead money in the pot.
 */
export function bbCallEquity(openBb: number, limpers = 0): number {
  const call = openBb - 1;
  const finalPot = openBb + 0.5 + 1 + limpers + call;
  return call / finalPot;
}

/** Live raise size: the open plus 1bb for every limper, as the app teaches. */
export const raiseOverLimpers = (openBb: number, limpers: number) => openBb + limpers;

import { STARTER_CHARTS } from '@felt/content';
import { buildChart, type Chart, chartsForTable, type GameSettings } from '@felt/core';

const BUILT = new Map<string, Chart>(STARTER_CHARTS.map((spec) => [spec.id, buildChart(spec)]));

export function getChart(id: string): Chart | undefined {
  return BUILT.get(id);
}

/** Charts that fit the current game, with a flag when we fell back to another table size. */
export function chartsForGame(game: GameSettings) {
  const pick = chartsForTable(STARTER_CHARTS, game.tableSize, game.format);
  return { ...pick, charts: pick.charts.map((spec) => BUILT.get(spec.id)!) };
}

/** Hands that make a good first question: well known, and not the obvious premiums. */
const FIRST_HANDS = ['A5s', 'KTs', 'QJs', 'A9o', 'K9s', 'T9s', 'J9s', 'KJo', 'QTs', 'A8o', '98s'];

/**
 * A first hand for setup: the button open in the player's game, with a hand
 * the chart plays most of the time. Mostly, not always, so the answer shows
 * a real mix, and still clear enough that a sensible first answer counts.
 */
export function firstHandSpot(game: GameSettings): { chart: Chart; hand: string } | undefined {
  const { charts } = chartsForGame(game);
  const chart = charts.find((c) => c.spec.spot === 'rfi' && c.spec.hero === 'BTN') ?? charts.find((c) => c.spec.spot === 'rfi');
  if (!chart) return undefined;
  const plays = (hand: string) =>
    Object.entries(chart.mixes.get(hand) ?? {})
      .filter(([action]) => action !== 'fold')
      .reduce((sum, [, f]) => sum + f, 0);
  const hand = FIRST_HANDS.find((h) => plays(h) >= 0.8 && plays(h) < 1) ?? FIRST_HANDS.find((h) => plays(h) === 1);
  return hand ? { chart, hand } : undefined;
}

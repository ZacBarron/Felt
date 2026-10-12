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

import { CHART_LIBRARY, chartSpec, STARTER_CHARTS } from '@felt/content';
import {
  buildChart,
  type Chart,
  type ChartFit,
  chartFit,
  type ChartMeta,
  type ChartQuery,
  chartsForTable,
  closestCharts,
  type GameSettings,
  openSize,
} from '@felt/core';

/**
 * Charts on the app side. The library holds over two thousand charts (the
 * hand written starters and their derived stack and open size variants), so
 * charts are built on first use and cached.
 */

const BUILT = new Map<string, Chart>();

export function getChart(id: string): Chart | undefined {
  let c = BUILT.get(id);
  if (!c) {
    const spec = chartSpec(id);
    if (!spec) return undefined;
    c = buildChart(spec);
    BUILT.set(id, c);
  }
  return c;
}

/** The player's game as a chart query. */
export function chartQuery(game: GameSettings): ChartQuery {
  return { format: game.format, tableSize: game.tableSize, stackBb: game.stackBb, openBb: openSize(game) };
}

const REVIEW = STARTER_CHARTS.filter((s) => s.core);

/**
 * The review set for a game: the hand written review charts for the nearest
 * table size, with a flag when we fell back to another size. It depends only
 * on the table size and format, so saved cards keep their charts when the
 * stack or open size changes.
 */
export function chartsForGame(game: Pick<GameSettings, 'tableSize' | 'format'>) {
  const pick = chartsForTable(REVIEW, game.tableSize, game.format);
  return { ...pick, charts: pick.charts.map((spec) => getChart(spec.id)!) };
}

/** Every chart in the library for the table size nearest the game's, with the size used. */
export function libraryForGame(game: GameSettings): { charts: ChartMeta[]; tableSize: number; exact: boolean } {
  const { tableSize, exact } = chartsForTable(CHART_LIBRARY, game.tableSize, game.format);
  return { charts: CHART_LIBRARY.filter((c) => c.tableSize === tableSize && (c.game === game.format || !CHART_LIBRARY.some((x) => x.game === game.format))), tableSize, exact };
}

/** The closest chart to the game for every spot, one per spot. */
export function closestForGame(game: GameSettings) {
  return closestCharts(CHART_LIBRARY, chartQuery(game));
}

/** How well a chart fits the player's game. */
export function fitForGame(chart: Pick<ChartMeta, 'tableSize' | 'stackBb' | 'openBb'>, game: GameSettings): ChartFit {
  return chartFit(chart, chartQuery(game));
}

export const chartMeta = (id: string): ChartMeta | undefined => CHART_LIBRARY.find((c) => c.id === id);

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

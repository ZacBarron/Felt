import { CHART_LIBRARY, STARTER_CHARTS } from '@felt/content';
import { chartItemDifficulty, type ChartMeta, drillHands, type GameSettings, type HandRole, noveltyPick } from '@felt/core';
import { closestForGame, getChart, libraryForGame } from './charts';
import { chartKey, handKey, markSeen, seenMap } from './seen';

/**
 * Range quizzes across many spots. Each set draws charts from the player's
 * pool, spread across spot types, seats, villains, stacks and table sizes,
 * then one hand per chart: mostly mixed hands and close calls, sometimes a
 * clear hand. Charts and hands seen recently wait their turn.
 */

export type QuizPool = 'game' | 'stacks' | 'tables';

export const QUIZ_POOLS: { value: QuizPool; label: string; note: string }[] = [
  { value: 'game', label: 'My game', note: 'The closest chart for every spot in your game.' },
  { value: 'stacks', label: 'All stacks', note: 'Every stack and open size at your table size. Most of these charts are estimates.' },
  { value: 'tables', label: '6-max and full ring', note: 'Every chart for both table sizes. Most of these charts are estimates.' },
];

export interface QuizItem {
  chartId: string;
  hand: string;
  role: HandRole;
  /** The chart is derived by rule, so the UI says it is an estimate. */
  estimate: boolean;
}

/** Charts are not repeated within three days, and hands of a chart within a week, while others are left. */
const CHART_WINDOW_MS = 3 * 24 * 3600 * 1000;
const HAND_WINDOW_MS = 7 * 24 * 3600 * 1000;

/** The charts a pool holds. */
export function poolCharts(game: GameSettings, pool: QuizPool): ChartMeta[] {
  if (pool === 'game') return closestForGame(game).charts;
  if (pool === 'stacks') return libraryForGame(game).charts;
  const format = CHART_LIBRARY.some((c) => c.game === game.format) ? game.format : CHART_LIBRARY[0].game;
  return CHART_LIBRARY.filter((c) => c.game === format);
}

/** Labels a set is spread across. */
export const chartFacets = (m: ChartMeta) => [
  `spot:${m.spot}`,
  `seat:${m.hero}`,
  `villain:${(m.villains ?? []).join('/')}`,
  `stack:${m.stackBb}`,
  `open:${m.openBb ?? 2.5}`,
  `table:${m.tableSize}`,
];

/**
 * Picks charts so every spot type is equally likely, whatever its count:
 * there are many more defense charts than squeeze charts.
 */
export function pickCharts(charts: readonly ChartMeta[], n: number, rand: () => number, now = Date.now()): ChartMeta[] {
  const perSpot = new Map<string, number>();
  for (const c of charts) perSpot.set(c.spot, (perSpot.get(c.spot) ?? 0) + 1);
  const seen = seenMap('c:');
  return noveltyPick(charts, {
    n,
    key: (m) => chartKey(m.id),
    weight: (m) => 1 / perSpot.get(m.spot)!,
    facets: chartFacets,
    seen,
    now,
    windowMs: CHART_WINDOW_MS,
    rand,
  });
}

/** One hand from a chart, weighted to the hands that decide what you know, skipping recent ones and `avoid`. */
export function pickHand(
  chartId: string,
  rand: () => number,
  { now = Date.now(), avoid = new Set<string>(), roles }: { now?: number; avoid?: ReadonlySet<string>; roles?: readonly HandRole[] } = {},
): { hand: string; role: HandRole } | undefined {
  const chart = getChart(chartId);
  if (!chart) return undefined;
  const hands = drillHands(chart).filter((h) => !avoid.has(h.hand) && (!roles || roles.includes(h.role)));
  const [pick] = noveltyPick(hands, {
    n: 1,
    key: (h) => handKey(chartId, h.hand),
    weight: (h) => h.weight,
    seen: seenMap(`h:${chartId}:`),
    now,
    windowMs: HAND_WINDOW_MS,
    rand,
  });
  return pick && { hand: pick.hand, role: pick.role };
}

/** A set of range questions from a pool, no hand class twice. */
export function dealSpotQuiz(game: GameSettings, pool: QuizPool, { n = 10, rand = Math.random, now = Date.now() }: { n?: number; rand?: () => number; now?: number } = {}): QuizItem[] {
  const charts = pickCharts(poolCharts(game, pool), n, rand, now);
  const used = new Set<string>();
  const out: QuizItem[] = [];
  for (const m of charts) {
    const pick = pickHand(m.id, rand, { now, avoid: used });
    if (!pick) continue;
    used.add(pick.hand);
    out.push({ chartId: m.id, hand: pick.hand, role: pick.role, estimate: m.source === 'model-approx' });
  }
  return out;
}

/** Marks a question as seen, so the next sets bring other spots and hands. */
export function markQuizSeen(item: Pick<QuizItem, 'chartId' | 'hand'>, now = Date.now()) {
  markSeen([chartKey(item.chartId), handKey(item.chartId, item.hand)], now);
}

/**
 * Rated chart decisions for practice: hand written equilibrium charts at the
 * game's table size, every spot type, close calls and mixed hands only (a
 * clear hand is not a fair rated question). Derived charts never feed the
 * rating, so they are not here.
 */
export function ratedChartPool(game: Pick<GameSettings, 'tableSize' | 'format'>): ChartMeta[] {
  const sizes = [...new Set(STARTER_CHARTS.map((c) => c.tableSize))];
  const size = sizes.reduce((a, b) => (Math.abs(b - game.tableSize) < Math.abs(a - game.tableSize) || (Math.abs(b - game.tableSize) === Math.abs(a - game.tableSize) && b > a) ? b : a));
  return STARTER_CHARTS.filter((s) => s.tableSize === size && s.basis === 'gto').map(({ actions: _a, reach: _r, ...meta }) => meta);
}

/** Rated decisions for a practice session: charts spread across spots, then a close call or mixed hand from each. */
export function ratedChartPicks(game: Pick<GameSettings, 'tableSize' | 'format'>, n: number, rand: () => number, now = Date.now()) {
  const charts = pickCharts(ratedChartPool(game), n, rand, now);
  const used = new Set<string>();
  const out: { chartId: string; hand: string; difficulty: number }[] = [];
  for (const m of charts) {
    const chart = getChart(m.id)!;
    // A rated hand sits on an edge or mixes, and some answer is wrong.
    const pick = pickHand(m.id, rand, { now, avoid: used, roles: ['mixed', 'close'] });
    if (!pick) continue;
    const difficulty = chartItemDifficulty(chart.mixes.get(pick.hand) ?? { fold: 1 }, [...chart.spec.actions.map((a) => a.id), 'fold']);
    if (difficulty === undefined) continue;
    used.add(pick.hand);
    out.push({ chartId: m.id, hand: pick.hand, difficulty });
  }
  return out;
}

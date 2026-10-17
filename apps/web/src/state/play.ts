import { botById, type BotCharacter, CHART_LIBRARY, STARTER_CHARTS } from '@felt/content';
import {
  ALL_HAND_CLASSES,
  botRange,
  boundaryHands,
  type Chart,
  chartFit,
  type ChartMeta,
  chartOpenBb,
  CHART_OPEN_BB,
  closestVariant,
  chartItemDifficulty,
  comboCount,
  type DecisionGrade,
  DIFFICULTY,
  gradeCall,
  gradeDecision,
  HAND_STRENGTH_ORDER,
  type HandMix,
  handClassOf,
  type HandState,
  legalActions,
  type PlayAction,
  type PlayDecision,
  type Position,
  positionsFor,
  potSize,
  type PreflopAdvice,
  type PreflopAdvisor,
  type PreflopSpot,
  preflopSpot,
  reaches,
  scoreRecall,
  seededRng,
} from '@felt/core';
import { getChart } from './charts';
import { recordRated } from './rating';

/**
 * Play on the app side: Aced's charts as the bots' preflop advisor, and the
 * grades for the player's decisions. See docs/PLAY.md for what each grade
 * tier means and what it leaves out.
 */

/** The seat the player sits in. The button moves around the table each hand. */
export const HERO = 0;

const NINE = positionsFor(9);
const SIX = positionsFor(6);

/**
 * The 9-handed seat with the same number of players behind. Aced's charts
 * follow the players behind you, so a 7-handed UTG plays like a 9-handed UTG+2.
 */
export function chartPosition(position: string, tableSize: number): string | undefined {
  if (tableSize < 3 || tableSize > 9) return undefined;
  const order = positionsFor(tableSize);
  const behind = order.length - 1 - order.indexOf(position);
  return order.indexOf(position) === -1 ? undefined : NINE[8 - behind];
}

/**
 * The library format and seat for a seat at the table: 6-max charts for 3 to
 * 6 players, 9-handed charts for 7 to 10, matched by the players behind. At
 * 10 players the two earliest seats both use UTG.
 */
export function chartSeat(position: string, tableSize: number): { tableSize: 6 | 9; seat: Position; exact: boolean } | undefined {
  if (tableSize < 3 || tableSize > 10) return undefined;
  const order = positionsFor(tableSize);
  const i = order.indexOf(position);
  if (i === -1) return undefined;
  const behind = order.length - 1 - i;
  if (tableSize <= 6) return { tableSize: 6, seat: SIX[5 - behind], exact: tableSize === 6 };
  return { tableSize: 9, seat: NINE[Math.max(0, 8 - behind)], exact: tableSize === 9 };
}

const NINE_RFI = STARTER_CHARTS.filter((c) => c.tableSize === 9 && c.game === 'cash' && c.spot === 'rfi');

export interface SpotChart {
  chart: Chart;
  /** The spot matches what the chart assumes closely enough to grade by it and rate it. */
  exact: boolean;
  /** Why the match is not exact, in a short sentence. */
  why?: string;
}

/** Options for finding a chart: what the player did, which can decide between two strategies. */
export interface SpotChartOptions {
  /** The player limped from the small blind: grade by the limp or raise chart. */
  limped?: boolean;
  /** The size the player raised to, for an open. */
  raiseTo?: number;
}

/**
 * The game's standard open behind an actual raise size. The small blind
 * opens at least 3bb, so a 3bb small blind open counts as a 2.5bb game.
 */
const standardOpen = (opener: Position, to: number) => (opener === 'SB' && to <= 3 + 1e-9 ? 2.5 : to);

const sizeWords = (n: number) => `${Math.round(n * 10) / 10}bb`;

/**
 * The chart that covers a preflop spot, if one does: the right spot type and
 * seats, at the stack and open size nearest to the hand's. Hand written
 * charts that match the stack and size are exact. Derived charts, and charts
 * for another stack or size, still grade the spot but say why it is
 * approximate.
 */
export function chartForSpot(spot: PreflopSpot, opts: SpotChartOptions = {}): SpotChart | undefined {
  const at = chartSeat(spot.position, spot.tableSize);
  if (!at) return undefined;
  const seatOf = (p: Position) => chartSeat(p, spot.tableSize)?.seat;
  const lib = CHART_LIBRARY.filter((c) => c.tableSize === at.tableSize && c.game === 'cash');
  const hero = at.seat;
  const line = spot.line ?? [];
  const raises = line.filter((a) => a.kind === 'raise');
  const firstRaise = raises[0];
  // Calls after the first raise and before the next one: callers of the open.
  const coldCallers = line.slice(firstRaise ? line.indexOf(firstRaise) + 1 : 0, raises[1] ? line.indexOf(raises[1]) : undefined).filter((a) => a.kind === 'call');

  let candidates: ChartMeta[] = [];
  let openBb = CHART_OPEN_BB;
  let why: string | undefined;
  const pick = (test: (m: ChartMeta) => boolean) => lib.filter((m) => m.hero === hero && test(m));

  if (spot.kind === 'open') {
    if (hero === 'SB' && opts.limped) candidates = pick((m) => m.spot === 'bvb' && !m.villains);
    else candidates = pick((m) => m.spot === 'rfi');
    openBb = opts.raiseTo !== undefined ? standardOpen(hero, opts.raiseTo) : CHART_OPEN_BB;
  } else if (spot.kind === 'limped') {
    if (hero === 'BB' && spot.limpers === 1 && line[0]?.position === 'SB') candidates = pick((m) => m.spot === 'bvb' && !!m.limpers);
    else if (spot.limpers <= 3) candidates = pick((m) => m.spot === 'vs-limp' && m.limpers === spot.limpers);
    else why = 'No chart covers more than three limpers.';
  } else if (spot.kind === 'raised') {
    const opener = seatOf(spot.raisers[0]);
    if (spot.limpers === 1 && hero === 'SB' && opener === 'BB') {
      candidates = pick((m) => m.spot === 'bvb' && !!m.villains?.includes('BB'));
    } else if (spot.limpers > 0) {
      why = 'No chart covers a raise after limpers.';
    } else if (spot.callers === 0) {
      candidates = pick((m) => m.spot === 'vs-open' && m.villains?.[0] === opener);
      openBb = standardOpen(spot.raisers[0], spot.raiseTo);
    } else if (spot.callers === 1) {
      const caller = coldCallers[0] ? seatOf(coldCallers[0].position) : undefined;
      const squeezes = pick((m) => m.spot === 'squeeze' && m.villains?.[0] === opener);
      candidates = squeezes.filter((m) => !!caller && !!m.caller?.includes(caller));
      if (candidates.length === 0 && squeezes.length > 0) {
        candidates = squeezes;
        why = `The squeeze chart assumes the caller sits in ${squeezes[0].caller!.join(' or ')}.`;
      }
      if (candidates.length === 0) why = 'No squeeze chart covers this opener and seat.';
      openBb = standardOpen(spot.raisers[0], firstRaise?.to ?? spot.raiseTo);
      if (Math.abs(openBb - CHART_OPEN_BB) > 0.5) why ??= `The squeeze charts assume a ${sizeWords(CHART_OPEN_BB)} open.`;
    } else why = 'No chart covers an open with two or more callers.';
  } else if (spot.kind === '3bet' && spot.reraised && spot.raisers.length === 2 && spot.raisers[0] === spot.position) {
    const threeBettor = seatOf(spot.raisers[1]);
    if (spot.callers > 0) why = 'No chart covers a 3bet that someone has already called.';
    else if (coldCallers.length === 1) {
      candidates = pick((m) => m.spot === 'vs-squeeze' && !!m.villains?.includes(threeBettor ?? ''));
      if (candidates.length === 0) why = 'No chart covers this squeeze.';
    } else if (coldCallers.length > 1) why = 'No chart covers a squeeze with two callers.';
    else candidates = pick((m) => m.spot === 'vs-3bet' && !!threeBettor && !!m.villains?.includes(threeBettor));
    openBb = standardOpen(spot.position, firstRaise?.to ?? CHART_OPEN_BB);
  } else if (spot.kind === '4bet' && spot.reraised && spot.raisers.length === 3 && spot.raisers[1] === spot.position && spot.raisers[0] === spot.raisers[2]) {
    const opener = seatOf(spot.raisers[0]);
    if (spot.callers > 0 || coldCallers.length > 0) why = 'No chart covers a 4bet pot with callers.';
    else candidates = pick((m) => m.spot === 'vs-4bet' && m.villains?.[0] === opener);
    if (candidates.length === 0) why ??= 'The 4bet charts cover the common seat pairs only.';
  }

  const meta = closestVariant(candidates, { stackBb: spot.stackBb, openBb });
  const chart = meta ? getChart(meta.id) : undefined;
  if (!chart || !meta) return undefined;
  const fit = chartFit(meta, { format: 'cash', tableSize: at.tableSize, stackBb: spot.stackBb, openBb });
  if (!why && !fit.open) why = `The nearest chart assumes a ${sizeWords(chartOpenBb(meta))} open, not ${sizeWords(openBb)}.`;
  if (!why && !fit.stack) why = `The nearest chart is for ${meta.stackBb}bb stacks, not ${Math.round(spot.stackBb)}bb.`;
  if (!why && meta.source === 'model-approx') why = `Aced derived this ${meta.stackBb}bb, ${sizeWords(chartOpenBb(meta))} chart by rule. It is an estimate.`;
  if (!why && !at.exact && spot.tableSize === 10) why = 'The chart is for 9 players, not 10.';
  return { chart, exact: !why, why };
}

const widths = new Map<string, number>();
/** Share of all starting combos a chart continues with. */
function chartWidth(chart: Chart): number {
  let w = widths.get(chart.spec.id);
  if (w === undefined) {
    // A chart leaves fold out for hands it always plays; a hand with no mix at all folds.
    const foldOf = (h: string) => { const m = chart.mixes.get(h); return m ? (m.fold ?? 0) : 1; };
    w = ALL_HAND_CLASSES.reduce((s, h) => s + comboCount(h) * (1 - foldOf(h)), 0) / 1326;
    widths.set(chart.spec.id, w);
  }
  return w;
}

// Approximate preflop ranges --------------------------------------------------------

const RFI_SEATS = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];

/**
 * Hands in the order Aced's opening charts add them: what UTG opens first,
 * then what each later seat adds, then the rest by equity against a random
 * hand. Approximate ranges for spots with no chart take the top of this order.
 */
export const PLAY_ORDER: string[] = (() => {
  const tier = (h: string) => {
    const i = RFI_SEATS.findIndex((pos) => {
      const spec = NINE_RFI.find((c) => c.hero === pos);
      const m = spec ? getChart(spec.id)?.mixes.get(h) : undefined;
      return !!m && 1 - (m.fold ?? 0) >= 0.5;
    });
    return i === -1 ? RFI_SEATS.length : i;
  };
  const eq = new Map(HAND_STRENGTH_ORDER.map((x) => [x.hand as string, x.equity]));
  return [...ALL_HAND_CLASSES].sort((a, b) => tier(a) - tier(b) || eq.get(b)! - eq.get(a)!);
})();

const ORDER_ABOVE = new Map<string, number>();
{
  let seen = 0;
  for (const h of PLAY_ORDER) {
    ORDER_ABOVE.set(h, seen / 1326);
    seen += comboCount(h);
  }
}

/** Share of combos ahead of this hand in `PLAY_ORDER`: 0 for AA. */
export const playPercentile = (hand: string) => ORDER_ABOVE.get(hand) ?? 1;

/** Share of combos a seat opens, from its 9-handed chart. */
function openWidth(position: string | undefined, tableSize: number): number {
  if (tableSize === 2) return 0.8;
  const seat = position ? chartPosition(position, tableSize) : undefined;
  const spec = NINE_RFI.find((c) => c.hero === seat);
  const chart = spec ? getChart(spec.id) : undefined;
  return chart ? chartWidth(chart) : 0.12;
}

/** Edges are soft: hands within this share of a boundary count either way. */
const EDGE = 0.012;

/** A pure mix from thresholds: the first band raises, the second calls, the rest folds (or checks). */
function bands(p: number, raiseTo: number, callTo: number): HandMix {
  const near = (edge: number) => Math.abs(p - edge) < EDGE;
  if (near(raiseTo) && raiseTo > 0) return callTo > raiseTo ? { raise: 0.5, call: 0.5 } : { raise: 0.5, fold: 0.5 };
  if (p < raiseTo) return { raise: 1 };
  if (near(callTo) && callTo > raiseTo) return { call: 0.5, fold: 0.5 };
  if (p < callTo) return { call: 1 };
  return { fold: 1 };
}

export interface ApproxRange {
  mix: HandMix;
  /** Share of combos that continue. */
  width: number;
  /** What the range is, in a short sentence. */
  what: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * An approximate range for a preflop spot no chart covers, built from
 * Aced's own opening charts: a defense takes the top of the opener's range,
 * a 3bet answer the top of your own. Rules of thumb, so the app labels them
 * approximate and they never feed the rating.
 */
export function approxRange(spot: PreflopSpot, hand: string): ApproxRange {
  const p = playPercentile(hand);
  const late = spot.position === 'CO' || spot.position === 'BTN';
  const crowd = 0.75 ** (spot.callers + (spot.kind === 'raised' ? spot.limpers : 0));
  let raise = 0;
  let call = 0;
  let what = '';
  switch (spot.kind) {
    case 'open': {
      raise = spot.tableSize === 2 ? 0.8 : openWidth(spot.position, spot.tableSize);
      what = `An open from the ${spot.position} plays about ${pct(raise)} of hands.`;
      break;
    }
    case 'limped': {
      if (spot.position === 'BB') [raise, call] = [0.1, 1];
      else if (spot.position === 'SB') [raise, call] = [0.08, 0.3];
      else [raise, call] = late ? [0.12, 0.22] : [0.08, 0.08];
      what = `Against limpers, raise about the top ${pct(raise)} of hands${call > raise && spot.position !== 'BB' ? ' and limp behind with some more' : ''}.`;
      break;
    }
    case 'raised': {
      const w = openWidth(spot.raisers[0], spot.tableSize);
      if (spot.position === 'BB') [raise, call] = [w * 0.22 * crowd, Math.min(0.55, w * 1.6) * crowd];
      else if (spot.position === 'SB') [raise, call] = [w * 0.25 * crowd, w * 0.25 * crowd];
      else [raise, call] = [w * 0.15 * crowd, w * 0.4 * crowd];
      what = `Against a ${spot.raisers[0]} open of about ${pct(w)}, this range 3bets the top ${pct(raise)} and continues with ${pct(call)}.`;
      break;
    }
    case '3bet': {
      if (spot.reraised) {
        const w = openWidth(spot.position, spot.tableSize);
        const ip = spot.position !== 'SB' && spot.position !== 'BB';
        [raise, call] = [w * 0.12, w * (ip ? 0.45 : 0.35)];
        what = `After opening about ${pct(w)}, keep the top ${pct(call)} against a 3bet and 4bet the best ${pct(raise)}.`;
      } else {
        [raise, call] = [0.02, 0.03];
        what = 'Facing a 3bet you have not put money into, play only the top 3% of hands.';
      }
      break;
    }
    case '4bet': {
      [raise, call] = [0.02, 0.03];
      what = 'Facing a 4bet, continue only with the top 3% of hands.';
      break;
    }
  }
  raise = Math.min(raise, 1);
  call = Math.min(Math.max(call, raise), 1);
  return { mix: bands(p, raise, call), width: call, what };
}

/** The bots' preflop baseline: Aced's chart wherever one covers the spot. */
export const chartAdvisor: PreflopAdvisor = (spot, hand): PreflopAdvice | undefined => {
  const found = chartForSpot(spot);
  if (!found) {
    // No chart: the same approximate range the player is graded by.
    const a = approxRange(spot, hand);
    return { mix: a.mix, width: a.width };
  }
  const mix = found.chart.mixes.get(hand);
  if (!mix) return undefined;
  return { mix, width: chartWidth(found.chart) };
};

// Seats ------------------------------------------------------------------------------

export interface PlaySeat {
  bot?: BotCharacter;
}

/** Seats for a table: the player first, then bots from the preset in order. */
export function seatsFor(tableSize: number, botIds: readonly string[]): PlaySeat[] {
  return [{}, ...botIds.slice(0, tableSize - 1).map((id) => ({ bot: botById(id) }))];
}

// Grades -----------------------------------------------------------------------------

export type GradeTier = 'chart' | 'approx' | 'bot' | 'none';

export interface PlayGrade {
  tier: GradeTier;
  /** Index into the hand's decisions. */
  index: number;
  street: HandState['street'];
  /** What the player did, in words. */
  did: string;
  grade?: DecisionGrade;
  /** One or two short sentences on the grade, or on why there is none. */
  detail: string;
  /** EV given up in bb, when the grade has an EV. */
  evLoss?: number;
  /** For a chart grade: the chart and hand, so the mistake can go to Review. */
  chart?: { id: string; hand: string };
  /** For a chart grade: the chart's mix for the hand, in words. */
  mix?: string;
  /** Rated toward the Aced Rating. */
  rated: boolean;
}

const fmt = (n: number) => (Math.abs(n) >= 10 || Number.isInteger(n) ? String(Math.round(n * 10) / 10) : n.toFixed(1));

export function actionText(state: HandState, action: PlayAction): string {
  const legal = legalActions(state);
  switch (action.kind) {
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return legal.callAllIn ? `Call all in ${fmt(legal.call)}` : `Call ${fmt(legal.call)}`;
    case 'bet':
    case 'raise': {
      const allIn = legal.raise && action.to >= legal.raise.max - 1e-9;
      const word = action.kind === 'bet' ? 'Bet' : 'Raise to';
      return allIn ? `All in ${fmt(action.to)}` : `${word} ${fmt(action.to)}`;
    }
  }
}

/** The chart action id an engine action stands for. */
function chartActionId(chart: Chart, action: PlayAction): string {
  if (action.kind === 'fold') return 'fold';
  if (action.kind === 'call' || action.kind === 'check') return 'call';
  return chart.spec.actions.find((a) => a.id !== 'call')?.id ?? 'raise';
}

const mixWords = (chart: Chart, hand: string) =>
  Object.entries(chart.mixes.get(hand) ?? { fold: 1 })
    .filter(([, f]) => f > 0.005)
    .sort((a, b) => b[1] - a[1])
    .map(([id, f]) => `${id === 'fold' ? 'Fold' : (chart.spec.actions.find((a) => a.id === id)?.label ?? id)} ${Math.round(f * 100)}%`)
    .join(', ');

const approxActionId = (action: PlayAction) => (action.kind === 'fold' ? 'fold' : action.kind === 'call' || action.kind === 'check' ? 'call' : 'raise');

function approxWords(mix: HandMix): string {
  const parts = Object.entries(mix).filter(([, f]) => f > 0);
  const word = (id: string) => (id === 'raise' ? 'raises' : id === 'call' ? 'calls' : 'folds');
  return parts.length === 1 ? `${word(parts[0][0])} here` : `sits on the edge, so ${word(parts[0][0])} and ${word(parts[1][0])} both count`;
}

function gradeOfScore(score: number): DecisionGrade {
  return score >= 1 ? 'best' : score > 0 ? 'inaccuracy' : 'mistake';
}

/**
 * Grades every decision the player made in a finished hand. Preflop against
 * the chart, calls and folds against the bots' real ranges, the rest left
 * ungraded with a reason.
 */
export function gradeHand(history: readonly PlayDecision[], seats: readonly PlaySeat[], seed: number): PlayGrade[] {
  const grades: PlayGrade[] = [];
  const rng = seededRng(seed ^ 0x5eed);
  history.forEach((d, index) => {
    if (d.state.toAct !== HERO) return;
    const { state, action } = d;
    const did = actionText(state, action);
    const me = state.players[HERO];
    const base = { index, street: state.street, did };
    if (state.street === 'preflop') {
      const spot = preflopSpot(state, HERO);
      // What the player did can pick the chart: a small blind limp is graded by the limp or raise chart, an open by its size.
      const found = chartForSpot(spot, { limped: spot.kind === 'open' && action.kind === 'call', raiseTo: action.kind === 'raise' ? action.to : undefined });
      const hand = handClassOf(me.cards[0], me.cards[1]);
      if (!found || !reaches(found.chart, hand)) {
        // No chart fits: grade by the approximate range, never toward the rating.
        const a = approxRange(spot, hand);
        const score = scoreRecall(a.mix, approxActionId(action));
        grades.push({ ...base, tier: 'approx', grade: gradeOfScore(score), detail: `${a.what} ${hand} ${approxWords(a.mix)}.`, rated: false });
        return;
      }
      if (!found.exact) {
        const mix = found.chart.mixes.get(hand) ?? { fold: 1 };
        const score = scoreRecall(mix, chartActionId(found.chart, action));
        grades.push({
          ...base,
          tier: 'approx',
          grade: gradeOfScore(score),
          detail: `${found.why} Graded by ${found.chart.spec.title} (${found.chart.spec.stackBb}bb, ${chartOpenBb(found.chart.spec)}bb opens), which plays ${hand} as ${mixWords(found.chart, hand)}.`,
          rated: false,
        });
        return;
      }
      const mix = found.chart.mixes.get(hand) ?? { fold: 1 };
      const score = scoreRecall(mix, chartActionId(found.chart, action));
      grades.push({
        ...base,
        tier: 'chart',
        grade: gradeOfScore(score),
        detail: `${found.chart.spec.title}. The chart plays ${hand} as ${mixWords(found.chart, hand)}.`,
        chart: { id: found.chart.spec.id, hand },
        mix: mixWords(found.chart, hand),
        rated: boundaryHands(found.chart).includes(hand) && chartItemDifficulty(mix, [...found.chart.spec.actions.map((a) => a.id), 'fold']) !== undefined,
      });
      return;
    }
    const legal = legalActions(state);
    if (legal.call > 0 && (action.kind === 'call' || action.kind === 'fold')) {
      const prior = history.slice(0, index);
      const ranges = state.players
        .filter((p) => !p.folded && p.seat !== HERO && seats[p.seat]?.bot)
        .map((p) => ({ seat: p.seat, range: botRange(prior, p.seat, me.cards, seats[p.seat].bot!.profile, chartAdvisor) }));
      const g = gradeCall(state, HERO, ranges, rng);
      const pot = potSize(state);
      const node = { pot, actions: [{ id: 'call', label: 'Call', frequency: 0, ev: g.evCall }, { id: 'fold', label: 'Fold', frequency: 0, ev: 0 }] };
      const graded = gradeDecision(node, action.kind);
      const better = g.evCall >= 0 ? 'call' : 'fold';
      const share = `${Math.round(g.equity * 100)}%`;
      const how = g.exact ? 'against the hands this bot bets here' : 'against the bots’ ranges if the hand checks down';
      const caveat = g.stillToAct > 0 ? ' Players still to act are left out.' : '';
      grades.push({
        ...base,
        tier: 'bot',
        grade: graded.grade,
        evLoss: graded.evLoss,
        detail: `Your equity is ${share} ${how}. A call is worth ${fmt(g.evCall)}bb, so ${better === 'call' ? 'calling' : 'folding'} is better.${caveat}`,
        rated: g.exact && g.stillToAct === 0,
      });
      return;
    }
    const why = action.kind === 'check' ? 'Checks are not graded yet.' : action.kind === 'raise' ? 'Raises after the flop are not graded yet.' : 'Bets after the flop are not graded yet.';
    grades.push({ ...base, tier: 'none', detail: `${why} Solver grading for them comes next.`, rated: false });
  });
  return grades;
}

/** Records the rated grades toward the Aced Rating. */
export async function rateHand(grades: readonly PlayGrade[], history: readonly PlayDecision[], handId: string) {
  for (const g of grades) {
    if (!g.rated || !g.grade) continue;
    const score = g.grade === 'best' || g.grade === 'correct' ? 1 : g.grade === 'inaccuracy' ? 0.5 : 0;
    if (g.tier === 'chart' && g.chart) {
      // Only close calls count, the same hands the drills rate. Folding 72o proves nothing.
      const chart = getChart(g.chart.id)!;
      if (!boundaryHands(chart).includes(g.chart.hand)) continue;
      const difficulty = chartItemDifficulty(chart.mixes.get(g.chart.hand) ?? { fold: 1 }, [...chart.spec.actions.map((a) => a.id), 'fold']);
      if (difficulty !== undefined) await recordRated({ itemId: `play:edge:${g.chart.id}:${g.chart.hand}:${handId}`, domain: 'preflop', difficulty, score, source: 'play' });
    } else if (g.tier === 'bot' && history[g.index]) {
      await recordRated({ itemId: `play:${handId}:${g.index}`, domain: 'exploit', difficulty: DIFFICULTY.playCall, score, source: 'play' });
    }
  }
}

/** Whether the player's first decision is a hand the chart folds every time: Play can skip it. */
export function isClearFold(state: HandState): boolean {
  if (state.toAct !== HERO || state.street !== 'preflop') return false;
  const found = chartForSpot(preflopSpot(state, HERO));
  if (!found?.exact) return false;
  const me = state.players[HERO];
  const hand = handClassOf(me.cards[0], me.cards[1]);
  const mix = found.chart.mixes.get(hand);
  // A chart leaves fold out for hands it always plays.
  return (mix ? (mix.fold ?? 0) : 1) >= 0.999 && legalActions(state).fold;
}

/** Coaching notes for a finished hand. Never graded. */
export function handNotes(history: readonly PlayDecision[]): string[] {
  const notes: string[] = [];
  const flop = history.find((d) => d.state.street === 'flop' && d.state.toAct === HERO);
  if (flop) {
    const s = flop.state;
    const behind = Math.min(...s.players.filter((p) => !p.folded).map((p) => p.stack + p.street));
    const spr = behind / Math.max(potSize(s) - s.players.reduce((a, p) => a + p.street, 0), s.bb);
    const players = s.players.filter((p) => !p.folded).length;
    notes.push(`The SPR on the flop was ${fmt(spr)}. ${spr < 4 ? 'At that depth a strong pair is often worth all your chips.' : 'At that depth one pair rarely wants to get all in.'}`);
    if (players >= 3) notes.push(`You saw the flop ${players} ways. With more players in the pot, bet less often and with stronger hands.`);
  }
  return notes;
}

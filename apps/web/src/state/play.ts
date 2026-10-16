import { botById, type BotCharacter, STARTER_CHARTS } from '@felt/content';
import {
  ALL_HAND_CLASSES,
  botRange,
  boundaryHands,
  type Chart,
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
 * Play on the app side: Suited's charts as the bots' preflop advisor, and the
 * grades for the player's decisions. See docs/PLAY.md for what each grade
 * tier means and what it leaves out.
 */

/** The seat the player sits in. The button moves around the table each hand. */
export const HERO = 0;

const NINE = positionsFor(9);

/**
 * The 9-handed seat with the same number of players behind. Suited's charts
 * follow the players behind you, so a 7-handed UTG plays like a 9-handed UTG+2.
 */
export function chartPosition(position: string, tableSize: number): string | undefined {
  if (tableSize < 3 || tableSize > 9) return undefined;
  const order = positionsFor(tableSize);
  const behind = order.length - 1 - order.indexOf(position);
  return order.indexOf(position) === -1 ? undefined : NINE[8 - behind];
}

const NINE_CHARTS = STARTER_CHARTS.filter((c) => c.tableSize === 9 && c.game === 'cash');

export interface SpotChart {
  chart: Chart;
  /** The spot matches what the chart assumes closely enough to grade by it. */
  exact: boolean;
  /** Why the match is not exact, in a short sentence. */
  why?: string;
}

/** The chart that covers a preflop spot, if one does. */
export function chartForSpot(spot: PreflopSpot): SpotChart | undefined {
  const hero = chartPosition(spot.position, spot.tableSize);
  if (!hero) return undefined;
  const raisers = spot.raisers.map((r) => chartPosition(r, spot.tableSize));
  const pick = (test: (spec: (typeof NINE_CHARTS)[number]) => boolean) => {
    const spec = NINE_CHARTS.find((c) => c.hero === hero && test(c));
    return spec ? getChart(spec.id) : undefined;
  };
  let chart: Chart | undefined;
  let why: string | undefined;
  if (spot.kind === 'open') chart = pick((c) => c.spot === 'rfi');
  else if (spot.kind === 'limped' && spot.limpers <= 2) chart = pick((c) => c.spot === 'vs-limp' && c.id.endsWith(`${spot.limpers}limp`));
  else if (spot.kind === 'raised' && spot.limpers === 0) {
    chart = pick((c) => c.spot === 'vs-open' && !!c.versus?.startsWith(`${raisers[0]} opens`));
    if (spot.callers > 0) why = 'The chart assumes no one has called the open.';
    else if (spot.raiseTo < 2 || spot.raiseTo > 3) why = 'The chart assumes a 2.5bb open.';
  } else if (spot.kind === '3bet' && spot.reraised && spot.raisers.length === 2 && spot.raisers[0] === spot.position) {
    chart = pick((c) => c.spot === 'vs-3bet' && (!c.versus?.includes('BB 3bets') || raisers[1] === 'BB'));
    if (spot.callers > 0) why = 'The chart assumes no one has called the 3bet.';
  }
  if (!chart) return undefined;
  if (!why && (spot.stackBb < 60 || spot.stackBb > 150)) why = 'The chart assumes about 100bb stacks.';
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
 * Hands in the order Suited's opening charts add them: what UTG opens first,
 * then what each later seat adds, then the rest by equity against a random
 * hand. Approximate ranges for spots with no chart take the top of this order.
 */
export const PLAY_ORDER: string[] = (() => {
  const tier = (h: string) => {
    const i = RFI_SEATS.findIndex((pos) => {
      const spec = NINE_CHARTS.find((c) => c.spot === 'rfi' && c.hero === pos);
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
  const spec = NINE_CHARTS.find((c) => c.spot === 'rfi' && c.hero === seat);
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
 * Suited's own opening charts: a defense takes the top of the opener's range,
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

/** The bots' preflop baseline: Suited's chart wherever one covers the spot. */
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
  /** Rated toward the Suited Rating. */
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
      const found = chartForSpot(spot);
      const hand = handClassOf(me.cards[0], me.cards[1]);
      if (!found || !reaches(found.chart, hand) || (!found.exact && spot.callers + spot.limpers > 0)) {
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
          detail: `${found.why} Graded by ${found.chart.spec.title}, which plays ${hand} as ${mixWords(found.chart, hand)}.`,
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

/** Records the rated grades toward the Suited Rating. */
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

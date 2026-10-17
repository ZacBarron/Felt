import { type Chart, type HandMix, reaches } from './charts';
import { hashString } from './hash';
import { ALL_HAND_CLASSES, comboCount, type HandClass } from './ranges';

/**
 * Range drills: what to ask, how to score answers, and which cards to show.
 *
 * Mixed hands are judged with a tolerance: any action the chart takes at
 * least ACCEPT_THRESHOLD of the time is a correct answer, and the reveal
 * always shows the full mix so the learner absorbs the frequencies.
 */

export const ACCEPT_THRESHOLD = 0.25;
export const RECALL_TARGET_MS = 3000;
export const PAINT_TARGET_MS = 60_000;

/** Most frequent action for a hand. Ties go to the more aggressive (earlier listed) action. */
export function primaryAction(mix: HandMix): string {
  let best = 'fold';
  let bestFreq = -1;
  for (const [action, freq] of Object.entries(mix)) {
    if (freq > bestFreq + 1e-9) {
      best = action;
      bestFreq = freq;
    }
  }
  return best;
}

export function isMixed(mix: HandMix): boolean {
  return Object.values(mix).filter((f) => f >= 0.1).length > 1;
}

/**
 * The hands worth drilling one by one: mixed hands and any hand whose main
 * action differs from any of its eight grid neighbours. Learning the edges teaches the whole
 * chart; nobody needs a card for AA or 72o.
 */
export function boundaryHands(chart: Chart): HandClass[] {
  const primary = ALL_HAND_CLASSES.map((h) => primaryAction(chart.mixes.get(h) ?? { fold: 1 }));
  return ALL_HAND_CLASSES.filter((hand, i) => {
    if (!reaches(chart, hand)) return false;
    if (isMixed(chart.mixes.get(hand) ?? { fold: 1 })) return true;
    const row = Math.floor(i / 13);
    const col = i % 13;
    // Diagonals count so the pair ladder (TT next to 99) has edges too.
    const neighbours: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr;
        const c = col + dc;
        // Hands that never reach the spot are not edges: a 4bet hand next to an unopened hand is not borderline.
        if ((dr || dc) && r >= 0 && r < 13 && c >= 0 && c < 13 && reaches(chart, ALL_HAND_CLASSES[r * 13 + c])) neighbours.push([r, c]);
      }
    }
    return neighbours.some(([r, c]) => primary[r * 13 + c] !== primary[i]);
  });
}

/** How a hand sits in a chart: a real mix, a close call next to another action, or a clear play. */
export type HandRole = 'mixed' | 'close' | 'clear';

/** How much more often each kind of hand is drilled. Clear hands still come up, so the obvious ones stay honest. */
export const ROLE_WEIGHT: Record<HandRole, number> = { mixed: 4, close: 3, clear: 0.5 };

/**
 * Every hand that can reach the spot, with its role and a drill weight.
 * Mixed hands and close calls carry most of the weight, since they decide
 * what a player really knows.
 */
export function drillHands(chart: Chart): { hand: HandClass; role: HandRole; weight: number }[] {
  const edges = new Set(boundaryHands(chart));
  return ALL_HAND_CLASSES.filter((h) => reaches(chart, h)).map((hand) => {
    const role: HandRole = isMixed(chart.mixes.get(hand) ?? { fold: 1 }) ? 'mixed' : edges.has(hand) ? 'close' : 'clear';
    return { hand, role, weight: ROLE_WEIGHT[role] };
  });
}

/** Accuracy of one quick recall answer: 1 correct, 0.5 a rare mix, 0 wrong. */
export function scoreRecall(mix: HandMix, chosen: string): number {
  const freq = mix[chosen] ?? 0;
  if (freq >= ACCEPT_THRESHOLD || chosen === primaryAction(mix)) return 1;
  return freq > 0 ? 0.5 : 0;
}

export interface PaintScore {
  /** Correct share of the combos that matter (in the chart or painted). */
  accuracy: number;
  wrong: HandClass[];
  wrongCombos: number;
  relevantCombos: number;
}

/**
 * Scores a painted chart. Unpainted hands count as fold. Only hands that the
 * chart plays or the learner painted count, so the 60% of obvious folds do
 * not inflate the score.
 */
export function scorePainting(chart: Chart, painted: ReadonlyMap<HandClass, string>): PaintScore {
  const wrong: HandClass[] = [];
  let wrongCombos = 0;
  let relevantCombos = 0;
  for (const hand of ALL_HAND_CLASSES) {
    if (!reaches(chart, hand)) continue;
    const mix = chart.mixes.get(hand) ?? { fold: 1 };
    const answer = painted.get(hand) ?? 'fold';
    const plays = 1 - (mix.fold ?? 0) > 1e-9;
    if (!plays && answer === 'fold') continue;
    const combos = comboCount(hand);
    relevantCombos += combos;
    if (scoreRecall(mix, answer) < 1) {
      wrong.push(hand);
      wrongCombos += combos;
    }
  }
  return {
    accuracy: relevantCombos === 0 ? 1 : 1 - wrongCombos / relevantCombos,
    wrong,
    wrongCombos,
    relevantCombos,
  };
}

/** How far a painted mix may sit from the chart and still count as right. */
export const MIX_TOLERANCE = 0.2;

/**
 * Share of play that differs between two mixes (total variation distance).
 * Fold fills whatever the listed actions leave, so {raise: 0.75} means
 * raise 75% and fold 25%. 0 is identical, 1 shares nothing.
 */
export function mixDistance(a: HandMix, b: HandMix): number {
  const actions = new Set([...Object.keys(a), ...Object.keys(b)].filter((x) => x !== 'fold'));
  const sum = (m: HandMix) => [...actions].reduce((t, x) => t + (m[x] ?? 0), 0);
  let diff = Math.abs(1 - sum(a) - (1 - sum(b)));
  for (const x of actions) diff += Math.abs((a[x] ?? 0) - (b[x] ?? 0));
  return diff / 2;
}

export interface MixPaintScore extends PaintScore {
  /** 1 minus the combo weighted average distance, over the hands that matter. */
  closeness: number;
}

/**
 * Scores a chart painted with frequencies. A hand is right when the painted
 * mix is within MIX_TOLERANCE of the chart. Unpainted hands count as fold,
 * and hands that never reach the spot are skipped.
 */
export function scoreMixPainting(chart: Chart, painted: ReadonlyMap<HandClass, HandMix>): MixPaintScore {
  const wrong: HandClass[] = [];
  let wrongCombos = 0;
  let relevantCombos = 0;
  let distance = 0;
  for (const hand of ALL_HAND_CLASSES) {
    if (!reaches(chart, hand)) continue;
    const mix = chart.mixes.get(hand) ?? { fold: 1 };
    const answer = painted.get(hand) ?? { fold: 1 };
    const plays = (m: HandMix) => Object.entries(m).some(([a, f]) => a !== 'fold' && f > 1e-9);
    if (!plays(mix) && !plays(answer)) continue;
    const combos = comboCount(hand);
    const d = mixDistance(mix, answer);
    relevantCombos += combos;
    distance += d * combos;
    if (d > MIX_TOLERANCE + 1e-9) {
      wrong.push(hand);
      wrongCombos += combos;
    }
  }
  return {
    accuracy: relevantCombos === 0 ? 1 : 1 - wrongCombos / relevantCombos,
    closeness: relevantCombos === 0 ? 1 : 1 - distance / relevantCombos,
    wrong,
    wrongCombos,
    relevantCombos,
  };
}

/** A paint brush: the mix it lays down and a short name for it. */
export interface MixBrush {
  id: string;
  label: string;
  mix: HandMix;
}

/**
 * Brushes for painting a chart with frequencies: each action at 100, 75, 50
 * and 25 percent (the rest folds), plus an even split for each pair of
 * actions the chart really mixes, like 3bet or call.
 */
export function mixBrushes(chart: Chart, labels: Record<string, string> = {}): MixBrush[] {
  const actions = chart.spec.actions.map((a) => a.id).filter((a) => a !== 'fold');
  const name = (a: string) => labels[a] ?? a;
  const out: MixBrush[] = [];
  for (const a of actions) {
    for (const f of [1, 0.75, 0.5, 0.25]) {
      out.push({ id: `${a}:${f}`, label: f === 1 ? name(a) : `${name(a)} ${f * 100}%`, mix: { [a]: f } });
    }
  }
  for (let i = 0; i < actions.length; i++) {
    for (let j = i + 1; j < actions.length; j++) {
      const [a, b] = [actions[i], actions[j]];
      const mixes = [...chart.mixes.values()].some((m) => (m[a] ?? 0) >= 0.2 && (m[b] ?? 0) >= 0.2);
      if (mixes) out.push({ id: `${a}+${b}`, label: `${name(a)} or ${name(b)}`, mix: { [a]: 0.5, [b]: 0.5 } });
    }
  }
  return out;
}

/** One answer to "what do you do with this hand?": a pure action or a mix. */
export interface MixAnswer {
  id: string;
  label: string;
  mix: HandMix;
  pure: boolean;
}

/**
 * Answers for a hand quiz. Every pure action plus fold, then mixes: for a
 * chart with one action, that action at 75, 50 and 25 percent; for charts
 * with more, an even split for each pair of actions (fold included) that
 * some hand in the chart really mixes.
 */
export function mixAnswerOptions(chart: Chart, labels: Record<string, string> = {}): MixAnswer[] {
  const name = (a: string) => labels[a] ?? a;
  const actions = chart.spec.actions.map((a) => a.id).filter((a) => a !== 'fold');
  const pure: MixAnswer[] = [...actions, 'fold'].map((a) => ({ id: a, label: name(a), mix: { [a]: 1 }, pure: true }));
  const mixed: MixAnswer[] = [];
  if (actions.length === 1) {
    const a = actions[0];
    for (const f of [0.75, 0.5, 0.25]) mixed.push({ id: `${a}:${f}`, label: `${name(a)} ${f * 100}%`, mix: { [a]: f }, pure: false });
  } else {
    const all = [...actions, 'fold'];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const [a, b] = [all[i], all[j]];
        const freq = (m: HandMix, x: string) => (x === 'fold' ? 1 - actions.reduce((t, y) => t + (m[y] ?? 0), 0) : (m[x] ?? 0));
        const used = [...chart.mixes.values()].some((m) => freq(m, a) >= 0.2 && freq(m, b) >= 0.2);
        if (!used) continue;
        const mix: HandMix = b === 'fold' ? { [a]: 0.5 } : { [a]: 0.5, [b]: 0.5 };
        mixed.push({ id: `${a}+${b}`, label: `${name(a)} or ${name(b).toLowerCase()}`, mix, pure: false });
      }
    }
  }
  return [...pure, ...mixed];
}

export type MixVerdict = 'right' | 'close' | 'wrong';

export const CLOSE_TOLERANCE = 0.4;

/**
 * Scores a mix answer by how much of the play differs from the chart.
 * Within MIX_TOLERANCE is right. Within CLOSE_TOLERANCE (about one 25% step
 * further) is close and earns half credit, so picking the main action of a
 * 60/40 hand still counts for something.
 */
export function scoreMixAnswer(
  chartMix: HandMix,
  answer: HandMix,
  /** The answers the player could pick. When none comes within MIX_TOLERANCE, the closest ones count as right. */
  options?: readonly HandMix[],
): { accuracy: number; verdict: MixVerdict; distance: number } {
  const distance = mixDistance(chartMix, answer);
  // A 25/75 mix sits between the buttons on offer, so never ask for more than the buttons allow.
  const best = options?.length ? Math.min(...options.map((o) => mixDistance(chartMix, o))) : 0;
  const right = Math.max(MIX_TOLERANCE, best);
  const close = Math.max(CLOSE_TOLERANCE, best + (CLOSE_TOLERANCE - MIX_TOLERANCE));
  if (distance <= right + 1e-9) return { accuracy: 1, verdict: 'right', distance };
  if (distance <= close + 1e-9 || partOfMix(chartMix, answer)) return { accuracy: 0.5, verdict: 'close', distance };
  return { accuracy: 0, verdict: 'wrong', distance };
}

/** A real share of a mix: one 25% step. */
export const PART_OF_MIX = 0.25;

/**
 * True when the answer is one action that the chart plays at least
 * PART_OF_MIX of the time. At equilibrium every action in a mix earns the
 * same, so taking one of them is never a miss, though it misses the mix.
 */
export function partOfMix(chartMix: HandMix, answer: HandMix): boolean {
  // Only a pure answer: one action all of the time.
  const used = Object.entries(answer).filter(([, f]) => f > 0);
  if (used.length !== 1 || used[0][1] < 1 - 1e-9) return false;
  const action = used[0][0];
  // Fold is whatever the chart does not play.
  const share = action === 'fold' ? 1 - Object.entries(chartMix).reduce((t, [a, f]) => (a === 'fold' ? t : t + f), 0) : (chartMix[action] ?? 0);
  return share >= PART_OF_MIX - 1e-9;
}

export interface CardSeed {
  id: string;
  kind: 'range-recall';
  mode: 'quick' | 'paint';
  chartId: string;
  hand?: HandClass;
  targetMs: number;
}

/**
 * The deck for a set of charts, in the order new cards are introduced:
 * a chart's edge hands one by one, then painting the whole chart.
 */
export function deckForCharts(charts: readonly Chart[]): CardSeed[] {
  return charts.flatMap((chart) => [
    ...boundaryHands(chart).map(
      (hand): CardSeed => ({
        id: `recall:${chart.spec.id}:${hand}`,
        kind: 'range-recall',
        mode: 'quick',
        chartId: chart.spec.id,
        hand,
        targetMs: RECALL_TARGET_MS,
      }),
    ),
    {
      id: `paint:${chart.spec.id}`,
      kind: 'range-recall',
      mode: 'paint',
      chartId: chart.spec.id,
      targetMs: PAINT_TARGET_MS,
    },
  ]);
}

/** A stable order for a chart's hands that is not the grid order, so a chart's cards do not all start on the top row. */
function stableMix(chartId: string, hands: readonly HandClass[]): HandClass[] {
  return [...hands].sort((a, b) => hashString(`${chartId}|${a}`) - hashString(`${chartId}|${b}`) || (a < b ? -1 : 1));
}

/**
 * The deck in the order new cards are introduced, mixed together: a few
 * charts at a time (`active`), taken round robin across spot types, one
 * close call from each in turn. A chart's painting card follows its last
 * close call, and the next chart joins as one finishes. Cards in `known`
 * are skipped and free their place. Interleaving related charts helps
 * players tell them apart (Rohrer and Taylor 2007).
 */
export function mixedDeck(
  charts: readonly Chart[],
  { active = 16, known = new Set<string>() }: { active?: number; known?: ReadonlySet<string> } = {},
): CardSeed[] {
  const bySpot = new Map<string, Chart[]>();
  for (const c of charts) {
    const list = bySpot.get(c.spec.spot);
    if (list) list.push(c);
    else bySpot.set(c.spec.spot, [c]);
  }
  const lists = [...bySpot.values()];
  const order: Chart[] = [];
  for (let i = 0; order.length < charts.length; i++) for (const l of lists) if (i < l.length) order.push(l[i]);
  const queues = order
    .map((chart) => {
      const [paint, ...recall] = [...deckForCharts([chart])].reverse();
      const hands = new Map(recall.map((s) => [s.hand!, s]));
      return [...stableMix(chart.spec.id, [...hands.keys()]).map((h) => hands.get(h)!), paint].filter((s) => !known.has(s.id));
    })
    .filter((q) => q.length > 0);
  const out: CardSeed[] = [];
  const live: CardSeed[][] = [];
  let next = 0;
  while (live.length || next < queues.length) {
    while (live.length < active && next < queues.length) live.push(queues[next++]);
    for (const q of live) out.push(q.shift()!);
    for (let i = live.length - 1; i >= 0; i--) if (live[i].length === 0) live.splice(i, 1);
  }
  return out;
}

/**
 * The charts a review deck holds: its core charts, every extra chart that
 * already has a card (so saved cards stay in the deck), and one more extra
 * chart for every `perChart` cards in long term review. The deck grows as
 * the player does.
 */
export function growDeck<T extends { spec: { id: string } }>(
  core: readonly T[],
  extra: readonly T[],
  { mature, started, perChart = 30 }: { mature: number; started: ReadonlySet<string>; perChart?: number },
): T[] {
  const coreIds = new Set(core.map((c) => c.spec.id));
  const rest = extra.filter((c) => !coreIds.has(c.spec.id));
  let unlocked = Math.floor(Math.max(0, mature) / perChart);
  const out = [...core];
  for (const c of rest) {
    if (started.has(c.spec.id)) out.push(c);
    else if (unlocked > 0) {
      out.push(c);
      unlocked--;
    }
  }
  return out;
}

export interface ScheduledCard {
  id: string;
  due: Date;
}

/** Due cards (oldest first) plus as many unseen seeds as today's new card budget allows. */
export function selectQueue<T extends ScheduledCard>(
  known: readonly T[],
  seeds: readonly CardSeed[],
  { now, newPerDay, newIntroducedToday }: { now: Date; newPerDay: number; newIntroducedToday: number },
): { due: T[]; fresh: CardSeed[] } {
  const due = known.filter((c) => c.due <= now).sort((a, b) => a.due.getTime() - b.due.getTime());
  const knownIds = new Set(known.map((c) => c.id));
  const budget = Math.max(0, newPerDay - newIntroducedToday);
  const fresh = seeds.filter((s) => !knownIds.has(s.id)).slice(0, budget);
  return { due, fresh };
}

/**
 * Extra practice after the due cards: an endless supply so a session never
 * hits a dead end. Known cards come soonest due first (they are the closest
 * to being forgotten), with unseen cards mixed in, two known to one new.
 * Cards answered moments ago are skipped, since recall from the screen
 * teaches nothing.
 */
export function selectExtra<T extends ScheduledCard>(
  known: readonly T[],
  seeds: readonly CardSeed[],
  { n, exclude = new Set<string>() }: { n: number; exclude?: ReadonlySet<string> },
): (T | CardSeed)[] {
  const knownIds = new Set(known.map((c) => c.id));
  const soon = known.filter((c) => !exclude.has(c.id)).sort((a, b) => a.due.getTime() - b.due.getTime());
  const unseen = seeds.filter((s) => !knownIds.has(s.id) && !exclude.has(s.id));
  const out: (T | CardSeed)[] = [];
  let k = 0;
  let u = 0;
  while (out.length < n && (k < soon.length || u < unseen.length)) {
    // Two known cards for every new one; fall back to whichever pile has cards left.
    const wantNew = out.length % 3 === 2;
    if ((wantNew && u < unseen.length) || k >= soon.length) out.push(unseen[u++]);
    else out.push(soon[k++]);
  }
  return out;
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Consecutive study days ending today, or yesterday if today has no study yet. */
export function studyStreak(studyDates: readonly Date[], now: Date): number {
  const days = new Set(studyDates.map(dayKey));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

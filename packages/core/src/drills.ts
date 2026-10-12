import type { Chart, HandMix } from './charts';
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
    if (isMixed(chart.mixes.get(hand) ?? { fold: 1 })) return true;
    const row = Math.floor(i / 13);
    const col = i % 13;
    // Diagonals count so the pair ladder (TT next to 99) has edges too.
    const neighbours: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr;
        const c = col + dc;
        if ((dr || dc) && r >= 0 && r < 13 && c >= 0 && c < 13) neighbours.push([r, c]);
      }
    }
    return neighbours.some(([r, c]) => primary[r * 13 + c] !== primary[i]);
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

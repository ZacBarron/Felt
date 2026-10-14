import { SCENARIOS, STARTER_CHARTS } from '@felt/content';
import {
  boundaryHands,
  chartItemDifficulty,
  DIFFICULTY,
  isMixed,
  type IsoWeek,
  isoWeek,
  MATH_FACTS,
  mathFact,
  mixAnswerOptions,
  primaryAction,
  scoreMixAnswer,
  type WeeklyCandidate,
  weeklyPicks,
  type WeeklySlot,
} from '@felt/core';
import { isPro } from './access';
import { getChart } from './charts';
import { db, type StoredWeekly, type WeeklyDecision } from './db';
import { entryFor, LESSON_ENTRIES, quizSteps } from './lessons';
import { lessonQuizDifficulty } from './rating';
import { addHandsToReview } from './review';
import { saveLessonStep } from './saved';
import type { Access } from './settings';

/**
 * The weekly challenge, a Felt Pro event: the same 10 harder decisions for
 * every Pro player in an ISO week, drawn from the hardest material Felt can
 * grade objectively. Range decisions are graded by mix distance with mixed
 * answers offered, so a mixed strategy is never collapsed to one action.
 */

export type { WeeklyDecision };

export type WeeklyKind = 'math' | 'mixed' | 'edge' | 'river' | 'lesson';

export const WEEKLY_SIZE = 10;

/** How the 10 decisions split across spot types. The set is sorted from easiest to hardest afterwards. */
export const WEEKLY_SLOTS: readonly (WeeklySlot & { kind: WeeklyKind })[] = [
  { kind: 'math', count: 1 },
  { kind: 'mixed', count: 3 },
  { kind: 'edge', count: 2 },
  { kind: 'river', count: 2 },
  { kind: 'lesson', count: 2 },
];

export const KIND_LABELS: Record<WeeklyKind, string> = {
  math: 'Math',
  mixed: 'Mixed hand',
  edge: 'Close call',
  river: 'River',
  lesson: 'Advanced question',
};

export type WeeklyCandidateItem = WeeklyCandidate & { kind: WeeklyKind; decision: WeeklyDecision };

export function weeklyAvailable(access: Access, now = new Date()): boolean {
  return isPro(access, now);
}

export function weeklyDecisionId(d: WeeklyDecision): string {
  if (d.kind === 'chart') return `chart:${d.chartId}:${d.hand}`;
  if (d.kind === 'quiz') return `quiz:${d.key}#${d.step}`;
  if (d.kind === 'math') return d.factId;
  return `scenario:${d.scenarioId}`;
}

/**
 * Everything the weekly challenge can draw from. Difficulties are the fixed
 * design priors, never this device's fitted values, so every player gets the
 * same set.
 */
export function weeklyPool(): WeeklyCandidateItem[] {
  const items: WeeklyCandidateItem[] = [];
  const add = (kind: WeeklyKind, difficulty: number, decision: WeeklyDecision) =>
    items.push({ id: weeklyDecisionId(decision), kind, difficulty, decision });

  for (const f of MATH_FACTS) add('math', DIFFICULTY.mathFact, { kind: 'math', factId: f.id });

  // Equilibrium charts only, and only hands where some answer is wrong.
  for (const spec of STARTER_CHARTS) {
    if (spec.basis !== 'gto') continue;
    const chart = getChart(spec.id);
    if (!chart) continue;
    const choices = [...chart.spec.actions.map((a) => a.id), 'fold'];
    const options = mixAnswerOptions(chart);
    for (const hand of boundaryHands(chart)) {
      const mix = chart.mixes.get(hand) ?? { fold: 1 };
      const difficulty = chartItemDifficulty(mix, choices);
      if (difficulty === undefined) continue;
      const decision: WeeklyDecision = { kind: 'chart', chartId: spec.id, hand };
      // Mixed hands where the mix matters: the main action alone is not enough, and an answer on screen is.
      if (isMixed(mix)) {
        const mainOnly = scoreMixAnswer(mix, { [primaryAction(mix)]: 1 }).accuracy;
        if (mainOnly < 1 && options.some((o) => scoreMixAnswer(mix, o.mix).accuracy === 1)) add('mixed', difficulty, decision);
      }
      // Pure close calls only when facing a raise or a 3bet.
      else if (spec.spot === 'vs-open' || spec.spot === 'vs-3bet') add('edge', difficulty, decision);
    }
  }

  for (const s of SCENARIOS) add('river', DIFFICULTY.scenarioRiver, { kind: 'river', scenarioId: s.id });

  for (const entry of LESSON_ENTRIES) {
    if (entry.content?.level !== 'advanced') continue;
    for (const step of quizSteps(entry)) add('lesson', lessonQuizDifficulty(entry.key), { kind: 'quiz', key: entry.key, step });
  }
  return items;
}

/** The week's set, the same for every player in that ISO week. */
export function weeklySet(date = new Date()): { week: IsoWeek; items: WeeklyCandidateItem[] } {
  const week = isoWeek(date);
  return { week, items: weeklyPicks(weeklyPool(), week, WEEKLY_SLOTS) };
}

/** The spot type of a stored decision, for labels. */
export function weeklyKind(d: WeeklyDecision): WeeklyKind {
  if (d.kind === 'math') return 'math';
  if (d.kind === 'river') return 'river';
  if (d.kind === 'quiz') return 'lesson';
  const mix = getChart(d.chartId)?.mixes.get(d.hand);
  return mix && isMixed(mix) ? 'mixed' : 'edge';
}

/** A title and a note for a decision row in the results. */
export function describeWeekly(d: WeeklyDecision): { title: string; note: string } {
  if (d.kind === 'chart') return { title: d.hand, note: getChart(d.chartId)?.spec.title ?? '' };
  if (d.kind === 'quiz') {
    const entry = entryFor(d.key);
    return { title: entry?.title ?? 'Lesson question', note: entry?.trackTitle ?? '' };
  }
  if (d.kind === 'math') {
    const f = mathFact(d.factId);
    return { title: f?.prompt ?? 'Math', note: 'Exact answer' };
  }
  const s = SCENARIOS.find((x) => x.id === d.scenarioId);
  return { title: s?.title ?? 'River decision', note: 'Graded by Felt Solver' };
}

/** Full credit, partial credit (within about one step of the mix) or a miss. */
export const weeklyVerdict = (s: number) => (s >= 1 ? 'Correct' : s > 0 ? 'Close' : 'Not quite');

export function getWeekly(id: string) {
  return db.weekly.get(id);
}

export function saveWeekly(record: StoredWeekly) {
  return db.weekly.put(record);
}

/** Every finished week, oldest first. */
export async function finishedWeeks(): Promise<StoredWeekly[]> {
  return (await db.weekly.orderBy('at').toArray()).filter((w) => w.finished).sort((a, b) => a.number - b.number);
}

export const weeklyAccuracy = (scores: readonly number[]) => (scores.length ? scores.reduce((t, s) => t + Math.max(0, Math.min(1, s)), 0) / scores.length : 0);

/** Missed range decisions and lesson questions, which can go into review. */
export function weeklyMisses(items: readonly WeeklyDecision[], scores: readonly number[]) {
  const hands: { chartId: string; hand: string }[] = [];
  const questions: { key: string; step: number }[] = [];
  items.forEach((d, i) => {
    if ((scores[i] ?? 0) >= 1) return;
    if (d.kind === 'chart') hands.push({ chartId: d.chartId, hand: d.hand });
    else if (d.kind === 'quiz') questions.push({ key: d.key, step: d.step });
  });
  return { hands, questions, count: hands.length + questions.length };
}

/** Hands go into the chart deck due now; lesson questions are saved, so they come back as review cards. */
export async function addWeeklyMissesToReview(items: readonly WeeklyDecision[], scores: readonly number[]) {
  const { hands, questions } = weeklyMisses(items, scores);
  await addHandsToReview(hands);
  for (const q of questions) await saveLessonStep(q.key, q.step);
}

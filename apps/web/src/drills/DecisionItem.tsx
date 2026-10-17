import { type Chart, chartItemDifficulty, type DrillOutcome } from '@felt/core';
import { useEffect, useRef, useState } from 'react';
import { StepView } from '../lesson/StepView';
import { isLessonFree } from '../state/access';
import { getChart } from '../state/charts';
import type { StoredAnswer } from '../state/db';
import { LESSON_ENTRIES } from '../state/lessons';
import { recordLessonQuiz, recordRated } from '../state/rating';
import { BottomBar } from '../ui/BottomBar';
import { QuickRecall } from './QuickRecall';

/** A single rated decision: a range decision from a chart, or a lesson question. */
export type Decision = { kind: 'chart'; chartId: string; hand: string } | { kind: 'quiz'; key: string; step: number };

/** The answers offered for a chart decision: its actions, then fold. */
export const chartChoices = (chart: Chart) => [...chart.spec.actions.map((a) => a.id), 'fold'];

export function decisionId(d: Decision) {
  return d.kind === 'chart' ? `chart:${d.chartId}:${d.hand}` : `quiz:${d.key}#${d.step}`;
}

interface Props {
  decision: Decision;
  source: StoredAnswer['source'];
  last: boolean;
  onScore: (score: number) => void;
  onNext: () => void;
  /** Grade range decisions by mix distance with mixed answers offered, whatever the setting. */
  mixAnswers?: boolean;
}

/** Renders a decision, records it toward the Aced Rating, and reports the score. */
export function DecisionItem({ decision, source, last, onScore, onNext, mixAnswers }: Props) {
  const [answered, setAnswered] = useState(false);
  // A new decision is read from the top by screen readers.
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => top.current?.focus({ preventScroll: true }), []);

  if (decision.kind === 'chart') {
    const chart = getChart(decision.chartId);
    if (!chart) return null;
    return (
      <div ref={top} tabIndex={-1} className="focus-anchor">
      <QuickRecall
        chart={chart}
        hand={decision.hand}
        targetMs={3000}
        mixAnswers={mixAnswers}
        onAnswer={(o: DrillOutcome) => {
          onScore(o.accuracy);
          const difficulty = chartItemDifficulty(chart.mixes.get(decision.hand) ?? { fold: 1 }, chartChoices(chart));
          if (difficulty !== undefined)
            void recordRated({ itemId: decisionId(decision), domain: 'preflop', difficulty, score: o.accuracy, source });
        }}
        onNext={onNext}
      />
      </div>
    );
  }

  const entry = LESSON_ENTRIES.find((e) => e.key === decision.key);
  const step = entry?.content?.steps[decision.step];
  if (!entry || step?.kind !== 'quiz') return null;
  return (
    <>
      <div className="lesson-stage from-right focus-anchor" ref={top} tabIndex={-1}>
        <div className="footnote" style={{ marginBottom: '0.4rem' }}>
          {entry.trackTitle}, {entry.title}
          {!isLessonFree(entry.key) && <span className="pill pro-pill">Aced Pro lesson</span>}
        </div>
        <StepView
          step={step}
          onAnswer={(choice) => {
            const right = choice === step.answer;
            setAnswered(true);
            onScore(right ? 1 : 0);
            void recordLessonQuiz(decision.key, decision.step, right, source);
          }}
        />
      </div>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={!answered} onClick={onNext}>
          {answered ? (last ? 'See my results' : 'Next decision') : 'Choose an answer'}
        </button>
      </BottomBar>
    </>
  );
}

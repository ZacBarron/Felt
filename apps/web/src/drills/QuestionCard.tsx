import { type DrillOutcome, mathFact } from '@felt/core';
import { lessonPoints, type LessonStep } from '@felt/content';
import { useRef, useState } from 'react';
import { StepView } from '../lesson/StepView';
import { LessonSheet } from '../lesson/LessonSheet';
import { entryFor } from '../state/lessons';
import { untimedMs, useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { LearnIcon, StatsIcon } from '../ui/icons';

interface Props {
  targetMs: number;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
  /** Label for the button after an answer. */
  nextLabel?: string;
}

const fmt = (v: number, unit: '%' | 'combos') => (unit === '%' ? `${v}%` : String(v));

/** One graded question with a source line on top. Shared by lesson questions and math facts. */
function Question({
  step,
  source,
  lessonKey,
  targetMs,
  onAnswer,
  onNext,
  nextLabel = 'Next card',
  points,
}: Props & { step: Extract<LessonStep, { kind: 'quiz' }>; source: React.ReactNode; lessonKey?: string; points?: string[] }) {
  const [reading, setReading] = useState(false);
  const started = useRef(performance.now());
  const untimed = !!useSettings().settings.study.untimed;
  const [done, setDone] = useState(false);
  return (
    <div className="stack">
      <div className="saved-head">{source}</div>
      <StepView
        step={step}
        points={points}
        onAnswer={(choice) => {
          setDone(true);
          onAnswer({ accuracy: choice === step.answer ? 1 : 0, responseMs: untimed ? untimedMs(targetMs) : performance.now() - started.current, targetMs });
        }}
      />
      {/* The lesson opens over the session after an answer, so it never gives the answer away or ends the session. */}
      {done && lessonKey && (
        <button className="btn btn-plain btn-block" onClick={() => setReading(true)}>
          Read the lesson again
        </button>
      )}
      {reading && lessonKey && <LessonSheet lessonKey={lessonKey} onClose={() => setReading(false)} />}
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={!done} onClick={onNext} autoFocus={done}>
          {done ? nextLabel : 'Choose an answer'}
        </button>
      </BottomBar>
    </div>
  );
}

/** A quiz question from a finished lesson, graded like the lesson grades it. */
export function LessonQuestionCard({ lessonKey, step: index, ...props }: Props & { lessonKey: string; step: number }) {
  const entry = entryFor(lessonKey);
  const step = entry?.content?.steps[index];
  if (!entry || step?.kind !== 'quiz')
    return (
      <>
        <p className="muted">This question has changed since you learned it.</p>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={props.onNext}>
            Next card
          </button>
        </BottomBar>
      </>
    );
  return (
    <Question
      {...props}
      step={step}
      lessonKey={lessonKey}
      points={entry.content ? lessonPoints(entry.content) : undefined}
      source={
        <>
          <LearnIcon size={16} />
          <span className="footnote grow">{entry.title}</span>
        </>
      }
    />
  );
}

/** A math fact with four choices. Every answer is exact. */
export function MathCard({ factId, ...props }: Props & { factId: string }) {
  const fact = mathFact(factId);
  if (!fact) return null;
  const step: Extract<LessonStep, { kind: 'quiz' }> = {
    kind: 'quiz',
    question: fact.prompt,
    choices: fact.choices.map((c) => fmt(c, fact.unit)),
    answer: fact.choices.indexOf(fact.answer),
    explain: fact.explain,
  };
  return (
    <Question
      {...props}
      step={step}
      source={
        <>
          <StatsIcon size={16} />
          <span className="footnote grow">Math fact</span>
          <span className="evidence evidence-math" style={{ pointerEvents: 'none' }}>
            Exact math
          </span>
        </>
      }
    />
  );
}

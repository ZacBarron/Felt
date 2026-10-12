import type { Evidence, LessonStep } from '@felt/content';
import { parseCards } from '@felt/core';
import { useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { haptic } from '../haptics';
import { getChart } from '../state/charts';
import { CheckIcon, CloseIcon } from '../ui/icons';
import { Rich } from './rich';

interface Props {
  step: LessonStep;
  /** Called once when a quiz is answered, with the chosen index. */
  onAnswer?: (choice: number) => void;
  /** A previous answer, so going back shows it instead of a fresh quiz. */
  answered?: number;
}

const EVIDENCE: Record<Evidence, { label: string; title: string }> = {
  math: { label: 'Exact math', title: 'Follows from the rules and arithmetic' },
  solver: { label: 'Solver pattern, approximate', title: 'How equilibrium strategies tend to play. Directional, not exact frequencies.' },
  exploit: { label: 'Player tendency', title: 'An assumption about players. Check it against your own hands.' },
};

function EvidenceTag({ evidence }: { evidence?: Evidence }) {
  if (!evidence) return null;
  const e = EVIDENCE[evidence];
  return (
    <span className={`evidence evidence-${evidence}`} title={e.title}>
      {e.label}
    </span>
  );
}

function StepTitle({ title, evidence }: { title: string; evidence?: Evidence }) {
  return (
    <div className="lesson-title-row">
      <h2 className="display lesson-h2">{title}</h2>
      <EvidenceTag evidence={evidence} />
    </div>
  );
}

/** Numbers, percentages and short comparisons like "20 vs 11%" stay right aligned. */
function isNumeric(cell: string): boolean {
  return /^[\d\s.,%+−\-/×÷≈:]+$/.test(cell.replace(/\bvs\b/g, ''));
}

const CALLOUT_LABEL = { tip: 'Tip', exploit: 'Exploit', theory: 'Theory' } as const;

export function StepView({ step, onAnswer, answered }: Props) {
  switch (step.kind) {
    case 'intro':
      return (
        <div className="lesson-step intro">
          <h2 className="display lesson-h1">{step.title}</h2>
          <p className="lesson-lead">
            <Rich text={step.body} />
          </p>
        </div>
      );
    case 'text':
      return (
        <div className="lesson-step">
          <StepTitle title={step.title} evidence={step.evidence} />
          {step.body.map((p, i) => (
            <p key={i} className="lesson-p">
              <Rich text={p} />
            </p>
          ))}
        </div>
      );
    case 'formula':
      return (
        <div className="lesson-step">
          <h2 className="display lesson-h2">{step.title}</h2>
          <div className="formula card">
            <div className="display formula-main">{step.formula}</div>
            {step.parts && (
              <div className="formula-parts">
                {step.parts.map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <span className="muted">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="lesson-p">
            <Rich text={step.example} />
          </p>
        </div>
      );
    case 'table': {
      const textCols = step.columns.map((_, j) => j > 0 && step.rows.some((r) => !isNumeric(r[j])));
      return (
        <div className="lesson-step">
          <StepTitle title={step.title} evidence={step.evidence} />
          <div className="card lesson-table">
            <table>
              <thead>
                <tr>
                  {step.columns.map((c, j) => (
                    <th key={c} className={textCols[j] ? 'text-col' : undefined}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {step.rows.map((r, i) => (
                  <tr key={i} style={{ animationDelay: `${i * 45}ms` }}>
                    {r.map((cell, j) => (
                      <td key={j} className={textCols[j] ? 'text-col' : undefined}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {step.note && <p className="footnote">{step.note}</p>}
        </div>
      );
    }
    case 'chart': {
      const chart = getChart(step.chartId);
      return (
        <div className="lesson-step">
          <h2 className="display lesson-h2">{step.title}</h2>
          {chart && (
            <div className="card stack" style={{ gap: '0.75rem' }}>
              <SeatStrip spec={chart.spec} />
              <RangeGrid mixes={chart.mixes} marked={step.highlight ? new Set(step.highlight) : undefined} />
            </div>
          )}
          <p className="lesson-p">
            <Rich text={step.caption} />
          </p>
        </div>
      );
    }
    case 'hand':
      return (
        <div className="lesson-step">
          <h2 className="display lesson-h2">{step.title}</h2>
          <div className="lesson-felt">
            {step.board && (
              <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
                {parseCards(step.board).map((c, i) => (
                  <PlayingCard key={c} card={c} size="md" deal delayMs={120 + i * 70} />
                ))}
              </div>
            )}
            <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
              {parseCards(step.cards).map((c, i) => (
                <PlayingCard key={c} card={c} size="lg" flip delayMs={i * 90} />
              ))}
            </div>
          </div>
          <p className="lesson-p">
            <Rich text={step.caption} />
          </p>
        </div>
      );
    case 'board':
      return (
        <div className="lesson-step">
          <StepTitle title={step.title} evidence={step.evidence} />
          <div className="lesson-felt">
            <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
              {parseCards(step.board).map((c, i, all) => (
                <PlayingCard key={c} card={c} size={all.length <= 3 ? 'lg' : 'md'} deal delayMs={80 + i * 80} />
              ))}
            </div>
          </div>
          <p className="lesson-p">
            <Rich text={step.caption} />
          </p>
        </div>
      );
    case 'callout':
      return (
        <div className="lesson-step">
          <div className={`callout callout-${step.tone}`}>
            <span className={`pill pill-${step.tone === 'tip' ? 'tint' : step.tone}`}>{CALLOUT_LABEL[step.tone]}</span>
            <h2 className="display lesson-h2" style={{ marginTop: '0.6rem' }}>
              {step.title}
            </h2>
            <p className="lesson-p" style={{ margin: 0 }}>
              <Rich text={step.body} />
            </p>
          </div>
        </div>
      );
    case 'quiz':
      return <Quiz step={step} onAnswer={onAnswer} initial={answered} />;
    case 'takeaway':
      return (
        <div className="lesson-step">
          <h2 className="display lesson-h2">Remember</h2>
          <div className="takeaways">
            {step.points.map((p, i) => (
              <div key={i} className="takeaway" style={{ animationDelay: `${120 + i * 110}ms` }}>
                <span className="tick">
                  <CheckIcon size={15} />
                </span>
                <span>
                  <Rich text={p} />
                </span>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

function Quiz({
  step,
  onAnswer,
  initial,
}: {
  step: Extract<LessonStep, { kind: 'quiz' }>;
  onAnswer?: (choice: number) => void;
  initial?: number;
}) {
  const [chosen, setChosen] = useState<number | undefined>(initial);
  const done = chosen !== undefined;
  const right = chosen === step.answer;

  const choose = (i: number) => {
    if (done) return;
    setChosen(i);
    haptic(i === step.answer ? 'success' : 'error');
    onAnswer?.(i);
  };

  return (
    <div className="lesson-step">
      <div className="pill pill-tint" style={{ alignSelf: 'flex-start' }}>
        Quick check
      </div>
      <h2 className="lesson-question">{step.question}</h2>
      <div className="choices">
        {step.choices.map((c, i) => {
          const state = !done ? '' : i === step.answer ? ' correct' : i === chosen ? ' wrong' : ' faded';
          return (
            <button key={c} className={`choice${state}`} data-haptic="off" onClick={() => choose(i)} disabled={done && i !== chosen && i !== step.answer}>
              <span className="choice-key">{String.fromCharCode(65 + i)}</span>
              <span style={{ flex: 1 }}>{c}</span>
              {done && i === step.answer && <CheckIcon size={18} aria-hidden="true" />}
              {done && i === chosen && !right && <CloseIcon size={16} aria-hidden="true" />}
              {done && <span className="sr-only">{i === step.answer ? ', correct answer' : i === chosen ? ', your answer' : ''}</span>}
            </button>
          );
        })}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {done ? (right ? 'Correct.' : `Not quite. The answer is ${step.choices[step.answer]}.`) : ''}
      </div>
      {done && (
        <div className={`explain reveal ${right ? 'good' : 'bad'}`}>
          <strong>{right ? 'Correct.' : 'Not quite.'}</strong> <Rich text={step.explain} />
        </div>
      )}
    </div>
  );
}

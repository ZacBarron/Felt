import type { LessonStep } from '@felt/content';
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
          <h2 className="display lesson-h2">{step.title}</h2>
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
    case 'table':
      return (
        <div className="lesson-step">
          <h2 className="display lesson-h2">{step.title}</h2>
          <div className="card lesson-table">
            <table>
              <thead>
                <tr>
                  {step.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {step.rows.map((r, i) => (
                  <tr key={i} style={{ animationDelay: `${i * 45}ms` }}>
                    {r.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {step.note && <p className="footnote">{step.note}</p>}
        </div>
      );
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
    case 'callout':
      return (
        <div className="lesson-step">
          <div className={`callout callout-${step.tone}`}>
            <span className={`pill ${step.tone === 'exploit' ? 'pill-exploit' : 'pill-tint'}`}>{step.tone === 'exploit' ? 'Exploit' : 'Tip'}</span>
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
              {done && i === step.answer && <CheckIcon size={18} />}
              {done && i === chosen && !right && <CloseIcon size={16} />}
            </button>
          );
        })}
      </div>
      {done && (
        <div className={`explain reveal ${right ? 'good' : 'bad'}`}>
          <strong>{right ? 'Correct.' : 'Not quite.'}</strong> <Rich text={step.explain} />
        </div>
      )}
    </div>
  );
}

import type { Evidence, LessonStep } from '@felt/content';
import { parseCards } from '@felt/core';
import { useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { haptic } from '../haptics';
import { getChart } from '../state/charts';
import { CheckIcon, CloseIcon } from '../ui/icons';
import { LessonArt } from './LessonArt';
import { Rich } from './rich';
import './lesson.css';

interface Props {
  step: LessonStep;
  /** Called once when a quiz is answered, with the chosen index. */
  onAnswer?: (choice: number) => void;
  /** A previous answer, so going back shows it instead of a fresh quiz. */
  answered?: number;
}

const EVIDENCE: Record<Evidence, { label: string; title: string }> = {
  math: { label: 'Exact math', title: 'This is pure math, so it is always true.' },
  solver: { label: 'Approximate solver pattern', title: 'This is how solvers tend to play. Treat it as a direction, not an exact number.' },
  exploit: { label: 'Player tendency', title: 'This is what many players tend to do. Check it against your own games.' },
};

function EvidenceTag({ evidence }: { evidence?: Evidence }) {
  if (!evidence) return null;
  const e = EVIDENCE[evidence];
  const [open, setOpen] = useState(false);
  // The explanation opens on tap, so touch and screen reader users get it too.
  return (
    <span className="evidence-wrap">
      <button type="button" className={`evidence evidence-${evidence}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {e.label}
      </button>
      {open && <span className="evidence-note">{e.title}</span>}
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
          {/* Three or more paragraphs open with a lead, so a long step has a way in. */}
          <div className={`lesson-prose${step.body.length >= 3 ? ' has-lead' : ''}`}>
            {step.body.map((p, i) => (
              <p key={i} className="lesson-p">
                <Rich text={p} />
              </p>
            ))}
          </div>
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
                    <span className="formula-key">{k}</span>
                    <span className="formula-val">{v}</span>
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
                        {textCols[j] || j === 0 ? <Rich text={cell} /> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {step.note && <p className="lesson-note">{step.note}</p>}
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
              <RangeGrid mixes={chart.mixes} reach={chart.reach} marked={step.highlight ? new Set(step.highlight) : undefined} />
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
            <h2 className="display lesson-h2 callout-title">{step.title}</h2>
            <p className="lesson-p">
              <Rich text={step.body} />
            </p>
          </div>
        </div>
      );
    case 'visual':
      return (
        <div className="lesson-step">
          <StepTitle title={step.title} evidence={step.evidence} />
          <LessonArt art={step.art} size="step" />
          <p className="lesson-p">
            <Rich text={step.caption} />
          </p>
        </div>
      );
    case 'quiz':
      return <Quiz step={step} onAnswer={onAnswer} initial={answered} />;
    case 'takeaway':
      return (
        <div className="lesson-step">
          <h2 className="display lesson-h2">Key points</h2>
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

/** Text made only of cards, like "Q♣ 8♦" or "K♥ K♦ 4♣". */
const CARDS_ONLY = /^(\s*[2-9TJQKA][♠♥♦♣]\uFE0E?)+\s*$/u;

function safeCards(text: string) {
  try {
    return parseCards(text);
  } catch {
    return [];
  }
}

/** The hand and board a question is about, on the felt above it. */
function QuizCards({ cards, board }: { cards?: string; board?: string }) {
  const hole = cards ? safeCards(cards) : [];
  const shared = board ? safeCards(board) : [];
  return (
    <div className="lesson-felt quiz-felt">
      {shared.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', gap: 5 }} aria-label="Board" role="group">
          {shared.map((c, i) => (
            <PlayingCard key={c} card={c} size="md" deal delayMs={60 + i * 70} />
          ))}
        </div>
      )}
      {hole.length > 0 && (
        <div className="row" style={{ justifyContent: 'center', gap: 8 }} aria-label="Your hand" role="group">
          {hole.map((c, i) => (
            <PlayingCard key={c} card={c} size={shared.length ? 'md' : 'lg'} flip delayMs={(shared.length ? 120 + shared.length * 70 : 0) + i * 90} />
          ))}
        </div>
      )}
    </div>
  );
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
      <div className="lesson-kicker quiz-kicker">Question</div>
      {(step.cards || step.board) && <QuizCards cards={step.cards} board={step.board} />}
      <h2 className="lesson-question">
        <Rich text={step.question} />
      </h2>
      <div className="choices">
        {step.choices.map((c, i) => {
          const state = !done ? '' : i === step.answer ? ' correct' : i === chosen ? ' wrong' : ' faded';
          const faces = step.choiceCards?.[i] ? safeCards(step.choiceCards[i]) : [];
          // When the card faces say it all ("Q♣ 8♦"), the text stays for screen readers only.
          const onlyCards = faces.length > 0 && CARDS_ONLY.test(c);
          return (
            <button key={c} className={`choice${state}`} data-haptic="off" onClick={() => choose(i)} disabled={done && i !== chosen && i !== step.answer}>
              <span className="choice-key">{String.fromCharCode(65 + i)}</span>
              {faces.length > 0 && (
                <span className="choice-cards" aria-hidden="true">
                  {faces.map((card) => (
                    <PlayingCard key={card} card={card} size="sm" />
                  ))}
                </span>
              )}
              <span className={onlyCards ? 'sr-only' : 'choice-text'}>{c}</span>
              {onlyCards && <span className="choice-text" />}
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
          <strong className="explain-verdict">
            <span className="explain-icon" aria-hidden="true">
              {right ? <CheckIcon size={14} /> : <CloseIcon size={12} />}
            </span>
            {right ? 'Correct.' : 'Not quite.'}
          </strong>{' '}
          <span className="explain-body">
            <Rich text={step.explain} />
          </span>
        </div>
      )}
    </div>
  );
}

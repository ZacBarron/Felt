import { type Chart, type DrillOutcome, handClassCombos, scoreRecall } from '@felt/core';
import { useMemo, useRef, useState } from 'react';
import { actionColor } from '../components/actionColors';
import { MixBar } from '../components/MixBar';
import { PlayingCard } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { actionLabels, spotLine } from './labels';

interface Props {
  chart: Chart;
  hand: string;
  targetMs: number;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
}

/** "You are UTG+1 with KTo, folded to you. Raise or fold?" Timed, then shows the full mix. */
export function QuickRecall({ chart, hand, targetMs, onAnswer, onNext }: Props) {
  const started = useRef(performance.now());
  const [answer, setAnswer] = useState<{ choice: string; outcome: DrillOutcome }>();
  const combo = useMemo(() => {
    const combos = handClassCombos(hand);
    return combos[Math.floor(Math.random() * combos.length)];
  }, [hand]);
  const labels = actionLabels(chart);
  const mix = chart.mixes.get(hand) ?? { fold: 1 };
  const choices = [...chart.spec.actions.map((a) => a.id), 'fold'];

  const choose = (choice: string) => {
    if (answer) return;
    const outcome = { accuracy: scoreRecall(mix, choice), responseMs: performance.now() - started.current, targetMs };
    setAnswer({ choice, outcome });
    onAnswer(outcome);
  };

  const verdict = !answer
    ? undefined
    : answer.outcome.accuracy === 1
      ? { text: 'Correct', cls: 'grade-best' }
      : answer.outcome.accuracy > 0
        ? { text: 'Rare mix', cls: 'grade-inaccuracy' }
        : { text: 'Wrong', cls: 'grade-blunder' };

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: '0.75rem' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>
            {chart.spec.hero} · {chart.spec.tableSize}-handed · {chart.spec.stackBb}bb
          </strong>
          {chart.spec.basis === 'exploit' && <span className="pill">exploit</span>}
        </div>
        <SeatStrip spec={chart.spec} />
        <div className="muted">{spotLine(chart)}</div>
        <div className="row" style={{ justifyContent: 'center', padding: '0.5rem 0' }}>
          {combo.map((c) => (
            <PlayingCard key={c} card={c} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${choices.length}, 1fr)`, gap: 8 }}>
          {choices.map((c) => (
            <button
              key={c}
              onClick={() => choose(c)}
              disabled={!!answer}
              style={{
                padding: '0.9rem 0.5rem',
                fontWeight: 700,
                background: actionColor(c),
                borderColor: answer?.choice === c ? 'var(--text)' : 'transparent',
                borderWidth: 2,
                opacity: answer && answer.choice !== c ? 0.45 : 1,
                color: '#fff',
              }}
            >
              {labels[c]}
            </button>
          ))}
        </div>
      </div>

      {answer && verdict && (
        <div className="card stack" style={{ gap: '0.75rem' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong className={verdict.cls} style={{ fontSize: '1.1rem' }}>
              {verdict.text}
            </strong>
            <span className="muted">{(answer.outcome.responseMs / 1000).toFixed(1)}s</span>
          </div>
          <button className="primary" onClick={onNext} style={{ padding: '0.8rem' }} autoFocus>
            Next
          </button>
          <div>
            <strong>{hand}</strong>
          </div>
          <MixBar mix={mix} labels={labels} />
          <RangeGrid mixes={chart.mixes} selected={hand} />
        </div>
      )}
    </div>
  );
}

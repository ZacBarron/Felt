import { type Chart, type DrillOutcome, type HandMix, type PaintScore, scorePainting } from '@felt/core';
import { useMemo, useRef, useState } from 'react';
import { actionColor } from '../components/actionColors';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { actionLabels, spotLine } from './labels';

interface Props {
  chart: Chart;
  targetMs: number;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
}

/** Paint the whole chart from memory, then compare against the answer. */
export function PaintDrill({ chart, targetMs, onAnswer, onNext }: Props) {
  const started = useRef(performance.now());
  const labels = actionLabels(chart);
  const brushes = [...chart.spec.actions.map((a) => a.id), 'fold'];
  const [brush, setBrush] = useState(brushes[0]);
  const [painted, setPainted] = useState<Map<string, string>>(new Map());
  const [result, setResult] = useState<PaintScore>();
  const [showAnswer, setShowAnswer] = useState(true);

  const paintedMixes = useMemo(
    () => new Map<string, HandMix>([...painted].map(([hand, action]) => [hand, { [action]: 1 }])),
    [painted],
  );

  const paint = (hand: string) =>
    setPainted((prev) => {
      if ((prev.get(hand) ?? 'fold') === brush) return prev;
      const next = new Map(prev);
      if (brush === 'fold') next.delete(hand);
      else next.set(hand, brush);
      return next;
    });

  const submit = () => {
    const score = scorePainting(chart, painted);
    setResult(score);
    onAnswer({ accuracy: score.accuracy, responseMs: performance.now() - started.current, targetMs });
  };

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: '0.75rem' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>
            Paint: {chart.spec.title} · {chart.spec.tableSize}-handed · {chart.spec.stackBb}bb
          </strong>
        </div>
        <SeatStrip spec={chart.spec} />
        <div className="muted">
          {spotLine(chart)}. Paint every hand that plays. Mixed hands count if you paint any action they take at least 25% of
          the time.
        </div>

        {!result && (
          <div className="row" style={{ gap: 6 }}>
            {brushes.map((b) => (
              <button
                key={b}
                onClick={() => setBrush(b)}
                style={{
                  background: brush === b ? actionColor(b) : undefined,
                  color: brush === b ? '#fff' : undefined,
                  fontWeight: 600,
                }}
              >
                {b === 'fold' ? 'Erase' : labels[b]}
              </button>
            ))}
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Drag to paint
            </span>
          </div>
        )}

        {result && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong className={result.accuracy >= 0.9 ? 'grade-best' : result.accuracy >= 0.6 ? 'grade-inaccuracy' : 'grade-blunder'}>
              {(result.accuracy * 100).toFixed(0)}% correct
            </strong>
            <span className="muted">{result.wrong.length} hands missed (outlined)</span>
            <div className="row" style={{ gap: 6 }}>
              <button onClick={() => setShowAnswer(true)} style={{ borderColor: showAnswer ? 'var(--text)' : undefined }}>
                Answer
              </button>
              <button onClick={() => setShowAnswer(false)} style={{ borderColor: !showAnswer ? 'var(--text)' : undefined }}>
                Yours
              </button>
            </div>
          </div>
        )}

        <RangeGrid
          mixes={result && showAnswer ? chart.mixes : paintedMixes}
          onPaint={result ? undefined : paint}
          marked={result ? new Set(result.wrong) : undefined}
        />

        {!result ? (
          <button className="primary" onClick={submit} style={{ padding: '0.8rem' }}>
            Check
          </button>
        ) : (
          <button className="primary" onClick={onNext} style={{ padding: '0.8rem' }}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}

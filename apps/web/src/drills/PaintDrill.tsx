import { type Chart, type DrillOutcome, type HandMix, type PaintScore, scorePainting } from '@felt/core';
import { Eraser, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { actionColor } from '../components/actionColors';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { haptic } from '../haptics';
import { BottomBar } from '../ui/BottomBar';
import { ProgressRing } from '../ui/ProgressRing';
import { Segmented } from '../ui/Segmented';
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
  const [view, setView] = useState<'answer' | 'yours'>('answer');

  const paintedMixes = useMemo(
    () => new Map<string, HandMix>([...painted].map(([hand, action]) => [hand, { [action]: 1 }])),
    [painted],
  );

  const paint = (hand: string) => {
    if ((painted.get(hand) ?? 'fold') === brush) return;
    haptic('select');
    setPainted((prev) => {
      const next = new Map(prev);
      if (brush === 'fold') next.delete(hand);
      else next.set(hand, brush);
      return next;
    });
  };

  const submit = () => {
    const score = scorePainting(chart, painted);
    haptic(score.accuracy >= 0.9 ? 'success' : score.accuracy >= 0.6 ? 'warning' : 'error');
    setResult(score);
    onAnswer({ accuracy: score.accuracy, responseMs: performance.now() - started.current, targetMs });
  };

  const scoreColor = !result ? undefined : result.accuracy >= 0.9 ? 'var(--accent)' : result.accuracy >= 0.6 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: '0.8rem' }}>
        <div>
          <div className="eyebrow">Paint from memory</div>
          <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
            {chart.spec.title} <span className="muted" style={{ fontWeight: 600 }}>· {chart.spec.tableSize}-handed · {chart.spec.stackBb}bb</span>
          </div>
        </div>
        <SeatStrip spec={chart.spec} />
        <div className="muted" style={{ fontSize: '0.88rem' }}>
          {spotLine(chart)}. Mixed hands count if you paint any action they take at least 25% of the time.
        </div>

        {!result ? (
          <div className="row between">
            <Segmented
              value={brush}
              onChange={setBrush}
              ariaLabel="Brush"
              options={brushes.map((b) => ({
                value: b,
                label:
                  b === 'fold' ? (
                    <span className="row" style={{ gap: 6 }}>
                      <Eraser size={15} /> Erase
                    </span>
                  ) : (
                    <span className="row" style={{ gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: actionColor(b) }} />
                      {labels[b].split(' ')[0]}
                    </span>
                  ),
              }))}
            />
            <span className="faint" style={{ fontSize: '0.8rem' }}>
              {painted.size} painted
            </span>
          </div>
        ) : (
          <div className="row reveal" style={{ gap: '1rem' }}>
            <ProgressRing value={result.accuracy} size={74} stroke={8} color={scoreColor}>
              <span className="num" style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                {Math.round(result.accuracy * 100)}%
              </span>
            </ProgressRing>
            <div className="stack" style={{ gap: '0.4rem', flex: 1, minWidth: 160 }}>
              <strong>{result.wrong.length === 0 ? 'Perfect chart' : `${result.wrong.length} hands missed`}</strong>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {result.wrong.length > 0 && 'Misses are outlined in gold.'}
              </span>
              <Segmented
                value={view}
                onChange={setView}
                ariaLabel="Show"
                options={[
                  { value: 'answer', label: 'Answer' },
                  { value: 'yours', label: 'Yours' },
                ]}
              />
            </div>
          </div>
        )}

        <RangeGrid
          mixes={result && view === 'answer' ? chart.mixes : paintedMixes}
          onPaint={result ? undefined : paint}
          marked={result ? new Set(result.wrong) : undefined}
        />
      </div>

      <BottomBar>
        {!result ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}>
            <button className="btn btn-lg" onClick={() => setPainted(new Map())} disabled={painted.size === 0} aria-label="Clear">
              <RotateCcw size={18} />
            </button>
            <button className="btn btn-primary btn-lg" onClick={submit} data-haptic="off">
              Check my chart
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" onClick={onNext} autoFocus>
            Next
          </button>
        )}
      </BottomBar>
    </div>
  );
}

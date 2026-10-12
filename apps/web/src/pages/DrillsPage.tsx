import { boundaryHands, chartFormatLabel, PAINT_TARGET_MS, RECALL_TARGET_MS, ALL_HAND_CLASSES } from '@felt/core';
import { useMemo, useState } from 'react';
import { DrillRunner } from '../drills/DrillRunner';
import { chartsForGame } from '../state/charts';
import { useSettings } from '../state/settings';

/** Free practice on any chart. Does not touch the review schedule. */
export function DrillsPage() {
  const { settings } = useSettings();
  const { charts } = chartsForGame(settings.game);
  const [chartId, setChartId] = useState(charts[0]?.spec.id);
  const [mode, setMode] = useState<'quick' | 'paint'>('quick');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const chart = charts.find((c) => c.spec.id === chartId) ?? charts[0];

  // Mostly edge hands, sometimes any hand, so the obvious ones stay honest too.
  const hand = useMemo(() => {
    if (!chart) return undefined;
    const pool = Math.random() < 0.8 ? boundaryHands(chart) : ALL_HAND_CLASSES;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [chart, round]);

  if (!chart) return <p className="muted">No charts for this game yet.</p>;

  return (
    <div className="stack">
      <div>
        <h1>Drills</h1>
        <p className="muted">Free practice. Does not change your review schedule.</p>
      </div>
      <div className="row">
        <select value={chart.spec.id} onChange={(e) => setChartId(e.target.value)}>
          {charts.map((c) => (
            <option key={c.spec.id} value={c.spec.id}>
              {c.spec.title}
            </option>
          ))}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value as 'quick' | 'paint')}>
          <option value="quick">Quick recall</option>
          <option value="paint">Paint the chart</option>
        </select>
        <span className="pill">{chartFormatLabel(chart.spec)}</span>
        {mode === 'quick' && score.total > 0 && (
          <span className="muted">
            {score.right}/{score.total} correct
          </span>
        )}
      </div>
      <DrillRunner
        key={`${chart.spec.id}:${mode}:${round}`}
        item={{
          id: 'practice',
          chartId: chart.spec.id,
          mode,
          hand,
          targetMs: mode === 'paint' ? PAINT_TARGET_MS : RECALL_TARGET_MS,
          isNew: false,
        }}
        onAnswer={(o) => setScore((s) => ({ right: s.right + (o.accuracy === 1 ? 1 : 0), total: s.total + 1 }))}
        onNext={() => setRound((r) => r + 1)}
      />
    </div>
  );
}

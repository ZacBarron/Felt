import { ALL_HAND_CLASSES, boundaryHands, chartFormatLabel, PAINT_TARGET_MS, RECALL_TARGET_MS } from '@felt/core';
import { useMemo, useState } from 'react';
import { DrillRunner } from '../drills/DrillRunner';
import { chartsForGame } from '../state/charts';
import { useSettings } from '../state/settings';
import { Chips } from '../ui/Chips';
import { FlameIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Segmented } from '../ui/Segmented';

/** Free practice on any chart. Does not touch the review schedule. */
export function DrillsPage() {
  const { settings } = useSettings();
  const { charts } = chartsForGame(settings.game);
  const [chartId, setChartId] = useState(charts[0]?.spec.id);
  const [mode, setMode] = useState<'quick' | 'paint'>('quick');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, best: 0 });
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
      <PageHeader
        title="Drills"
        subtitle="Free practice. Your review schedule is not affected."
        trailing={
          mode === 'quick' && score.total > 0 ? (
            <div className="row" style={{ gap: '0.4rem', marginBottom: 6, flexWrap: 'nowrap' }}>
              <span className="pill num">
                {score.right}/{score.total}
              </span>
              <span className={`pill num ${score.streak >= 5 ? 'pill-warn' : ''}`}>
                <FlameIcon size={12} /> {score.streak}
              </span>
            </div>
          ) : undefined
        }
      />

      <Chips
        value={chart.spec.id}
        onChange={(id) => {
          setChartId(id);
          setScore({ right: 0, total: 0, streak: 0, best: 0 });
        }}
        ariaLabel="Chart"
        options={charts.map((c) => ({ value: c.spec.id, label: c.spec.title }))}
      />

      <div className="row between">
        <Segmented
          value={mode}
          onChange={setMode}
          ariaLabel="Drill type"
          options={[
            { value: 'quick', label: 'Quick recall' },
            { value: 'paint', label: 'Paint chart' },
          ]}
        />
        <span className="footnote">{chartFormatLabel(chart.spec)}</span>
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
        onAnswer={(o) =>
          setScore((s) => {
            const right = o.accuracy === 1;
            const streak = right ? s.streak + 1 : 0;
            return { right: s.right + (right ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best, streak) };
          })
        }
        onNext={() => {
          setRound((r) => r + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

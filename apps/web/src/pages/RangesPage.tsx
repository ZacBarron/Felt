import {
  ALL_HAND_CLASSES,
  actionFrequencies,
  boundaryHands,
  type Chart,
  chartFormatLabel,
  comboCount,
  type HandClass,
  PAINT_TARGET_MS,
  reaches,
  RECALL_TARGET_MS,
} from '@felt/core';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { actionColor, sortActions } from '../components/actionColors';
import { ChartPicker } from '../components/ChartPicker';
import { GameChip, GameSheet } from '../components/GameSheet';
import { MixBar } from '../components/MixBar';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { DrillRunner } from '../drills/DrillRunner';
import { actionLabels } from '../drills/labels';
import { chartsForGame, getChart } from '../state/charts';
import { useSettings } from '../state/settings';
import { FlameIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Segmented } from '../ui/Segmented';

type Mode = 'chart' | 'paint' | 'quick';

const asMode = (m: string | null): Mode => (m === 'paint' || m === 'quick' ? m : 'chart');

/**
 * Ranges: look at a chart, paint it from memory, or quiz yourself on its
 * edge hands. Practice here never changes the review schedule.
 */
export function RangesPage() {
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const fit = chartsForGame(settings.game);
  const linked = params.get('chart');
  // A lesson may link to a chart for another table size; include it so practice still starts there.
  const linkedChart = linked && !fit.charts.some((c) => c.spec.id === linked) ? getChart(linked) : undefined;
  const charts = linkedChart ? [linkedChart, ...fit.charts] : fit.charts;
  const [chartId, setChartId] = useState<string | undefined>(linked ?? undefined);
  const [mode, setModeState] = useState<Mode>(asMode(params.get('mode')));
  const [sheet, setSheet] = useState(false);
  const chart = charts.find((c) => c.spec.id === chartId) ?? charts[0];

  const setMode = (m: Mode) => {
    setModeState(m);
    const next = new URLSearchParams(params);
    if (m === 'chart') next.delete('mode');
    else next.set('mode', m);
    setParams(next, { replace: true });
  };

  if (!chart) return <p className="muted">No charts for this game yet.</p>;

  return (
    <div className="stack">
      <PageHeader title="Ranges" trailing={<GameChip onOpen={() => setSheet(true)} />} />
      <GameSheet open={sheet} onClose={() => setSheet(false)} />

      <ChartPicker charts={charts} value={chart} onChange={setChartId} />

      <Segmented<Mode>
        ariaLabel="Mode"
        stretch
        value={mode}
        onChange={setMode}
        options={[
          { value: 'chart', label: 'Chart' },
          { value: 'paint', label: 'Paint' },
          { value: 'quick', label: 'Quiz' },
        ]}
      />

      {mode === 'chart' ? (
        <ChartView chart={chart} exact={fit.exact} />
      ) : (
        <Practice key={`${chart.spec.id}:${mode}`} chart={chart} mode={mode} />
      )}
    </div>
  );
}

function ChartView({ chart, exact }: { chart: Chart; exact: boolean }) {
  const { settings } = useSettings();
  const [selected, setSelected] = useState<HandClass>('AKs');
  const totals = actionFrequencies(chart);
  const labels = actionLabels(chart);
  const mix = chart.mixes.get(selected) ?? { fold: 1 };

  return (
    <>
      <div className="footnote row" style={{ gap: '0.4rem' }}>
        {chartFormatLabel(chart.spec)}
        {chart.spec.source === 'starter-approx' && <span className="pill">Approximate</span>}
        {chart.spec.basis === 'exploit' && <span className="pill pill-exploit">Exploit</span>}
        {!exact && <span className="pill pill-warn">Nearest table size</span>}
        {Math.abs(settings.game.stackBb - chart.spec.stackBb) >= 30 && <span className="pill pill-warn">You play {settings.game.stackBb}bb</span>}
      </div>
      {chart.spec.note && <div className="footnote">{chart.spec.note}</div>}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: '0.75rem' }}>
          <SeatStrip spec={chart.spec} />
          {chart.spec.versus && <div className="footnote">{chart.spec.versus}</div>}
          <RangeGrid key={chart.spec.id} mixes={chart.mixes} reach={chart.reach} selected={selected} onSelect={setSelected} />
        </div>

        <div className="stack" style={{ position: 'sticky', top: '4.5rem' }}>
          <div className="card stack reveal" key={selected} style={{ gap: '0.7rem' }}>
            <div className="row between">
              <span className="display" style={{ fontSize: '2.2rem', lineHeight: 1 }}>
                {selected}
              </span>
              <span className="pill num">{comboCount(selected)} combos</span>
            </div>
            <MixBar mix={mix} labels={labels} />
          </div>

          <div className="card stack" style={{ gap: '0.5rem' }}>
            <div className="row between">
              <span className="footnote">Whole range</span>
              <span className="footnote num">
                {sortActions(Object.keys(totals))
                  .filter((a) => a !== 'fold')
                  .map((a) => `${labels[a]?.split(' ')[0] ?? a} ${(totals[a] * 100).toFixed(1)}%`)
                  .join(', ')}
              </span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
              {sortActions(Object.keys(totals)).map((a) => (
                <span key={a} style={{ width: `${totals[a] * 100}%`, background: actionColor(a), opacity: a === 'fold' ? 0.35 : 1 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Paint or quiz on one chart. Scores stay on this screen. */
function Practice({ chart, mode }: { chart: Chart; mode: 'paint' | 'quick' }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, best: 0 });

  // Mostly edge hands, sometimes any hand, so the obvious ones stay honest too.
  const hand = useMemo(() => {
    const pool = Math.random() < 0.8 ? boundaryHands(chart) : ALL_HAND_CLASSES.filter((h) => reaches(chart, h));
    return pool[Math.floor(Math.random() * pool.length)];
  }, [chart, round]);

  return (
    <>
      {mode === 'quick' && score.total > 0 && (
        <div className="row" style={{ gap: '0.4rem' }}>
          <span className="pill num">
            <span key={score.right} className="bump">
              {score.right}
            </span>{' '}
            of {score.total}
          </span>
          <span className={`pill num ${score.streak >= 5 ? 'pill-warn' : ''}`}>
            <FlameIcon size={12} />{' '}
            <span key={score.streak} className="bump">
              {score.streak}
            </span>
          </span>
          {score.best >= 3 && <span className="pill num">Best {score.best}</span>}
        </div>
      )}
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
      <div className="section-footer">Practice here does not change your review schedule.</div>
    </>
  );
}

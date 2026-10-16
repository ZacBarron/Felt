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
import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { actionColor, sortActions } from '../components/actionColors';
import { ChartPicker } from '../components/ChartPicker';
import { GameChip, GameSheet } from '../components/GameSheet';
import { MixBar } from '../components/MixBar';
import { hasDefaultGame, RangesIntro, rangesIntroSeen } from '../components/RangesIntro';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { DrillRunner } from '../drills/DrillRunner';
import { actionLabels, spotLine } from '../drills/labels';
import { paintRule } from '../drills/PaintDrill';
import { chartsForGame, getChart } from '../state/charts';
import { useSettings } from '../state/settings';
import { FlameIcon, HelpIcon, InfoIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Segmented } from '../ui/Segmented';
import './ranges.css';

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
  // First visit: explain charts once, and ask which game to match if the player never chose one.
  const [intro, setIntro] = useState(() => !rangesIntroSeen());
  const [askGame, setAskGame] = useState(() => !rangesIntroSeen() && hasDefaultGame(settings.game));
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
      <PageHeader
        title="Ranges"
        trailing={
          <div className="ranges-head-actions">
            <button
              type="button"
              className="ranges-help-btn"
              aria-label="How charts work"
              aria-haspopup="dialog"
              data-haptic="select"
              onClick={() => {
                setAskGame(false);
                setIntro(true);
              }}
            >
              <HelpIcon size={22} />
            </button>
            <GameChip onOpen={() => setSheet(true)} />
          </div>
        }
      />
      <GameSheet open={sheet} onClose={() => setSheet(false)} />
      <RangesIntro open={intro} askGame={askGame} onClose={() => setIntro(false)} />

      <div className="ranges-top">
        <ChartPicker charts={charts} value={chart} onChange={setChartId} />
        <Segmented<Mode>
          ariaLabel="Mode"
          stretch
          value={mode}
          onChange={setMode}
          options={[
            { value: 'chart', label: 'Chart' },
            { value: 'quick', label: 'Quiz' },
            { value: 'paint', label: 'Paint' },
          ]}
        />
        <ChartAbout chart={chart} exact={fit.exact} mode={mode} />
        <SeatStrip spec={chart.spec} />
      </div>

      {mode === 'chart' ? <ChartView chart={chart} /> : <Practice key={`${chart.spec.id}:${mode}`} chart={chart} mode={mode} />}
    </div>
  );
}

/**
 * One quiet line under the controls: the spot, the honesty labels, and an
 * info button that opens the chart's assumptions and how practice is graded.
 */
function ChartAbout({ chart, exact, mode }: { chart: Chart; exact: boolean; mode: Mode }) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const approx = chart.spec.source === 'starter-approx';
  const exploit = chart.spec.basis === 'exploit';
  const offStack = Math.abs(settings.game.stackBb - chart.spec.stackBb) >= 30;
  const line = spotLine(chart) || chart.spec.title;

  return (
    <div className="chart-about">
      <div className="chart-line">
        <span className="chart-line-text">{line}</span>
        {approx && <span className="pill">Approximate</span>}
        {exploit && <span className="pill pill-exploit">Exploit</span>}
        {!exact && <span className="pill pill-warn">Nearest table size</span>}
        {offStack && <span className="pill pill-warn">You play {settings.game.stackBb}bb</span>}
        <button
          type="button"
          className="chart-info-btn"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label="Chart details"
          onClick={() => setOpen((o) => !o)}
        >
          <InfoIcon size={22} filled={open} />
        </button>
      </div>
      {open && (
        <div id={panelId} className="chart-about-panel reveal">
          {mode === 'paint' && <p>{paintRule(settings.study.paintMixes !== false)}</p>}
          <p>
            <strong>{chart.spec.title}.</strong> Built for {chartFormatLabel(chart.spec)}.
          </p>
          {approx && <p>This is a starter chart. Its frequencies are approximate.</p>}
          {exploit && <p>This is an exploit chart. It targets a common leak, not a balanced opponent.</p>}
          {chart.spec.note && <p>{chart.spec.note}</p>}
          {mode !== 'chart' && <p>Practice here does not change your review schedule.</p>}
        </div>
      )}
    </div>
  );
}

function ChartView({ chart }: { chart: Chart }) {
  const [selected, setSelected] = useState<HandClass>('AKs');
  const totals = actionFrequencies(chart);
  const labels = actionLabels(chart);
  const mix = chart.mixes.get(selected) ?? { fold: 1 };

  return (
    <>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <RangeGrid key={chart.spec.id} mixes={chart.mixes} reach={chart.reach} selected={selected} onSelect={setSelected} />

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
        compact
        onNext={() => {
          setRound((r) => r + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </>
  );
}

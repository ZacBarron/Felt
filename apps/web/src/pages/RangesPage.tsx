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
import { useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { actionColor, sortActions } from '../components/actionColors';
import { ChartPicker } from '../components/ChartPicker';
import { GameChip, GameSheet } from '../components/GameSheet';
import { MixBar } from '../components/MixBar';
import { hasDefaultGame, RangesIntro, rangesIntroSeen } from '../components/RangesIntro';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { DrillRunner } from '../drills/DrillRunner';
import { QuickRecall } from '../drills/QuickRecall';
import { actionLabels, spotLine } from '../drills/labels';
import { paintRule } from '../drills/PaintDrill';
import { chartsForGame, getChart } from '../state/charts';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronRightIcon, FlameIcon, HelpIcon, InfoIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { Section } from '../ui/Section';
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

      {mode === 'chart' ? <ChartView chart={chart} /> : <Practice key={`${chart.spec.id}:${mode}`} chart={chart} mode={mode} onPaint={() => setMode('paint')} />}
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
function Practice({ chart, mode, onPaint }: { chart: Chart; mode: 'paint' | 'quick'; onPaint: () => void }) {
  const [round, setRound] = useState(0);
  if (mode === 'quick') return <QuizSet chart={chart} onPaint={onPaint} />;
  return (
    <DrillRunner
      key={`${chart.spec.id}:paint:${round}`}
      item={{ id: 'practice', chartId: chart.spec.id, mode: 'paint', targetMs: PAINT_TARGET_MS, isNew: false }}
      onAnswer={() => undefined}
      compact
      onNext={() => {
        setRound((r) => r + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    />
  );
}

// Quiz sets ------------------------------------------------------------------

/** Hands in one quiz set. Short enough to finish between hands at the table. */
const SET_SIZE = 10;

interface QuizAnswer {
  hand: HandClass;
  accuracy: number;
  ms: number;
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Mostly close calls, plus a couple of other hands so the obvious ones stay honest too. No hand twice in a set. */
function dealSet(chart: Chart): HandClass[] {
  const edges = shuffle(boundaryHands(chart));
  const others = shuffle(ALL_HAND_CLASSES.filter((h) => reaches(chart, h) && !edges.includes(h)));
  const fromEdges = Math.min(edges.length, SET_SIZE - 2);
  const picks = [...edges.slice(0, fromEdges), ...others.slice(0, SET_SIZE - fromEdges)];
  if (picks.length < SET_SIZE) picks.push(...edges.slice(fromEdges, fromEdges + SET_SIZE - picks.length));
  return shuffle(picks);
}

/** Right answers in a row at the end of the list. */
function trailingRun(answers: readonly QuizAnswer[]): number {
  let n = 0;
  for (let i = answers.length - 1; i >= 0 && answers[i].accuracy === 1; i--) n++;
  return n;
}

function longestRun(answers: readonly QuizAnswer[]): number {
  let best = 0;
  let run = 0;
  for (const a of answers) {
    run = a.accuracy === 1 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Best full set per chart, on this device only. A lost best costs nothing, so browser storage is enough. */
const BEST_KEY = 'felt.rangesBest';

function readBest(chartId: string): number | undefined {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
    return typeof all[chartId] === 'number' ? all[chartId] : undefined;
  } catch {
    return undefined;
  }
}

function writeBest(chartId: string, right: number) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
    all[chartId] = right;
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {
    // Blocked storage: the best is just not remembered.
  }
}

/**
 * Ten hands from one chart, then a result that names the hands to fix.
 * "Drill my misses" deals only the hands you missed, so practice goes where it is needed.
 */
function QuizSet({ chart, onPaint }: { chart: Chart; onPaint: () => void }) {
  const { settings } = useSettings();
  const untimed = !!settings.study.untimed;
  const [hands, setHands] = useState(() => dealSet(chart));
  const [retry, setRetry] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [index, setIndex] = useState(0);
  const [setNo, setSetNo] = useState(0);
  const [result, setResult] = useState<{ answers: QuizAnswer[]; best?: number; newBest: boolean }>();
  const anchor = useRef<HTMLDivElement>(null);
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const start = (next: HandClass[], isRetry: boolean) => {
    setHands(next);
    setRetry(isRetry);
    setAnswers([]);
    setIndex(0);
    setResult(undefined);
    setSetNo((n) => n + 1);
    window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
  };

  const finish = (all: QuizAnswer[]) => {
    const right = all.filter((a) => a.accuracy === 1).length;
    // Only a full fresh set counts toward the best, so drilling your misses cannot inflate it.
    const before = retry ? undefined : readBest(chart.spec.id);
    const newBest = !retry && before !== undefined && right > before;
    if (!retry && (before === undefined || right > before)) writeBest(chart.spec.id, right);
    setResult({ answers: all, best: before, newBest });
    window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
  };

  if (result)
    return (
      <QuizResult
        chart={chart}
        answers={result.answers}
        retry={retry}
        best={result.best}
        newBest={result.newBest}
        untimed={untimed}
        onRetry={(missed) => start(shuffle(missed), true)}
        onNewSet={() => start(dealSet(chart), false)}
        onPaint={onPaint}
      />
    );

  const hand = hands[index];
  const run = trailingRun(answers);
  const right = answers.filter((a) => a.accuracy === 1).length;
  const last = index + 1 >= hands.length;

  return (
    <>
      <div ref={anchor} className="quiz-anchor" aria-hidden="true" />
      <div className="quiz-progress glass" role="group" aria-label="Quiz set">
        <div className="check-bar" role="progressbar" aria-valuemin={0} aria-valuemax={hands.length} aria-valuenow={answers.length} aria-label="Hands answered">
          <span style={{ width: `${(answers.length / hands.length) * 100}%` }} />
        </div>
        <span className="quiz-progress-count num">
          {Math.min(index + 1, hands.length)} of {hands.length}
        </span>
        {run >= 3 ? (
          <span key={run} className="quiz-run num bump" aria-label={`${run} right in a row`}>
            <FlameIcon size={14} />
            {run} in a row
          </span>
        ) : right > 0 ? (
          <span className="quiz-right num" aria-label={`${right} right so far`}>
            <CheckIcon size={14} />
            {right}
          </span>
        ) : null}
      </div>
      <QuickRecall
        key={`${setNo}:${index}`}
        chart={chart}
        hand={hand}
        targetMs={RECALL_TARGET_MS}
        compact
        nextLabel={last ? 'See my results' : 'Next hand'}
        onAnswer={(o) => setAnswers((a) => [...a, { hand, accuracy: o.accuracy, ms: o.responseMs }])}
        onNext={() => {
          if (last) {
            finish(answers);
            return;
          }
          setIndex((i) => i + 1);
          // Land on the progress bar, so the next cards and the answer buttons are both in view.
          anchor.current?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
        }}
      />
    </>
  );
}

/** A mix with the fold share spelled out, so the bar and the words add up to 100%. */
function withFold(mix: Record<string, number>): Record<string, number> {
  const played = Object.entries(mix).reduce((t, [a, f]) => (a === 'fold' ? t : t + f), 0);
  return { ...mix, fold: Math.max(0, 1 - played) };
}

/** The end of a set: how it went, then the hands to fix and one clear next step. */
function QuizResult({
  chart,
  answers,
  retry,
  best,
  newBest,
  untimed,
  onRetry,
  onNewSet,
  onPaint,
}: {
  chart: Chart;
  answers: QuizAnswer[];
  retry: boolean;
  best?: number;
  newBest: boolean;
  untimed: boolean;
  onRetry: (hands: HandClass[]) => void;
  onNewSet: () => void;
  onPaint: () => void;
}) {
  const right = answers.filter((a) => a.accuracy === 1).length;
  const total = answers.length;
  const toFix = [...answers.filter((a) => a.accuracy === 0), ...answers.filter((a) => a.accuracy > 0 && a.accuracy < 1)];
  const missed = toFix.map((a) => a.hand);
  const runBest = longestRun(answers);
  const avgS = answers.reduce((t, a) => t + a.ms, 0) / Math.max(1, total) / 1000;
  const labels = actionLabels(chart);
  const short = (a: string) => (labels[a] ?? a).replace(/\s+[\d.]+bb$/, '');
  const title = right === total ? 'Every hand right' : retry ? 'Misses drilled' : `${right} of ${total} right`;

  return (
    <div className="stack quiz-result">
      <div className="card stack reveal quiz-result-card">
        {newBest && <span className="pill pill-good">New best on this chart</span>}
        <ProgressRing value={right / Math.max(1, total)} size={104} stroke={10} label={`${right} of ${total} right`}>
          <span className="display num" style={{ fontSize: '2rem' }} aria-hidden="true">
            {right}/{total}
          </span>
        </ProgressRing>
        <h2 className="display quiz-result-title" role="status">
          {title}
        </h2>
        <div className="quiz-stats">
          <div>
            <span className="quiz-stat-value num">{runBest}</span>
            <span className="quiz-stat-label">Longest run</span>
          </div>
          {!untimed && (
            <div>
              <span className="quiz-stat-value num">{avgS.toFixed(1)}s</span>
              <span className="quiz-stat-label">Average time</span>
            </div>
          )}
          {!retry && (
            <div>
              <span className="quiz-stat-value num">{best === undefined ? `${right}/${total}` : `${Math.max(best, right)}/${SET_SIZE}`}</span>
              <span className="quiz-stat-label">Best on this chart</span>
            </div>
          )}
        </div>
      </div>

      {toFix.length > 0 ? (
        <Section title="Hands to fix" footer="Each bar shows how often the chart takes each action.">
          <ul className="list quiz-fix">
            {toFix.map((a) => {
              const mix = withFold(chart.mixes.get(a.hand) ?? { fold: 1 });
              const parts = sortActions(Object.keys(mix)).filter((x) => mix[x] > 0.005);
              return (
                <li key={a.hand} className="list-row">
                  <span className={`quiz-cell${mix.fold > 0.5 ? ' mostly-fold' : ''}`} aria-hidden="true">
                    {parts.map((x) => (
                      <span key={x} style={{ width: `${mix[x] * 100}%`, background: actionColor(x), opacity: x === 'fold' ? 0.35 : 1 }} />
                    ))}
                    <b>{a.hand}</b>
                  </span>
                  <span className="grow num quiz-fix-mix">
                    <span className="sr-only">{a.hand}. The chart plays it </span>
                    {parts.map((x) => `${short(x)} ${Math.round(mix[x] * 100)}%`).join(', ')}
                  </span>
                  <span className={`pill ${a.accuracy > 0 ? 'pill-warn' : 'pill-bad'}`}>{a.accuracy > 0 ? 'Close' : 'Not quite'}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : (
        <Section footer="Painting the whole chart is the harder test.">
          <div className="list">
            <button type="button" className="list-row" onClick={onPaint}>
              <span className="grow">Paint this chart from memory</span>
              <ChevronRightIcon size={16} className="chev" />
            </button>
          </div>
        </Section>
      )}

      <BottomBar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {toFix.length > 0 ? (
            <>
              <button className="btn btn-lg glass" onClick={onNewSet}>
                New set
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => onRetry(missed)}>
                {toFix.length === 1 ? 'Drill the miss' : `Drill ${toFix.length} misses`}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-lg glass" onClick={onPaint}>
                Paint it
              </button>
              <button className="btn btn-primary btn-lg" onClick={onNewSet}>
                Start a new set
              </button>
            </>
          )}
        </div>
      </BottomBar>
    </div>
  );
}

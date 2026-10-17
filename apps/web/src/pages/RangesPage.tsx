import { handNickname } from '@felt/content';
import {
  ALL_HAND_CLASSES,
  actionFrequencies,
  boundaryHands,
  type Chart,
  chartOpenBb,
  comboCount,
  type HandClass,
  openSize,
  PAINT_TARGET_MS,
  reaches,
  RECALL_TARGET_MS,
  spotKey,
} from '@felt/core';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { actionColor, sortActions } from '../components/actionColors';
import { ChartPicker, type ChartSelection, selectionFor, variantLine } from '../components/ChartPicker';
import { GameSheet, gameLine } from '../components/GameSheet';
import { MixBar } from '../components/MixBar';
import { hasDefaultGame, RangesIntro, rangesIntroSeen } from '../components/RangesIntro';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { DrillRunner } from '../drills/DrillRunner';
import { QuickRecall } from '../drills/QuickRecall';
import { actionLabels, spotLine } from '../drills/labels';
import { paintRule } from '../drills/PaintDrill';
import { resolveVariant } from '../state/chartPicker';
import { chartMeta, closestForGame, fitForGame, getChart } from '../state/charts';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, FlameIcon, HelpIcon, InfoIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import './ranges.css';
import { getTour, RANGES_TIPS, seeTip, setTour, tipPending, useTour } from '../state/tour';
import { CoachMarks } from '../ui/CoachMarks';

type Mode = 'chart' | 'paint' | 'quick';

const asMode = (m: string | null): Mode => (m === 'paint' || m === 'quick' ? m : 'chart');

/** The chart to start on: a linked one, else the first open chart closest to the player's game. */
function startSelection(linked: string | null, game: Parameters<typeof closestForGame>[0]): ChartSelection | undefined {
  const m = linked ? chartMeta(linked) : undefined;
  if (m) return selectionFor(m);
  const { charts } = closestForGame(game);
  const first = charts.find((c) => c.spot === 'rfi') ?? charts[0];
  return first ? selectionFor(first) : undefined;
}

/**
 * Ranges: look at a chart, paint it from memory, or quiz yourself on its
 * edge hands. Practice here never changes the review schedule. The header is
 * compact so the whole grid and the selected hand fit on a phone screen.
 */
export function RangesPage() {
  const { settings } = useSettings();
  const game = settings.game;
  const [params, setParams] = useSearchParams();
  const [sel, setSel] = useState<ChartSelection | undefined>(() => startSelection(params.get('chart'), game));
  const [mode, setModeState] = useState<Mode>(asMode(params.get('mode')));
  const [picking, setPicking] = useState(false);
  const [gameSheet, setGameSheet] = useState(false);
  // First visit: explain charts once, and ask which game to match if the player never chose one.
  const [intro, setIntro] = useState(() => !rangesIntroSeen());
  const [askGame, setAskGame] = useState(() => !rangesIntroSeen() && hasDefaultGame(game));
  const rangesTip = tipPending(useTour(), 'ranges');
  const meta = sel ? chartMeta(sel.id) : undefined;
  const chart = meta ? getChart(meta.id) : undefined;

  useEffect(() => {
    document.title = 'Ranges · Aced';
  }, []);

  const choose = (next: ChartSelection) => {
    setSel(next);
    const p = new URLSearchParams(params);
    p.set('chart', next.id);
    setParams(p, { replace: true });
  };

  // When the player changes their game, move to the same spot in the new game.
  const gameKey = `${game.tableSize}|${game.stackBb}|${openSize(game)}|${game.format}`;
  const lastGame = useRef(gameKey);
  useEffect(() => {
    if (lastGame.current === gameKey || !meta || !sel) return;
    lastGame.current = gameKey;
    const target = closestForGame(game);
    const same = resolveVariant(target.charts, spotKey(meta), game.stackBb, openSize(game)) ?? target.charts.find((c) => c.spot === 'rfi');
    if (same) choose({ id: same.id, family: sel.family, villain: sel.villain });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  const setMode = (m: Mode) => {
    setModeState(m);
    const next = new URLSearchParams(params);
    if (m === 'chart') next.delete('mode');
    else next.set('mode', m);
    setParams(next, { replace: true });
  };

  if (!chart || !meta || !sel) return <p className="muted">No charts for this game yet.</p>;

  return (
    <div className="stack ranges-page">
      <h1 className="sr-only">Ranges</h1>
      <div className="ranges-bar">
        <Link to="/train" className="ranges-back">
          <ChevronLeftIcon size={18} />
          Train
        </Link>
        <Segmented<Mode>
          ariaLabel="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'chart', label: 'Chart' },
            { value: 'quick', label: 'Quiz' },
            { value: 'paint', label: 'Paint' },
          ]}
        />
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
      </div>
      <GameSheet open={gameSheet} onClose={() => setGameSheet(false)} />
      <RangesIntro open={intro} askGame={askGame} onClose={() => setIntro(false)} />
      {/* After the intro, one tip on the real grid: how to read its colors. Once. */}
      {mode === 'chart' && !intro && rangesTip && (
        <CoachMarks steps={RANGES_TIPS} label="Ranges tip" skipLabel="Skip tip" onEnd={() => setTour(seeTip(getTour(), 'ranges'))} />
      )}

      <div className="ranges-top">
        <ChartPicker
          value={meta}
          selection={sel}
          onChange={choose}
          open={picking}
          onOpen={() => setPicking(true)}
          onClose={() => setPicking(false)}
          onEditGame={() => {
            setPicking(false);
            setGameSheet(true);
          }}
        />
        <ChartAbout chart={chart} mode={mode} />
        <SeatStrip spec={chart.spec} compact />
      </div>

      {mode === 'chart' ? <ChartView chart={chart} /> : <Practice key={`${chart.spec.id}:${mode}`} chart={chart} mode={mode} onPaint={() => setMode('paint')} />}
    </div>
  );
}

/**
 * One quiet line under the picker: the spot, a small honesty tag and an
 * info button. The tag and the button open the details: where the chart
 * comes from, how it fits your game and how practice is graded.
 */
function ChartAbout({ chart, mode }: { chart: Chart; mode: Mode }) {
  const { settings } = useSettings();
  const game = settings.game;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const spec = chart.spec;
  const exploit = spec.basis === 'exploit';
  const derived = spec.source === 'model-approx';
  const fit = fitForGame(spec, game);
  const myOpen = openSize(game);
  const openOff = !fit.open && spec.spot !== 'straddle';
  const off = !fit.table || !fit.stack || openOff;
  const line = spotLine(chart) || spec.title;
  const toggle = () => setOpen((o) => !o);

  return (
    <div className="chart-about">
      <div className="chart-line">
        <span className="chart-line-text">{line}</span>
        <button type="button" className={`pill pill-button${derived ? ' pill-estimate' : ''}`} aria-expanded={open} aria-controls={panelId} onClick={toggle}>
          {derived ? 'Estimate' : 'Close to solver'}
        </button>
        {exploit && <span className="pill pill-exploit">Exploit</span>}
        {off && (
          <button type="button" className="pill pill-warn pill-button" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
            Not your game
          </button>
        )}
        <button type="button" className="chart-info-btn" aria-expanded={open} aria-controls={panelId} aria-label="Chart details" onClick={toggle}>
          <InfoIcon size={22} filled={open} />
        </button>
      </div>
      {open && (
        <div id={panelId} className="chart-about-panel reveal">
          {mode === 'paint' && <p>{paintRule(settings.study.paintMixes !== false)}</p>}
          <p>
            <strong>{spec.title}.</strong> Built for {variantLine(spec)}.
          </p>
          {!derived && (
            <p>
              <strong>Close to solver.</strong> Aced wrote this chart by hand to match published solver results. It is close but not exact. The percentages on mixed hands are the least certain.
            </p>
          )}
          {derived && (
            <p>
              <strong>Estimate.</strong> Aced derived this chart by rule from a hand written chart. It is not a solve. {spec.derived?.how}
            </p>
          )}
          {exploit && <p>This is an exploit chart. It targets a common leak, not a balanced opponent.</p>}
          {off && (
            <p>
              <strong>Not your game.</strong> You play {gameLine(game).replace(/^\w/, (c) => c.toLowerCase())} with {myOpen}bb opens.
              {!fit.table && ' This chart is for the nearest table size.'}
              {!fit.stack && ` This chart is for ${spec.stackBb}bb stacks.`}
              {openOff && ` This chart assumes ${chartOpenBb(spec)}bb opens.`} Treat it as approximate for you.
            </p>
          )}
          {spec.note && !derived && <p>{spec.note}</p>}
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
  const greyed = !reaches(chart, selected);

  const handCard = (
    <div className="hand-card reveal" key={selected}>
      <div className="hand-card-head">
        <span className="display hand-card-name">{selected}</span>
        {handNickname(selected) && <span className="hand-nickname">{handNickname(selected)}</span>}
        <span className="pill num hand-card-combos">{comboCount(selected)} combos</span>
      </div>
      {greyed ? <p className="footnote" style={{ margin: 0 }}>This hand never gets here. It folded or raised earlier.</p> : <MixBar mix={mix} labels={labels} />}
    </div>
  );

  return (
    <>
      <div className="grid-2 ranges-body" style={{ alignItems: 'start' }}>
        <RangeGrid key={chart.spec.id} mixes={chart.mixes} reach={chart.reach} selected={selected} onSelect={setSelected} />

        <div className="stack ranges-side" style={{ position: 'sticky', top: '4.5rem' }}>
          <div className="card hand-side">{handCard}</div>

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
      {/* On a phone the selected hand peeks above the tab bar, so the grid and the hand both fit. */}
      <BottomBar>
        <div className="hand-peek">{handCard}</div>
      </BottomBar>
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

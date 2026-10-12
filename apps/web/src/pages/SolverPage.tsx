import { actionRange, type HandMix, parseCards, parseComboRange, type PlayerSizes, type StreetSizes } from '@felt/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { actionColor } from '../components/actionColors';
import { PlayingCard } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { haptic } from '../haptics';
import { canUse } from '../state/access';
import { getChart } from '../state/charts';
import { saveSolverSpot } from '../state/saved';
import { useSettings } from '../state/settings';
import type { FromWorker, NodeView, RangeInput, SpotInput } from '../solver/protocol';
import { BottomBar } from '../ui/BottomBar';
import { BookmarkIcon, LockIcon, SolverIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';

const chartRange = (id: string, action: string): [string, number][] => {
  const chart = getChart(id);
  return chart ? [...actionRange(chart, action)] : [];
};

interface Preset {
  id: string;
  label: string;
  note: string;
  board: string;
  pot: number;
  stack: number;
  ranges: () => [RangeInput, RangeInput];
  rangeText: [string, string];
}

const PRESETS: Preset[] = [
  {
    id: 'river-barrels',
    label: 'River after two barrels',
    note: 'BTN opened and bet flop and turn; BB called twice. 100bb stacks, so 85bb are left behind. Missed draws are only the heart combos that had a flush draw.',
    board: 'Kc8h5h2s2d',
    pot: 30,
    stack: 85,
    rangeText: ['KJ, KT, K9s, 98s, 88, 55, 87s, 86s, 65s, A5s, 54s, QhJh, JhTh, Th9h', 'AK, KQ, 88, 55, 22, A8s, QhJh, JhTh, Th9h, 76s, 64s, Ah7h, 43s'],
    ranges() {
      return this.rangeText;
    },
  },
  {
    id: 'river-preflop',
    label: 'Toy: preflop ranges on the river',
    note: 'BTN open vs BB call, checked to the river. A teaching toy: real ranges that check twice would hold far fewer strong hands.',
    board: 'Ks7d2c4h9s',
    pot: 5.5,
    stack: 97.5,
    rangeText: ['BB calling range from the chart', 'BTN opening range from the chart'],
    ranges: () => [chartRange('9max-100-bb-vs-btn', 'call'), chartRange('9max-100-rfi-btn', 'raise')],
  },
  {
    id: 'turn-preflop',
    label: 'Turn, preflop ranges',
    note: 'Every river card is solved. Takes a few minutes.',
    board: 'Ks7d2c4h',
    pot: 5.5,
    stack: 97.5,
    rangeText: ['BB calling range from the chart', 'BTN opening range from the chart'],
    ranges: () => [chartRange('9max-100-bb-vs-btn', 'call'), chartRange('9max-100-rfi-btn', 'raise')],
  },
];

const SIZE_OPTIONS = [33, 50, 75, 125];

function sizesFor(bets: number[], raise: boolean): Partial<Record<'flop' | 'turn' | 'river', PlayerSizes>> {
  const s: StreetSizes = { bet: bets.map((b) => b / 100), raise: raise ? [0.75] : [] };
  const both: PlayerSizes = [s, s];
  return { flop: both, turn: both, river: both };
}

function useSolverWorker() {
  const worker = useRef<Worker>();
  const [progress, setProgress] = useState<{ iterations: number; exploitability: number }>();
  const [solved, setSolved] = useState<Extract<FromWorker, { type: 'solved' }>>();
  const [view, setView] = useState<NodeView>();
  const [error, setError] = useState<string>();
  const [running, setRunning] = useState(false);

  useEffect(() => () => worker.current?.terminate(), []);

  const ensure = () => {
    if (worker.current) return worker.current;
    const w = new Worker(new URL('../solver/solver.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.type === 'progress') setProgress(m);
      if (m.type === 'solved') {
        setSolved(m);
        setRunning(false);
        haptic('success');
        w.postMessage({ type: 'node', path: [] });
      }
      if (m.type === 'node') setView(m.view);
      if (m.type === 'error') {
        setError(m.message);
        setRunning(false);
      }
    };
    worker.current = w;
    return w;
  };

  return {
    progress,
    solved,
    view,
    error,
    running,
    solve(spot: SpotInput) {
      setError(undefined);
      setSolved(undefined);
      setView(undefined);
      setProgress(undefined);
      setRunning(true);
      ensure().postMessage({ type: 'solve', spot });
    },
    stop() {
      worker.current?.postMessage({ type: 'stop' });
    },
    open(path: number[]) {
      worker.current?.postMessage({ type: 'node', path });
    },
  };
}

export function SolverPage() {
  const { settings } = useSettings();
  const pro = canUse('solver', settings.access);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const [board, setBoard] = useState(preset.board);
  const [pot, setPot] = useState(preset.pot);
  const [stack, setStack] = useState(preset.stack);
  const [rangeText, setRangeText] = useState<[string, string]>(preset.rangeText);
  const [custom, setCustom] = useState(false);
  const [bets, setBets] = useState<number[]>([33, 75]);
  const [raise, setRaise] = useState(true);
  const [path, setPath] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>();
  const solver = useSolverWorker();
  const results = useRef<HTMLDivElement>(null);
  const solvedAt = solver.solved?.seconds;
  useEffect(() => {
    if (solvedAt !== undefined) results.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [solvedAt]);

  const choosePreset = (p: Preset) => {
    setPresetId(p.id);
    setBoard(p.board);
    setPot(p.pot);
    setStack(p.stack);
    setRangeText(p.rangeText);
    setCustom(false);
  };

  const boardCards = useMemo(() => {
    try {
      const cards = parseCards(board);
      return cards.length >= 4 && cards.length <= 5 ? cards : undefined;
    } catch {
      return undefined;
    }
  }, [board]);

  const rangeError = useMemo(() => {
    if (!custom) return undefined;
    try {
      rangeText.forEach((r) => parseComboRange(r));
      return undefined;
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid range';
    }
  }, [custom, rangeText]);

  const canSolve = !!boardCards && !rangeError && bets.length > 0 && pot > 0 && stack > 0 && (pro || !custom);

  const run = () => {
    if (!canSolve) return;
    setPath([]);
    setLabels([]);
    setSelected(undefined);
    solver.solve({
      board,
      pot,
      stack,
      ranges: custom ? rangeText : preset.ranges(),
      sizes: sizesFor(bets, raise),
      targetPct: boardCards!.length === 5 ? 0.2 : 0.5,
      maxIterations: boardCards!.length === 5 ? 2000 : 400,
    });
  };

  const go = (nextPath: number[], nextLabels: string[]) => {
    setPath(nextPath);
    setLabels(nextLabels);
    setSelected(undefined);
    solver.open(nextPath);
  };

  const view = solver.view;
  const mixes = useMemo(() => {
    const m = new Map<string, HandMix>();
    if (!view || view.kind !== 'action') return m;
    for (const [cls, , mix] of view.classes) {
      const entry: HandMix = {};
      view.actions.forEach((a, i) => (entry[a.id] = mix[i]));
      m.set(cls, entry);
    }
    return m;
  }, [view]);
  const selectedClass = view?.classes.find(([c]) => c === selected);
  const [savedHand, setSavedHand] = useState<string>();
  const saveSpot = async () => {
    if (!view || view.kind !== 'action' || !selectedClass || !solver.solved) return;
    await saveSolverSpot({
      board: view.board,
      pot: view.pot!,
      player: view.player!,
      line: labels,
      hand: selectedClass[0],
      actions: view.actions,
      mix: selectedClass[2],
      exploitability: solver.solved.exploitability,
    });
    haptic('success');
    setSavedHand(`${selectedClass[0]}@${path.join('.')}`);
  };

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="Solver" back={{ to: '/more', label: 'More' }} subtitle="A near equilibrium for the ranges and sizes you choose, with its exploitability shown" />

      <section>
        <h2 className="section-title">Spot</h2>
        <div className="chips" role="group" aria-label="Spot">
          {PRESETS.map((p) => (
            <button key={p.id} className="chip" aria-pressed={p.id === presetId && !custom} data-haptic="select" onClick={() => choosePreset(p)}>
              {p.label}
            </button>
          ))}
          <button className="chip" aria-pressed={custom} data-haptic="select" onClick={() => (pro ? setCustom(true) : undefined)} disabled={!pro}>
            {!pro && <LockIcon size={12} />} Custom
          </button>
        </div>
        <div className="section-footer">{custom ? 'Type any ranges, board and stacks. Ranges take hand classes like KJ or 98s and exact combos like QhJh.' : preset.note}</div>
      </section>

      <div className="card stack solver-setup" style={{ gap: '0.9rem' }}>
        <label className="solver-field">
          <span className="footnote">Board (turn or river)</span>
          <input value={board} disabled={!custom} onChange={(e) => setBoard(e.target.value)} spellCheck={false} autoCapitalize="none" />
        </label>
        {boardCards && (
          <div className="row" style={{ gap: 6 }}>
            {boardCards.map((c) => (
              <PlayingCard key={c} card={c} size="md" />
            ))}
          </div>
        )}
        <div className="solver-row">
          <label className="solver-field">
            <span className="footnote">Pot (bb)</span>
            <input type="number" inputMode="decimal" value={pot} disabled={!custom} onChange={(e) => setPot(Number(e.target.value))} />
          </label>
          <label className="solver-field">
            <span className="footnote">Stack behind (bb)</span>
            <input type="number" inputMode="decimal" value={stack} disabled={!custom} onChange={(e) => setStack(Number(e.target.value))} />
          </label>
        </div>
        {(['Out of position', 'In position'] as const).map((who, i) => (
          <label key={who} className="solver-field">
            <span className="footnote">{who} range</span>
            <textarea
              rows={2}
              value={rangeText[i]}
              disabled={!custom}
              spellCheck={false}
              onChange={(e) => setRangeText((r) => (i === 0 ? [e.target.value, r[1]] : [r[0], e.target.value]))}
            />
          </label>
        ))}
        {rangeError && <div className="explain bad">{rangeError}</div>}
        <div>
          <span className="footnote">Bet sizes, % of pot</span>
          <div className="chips" style={{ marginTop: 6 }}>
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                className="chip num"
                aria-pressed={bets.includes(s)}
                data-haptic="select"
                onClick={() => setBets((b) => (b.includes(s) ? b.filter((x) => x !== s) : [...b, s].sort((x, y) => x - y)))}
              >
                {s}%
              </button>
            ))}
            <button className="chip" aria-pressed={raise} data-haptic="select" onClick={() => setRaise((r) => !r)}>
              Raises
            </button>
          </div>
          <div className="footnote" style={{ marginTop: 6 }}>
            All in is always an option. More sizes take longer to solve.
          </div>
        </div>
      </div>

      {!pro && (
        <Link to="/pro?from=solver" className="card placement-card">
          <span className="placement-icon">
            <SolverIcon size={22} />
          </span>
          <span className="grow">
            <span style={{ display: 'block', fontWeight: 650 }}>Solve your own spots with Pro</span>
            <span className="footnote">The example spots are free. Custom boards, ranges and stacks need Pro.</span>
          </span>
        </Link>
      )}

      {solver.error && <div className="explain bad">{solver.error}</div>}

      {(solver.running || solver.solved) && (
        <div className="card solver-status" ref={results} style={{ scrollMarginTop: 70 }}>
          <div className="row between">
            <span className="footnote">{solver.running ? 'Solving' : 'Solved'}</span>
            <span className={`pill ${solver.solved && solver.solved.exploitability <= 0.5 ? 'pill-good' : 'pill-tint'} num`}>
              {(solver.solved ?? solver.progress)?.exploitability !== undefined
                ? `Exploitability ${Math.min(99.99, (solver.solved ?? solver.progress)!.exploitability).toFixed(2)}%`
                : 'Starting'}
            </span>
          </div>
          <div className="check-bar" style={{ marginTop: 10 }} aria-hidden="true">
            <span
              style={{
                width: `${solver.solved ? 100 : Math.max(4, Math.min(96, 100 - Math.log10(Math.max(0.01, solver.progress?.exploitability ?? 100)) * 30 - 20))}%`,
              }}
            />
          </div>
          <div className="footnote" style={{ marginTop: 8 }}>
            {solver.solved
              ? `${solver.solved.iterations} iterations in ${solver.solved.seconds.toFixed(1)}s. A perfect opponent could gain at most ${solver.solved.exploitability.toFixed(2)}% of the pot against this strategy. EV: out of position ${solver.solved.ev[0].toFixed(2)}bb, in position ${solver.solved.ev[1].toFixed(2)}bb.`
              : `Iteration ${solver.progress?.iterations ?? 0}. Exploitability is how much a perfect opponent could still gain; it falls as the solve converges.`}
          </div>
        </div>
      )}

      {solver.solved && view && (
        <section className="stack" style={{ gap: '0.8rem' }}>
          <h2 className="section-title" id="solver-line" style={{ marginBottom: 0 }}>
            Line
          </h2>
          <div className="chips" role="group" aria-labelledby="solver-line">
            <button className="chip" aria-pressed={path.length === 0} onClick={() => go([], [])}>
              Start
            </button>
            {labels.map((l, i) => (
              <button key={i} className="chip" aria-pressed={i === labels.length - 1} onClick={() => go(path.slice(0, i + 1), labels.slice(0, i + 1))}>
                {l}
              </button>
            ))}
          </div>

          {view.kind === 'action' && (
            <>
              <div className="row between">
                <h2 className="display" style={{ fontSize: '1.6rem', fontWeight: 400 }}>
                  {view.player === 0 ? 'Out of position' : 'In position'} to act
                </h2>
                <span className="footnote num">Pot {view.pot}bb</span>
              </div>
              <div className="solver-mix">
                {view.actions.map((a, i) => (
                  <span key={a.id + i} style={{ width: `${view.aggregate[i] * 100}%`, background: actionColor(a.id) }} />
                ))}
              </div>
              <div className="card" style={{ padding: '0.6rem' }}>
                <RangeGrid mixes={mixes} selected={selected} onSelect={setSelected} />
              </div>
              {selectedClass ? (
                <div className="card solver-hand">
                  <div className="grow">
                    <strong>{selectedClass[0]}</strong>
                    <span className="footnote">
                      {' '}
                      {selectedClass[1].toFixed(1)} combos:{' '}
                      {view.actions.map((a, i) => `${a.label} ${Math.round(selectedClass[2][i] * 100)}%`).join(', ')}
                    </span>
                  </div>
                  {savedHand === `${selectedClass[0]}@${path.join('.')}` ? (
                    <span className="pill pill-good">
                      <BookmarkIcon size={12} filled /> Saved
                    </span>
                  ) : (
                    <button className="test-out" data-haptic="off" onClick={() => void saveSpot()}>
                      <BookmarkIcon size={14} /> Save
                    </button>
                  )}
                </div>
              ) : (
                <div className="footnote">Tap a hand to see its strategy and save it to your review deck.</div>
              )}
              <div className="list">
                {view.actions.map((a, i) => (
                  <button key={a.id + i} className="list-row" onClick={() => go([...path, i], [...labels, `${view.player === 0 ? 'OOP' : 'IP'} ${a.label}`])}>
                    <span className="solver-swatch" style={{ background: actionColor(a.id) }} />
                    <span className="grow">{a.label}</span>
                    <span className="num footnote">{(view.aggregate[i] * 100).toFixed(1)}%</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {view.kind === 'chance' && (
            <div className="stack" style={{ gap: '0.6rem' }}>
              <h2 className="display" style={{ fontSize: '1.6rem', fontWeight: 400 }}>
                Deal the river
              </h2>
              <div className="solver-cards">
                {view.cards.map((c) => (
                  <button key={c} className="chip num" onClick={() => go([...path, parseCards(c)[0]], [...labels, c])}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(view.kind === 'fold' || view.kind === 'showdown') && (
            <p className="muted">{view.kind === 'fold' ? 'The hand ends with a fold.' : 'The hand goes to showdown.'}</p>
          )}
        </section>
      )}

      <p className="footnote">
        Felt Solver runs discounted CFR on your device, combo by combo, with exact card removal. It stops once exploitability is a small share of
        the pot, so the answer is a near equilibrium for the game you define; the ranges and sizes you choose are the assumptions.
      </p>

      <BottomBar>
        {solver.running ? (
          <button className="btn btn-lg btn-block glass" onClick={solver.stop}>
            Stop and show results
          </button>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" disabled={!canSolve} onClick={run}>
            {solver.solved ? 'Solve again' : 'Solve'}
          </button>
        )}
      </BottomBar>
    </div>
  );
}

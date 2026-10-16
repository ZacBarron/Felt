import { actionRange, type Card, cardsToString, type HandMix, makeCard, parseCards, parseComboRange, type PlayerSizes, RANKS, type StreetSizes, SUIT_SYMBOLS, SUITS } from '@felt/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { actionColor } from '../components/actionColors';
import { PlayingCard } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { haptic } from '../haptics';
import { canUse } from '../state/access';
import { chartsForGame, getChart } from '../state/charts';
import { saveSolverSpot } from '../state/saved';
import { useSettings } from '../state/settings';
import type { FromWorker, NodeView, RangeInput, SpotInput } from '../solver/protocol';
import { BottomBar } from '../ui/BottomBar';
import { BookmarkIcon, LockIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import './screens.css';
import './solver.css';

const chartRange = (id: string, action: string): [string, number][] => {
  const chart = getChart(id);
  return chart ? [...actionRange(chart, action)] : [];
};

interface Preset {
  id: string;
  label: string;
  /** One line under the spot chips. */
  short: string;
  /** Shown visibly when the spot is simplified, so the answer is not read as exact for real play. */
  caveat?: string;
  /** The full story, behind info. */
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
    short: 'BTN bet flop and turn. BB called both times.',
    note: 'BTN opened and bet the flop and turn. BB called both times. Stacks started at 100bb, so 85bb are left. The only missed draws are hearts that had a flush draw.',
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
    label: 'Simplified river spot',
    short: 'BTN opens and BB calls. It checks to the river.',
    caveat: 'Simplified ranges',
    note: 'BTN opens and BB calls. It checks to the river. This is a simplified example, since real ranges that check twice hold far fewer strong hands.',
    board: 'Ks7d2c4h9s',
    pot: 5.5,
    stack: 97.5,
    rangeText: ['BB calling range from the chart', 'BTN opening range from the chart'],
    ranges: () => [chartRange('9max-100-bb-vs-btn', 'call'), chartRange('9max-100-rfi-btn', 'raise')],
  },
  {
    id: 'turn-preflop',
    label: 'Turn spot with preflop ranges',
    short: 'Solves every river card. It takes a few minutes.',
    note: 'This solves every river card, so it takes a few minutes.',
    board: 'Ks7d2c4h',
    pot: 5.5,
    stack: 97.5,
    rangeText: ['BB calling range from the chart', 'BTN opening range from the chart'],
    ranges: () => [chartRange('9max-100-bb-vs-btn', 'call'), chartRange('9max-100-rfi-btn', 'raise')],
  },
];

const SIZE_OPTIONS = [33, 50, 75, 125];

/** A chart's action as range text the solver reads, such as "AKs, A5s:0.5". */
function chartRangeText(id: string, action: string): string {
  return chartRange(id, action)
    .filter(([, w]) => w >= 0.005)
    .map(([hand, w]) => (w >= 0.995 ? hand : `${hand}:${w.toFixed(2).replace(/0$/, '')}`))
    .join(', ');
}

/** Reads a board without throwing: whatever cards parse so far. */
function boardOf(text: string): Card[] {
  try {
    return parseCards(text);
  } catch {
    return [];
  }
}

const RANK_NAMES: Record<string, string> = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two' };
const SUIT_NAMES: Record<string, string> = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' };
const STREET_OF_SLOT = ['Flop', 'Flop', 'Flop', 'Turn', 'River'];

/**
 * Pick the board by tapping cards, like a keypad: a column per suit and a row
 * per rank. Cards go on in the order you tap them, flop first.
 */
function BoardSheet({ open, cards, onChange, onClose }: { open: boolean; cards: Card[]; onChange: (cards: Card[]) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const toggle = (c: Card) => {
    if (cards.includes(c)) onChange(cards.filter((x) => x !== c));
    else if (cards.length < 5) onChange([...cards, c]);
  };
  const ranks = [...RANKS].reverse();

  return (
    <dialog
      ref={ref}
      className="sheet board-sheet"
      aria-label="Board"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '0.9rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between" style={{ flexWrap: 'nowrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Board</h2>
            <div className="footnote num" role="status">
              {cards.length} of 5 cards. A spot needs 4 or 5.
            </div>
          </div>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="board-slots" aria-hidden="true">
          {STREET_OF_SLOT.map((street, i) => (
            <span key={i} className="board-slot">
              {cards[i] !== undefined ? <PlayingCard card={cards[i]} size="sm" /> : <span className="board-slot-empty sm" />}
              <span className="board-slot-label">{street}</span>
            </span>
          ))}
        </div>
        <div className="board-keys" role="group" aria-label="Cards">
          {ranks.flatMap((r) =>
            SUITS.map((suit) => {
              const c = makeCard(r, suit);
              const on = cards.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  className={`board-key${on ? ' on' : ''}`}
                  aria-pressed={on}
                  aria-label={`${RANK_NAMES[r]} of ${SUIT_NAMES[suit]}`}
                  disabled={!on && cards.length >= 5}
                  data-haptic="select"
                  style={{ color: `var(--suit-${suit})` }}
                  onClick={() => toggle(c)}
                >
                  {r}
                  <span aria-hidden="true">{SUIT_SYMBOLS[suit]}</span>
                </button>
              );
            }),
          )}
        </div>
        <button className="btn btn-plain" disabled={cards.length === 0} onClick={() => onChange([])}>
          Clear the board
        </button>
      </div>
    </dialog>
  );
}

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
  // Kept as typed, so "5." survives on the way to "5.5".
  const [pot, setPot] = useState(String(preset.pot));
  const [stack, setStack] = useState(String(preset.stack));
  const potBb = Number(pot);
  const stackBb = Number(stack);
  const [picking, setPicking] = useState(false);
  const fills = useMemo(
    () =>
      chartsForGame(settings.game).charts.flatMap((c) =>
        c.spec.actions.map((a) => ({ value: `${c.spec.id}|${a.id}`, label: `${c.spec.title}: ${a.label}` })),
      ),
    [settings.game],
  );
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
    if (solvedAt !== undefined)
      results.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [solvedAt]);

  const choosePreset = (p: Preset) => {
    setPresetId(p.id);
    setBoard(p.board);
    setPot(String(p.pot));
    setStack(String(p.stack));
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
      return e instanceof Error ? e.message : 'Check this range. Something in it is not a valid hand.';
    }
  }, [custom, rangeText]);

  const canSolve = !!boardCards && !rangeError && bets.length > 0 && potBb > 0 && stackBb > 0 && (pro || !custom);

  const run = () => {
    if (!canSolve) return;
    setPath([]);
    setLabels([]);
    setSelected(undefined);
    solver.solve({
      board,
      pot: potBb,
      stack: stackBb,
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
      <PageHeader title="Solver" back={{ to: '/train', label: 'Train' }} />

      <Section
        title="Spot"
        info={
          <>
            <p>{custom ? 'Enter your own spot. Ranges can use hands like KJ or 98s, or exact cards like QhJh.' : preset.note}</p>
            <p style={{ marginTop: '0.5rem' }}>
              Suited Solver runs on your device and checks every card combination. It stops when a perfect opponent could gain only a tiny share of the pot. The
              answer is only as good as the ranges and bet sizes you give it.
            </p>
          </>
        }
      >
        <div className="chips" role="group" aria-label="Spot">
          {PRESETS.map((p) => (
            <button key={p.id} className="chip" aria-pressed={p.id === presetId && !custom} data-haptic="select" onClick={() => choosePreset(p)}>
              {p.label}
            </button>
          ))}
          <button className="chip" aria-pressed={custom} data-haptic="select" onClick={() => setCustom(true)}>
            {!pro && <LockIcon size={12} />} Custom
          </button>
        </div>
        <div className="sc-solver-note">
          <span>{custom ? (pro ? 'Your own board, ranges and sizes.' : 'Set up any spot. Solving your own spot needs Suited Pro.') : preset.short}</span>
          {!custom && preset.caveat && <span className="pill pill-warn">{preset.caveat}</span>}
        </div>
      </Section>

      <div className="card stack solver-setup" style={{ gap: '0.9rem' }}>
        <div className="solver-field">
          <span className="footnote" id="solver-board-label">
            Board, 4 or 5 cards
          </span>
          <button
            type="button"
            className="solver-board"
            aria-labelledby="solver-board-label"
            aria-describedby="solver-board-value"
            aria-haspopup="dialog"
            disabled={!custom}
            onClick={() => setPicking(true)}
          >
            {STREET_OF_SLOT.map((_, i) => {
              const c = boardOf(board)[i];
              return c !== undefined ? <PlayingCard key={i} card={c} size="md" /> : <span key={i} className="board-slot-empty" />;
            })}
            {custom && <span className="solver-board-edit">Change</span>}
            <span id="solver-board-value" className="sr-only">
              {board || 'No cards yet'}
            </span>
          </button>
        </div>
        <BoardSheet open={picking} cards={boardOf(board)} onChange={(cards) => setBoard(cardsToString(cards))} onClose={() => setPicking(false)} />
        <div className="solver-row">
          <label className="solver-field">
            <span className="footnote">Pot in big blinds</span>
            <input inputMode="decimal" value={pot} disabled={!custom} onChange={(e) => setPot(e.target.value.replace(',', '.'))} />
          </label>
          <label className="solver-field">
            <span className="footnote">Stack left, in big blinds</span>
            <input inputMode="decimal" value={stack} disabled={!custom} onChange={(e) => setStack(e.target.value.replace(',', '.'))} />
          </label>
        </div>
        {(['Out of position', 'In position'] as const).map((who, i) => {
          const put = (text: string) => setRangeText((r) => (i === 0 ? [text, r[1]] : [r[0], text]));
          return (
            <div key={who} className="solver-field">
              <div className="row between" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                <label className="footnote" htmlFor={`solver-range-${i}`}>
                  {who} range
                </label>
                {custom && fills.length > 0 && (
                  <select
                    className="solver-fill"
                    value=""
                    aria-label={`Fill the ${who.toLowerCase()} range from a chart`}
                    onChange={(e) => {
                      const [id, action] = e.target.value.split('|');
                      if (id && action) put(chartRangeText(id, action));
                    }}
                  >
                    <option value="" disabled>
                      Fill from a chart
                    </option>
                    {fills.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea id={`solver-range-${i}`} rows={custom ? 3 : 2} value={rangeText[i]} disabled={!custom} spellCheck={false} onChange={(e) => put(e.target.value)} />
            </div>
          );
        })}
        {rangeError && <div className="explain bad">{rangeError}</div>}
        <div>
          <span className="footnote">Bet sizes as a percent of the pot</span>
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
              Allow raises
            </button>
          </div>
          <div className="footnote" style={{ marginTop: 6 }}>
            All in is always an option. More sizes take longer to solve.
          </div>
        </div>
      </div>

      {solver.error && <div className="explain bad">{solver.error}</div>}

      {(solver.running || solver.solved) && (
        <div className="card solver-status" ref={results} style={{ scrollMarginTop: 70 }}>
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <span>
              <span className="sc-hero-num num">
                {(solver.solved ?? solver.progress)?.exploitability !== undefined
                  ? `${Math.min(99.99, (solver.solved ?? solver.progress)!.exploitability).toFixed(2)}%`
                  : '…'}
              </span>
              <span className="sc-result-label">Exploitability, share of the pot</span>
            </span>
            <span className={`pill ${solver.solved && solver.solved.exploitability <= 0.5 ? 'pill-good' : 'pill-tint'}`}>
              {solver.solved ? `Solved in ${solver.solved.seconds.toFixed(1)}s` : 'Solving'}
            </span>
          </div>
          <div className="check-bar" style={{ marginTop: 10 }} aria-hidden="true">
            <span
              style={{
                width: `${solver.solved ? 100 : Math.max(4, Math.min(96, 100 - Math.log10(Math.max(0.01, solver.progress?.exploitability ?? 100)) * 30 - 20))}%`,
              }}
            />
          </div>
          {solver.solved && (
            <div className="sc-stats on-card" style={{ '--cols': 2, marginTop: 12 } as React.CSSProperties}>
              <div className="sc-stat">
                <span className="sc-stat-value num">{solver.solved.ev[0].toFixed(2)}bb</span>
                <span className="sc-stat-label">EV out of position</span>
              </div>
              <div className="sc-stat">
                <span className="sc-stat-value num">{solver.solved.ev[1].toFixed(2)}bb</span>
                <span className="sc-stat-label">EV in position</span>
              </div>
            </div>
          )}
          <div className="footnote" style={{ marginTop: 8 }}>
            {solver.solved
              ? `A perfect opponent could win at most ${solver.solved.exploitability.toFixed(2)}% of the pot against this strategy.`
              : 'This is how much a perfect opponent could still win. It drops as the solver improves.'}
          </div>
        </div>
      )}

      {solver.solved && view && (
        <section className="stack" style={{ gap: '0.8rem' }}>
          <h2 className="section-title" id="solver-line" style={{ marginBottom: 0 }}>
            Action so far
          </h2>
          <div className="chips" role="group" aria-labelledby="solver-line">
            <button className="chip" aria-pressed={path.length === 0} onClick={() => go([], [])}>
              Start of hand
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
                      {selectedClass[1].toFixed(1)} combos: {view.actions.map((a, i) => `${a.label} ${Math.round(selectedClass[2][i] * 100)}%`).join(', ')}
                    </span>
                  </div>
                  {savedHand === `${selectedClass[0]}@${path.join('.')}` ? (
                    <span className="pill pill-good">
                      <BookmarkIcon size={12} filled /> Saved
                    </span>
                  ) : (
                    <button className="tint-capsule" data-haptic="off" onClick={() => void saveSpot()}>
                      <BookmarkIcon size={14} /> Save
                    </button>
                  )}
                </div>
              ) : (
                <div className="footnote">Tap a hand to see how to play it. You can save it to your review.</div>
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

      {!pro && solver.solved && !custom && (
        <div className="card solver-upsell reveal">
          <div className="grow stack" style={{ gap: '0.35rem' }}>
            <strong>Solve the spots you actually play</strong>
            <span className="footnote">Pick any board. Fill each range from your charts. Suited Pro solves it on your device.</span>
            <button
              type="button"
              className="tint-capsule"
              style={{ justifySelf: 'start', marginTop: '0.2rem' }}
              onClick={() => {
                setCustom(true);
                window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
              }}
            >
              Set up my own spot
            </button>
          </div>
        </div>
      )}

      <BottomBar>
        {solver.running ? (
          <button className="btn btn-lg btn-block glass" onClick={solver.stop}>
            Stop and show results
          </button>
        ) : custom && !pro ? (
          <Link to="/pro?from=solver" className="btn btn-primary btn-lg btn-block">
            <LockIcon size={18} /> Unlock to solve this spot
          </Link>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" disabled={!canSolve} onClick={run}>
            {solver.solved ? 'Solve again' : 'Solve'}
          </button>
        )}
      </BottomBar>
    </div>
  );
}

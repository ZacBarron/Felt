import { BOTS, botById, playerTypeOf, TABLE_PRESETS } from '@felt/content';
import {
  act,
  botMix,
  cardsToString,
  type HandState,
  legalActions,
  type PlayAction,
  type PlayDecision,
  potSize,
  type Rng,
  sampleAction,
  seededRng,
  startHand,
} from '@felt/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayTable } from '../components/PlayTable';
import { haptic } from '../haptics';
import { useCanAskCoach } from '../state/coach';
import { actionText, chartAdvisor, gradeHand, handNotes, HERO, isClearFold, type PlayGrade, type PlaySeat, rateHand, seatsFor } from '../state/play';
import { addHandsToReview } from '../state/review';
import { BotPortrait } from '../ui/BotPortrait';
import { BottomBar } from '../ui/BottomBar';
import { CloseIcon, CoachIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';
import { Toggle } from '../ui/Toggle';
import { useBodyClass } from '../ui/useBodyClass';
import './play.css';

interface PlayConfig {
  seats: number;
  stack: number;
  preset: string;
  skipFolds: boolean;
}

const CONFIG_KEY = 'felt.play.v1';
const DEFAULT_CONFIG: PlayConfig = { seats: 6, stack: 100, preset: 'casino', skipFolds: true };

function loadConfig(): PlayConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') };
  } catch {
    return DEFAULT_CONFIG;
  }
}

interface SessionStats {
  hands: number;
  skipped: number;
  /** Net result in bb. Mostly luck over a few hundred hands. */
  net: number;
  graded: number;
  good: number;
  evLost: number;
}

const NO_STATS: SessionStats = { hands: 0, skipped: 0, net: 0, graded: 0, good: 0, evLost: 0 };

/** Full hands against bots, from the deal to showdown, with a recap after each one. */
export function PlayPage() {
  const [config, setConfig] = useState<PlayConfig>(loadConfig);
  const [playing, setPlaying] = useState(false);
  const [last, setLast] = useState<SessionStats>();
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Private mode: the setup still works for this visit.
    }
  }, [config]);
  if (playing)
    return (
      <Table
        config={config}
        onEnd={(stats) => {
          setLast(stats.hands ? stats : undefined);
          setPlaying(false);
        }}
      />
    );
  return <Setup config={config} onChange={setConfig} last={last} onStart={() => setPlaying(true)} />;
}

function Setup({ config, onChange, onStart, last }: { config: PlayConfig; onChange: (c: PlayConfig) => void; onStart: () => void; last?: SessionStats }) {
  const preset = TABLE_PRESETS.find((p) => p.id === config.preset) ?? TABLE_PRESETS[0];
  const bots = preset.bots.slice(0, config.seats - 1).map((id) => botById(id)!);
  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Play" subtitle="Play full hands against bots. Suited grades each decision it can grade honestly." />

      {last && <SessionSummary stats={last} />}

      <Section title="Table">
        <div className="list">
          <div className="list-row">
            <span className="grow">Players</span>
            <Stepper label="Players" value={config.seats} min={2} max={9} onChange={(seats) => onChange({ ...config, seats })} />
          </div>
          <div className="list-row">
            <span className="grow">Stacks</span>
            <Segmented
              ariaLabel="Stacks"
              value={config.stack}
              options={[50, 100, 200].map((v) => ({ value: v, label: `${v}bb` }))}
              onChange={(stack) => onChange({ ...config, stack })}
            />
          </div>
          <label className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Skip clear folds</span>
              <span className="footnote">Only hands the chart folds every time</span>
            </span>
            <Toggle label="Skip clear folds" checked={config.skipFolds} onChange={(skipFolds) => onChange({ ...config, skipFolds })} />
          </label>
        </div>
      </Section>

      <Section title="Opponents" footer="Bots play by rules after the flop, so treat their play there as approximate. Each one is a player type from Exploits.">
        <div className="list" role="radiogroup" aria-label="Table">
          {TABLE_PRESETS.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={p.id === preset.id}
              className="list-row play-preset"
              data-haptic="select"
              onClick={() => onChange({ ...config, preset: p.id })}
            >
              <span className="grow">
                <span style={{ display: 'block' }}>{p.name}</span>
                <span className="footnote">{p.blurb}</span>
              </span>
              <span className={`play-radio${p.id === preset.id ? ' on' : ''}`} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="play-lineup">
          {bots.map((b) => (
            <div key={b.id} className="play-lineup-bot">
              <BotPortrait look={b.look} size={44} />
              <span className="play-lineup-name">{b.name}</span>
              <span className="play-lineup-type">{playerTypeOf(b)?.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={onStart}>
          Start playing
        </button>
      </BottomBar>
    </div>
  );
}

function SessionSummary({ stats }: { stats: SessionStats }) {
  const share = stats.graded ? Math.round((stats.good / stats.graded) * 100) : undefined;
  return (
    <section className="card play-summary">
      <span className="play-summary-label">Last session</span>
      <div className="play-summary-grid">
        <div>
          <span className="play-summary-value num">{share === undefined ? 'None' : `${share}%`}</span>
          <span className="footnote">Good decisions, of {stats.graded} graded</span>
        </div>
        <div>
          <span className="play-summary-value num">{stats.evLost.toFixed(1)}bb</span>
          <span className="footnote">Given up on calls and folds</span>
        </div>
      </div>
      <span className="footnote">
        {stats.hands} hands, {stats.skipped} clear folds skipped. Result {stats.net >= 0 ? '+' : ''}
        {stats.net.toFixed(1)}bb, which is mostly luck over this few hands.
      </span>
    </section>
  );
}

// The table ----------------------------------------------------------------------------

interface Hand {
  id: string;
  seed: number;
  state: HandState;
  history: PlayDecision[];
  said: Record<number, string>;
}

const randomSeed = () => (Math.random() * 2 ** 31) | 0;
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Runs bots without pausing until the player acts or the hand ends. Used for skipped hands and after the player folds. */
function fastForward(hand: Hand, seats: readonly PlaySeat[], rng: Rng): Hand {
  let { state } = hand;
  const history = [...hand.history];
  while (state.toAct !== null && state.toAct !== HERO) {
    const seat = state.toAct;
    const action = sampleAction(botMix(state, state.players[seat].cards, seats[seat].bot!.profile, chartAdvisor), rng);
    history.push({ state, action });
    state = act(state, action);
  }
  return { ...hand, state, history };
}

function Table({ config, onEnd }: { config: PlayConfig; onEnd: (stats: SessionStats) => void }) {
  useBodyClass('focus-mode');
  const seats = useMemo(() => {
    const preset = TABLE_PRESETS.find((p) => p.id === config.preset) ?? TABLE_PRESETS[0];
    const ids = [...preset.bots, ...BOTS.map((b) => b.id).filter((id) => !preset.bots.includes(id))];
    return seatsFor(config.seats, ids);
  }, [config.seats, config.preset]);
  const rng = useRef<Rng>(seededRng(1));
  const button = useRef(Math.floor(Math.random() * config.seats));
  const first = useRef<{ hand: Hand; skipped: number }>();
  if (!first.current) first.current = deal();
  const [stats, setStats] = useState<SessionStats>({ ...NO_STATS, skipped: first.current.skipped });
  const [hand, setHand] = useState<Hand>(first.current.hand);
  const [grades, setGrades] = useState<PlayGrade[]>();
  const [size, setSize] = useState<number>();

  /** Deals the next hand the player should see, skipping clear folds when asked. */
  function deal(): { hand: Hand; skipped: number } {
    let skipped = 0;
    for (;;) {
      button.current = (button.current + 1) % config.seats;
      const seed = randomSeed();
      const state = startHand({ stacks: Array(config.seats).fill(config.stack), button: button.current }, seededRng(seed));
      // Bots act from their own stream, so a preview of the action up to the player matches the real hand.
      rng.current = seededRng(seed + 1);
      const hand: Hand = { id: `${Date.now().toString(36)}-${seed}`, seed, state, history: [], said: {} };
      if (config.skipFolds && skipped < 40) {
        const ahead = fastForward(hand, seats, seededRng(seed + 1));
        if (ahead.state.toAct === HERO && isClearFold(ahead.state)) {
          skipped++;
          continue;
        }
      }
      return { hand, skipped };
    }
  }

  const { state } = hand;
  const over = state.toAct === null;

  // Bots act one at a time, with a short pause so the action can be followed.
  useEffect(() => {
    if (over || state.toAct === HERO) return;
    const seat = state.toAct!;
    const wait = reduceMotion() ? 200 : 650;
    const t = window.setTimeout(() => {
      const action = sampleAction(botMix(state, state.players[seat].cards, seats[seat].bot!.profile, chartAdvisor), rng.current);
      setHand((h) => advance(h, action));
    }, wait);
    return () => window.clearTimeout(t);
  }, [state, over, seats]);

  // When a hand ends: grade it, rate what counts, add it to the session.
  useEffect(() => {
    if (!over) return;
    const t = window.setTimeout(() => {
      const g = gradeHand(hand.history, seats, hand.seed);
      setGrades(g);
      void rateHand(g, hand.history, hand.id);
      const graded = g.filter((x) => x.grade);
      setStats((s) => ({
        ...s,
        hands: s.hands + 1,
        net: s.net + (state.result?.net[HERO] ?? 0),
        graded: s.graded + graded.length,
        good: s.good + graded.filter((x) => x.grade === 'best' || x.grade === 'correct').length,
        evLost: s.evLost + graded.reduce((a, x) => a + (x.evLoss ?? 0), 0),
      }));
      const net = state.result?.net[HERO] ?? 0;
      haptic(net > 0 ? 'success' : 'warning');
    }, 50);
    return () => window.clearTimeout(t);
    // Once per hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, hand.id]);

  function advance(h: Hand, action: PlayAction): Hand {
    const seat = h.state.toAct!;
    const text = actionText(h.state, action);
    const next = act(h.state, action);
    const said = next.street !== h.state.street ? {} : { ...h.said, [seat]: text };
    return { ...h, state: next, history: [...h.history, { state: h.state, action }], said };
  }

  function heroAct(action: PlayAction) {
    setSize(undefined);
    setHand((h) => {
      const next = advance(h, action);
      // After a fold the rest of the hand plays out at once.
      return action.kind === 'fold' ? fastForward(next, seats, rng.current) : next;
    });
  }

  function nextHand() {
    setGrades(undefined);
    const next = deal();
    if (next.skipped) setStats((st) => ({ ...st, skipped: st.skipped + next.skipped }));
    setHand(next.hand);
  }

  const shown = new Set<number>([HERO]);
  if (over && state.result?.showdown) state.players.filter((p) => !p.folded).forEach((p) => shown.add(p.seat));
  const winners = over ? new Set(state.result!.won.map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0)) : undefined;

  return (
    <div className="play-page">
      <header className="play-head">
        <button className="btn btn-plain play-end" onClick={() => onEnd(stats)} aria-label="End session">
          <CloseIcon size={20} />
        </button>
        <span className="play-head-title">
          Hand {stats.hands + (over ? 0 : 1)}
          <span className="play-head-net num">
            {stats.net >= 0 ? '+' : ''}
            {stats.net.toFixed(1)}bb
          </span>
        </span>
        <span className="play-head-skip footnote num">{stats.skipped ? `${stats.skipped} skipped` : ''}</span>
      </header>

      <PlayTable state={state} seats={seats} said={hand.said} shown={shown} winners={winners} />

      {over ? <Recap hand={hand} seats={seats} grades={grades} /> : null}

      <BottomBar>{over ? <button className="btn btn-primary btn-lg btn-block" onClick={nextHand}>Deal next hand</button> : <Actions state={state} size={size} onSize={setSize} onAct={heroAct} />}</BottomBar>
    </div>
  );
}

// Actions ----------------------------------------------------------------------------

const round = (x: number) => Math.round(x * 2) / 2;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Size choices: the solver's pot shares after the flop, open and raise multiples before it. */
function sizeOptions(state: HandState): { label: string; to: number }[] {
  const legal = legalActions(state);
  const r = legal.raise;
  if (!r) return [];
  const pot = potSize(state);
  const clampTo = (to: number) => Math.min(r.max, Math.max(r.min, round(to)));
  let list: { label: string; to: number }[];
  if (state.street === 'preflop') {
    const limps = state.log.filter((a) => a.street === 'preflop' && a.kind === 'call').length;
    list =
      r.kind === 'raise' && state.currentBet <= state.bb
        ? [
            { label: `${fmt(2.5 + limps)}bb`, to: 2.5 + limps },
            { label: `${fmt(3 + limps)}bb`, to: 3 + limps },
          ]
        : [
            { label: '3x', to: state.currentBet * 3 },
            { label: '4x', to: state.currentBet * 4 },
          ];
  } else if (r.kind === 'bet') {
    list = [
      { label: '33%', to: pot * 0.33 },
      { label: '75%', to: pot * 0.75 },
    ];
  } else {
    list = [
      { label: '2.5x', to: state.currentBet * 2.5 },
      { label: '3.5x', to: state.currentBet * 3.5 },
    ];
  }
  const seen = new Set<number>();
  const out = [...list.map((o) => ({ ...o, to: clampTo(o.to) })), { label: 'All in', to: r.max }].filter((o) => {
    if (seen.has(o.to)) return false;
    seen.add(o.to);
    return true;
  });
  return out;
}

function Actions({ state, size, onSize, onAct }: { state: HandState; size?: number; onSize: (n: number | undefined) => void; onAct: (a: PlayAction) => void }) {
  if (state.toAct !== HERO) {
    return <div className="play-waiting footnote">Waiting for the bots</div>;
  }
  const legal = legalActions(state);
  const options = sizeOptions(state);
  const r = legal.raise;
  const chosen = r ? (size ?? options[0]?.to ?? r.min) : undefined;
  const raiseLabel = !r || chosen === undefined ? '' : chosen >= r.max ? `All in ${fmt(r.max)}` : r.kind === 'bet' ? `Bet ${fmt(chosen)}` : `Raise to ${fmt(chosen)}`;
  return (
    <div className="play-actions">
      {r && (
        <div className="play-sizes" role="radiogroup" aria-label="Size">
          {options.map((o) => (
            <button key={o.label} role="radio" aria-checked={chosen === o.to} className={`play-size${chosen === o.to ? ' on' : ''}`} data-haptic="select" onClick={() => onSize(o.to)}>
              {o.label}
            </button>
          ))}
          {r.max > r.min && (
            <input
              className="play-slider"
              type="range"
              aria-label="Custom size"
              min={r.min}
              max={r.max}
              step={0.5}
              value={chosen}
              onChange={(e) => onSize(Number(e.target.value))}
            />
          )}
        </div>
      )}
      <div className="play-buttons">
        {legal.fold && (
          <button className="btn btn-lg play-fold" onClick={() => onAct({ kind: 'fold' })}>
            Fold
          </button>
        )}
        {legal.check ? (
          <button className="btn btn-lg btn-tinted" onClick={() => onAct({ kind: 'check' })}>
            Check
          </button>
        ) : (
          <button className="btn btn-lg btn-tinted" onClick={() => onAct({ kind: 'call' })}>
            {legal.callAllIn ? 'Call all in' : `Call ${fmt(legal.call)}`}
          </button>
        )}
        {r && chosen !== undefined && (
          <button className="btn btn-lg btn-primary" onClick={() => onAct({ kind: r.kind, to: chosen })}>
            {raiseLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Recap ------------------------------------------------------------------------------

const GRADE_WORDS = { best: 'Best', correct: 'Good', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' } as const;
const STREET_WORDS = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' } as const;
const TIER_WORDS = { chart: 'Chart', bot: 'Against this bot', none: 'Not graded' } as const;

function resultLine(state: HandState, seats: readonly PlaySeat[]): string {
  const r = state.result!;
  const name = (s: number) => (s === HERO ? 'You' : (seats[s].bot?.name ?? 'Seat'));
  const best = Math.max(...r.net);
  const top = r.net.map((net, i) => ({ net, i })).filter((x) => x.net > 0 && Math.abs(x.net - best) < 1e-9);
  if (top.length !== 1) return 'Split pot.';
  const { i } = top[0];
  const hand = r.showdown && r.hands[i] ? ` with ${r.hands[i].toLowerCase()}` : '';
  return `${name(i)} ${i === HERO ? 'win' : 'wins'} ${fmt(Math.round(r.won[i] * 10) / 10)}bb${hand}.`;
}

/** A question for the coach about this hand, as a draft. */
function coachQuestion(hand: Hand, seats: readonly PlaySeat[]): string {
  const s0 = hand.history[0]?.state ?? hand.state;
  const me = s0.players[HERO];
  const name = (s: number) => (s === HERO ? 'I' : `${seats[s].bot?.name ?? 'Seat'} (${s0.players[s].position})`);
  const lines: string[] = [];
  let street = '';
  for (const d of hand.history) {
    if (d.state.street !== street) {
      street = d.state.street;
      lines.push(`${STREET_WORDS[d.state.street]}${d.state.board.length ? ` ${cardsToString(d.state.board)}` : ''}:`);
    }
    lines.push(`${name(d.state.toAct!)} ${actionText(d.state, d.action).toLowerCase()}`);
  }
  return `I played this hand against bots, ${s0.players.length} handed with ${me.stack + me.total}bb stacks. I had ${cardsToString(me.cards)} in the ${me.position}.\n${lines.join('\n')}\nWhat should I have done differently?`;
}

function Recap({ hand, seats, grades }: { hand: Hand; seats: readonly PlaySeat[]; grades?: PlayGrade[] }) {
  const canAskCoach = useCanAskCoach();
  const [added, setAdded] = useState(false);
  const notes = useMemo(() => handNotes(hand.history), [hand.history]);
  const misses = (grades ?? []).filter((g) => g.tier === 'chart' && g.grade !== 'best' && g.chart).map((g) => ({ chartId: g.chart!.id, hand: g.chart!.hand }));
  return (
    <section className="play-recap reveal">
      <div className="play-result">{resultLine(hand.state, seats)}</div>
      {grades === undefined ? (
        <p className="footnote">Grading your decisions</p>
      ) : grades.length === 0 ? (
        <p className="footnote">You had no decisions this hand.</p>
      ) : (
        <div className="list">
          {grades.map((g) => (
            <div key={g.index} className="list-row play-grade">
              <span className="grow">
                <span className="play-grade-head">
                  <span className="play-grade-street">{STREET_WORDS[g.street]}</span>
                  {g.did}
                </span>
                <span className="footnote" style={{ display: 'block' }}>
                  {g.detail}
                </span>
                {g.tier !== 'none' && <span className="play-grade-tier">{TIER_WORDS[g.tier]}</span>}
              </span>
              <span className={`play-grade-chip ${g.grade ?? 'none'}`}>{g.grade ? GRADE_WORDS[g.grade] : 'Not graded'}</span>
            </div>
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <div className="play-notes">
          {notes.map((n) => (
            <p key={n} className="footnote">
              {n}
            </p>
          ))}
        </div>
      )}
      <div className="play-recap-actions">
        {misses.length > 0 && (
          <button
            className="btn btn-tinted"
            disabled={added}
            onClick={() => {
              void addHandsToReview(misses);
              setAdded(true);
            }}
          >
            {added ? 'Added to Review' : 'Add to Review'}
          </button>
        )}
        {canAskCoach && (
          <Link to="/coach" state={{ question: coachQuestion(hand, seats) }} className="btn btn-tinted">
            <CoachIcon size={18} />
            Ask the coach
          </Link>
        )}
      </div>
    </section>
  );
}

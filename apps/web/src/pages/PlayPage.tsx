import {
  type Card,
  cardsToString,
  rankOf,
  SUIT_SYMBOLS,
  suitOf,
  type HandState,
  handClassOf,
  openSize,
  legalActions,
  type PlayAction,
  potSize,
  type Rng,
  seededRng,
  startHand,
  straddleOf,
} from '@felt/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { OpenSizeRow } from '../components/OpenSizeRow';
import { GroupLabel, Sheet, SessionSummary, SheetHead } from '../components/PlaySheet';
import { PlayingCard } from '../components/PlayingCard';
import { PlayTable } from '../components/PlayTable';
import { useSettings } from '../state/settings';
import { haptic } from '../haptics';
import { useCanAskCoach } from '../state/coach';
import { actionText, gradeHand, handNotes, HERO, type PlayGrade, type PlaySeat, rateHand } from '../state/play';
import { applyAction, botAction, dealNext, liveRng, seatsOf } from '../state/playFlow';
import { getSession, type HandRecord, leaveTable, setSession, type TableSession, useTableSession } from '../state/playTable';
import { addHandsToReview } from '../state/review';
import { shareUrl } from '../state/referral';
import { ChevronLeftIcon, ChevronRightIcon, CoachIcon, MinusIcon, MoreIcon, PlusIcon, ShareIcon } from '../ui/icons';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';
import { useBodyClass } from '../ui/useBodyClass';
import { Lobby } from './PlayLobby';
import './play.css';

/** Cards as people write them, such as Q♦ 7♠. */
const pretty = (cards: readonly Card[]) => cards.map((c) => `${rankOf(c)}${SUIT_SYMBOLS[suitOf(c)]}`).join(' ');
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;

/** A cash table against bots: a lobby to pick a table, then hands dealt one after another. */
export function PlayPage() {
  const session = useTableSession();
  return session ? <TableScreen session={session} /> : <Lobby />;
}

// The table --------------------------------------------------------------------------

const randomSeed = () => (Math.random() * 2 ** 31) | 0;
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type PreAction = 'checkfold' | 'check' | 'callany';

/** How long a bot takes over an action: folds are quick, big decisions take longer. */
function thinkMs(state: HandState, action: PlayAction, speed: TableSession['settings']['speed']): number {
  if (speed === 'instant' || reduced()) return 110;
  const big = legalActions(state).call > potSize(state) * 0.4;
  const natural = speed === 'natural';
  if (action.kind === 'fold') return natural ? 450 + Math.random() * 300 : 170;
  if (action.kind === 'check') return natural ? 600 + Math.random() * 400 : 280;
  const base = natural ? 800 + Math.random() * 700 + (big ? 700 : 0) : 420 + (big ? 250 : 0);
  return Math.round(base);
}

/** The pause on a finished hand before the next deal. Shorter when you were not in it at the end. */
function resultMs(state: HandState, speed: TableSession['settings']['speed']): number {
  const base = speed === 'instant' ? 900 : speed === 'quick' ? 1600 : 2600;
  return state.players[HERO].folded ? base * 0.6 : base;
}

function TableScreen({ session }: { session: TableSession }) {
  useBodyClass('focus-mode');
  useBodyClass('play-room-body');
  const seats = useMemo(() => seatsOf(session), [session.bots, session.table]);
  const rng = useRef<Rng>(seededRng(randomSeed()));
  const [pre, setPre] = useState<PreAction>();
  const [size, setSize] = useState<number>();
  const [thinking, setThinking] = useState<{ seat: number; ms: number }>();
  const [menu, setMenu] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  const [toast, setToast] = useState<string>();
  const [note, setNote] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const live = session.live;
  const speed = session.settings.speed;
  const busted = !live && session.stacks[HERO] + session.pendingChips <= 0;

  /** Deals the next hand. Clear folds are folded and played out at once when asked. */
  function deal() {
    setSession((s) => dealNext(s, randomSeed));
    const s = getSession();
    if (s?.live) rng.current = liveRng(s.live.seed);
    const skipped = s?.justSkipped ?? 0;
    setNote(skipped ? `Skipped ${skipped} clear ${skipped === 1 ? 'fold' : 'folds'}` : undefined);
  }

  function advance(action: PlayAction) {
    setSession((s) => applyAction(s, action, rng.current));
  }

  // The table loop: deal, let bots think and act, pause on the result, then deal again.
  useEffect(() => {
    if (!live) {
      if (session.sittingOut || busted || leaving) return;
      const t = window.setTimeout(deal, 300);
      return () => window.clearTimeout(t);
    }
    const { state } = live;
    if (state.result) {
      const t = window.setTimeout(() => setSession((s) => ({ ...s, live: undefined })), resultMs(state, speed));
      return () => window.clearTimeout(t);
    }
    if (state.toAct !== HERO) {
      const seat = state.toAct!;
      const action = botAction(state, seats, rng.current);
      const ms = thinkMs(state, action, speed);
      setThinking(ms >= 400 ? { seat, ms } : undefined);
      const t = window.setTimeout(() => {
        setThinking(undefined);
        advance(action);
      }, ms);
      return () => window.clearTimeout(t);
    }
    // The player's turn: a choice made while waiting plays now.
    const legal = legalActions(state);
    if (pre) {
      setPre(undefined);
      if (pre === 'checkfold') return advance(legal.check ? { kind: 'check' } : { kind: 'fold' });
      if (pre === 'callany') return advance(legal.check ? { kind: 'check' } : { kind: 'call' });
      if (pre === 'check' && legal.check) return advance({ kind: 'check' });
    }
    haptic('select');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.state, session.sittingOut, busted, leaving]);

  // When hands end: grade them quietly and rate what counts. A fast deal can finish more than one before this runs.
  const lastId = session.hands.at(-1)?.id;
  useEffect(() => {
    const todo = getSession()?.hands.filter((h) => !h.grades) ?? [];
    if (!todo.length) return;
    const t = window.setTimeout(() => {
      for (const rec of todo) {
        const grades = gradeHand(rec.history, seats, rec.seed);
        void rateHand(grades, rec.history, rec.id);
        const graded = grades.filter((g) => g.grade);
        setSession((s) => ({
          ...s,
          hands: s.hands.map((h) => (h.id === rec.id ? { ...h, grades } : h)),
          stats: {
            ...s.stats,
            graded: s.stats.graded + graded.length,
            good: s.stats.good + graded.filter((g) => g.grade === 'best' || g.grade === 'correct').length,
            evLost: s.stats.evLost + graded.reduce((a, g) => a + (g.evLoss ?? 0), 0),
          },
        }));
        if (rec === todo.at(-1) && getSession()?.settings.showGrades && graded.length) setToast(gradeLine(graded));
      }
    }, 60);
    return () => window.clearTimeout(t);
    // Once per finished hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(undefined), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(undefined), 2400);
    return () => window.clearTimeout(t);
  }, [note]);

  // A new street or a new bet clears a plain check that no longer fits.
  useEffect(() => setPre((p) => (p === 'check' ? undefined : p)), [live?.state.currentBet, live?.state.street]);

  const lastHand = session.hands.at(-1);
  const lastMiss = !!lastHand?.grades?.some((g) => g.grade === 'mistake' || g.grade === 'blunder');
  const state = live?.state;
  const banner = state?.result ? resultLine(state, seats) : undefined;
  const rare = !!state && rarePot(state);
  useEffect(() => {
    if (rare) haptic('success');
  }, [rare]);
  const me = state?.players[HERO];
  const inHand = !!state && !state.result && !me!.folded && !me!.allIn;
  const dealt = session.stats.hands + session.stats.skipped + (state && !state.result ? 1 : 0);
  const stakes = session.table.stakes?.label;

  return (
    <div className="play-room">
      <header className="play-head">
        <button className="play-icon-btn" onClick={() => setMenu(true)} aria-label="Table settings">
          <MoreIcon size={22} />
        </button>
        <span className="play-head-title">
          <span className="play-head-name">{session.table.name}</span>
          {note ? (
            <span className="play-head-sub play-head-note" role="status">
              {note}
            </span>
          ) : (
            <span className="play-head-sub num">
              {stakes ? `${stakes} · ` : ''}Hand {dealt} · {signed(session.stats.net)}bb
            </span>
          )}
        </span>
        <button className="play-last-btn" onClick={() => setLastOpen(true)} disabled={!lastHand}>
          Last hand
          {lastMiss && <span className="play-last-dot" aria-label="Has a mistake" />}
        </button>
      </header>

      <div className="play-toasts" aria-live="polite">
        {toast && (
          <button className="play-toast" onClick={() => setLastOpen(true)}>
            {toast}
          </button>
        )}
      </div>

      <div className="play-stage">
        {state ? (
          <PlayTable handId={live!.id} state={state} seats={seats} said={live!.said} thinking={thinking} banner={banner} bannerRare={rare} />
        ) : (
          <PlayTableIdle session={session} seats={seats} />
        )}
      </div>

      <div className="play-dock">
        {busted ? (
          <div className="play-dock-col">
            <p className="play-dock-note">You are out of chips.</p>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setSession((s) => ({ ...s, pendingChips: s.buyIn }))}>
              Add {session.buyIn}bb
            </button>
          </div>
        ) : session.sittingOut && !inHand && !state ? (
          <div className="play-dock-col">
            <p className="play-dock-note">You are sitting out.</p>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setSession((s) => ({ ...s, sittingOut: false }))}>
              Deal me in
            </button>
          </div>
        ) : state && state.toAct === HERO ? (
          <Actions
            state={state}
            size={size}
            onSize={setSize}
            onAct={(a) => {
              setSize(undefined);
              advance(a);
            }}
          />
        ) : inHand ? (
          <PreActions state={state!} value={pre} onChange={setPre} />
        ) : (
          <p className="play-dock-note">{state?.result ? ' ' : me?.folded ? 'You folded. The next hand comes after this one.' : 'Dealing'}</p>
        )}
      </div>

      <MenuSheet
        open={menu}
        onClose={() => setMenu(false)}
        session={session}
        onLeave={() => {
          setMenu(false);
          setLeaving(true);
        }}
      />
      <LastHandSheet open={lastOpen} onClose={() => setLastOpen(false)} hands={session.hands} seats={seats} />
      <Sheet open={leaving} onClose={() => setLeaving(false)} label="Leave table">
        <h2 className="play-sheet-title">Leave the table?</h2>
        <SessionSummary stats={session.stats} title="This session" />
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => {
            setLeaving(false);
            leaveTable();
          }}
        >
          Leave table
        </button>
        <button className="btn btn-tinted btn-lg btn-block" onClick={() => setLeaving(false)}>
          Keep playing
        </button>
      </Sheet>
    </div>
  );
}

/** Between hands or while sitting out: the seats with their stacks and no cards. */
function PlayTableIdle({ session, seats }: { session: TableSession; seats: PlaySeat[] }) {
  const state = useMemo(() => {
    const s = startHand({ stacks: session.stacks.map((x) => Math.max(x, 1)), button: session.button }, seededRng(1));
    return { ...s, toAct: null, log: [], players: s.players.map((p, i) => ({ ...p, stack: session.stacks[i], street: 0, total: 0, folded: true })) };
  }, [session.stacks, session.button]);
  return <PlayTable handId="idle" state={state} seats={seats} said={{}} />;
}

function gradeLine(graded: PlayGrade[]): string {
  const words = { best: 'best', correct: 'good', inaccuracy: 'an inaccuracy', mistake: 'a mistake', blunder: 'a blunder' } as const;
  const worst = [...graded].sort((a, b) => (b.evLoss ?? 0) - (a.evLoss ?? 0) || order(b.grade!) - order(a.grade!))[0];
  return `${STREET_WORDS[worst.street]} ${worst.did.toLowerCase()} was ${words[worst.grade!]}. Tap to see why.`;
}
const order = (g: string) => ['best', 'correct', 'inaccuracy', 'mistake', 'blunder'].indexOf(g);

// Actions ----------------------------------------------------------------------------

const round = (x: number) => Math.round(x * 2) / 2;

/**
 * Raise sizes to offer, like an online client. Unopened before the flop
 * that is your open plus 1bb for each limper (in straddles if there is
 * one), then multiples of the raise, then shares of the pot after the flop.
 */
export function sizeOptions(state: HandState, open: number): { label: string; to: number; mine?: boolean }[] {
  const legal = legalActions(state);
  const r = legal.raise;
  if (!r) return [];
  const pot = potSize(state);
  const clampTo = (to: number) => Math.min(r.max, Math.max(r.min, round(to)));
  let list: { label: string; to: number; mine?: boolean }[];
  const preflop = state.log.filter((a) => a.street === 'preflop');
  if (state.street === 'preflop' && !preflop.some((a) => a.kind === 'raise')) {
    const unit = Math.max(1, straddleOf(state) / state.bb);
    const limps = preflop.filter((a) => a.kind === 'call').length;
    list = [...new Set([2.5, 3, open])].sort((x, y) => x - y).map((x) => ({ label: `${fmt((x + limps) * unit)}bb`, to: (x + limps) * unit, mine: x === open }));
  } else if (state.street === 'preflop') {
    list = [3, 4].map((x) => ({ label: `${x}x`, to: state.currentBet * x }));
  } else {
    // A pot sized raise calls first, then raises by the pot after the call.
    const potTo = (f: number) => (r.kind === 'bet' ? pot * f : state.currentBet + (pot + legal.call) * f);
    list = [
      { label: '⅓ pot', to: potTo(1 / 3) },
      { label: '½ pot', to: potTo(0.5) },
      { label: '¾ pot', to: potTo(0.75) },
      { label: 'Pot', to: potTo(1) },
    ];
  }
  const seen = new Set<number>();
  return [{ label: 'Min', to: r.min }, ...list.map((o) => ({ ...o, to: clampTo(o.to) })), { label: 'All in', to: r.max }].filter((o) => {
    if (seen.has(o.to)) return false;
    seen.add(o.to);
    return true;
  });
}

function Actions({ state, size, onSize, onAct }: { state: HandState; size?: number; onSize: (n: number | undefined) => void; onAct: (a: PlayAction) => void }) {
  const legal = legalActions(state);
  const { settings } = useSettings();
  const options = sizeOptions(state, openSize(settings.game));
  const r = legal.raise;
  const chosen = r ? (size ?? options.find((o) => o.mine)?.to ?? options.find((o) => o.label !== 'Min')?.to ?? r.min) : undefined;
  const raiseLabel = !r || chosen === undefined ? '' : chosen >= r.max ? `All in ${fmt(r.max)}` : r.kind === 'bet' ? `Bet ${fmt(chosen)}` : `Raise to ${fmt(chosen)}`;
  const step = (d: number) => r && chosen !== undefined && onSize(Math.min(r.max, Math.max(r.min, round(chosen + d))));
  return (
    <div className="play-actions">
      {r && (
        <>
          <div className="play-sizes" role="radiogroup" aria-label="Size">
            {options.map((o) => (
              <button key={o.label} role="radio" aria-checked={chosen === o.to} className={`play-size${chosen === o.to ? ' on' : ''}`} data-haptic="select" onClick={() => onSize(o.to)}>
                {o.label}
              </button>
            ))}
          </div>
          {r.max > r.min && (
            <div className="play-slide-row">
              <button className="play-nudge" aria-label="Smaller" data-haptic="select" disabled={chosen! <= r.min} onClick={() => step(-(state.street === 'preflop' ? 0.5 : Math.max(0.5, round(potSize(state) * 0.1))))}>
                <MinusIcon size={18} />
              </button>
              <input className="play-slider" type="range" aria-label="Bet size" min={r.min} max={r.max} step={0.5} value={chosen} onChange={(e) => onSize(Number(e.target.value))} />
              <button className="play-nudge" aria-label="Bigger" data-haptic="select" disabled={chosen! >= r.max} onClick={() => step(state.street === 'preflop' ? 0.5 : Math.max(0.5, round(potSize(state) * 0.1)))}>
                <PlusIcon size={18} />
              </button>
            </div>
          )}
        </>
      )}
      <div className="play-buttons">
        {legal.fold && (
          <button className="btn btn-lg play-fold" onClick={() => onAct({ kind: 'fold' })}>
            Fold
          </button>
        )}
        {legal.check ? (
          <button className="btn btn-lg play-call" onClick={() => onAct({ kind: 'check' })}>
            Check
          </button>
        ) : (
          <button className="btn btn-lg play-call" onClick={() => onAct({ kind: 'call' })}>
            {legal.callAllIn ? `Call ${fmt(legal.call)} all in` : `Call ${fmt(legal.call)}`}
          </button>
        )}
        {r && chosen !== undefined && (
          <button className="btn btn-lg btn-primary play-raise" onClick={() => onAct({ kind: r.kind, to: chosen })}>
            {raiseLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Choices to make before your turn, as in an online client. The one picked plays when the action reaches you. */
function PreActions({ state, value, onChange }: { state: HandState; value?: PreAction; onChange: (v?: PreAction) => void }) {
  const toCall = Math.max(0, state.currentBet - state.players[HERO].street);
  const options: { id: PreAction; label: string }[] =
    toCall > 0
      ? [
          { id: 'checkfold', label: 'Fold' },
          { id: 'callany', label: 'Call any' },
        ]
      : [
          { id: 'checkfold', label: 'Check/fold' },
          { id: 'check', label: 'Check' },
          { id: 'callany', label: 'Call any' },
        ];
  return (
    <div className="play-pre" role="group" aria-label="Before your turn">
      {options.map((o) => (
        <button key={o.id} className={`play-pre-btn${value === o.id ? ' on' : ''}`} aria-pressed={value === o.id} data-haptic="select" onClick={() => onChange(value === o.id ? undefined : o.id)}>
          <span className="play-pre-box" aria-hidden="true" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Table settings ---------------------------------------------------------------------

function MenuSheet({ open, onClose, session, onLeave }: { open: boolean; onClose: () => void; session: TableSession; onLeave: () => void }) {
  const set = (patch: Partial<TableSession['settings']>) => setSession((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const top = Math.max(0, session.table.buyIns[2] - session.stacks[HERO] - session.pendingChips);
  const { settings } = session;
  return (
    <Sheet open={open} onClose={onClose} label="Table settings">
      <SheetHead title="Table settings" onClose={onClose} />

      <div>
        <GroupLabel>Speed</GroupLabel>
        <div className="list">
          <div className="list-row play-stack-row">
            <span>Bot speed</span>
            <Segmented
              stretch
              ariaLabel="Bot speed"
              value={settings.speed}
              options={[
                { value: 'instant', label: 'Instant' },
                { value: 'quick', label: 'Quick' },
                { value: 'natural', label: 'Natural' },
              ]}
              onChange={(speed) => set({ speed })}
            />
          </div>
          <div className="list-row play-stack-row">
            <span>After you fold</span>
            <Segmented
              stretch
              ariaLabel="After you fold"
              value={settings.afterFold}
              options={[
                { value: 'next', label: 'Deal next hand' },
                { value: 'watch', label: 'Watch the hand' },
              ]}
              onChange={(afterFold) => set({ afterFold })}
            />
          </div>
          <label className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Skip clear folds</span>
              <span className="footnote">Hands you would always fold are folded for you</span>
            </span>
            <Toggle label="Skip clear folds" checked={settings.skipFolds} onChange={(skipFolds) => set({ skipFolds })} />
          </label>
        </div>
        <p className="section-footer">Hands you fold still show in Last hand.</p>
      </div>

      <div>
        <GroupLabel>Coaching</GroupLabel>
        <div className="list">
          <label className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Grades after each hand</span>
              <span className="footnote">Off keeps the table quiet</span>
            </span>
            <Toggle label="Grades after each hand" checked={settings.showGrades} onChange={(showGrades) => set({ showGrades })} />
          </label>
        </div>
        <p className="section-footer">Last hand always has the grades.</p>
      </div>

      <div>
        <GroupLabel>Your open size</GroupLabel>
        <div className="list">
          <OpenSizeRow />
        </div>
      </div>

      <div>
        <GroupLabel>Table</GroupLabel>
        <div className="list">
          <button
            className="list-row"
            disabled={top < 1}
            onClick={() => {
              setSession((s) => ({ ...s, pendingChips: s.pendingChips + top }));
              onClose();
            }}
          >
            <span className="grow" style={{ color: top < 1 ? 'var(--label-2)' : 'var(--tint)' }}>
              {top < 1 ? 'Your stack is full' : `Top up ${fmt(top)}bb before the next hand`}
            </span>
          </button>
          <button
            className="list-row"
            onClick={() => {
              setSession((s) => ({ ...s, sittingOut: !s.sittingOut }));
              onClose();
            }}
          >
            <span className="grow" style={{ color: 'var(--tint)' }}>
              {session.sittingOut ? 'Deal me in' : 'Sit out after this hand'}
            </span>
          </button>
          <button className="list-row" onClick={onLeave}>
            <span className="grow" style={{ color: 'var(--red)' }}>
              Leave table
            </span>
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// Last hand --------------------------------------------------------------------------

const GRADE_WORDS = { best: 'Best', correct: 'Good', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' } as const;
const STREET_WORDS = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' } as const;
const TIER_WORDS = { chart: 'Chart', approx: 'Approximate range, not rated', bot: 'Against this bot', none: 'Not graded' } as const;

function resultLine(state: HandState, seats: readonly PlaySeat[]): string {
  const r = state.result!;
  const name = (s: number) => (s === HERO ? 'You' : (seats[s].bot?.name ?? 'Seat'));
  const best = Math.max(...r.net);
  const top = r.net.map((net, i) => ({ net, i })).filter((x) => x.net > 0 && Math.abs(x.net - best) < 1e-9);
  if (top.length !== 1) return 'Split pot';
  const { i } = top[0];
  const hammer = i === HERO && heroClass(state) === '72o';
  const hand = hammer ? ' with the hammer' : r.showdown && r.hands[i] ? ` with ${r.hands[i].toLowerCase()}` : '';
  return `${name(i)} ${i === HERO ? 'win' : 'wins'} ${fmt(Math.round(r.won[i] * 10) / 10)}${hand}`;
}

const heroClass = (state: HandState) => handClassOf(state.players[HERO].cards[0], state.players[HERO].cards[1]);

/**
 * The rare pots worth a little extra: winning with 7 2 offsuit, or showing
 * down a straight flush. A brass banner and a firmer tap, nothing more.
 */
export function rarePot(state: HandState): boolean {
  const r = state.result;
  if (!r || r.net[HERO] <= 0) return false;
  if (heroClass(state) === '72o') return true;
  return r.showdown && /^(Royal|Straight) flush/.test(r.hands[HERO] ?? '');
}

/** The hand street by street, as a hand history reads. */
function historyLines(rec: HandRecord, seats: readonly PlaySeat[]): { street: HandState['street']; board: string; actions: string[] }[] {
  const s0 = rec.history[0]?.state ?? rec.final;
  const name = (s: number) => (s === HERO ? 'You' : (seats[s].bot?.name ?? 'Seat'));
  const out: { street: HandState['street']; board: string; actions: string[] }[] = [];
  for (const d of rec.history) {
    if (out.at(-1)?.street !== d.state.street) out.push({ street: d.state.street, board: pretty(d.state.board), actions: [] });
    out.at(-1)!.actions.push(`${name(d.state.toAct!)} (${s0.players[d.state.toAct!].position}) ${actionText(d.state, d.action).toLowerCase()}`);
  }
  return out;
}

/** Who showed what at the end of a hand that went to showdown. */
function showdownLines(rec: HandRecord, seats: readonly PlaySeat[]): string[] {
  const r = rec.final.result!;
  if (!r.showdown) return [];
  return rec.final.players
    .filter((p) => !p.folded)
    .map((p) => `${p.seat === HERO ? 'You show' : `${seats[p.seat].bot?.name ?? 'Seat'} shows`} ${pretty(p.cards)}, ${(r.hands[p.seat] ?? '').toLowerCase()}`);
}

/** A question for the coach about this hand, as a draft. */
function coachQuestion(rec: HandRecord, seats: readonly PlaySeat[]): string {
  const s0 = rec.history[0]?.state ?? rec.final;
  const me = s0.players[HERO];
  const lines = historyLines(rec, seats).flatMap((st) => [`${STREET_WORDS[st.street]}${st.board ? ` ${st.board}` : ''}:`, ...st.actions]);
  return `I played this hand against bots, ${s0.players.length} handed, with ${fmt(me.stack + me.total)}bb. I had ${cardsToString(me.cards)} in the ${me.position}.\n${lines.join('\n')}\nWhat should I have done differently?`;
}

/**
 * A hand to send a friend, stopped at your first real decision after the flop
 * so it asks a question instead of telling the result. The link carries your
 * invite code.
 */
export function shareHandText(rec: HandRecord, seats: readonly PlaySeat[], link: string): string {
  const s0 = rec.history[0]?.state ?? rec.final;
  const me = s0.players[HERO];
  const lines: string[] = [];
  let street = '';
  const name = (s: number) => (s === HERO ? 'I' : `${seats[s].bot?.name ?? 'A player'} (${s0.players[s].position})`);
  for (const d of rec.history) {
    if (d.state.toAct === HERO && d.state.street !== 'preflop') {
      if (d.state.street !== street) lines.push(`${STREET_WORDS[d.state.street]} ${pretty(d.state.board)}`);
      lines.push('What do I do?');
      break;
    }
    if (d.state.street !== street) {
      street = d.state.street;
      lines.push(d.state.street === 'preflop' ? 'Preflop' : `${STREET_WORDS[d.state.street]} ${pretty(d.state.board)}`);
    }
    lines.push(`${name(d.state.toAct!)} ${actionText(d.state, d.action).toLowerCase()}`);
  }
  if (lines.at(-1) !== 'What do I do?') lines.push('How would you have played it?');
  return [`${s0.players.length} handed, ${fmt(me.stack + me.total)}bb. I have ${pretty(me.cards)} in the ${me.position}.`, ...lines, `Play it on Aced: ${link}`].join('\n');
}

function LastHandSheet({ open, onClose, hands, seats }: { open: boolean; onClose: () => void; hands: HandRecord[]; seats: readonly PlaySeat[] }) {
  const [back, setBack] = useState(0);
  const canAskCoach = useCanAskCoach();
  const [added, setAdded] = useState<string>();
  useEffect(() => {
    if (open) setBack(0);
  }, [open]);
  const rec = hands[hands.length - 1 - back];
  const notes = useMemo(() => (rec ? handNotes(rec.history) : []), [rec]);
  const net = rec?.final.result!.net[HERO] ?? 0;
  const graded = rec?.grades?.filter((g) => g.grade) ?? [];
  const misses = graded.filter((g) => g.grade === 'mistake' || g.grade === 'blunder').length;
  return (
    <Sheet open={open} onClose={onClose} label="Last hand">
      {rec && (
        <>
          <div className="row between" style={{ flexWrap: 'nowrap' }}>
            <button className="play-icon-btn light" onClick={() => setBack((b) => b + 1)} disabled={back >= hands.length - 1} aria-label="Earlier hand">
              <ChevronLeftIcon size={18} />
            </button>
            <span className="play-hand-title num">Hand {rec.number}</span>
            <button className="play-icon-btn light" onClick={() => setBack((b) => b - 1)} disabled={back === 0} aria-label="Later hand">
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className="play-recap-head">
            <div className="play-recap-cards">
              {rec.final.players[HERO].cards.map((c) => (
                <PlayingCard key={c} card={c} size="sm" />
              ))}
            </div>
            <div className="play-recap-text">
              <span className={`play-recap-net num ${net > 0 ? 'up' : net < 0 ? 'down' : ''}`}>{signed(net)}bb</span>
              <span className="footnote">
                {rec.final.players[HERO].position}. {resultLine(rec.final, seats)}.
              </span>
            </div>
          </div>
          {rec.final.board.length > 0 && (
            <div className="play-recap-board" aria-label={`Board ${pretty(rec.final.board)}`}>
              {rec.final.board.map((c) => (
                <PlayingCard key={c} card={c} size="sm" />
              ))}
            </div>
          )}
          {rec.offScreen && <p className="footnote play-recap-note">You folded. The rest of the hand played out off screen.</p>}
          <div className="list">
            {historyLines(rec, seats).map((st) => (
              <div key={st.street} className="list-row play-hist">
                <span className="grow">
                  <span className="play-grade-street">{STREET_WORDS[st.street]}</span>
                  {st.board && <span className="play-hist-board num">{st.board}</span>}
                  {st.actions.map((a, i) => (
                    <span key={i} className={`play-hist-line${a.startsWith('You') ? ' me' : ''}`}>
                      {a}
                    </span>
                  ))}
                </span>
              </div>
            ))}
            {showdownLines(rec, seats).length > 0 && (
              <div className="list-row play-hist">
                <span className="grow">
                  <span className="play-grade-street">Showdown</span>
                  {showdownLines(rec, seats).map((a) => (
                    <span key={a} className={`play-hist-line${a.startsWith('You') ? ' me' : ''}`}>
                      {a}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
          <h3 className="play-sub-title">Your decisions</h3>
          {!rec.grades ? (
            <p className="footnote">Grading</p>
          ) : rec.grades.length === 0 ? (
            <p className="footnote">You had no decisions this hand.</p>
          ) : (
            <>
              <p className="footnote" style={{ margin: 0 }}>
                {graded.length === 0 ? 'None of them can be graded yet.' : misses ? `${misses} of ${graded.length} graded ${graded.length === 1 ? 'was a mistake' : 'were mistakes'}.` : `${graded.length} graded. No mistakes.`}
              </p>
              <div className="list">
                {rec.grades.map((g) => (
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
            </>
          )}
          {notes.map((n) => (
            <p key={n} className="footnote" style={{ margin: 0 }}>
              {n}
            </p>
          ))}
          <div className="play-recap-actions">
            {(rec.grades ?? []).some((g) => g.tier === 'chart' && g.grade !== 'best') && (
              <button
                className="btn btn-tinted"
                disabled={added === rec.id}
                onClick={() => {
                  void addHandsToReview((rec.grades ?? []).filter((g) => g.tier === 'chart' && g.grade !== 'best' && g.chart).map((g) => ({ chartId: g.chart!.id, hand: g.chart!.hand })));
                  setAdded(rec.id);
                }}
              >
                {added === rec.id ? 'Added to Review' : 'Add to Review'}
              </button>
            )}
            <button
              className="btn btn-tinted"
              onClick={() => {
                const text = shareHandText(rec, seats, shareUrl('play'));
                if (navigator.share) void navigator.share({ title: 'How would you play this?', text }).catch(() => undefined);
                else void navigator.clipboard?.writeText(text).catch(() => undefined);
              }}
            >
              <ShareIcon size={18} />
              Share hand
            </button>
            {canAskCoach && (
              <Link to="/coach" state={{ question: coachQuestion(rec, seats) }} className="btn btn-tinted">
                <CoachIcon size={18} />
                Ask the coach
              </Link>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

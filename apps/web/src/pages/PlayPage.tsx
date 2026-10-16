import { botById, TABLE_PRESETS } from '@felt/content';
import {
  act,
  botMix,
  type Card,
  cardsToString,
  rankOf,
  SUIT_SYMBOLS,
  suitOf,
  type HandState,
  legalActions,
  type PlayAction,
  type PlayDecision,
  potSize,
  type Rng,
  sampleAction,
  seededRng,
  stacksAfter,
  startHand,
} from '@felt/core';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayTable } from '../components/PlayTable';
import { haptic } from '../haptics';
import { useCanAskCoach } from '../state/coach';
import { actionText, chartAdvisor, gradeHand, handNotes, HERO, isClearFold, type PlayGrade, type PlaySeat, rateHand } from '../state/play';
import {
  getSession,
  lastSeat,
  type HandRecord,
  LOBBY,
  type LobbyTable,
  leaveTable,
  refillBots,
  type SessionStats,
  setSession,
  sitDown,
  type TableSession,
  useLastStats,
  useTableSession,
} from '../state/playTable';
import { addHandsToReview } from '../state/review';
import { BotPortrait } from '../ui/BotPortrait';
import { HeroPattern } from '../ui/Brand';
import { ChevronLeftIcon, ChevronRightIcon, CoachIcon, MoreIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';
import { useBodyClass } from '../ui/useBodyClass';
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

// Lobby ------------------------------------------------------------------------------

function Lobby() {
  const last = useLastStats();
  const [picking, setPicking] = useState<LobbyTable>();
  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Play" />
      <QuickSeat />
      {last && <SessionSummary stats={last} />}
      <section>
        <h2 className="section-title">Tables</h2>
        <div className="list">
          {LOBBY.map((t) => {
            const preset = TABLE_PRESETS.find((p) => p.id === t.preset) ?? TABLE_PRESETS[0];
            const bots = preset.bots.slice(0, t.seats - 1).map((id) => botById(id)!);
            return (
              <div key={t.id} className="list-row play-lobby-row">
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="play-lobby-name">{t.name}</span>
                  <span className="footnote" style={{ display: 'block' }}>
                    {t.blurb}
                  </span>
                  <span className="play-lobby-meta num">
                    <span className="play-lobby-faces" aria-hidden="true">
                      {bots.slice(0, 5).map((b) => (
                        <BotPortrait key={b.id} look={b.look} size={22} />
                      ))}
                    </span>
                    {t.seats} seats · {t.buyIns[1]}bb
                  </span>
                </span>
                <button className="btn btn-primary play-sit" onClick={() => setPicking(t)}>
                  Sit down
                </button>
              </div>
            );
          })}
        </div>
        <p className="section-footer">Bots are player types from Exploits. They play by rules after the flop, so treat their play there as approximate.</p>
      </section>
      <BuyInSheet table={picking} onClose={() => setPicking(undefined)} />
    </div>
  );
}

/** The main card, as on Today and Learn: one tap to sit at the table you played last. */
function QuickSeat() {
  const { table, buyIn } = lastSeat();
  const preset = TABLE_PRESETS.find((p) => p.id === table.preset) ?? TABLE_PRESETS[0];
  const bots = preset.bots.slice(0, table.seats - 1).map((id) => botById(id)!);
  return (
    <section className="hero learn-hero play-hero">
      <HeroPattern />
      <div className="learn-hero-body">
        <div style={{ minWidth: 0 }}>
          <div className="hero-label">Cash game</div>
          <div className="display learn-hero-title">{table.name}</div>
          <div className="hero-sub">
            {table.seats} seats, {buyIn}bb buy in. Every other seat is a bot.
          </div>
          <div className="play-hero-faces" aria-hidden="true">
            {bots.slice(0, 8).map((b) => (
              <BotPortrait key={b.id} look={b.look} size={30} />
            ))}
          </div>
        </div>
      </div>
      <button className="btn btn-lg btn-block btn-hero" onClick={() => sitDown(table, buyIn)}>
        Play now
      </button>
    </section>
  );
}

function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" aria-label={label} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="sheet-body stack" style={{ gap: '1.1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        {children}
      </div>
    </dialog>
  );
}

function BuyInSheet({ table, onClose }: { table?: LobbyTable; onClose: () => void }) {
  const [buyIn, setBuyIn] = useState(100);
  useEffect(() => {
    if (table) setBuyIn(table.buyIns[1]);
  }, [table]);
  return (
    <Sheet open={!!table} onClose={onClose} label="Buy in">
      {table && (
        <>
          <div className="row between">
            <h2 className="play-sheet-title">{table.name}</h2>
            <button className="btn btn-plain" onClick={onClose}>
              Cancel
            </button>
          </div>
          <p className="footnote" style={{ margin: 0 }}>
            {table.seats} seats. Blinds are 0.5 and 1. Amounts are in big blinds.
          </p>
          <Segmented stretch ariaLabel="Buy in" value={buyIn} options={table.buyIns.map((v) => ({ value: v, label: `${v}bb` }))} onChange={setBuyIn} />
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => {
              sitDown(table, buyIn);
              onClose();
            }}
          >
            Sit down with {buyIn}bb
          </button>
        </>
      )}
    </Sheet>
  );
}

function SessionSummary({ stats, title = 'Last session' }: { stats: SessionStats; title?: string }) {
  const share = stats.graded ? Math.round((stats.good / stats.graded) * 100) : undefined;
  return (
    <section className="card play-summary">
      <span className="play-summary-label">{title}</span>
      <div className="play-summary-grid">
        <div>
          <span className="play-summary-value num">{share === undefined ? 'None' : `${share}%`}</span>
          <span className="footnote">Good decisions, of {stats.graded} graded</span>
        </div>
        <div>
          <span className="play-summary-value num">{stats.evLost.toFixed(1)}bb</span>
          <span className="footnote">Given up on graded calls and folds</span>
        </div>
      </div>
      <span className="footnote">
        {stats.hands} hands and {stats.skipped} clear folds. Result {signed(stats.net)}bb, which is mostly luck over this few hands.
      </span>
    </section>
  );
}

// The table --------------------------------------------------------------------------

const randomSeed = () => (Math.random() * 2 ** 31) | 0;
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type PreAction = 'checkfold' | 'check' | 'callany';

function seatsOf(session: TableSession): PlaySeat[] {
  return session.bots.map((id) => (id ? { bot: botById(id) } : {}));
}

/** Plays bots without pausing until the player acts or the hand ends. */
function fastForward(state: HandState, history: PlayDecision[], seats: readonly PlaySeat[], rng: Rng) {
  while (state.toAct !== null && state.toAct !== HERO) {
    const seat = state.toAct;
    const action = sampleAction(botMix(state, state.players[seat].cards, seats[seat].bot!.profile, chartAdvisor), rng);
    history.push({ state, action });
    state = act(state, action);
  }
  return state;
}

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

/** Books a finished hand: stacks, session totals and the hand record. */
function bookHand(s: TableSession, final: HandState, history: PlayDecision[], id: string, seed: number, skipped: boolean): TableSession {
  const net = final.result!.net[HERO];
  const record: HandRecord = { id, number: s.stats.hands + 1, seed, history, final };
  return {
    ...s,
    stacks: stacksAfter(final),
    stats: { ...s.stats, hands: s.stats.hands + (skipped ? 0 : 1), skipped: s.stats.skipped + (skipped ? 1 : 0), net: s.stats.net + net },
    hands: skipped ? s.hands : [...s.hands.slice(-29), record],
  };
}

function TableScreen({ session }: { session: TableSession }) {
  useBodyClass('focus-mode');
  useBodyClass('play-room-body');
  const seats = useMemo(() => seatsOf(session), [session.bots]);
  const rng = useRef<Rng>(seededRng(randomSeed()));
  const [pre, setPre] = useState<PreAction>();
  const [size, setSize] = useState<number>();
  const [thinking, setThinking] = useState<{ seat: number; ms: number }>();
  const [menu, setMenu] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  const [toast, setToast] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const live = session.live;
  const speed = session.settings.speed;
  const busted = !live && session.stacks[HERO] + session.pendingChips <= 0;

  /** Deals the next hand, folding clear folds at once when asked. */
  function deal() {
    setSession((s) => {
      let next = s;
      for (let tries = 0; tries < 30; tries++) {
        if (next.stacks[HERO] + next.pendingChips <= 0) return next;
        const stacks = refillBots(next.stacks, next.table).map((x, i) => (i === HERO ? x + next.pendingChips : x));
        const button = (next.button + 1) % next.table.seats;
        const seed = randomSeed();
        const state = startHand({ stacks, button }, seededRng(seed));
        rng.current = seededRng(seed + 1);
        const id = `${Date.now().toString(36)}-${seed}`;
        next = { ...next, button, stacks, pendingChips: 0, stats: { ...next.stats, bought: next.stats.bought + next.pendingChips } };
        if (next.settings.skipFolds) {
          const history: PlayDecision[] = [];
          const ahead = fastForward(state, history, seatsOf(next), seededRng(seed + 1));
          if (ahead.toAct === HERO && isClearFold(ahead)) {
            history.push({ state: ahead, action: { kind: 'fold' } });
            const final = fastForward(act(ahead, { kind: 'fold' }), history, seatsOf(next), seededRng(seed + 2));
            next = bookHand(next, final, history, id, seed, true);
            continue;
          }
        }
        return { ...next, live: { id, seed, state, history: [], said: {} } };
      }
      return next;
    });
  }

  function advance(action: PlayAction) {
    setSession((s) => {
      if (!s.live) return s;
      const { state, history, said } = s.live;
      const seat = state.toAct!;
      const nextState = act(state, action);
      const nextSaid = nextState.street !== state.street ? {} : { ...said, [seat]: actionText(state, action) };
      let next: TableSession = { ...s, live: { ...s.live, state: nextState, history: [...history, { state, action }], said: nextSaid } };
      if (nextState.result) next = bookHand(next, nextState, next.live!.history, next.live!.id, next.live!.seed, false);
      return next;
    });
  }

  // The table loop: deal, let bots think and act, pause on the result, then deal again.
  useEffect(() => {
    if (!live) {
      if (session.sittingOut || busted || leaving) return;
      const t = window.setTimeout(deal, 350);
      return () => window.clearTimeout(t);
    }
    const { state } = live;
    if (state.result) {
      const t = window.setTimeout(() => setSession((s) => ({ ...s, live: undefined })), resultMs(state, speed));
      return () => window.clearTimeout(t);
    }
    if (state.toAct !== HERO) {
      const seat = state.toAct!;
      const action = sampleAction(botMix(state, state.players[seat].cards, seats[seat].bot!.profile, chartAdvisor), rng.current);
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

  // When a hand ends: grade it quietly and rate what counts.
  const lastId = session.hands.at(-1)?.id;
  useEffect(() => {
    const rec = getSession()?.hands.at(-1);
    if (!rec || rec.grades) return;
    const t = window.setTimeout(() => {
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
      if (getSession()?.settings.showGrades && graded.length) setToast(gradeLine(graded));
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

  // A new street or a new bet clears a plain check that no longer fits.
  useEffect(() => setPre((p) => (p === 'check' ? undefined : p)), [live?.state.currentBet, live?.state.street]);

  const lastHand = session.hands.at(-1);
  const lastMiss = !!lastHand?.grades?.some((g) => g.grade === 'mistake' || g.grade === 'blunder');
  const state = live?.state;
  const banner = state?.result ? resultLine(state, seats) : undefined;
  const me = state?.players[HERO];
  const inHand = !!state && !state.result && !me!.folded && !me!.allIn;

  return (
    <div className="play-room">
      <header className="play-head">
        <button className="play-icon-btn" onClick={() => setMenu(true)} aria-label="Table menu">
          <MoreIcon size={22} />
        </button>
        <span className="play-head-title">
          <span>{session.table.name}</span>
          <span className="play-head-sub num">
            Hand {session.stats.hands + (state && !state.result ? 1 : 0)} · {signed(session.stats.net)}bb
          </span>
        </span>
        <button className="play-last-btn" onClick={() => setLastOpen(true)} disabled={!lastHand}>
          Last hand
          {lastMiss && <span className="play-last-dot" aria-label="Has a mistake" />}
        </button>
      </header>

      {toast && (
        <button className="play-toast" onClick={() => setLastOpen(true)}>
          {toast}
        </button>
      )}

      <div className="play-stage">
        {state ? (
          <PlayTable handId={live!.id} state={state} seats={seats} said={live!.said} thinking={thinking} banner={banner} />
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
          <p className="play-dock-note">{state?.result ? ' ' : me?.folded ? 'Folded. The next hand comes soon.' : 'Dealing'}</p>
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
    return { ...s, toAct: null, players: s.players.map((p, i) => ({ ...p, stack: session.stacks[i], street: 0, total: 0, folded: true })) };
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

/** Bet sizes like an online client: multiples of the blind preflop, shares of the pot after. */
function sizeOptions(state: HandState): { label: string; to: number }[] {
  const legal = legalActions(state);
  const r = legal.raise;
  if (!r) return [];
  const pot = potSize(state);
  const clampTo = (to: number) => Math.min(r.max, Math.max(r.min, round(to)));
  let list: { label: string; to: number }[];
  if (state.street === 'preflop' && state.currentBet <= state.bb) {
    const limps = state.log.filter((a) => a.street === 'preflop' && a.kind === 'call').length;
    list = [2.5, 3].map((x) => ({ label: `${x}bb`, to: x + limps }));
  } else if (state.street === 'preflop') {
    list = [3, 4].map((x) => ({ label: `${x}x`, to: state.currentBet * x }));
  } else {
    // A pot sized raise calls first, then raises by the pot after the call.
    const potTo = (f: number) => (r.kind === 'bet' ? pot * f : state.currentBet + (pot + legal.call) * f);
    list = [
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
  const options = sizeOptions(state);
  const r = legal.raise;
  const chosen = r ? (size ?? options.find((o) => o.label !== 'Min')?.to ?? r.min) : undefined;
  const raiseLabel = !r || chosen === undefined ? '' : chosen >= r.max ? `All in ${fmt(r.max)}` : r.kind === 'bet' ? `Bet ${fmt(chosen)}` : `Raise to ${fmt(chosen)}`;
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
            <input className="play-slider" type="range" aria-label="Bet size" min={r.min} max={r.max} step={0.5} value={chosen} onChange={(e) => onSize(Number(e.target.value))} />
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
          <button className="btn btn-lg btn-primary" onClick={() => onAct({ kind: r.kind, to: chosen })}>
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

// Menu -------------------------------------------------------------------------------

function MenuSheet({ open, onClose, session, onLeave }: { open: boolean; onClose: () => void; session: TableSession; onLeave: () => void }) {
  const set = (patch: Partial<TableSession['settings']>) => setSession((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const top = Math.max(0, session.table.buyIns[2] - session.stacks[HERO] - session.pendingChips);
  return (
    <Sheet open={open} onClose={onClose} label="Table menu">
      <div className="row between">
        <h2 className="play-sheet-title">{session.table.name}</h2>
        <button className="btn btn-plain" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="list">
        <label className="list-row">
          <span className="grow">
            <span style={{ display: 'block' }}>Skip clear folds</span>
            <span className="footnote">Hands the chart folds every time are folded for you</span>
          </span>
          <Toggle label="Skip clear folds" checked={session.settings.skipFolds} onChange={(skipFolds) => set({ skipFolds })} />
        </label>
        <div className="list-row">
          <span className="grow">Bot speed</span>
          <Segmented
            ariaLabel="Bot speed"
            value={session.settings.speed}
            options={[
              { value: 'instant', label: 'Instant' },
              { value: 'quick', label: 'Quick' },
              { value: 'natural', label: 'Natural' },
            ]}
            onChange={(speed) => set({ speed })}
          />
        </div>
        <label className="list-row">
          <span className="grow">
            <span style={{ display: 'block' }}>Grades after each hand</span>
            <span className="footnote">Off keeps the table quiet. Last hand always has them.</span>
          </span>
          <Toggle label="Grades after each hand" checked={session.settings.showGrades} onChange={(showGrades) => set({ showGrades })} />
        </label>
      </div>
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
  const hand = r.showdown && r.hands[i] ? ` with ${r.hands[i].toLowerCase()}` : '';
  return `${name(i)} ${i === HERO ? 'win' : 'wins'} ${fmt(Math.round(r.won[i] * 10) / 10)}${hand}`;
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

/** A question for the coach about this hand, as a draft. */
function coachQuestion(rec: HandRecord, seats: readonly PlaySeat[]): string {
  const s0 = rec.history[0]?.state ?? rec.final;
  const me = s0.players[HERO];
  const lines = historyLines(rec, seats).flatMap((st) => [`${STREET_WORDS[st.street]}${st.board ? ` ${st.board}` : ''}:`, ...st.actions]);
  return `I played this hand against bots, ${s0.players.length} handed, with ${fmt(me.stack + me.total)}bb. I had ${cardsToString(me.cards)} in the ${me.position}.\n${lines.join('\n')}\nWhat should I have done differently?`;
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
  return (
    <Sheet open={open} onClose={onClose} label="Last hand">
      {rec && (
        <>
          <div className="row between">
            <button className="play-icon-btn light" onClick={() => setBack((b) => b + 1)} disabled={back >= hands.length - 1} aria-label="Earlier hand">
              <ChevronLeftIcon size={18} />
            </button>
            <span className="play-hand-title num">
              Hand {rec.number} · {signed(rec.final.result!.net[HERO])}bb
            </span>
            <button className="play-icon-btn light" onClick={() => setBack((b) => b - 1)} disabled={back === 0} aria-label="Later hand">
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className="play-hand-summary">
            <span className="num">
              {pretty(rec.final.players[HERO].cards)} in the {rec.final.players[HERO].position}
            </span>
            <span className="footnote">{resultLine(rec.final, seats)}</span>
          </div>
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
          </div>
          <h3 className="play-sub-title">Your decisions</h3>
          {!rec.grades ? (
            <p className="footnote">Grading</p>
          ) : rec.grades.length === 0 ? (
            <p className="footnote">You had no decisions this hand.</p>
          ) : (
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

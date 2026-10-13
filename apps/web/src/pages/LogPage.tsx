import { parseCards, stakesBigBlind } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { type ReactNode, useEffect, useState } from 'react';
import { db, type LoggedHand, type StoredSession } from '../state/db';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { LogIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';
import { signed } from '../ui/format';
import './screens.css';

const LIVE_KEY = 'felt.liveSession';

interface LiveSession {
  start: number;
  stakes: string;
  buyIn: number;
  venue: string;
}

function readLive(): LiveSession | undefined {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    return raw ? (JSON.parse(raw) as LiveSession) : undefined;
  } catch {
    return undefined;
  }
}

function writeLive(s: LiveSession | undefined) {
  try {
    if (s) localStorage.setItem(LIVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(LIVE_KEY);
  } catch {
    /* Private mode: the timer still runs for this visit. */
  }
}

function duration(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${mins % 60}m` : `${mins}m`;
}

const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

type Tab = 'sessions' | 'hands';

/** Log: time live sessions and jot down hands to study later. */
export function LogPage() {
  const [tab, setTab] = useState<Tab>('sessions');
  return (
    <div className="stack" style={{ gap: '1.3rem' }}>
      <PageHeader title="Log" back={{ to: '/more', label: 'More' }} />
      <Segmented<Tab>
        ariaLabel="Section"
        stretch
        value={tab}
        onChange={setTab}
        options={[
          { value: 'sessions', label: 'Sessions' },
          { value: 'hands', label: 'Hands' },
        ]}
      />
      {tab === 'sessions' ? <Sessions /> : <Hands />}
    </div>
  );
}

function Sessions() {
  const { settings } = useSettings();
  const stakes = settings.game.stakes;
  const defaultStakes = `${stakes.sb}/${stakes.bb}`;
  const [live, setLive] = useState<LiveSession | undefined>(readLive);
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);
  const [adding, setAdding] = useState(false);
  const sessions = useLiveQuery(() => db.sessions.orderBy('id').reverse().limit(30).toArray(), [], [] as StoredSession[]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [live]);

  const start = (s: Omit<LiveSession, 'start'>) => {
    const next = { ...s, start: Date.now() };
    writeLive(next);
    setLive(next);
    setNow(Date.now());
  };

  const save = async (s: { start: Date; hours: number; stakes: string; buyIn: number; cashOut: number; venue?: string; note?: string }) => {
    const bb = stakesBigBlind(s.stakes) ?? stakes.bb;
    const id = await db.sessions.add({
      date: s.start,
      hours: s.hours,
      profit: s.cashOut - s.buyIn,
      stakes: s.stakes,
      bb,
      importedAt: new Date(),
      source: 'log',
      venue: s.venue || undefined,
      buyIn: s.buyIn,
      cashOut: s.cashOut,
      note: s.note || undefined,
    });
    // Hands logged during the session belong to it.
    const end = new Date(s.start.getTime() + s.hours * 3600000);
    await db.logged
      .where('at')
      .between(s.start, end, true, true)
      .modify({ sessionId: id as number });
  };

  const totals = sessions.reduce(
    (t, s) => {
      const bb = s.bb ?? stakes.bb;
      return { hours: t.hours + s.hours, bb: t.bb + s.profit / bb, money: t.money + s.profit };
    },
    { hours: 0, bb: 0, money: 0 },
  );

  return (
    <>
      {live && !ending && (
        <div className="card stack log-live" style={{ gap: '0.5rem' }}>
          <div className="row between">
            <span className="pill pill-good">
              <span className="live-dot" aria-hidden /> Playing
            </span>
            <span className="footnote">{live.venue || 'Live session'}</span>
          </div>
          <div className="log-timer num">{duration(now - live.start)}</div>
          <div className="footnote">
            {live.stakes} · buy in {live.buyIn.toLocaleString()}
          </div>
        </div>
      )}

      {live && ending && (
        <EndForm
          live={live}
          onCancel={() => setEnding(false)}
          onSave={async (cashOut, note) => {
            await save({
              start: new Date(live.start),
              hours: (Date.now() - live.start) / 3600000,
              stakes: live.stakes,
              buyIn: live.buyIn,
              cashOut,
              venue: live.venue,
              note,
            });
            writeLive(undefined);
            setLive(undefined);
            setEnding(false);
          }}
        />
      )}

      {!live && !adding && <StartForm defaultStakes={defaultStakes} onStart={start} />}

      {!live && adding && (
        <PastForm
          defaultStakes={defaultStakes}
          onCancel={() => setAdding(false)}
          onSave={async (s) => {
            await save(s);
            setAdding(false);
          }}
        />
      )}

      {sessions.length > 0 && (
        <Section title="Recent sessions" footer="These feed your win rate on the You tab.">
          <div className="sc-stats" style={{ marginBottom: '0.6rem' }}>
            <div className="sc-stat">
              <span className="sc-stat-value num">{Math.round(totals.hours)}</span>
              <span className="sc-stat-label">Hours</span>
            </div>
            <div className="sc-stat">
              <span className={`sc-stat-value num ${totals.bb >= 0 ? 'green-text' : 'red-text'}`}>{signed(totals.bb, 0)}</span>
              <span className="sc-stat-label">Big blinds won</span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-value num">{totals.hours > 0 ? signed(totals.bb / totals.hours, 1) : '0'}</span>
              <span className="sc-stat-label">bb an hour</span>
            </div>
          </div>
          <div className="list">
            {sessions.map((s) => (
              <SessionRow key={s.id} s={s} bb={s.bb ?? stakes.bb} />
            ))}
          </div>
        </Section>
      )}

      {!live && !adding && (
        <button className="btn btn-plain btn-block" onClick={() => setAdding(true)}>
          Add a past session
        </button>
      )}

      {live && !ending && (
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setEnding(true)}>
            End session
          </button>
        </BottomBar>
      )}
    </>
  );
}

function StartForm({ defaultStakes, onStart }: { defaultStakes: string; onStart: (s: Omit<LiveSession, 'start'>) => void }) {
  const [stakes, setStakes] = useState(defaultStakes);
  const [buyIn, setBuyIn] = useState('');
  const [venue, setVenue] = useState('');
  return (
    <section>
      <h2 className="section-title">Start a session</h2>
      <div className="list">
        <Row id="start-stakes" label="Stakes">
          <input id="start-stakes" value={stakes} onChange={(e) => setStakes(e.target.value)} placeholder="1/3" />
        </Row>
        <Row id="start-buyin" label="Buy in">
          <input id="start-buyin" type="number" inputMode="decimal" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} placeholder="300" />
        </Row>
        <Row id="start-venue" label="Where">
          <input id="start-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Optional" />
        </Row>
      </div>
      <BottomBar>
        <button
          className="btn btn-primary btn-lg btn-block"
          disabled={!stakes.trim() || num(buyIn) === undefined}
          onClick={() => onStart({ stakes: stakes.trim(), buyIn: num(buyIn) ?? 0, venue: venue.trim() })}
        >
          Start session
        </button>
      </BottomBar>
    </section>
  );
}

function EndForm({ live, onCancel, onSave }: { live: LiveSession; onCancel: () => void; onSave: (cashOut: number, note: string) => Promise<void> }) {
  const [cashOut, setCashOut] = useState('');
  const [addOn, setAddOn] = useState('');
  const [note, setNote] = useState('');
  const out = num(cashOut);
  const extra = num(addOn) ?? 0;
  const profit = out === undefined ? undefined : out - live.buyIn - extra;
  return (
    <section>
      <h2 className="section-title">End session</h2>
      <div className="list">
        <Row id="end-addon" label="Rebuys and add ons">
          <input id="end-addon" type="number" inputMode="decimal" value={addOn} onChange={(e) => setAddOn(e.target.value)} placeholder="0" />
        </Row>
        <Row id="end-cashout" label="Cash out">
          <input id="end-cashout" type="number" inputMode="decimal" value={cashOut} onChange={(e) => setCashOut(e.target.value)} autoFocus />
        </Row>
        <Row id="end-note" label="Note">
          <input id="end-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </Row>
      </div>
      {profit !== undefined && (
        <div className="section-footer num">
          Result: <strong className={profit >= 0 ? 'green-text' : 'red-text'}>{signed(profit, 0)}</strong> over {duration(Date.now() - live.start)}
        </div>
      )}
      <BottomBar>
        <button className="btn btn-plain" onClick={onCancel}>
          Keep playing
        </button>
        <button
          className="btn btn-primary btn-lg grow"
          disabled={out === undefined}
          data-haptic="off"
          onClick={() => void onSave((out ?? 0) - extra, note.trim())}
        >
          Save session
        </button>
      </BottomBar>
    </section>
  );
}

function PastForm({
  defaultStakes,
  onCancel,
  onSave,
}: {
  defaultStakes: string;
  onCancel: () => void;
  onSave: (s: { start: Date; hours: number; stakes: string; buyIn: number; cashOut: number; venue?: string; note?: string }) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('');
  const [stakes, setStakes] = useState(defaultStakes);
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [venue, setVenue] = useState('');
  const h = num(hours);
  const ok = !!date && h !== undefined && h > 0 && num(buyIn) !== undefined && num(cashOut) !== undefined && !!stakes.trim();
  return (
    <section>
      <h2 className="section-title">Add a past session</h2>
      <div className="list">
        <Row id="past-date" label="Date">
          <input id="past-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Row>
        <Row id="past-hours" label="Hours played">
          <input id="past-hours" type="number" inputMode="decimal" step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} />
        </Row>
        <Row id="past-stakes" label="Stakes">
          <input id="past-stakes" value={stakes} onChange={(e) => setStakes(e.target.value)} />
        </Row>
        <Row id="past-buyin" label="Total buy in">
          <input id="past-buyin" type="number" inputMode="decimal" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
        </Row>
        <Row id="past-cashout" label="Cash out">
          <input id="past-cashout" type="number" inputMode="decimal" value={cashOut} onChange={(e) => setCashOut(e.target.value)} />
        </Row>
        <Row id="past-venue" label="Where">
          <input id="past-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Optional" />
        </Row>
      </div>
      <BottomBar>
        <button className="btn btn-plain" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-lg grow"
          disabled={!ok}
          onClick={() =>
            void onSave({
              start: new Date(`${date}T12:00:00`),
              hours: h ?? 0,
              stakes: stakes.trim(),
              buyIn: num(buyIn) ?? 0,
              cashOut: num(cashOut) ?? 0,
              venue: venue.trim(),
            })
          }
        >
          Save session
        </button>
      </BottomBar>
    </section>
  );
}

function SessionRow({ s, bb }: { s: StoredSession; bb: number }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="list-row">
      <span className="grow">
        <span style={{ display: 'block' }}>
          {s.date ? s.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'} · {s.stakes ?? 'Cash'}
        </span>
        <span className="footnote num">
          {s.hours.toFixed(1)}h{s.venue ? ` · ${s.venue}` : ''}
          {s.source === 'csv' ? ' · imported' : ''}
        </span>
      </span>
      <span className="num" style={{ textAlign: 'right' }}>
        <strong className={s.profit >= 0 ? 'green-text' : 'red-text'}>{signed(s.profit, 0)}</strong>
        <span className="footnote" style={{ display: 'block' }}>
          {signed(s.profit / bb, 0)}bb
        </span>
      </span>
      {s.source === 'log' &&
        (confirm ? (
          <button className="btn btn-plain" style={{ color: 'var(--red)' }} onClick={() => void db.sessions.delete(s.id!)}>
            Delete
          </button>
        ) : (
          <button className="btn btn-plain" aria-label="Delete session" onClick={() => setConfirm(true)}>
            ⋯
          </button>
        ))}
    </div>
  );
}

function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="list-row log-field">
      <label htmlFor={id} className="grow">
        {label}
      </label>
      <span className="log-input">{children}</span>
    </div>
  );
}

const POSITIONS = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function validCards(text: string, count: number[]): boolean {
  if (!text.trim()) return true;
  try {
    return count.includes(parseCards(text.replace(/\s+/g, '')).length);
  } catch {
    return false;
  }
}

function Hands() {
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [adding, setAdding] = useState(false);
  const hands = useLiveQuery(() => db.logged.orderBy('at').reverse().toArray(), [], [] as LoggedHand[]);
  const shown = hands.filter((h) => filter === 'all' || h.flagged);
  const flagged = hands.filter((h) => h.flagged).length;

  if (adding) return <HandForm onDone={() => setAdding(false)} />;

  return (
    <>
      {hands.length === 0 ? (
        <EmptyState
          art={
            <span className="sc-art-tile">
              <LogIcon size={34} />
            </span>
          }
          title="Note hands while fresh"
          body="Flag the ones you are unsure about. Study them later in the Spot Lab."
        />
      ) : (
        <Segmented
          ariaLabel="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All ${hands.length}` },
            { value: 'flagged', label: `Flagged ${flagged}` },
          ]}
        />
      )}
      <div className="stack" style={{ gap: '0.6rem' }}>
        {shown.map((h) => (
          <HandCard key={h.id} h={h} />
        ))}
      </div>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => setAdding(true)}>
          Log a hand
        </button>
      </BottomBar>
    </>
  );
}

function HandCard({ h }: { h: LoggedHand }) {
  return (
    <div className="card stack" style={{ gap: '0.35rem' }}>
      <div className="row between" style={{ gap: '0.5rem' }}>
        <span className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
          {h.cards && <span className="pill num">{h.cards}</span>}
          {h.position && <span className="pill">{h.position}</span>}
          {h.board && <span className="pill num">{h.board}</span>}
        </span>
        <span className="footnote">{h.at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{h.action}</p>
      <div className="row between">
        <span className="num footnote">
          {h.resultBb !== undefined && <strong className={h.resultBb >= 0 ? 'green-text' : 'red-text'}>{signed(h.resultBb, 1)}bb</strong>}
        </span>
        <span className="row" style={{ gap: '0.3rem' }}>
          <button
            className={`btn ${h.flagged ? 'btn-tinted' : 'btn-plain'}`}
            data-haptic="select"
            aria-pressed={h.flagged}
            onClick={() => void db.logged.update(h.id!, { flagged: !h.flagged })}
          >
            {h.flagged ? 'Flagged' : 'Flag'}
          </button>
          <button className="btn btn-plain" onClick={() => void db.logged.delete(h.id!)}>
            Delete
          </button>
        </span>
      </div>
    </div>
  );
}

function HandForm({ onDone }: { onDone: () => void }) {
  const [cards, setCards] = useState('');
  const [position, setPosition] = useState('');
  const [board, setBoard] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [flagged, setFlagged] = useState(true);
  const cardsOk = validCards(cards, [2]);
  const boardOk = validCards(board, [3, 4, 5]);
  const ok = action.trim().length > 0 && cardsOk && boardOk;
  return (
    <section>
      <h2 className="section-title">Log a hand</h2>
      <div className="list">
        <Row id="hand-cards" label="Your cards">
          <input id="hand-cards" value={cards} onChange={(e) => setCards(e.target.value)} placeholder="AhKd" autoCapitalize="off" aria-invalid={!cardsOk} />
        </Row>
        <Row id="hand-pos" label="Position">
          <select id="hand-pos" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">Not sure</option>
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Row>
        <Row id="hand-board" label="Board">
          <input id="hand-board" value={board} onChange={(e) => setBoard(e.target.value)} placeholder="Qs7d2c" autoCapitalize="off" aria-invalid={!boardOk} />
        </Row>
        <Row id="hand-result" label="Result in bb">
          <input id="hand-result" type="number" inputMode="decimal" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Optional" />
        </Row>
      </div>
      {(!cardsOk || !boardOk) && <div className="section-footer red-text">Write cards like Ah Kd or AhKd. Use T for ten.</div>}
      <label htmlFor="hand-action" className="section-title" style={{ display: 'block', marginTop: '1rem' }}>
        What happened
      </label>
      <textarea
        id="hand-action"
        className="log-textarea"
        rows={4}
        value={action}
        onChange={(e) => setAction(e.target.value)}
        placeholder="CO opens 15. I 3bet to 45 on the button. CO calls."
      />
      <div className="list" style={{ marginTop: '1rem' }}>
        <div className="list-row">
          <span className="grow">Flag to study</span>
          <Toggle checked={flagged} onChange={setFlagged} label="Flag to study" />
        </div>
      </div>
      <BottomBar>
        <button className="btn btn-plain" onClick={onDone}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-lg grow"
          disabled={!ok}
          onClick={async () => {
            await db.logged.add({
              at: new Date(),
              cards: cards.replace(/\s+/g, '') || undefined,
              position: position || undefined,
              board: board.replace(/\s+/g, '') || undefined,
              action: action.trim(),
              resultBb: num(result),
              flagged,
            });
            onDone();
          }}
        >
          Save hand
        </button>
      </BottomBar>
    </section>
  );
}

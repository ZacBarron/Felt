import { currentRating } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DrillRunner } from '../drills/DrillRunner';
import { haptic } from '../haptics';
import { chartsForGame } from '../state/charts';
import { db } from '../state/db';
import { buildSession, type DeckCount, deckCounts, type DeckId, type DeckPref, deckPrefs, DECKS, type SessionConfig } from '../state/decks';
import { type QueueItem, recordAnswer, RELEARN_WINDOW_MS, startOfToday } from '../state/review';
import { ratingSnapshot } from '../state/rating';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronRightIcon, CloseIcon, DrillsIcon } from '../ui/icons';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';
import { Toggle } from '../ui/Toggle';
import { PageHeader } from '../ui/PageHeader';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';
import { useCountUp } from '../ui/useCountUp';
import { plural } from '../ui/format';

function CountUp({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 900))}</>;
}

const EXTRA_BATCH = 20;

/**
 * Review: an overview first, like Anki's deck list, then a session. The
 * overview shows what is due in each deck and lets you pick what to study.
 * Links with ?go=1 start today's session at once; ?deck=saved studies saves.
 */
export function ReviewPage() {
  const [params] = useSearchParams();
  const initial: SessionConfig | null =
    params.get('deck') === 'saved' ? { kind: 'today', decks: ['saved'] } : params.get('go') ? { kind: 'today' } : null;
  const [session, setSession] = useState<SessionConfig | null>(initial);
  const [run, setRun] = useState(0);
  if (!session) return <ReviewHome onStart={(c) => { setSession(c); setRun((r) => r + 1); }} />;
  return <ReviewSession key={run} config={session} onHome={() => setSession(null)} />;
}

function ReviewSession({ config, onHome }: { config: SessionConfig; onHome: () => void }) {
  const { settings } = useSettings();
  const [queue, setQueue] = useState<QueueItem[]>();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ accuracy: number; ms: number }[]>([]);
  // The chosen cards first; then a pause to celebrate; then extra practice that never runs out.
  const [phase, setPhase] = useState<'due' | 'cleared' | 'extra'>(config.kind === 'extra' ? 'extra' : 'due');
  const [nothingDue, setNothingDue] = useState(false);
  const answered = useRef(new Set<string>());
  const [exhausted, setExhausted] = useState(false);
  const loadingMore = useRef(false);
  // A new key per attempt so a card shown twice in one session starts fresh.
  const [attempt, setAttempt] = useState(0);
  const { charts } = chartsForGame(settings.game);
  const limit = config.limit ?? settings.study.sessionLimit ?? 0;
  // The rating when this session started, to show what the session changed.
  const startRating = useRef<number>();
  useEffect(() => {
    void ratingSnapshot().then((snap) => {
      const r = currentRating(snap.overall);
      if (r.games > 0) startRating.current = r.rating;
    });
  }, []);

  const moreExtra = useCallback(async () => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    const batch = await buildSession(charts, settings.study, { kind: 'extra', decks: config.decks, limit: EXTRA_BATCH }, answered.current);
    loadingMore.current = false;
    if (batch.length === 0) setExhausted(true);
    setQueue((q) => [...(q ?? []), ...batch]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.game]);

  useEffect(() => {
    void (async () => {
      const first = await buildSession(charts, settings.study, { ...config, limit: config.kind === 'extra' ? EXTRA_BATCH : limit });
      if (first.length > 0 || config.kind !== 'today') {
        if (first.length === 0) setExhausted(true);
        setQueue(first);
        return;
      }
      // Nothing due: go straight to extra practice instead of a dead end.
      setNothingDue(true);
      setPhase('extra');
      const batch = await buildSession(charts, settings.study, { kind: 'extra', decks: config.decks, limit: EXTRA_BATCH }, answered.current);
      if (batch.length === 0) setExhausted(true);
      setQueue(batch);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the extra stream topped up a few cards before it ends.
  useEffect(() => {
    if (phase === 'extra' && queue && !exhausted && index >= queue.length - 3) void moreExtra();
  }, [phase, index, queue, moreExtra, exhausted]);

  const item = phase === 'cleared' ? undefined : queue?.[index];
  useBodyClass('focus-mode', !!item);

  if (!queue) return <p className="muted">Loading your review…</p>;

  if (!item) {
    if (phase === 'extra' && exhausted) return <SessionDone results={results} onMore={null} onHome={onHome} startRating={startRating.current} />;
    if (phase === 'extra') return <p className="muted">Loading more cards…</p>;
    return (
      <SessionDone
        results={results}
        startRating={startRating.current}
        onHome={onHome}
        onMore={() => {
          setPhase('extra');
          setQueue((q) => (q ?? []).slice(0, index));
          void moreExtra();
        }}
      />
    );
  }

  const extra = phase === 'extra';
  const progress = queue.length ? index / queue.length : 0;

  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="End review" onClick={onHome}>
          <CloseIcon size={18} />
        </button>
        {extra ? (
          <span className="grow footnote" role="status">
            {nothingDue && index === 0 ? 'Nothing is due. Here is extra practice.' : 'Extra practice'}
          </span>
        ) : (
          <div className="progress" role="progressbar" aria-label="Review" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index} aria-valuetext={`Card ${index + 1} of ${queue.length}`}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <span className="footnote num" style={{ minWidth: 40, textAlign: 'right' }}>
          {extra ? `${results.length} done` : `${index + 1} of ${queue.length}`}
        </span>
        {item.isNew && <span className="pill pill-tint">New</span>}
      </div>
      <DrillRunner
        key={`${item.id}:${attempt}`}
        item={item}
        onAnswer={(outcome) => {
          answered.current.add(item.id);
          setResults((r) => [...r, { accuracy: outcome.accuracy, ms: outcome.responseMs }]);
          void recordAnswer(item, outcome).then((due) => {
            if (due.getTime() - Date.now() < RELEARN_WINDOW_MS) setQueue((q) => [...(q ?? []), { ...item, isNew: false }]);
          });
        }}
        onNext={() => {
          const end = index + 1 >= queue.length;
          if (end && phase === 'due') {
            haptic('heavy');
            setPhase('cleared');
          }
          setIndex((i) => i + 1);
          setAttempt((a) => a + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

const LIMITS = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '0', label: 'All' },
];

/** The review overview: decks with their counts, session options and custom study. */
function ReviewHome({ onStart }: { onStart: (c: SessionConfig) => void }) {
  const { settings, update } = useSettings();
  const { charts } = chartsForGame(settings.game);
  const study = settings.study;
  const counts = useLiveQuery(() => deckCounts(charts, study), [settings.game.tableSize, settings.game.format, JSON.stringify(study)]);
  const missedToday = useLiveQuery(async () => {
    const today = await db.reviews.where('at').aboveOrEqual(startOfToday()).toArray();
    return new Set(today.filter((r) => r.accuracy < 1).map((r) => r.cardId)).size;
  }, []);
  const prefs = deckPrefs(study);
  const [open, setOpen] = useState<DeckId>();
  const setStudy = (patch: Partial<typeof study>) => update({ ...settings, study: { ...study, ...patch } });
  const setDeck = (id: DeckId, patch: { on?: boolean; newPerDay?: number }) => {
    if (id === 'charts' && patch.newPerDay !== undefined) return setStudy({ newPerDay: patch.newPerDay, decks: { ...study.decks, charts: { ...study.decks?.charts, on: patch.on ?? prefs.charts.on } } });
    setStudy({ decks: { ...study.decks, [id]: { ...study.decks?.[id], ...patch } } });
  };

  const onDecks = counts?.filter((c) => prefs[c.deck].on) ?? [];
  const total = onDecks.reduce((t, c) => t + c.fresh + c.learning + c.due, 0);
  const limit = study.sessionLimit ?? 0;
  const inSession = limit > 0 ? Math.min(limit, total) : total;
  const minutes = Math.max(1, Math.round((inSession * 8) / 60));

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="Review" subtitle={counts ? (total ? `${plural(total, 'card')} today, about ${minutes} min` : 'All caught up for today') : ' '} />

      <section>
        <div className="list review-decks">
          <div className="list-row review-deck-head" aria-hidden="true">
            <span className="grow" />
            <span className="deck-count new">New</span>
            <span className="deck-count learn">Learn</span>
            <span className="deck-count due">Due</span>
          </div>
          {DECKS.map((d) => {
            const c = counts?.find((x) => x.deck === d.id);
            const on = prefs[d.id].on;
            return (
              <button key={d.id} className={`list-row review-deck${on ? '' : ' off'}`} onClick={() => setOpen(d.id)} aria-label={`${d.title}. ${c ? `${c.fresh} new, ${c.learning} learning, ${c.due} due` : ''}${on ? '' : '. Off'}`}>
                <span className="grow">
                  <span className="deck-title">{d.title}</span>
                  <span className="footnote">{on ? d.note : 'Off'}</span>
                </span>
                <span className={`deck-count new num${c?.fresh ? '' : ' zero'}`}>{c?.fresh ?? ''}</span>
                <span className={`deck-count learn num${c?.learning ? '' : ' zero'}`}>{c?.learning ?? ''}</span>
                <span className={`deck-count due num${c?.due ? '' : ' zero'}`}>{c?.due ?? ''}</span>
              </button>
            );
          })}
        </div>
        <div className="section-footer">Tap a deck to turn it off, change its new cards or study it alone.</div>
      </section>

      <section>
        <h2 className="section-title">Session</h2>
        <div className="list">
          <div className="list-row">
            <span className="grow">Cards per session</span>
            <Segmented ariaLabel="Cards per session" value={String(limit)} onChange={(v) => setStudy({ sessionLimit: Number(v) })} options={LIMITS} />
          </div>
          <div className="list-row">
            <span className="grow">Timer</span>
            <Toggle label="Timer" checked={!study.untimed} onChange={(on) => setStudy({ untimed: !on })} />
          </div>
        </div>
        <div className="section-footer">{study.untimed ? 'No timer. Speed does not change when cards come back.' : 'Fast, sure answers come back later than slow ones.'}</div>
      </section>

      <section>
        <h2 className="section-title">Custom study</h2>
        <div className="list">
          <CustomRow title="Extra practice" note="Cards closest to slipping, mixed with new ones" onClick={() => onStart({ kind: 'extra' })} />
          <CustomRow title="Study ahead" note="Cards due in the next 3 days" onClick={() => onStart({ kind: 'ahead', limit: limit || 30 })} />
          <CustomRow title="Weakest cards" note="The cards you miss most" onClick={() => onStart({ kind: 'weak' })} />
          {!!missedToday && <CustomRow title="Missed today" note={`${plural(missedToday, 'card')} you got wrong today`} onClick={() => onStart({ kind: 'missed' })} />}
        </div>
      </section>

      {open && (
        <DeckSheet
          deck={open}
          count={counts?.find((x) => x.deck === open)}
          pref={prefs[open]}
          onChange={(patch) => setDeck(open, patch)}
          onStudy={() => {
            setOpen(undefined);
            onStart({ kind: 'today', decks: [open] });
          }}
          onClose={() => setOpen(undefined)}
        />
      )}

      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={!counts} onClick={() => onStart({ kind: total ? 'today' : 'extra' })}>
          {total ? `Study ${plural(inSession, 'card')}` : 'Practice anyway'}
        </button>
      </BottomBar>
    </div>
  );
}

function CustomRow({ title, note, onClick }: { title: string; note: string; onClick: () => void }) {
  return (
    <button className="list-row" onClick={onClick}>
      <span className="grow">
        <span style={{ display: 'block' }}>{title}</span>
        <span className="footnote">{note}</span>
      </span>
      <ChevronRightIcon size={16} className="chev" />
    </button>
  );
}

function DeckSheet({
  deck,
  count,
  pref,
  onChange,
  onStudy,
  onClose,
}: {
  deck: DeckId;
  count?: DeckCount;
  pref: DeckPref;
  onChange: (patch: { on?: boolean; newPerDay?: number }) => void;
  onStudy: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const info = DECKS.find((d) => d.id === deck)!;
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const ready = count ? count.fresh + count.learning + count.due : 0;
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={info.title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1.1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between">
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{info.title}</h2>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>
        <p className="footnote" style={{ margin: 0 }}>
          {info.note}. {count ? `${plural(count.total, 'card')} so far.` : ''}
        </p>
        <div className="list">
          <div className="list-row">
            <span className="grow">Include in review</span>
            <Toggle label="Include in review" checked={pref.on} onChange={(on) => onChange({ on })} />
          </div>
          {deck !== 'saved' && (
            <div className="list-row">
              <span className="grow">New cards a day</span>
              <Stepper label="new cards a day" value={pref.newPerDay} min={0} max={50} step={deck === 'charts' ? 5 : 1} onChange={(newPerDay) => onChange({ newPerDay })} />
            </div>
          )}
        </div>
        {deck === 'lessons' && <div className="footnote">Questions join this deck when you finish or pass a lesson.</div>}
        <button className="btn btn-primary btn-lg btn-block" onClick={onStudy}>
          {ready ? `Study this deck (${ready})` : 'Practice this deck'}
        </button>
      </div>
    </dialog>
  );
}

function RatingChange({ from }: { from?: number }) {
  const now = useLiveQuery(async () => currentRating((await ratingSnapshot()).overall), []);
  const delta = now && from !== undefined ? Math.round(now.rating - from) : 0;
  const shown = Math.round(useCountUp(delta, 1100));
  if (!now || now.games === 0 || (from !== undefined && delta === 0)) return null;
  return (
    <div className={`rating-change ${delta > 0 ? 'up' : 'down'}`} role="status">
      <span className="footnote">{from === undefined ? 'Your first Felt Rating' : 'Felt Rating'}</span>
      <span className="num rating-change-value">{Math.round(now.rating)}</span>
      {from !== undefined && <span className="pill num">{shown > 0 ? `+${shown}` : shown}</span>}
    </div>
  );
}

function SessionDone({
  results,
  onMore,
  onHome,
  startRating,
}: {
  results: { accuracy: number; ms: number }[];
  onMore: (() => void) | null;
  onHome: () => void;
  startRating?: number;
}) {
  const done = results.length > 0;
  const avg = done ? results.reduce((a, r) => a + r.accuracy, 0) / results.length : 0;
  const perfect = results.filter((r) => r.accuracy === 1).length;
  const secs = done ? results.reduce((a, r) => a + r.ms, 0) / results.length / 1000 : 0;

  return (
    <div className="stack focus-column">
      <PageHeader title="Review" />
      <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.25rem', gap: '1.1rem' }}>
        {done ? (
          <>
            <ProgressRing value={avg} size={150} stroke={14} color={avg >= 0.9 ? 'var(--green)' : avg >= 0.6 ? 'var(--orange)' : 'var(--red)'}>
              <div>
                <div className="display num" style={{ fontSize: '3rem', lineHeight: 1 }}>
                  <CountUp value={Math.round(avg * 100)} />%
                </div>
                <div className="caption">accuracy</div>
              </div>
            </ProgressRing>
            <RatingChange from={startRating} />
            <div>
              <h2 className="display" style={{ fontSize: '2rem' }}>Review done</h2>
              <div className="footnote" style={{ marginTop: 4 }}>
                You got {perfect} of {plural(results.length, 'card')} perfect. That took {secs.toFixed(1)} seconds per card.
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="icon-tile" style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--green)' }}>
              <CheckIcon size={34} />
            </span>
            <h2 className="display" style={{ fontSize: '2rem' }}>All caught up</h2>
          </>
        )}
        <p className="footnote" style={{ maxWidth: 360, margin: 0 }}>
          {onMore
            ? 'Your due cards are done. Keep going with extra practice. It picks the cards closest to slipping and adds new ones.'
            : 'You have practiced every card here. Paint or quiz any chart in Ranges, or come back later.'}
        </p>
      </div>
      <BottomBar>
        {onMore && (
          <button className="btn btn-primary btn-lg btn-block" onClick={onMore}>
            Keep going
          </button>
        )}
        <Link to="/ranges?mode=quick" className={`btn btn-lg btn-block ${onMore ? 'btn-plain' : 'btn-primary'}`}>
          <DrillsIcon size={19} /> Practice any chart
        </Link>
        <button className="btn btn-plain btn-block" onClick={onHome}>
          Done for now
        </button>
      </BottomBar>
    </div>
  );
}

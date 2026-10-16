import { cardStrength, comebackGroups, currentRating, dueForecast, mathFact, parseCard, solidHistory } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DrillRunner } from '../drills/DrillRunner';
import { haptic } from '../haptics';
import { chartsForGame } from '../state/charts';
import { db } from '../state/db';
import { buildSession, type DeckCount, deckCounts, type DeckId, deckOf, type DeckPref, deckPrefs, DECKS, reviewTotal, type SessionConfig } from '../state/decks';
import { getChart } from '../state/charts';
import { entryFor } from '../state/lessons';
import { spotLine } from '../drills/labels';
import { PlayingCard } from '../components/PlayingCard';
import { EmptyState } from '../ui/Section';
import './review.css';
import { type QueueItem, recordAnswer, RELEARN_WINDOW_MS, startOfToday } from '../state/review';
import { ratingSnapshot } from '../state/rating';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronRightIcon, CloseIcon, DrillsIcon } from '../ui/icons';
import type { Chart } from '@felt/core';
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

/** One answer in a session. `id` is missing in sessions saved by older versions. */
interface Result {
  accuracy: number;
  ms: number;
  id?: string;
}

/** A session in progress, kept for this tab so leaving and coming back resumes it. */
interface SavedSession {
  config: SessionConfig;
  queue: QueueItem[];
  index: number;
  results: Result[];
  phase: 'due' | 'extra';
  answered: string[];
}

const SESSION_KEY = 'felt.reviewSession';

function readSession(): SavedSession | undefined {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : undefined;
  } catch {
    return undefined;
  }
}

function writeSession(s: SavedSession | undefined) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage blocked: the session simply does not resume. */
  }
}

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
  const [resume, setResume] = useState<SavedSession>();
  const [run, setRun] = useState(0);
  const saved = readSession();
  if (!session)
    return (
      <ReviewHome
        resumable={saved}
        onResume={() => {
          if (!saved) return;
          setResume(saved);
          setSession(saved.config);
          setRun((r) => r + 1);
        }}
        onStart={(c) => {
          writeSession(undefined);
          setResume(undefined);
          setSession(c);
          setRun((r) => r + 1);
        }}
      />
    );
  return (
    <ReviewSession
      key={run}
      config={session}
      resume={resume}
      onHome={() => setSession(null)}
      onStart={(c) => {
        writeSession(undefined);
        setResume(undefined);
        setSession(c);
        setRun((r) => r + 1);
      }}
    />
  );
}

function ReviewSession({ config, resume, onHome, onStart }: { config: SessionConfig; resume?: SavedSession; onHome: () => void; onStart: (c: SessionConfig) => void }) {
  const { settings } = useSettings();
  const [queue, setQueue] = useState<QueueItem[] | undefined>(resume?.queue);
  const [index, setIndex] = useState(resume?.index ?? 0);
  const [results, setResults] = useState<Result[]>(resume?.results ?? []);
  // The chosen cards first; then a pause to celebrate; then extra practice that never runs out.
  const [phase, setPhase] = useState<'due' | 'cleared' | 'extra'>(resume?.phase ?? (config.kind === 'extra' ? 'extra' : 'due'));
  const [nothingDue, setNothingDue] = useState(false);
  const answered = useRef(new Set<string>(resume?.answered ?? []));

  // Keep the session so leaving the screen never loses your place. A finished session is forgotten.
  useEffect(() => {
    if (!queue) return;
    if (phase === 'cleared' || index >= queue.length) return writeSession(undefined);
    writeSession({ config, queue, index, results, phase, answered: [...answered.current] });
  }, [config, queue, index, results, phase]);
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
    if (resume) return;
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
    if (phase === 'extra' && exhausted)
      return <SessionDone results={results} items={queue} onMore={null} onHome={onHome} onStart={onStart} startRating={startRating.current} />;
    if (phase === 'extra') return <p className="muted">Loading more cards…</p>;
    return (
      <SessionDone
        results={results}
        items={queue}
        startRating={startRating.current}
        onHome={onHome}
        onStart={onStart}
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
          setResults((r) => [...r, { accuracy: outcome.accuracy, ms: outcome.responseMs, id: item.id }]);
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
function ReviewHome({ onStart, onResume, resumable }: { onStart: (c: SessionConfig) => void; onResume: () => void; resumable?: SavedSession }) {
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

  const memory = useMemory(charts);
  const onDecks = counts?.filter((c) => prefs[c.deck].on) ?? [];
  const total = onDecks.reduce((t, c) => t + c.fresh + c.learning + c.due, 0);
  const limit = study.sessionLimit ?? 0;
  const inSession = limit > 0 ? Math.min(limit, total) : total;
  // About 8 seconds a card. The estimate covers everything ready, so it matches the count beside it.
  const minutes = Math.max(1, Math.round((total * 8) / 60));
  // Nothing to review yet: every deck waits for the lesson that teaches it.
  const locked = !!counts && counts.every((c) => c.total + c.fresh + c.learning + c.due === 0);

  if (locked && !resumable) return <ReviewLocked />;

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="Review" subtitle={counts ? (total ? `${plural(total, 'card')} ready, about ${minutes} min` : caughtUpLine(memory?.forecast)) : ' '} />

      {resumable && (
        <button className="card resume-card" onClick={onResume}>
          <span className="grow">
            <span className="resume-title">Continue your session</span>
            <span className="footnote num">
              Card {resumable.index + 1} of {resumable.queue.length}
            </span>
          </span>
          <span className="resume-ring" aria-hidden="true">
            <ProgressRing value={resumable.index / Math.max(1, resumable.queue.length)} size={40} stroke={5} />
          </span>
          <ChevronRightIcon size={16} className="chev" />
        </button>
      )}

      {/* Nothing due: lead with how your memory is doing and when cards come back. */}
      {memory && memory.started > 0 && counts && total === 0 && <MemorySection memory={memory} />}

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
      </section>

      {memory && memory.started > 0 && total > 0 && <MemorySection memory={memory} />}

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

/** A short name for a card and where it is from, for the list of misses at the end of a session. */
function cardLabel(item: QueueItem, savedTitles: Map<string, string>): { title: string; sub?: string } {
  if (item.mode === 'saved') return { title: savedTitles.get(item.savedId ?? '') ?? 'A saved item', sub: 'Saved' };
  if (item.mode === 'math') return { title: mathFact(item.factId ?? '')?.prompt ?? 'Math fact', sub: 'Math fact' };
  if (item.mode === 'quiz') {
    const entry = item.lessonKey ? entryFor(item.lessonKey) : undefined;
    const step = entry?.content?.steps[item.step ?? -1];
    return { title: step?.kind === 'quiz' ? step.question : 'Lesson question', sub: entry?.title };
  }
  const chart = getChart(item.chartId);
  if (!chart) return { title: 'Chart card' };
  if (item.mode === 'paint') return { title: `Paint the ${chart.spec.hero} chart`, sub: spotLine(chart) || undefined };
  return { title: `${item.hand}, ${chart.spec.hero}`, sub: spotLine(chart) || undefined };
}

const COMEBACK: { key: 'today' | 'tomorrow' | 'week' | 'later'; label: string }[] = [
  { key: 'today', label: 'Later today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'In 2 to 6 days' },
  { key: 'later', label: 'In a week or more' },
];

function SessionDone({
  results,
  items,
  onMore,
  onHome,
  onStart,
  startRating,
}: {
  results: Result[];
  items: QueueItem[];
  onMore: (() => void) | null;
  onHome: () => void;
  onStart: (c: SessionConfig) => void;
  startRating?: number;
}) {
  const { settings } = useSettings();
  const { charts } = chartsForGame(settings.game);
  // Judge each card by its first answer. A card missed, then relearned, still counts as missed.
  const first = new Map<string, Result>();
  for (const r of results) if (r.id && !first.has(r.id)) first.set(r.id, r);
  const tries = first.size ? [...first.values()] : results;
  const done = tries.length > 0;
  const right = tries.filter((r) => r.accuracy >= 1).length;
  const byId = new Map(items.map((i) => [i.id, i]));
  const missed = [...first].filter(([, r]) => r.accuracy < 1).flatMap(([id]) => (byId.has(id) ? [byId.get(id)!] : []));
  const ids = [...first.keys()];

  const summary = useLiveQuery(async () => {
    const now = new Date();
    const cards = (await db.cards.bulkGet(ids)).filter((c) => c !== undefined);
    const savedIds = missed.flatMap((i) => (i.savedId ? [i.savedId] : []));
    const saved = (await db.saved.bulkGet(savedIds)).filter((x) => x !== undefined);
    return {
      comeback: comebackGroups(
        cards.map((c) => c.due),
        now,
      ),
      remaining: await reviewTotal(charts, settings.study, now),
      savedTitles: new Map(saved.map((x) => [x.id, x.title])),
    };
  }, [ids.join(','), settings.game.tableSize, settings.game.format]);

  const limit = settings.study.sessionLimit ?? 0;
  const remaining = summary?.remaining ?? 0;
  const next = limit > 0 ? Math.min(limit, remaining) : remaining;
  const SHOWN = 5;

  return (
    <div className="stack focus-column review-done">
      <PageHeader title="Review" />
      <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.25rem', gap: '1.1rem' }}>
        {done ? (
          <>
            <ProgressRing value={right / tries.length} size={140} stroke={13} label={`${right} of ${tries.length} right the first time`}>
              <div className="display num" style={{ fontSize: '2.8rem', lineHeight: 1 }} aria-hidden="true">
                <CountUp value={right} />/{tries.length}
              </div>
            </ProgressRing>
            <RatingChange from={startRating} />
            <div>
              <h2 className="display" style={{ fontSize: '2rem' }}>
                Review done
              </h2>
              <div className="footnote" style={{ marginTop: 4 }}>
                You got {right} of {plural(tries.length, 'card')} right the first time.
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="icon-tile" style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--green)' }}>
              <CheckIcon size={34} />
            </span>
            <h2 className="display" style={{ fontSize: '2rem' }}>
              All caught up
            </h2>
            <p className="footnote" style={{ maxWidth: 360, margin: 0 }}>
              You have practiced every card here. Paint or quiz any chart in Ranges.
            </p>
          </>
        )}
      </div>

      {done && summary && (
        <section className="reveal">
          <h2 className="section-title">When they come back</h2>
          <div className="list">
            {COMEBACK.filter((g) => summary.comeback[g.key] > 0).map((g) => (
              <div key={g.key} className="list-row comeback-row">
                <span className="grow">{g.label}</span>
                <span className="comeback-bar" aria-hidden="true">
                  <span style={{ width: `${(summary.comeback[g.key] / ids.length) * 100}%` }} />
                </span>
                <span className="num comeback-n">{plural(summary.comeback[g.key], 'card')}</span>
              </div>
            ))}
          </div>
          <div className="section-footer">Cards you knew well come back later. Misses come back soon.</div>
        </section>
      )}

      {missed.length > 0 && (
        <section className="reveal">
          <h2 className="section-title">To work on</h2>
          <div className="list">
            {missed.slice(0, SHOWN).map((i) => {
              const label = cardLabel(i, summary?.savedTitles ?? new Map());
              return (
                <div key={i.id} className="list-row missed-row">
                  <span className="missed-dot" aria-hidden="true" />
                  <span className="grow">
                    <span className="missed-label">{label.title}</span>
                    {label.sub && <span className="footnote">{label.sub}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {missed.length > SHOWN && <div className="section-footer">And {plural(missed.length - SHOWN, 'more card')}.</div>}
        </section>
      )}

      {!done || remaining > 0 || !onMore ? null : (
        <p className="footnote" style={{ margin: '0 1rem' }}>
          Your due cards are done. Extra practice picks the cards closest to slipping.
        </p>
      )}

      <BottomBar>
        {summary && next > 0 ? (
          <button className="btn btn-primary btn-lg btn-block" onClick={() => onStart({ kind: 'today' })}>
            Study {plural(next, 'more card')}
          </button>
        ) : onMore ? (
          <button className="btn btn-primary btn-lg btn-block" onClick={onMore}>
            Keep going
          </button>
        ) : (
          <Link to="/ranges?mode=quick" className="btn btn-primary btn-lg btn-block">
            <DrillsIcon size={19} /> Practice any chart
          </Link>
        )}
        <button className="btn btn-plain btn-block" onClick={onHome}>
          Done for now
        </button>
      </BottomBar>
    </div>
  );
}

const HISTORY_DAYS = 30;

interface Memory {
  /** Cards studied at least once, or added to review. */
  started: number;
  solid: number;
  learning: number;
  /** Solid cards at the end of each of the last 30 days, oldest first. */
  history: number[];
  /** Cards due on each of the next 7 days in decks that are on, today first. Today is in the deck list, so the chart starts tomorrow. */
  forecast: number[];
}

/** Memory strength and what is coming, straight from the scheduler's stored cards and grades. */
function useMemory(charts: readonly Chart[]): Memory | undefined {
  const { settings } = useSettings();
  const prefs = deckPrefs(settings.study);
  const key = charts.map((c) => c.spec.id).join(',');
  return useLiveQuery(async () => {
    const chartIds = new Set(charts.map((c) => c.spec.id));
    const cards = (await db.cards.toArray()).filter((c) => deckOf(c) !== 'charts' || chartIds.has(c.chartId));
    const cardIds = new Set(cards.map((c) => c.id));
    const reviews = (await db.reviews.toArray()).filter((r) => cardIds.has(r.cardId));
    const now = new Date();
    const solid = cards.filter((c) => cardStrength(c.fsrs) === 'solid').length;
    const history = solidHistory(reviews, now, HISTORY_DAYS);
    // Today is what the scheduler holds now, so the chart ends on the number above it.
    history[history.length - 1] = solid;
    return {
      started: cards.length,
      solid,
      learning: cards.length - solid,
      history,
      forecast: dueForecast(
        cards.filter((c) => prefs[deckOf(c)].on).map((c) => c.due),
        now,
        8,
      ),
    };
  }, [key, JSON.stringify(prefs)]);
}

/** The subtitle once nothing is due: when the next cards come back. */
function caughtUpLine(forecast?: number[]): string {
  if (!forecast) return 'All caught up for today';
  const come = (n: number) => `${plural(n, 'card')} ${n === 1 ? 'comes' : 'come'} back`;
  if (forecast[0] > 0) return `All caught up for now. ${come(forecast[0])} later today.`;
  const day = forecast.findIndex((n, i) => i > 0 && n > 0);
  if (day === 1) return `All caught up. ${come(forecast[1])} tomorrow.`;
  if (day > 1) return `All caught up. Your next cards come back in ${day} days.`;
  return 'All caught up for today';
}

function dayLabel(i: number): string {
  if (i === 0) return 'Today';
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

/** Solid cards over time, the split of solid and learning, and the cards due this week. */
function MemorySection({ memory }: { memory: Memory }) {
  const { solid, learning, started, history, forecast } = memory;
  const weekAgo = history[history.length - 8] ?? 0;
  const gained = solid - weekAgo;
  const peak = Math.max(1, ...history);
  const week = forecast.slice(1);
  const busiest = Math.max(1, ...week);
  const shown = Math.round(useCountUp(solid, 900));
  return (
    <section>
      <h2 className="section-title">Your memory</h2>
      <div className="card memory-card">
        <div className="memory-head">
          <div>
            <div className="memory-figure">
              <span className="display num">{shown}</span>
              <span className="memory-unit">solid {solid === 1 ? 'card' : 'cards'}</span>
            </div>
            <div className="footnote">{plural(learning, 'card')} still learning</div>
          </div>
          {gained > 0 && <span className="pill pill-good num">{gained} more this week</span>}
        </div>
        <div className="memory-chart" role="img" aria-label={`Solid cards over the last ${HISTORY_DAYS} days. ${history[0]} then, ${solid} today.`}>
          {history.map((n, i) => (
            <span key={i} className={i === history.length - 1 ? 'today' : undefined} style={{ '--h': `${(n / peak) * 100}%`, '--i': i } as React.CSSProperties} />
          ))}
        </div>
        <div className="memory-axis">
          <span>{HISTORY_DAYS} days ago</span>
          <span>Today</span>
        </div>
        <div className="memory-split" aria-hidden="true">
          <span className="solid" style={{ flexGrow: solid }} />
          <span className="learning" style={{ flexGrow: learning }} />
        </div>
        <div className="memory-legend">
          <span>
            <i className="solid" aria-hidden="true" />
            Solid {solid}
          </span>
          <span>
            <i className="learning" aria-hidden="true" />
            Learning {learning}
          </span>
          <span className="num">{Math.round((solid / Math.max(1, started)) * 100)}% solid</span>
        </div>
        <div className="memory-divider" />
        <div className="forecast-title">Coming up</div>
        <ul className="forecast" aria-label="Cards due each day of the next week">
          {week.map((n, d) => {
            const i = d + 1;
            return (
              <li key={i} className={`forecast-day${i === 1 ? ' next' : ''}`} aria-label={`${dayLabel(i)}: ${plural(n, 'card')}`}>
                <span className="forecast-n num" aria-hidden="true">
                  {n > 0 ? n : ''}
                </span>
                <span className="forecast-track" aria-hidden="true">
                  <span style={{ height: n > 0 ? `${Math.max(10, (n / busiest) * 100)}%` : 0 }} />
                </span>
                <span className="forecast-label" aria-hidden="true">
                  {dayLabel(i)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="section-footer">A solid card should stay with you for a week without review. These counts come from your review history.</div>
    </section>
  );
}

/** Before the first lesson there is nothing to review. Say why and how to start. */
function ReviewLocked() {
  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="Review" />
      <EmptyState
        art={
          <span className="review-locked-art">
            <PlayingCard card={parseCard('As')} size="md" />
            <PlayingCard card={parseCard('Kh')} size="md" />
          </span>
        }
        title="Review starts after a lesson"
        body="Each lesson adds cards here. Felt brings each one back before you forget it."
      />
      <BottomBar>
        <Link to="/learn" className="btn btn-primary btn-lg btn-block">
          Start a lesson
        </Link>
      </BottomBar>
    </div>
  );
}

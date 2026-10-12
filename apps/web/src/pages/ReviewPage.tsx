import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DrillRunner } from '../drills/DrillRunner';
import { haptic } from '../haptics';
import { chartsForGame } from '../state/charts';
import { buildExtra, buildQueue, buildSavedDeck, type QueueItem, recordAnswer, RELEARN_WINDOW_MS } from '../state/review';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, CloseIcon, DrillsIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';
import { useCountUp } from '../ui/useCountUp';
import { plural } from '../ui/format';

function CountUp({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 900))}</>;
}

const EXTRA_BATCH = 20;

export function ReviewPage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const savedOnly = params.get('deck') === 'saved';
  const [queue, setQueue] = useState<QueueItem[]>();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ accuracy: number; ms: number }[]>([]);
  // Due cards first; then a pause to celebrate; then extra practice that never runs out.
  const [phase, setPhase] = useState<'due' | 'cleared' | 'extra'>('due');
  const [nothingDue, setNothingDue] = useState(false);
  const answered = useRef(new Set<string>());
  const [exhausted, setExhausted] = useState(false);
  const loadingMore = useRef(false);
  // A new key per attempt so a card shown twice in one session starts fresh.
  const [attempt, setAttempt] = useState(0);
  const { charts } = chartsForGame(settings.game);

  const moreExtra = useCallback(async () => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    const batch = await buildExtra(charts, EXTRA_BATCH, answered.current);
    loadingMore.current = false;
    if (batch.length === 0) setExhausted(true);
    setQueue((q) => [...(q ?? []), ...batch]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.game]);

  const load = useCallback(async () => {
    setIndex(0);
    setResults([]);
    if (savedOnly) {
      setQueue(await buildSavedDeck());
      setPhase('due');
      return;
    }
    const { due, fresh } = await buildQueue(charts, settings.study.newPerDay);
    if (due.length + fresh.length > 0) {
      setQueue([...due, ...fresh]);
      setPhase('due');
      return;
    }
    // Nothing due: go straight to extra practice instead of a dead end.
    setNothingDue(true);
    setPhase('extra');
    const batch = await buildExtra(charts, EXTRA_BATCH, answered.current);
    if (batch.length === 0) setExhausted(true);
    setQueue(batch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.game, settings.study.newPerDay, savedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the extra stream topped up a few cards before it ends.
  useEffect(() => {
    if (phase === 'extra' && queue && index >= queue.length - 3) void moreExtra();
  }, [phase, index, queue, moreExtra]);

  const item = phase === 'cleared' ? undefined : queue?.[index];
  useBodyClass('focus-mode', !!item);

  if (!queue) return <p className="muted">Loading your review…</p>;

  if (!item) {
    if (phase === 'extra' && exhausted) return <SessionDone results={results} onMore={null} />;
    if (phase === 'extra') return <p className="muted">Loading more cards…</p>;
    return (
      <SessionDone
        results={results}
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
        <button className="icon-btn glass" aria-label="End review" onClick={() => navigate(savedOnly ? '/saved' : '/')}>
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
            if (!savedOnly) setPhase('cleared');
          }
          setIndex((i) => i + 1);
          setAttempt((a) => a + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

function SessionDone({ results, onMore }: { results: { accuracy: number; ms: number }[]; onMore: (() => void) | null }) {
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
            : 'You have practiced every card for your game. Try another chart in Drills, or come back later.'}
        </p>
      </div>
      <BottomBar>
        {onMore && (
          <button className="btn btn-primary btn-lg btn-block" onClick={onMore}>
            Keep going
          </button>
        )}
        <Link to="/drills" className={`btn btn-lg btn-block ${onMore ? 'btn-plain' : 'btn-primary'}`}>
          <DrillsIcon size={19} /> Practice any chart
        </Link>
        <Link to="/" className="btn btn-plain btn-block">
          Done for now
        </Link>
      </BottomBar>
    </div>
  );
}

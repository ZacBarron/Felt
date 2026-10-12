import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DrillRunner } from '../drills/DrillRunner';
import { haptic } from '../haptics';
import { chartsForGame } from '../state/charts';
import { buildQueue, buildSavedDeck, type QueueItem, recordAnswer, RELEARN_WINDOW_MS } from '../state/review';
import { useSettings } from '../state/settings';
import { CheckIcon, CloseIcon, DrillsIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';
import { useCountUp } from '../ui/useCountUp';

function CountUp({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 900))}</>;
}

export function ReviewPage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const savedOnly = params.get('deck') === 'saved';
  const [queue, setQueue] = useState<QueueItem[]>();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ accuracy: number; ms: number }[]>([]);
  // A new key per attempt so a card shown twice in one session starts fresh.
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    if (savedOnly) {
      setQueue(await buildSavedDeck());
    } else {
      const { charts } = chartsForGame(settings.game);
      const { due, fresh } = await buildQueue(charts, settings.study.newPerDay);
      setQueue([...due, ...fresh]);
    }
    setIndex(0);
    setResults([]);
  }, [settings.game, settings.study.newPerDay, savedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const item = queue?.[index];
  useBodyClass('focus-mode', !!item);

  if (!queue) return <p className="muted">Loading your queue...</p>;

  if (!item) return <SessionDone results={results} onReload={() => void load()} />;

  const progress = queue.length ? index / queue.length : 0;

  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="End session" onClick={() => navigate(savedOnly ? '/saved' : '/')}>
          <CloseIcon size={18} />
        </button>
        <div className="progress" role="progressbar" aria-label="Review" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index} aria-valuetext={`Card ${index + 1} of ${queue.length}`}>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="footnote num" style={{ minWidth: 40, textAlign: 'right' }}>
          {index + 1} of {queue.length}
        </span>
        {item.isNew && <span className="pill pill-tint">New</span>}
      </div>
      <DrillRunner
        key={`${item.id}:${attempt}`}
        item={item}
        onAnswer={(outcome) => {
          setResults((r) => [...r, { accuracy: outcome.accuracy, ms: outcome.responseMs }]);
          void recordAnswer(item, outcome).then((due) => {
            if (due.getTime() - Date.now() < RELEARN_WINDOW_MS) setQueue((q) => [...(q ?? []), { ...item, isNew: false }]);
          });
        }}
        onNext={() => {
          if (index + 1 >= queue.length) haptic('heavy');
          setIndex((i) => i + 1);
          setAttempt((a) => a + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

function SessionDone({ results, onReload }: { results: { accuracy: number; ms: number }[]; onReload: () => void }) {
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
              <h2 className="display" style={{ fontSize: '2rem' }}>Session complete</h2>
              <div className="footnote" style={{ marginTop: 4 }}>
                {results.length} cards, {perfect} perfect, {secs.toFixed(1)}s average
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
          Missed cards come back in a few minutes. New cards arrive tomorrow. For more now, raise New cards per day in Settings.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={onReload}>
            Refresh
          </button>
          <Link to="/drills" className="btn btn-primary">
            <DrillsIcon size={19} /> Practice any chart
          </Link>
        </div>
      </div>
    </div>
  );
}

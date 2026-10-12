import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DrillRunner } from '../drills/DrillRunner';
import { chartsForGame } from '../state/charts';
import { buildQueue, type QueueItem, recordAnswer, RELEARN_WINDOW_MS } from '../state/review';
import { useSettings } from '../state/settings';

export function ReviewPage() {
  const { settings } = useSettings();
  const [queue, setQueue] = useState<QueueItem[]>();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  // A new key per attempt so a card shown twice in one session starts fresh.
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    const { charts } = chartsForGame(settings.game);
    const { due, fresh } = await buildQueue(charts, settings.study.newPerDay);
    setQueue([...due, ...fresh]);
    setIndex(0);
    setResults([]);
  }, [settings]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!queue) return <p className="muted">Loading your queue...</p>;

  const item = queue[index];
  if (!item) {
    const avg = results.length ? results.reduce((a, b) => a + b, 0) / results.length : 0;
    return (
      <div className="stack">
        <h1>Review</h1>
        <div className="card stack">
          {results.length ? (
            <>
              <strong>Session done</strong>
              <div>
                {results.length} cards, {(avg * 100).toFixed(0)}% accuracy.
              </div>
            </>
          ) : (
            <strong>Nothing due right now.</strong>
          )}
          <div className="muted">Missed cards come back in a few minutes. New cards unlock tomorrow, or raise the daily limit.</div>
          <div className="row">
            <button onClick={() => void load()}>Check again</button>
            <Link to="/drills">Free practice</Link>
            <Link to="/settings">Settings</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Review</h1>
        <span className="muted">
          {index + 1} / {queue.length} {item.isNew && <span className="pill">new</span>}
        </span>
      </div>
      <DrillRunner
        key={`${item.id}:${attempt}`}
        item={item}
        onAnswer={(outcome) => {
          setResults((r) => [...r, outcome.accuracy]);
          void recordAnswer(item, outcome).then((due) => {
            if (due.getTime() - Date.now() < RELEARN_WINDOW_MS) setQueue((q) => [...(q ?? []), { ...item, isNew: false }]);
          });
        }}
        onNext={() => {
          setIndex((i) => i + 1);
          setAttempt((a) => a + 1);
        }}
      />
    </div>
  );
}

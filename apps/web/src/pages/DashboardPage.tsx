import { stakesLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { chartsForGame } from '../state/charts';
import { todayStats } from '../state/review';
import { useSettings } from '../state/settings';

const LOOP = [
  { step: 'Learn', text: 'A short lesson on one idea', to: '/learn' },
  { step: 'Drill', text: 'Recall it fast until it is automatic', to: '/review' },
  { step: 'Apply', text: 'Use it in full hand scenarios', to: '/scenarios' },
  { step: 'Play', text: 'Log sessions and key hands', to: '/log' },
  { step: 'Review', text: "Leaks become tomorrow's cards", to: '/review' },
];

export function DashboardPage() {
  const { settings } = useSettings();
  const g = settings.game;
  const stats = useLiveQuery(
    () => todayStats(chartsForGame(g).charts, settings.study.newPerDay),
    [g.tableSize, g.format, settings.study.newPerDay],
  );
  const toDo = stats ? stats.dueNow + stats.newAvailable : 0;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Today</h1>
        <Link to="/settings" className="pill" style={{ textDecoration: 'none' }}>
          {stakesLabel(g.stakes)} {g.venue} {g.format} · {g.tableSize}-handed
        </Link>
      </div>

      <Link to="/review" className="card" style={{ textDecoration: 'none', color: 'inherit', borderColor: toDo ? 'var(--accent)' : undefined }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="muted">Review queue</div>
            <div className="stat">{stats ? `${stats.dueNow} due · ${stats.newAvailable} new` : '...'}</div>
          </div>
          <span className={toDo ? 'pill' : 'muted'} style={toDo ? { background: 'var(--accent)', color: '#06120c', fontWeight: 700 } : {}}>
            {toDo ? 'Start' : 'All done'}
          </span>
        </div>
      </Link>

      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Tile label="Streak" value={stats ? `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}` : '...'} />
        <Tile label="Reviewed today" value={stats ? String(stats.reviewedToday) : '...'} />
        <Tile label="Accuracy today" value={stats?.accuracyToday != null ? `${Math.round(stats.accuracyToday * 100)}%` : '-'} />
        <Tile label="Avg recall time" value={stats?.avgSecondsToday != null ? `${stats.avgSecondsToday.toFixed(1)}s` : '-'} />
      </div>

      <div className="card">
        <h2>The training loop</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {LOOP.map((l, i) => (
            <Link key={l.step} to={l.to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '0.4rem 0' }}>
                <div className="muted" style={{ fontSize: '0.75rem' }}>
                  {i + 1}
                </div>
                <strong>{l.step}</strong>
                <div className="muted">{l.text}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <Link to="/ranges" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h2>Ranges</h2>
          <p className="muted">Browse the charts for your game with mixed strategies.</p>
        </Link>
        <Link to="/lab" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h2>Spot Lab</h2>
          <p className="muted">Table view, equity vs range, pot odds, and EV per action.</p>
        </Link>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="stat">{value}</div>
    </div>
  );
}

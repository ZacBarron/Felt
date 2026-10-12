import { Link } from 'react-router-dom';

const LOOP = [
  { step: 'Learn', text: 'A short lesson on one idea', to: '/learn' },
  { step: 'Drill', text: 'Recall it fast until it is automatic', to: '/drills' },
  { step: 'Apply', text: 'Use it in full hand scenarios', to: '/scenarios' },
  { step: 'Play', text: 'Log sessions and key hands', to: '/log' },
  { step: 'Review', text: "Leaks become tomorrow's cards", to: '/review' },
];

export function DashboardPage() {
  return (
    <div className="stack">
      <div>
        <h1>Today</h1>
        <p className="muted">Your daily plan will live here: reviews due, a challenge, and one lesson.</p>
      </div>

      <div className="grid-3">
        <Tile label="Reviews due" value="0" hint="Phase 1" />
        <Tile label="Streak" value="0 days" hint="Phase 1" />
        <Tile label="Avg EV loss" value="-" hint="Phase 4" />
        <Tile label="Win rate" value="-" hint="Phase 3" />
      </div>

      <div className="card">
        <h2>The training loop</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {LOOP.map((l, i) => (
            <Link key={l.step} to={l.to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '0.5rem 0' }}>
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
          <p className="muted">Browse the starter 6-max charts with mixed strategies.</p>
        </Link>
        <Link to="/lab" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h2>Spot Lab</h2>
          <p className="muted">Table view, equity vs range, pot odds, and EV per action.</p>
        </Link>
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="stat">{value}</div>
      <span className="pill">{hint}</span>
    </div>
  );
}

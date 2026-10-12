const FEATURES = {
  scenarios: {
    title: 'Scenarios',
    phase: 'Phase 5',
    points: [
      'Play full hands street by street against a solver strategy',
      'Every decision graded by EV loss: best, correct, inaccuracy, mistake, blunder',
      'Replay your own logged hands as scenarios',
    ],
  },
  exploit: {
    title: 'Exploits and tells',
    phase: 'Phase 6',
    points: [
      'Villain profiles (nit, TAG, LAG, station, maniac) with their typical leaks',
      'See how the GTO strategy shifts when a leak is node locked',
      'Tells library rated by reliability, plus notes you attach to real opponents',
    ],
  },
  log: {
    title: 'Session and hand log',
    phase: 'Phase 2',
    points: [
      'One tap session start and stop with buy in, cash out and stakes',
      'Hand entry in under 20 seconds: card picker, position chips, action shorthand',
      'Flag hands for review; flagged hands become Spot Lab and scenario material',
    ],
  },
  stats: {
    title: 'Stats',
    phase: 'Phase 2',
    points: [
      'Results: win rate in bb/100 and per hour, bankroll graph, variance bands',
      'Skill: drill accuracy and speed by topic, EV loss trend, retention',
      'Leak finder: positions and spot types where you lose the most',
    ],
  },
} as const;

export function PlannedPage({ feature }: { feature: keyof typeof FEATURES }) {
  const f = FEATURES[feature];
  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>{f.title}</h1>
        <span className="pill">{f.phase}</span>
      </div>
      <div className="card">
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {f.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <p className="muted">See docs/ROADMAP.md for the build order.</p>
    </div>
  );
}

import { CircleDashed } from 'lucide-react';
import { NAV_ITEMS } from '../nav';

const FEATURES = {
  scenarios: {
    to: '/scenarios',
    title: 'Scenarios',
    phase: 'Phase 5',
    points: [
      'Play full hands street by street against a solver strategy',
      'Every decision graded by EV loss: best, correct, inaccuracy, mistake, blunder',
      'Replay your own logged hands as scenarios',
    ],
  },
  exploit: {
    to: '/exploit',
    title: 'Exploits and tells',
    phase: 'Phase 6',
    points: [
      'Villain profiles (nit, TAG, LAG, station, maniac) with their typical leaks',
      'See how the GTO strategy shifts when a leak is node locked',
      'Tells library rated by reliability, plus notes you attach to real opponents',
    ],
  },
  log: {
    to: '/log',
    title: 'Session and hand log',
    phase: 'Phase 2',
    points: [
      'One tap session start and stop with buy in, cash out and stakes',
      'Hand entry in under 20 seconds: card picker, seat chips, action shorthand',
      'Flag hands for review; flagged hands become Spot Lab and scenario material',
    ],
  },
  stats: {
    to: '/stats',
    title: 'Stats',
    phase: 'Phase 2',
    points: [
      'Results: profit, bb per hour, bankroll graph, variance bands',
      'Skill: drill accuracy and speed by topic, EV loss trend, retention',
      'Leak finder: seats and spot types where you lose the most',
    ],
  },
} as const;

export function PlannedPage({ feature }: { feature: keyof typeof FEATURES }) {
  const f = FEATURES[feature];
  const Icon = NAV_ITEMS.find((n) => n.to === f.to)?.icon ?? CircleDashed;
  return (
    <div className="stack">
      <div className="card card-accent stack" style={{ alignItems: 'flex-start', gap: '0.9rem', padding: '1.5rem 1.25rem' }}>
        <span className="tile">
          <span className="icon" style={{ width: 52, height: 52, borderRadius: 16, color: 'var(--accent)', marginBottom: 0 }}>
            <Icon size={26} />
          </span>
        </span>
        <div>
          <span className="pill pill-accent">Coming in {f.phase}</span>
          <h1 style={{ marginTop: '0.5rem', marginBottom: 0 }}>{f.title}</h1>
        </div>
        <div className="stack" style={{ gap: '0.6rem' }}>
          {f.points.map((p) => (
            <div key={p} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CircleDashed size={18} className="faint" style={{ flex: 'none', marginTop: 2 }} />
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

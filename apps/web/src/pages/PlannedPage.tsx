import { NAV_ITEMS } from '../nav';
import { PageHeader } from '../ui/PageHeader';

const FEATURES = {
  scenarios: {
    to: '/scenarios',
    title: 'Scenarios',
    phase: 'Phase 5',
    points: [
      'Play full hands street by street against a solver strategy',
      'Every decision graded by EV loss, from best to blunder',
      'Replay your own logged hands as scenarios',
    ],
  },
  exploit: {
    to: '/exploit',
    title: 'Exploits',
    phase: 'Phase 6',
    points: [
      'Player profiles (nit, TAG, LAG, station, maniac) and their typical leaks',
      'How the GTO strategy shifts when you lock in a leak',
      'A tells library rated by reliability, plus notes on real opponents',
    ],
  },
  log: {
    to: '/log',
    title: 'Log',
    phase: 'Phase 2',
    points: [
      'One tap session start and stop with buy in, cash out and stakes',
      'Hand entry in under 20 seconds: card picker, seats, action shorthand',
      'Flag hands to review later in the Spot Lab and as scenarios',
    ],
  },
  stats: {
    to: '/stats',
    title: 'Stats',
    phase: 'Phase 2',
    points: [
      'Results: profit, big blinds per hour, bankroll graph, variance bands',
      'Skill: drill accuracy and speed by topic, EV loss trend, retention',
      'Leak finder: the seats and spots where you lose the most',
    ],
  },
} as const;

export function PlannedPage({ feature }: { feature: keyof typeof FEATURES }) {
  const f = FEATURES[feature];
  const nav = NAV_ITEMS.find((n) => n.to === f.to)!;
  const Icon = nav.icon;
  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title={f.title} />
      <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.25rem', gap: '0.8rem' }}>
        <span className="icon-tile" style={{ width: 64, height: 64, borderRadius: 18, background: nav.color }}>
          <Icon size={32} strokeWidth={1.8} />
        </span>
        <h2 className="display" style={{ fontSize: '1.9rem' }}>Coming in {f.phase}</h2>
      </div>
      <div className="list">
        {f.points.map((p) => (
          <div key={p} className="list-row">
            <span className="grow">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

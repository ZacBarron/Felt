import { stakesLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChevronRight, Flame, FlaskConical, Gauge, Grid3x3, Layers, NotebookPen, Play, Target, Timer, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { chartsForGame } from '../state/charts';
import { todayStats } from '../state/review';
import { useSettings } from '../state/settings';
import { ProgressRing } from '../ui/ProgressRing';

const LOOP = [
  { step: 'Learn', text: 'One idea, with a visual', to: '/learn', icon: BookOpen },
  { step: 'Drill', text: 'Recall it until automatic', to: '/review', icon: Layers },
  { step: 'Apply', text: 'Full hand scenarios', to: '/scenarios', icon: Trophy },
  { step: 'Play', text: 'Log sessions and hands', to: '/log', icon: NotebookPen },
];

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 5 ? 'Late session' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage() {
  const { settings } = useSettings();
  const g = settings.game;
  const stats = useLiveQuery(
    () => todayStats(chartsForGame(g).charts, settings.study.newPerDay),
    [g.tableSize, g.format, settings.study.newPerDay],
  );
  const remaining = stats ? stats.dueNow + stats.newAvailable : 0;
  const total = stats ? stats.reviewedToday + remaining : 0;
  const dayProgress = total > 0 ? (stats?.reviewedToday ?? 0) / total : 1;

  return (
    <div className="stack" style={{ gap: '1.1rem' }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">{greeting()}</div>
          <h1 style={{ margin: 0 }}>Today</h1>
        </div>
        <Link to="/settings" className="pill" style={{ textDecoration: 'none' }}>
          {stakesLabel(g.stakes)} {g.venue} · {g.tableSize}-handed
        </Link>
      </div>

      <Link to="/review" className="card card-accent" data-haptic="tap">
        <div className="row" style={{ gap: '1.1rem', flexWrap: 'nowrap' }}>
          <ProgressRing value={stats ? dayProgress : 0} size={92} stroke={9}>
            <div>
              <div className="num" style={{ fontWeight: 800, fontSize: '1.3rem' }}>
                {stats ? remaining : '-'}
              </div>
              <div className="faint" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                LEFT
              </div>
            </div>
          </ProgressRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">Daily review</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
              {!stats ? '...' : remaining === 0 ? 'All caught up' : `${stats.dueNow} due · ${stats.newAvailable} new`}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {remaining === 0 ? 'Come back tomorrow, or practice freely.' : `About ${Math.max(1, Math.round((remaining * 6) / 60))} min`}
            </div>
          </div>
          <span
            className="btn btn-primary icon-btn"
            style={{ width: 48, height: 48, flex: 'none', visibility: remaining ? 'visible' : 'hidden' }}
            aria-hidden="true"
          >
            <Play size={20} fill="currentColor" />
          </span>
        </div>
      </Link>

      <div className="tiles">
        <Tile icon={<Flame size={17} />} tint="var(--gold)" label="Streak" value={stats ? `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}` : '-'} />
        <Tile icon={<Layers size={17} />} label="Reviewed today" value={stats ? String(stats.reviewedToday) : '-'} />
        <Tile
          icon={<Gauge size={17} />}
          label="Accuracy"
          value={stats?.accuracyToday != null ? `${Math.round(stats.accuracyToday * 100)}%` : '-'}
        />
        <Tile
          icon={<Timer size={17} />}
          label="Recall speed"
          value={stats?.avgSecondsToday != null ? `${stats.avgSecondsToday.toFixed(1)}s` : '-'}
        />
      </div>

      <div className="grid-2">
        <Link to="/ranges" className="card">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <span className="tile">
              <span className="icon" style={{ marginBottom: 0, color: 'var(--act-raise)' }}>
                <Grid3x3 size={17} />
              </span>
            </span>
            <div style={{ flex: 1 }}>
              <strong>Ranges</strong>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Charts for your game, mixes included
              </div>
            </div>
            <ChevronRight size={18} className="faint" />
          </div>
        </Link>
        <Link to="/lab" className="card">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <span className="tile">
              <span className="icon" style={{ marginBottom: 0, color: 'var(--suit-d)' }}>
                <FlaskConical size={17} />
              </span>
            </span>
            <div style={{ flex: 1 }}>
              <strong>Spot Lab</strong>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                Equity, pot odds and EV per action
              </div>
            </div>
            <ChevronRight size={18} className="faint" />
          </div>
        </Link>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: '0.6rem' }}>
          The training loop
        </div>
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))' }}>
          {LOOP.map(({ step, text, to, icon: Icon }) => (
            <Link key={step} to={to} className="card-flat pressable-flat" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Icon size={18} className="muted" />
              <div style={{ fontWeight: 700, marginTop: 6 }}>{step}</div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                {text}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Link to="/drills" className="btn btn-block" style={{ minHeight: 50 }}>
        <Target size={18} /> Free practice
      </Link>
    </div>
  );
}

function Tile({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint?: string }) {
  return (
    <div className="card tile" style={{ padding: '0.9rem 1rem' }}>
      <span className="icon" style={{ color: tint }}>
        {icon}
      </span>
      <div className="stat" style={{ fontSize: '1.4rem' }}>
        {value}
      </div>
      <div className="muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

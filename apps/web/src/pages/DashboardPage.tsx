import { stakesLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '../nav';
import { chartsForGame } from '../state/charts';
import { todayStats } from '../state/review';
import { useSettings } from '../state/settings';
import { DrillsIcon, FlameIcon } from '../ui/icons';
import { NavRow } from '../ui/NavRow';
import { PageHeader } from '../ui/PageHeader';
import { ProgressRing } from '../ui/ProgressRing';

const item = (to: string) => NAV_ITEMS.find((i) => i.to === to)!;

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
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader
        title="Today"
        kicker={date}
        trailing={
          <Link to="/settings" className="pill" style={{ textDecoration: 'none', marginBottom: 6 }}>
            {stakesLabel(g.stakes)} {g.venue}, {g.tableSize}-handed
          </Link>
        }
      />

      <section className="card stack" style={{ gap: '1.1rem' }}>
        <div className="row" style={{ gap: '1.1rem', flexWrap: 'nowrap' }}>
          <ProgressRing value={stats ? dayProgress : 0} size={88} stroke={10}>
            <div>
              <div className="num" style={{ fontWeight: 700, fontSize: '1.35rem', letterSpacing: '-0.03em' }}>
                {stats ? remaining : ''}
              </div>
              <div className="caption">left</div>
            </div>
          </ProgressRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="footnote">Daily review</div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
              {!stats ? ' ' : remaining === 0 ? 'All caught up' : `${remaining} cards`}
            </div>
            <div className="footnote">
              {!stats
                ? ''
                : remaining === 0
                  ? 'Come back tomorrow, or practice freely.'
                  : `${stats.dueNow} due, ${stats.newAvailable} new, about ${Math.max(1, Math.round((remaining * 6) / 60))} min`}
            </div>
          </div>
        </div>
        {remaining > 0 ? (
          <Link to="/review" className="btn btn-primary btn-lg btn-block">
            Start review
          </Link>
        ) : (
          <Link to="/drills" className="btn btn-tinted btn-lg btn-block">
            <DrillsIcon size={20} /> Free practice
          </Link>
        )}
      </section>

      <section>
        <div className="section-title">Summary</div>
        <div className="stat-grid">
          <Stat
            label="Streak"
            value={stats ? `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}` : ''}
            accent={<FlameIcon size={15} style={{ color: 'var(--orange)' }} />}
          />
          <Stat label="Reviewed" value={stats ? String(stats.reviewedToday) : ''} />
          <Stat label="Accuracy" value={stats?.accuracyToday != null ? `${Math.round(stats.accuracyToday * 100)}%` : 'None yet'} dim={stats?.accuracyToday == null} />
          <Stat
            label="Recall speed"
            value={stats?.avgSecondsToday != null ? `${stats.avgSecondsToday.toFixed(1)}s` : 'None yet'}
            dim={stats?.avgSecondsToday == null}
          />
        </div>
      </section>

      <section>
        <div className="section-title">Study</div>
        <div className="list with-icons">
          <NavRow {...rowProps('/ranges')} subtitle="Charts for your game, mixes included" />
          <NavRow {...rowProps('/drills')} title="Free practice" subtitle="Drill any chart without affecting reviews" />
          <NavRow {...rowProps('/lab')} subtitle="Equity, pot odds and EV per action" />
          <NavRow {...rowProps('/learn')} subtitle="The full curriculum" />
        </div>
      </section>
    </div>
  );
}

function rowProps(to: string) {
  const i = item(to);
  return { to, icon: i.icon, color: i.color, title: i.label };
}

function Stat({ label, value, accent, dim }: { label: string; value: string; accent?: React.ReactNode; dim?: boolean }) {
  return (
    <div>
      <div className="footnote row" style={{ gap: 4 }}>
        {accent}
        {label}
      </div>
      <div className="stat" style={dim ? { fontSize: '1.05rem', color: 'var(--label-3)', paddingTop: 6 } : undefined}>
        {value}
      </div>
    </div>
  );
}

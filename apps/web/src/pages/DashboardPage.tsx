import { stakesLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { chartsForGame } from '../state/charts';
import { todayStats } from '../state/review';
import { useSettings } from '../state/settings';
import { HeroPattern } from '../ui/Brand';
import { CheckIcon, FlameIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { ProgressRing } from '../ui/ProgressRing';
import { useCountUp } from '../ui/useCountUp';

export function DashboardPage() {
  const { settings } = useSettings();
  const g = settings.game;
  const stats = useLiveQuery(
    () => todayStats(chartsForGame(g).charts, settings.study.newPerDay),
    [g.tableSize, g.format, settings.study.newPerDay],
  );
  const remaining = stats ? stats.dueNow + stats.newAvailable : 0;
  const total = stats ? stats.reviewedToday + remaining : 0;
  const progress = total > 0 ? (stats?.reviewedToday ?? 0) / total : 1;
  const shownRemaining = Math.round(useCountUp(remaining));
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const minutes = Math.max(1, Math.round((remaining * 6) / 60));

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader
        title="Today"
        kicker={date}
        trailing={
          <Link to="/settings" className="pill" style={{ textDecoration: 'none', marginBottom: 4 }}>
            {stakesLabel(g.stakes)} {g.venue}
          </Link>
        }
      />

      <section className="hero stack" style={{ gap: '1.25rem' }}>
        <HeroPattern />
        <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
          <div>
            <div className="caption" style={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Daily review
            </div>
            {stats && remaining === 0 ? (
              <div className="display" style={{ fontSize: '2.6rem', lineHeight: 1.05, marginTop: 6 }}>
                All caught up
              </div>
            ) : (
              <div className="row" style={{ gap: '0.5rem', alignItems: 'baseline', flexWrap: 'nowrap' }}>
                <span className="display num" style={{ fontSize: '4.25rem', lineHeight: 1 }}>
                  {stats ? shownRemaining : ''}
                </span>
                <span className="footnote">{remaining === 1 ? 'card' : 'cards'}, about {minutes} min</span>
              </div>
            )}
          </div>
          <ProgressRing value={stats ? progress : 0} size={64} stroke={7} color="#fff" track="rgba(255,255,255,.2)">
            {stats && remaining === 0 ? (
              <CheckIcon size={24} style={{ color: '#fff' }} />
            ) : (
              <span className="num" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                {Math.round(progress * 100)}%
              </span>
            )}
          </ProgressRing>
        </div>
        {remaining > 0 ? (
          <Link to="/review" className="btn btn-lg btn-block btn-hero">
            Start review
          </Link>
        ) : (
          <Link to="/drills" className="btn btn-lg btn-block btn-hero-ghost">
            Free practice
          </Link>
        )}
      </section>

      <section>
        <div className="row between" style={{ padding: '0 1rem 0.4rem' }}>
          <span className="section-title" style={{ padding: 0 }}>
            Last 7 days
          </span>
          {!!stats?.streak && (
            <span className="footnote row" style={{ gap: 4, color: 'var(--orange)', fontWeight: 600 }}>
              <FlameIcon size={14} /> {stats.streak} day streak
            </span>
          )}
        </div>
        <div className="card">
          <div className="week">
            {(stats?.week ?? []).map((d, i) => (
              <div key={i} className={`day${d.today ? ' today' : ''}`}>
                <span className={`dot${d.done ? ' done' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                  <CheckIcon size={15} />
                </span>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {stats && stats.reviewedToday > 0 && (
        <section className="reveal">
          <div className="section-title">Today so far</div>
          <div className="stat-grid three">
            <Stat label="Reviewed" value={stats.reviewedToday} />
            <Stat label="Accuracy" value={Math.round((stats.accuracyToday ?? 0) * 100)} suffix="%" />
            <Stat label="Recall" value={stats.avgSecondsToday ?? 0} suffix="s" decimals={1} />
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, suffix = '', decimals = 0 }: { label: string; value: number; suffix?: string; decimals?: number }) {
  const shown = useCountUp(value);
  return (
    <div>
      <div className="footnote">{label}</div>
      <div className="display num" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
        {shown.toFixed(decimals)}
        {suffix}
      </div>
    </div>
  );
}

import { SCENARIOS } from '@felt/content';
import { challengeNumber } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { navItem } from '../nav';
import { chartsForGame } from '../state/charts';
import { db } from '../state/db';
import { masteryForCharts } from '../state/review';
import { MasteryGrid } from '../components/MasteryGrid';
import { reviewTotal } from '../state/decks';
import { useSettings } from '../state/settings';
import { weeklyAvailable } from '../state/weekly';
import { HeroPattern } from '../ui/Brand';
import { ChevronRightIcon } from '../ui/icons';
import { ProBadge } from '../ui/ProBadge';
import { PageHeader } from '../ui/PageHeader';
import { useThisWeek } from './WeeklyPage';
import './you.css';

/**
 * Short ways to train, in three levels: the one thing to do next on the felt,
 * the range you are learning, then the challenges and drills as rows.
 */
export function TrainPage() {
  const { settings } = useSettings();
  const g = settings.game;
  const due = useLiveQuery(() => reviewTotal(chartsForGame(g).charts, settings.study), [g.tableSize, g.format, JSON.stringify(settings.study)]);
  const stats = useLiveQuery(async () => {
    const [daily, played] = await Promise.all([db.daily.get(challengeNumber(new Date())), db.scenarios.count()]);
    return { daily, played };
  }, []);
  const week = useThisWeek();
  const charts = chartsForGame(g).charts;
  const mastery = useLiveQuery(() => masteryForCharts(charts), [g.tableSize, g.format]);
  const touched = mastery?.filter((m) => m.solid + m.learning > 0) ?? [];
  // The chart you are working on, or the first one with something left to learn.
  const focus = touched.find((m) => m.solid < m.total) ?? mastery?.find((m) => m.solid < m.total) ?? mastery?.[0];
  const pro = weeklyAvailable(settings.access);
  const reviewing = !!due;
  const minutes = Math.max(1, Math.round(((due ?? 0) * 6) / 60));

  const daily = stats?.daily;
  const dailyDone = !!daily && daily.finished !== false;
  const dailyRight = daily?.scores.filter((s) => s >= 1).length ?? 0;
  const weekDone = !!week?.finished;
  const played = stats?.played ?? 0;

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Train" />

      <Link to={reviewing ? '/review?go=1' : '/practice'} className="hero train-hero">
        <HeroPattern />
        <div className="hero-label">{reviewing ? 'Review' : 'At your level'}</div>
        {reviewing ? (
          <>
            <div className="display num train-hero-number">{due}</div>
            <div className="hero-sub">
              {due === 1 ? 'card' : 'cards'} due, about {minutes} min
            </div>
          </>
        ) : (
          <>
            <div className="display train-hero-title">10 decisions</div>
            <div className="hero-sub">{due === undefined ? ' ' : 'Your review is clear. These come from your weaker areas.'}</div>
          </>
        )}
        <span className="btn btn-lg btn-block btn-hero">{reviewing ? 'Start review' : 'Start practice'}</span>
      </Link>

      {focus && (
        <section>
          <h2 className="section-title">Ranges</h2>
          <div className="card train-ranges">
            <Link to={`/ranges?chart=${focus.chart.spec.id}`} className="train-ranges-main">
              <MasteryGrid chart={focus.chart} hands={focus.hands} size={112} />
              <span className="train-ranges-copy">
                <span className="train-ranges-kicker">{touched.length ? 'Now learning' : 'Start with'}</span>
                <span className="train-ranges-title">{focus.chart.spec.title}</span>
                <span className="footnote num">
                  You know {focus.solid} of {focus.total} close calls
                </span>
                <span className="chart-bar">
                  <span className="touched" style={{ width: `${((focus.solid + focus.learning) / Math.max(1, focus.total)) * 100}%` }} />
                  <span className="solid" style={{ width: `${(focus.solid / Math.max(1, focus.total)) * 100}%` }} />
                </span>
              </span>
            </Link>
            <div className="train-ranges-actions">
              <Link to={`/ranges?chart=${focus.chart.spec.id}&mode=quick`} className="btn btn-tinted">
                Quiz
              </Link>
              <Link to={`/ranges?chart=${focus.chart.spec.id}&mode=paint`} className="btn btn-tinted">
                Paint
              </Link>
              <Link to="/ranges" className="btn btn-plain">
                All {mastery?.length} charts
              </Link>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">More training</h2>
        <div className="list with-icons">
          <DrillRow
            to="/daily"
            title="Daily challenge"
            subtitle={!stats ? ' ' : !daily ? '5 decisions, new today' : dailyDone ? `${dailyRight} of 5 right` : `${daily.scores.length} of 5 done`}
            detail={dailyDone ? 'Done' : undefined}
          />
          <DrillRow
            to="/weekly"
            title="Weekly challenge"
            subtitle={!pro ? '10 harder decisions' : weekDone ? 'Done this week' : week ? `${week.scores.length} of ${week.items.length} done` : '10 harder decisions'}
            detail={!pro ? <ProBadge /> : weekDone ? 'Done' : undefined}
          />
          <DrillRow to="/scenarios" title="Scenarios" subtitle={`${played} of ${SCENARIOS.length} hands played`} progress={played / SCENARIOS.length} />
          {reviewing ? (
            <DrillRow to="/practice" title="At your level" subtitle="10 decisions from your weaker areas" />
          ) : (
            <DrillRow to="/review" title="Review decks" subtitle="Pick decks or study ahead" />
          )}
        </div>
      </section>
    </div>
  );
}

function DrillRow({ to, title, subtitle, progress, detail }: { to: string; title: string; subtitle: string; progress?: number; detail?: ReactNode }) {
  const { icon: Icon, color } = navItem(to);
  return (
    <Link to={to} className="list-row">
      <span className="icon-tile" style={{ background: color }}>
        <Icon size={19} strokeWidth={2} />
      </span>
      <span className="grow">
        <span style={{ display: 'block' }}>{title}</span>
        <span className="footnote" style={{ display: 'block' }}>
          {subtitle}
        </span>
        {progress !== undefined && (
          <span className="chart-bar train-bar" aria-hidden="true">
            <span className="solid" style={{ width: `${Math.min(1, progress) * 100}%` }} />
          </span>
        )}
      </span>
      {detail && <span className="detail">{detail}</span>}
      <ChevronRightIcon size={16} className="chev" />
    </Link>
  );
}


import { SCENARIOS } from '@felt/content';
import { challengeNumber } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { navItem } from '../nav';
import { chartsForGame } from '../state/charts';
import { db } from '../state/db';
import { reviewTotal } from '../state/decks';
import { useSettings } from '../state/settings';
import { weeklyAvailable } from '../state/weekly';
import { HeroPattern } from '../ui/Brand';
import { ChevronRightIcon, LockIcon, MedalIcon, TrophyIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { ProgressRing } from '../ui/ProgressRing';
import { useThisWeek } from './WeeklyPage';
import './you.css';

/**
 * Short ways to train, in three levels: the one thing to do next on the felt,
 * the two challenges side by side, then the drills you pick yourself.
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

      <div className="train-pair">
        <Link to="/daily" className="card train-challenge">
          <ProgressRing value={dailyDone ? 1 : (daily?.scores.length ?? 0) / 5} size={48} stroke={5} label={dailyDone ? 'Done' : undefined}>
            <TrophyIcon size={20} />
          </ProgressRing>
          <span className="train-challenge-title">Daily challenge</span>
          <span className="footnote num">{!stats ? ' ' : !daily ? '5 decisions, new today' : dailyDone ? `${dailyRight} of 5 right` : `${daily.scores.length} of 5 done`}</span>
        </Link>
        <Link to="/weekly" className="card train-challenge">
          <ProgressRing value={!pro ? 0 : weekDone ? 1 : week ? week.scores.length / week.items.length : 0} size={48} stroke={5}>
            {pro ? <MedalIcon size={20} /> : <LockIcon size={18} />}
          </ProgressRing>
          <span className="train-challenge-title">Weekly challenge</span>
          <span className="footnote num">{!pro ? 'With Suited Pro' : weekDone ? 'Done this week' : week ? `${week.scores.length} of ${week.items.length} done` : '10 harder decisions'}</span>
        </Link>
      </div>

      <section>
        <h2 className="section-title">Drills</h2>
        <div className="list with-icons">
          <DrillRow to="/ranges" title="Ranges" subtitle="Learn and paint preflop charts" />
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

function DrillRow({ to, title, subtitle, progress }: { to: string; title: string; subtitle: string; progress?: number }) {
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
      <ChevronRightIcon size={16} className="chev" />
    </Link>
  );
}


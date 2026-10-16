import { SCENARIOS } from '@felt/content';
import { challengeNumber } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { navItem, type NavItem } from '../nav';
import { isPro } from '../state/access';
import { chartsForGame } from '../state/charts';
import { useCoachAvailable } from '../state/coach';
import { db } from '../state/db';
import { reviewTotal } from '../state/decks';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { plural } from '../ui/format';
import { NavRow } from '../ui/NavRow';
import { PageHeader } from '../ui/PageHeader';
import { WeeklyMoreRow } from './WeeklyPage';
import './you.css';

/**
 * Every way to train in one place. One button starts what matters most right
 * now, so the menu below is a choice and never a chore.
 */
export function TrainPage() {
  const { settings } = useSettings();
  const g = settings.game;
  const coach = useCoachAvailable();
  const pro = isPro(settings.access);
  const due = useLiveQuery(() => reviewTotal(chartsForGame(g).charts, settings.study), [g.tableSize, g.format, JSON.stringify(settings.study)]);
  const stats = useLiveQuery(async () => {
    const [daily, played, saved] = await Promise.all([db.daily.get(challengeNumber(new Date())), db.scenarios.count(), db.saved.count()]);
    return { daily, played, saved };
  }, []);

  const reviewing = !!due;
  const start = reviewing ? { to: '/review?go=1', label: `Review ${plural(due, 'card')}` } : { to: '/practice', label: 'Practice 10 decisions' };
  const daily = stats?.daily;
  const dailyDetail = !stats ? undefined : !daily ? 'New today' : daily.finished === false ? `${daily.scores.length} of 5` : 'Done';
  const row = (to: string, subtitle: string, detail?: ReactNode, title?: string) => {
    const i: NavItem = navItem(to);
    return <NavRow key={to} to={to} icon={i.icon} color={i.color} title={title ?? i.label} subtitle={subtitle} detail={detail} />;
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Train" />

      <section className="card train-next">
        <span className="train-next-label">Up next</span>
        <span className="train-next-title">{due === undefined ? ' ' : reviewing ? `${plural(due, 'card')} to review` : 'Your review is clear'}</span>
        <span className="footnote">{reviewing ? 'Cards come back just before you would forget them.' : 'Practice picks decisions at your level.'}</span>
      </section>

      <section>
        <h2 className="section-title">Every day</h2>
        <div className="list with-icons">
          {row('/review', 'Cards from charts, lessons and math', due ? <span className="num">{due}</span> : undefined)}
          {row('/practice', '10 decisions picked for your level', undefined, 'Practice at your level')}
          {row('/daily', 'Five decisions, same for everyone', dailyDetail)}
        </div>
        <WeeklyMoreRow />
      </section>

      <section>
        <h2 className="section-title">Drills</h2>
        <div className="list with-icons">
          {row('/ranges', 'Learn and paint preflop ranges')}
          {row('/scenarios', 'Hands graded by the solver', stats ? <span className="num">{`${stats.played} of ${SCENARIOS.length}`}</span> : undefined)}
        </div>
      </section>

      <section>
        <h2 className="section-title">Tools</h2>
        <div className="list with-icons">
          {coach !== false && row('/coach', 'Ask about any hand or answer', pro ? undefined : 'Pro')}
          {row('/solver', 'Solve a heads up spot')}
          {row('/lab', 'See what one change does')}
          {row('/exploit', 'How to beat common player types')}
          {row('/saved', 'Hands you kept for later', stats?.saved ? <span className="num">{stats.saved}</span> : undefined)}
        </div>
      </section>

      <BottomBar>
        <Link to={start.to} className="btn btn-primary btn-lg btn-block">
          {start.label}
        </Link>
      </BottomBar>
    </div>
  );
}

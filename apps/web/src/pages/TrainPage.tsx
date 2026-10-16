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
import { PageHeader } from '../ui/PageHeader';
import './you.css';

/** Every short way to train, as tiles. Each tile says only what is waiting there. */
export function TrainPage() {
  const { settings } = useSettings();
  const g = settings.game;
  const due = useLiveQuery(() => reviewTotal(chartsForGame(g).charts, settings.study), [g.tableSize, g.format, JSON.stringify(settings.study)]);
  const stats = useLiveQuery(async () => {
    const [daily, played] = await Promise.all([db.daily.get(challengeNumber(new Date())), db.scenarios.count()]);
    return { daily, played };
  }, []);
  const daily = stats?.daily;

  const tiles: { to: string; label: string; badge?: string }[] = [
    { to: '/review', label: 'Review', badge: due === undefined ? undefined : due ? `${due} due` : 'Clear' },
    { to: '/daily', label: 'Daily challenge', badge: !stats ? undefined : !daily ? 'New' : daily.finished === false ? `${daily.scores.length} of 5` : 'Done' },
    { to: '/ranges', label: 'Ranges' },
    { to: '/scenarios', label: 'Scenarios', badge: stats ? `${stats.played} of ${SCENARIOS.length}` : undefined },
    { to: '/practice', label: 'At your level' },
    { to: '/weekly', label: 'Weekly challenge', badge: weeklyAvailable(settings.access) ? undefined : 'Pro' },
  ];

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Train" />
      <div className="more-tiles">
        {tiles.map(({ to, label, badge }) => {
          const Icon = navItem(to).icon;
          return (
            <Link key={to} to={to} className="more-tile">
              <span className="more-tile-icon">
                <Icon size={22} strokeWidth={1.9} />
              </span>
              <span className="more-tile-label">{label}</span>
              {badge && <span className="more-tile-badge num">{badge}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

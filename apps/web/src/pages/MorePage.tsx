import { SCENARIOS } from '@felt/content';
import { challengeNumber, currentRating, isProvisional, nextTier, tierLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS, type NavItem, TABS } from '../nav';
import { db } from '../state/db';
import { ratingSnapshot } from '../state/rating';
import { useSettings } from '../state/settings';
import { Avatar } from '../ui/Avatar';
import { BrandFooter } from '../ui/Brand';
import { ChevronRightIcon } from '../ui/icons';
import { NavRow } from '../ui/NavRow';
import { PageHeader } from '../ui/PageHeader';
import { WeeklyMoreRow } from './WeeklyPage';

const inTabs = new Set(TABS.map((t) => t.to));
const item = (to: string) => NAV_ITEMS.find((i) => i.to === to)!;

/** Big tiles for the places you go to train; small rows for the rest. */
const TILES = ['/daily', '/scenarios', '/solver', '/lab', '/saved', '/exploit'].filter((to) => !inTabs.has(to));
const GAME_ROWS = ['/coach', '/glossary', '/log', '/import', '/league'];
const APP_ROWS = ['/account', '/settings'];

/** Phone only: everything that does not fit in the tab bar, as a launcher. */
export function MorePage() {
  const { settings } = useSettings();
  const stats = useLiveQuery(async () => {
    const [snap, daily, played, saved, sessions] = await Promise.all([
      ratingSnapshot(),
      db.daily.get(challengeNumber(new Date())),
      db.scenarios.count(),
      db.saved.count(),
      db.sessions.count(),
    ]);
    return { overall: currentRating(snap.overall), daily, played, saved, sessions };
  }, []);

  const rating = stats?.overall;
  const rated = !!rating && rating.games > 0;
  const progress = rated && !isProvisional(rating) ? nextTier(rating.rating)?.progress : undefined;
  const badge: Record<string, string | undefined> = {
    '/daily': stats ? (stats.daily && stats.daily.finished !== false ? 'Done today' : 'New today') : undefined,
    '/scenarios': stats ? `${stats.played} of ${SCENARIOS.length}` : undefined,
    '/saved': stats?.saved ? String(stats.saved) : undefined,
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="More" />

      <Link to="/you" className="card more-me">
        <Avatar name={settings.profile.name} photo={settings.profile.photo} size={54} progress={progress} />
        <span className="grow">
          <span className="more-me-name">{settings.profile.name || 'You'}</span>
          <span className="more-me-sub num">{rated ? `${Math.round(rating.rating)} · ${tierLabel(rating)}` : 'Get your Felt Rating'}</span>
        </span>
        <ChevronRightIcon size={16} className="chev" />
      </Link>

      <section>
        <h2 className="section-title">Train and study</h2>
        <div className="more-tiles">
          {TILES.map((to) => (
            <Tile key={to} item={item(to)} badge={badge[to]} />
          ))}
        </div>
        <WeeklyMoreRow />
      </section>

      <section>
        <h2 className="section-title">Your game</h2>
        <div className="list with-icons">
          {GAME_ROWS.map((to) => {
            const i = item(to);
            return <NavRow key={to} to={to} icon={i.icon} color={i.color} title={i.label} subtitle={to === '/coach' ? 'Ask about your game' : to === '/glossary' ? 'Every poker term in plain words' : undefined} detail={to === '/log' && stats?.sessions ? String(stats.sessions) : undefined} />;
          })}
        </div>
      </section>

      <div className="list with-icons">
        {APP_ROWS.map((to) => {
          const i = item(to);
          return <NavRow key={to} to={to} icon={i.icon} color="var(--gray)" title={i.label} />;
        })}
      </div>

      <BrandFooter />
    </div>
  );
}

function Tile({ item: { to, label, icon: Icon }, badge }: { item: NavItem; badge?: ReactNode }) {
  return (
    <Link to={to} className="more-tile">
      <span className="more-tile-icon">
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <span className="more-tile-label">{label}</span>
      {badge && <span className="more-tile-badge num">{badge}</span>}
    </Link>
  );
}

import { SCENARIOS } from '@felt/content';
import { challengeNumber, currentRating, isProvisional, nextTier, tierLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS, type NavItem, TABS } from '../nav';
import { isPro } from '../state/access';
import { useServerFeatures, useSession } from '../state/api';
import { useClaudeCloud } from '../state/cloud';
import { useCoachAvailable } from '../state/coach';
import { db } from '../state/db';
import { ratingSnapshot, streakNow } from '../state/rating';
import { useSettings } from '../state/settings';
import { Avatar } from '../ui/Avatar';
import { BrandFooter } from '../ui/Brand';
import { ChevronRightIcon, MedalIcon } from '../ui/icons';
import { NavRow } from '../ui/NavRow';
import { PageHeader } from '../ui/PageHeader';
import { WeeklyMoreRow } from './WeeklyPage';
import './you.css';

const inTabs = new Set(TABS.map((t) => t.to));
const item = (to: string) => NAV_ITEMS.find((i) => i.to === to)!;

/** Big tiles for the places you go to train; small rows for the rest. */
const TILES = ['/daily', '/scenarios', '/solver', '/lab', '/saved', '/exploit'].filter((to) => !inTabs.has(to));
const GAME_ROWS = ['/log', '/import', '/league'];

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Phone only: everything that does not fit in the tab bar, as a launcher. */
export function MorePage() {
  const { settings } = useSettings();
  const session = useSession();
  const { cloud } = useClaudeCloud();
  const features = useServerFeatures();
  const coach = useCoachAvailable();
  const pro = isPro(settings.access);
  const stats = useLiveQuery(async () => {
    const [snap, daily, played, saved, sessions, streak] = await Promise.all([
      ratingSnapshot(),
      db.daily.get(challengeNumber(new Date())),
      db.scenarios.count(),
      db.saved.count(),
      db.sessions.count(),
      streakNow(),
    ]);
    return { overall: currentRating(snap.overall), daily, played, saved, sessions, streak: streak.streak };
  }, []);

  const rating = stats?.overall;
  const rated = !!rating && rating.games > 0;
  const progress = rated && !isProvisional(rating) ? nextTier(rating.rating)?.progress : undefined;
  const badge: Record<string, string | undefined> = {
    '/daily': stats ? (stats.daily && stats.daily.finished !== false ? 'Done today' : 'New today') : undefined,
    '/scenarios': stats ? `${stats.played} of ${SCENARIOS.length}` : undefined,
    '/saved': stats?.saved ? String(stats.saved) : undefined,
  };
  // Where your progress lives, in a few words: the reason to open Account.
  const accountLine = session
    ? (session.user.email ?? 'Signed in with a passkey')
    : cloud
      ? 'Signed in with Claude'
      : features?.accounts
        ? 'Save your progress to an account'
        : 'Progress stays on this device';
  const access = settings.access;
  const proLine = !pro
    ? undefined
    : access.trialEndsAt && new Date(access.trialEndsAt) > new Date()
      ? `Trial ends ${shortDate(access.trialEndsAt)}`
      : access.until
        ? `Renews ${shortDate(access.until)}`
        : 'Active';
  const streakText = stats?.streak && stats.streak > 1 ? ` · ${stats.streak} day streak` : '';

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="More" />

      <Link to="/you" className="card more-me">
        <Avatar name={settings.profile.name} photo={settings.profile.photo} size={54} progress={progress} />
        <span className="grow">
          <span className="more-me-name">{settings.profile.name || 'You'}</span>
          <span className="more-me-sub num">{rated ? `${Math.round(rating.rating)} · ${tierLabel(rating)}${streakText}` : 'Get your Suited Rating'}</span>
        </span>
        <ChevronRightIcon size={16} className="chev" />
      </Link>

      {!pro && (
        <Link to="/pro?from=more" className="card more-pro">
          <span className="grow">
            <span className="more-pro-title">Suited Pro</span>
            <span className="more-pro-sub">Every lesson, the weekly Pro challenge and the solver</span>
          </span>
          <span className="more-pro-cta">See plans</span>
        </Link>
      )}

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
        <h2 className="section-title">{coach !== false ? 'Ask and look up' : 'Look up'}</h2>
        <div className="list with-icons">
          {coach !== false && <NavRow to="/coach" icon={item('/coach').icon} color={item('/coach').color} title="Coach" subtitle="Ask about any hand in your game" detail={pro ? undefined : 'Pro'} />}
          <NavRow to="/glossary" icon={item('/glossary').icon} color={item('/glossary').color} title="Glossary" subtitle="Every poker term in plain words" />
        </div>
      </section>

      <section>
        <h2 className="section-title">Your game</h2>
        <div className="list with-icons">
          {GAME_ROWS.map((to) => {
            const i = item(to);
            return <NavRow key={to} to={to} icon={i.icon} color={i.color} title={i.label} detail={to === '/log' && stats?.sessions ? String(stats.sessions) : undefined} />;
          })}
        </div>
      </section>

      <div className="list with-icons">
        <NavRow to="/account" icon={item('/account').icon} color="var(--gray)" title="Account" subtitle={accountLine} />
        {pro && <NavRow to={session ? '/account' : '/settings'} icon={MedalIcon} color="var(--gray)" title="Suited Pro" detail={proLine} />}
        <NavRow to="/settings" icon={item('/settings').icon} color="var(--gray)" title="Settings" />
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

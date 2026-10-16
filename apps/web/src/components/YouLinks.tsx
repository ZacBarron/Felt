import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { navItem } from '../nav';
import { isPro } from '../state/access';
import { useServerFeatures, useSession } from '../state/api';
import { useClaudeCloud } from '../state/cloud';
import { db } from '../state/db';
import { useSettings } from '../state/settings';
import { MedalIcon } from '../ui/icons';
import { NavRow } from '../ui/NavRow';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** The plan card for free players. One line on what Pro adds, one way in. */
export function ProCard() {
  const { settings } = useSettings();
  if (isPro(settings.access)) return null;
  return (
    <Link to="/pro?from=you" className="card more-pro">
      <span className="grow">
        <span className="more-pro-title">Suited Pro</span>
        <span className="more-pro-sub">Every lesson, the weekly Pro challenge and the solver</span>
      </span>
      <span className="more-pro-cta">See plans</span>
    </Link>
  );
}

/** Your own hands and how you compare: the log, imports, saved hands and the league. */
export function GameRows() {
  const counts = useLiveQuery(async () => ({ sessions: await db.sessions.count(), saved: await db.saved.count() }), []);
  const row = (to: string, subtitle: string, detail?: string) => {
    const i = navItem(to);
    return <NavRow key={to} to={to} icon={i.icon} color={i.color} title={i.label} subtitle={subtitle} detail={detail} />;
  };
  return (
    <section>
      <h2 className="section-title">Your game</h2>
      <div className="list with-icons">
        {row('/log', 'Sessions you played', counts?.sessions ? String(counts.sessions) : undefined)}
        {row('/import', 'Hand histories from your poker site')}
        {row('/saved', 'Hands you kept for later', counts?.saved ? String(counts.saved) : undefined)}
        {row('/league', 'Real players near your rating')}
      </div>
    </section>
  );
}

/** Account, plan and settings, last on the You tab. */
export function AccountRows() {
  const { settings } = useSettings();
  const session = useSession();
  const { cloud } = useClaudeCloud();
  const features = useServerFeatures();
  const pro = isPro(settings.access);
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
  return (
    <div className="list with-icons">
      <NavRow to="/account" icon={navItem('/you').icon} color="var(--gray)" title="Account" subtitle={accountLine} />
      {pro && <NavRow to={session ? '/account' : '/settings'} icon={MedalIcon} color="var(--gray)" title="Suited Pro" detail={proLine} />}
      <NavRow to="/settings" icon={navItem('/settings').icon} color="var(--gray)" title="Settings" />
    </div>
  );
}

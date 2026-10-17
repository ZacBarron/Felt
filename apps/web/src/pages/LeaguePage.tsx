import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, serverFeatures, useSession } from '../state/api';
import { signed } from '../ui/format';
import { LeagueIcon, TrophyIcon } from '../ui/icons';
import { BottomBar } from '../ui/BottomBar';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, Section } from '../ui/Section';
import './screens.css';

interface Standing {
  rank: number;
  handle: string;
  gained: number;
  decisions: number;
  you: boolean;
}

interface League {
  week: string;
  endsAt: string;
  joined: boolean;
  standings: Standing[];
}

function daysLeft(iso: string) {
  const days = Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);
  return days <= 1 ? 'Ends today' : `${days} days left`;
}

/**
 * This week's league: up to 30 real players near your rating, ranked by
 * rating points gained this week. Gains come from graded answers, so the
 * table rewards getting better, not time spent.
 */
export function LeaguePage() {
  const session = useSession();
  const [league, setLeague] = useState<League>();
  const [error, setError] = useState<string>();
  const [server, setServer] = useState<boolean>();

  useEffect(() => {
    void serverFeatures().then((f) => setServer(!!f?.accounts));
  }, []);

  useEffect(() => {
    if (!session?.user.leagues) return;
    api<League>('/league')
      .then(setLeague)
      .catch((e) => setError(e instanceof Error ? e.message : 'We could not load the league. Try again soon.'));
  }, [session?.user.leagues]);

  const you = league?.standings.find((s) => s.you);
  const chase = you && league ? chaseLine(you, league.standings) : undefined;

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="League" subtitle={league ? daysLeft(league.endsAt) : undefined} back={{ to: '/you', label: 'You' }} />
      {server === false ? (
        <EmptyState
          art={
            <span className="sc-art-tile cobalt">
              <LeagueIcon size={34} />
            </span>
          }
          title="Leagues are coming"
          body="Until then practice still moves your Aced Rating."
          action={
            <Link to="/practice" className="btn btn-primary" style={{ marginTop: '0.4rem' }}>
              Start practice
            </Link>
          }
        />
      ) : !session || !session.user.leagues ? (
        <EmptyState
          art={
            <span className="sc-art-tile cobalt">
              <TrophyIcon size={34} />
            </span>
          }
          title="Weekly leagues"
          body="Each week you play up to 29 real players near your Aced Rating."
          action={
            <Link to={session ? '/account' : '/account?next=/league'} className="btn btn-primary" style={{ marginTop: '0.4rem' }}>
              {session ? 'Join from your account' : 'Sign in to join'}
            </Link>
          }
        />
      ) : error ? (
        <div className="explain bad" role="alert">
          {error}
        </div>
      ) : !league ? null : !league.joined ? (
        <EmptyState
          art={
            <span className="sc-art-tile cobalt">
              <TrophyIcon size={34} />
            </span>
          }
          title="Answer to join"
          body="Your next graded answer puts you in this week's league."
          action={
            <Link to="/practice" className="btn btn-primary" style={{ marginTop: '0.4rem' }}>
              Start practice
            </Link>
          }
        />
      ) : (
        <Section
          title="This week"
          info={<p>Whoever gains the most Aced Rating this week ranks highest. A new league starts every Monday. Other players only see your display name.</p>}
          footer={
            league.standings.length === 1
              ? 'You are the first in this league this week. Others near your rating join as they play.'
              : 'Points are Aced Rating gained since you joined this week. Your rating climbs when you beat what it expects.'
          }
        >
          {you && (
            <div className="sc-stats" style={{ '--cols': 2, marginBottom: '0.6rem' } as React.CSSProperties}>
              <div className="sc-stat">
                <span className="sc-stat-value num">
                  {you.rank} of {league.standings.length}
                </span>
                <span className="sc-stat-label">Your place</span>
              </div>
              <div className="sc-stat">
                <span className={`sc-stat-value num ${you.gained > 0 ? 'green-text' : you.gained < 0 ? 'red-text' : ''}`}>{signed(you.gained, 0)}</span>
                <span className="sc-stat-label">Your points</span>
              </div>
            </div>
          )}
          {chase && (
            <p role="status" style={{ margin: '0 0 0.6rem', padding: '0 0.25rem', fontWeight: 600 }}>
              {chase}
            </p>
          )}
          <ol className="list league-table">
            {league.standings.map((s) => (
              <li key={s.rank} className={`list-row${s.you ? ' league-you' : ''}`} aria-current={s.you ? 'true' : undefined}>
                <span className={`num league-rank${s.rank <= 3 ? ' sc-top' : ''}`}>{s.rank}</span>
                <span className="grow">
                  <span style={{ display: 'block', fontWeight: s.you ? 650 : 500 }}>
                    {s.handle}
                    {s.you && <span className="sr-only"> (you)</span>}
                  </span>
                  <span className="footnote num">{s.decisions} decisions</span>
                </span>
                <span className={`num ${s.gained > 0 ? 'green-text' : s.gained < 0 ? 'red-text' : ''}`} style={{ fontWeight: 650 }}>
                  {signed(s.gained, 0)}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}
      {league?.joined && (
        <BottomBar>
          <Link to="/practice" className="btn btn-primary btn-lg btn-block">
            Start practice
          </Link>
        </BottomBar>
      )}
    </div>
  );
}

/**
 * The one gap that matters this week: points to the player just above you,
 * or your lead over the player just below. Both are plain subtraction.
 */
function chaseLine(you: Standing, standings: Standing[]): string | undefined {
  const pts = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;
  if (you.rank > 1) {
    const above = standings[you.rank - 2];
    const gap = above.gained - you.gained;
    return gap <= 0 ? `You are level with ${above.handle}.` : `You are ${pts(gap)} behind ${above.handle}.`;
  }
  const below = standings[1];
  if (!below) return undefined;
  const lead = you.gained - below.gained;
  return lead <= 0 ? `You are level with ${below.handle} at the top.` : `You lead ${below.handle} by ${pts(lead)}.`;
}

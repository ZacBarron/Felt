import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, serverFeatures, useSession } from '../state/api';
import { signed } from '../ui/format';
import { LeagueIcon, TrophyIcon } from '../ui/icons';
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

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="League" subtitle={league ? daysLeft(league.endsAt) : undefined} back={{ to: '/you', label: 'You' }} />
      {server === false ? (
        <EmptyState
          art={
            <span className="sc-art-tile">
              <LeagueIcon size={34} />
            </span>
          }
          title="No leagues here yet"
          body="This version of Felt has no league server."
        />
      ) : !session || !session.user.leagues ? (
        <EmptyState
          art={
            <span className="sc-art-tile">
              <TrophyIcon size={34} />
            </span>
          }
          title="Weekly leagues"
          body="Each week you play up to 29 real players near your Felt Rating."
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
            <span className="sc-art-tile">
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
          info={<p>Whoever gains the most Felt Rating this week ranks highest. A new league starts every Monday. Other players only see your display name.</p>}
          footer={
            league.standings.length === 1
              ? 'You are the first in this league this week. Others near your rating join as they play.'
              : 'Points are Felt Rating gained since you joined this week.'
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
    </div>
  );
}

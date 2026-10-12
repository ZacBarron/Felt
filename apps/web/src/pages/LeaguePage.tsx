import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, serverFeatures, useSession } from '../state/api';
import { signed } from '../ui/format';
import { PageHeader } from '../ui/PageHeader';

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

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="League" subtitle={league ? daysLeft(league.endsAt) : undefined} back={{ to: '/you', label: 'You' }} />
      {server === false ? (
        <p className="muted">Leagues are not available in this version of Felt.</p>
      ) : !session || !session.user.leagues ? (
        <div className="card stack" style={{ gap: '0.6rem' }}>
          <strong>Weekly leagues</strong>
          <p className="footnote" style={{ margin: 0 }}>
            Each week, you join up to 29 real players near your Felt Rating. Whoever gains the most rating points ranks highest. Getting hard decisions
            right is the way up. Other players only see your display name.
          </p>
          <Link to={session ? '/account' : '/account?next=/league'} className="btn btn-tinted btn-block">
            {session ? 'Join from your account' : 'Sign in to join'}
          </Link>
        </div>
      ) : error ? (
        <div className="explain bad" role="alert">
          {error}
        </div>
      ) : !league ? null : !league.joined ? (
        <p className="muted">You join this week's league with your next graded answer. Answer a few decisions in Practice or Review, then come back.</p>
      ) : (
        <>
          <ol className="list league-table">
            {league.standings.map((s) => (
              <li key={s.rank} className={`list-row${s.you ? ' league-you' : ''}`} aria-current={s.you ? 'true' : undefined}>
                <span className="num league-rank">{s.rank}</span>
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
          <div className="section-footer">
            {league.standings.length === 1
              ? 'You are the first in this league this week. Others near your rating join as they play.'
              : 'Points are Felt Rating gained since you joined this week. A new league starts every Monday.'}
          </div>
        </>
      )}
    </div>
  );
}

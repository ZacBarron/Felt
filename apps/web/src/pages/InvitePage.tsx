import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useServerFeatures, useSession } from '../state/api';
import { MAX_REFERRAL_MONTHS, QUALIFY_ANSWERS, type ReferralStatus, shareUrl, useReferrals } from '../state/referral';
import { HeroPattern } from '../ui/Brand';
import { CheckIcon, ShareIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import './you.css';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** The words that go with an invite link when it is shared. */
export const INVITE_TEXT = 'I am learning poker with Suited. Join with my link and your first month of Suited Pro is free.';

/**
 * Invite friends: a month of Pro for them when they make an account, and a
 * month for you once they have studied. Built like the best two sided
 * programs: the reward up top, one share button, the link to copy, and a
 * tracker of friends and months.
 */
export function InvitePage() {
  const session = useSession();
  const features = useServerFeatures();
  const { status, error } = useReferrals();
  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Invite friends" back={{ to: '/you', label: 'You' }} />

      <section className="hero learn-hero invite-hero">
        <HeroPattern />
        <div className="hero-label">Give a month, get a month</div>
        <div className="display learn-hero-title">A month of Pro for you both</div>
        <div className="hero-sub">Your friend gets a month when they make an account. You get a month once they have answered {QUALIFY_ANSWERS} questions.</div>
        {session && status ? <ShareButtons status={status} /> : null}
      </section>

      {!session ? (
        <div className="card invite-signin">
          <span>{features?.accounts === false ? 'Invites need an account, and accounts are not on here yet.' : 'Make an account to get your invite link.'}</span>
          {features?.accounts !== false && (
            <Link to="/account?next=/invite" className="btn btn-primary">
              Make an account
            </Link>
          )}
        </div>
      ) : error ? (
        <p className="footnote">Suited could not load your invites. {error}</p>
      ) : status ? (
        <Progress status={status} />
      ) : (
        <p className="footnote">Loading your invites</p>
      )}

      <Section title="How it works">
        <ol className="list invite-steps">
          <li className="list-row">
            <span className="invite-step-n">1</span>
            <span className="grow">Share your link with a friend who plays.</span>
          </li>
          <li className="list-row">
            <span className="invite-step-n">2</span>
            <span className="grow">They make an account and get a month of Pro.</span>
          </li>
          <li className="list-row">
            <span className="invite-step-n">3</span>
            <span className="grow">
              After {QUALIFY_ANSWERS} graded answers you get a month too. Up to {MAX_REFERRAL_MONTHS} a year.
            </span>
          </li>
        </ol>
      </Section>
    </div>
  );
}

function ShareButtons({ status }: { status: ReferralStatus }) {
  const [copied, setCopied] = useState(false);
  const url = shareUrl();
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused: the link is on screen to copy by hand.
    }
  };
  return (
    <div className="invite-share">
      {canShare && (
        <button className="btn btn-lg btn-block btn-hero" data-haptic="off" onClick={() => void navigator.share({ title: 'Suited', text: INVITE_TEXT, url }).catch(() => undefined)}>
          <ShareIcon size={20} />
          Share your link
        </button>
      )}
      <div className="invite-link">
        <span className="invite-link-text num" aria-label="Your invite link">
          {url.replace(/^https?:\/\//, '')}
        </span>
        <button className={`btn ${canShare ? 'btn-hero-ghost' : 'btn-hero'} invite-copy`} onClick={() => void copy()}>
          {copied ? <CheckIcon size={18} /> : null}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <span className="invite-code num">Code {status.code}</span>
    </div>
  );
}

function Progress({ status }: { status: ReferralStatus }) {
  const joined = status.friends.length;
  const studying = status.friends.filter((f) => f.qualified).length;
  return (
    <>
      <Section title="Your invites">
        <div className="you-stats invite-stats">
          <div className="you-stat">
            <span className="you-stat-value num">{joined}</span>
            <span className="you-stat-label">Friends joined</span>
          </div>
          <div className="you-stat">
            <span className="you-stat-value num">{status.months}</span>
            <span className="you-stat-label">Months earned</span>
            <span className="you-stat-sub">{status.monthsLeft} left this year</span>
          </div>
        </div>
        {status.bonusUntil && <p className="footnote invite-until">Your free Pro runs until {day(status.bonusUntil)}.</p>}
      </Section>
      {joined > 0 && (
        <Section title="Friends" footer={studying < joined ? `A friend counts after ${QUALIFY_ANSWERS} graded answers.` : undefined}>
          <div className="list">
            {status.friends.map((f, i) => (
              <div key={f.joinedAt + i} className="list-row">
                <span className="grow">
                  <span style={{ display: 'block' }}>Friend {joined - i}</span>
                  <span className="footnote">Joined {day(f.joinedAt)}</span>
                </span>
                <span className={`pill${f.qualified ? ' pill-good' : ''}`}>{f.qualified ? 'Month earned' : 'Studying'}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

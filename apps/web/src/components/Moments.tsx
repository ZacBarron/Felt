import { currentRating, isProvisional, nextTier, TIERS, tierFor } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { haptic } from '../haptics';
import { track } from '../state/events';
import { ratingSnapshot, streakNow } from '../state/rating';
import { BrandMark } from '../ui/Brand';
import { useCountUp } from '../ui/useCountUp';

const KEY = 'felt.moments';
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
/** Moments wait for a calm screen, never interrupting a question. */
const CALM = ['/', '/you', '/more', '/learn'];

interface Seen {
  tier: number;
  streak: number;
}

type Moment = { kind: 'tier'; tier: string; rating: number; next?: { name: string; min: number } } | { kind: 'streak'; days: number };

function readSeen(): Seen | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Seen) : undefined;
  } catch {
    return undefined;
  }
}

function writeSeen(s: Seen) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* Storage blocked: the moment may show again, which is harmless. */
  }
}

/**
 * Marks real progress with a short full screen moment: reaching a new tier
 * or a streak milestone. Each one shows once, and only on a calm screen.
 * They reward demonstrated skill and showing up, never time spent.
 */
export function Moments() {
  const location = useLocation();
  const state = useLiveQuery(async () => {
    const overall = currentRating((await ratingSnapshot()).overall);
    const streak = await streakNow();
    return { overall, streak: streak.streak };
  }, []);
  const [moment, setMoment] = useState<Moment>();

  useEffect(() => {
    if (!state || moment) return;
    const settled = state.overall.games > 0 && !isProvisional(state.overall);
    const tierIndex = settled ? TIERS.findIndex((t) => t.name === tierFor(state.overall.rating)) : -1;
    const milestone = [...STREAK_MILESTONES].reverse().find((m) => state.streak >= m) ?? 0;
    const seen = readSeen();
    // First visit with this feature: remember where you are without a fanfare.
    if (!seen) return writeSeen({ tier: tierIndex, streak: milestone });
    if (!CALM.includes('/' + location.pathname.split('/')[1])) return;
    if (tierIndex > seen.tier) {
      writeSeen({ ...seen, tier: tierIndex });
      const next = nextTier(state.overall.rating);
      setMoment({ kind: 'tier', tier: TIERS[tierIndex].name, rating: Math.round(state.overall.rating), next: next && { name: next.name, min: next.min } });
      track('moment_shown', { kind: 'tier', tier: TIERS[tierIndex].name });
    } else if (milestone > seen.streak) {
      writeSeen({ ...seen, streak: milestone });
      setMoment({ kind: 'streak', days: milestone });
      track('moment_shown', { kind: 'streak', days: milestone });
    } else if (tierIndex < seen.tier || milestone < seen.streak) {
      // Dropping back is not news; just lower the bar so the next climb counts.
      writeSeen({ tier: Math.min(seen.tier, tierIndex), streak: Math.min(seen.streak, milestone) });
    }
  }, [state, location.pathname, moment]);

  if (!moment) return null;
  return <MomentView moment={moment} onClose={() => setMoment(undefined)} />;
}

function MomentView({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const shown = Math.round(useCountUp(moment.kind === 'tier' ? moment.rating : moment.days, 1200));

  useEffect(() => {
    haptic('success');
    const t = setTimeout(() => button.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const title = moment.kind === 'tier' ? moment.tier : `${moment.days} day streak`;
  return (
    <div className="moment" role="dialog" aria-modal="true" aria-labelledby="moment-title">
      <div className="moment-rays" aria-hidden="true" />
      <div className="moment-body">
        <BrandMark size={92} animate />
        <div className="moment-kicker">{moment.kind === 'tier' ? 'New tier' : 'Streak'}</div>
        <h1 id="moment-title" className="display moment-title">
          {moment.kind === 'streak' ? (
            <>
              <span className="num">{shown}</span> day streak
            </>
          ) : (
            title
          )}
        </h1>
        {moment.kind === 'tier' && (
          <div className="moment-number num" aria-hidden="true">
            {shown}
            <span> Felt Rating</span>
          </div>
        )}
        <p className="moment-sub">
          {moment.kind === 'tier'
            ? moment.next
              ? `Your answers put you here. ${moment.next.name} starts at ${moment.next.min}.`
              : 'Your answers put you in the top tier.'
            : `You studied ${moment.days} days in a row. Small sessions add up.`}
        </p>
      </div>
      <button ref={button} className="btn btn-lg btn-block btn-hero moment-cta" data-haptic="off" onClick={onClose}>
        Continue
      </button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { defaultAssumptions, formatAmount, skillEdge, stakesLabel } from '@felt/core';
import { annualSavings, canOpenLesson, formatPrice, isLessonFree, isPro, PLANS, type PlanOption, type ProPerkId, proPerks, purchase, restorePurchases, SUPPORT_EMAIL } from '../state/access';
import { pathPrefs } from '../state/goals';
import { ratingSnapshot } from '../state/rating';
import { refreshMe, serverFeatures } from '../state/api';
import { track } from '../state/events';
import { LESSON_ENTRIES } from '../state/lessons';
import { trialReminder } from '../state/reminders';
import { type Access, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { AccountIcon, BellIcon, ChevronRightIcon, CloseIcon, LearnIcon, ReviewIcon, SolverIcon, TrophyIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';
import { onRadioKeys } from '../ui/radioKeys';

const WRITTEN = LESSON_ENTRIES.filter((e) => e.content);
const PRO_LESSONS = WRITTEN.filter((e) => !isLessonFree(e.key)).length;

function perMonth(plan: PlanOption) {
  return plan.period === 'year' ? plan.price / 12 : plan.price;
}

function dateIn(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const HEADLINES: Record<string, string> = {
  onboarding: 'Train every spot you play',
  lesson: 'This lesson is in Felt Pro',
  check: 'Unlock the lessons you need',
  solver: 'Solve your own spots',
  coach: 'Get a coach in your pocket',
  weekly: 'Join the weekly Pro challenge',
};

/** The perk a paywall reason is about, shown first. */
const LEAD_PERK: Record<string, ProPerkId> = { lesson: 'lessons', check: 'lessons', solver: 'solver', coach: 'coach', weekly: 'weekly' };

const PERK_ICONS: Record<ProPerkId, typeof LearnIcon> = {
  lessons: LearnIcon,
  coach: ReviewIcon,
  weekly: TrophyIcon,
  solver: SolverIcon,
  support: AccountIcon,
};

/** Whether this build's server offers the AI coach. */
function useCoachLive() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    void serverFeatures().then((f) => setLive(!!(f as { coach?: boolean } | null)?.coach));
  }, []);
  return live;
}

/**
 * The Felt Pro paywall. Honest by design: the plans and price come first,
 * the charge date sits next to the button, declining is as easy as buying,
 * and the benefits list only what Pro adds.
 */
export function ProPage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get('from') ?? 'direct';
  const { settings, update } = useSettings();
  const [planId, setPlanId] = useState<PlanOption['id']>('annual');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [rating, setRating] = useState<number>();
  const coachLive = useCoachLive();
  useEffect(() => {
    void ratingSnapshot().then((r) => r.overall.games > 0 && setRating(r.overall.rating));
  }, []);
  const plan = PLANS.find((p) => p.id === planId)!;
  const close = () => {
    track('paywall_dismissed', { from });
    if (from === 'onboarding') navigate('/', { replace: true });
    else navigate(-1);
  };

  useEffect(() => {
    track('paywall_viewed', { from });
  }, [from]);

  // Back from Stripe Checkout: the webhook may land a moment after the redirect, so check a few times.
  const checkout = params.get('checkout');
  useEffect(() => {
    if (checkout === 'cancel') setMessage('Checkout cancelled. You were not charged.');
    if (checkout !== 'success') return;
    track('checkout_returned');
    let tries = 0;
    const check = async () => {
      const user = await refreshMe().catch(() => null);
      if (user?.access.pro || ++tries >= 5) {
        if (!user?.access.pro) setMessage('Payment received. Felt Pro will switch on within a minute. If it has not, reopen this page.');
        return;
      }
      setTimeout(() => void check(), 2000);
    };
    void check();
  }, [checkout]);

  if (isPro(settings.access)) {
    const trialEnds = settings.access.trialEndsAt;
    return (
      <div className="stack focus-column lesson-done">
        <div className="hero pro-hero reveal">
          <HeroPattern />
          <BrandMark size={52} />
          <h1 className="display pro-title">You have Felt Pro</h1>
          <p className="pro-sub">{trialEnds ? `Your free trial runs until ${new Date(trialEnds).toLocaleDateString()}.` : 'Every lesson and tool is unlocked.'}</p>
        </div>
        <div className="list">
          {[
            { to: '/coach', label: 'Ask your AI coach', Icon: ReviewIcon, show: coachLive },
            { to: '/weekly', label: 'Play the weekly Pro challenge', Icon: TrophyIcon, show: true },
            { to: '/solver', label: 'Solve your own spots', Icon: SolverIcon, show: true },
          ]
            .filter((r) => r.show)
            .map(({ to, label, Icon }) => (
              <Link key={to} to={to} className="list-row">
                <Icon size={20} style={{ color: 'var(--tint)' }} />
                <span className="grow">{label}</span>
                <ChevronRightIcon size={14} className="chev" />
              </Link>
            ))}
          {SUPPORT_EMAIL && (
            <a className="list-row" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Felt Pro support')}`}>
              <AccountIcon size={20} style={{ color: 'var(--tint)' }} />
              <span className="grow">
                Priority support
                <span className="footnote" style={{ display: 'block' }}>
                  {SUPPORT_EMAIL}
                </span>
              </span>
              <ChevronRightIcon size={14} className="chev" />
            </a>
          )}
        </div>
        {trialEnds && (
          <button className="btn btn-tinted btn-block" onClick={() => trialReminder(trialEnds)}>
            <BellIcon size={18} /> Add a reminder 2 days before the trial ends
          </button>
        )}
        <BottomBar>
          <Link to="/learn" className="btn btn-primary btn-lg btn-block">
            Keep learning
          </Link>
        </BottomBar>
      </div>
    );
  }

  const buy = async () => {
    track('paywall_cta_tapped', { from, plan: plan.id });
    setBusy(true);
    setMessage(undefined);
    const result = await purchase(plan, settings);
    track('purchase_result', { plan: plan.id, ok: String(result.ok) });
    // Leaving for Stripe Checkout: keep the button busy until the page goes.
    if (result.ok === 'redirect') return;
    setBusy(false);
    if (!result.ok) {
      haptic('warning');
      if (result.needsAccount) {
        navigate(`/account?next=${encodeURIComponent(`/pro?from=${from}`)}`);
        return;
      }
      setMessage(result.reason);
      return;
    }
    haptic('success');
    update({ ...settings, access: result.access });
  };

  const restore = async () => {
    const result = await restorePurchases(settings);
    if (result.ok === true) update({ ...settings, access: result.access });
    else if (result.ok === false) {
      if (result.needsAccount) navigate(`/account?next=${encodeURIComponent('/pro')}`);
      else setMessage(result.reason);
    }
  };

  const g = settings.game;
  const assumptions = { ...defaultAssumptions(g), ...settings.assumptions };
  const base = rating ?? assumptions.poolRating;
  const per100 = skillEdge(base + 100, assumptions) - skillEdge(base, assumptions);
  const perHour = (per100 * assumptions.handsPerHour) / 100;
  const inPlan = planProLessons(settings.profile, settings.access);
  const charge = dateIn(plan.trialDays);
  const lead = LEAD_PERK[from];
  const allPerks = proPerks({ proLessons: PRO_LESSONS, coach: coachLive });
  const perks = [...allPerks.filter((p) => p.id === lead), ...allPerks.filter((p) => p.id !== lead)];

  return (
    <div className="pro-page focus-column">
      <div className="focus-top pro-top">
        <button className="icon-btn glass" aria-label="Close" onClick={close} data-haptic="off">
          <CloseIcon size={18} />
        </button>
        <button className="link-btn footnote" onClick={() => void restore()}>
          Restore purchases
        </button>
      </div>

      <header className="pro-head">
        <div className="pro-eyebrow">
          <BrandMark size={22} /> Felt Pro
        </div>
        <h1 className="display pro-head-title">{HEADLINES[from] ?? 'Train every spot you play'}</h1>
      </header>

      <ul className="pro-perks" aria-label="What Felt Pro adds">
        {perks.map((p) => {
          const Icon = PERK_ICONS[p.id];
          return (
            <li key={p.id} className={`pro-perk${p.id === lead ? ' lead' : ''}`}>
              <span className="pro-benefit-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <strong>{p.title}</strong>
              <span className="footnote">{p.id === 'lessons' && inPlan > 0 ? `${inPlan} of them are in your plan` : p.note}</span>
              {!p.live && <span className="pill pro-soon">Coming soon</span>}
            </li>
          );
        })}
      </ul>
      {per100 > 0.05 && (
        <p className="footnote pro-estimate">
          By our estimate, 100 more rating points is worth about{' '}
          {g.units === 'money' ? `${formatAmount(Math.round(perHour), g)} an hour` : `${per100.toFixed(1)} bb per 100 hands`} at {stakesLabel(g.stakes)} {g.venue}. It is a
          model, not a promise.
        </p>
      )}

      <div className="plan-tiles" role="radiogroup" onKeyDown={onRadioKeys} aria-label="Choose a plan">
        {PLANS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={p.id === planId}
            className={`plan-tile${p.id === planId ? ' selected' : ''}`}
            data-haptic="select"
            onClick={() => setPlanId(p.id)}
          >
            {p.id === 'annual' && <span className="plan-badge">Save {annualSavings()}%</span>}
            <span className="plan-label">{p.label}</span>
            <span className="plan-tile-price num">
              {formatPrice(perMonth(p))}
              <span className="footnote"> a month</span>
            </span>
            <span className="footnote">{p.period === 'year' ? `${formatPrice(p.price)} a year` : 'Billed monthly'}</span>
          </button>
        ))}
      </div>

      {message && (
        <div className="explain bad reveal" role="alert">
          {message}
        </div>
      )}

      <details className="pro-details">
        <summary>How the trial and billing work</summary>
        <div className="stack" style={{ gap: '0.5rem', paddingTop: '0.5rem' }}>
          {plan.trialDays > 0 && (
            <p>
              Today everything unlocks for free. On {dateIn(plan.trialDays - 2)}, you have 2 days left. On {charge}, you pay {formatPrice(plan.price)}.
              Cancel before then and you pay nothing.
            </p>
          )}
          <p>It renews until you cancel. You can cancel any time in Account or in the store you used.</p>
          <p>Always free: review, drills, the daily challenge, placement, saves, imports and the first topic of every track.</p>
          <p>
            <Link to="/terms" className="link-btn">
              Terms
            </Link>
            {' · '}
            <Link to="/privacy" className="link-btn">
              Privacy
            </Link>
          </p>
        </div>
      </details>

      <BottomBar>
        <div className="pro-cta-price footnote">
          {plan.trialDays > 0 ? `Free until ${charge}. Then ${formatPrice(plan.price)} a year.` : `${formatPrice(plan.price)} a month. Cancel any time.`}
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={buy} disabled={busy} data-haptic="off">
          {busy ? 'One moment' : plan.trialDays > 0 ? 'Start my free week' : 'Subscribe'}
        </button>
        <button className="btn btn-plain btn-block pro-later" onClick={close}>
          {from === 'onboarding' ? 'Continue with the free plan' : 'Not now'}
        </button>
      </BottomBar>
    </div>
  );
}

/** Pro lessons among the modules the player's goals and focus bring forward. */
function planProLessons(profile: Profile, access: Access): number {
  const modules = new Set(pathPrefs(profile).focus);
  return LESSON_ENTRIES.filter((e) => e.content && !canOpenLesson(e.key, access) && modules.has(e.key.split('/').slice(0, 2).join('/'))).length;
}

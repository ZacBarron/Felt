import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { defaultAssumptions, formatAmount, skillEdge, stakesLabel } from '@felt/core';
import { annualSavings, canOpenLesson, formatPrice, isLessonFree, isPro, PLANS, type PlanOption, purchase, restorePurchases } from '../state/access';
import { pathPrefs } from '../state/goals';
import { ratingSnapshot } from '../state/rating';
import { refreshMe } from '../state/api';
import { track } from '../state/events';
import { LESSON_ENTRIES } from '../state/lessons';
import { trialReminder } from '../state/reminders';
import { type Access, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { BellIcon, CloseIcon, LearnIcon, SolverIcon, StatsIcon } from '../ui/icons';
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
};

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

      <ul className="pro-values" aria-label="What Felt Pro adds">
        <li>
          <span className="pro-benefit-icon" aria-hidden="true">
            <LearnIcon size={20} />
          </span>
          <span className="grow">
            <strong>{PRO_LESSONS} more lessons</strong>
            <span className="footnote">{inPlan > 0 ? `${inPlan} of them are in your plan.` : 'River play, exploits and tournaments.'}</span>
          </span>
        </li>
        <li>
          <span className="pro-benefit-icon" aria-hidden="true">
            <SolverIcon size={20} />
          </span>
          <span className="grow">
            <strong>Solve your own spots</strong>
            <span className="footnote">Any board, range and stack size.</span>
          </span>
        </li>
        <li>
          <span className="pro-benefit-icon" aria-hidden="true">
            <StatsIcon size={20} />
          </span>
          <span className="grow">
            <strong>Turn skill into winnings</strong>
            <span className="footnote">
              {per100 > 0.05
                ? `By our estimate, 100 more rating points is worth about ${g.units === 'money' ? `${formatAmount(Math.round(perHour), g)} an hour` : `${per100.toFixed(1)} bb per 100 hands`} at ${stakesLabel(g.stakes)} ${g.venue}.`
                : 'Your Felt Rating shows every step you take.'}
            </span>
          </span>
        </li>
      </ul>

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

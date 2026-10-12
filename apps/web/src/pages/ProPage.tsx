import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { annualSavings, formatPrice, isLessonFree, isPro, PLANS, type PlanOption, purchase, restorePurchases } from '../state/access';
import { refreshMe } from '../state/api';
import { track } from '../state/events';
import { LESSON_ENTRIES } from '../state/lessons';
import { trialReminder } from '../state/reminders';
import { useSettings } from '../state/settings';
import { BrandMark, HeroPattern } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { BellIcon, CheckIcon, CloseIcon, LearnIcon, LockIcon, SolverIcon, StatsIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';
import { onRadioKeys } from '../ui/radioKeys';

const WRITTEN = LESSON_ENTRIES.filter((e) => e.content);
const PRO_LESSONS = WRITTEN.filter((e) => !isLessonFree(e.key)).length;

/** Only what Pro adds. Test outs, review, drills, the daily challenge and imports are free for everyone. */
const BENEFITS = [
  { icon: LearnIcon, title: `${PRO_LESSONS} more lessons`, note: `Every one of the ${WRITTEN.length}, from postflop and river play to exploits and tournaments` },
  { icon: SolverIcon, title: 'Solve your own spots', note: 'Any board, ranges, pot and stack in Felt Solver' },
  { icon: StatsIcon, title: 'Everything added later', note: 'New lessons and tools come with the subscription' },
];

function perMonth(plan: PlanOption) {
  return plan.period === 'year' ? plan.price / 12 : plan.price;
}

function dateIn(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const HEADLINES: Record<string, string> = {
  onboarding: 'Add every lesson to your plan',
  lesson: 'This lesson is part of Felt Pro',
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

  return (
    <div className="stack focus-column pro-page">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Close" onClick={close} data-haptic="off">
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="hero pro-hero reveal">
        <HeroPattern />
        <BrandMark size={44} />
        <div className="hero-label">Felt Pro</div>
        <h1 className="display pro-title">{HEADLINES[from] ?? 'Train every spot, every street'}</h1>
      </div>

      <div className="plan-options" role="radiogroup" onKeyDown={onRadioKeys} aria-label="Choose a plan">
        {PLANS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={p.id === planId}
            className={`plan-option${p.id === planId ? ' selected' : ''}`}
            data-haptic="select"
            onClick={() => setPlanId(p.id)}
          >
            {p.id === 'annual' && <span className="plan-badge">Save {annualSavings()}%</span>}
            <span className="plan-radio" aria-hidden="true">
              {p.id === planId && <CheckIcon size={14} />}
            </span>
            <span className="grow">
              <span className="plan-label">{p.label}</span>
              <span className="footnote">
                {p.trialDays > 0 ? `${p.trialDays} days free, then ` : ''}
                {formatPrice(p.price)} a {p.period}
              </span>
            </span>
            <span className="plan-price num">
              {formatPrice(perMonth(p))}
              <span className="footnote">/mo</span>
            </span>
          </button>
        ))}
      </div>

      <div className="list pro-benefits">
        {BENEFITS.map(({ icon: Icon, title, note }) => (
          <div key={title} className="list-row">
            <span className="pro-benefit-icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 600 }}>{title}</span>
              <span className="footnote">{note}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="footnote pro-free-note">
        Always free: the daily challenge, review and drills, placement and test outs, saves, imports, and the first topic of every track.
      </p>

      {plan.trialDays > 0 && (
        <section>
          <h2 className="section-title">How the trial works</h2>
          <div className="trial-timeline card">
            <div className="trial-step">
              <span className="trial-dot" aria-hidden="true">
                <LockIcon size={14} />
              </span>
              <div>
                <strong>Today</strong>
                <div className="footnote">Everything unlocks. No charge.</div>
              </div>
            </div>
            <div className="trial-step">
              <span className="trial-dot" aria-hidden="true">
                <BellIcon size={14} />
              </span>
              <div>
                <strong>{dateIn(plan.trialDays - 2)}</strong>
                <div className="footnote">Two days left. After you start, you can add a calendar reminder for this day.</div>
              </div>
            </div>
            <div className="trial-step">
              <span className="trial-dot" aria-hidden="true">
                <CheckIcon size={14} />
              </span>
              <div>
                <strong>{dateIn(plan.trialDays)}</strong>
                <div className="footnote">You are charged {formatPrice(plan.price)}. Cancel before then and you pay nothing.</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {message && (
        <div className="explain bad reveal" role="alert">
          {message}
        </div>
      )}

      <p className="footnote pro-fine">
        Renews automatically until you cancel. Cancel any time in the store you subscribed through.
        <br />
        <button className="link-btn" onClick={restore}>
          Restore purchases
        </button>
        {' · '}
        <Link to="/terms" className="link-btn">
          Terms
        </Link>
        {' · '}
        <Link to="/privacy" className="link-btn">
          Privacy
        </Link>
      </p>

      <BottomBar>
        <div className="pro-cta-price footnote">
          {plan.trialDays > 0
            ? `${plan.trialDays} days free, then ${formatPrice(plan.price)} a year (${formatPrice(perMonth(plan))}/mo). Charged ${dateIn(plan.trialDays)}.`
            : `${formatPrice(plan.price)} a month. Cancel any time.`}
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={buy} disabled={busy} data-haptic="off">
          {busy ? 'One moment' : plan.trialDays > 0 ? `Start ${plan.trialDays} day free trial` : `Subscribe for ${formatPrice(plan.price)} a month`}
        </button>
        <button className="btn btn-plain btn-block pro-later" onClick={close}>
          {from === 'onboarding' ? 'Continue with the free plan' : 'Not now'}
        </button>
      </BottomBar>
    </div>
  );
}

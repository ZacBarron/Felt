import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { RestoreSheet } from '../components/RestoreSheet';
import {
  annualSavings,
  canOpenLesson,
  formatPrice,
  isLessonFree,
  isPro,
  PLANS,
  type PlanOption,
  type ProPerkId,
  proPerks,
  purchase,
  purchasesOpen,
  SUPPORT_EMAIL,
  testingPro,
} from '../state/access';
import { pathPrefs } from '../state/goals';
import { refreshMe, useServerFeatures } from '../state/api';
import { useCoachAvailable } from '../state/coach';
import { track } from '../state/events';
import { LESSON_ENTRIES } from '../state/lessons';
import { trialReminder } from '../state/reminders';
import { type Access, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { AccountIcon, BellIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, CloseIcon, CoachIcon, LearnIcon, LockIcon, MedalIcon, SolverIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';
import { onRadioKeys } from '../ui/radioKeys';
import './pro.css';

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
  'first-lesson': 'Keep the momentum',
  lesson: 'This lesson is in Felt Pro',
  check: 'Unlock the lessons you need',
  solver: 'Solve your own spots',
  coach: 'Get a coach in your pocket',
  weekly: 'Join the weekly Pro challenge',
};

/** Arrivals at the end of a first run flow: declining goes on to Today. */
const FIRST_RUN_FROM = new Set(['onboarding', 'first-lesson']);

/** The perk a paywall reason is about, shown first. */
const LEAD_PERK: Record<string, ProPerkId> = { lesson: 'lessons', check: 'lessons', solver: 'solver', coach: 'coach', weekly: 'weekly' };

const PERK_ICONS: Record<ProPerkId, typeof LearnIcon> = {
  lessons: LearnIcon,
  coach: CoachIcon,
  weekly: MedalIcon,
  solver: SolverIcon,
  support: AccountIcon,
};

/** At most 4 perks: live ones first, the reason for the visit on top. */
function orderPerks(coach: boolean, lead: ProPerkId | undefined) {
  const all = proPerks({ proLessons: PRO_LESSONS, coach });
  const rank = (id: ProPerkId) => (id === lead ? 0 : 1);
  return [...all.filter((p) => p.live), ...all.filter((p) => !p.live)]
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(!a.p.live) - Number(!b.p.live) || rank(a.p.id) - rank(b.p.id) || a.i - b.i)
    .map(({ p }) => p)
    .slice(0, 4);
}

/**
 * The Felt Pro paywall. Honest by design: the price and the charge date sit
 * next to the button, declining is a button of the same size, and the perks
 * list only what Pro adds. Fine print waits behind a disclosure.
 */
export function ProPage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const from = params.get('from') ?? 'direct';
  const { settings, update } = useSettings();
  const features = useServerFeatures();
  const [planId, setPlanId] = useState<PlanOption['id']>('annual');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean }>();
  // Back from signing in to restore: the sheet opens again on its own.
  const [restoring, setRestoring] = useState(params.get('restore') === '1');
  const [billingOpen, setBillingOpen] = useState(false);
  const coachLive = !!useCoachAvailable();
  const plan = PLANS.find((p) => p.id === planId)!;
  const firstRun = FIRST_RUN_FROM.has(from);
  const close = () => {
    track('paywall_dismissed', { from });
    if (firstRun) navigate('/', { replace: true });
    else if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  };

  useEffect(() => {
    track('paywall_viewed', { from });
  }, [from]);

  useEffect(() => {
    if (params.get('restore') !== '1') return;
    const next = new URLSearchParams(params);
    next.delete('restore');
    setParams(next, { replace: true });
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from Stripe Checkout: the webhook may land a moment after the redirect, so check a few times.
  const checkout = params.get('checkout');
  useEffect(() => {
    if (checkout === 'cancel') setMessage({ text: 'Checkout cancelled. You were not charged.' });
    if (checkout !== 'success') return;
    track('checkout_returned');
    let tries = 0;
    const check = async () => {
      const user = await refreshMe().catch(() => null);
      if (user?.access.pro || ++tries >= 5) {
        if (!user?.access.pro) setMessage({ text: 'Payment received. Felt Pro switches on within a minute. If it has not, reopen this page.' });
        return;
      }
      setTimeout(() => void check(), 2000);
    };
    void check();
  }, [checkout]);

  const sheet = <RestoreSheet open={restoring} onClose={() => setRestoring(false)} returnTo={`/pro?from=${encodeURIComponent(from)}`} />;

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
        {testingPro(settings.access) && (
          <p className="footnote pw-testing">
            Unlocked for testing on this device. Turn it off in Settings.
          </p>
        )}
        <div className="list">
          {[
            { to: '/coach', label: 'Ask your AI coach', Icon: CoachIcon, show: coachLive },
            { to: '/weekly', label: 'Play the weekly Pro challenge', Icon: MedalIcon, show: true },
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
          <Link to={firstRun ? '/' : '/learn'} replace={firstRun} className="btn btn-primary btn-lg btn-block">
            Keep learning
          </Link>
        </BottomBar>
        {sheet}
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
        navigate(`/signin?next=${encodeURIComponent(`/pro?from=${from}`)}`);
        return;
      }
      setMessage({ text: result.reason, bad: true });
      return;
    }
    haptic('success');
    update({ ...settings, access: result.access });
  };

  const open = purchasesOpen(features, settings.access);
  const inPlan = planProLessons(settings.profile, settings.access);
  const charge = dateIn(plan.trialDays);
  const perks = orderPerks(coachLive, LEAD_PERK[from]);
  const decline = firstRun ? 'Continue with the free plan' : 'Not now';

  return (
    <div className="pw focus-column">
      <div className="pw-top">
        <button className="icon-btn btn glass" aria-label="Close" onClick={close} data-haptic="off">
          <CloseIcon size={18} />
        </button>
      </div>

      <header className="pw-head">
        <div className="pw-eyebrow">
          <BrandMark size={20} /> Felt Pro
        </div>
        <h1 className="display pw-title">{HEADLINES[from] ?? 'Train every spot you play'}</h1>
      </header>

      <ul className="pw-perks" aria-label="What Felt Pro adds">
        {perks.map((p) => {
          const Icon = PERK_ICONS[p.id];
          return (
            <li key={p.id} className="pw-perk">
              <span className="pw-perk-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="pw-perk-title">{p.title}</span>
              {p.id === 'lessons' && inPlan > 0 && <span className="pw-perk-note">{inPlan} in your plan</span>}
              {!p.live && <span className="pw-soon">Coming soon</span>}
            </li>
          );
        })}
      </ul>

      <div className="pw-plans" role="radiogroup" onKeyDown={onRadioKeys} aria-label="Choose a plan">
        {PLANS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={p.id === planId}
            className={`pw-plan${p.id === planId ? ' selected' : ''}`}
            data-haptic="select"
            onClick={() => setPlanId(p.id)}
          >
            {p.id === 'annual' && <span className="pw-badge">Save {annualSavings()}%</span>}
            <span className="pw-check" aria-hidden="true">
              {p.id === planId && <CheckIcon size={14} strokeWidth={2.6} />}
            </span>
            <span className="pw-plan-label">{p.label}</span>
            <span className="pw-plan-price num">{formatPrice(p.price)}</span>
            <span className="pw-plan-per">{p.period === 'year' ? `${formatPrice(perMonth(p))} a month` : 'Billed monthly'}</span>
          </button>
        ))}
      </div>

      <div className="pw-fine">
        <div className="pw-links">
          <button className="link-btn" onClick={() => setRestoring(true)} data-haptic="select">
            Restore purchases
          </button>
          <Link to="/terms" className="link-btn">
            Terms
          </Link>
          <Link to="/privacy" className="link-btn">
            Privacy
          </Link>
        </div>
        <div className="pw-links">
          <button
            className="link-btn pw-billing-toggle"
            aria-expanded={billingOpen}
            aria-controls="pw-billing"
            onClick={() => {
              setBillingOpen((o) => !o);
              // Bring the answer into view above the bar.
              requestAnimationFrame(() => document.getElementById('pw-billing')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
            }}
            data-haptic="select"
          >
            How billing works <ChevronDownIcon size={14} />
          </button>
        </div>
        {billingOpen && (
          <div id="pw-billing" className="pw-details-body">
            {plan.trialDays > 0 && (
              <p>
                Today everything unlocks for free. On {charge} you pay {formatPrice(plan.price)}. Cancel before then and you pay nothing.
              </p>
            )}
            <p>Felt Pro renews until you cancel. Cancel any time in Account.</p>
            <p>Review, drills and the daily challenge stay free. So do placement and the first topic of every track.</p>
          </div>
        )}
      </div>

      <BottomBar>
        {message ? (
          <p className={`pw-note${message.bad ? ' bad' : ''}`} role="status">
            {message.text}
          </p>
        ) : (
          <p className="pw-charge">
            {open === false ? (
              'Nothing is charged. Free features stay free.'
            ) : plan.trialDays > 0 ? (
              <>
                Free until <strong>{charge}</strong>. Then {formatPrice(plan.price)} a year.
              </>
            ) : (
              `${formatPrice(plan.price)} a month. Cancel any time.`
            )}
          </p>
        )}
        <div className="pw-bar-actions">
          {open === false ? (
            <div className="pw-closed" role="status">
              <LockIcon size={18} /> Purchases are not open yet
            </div>
          ) : (
            <button className="btn btn-primary btn-lg btn-block" onClick={buy} disabled={busy || open === undefined} data-haptic="off">
              {busy ? 'One moment' : plan.trialDays > 0 ? 'Start my free week' : 'Subscribe monthly'}
            </button>
          )}
          <button className="btn btn-lg btn-block" onClick={close} data-haptic="off">
            {decline}
          </button>
        </div>
      </BottomBar>
      {sheet}
    </div>
  );
}

/** Pro lessons among the modules the player's goals and focus bring forward. */
function planProLessons(profile: Profile, access: Access): number {
  const modules = new Set(pathPrefs(profile).focus);
  return LESSON_ENTRIES.filter((e) => e.content && !canOpenLesson(e.key, access) && modules.has(e.key.split('/').slice(0, 2).join('/'))).length;
}

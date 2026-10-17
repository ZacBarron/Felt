import { type CSSProperties, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { RestoreSheet } from '../components/RestoreSheet';
import {
  annualSavings,
  canOpenLesson,
  FOUNDING,
  foundingLeftLine,
  type FoundingStatus,
  foundingStatus,
  formatPrice,
  isLessonFree,
  isPro,
  PLANS,
  type PlanOption,
  type ProPerkId,
  proPerks,
  purchase,
  purchaseLifetime,
  purchasesOpen,
  SUPPORT_EMAIL,
  testingPro,
} from '../state/access';
import { pathPrefs } from '../state/goals';
import { currentSession, refreshMe, useServerFeatures, useSession } from '../state/api';
import { pushBlocker, setTrialReminder } from '../state/push';
import { useCoachAvailable } from '../state/coach';
import { track } from '../state/events';
import { LESSON_ENTRIES } from '../state/lessons';
import { trialReminder } from '../state/reminders';
import { type Access, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { LessonCover } from '../lesson/LessonCover';
import { AccountIcon, BellIcon, CheckIcon, ChevronRightIcon, CloseIcon, CoachIcon, LockIcon, MedalIcon, SolverIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';
import { onRadioKeys } from '../ui/radioKeys';
import { Toggle } from '../ui/Toggle';
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
  lesson: 'This lesson is in Aced Pro',
  check: 'Unlock the lessons you need',
  solver: 'Solve your own spots',
  coach: 'Get a coach in your pocket',
  weekly: 'Join the weekly Pro challenge',
};

/** Arrivals at the end of a first run flow: declining goes on to Today. */
const FIRST_RUN_FROM = new Set(['onboarding', 'first-lesson']);

/** The perk a paywall reason is about, shown first. */
const LEAD_PERK: Record<string, ProPerkId> = { lesson: 'lessons', check: 'lessons', solver: 'solver', coach: 'coach', weekly: 'weekly' };

interface CompareRow {
  id: string;
  title: string;
  free: boolean;
  live: boolean;
}

/**
 * Free and Pro side by side. The first row shows what stays free, so the
 * table is honest about both columns. Then up to 4 Pro perks: live ones
 * first, the reason for the visit on top.
 */
function compareRows(coach: boolean, lead: ProPerkId | undefined): CompareRow[] {
  const all = proPerks({ proLessons: PRO_LESSONS, coach }).filter((p) => p.id !== 'support');
  const rank = (id: ProPerkId) => (id === lead ? 0 : 1);
  const perks = all
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(!a.p.live) - Number(!b.p.live) || rank(a.p.id) - rank(b.p.id) || a.i - b.i)
    .map(({ p }) => p)
    .slice(0, 4);
  return [
    { id: 'free', title: 'Basics, review and drills', free: true, live: true },
    ...perks.map((p) => ({ id: p.id, title: p.title, free: false, live: p.live })),
  ];
}

/**
 * Three Pro lessons for the hero, drawn with their real covers: from the
 * player's plan first, one per topic, then the first Pro lessons in order.
 */
function heroLessons(profile: Profile, access: Access) {
  const modules = new Set(pathPrefs(profile).focus);
  const locked = WRITTEN.filter((e) => !canOpenLesson(e.key, access));
  const topic = (key: string) => key.split('/').slice(0, 2).join('/');
  const picked: typeof locked = [];
  const seen = new Set<string>();
  for (const e of [...locked.filter((e) => modules.has(topic(e.key))), ...locked]) {
    if (picked.length === 3) break;
    if (seen.has(topic(e.key))) continue;
    seen.add(topic(e.key));
    picked.push(e);
  }
  return picked;
}

/**
 * The Aced Pro paywall. Honest by design: the price and the charge date sit
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
  // From the site's founding offer the founding plan starts selected.
  const [planId, setPlanId] = useState<PlanOption['id'] | 'founding'>(params.get('plan') === 'founding' ? 'founding' : 'annual');
  const [founding, setFounding] = useState<FoundingStatus | null>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean }>();
  // Back from signing in to restore: the sheet opens again on its own.
  const [restoring, setRestoring] = useState(params.get('restore') === '1');
  // Blinkist's timeline, with Vocabulary's switch: a reminder before the charge, on unless turned off.
  const [remind, setRemind] = useState(true);
  const session = useSession();
  const coachLive = !!useCoachAvailable();
  const founder = planId === 'founding' && !!founding?.open;
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
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
    let live = true;
    void foundingStatus().then((s) => live && setFounding(s));
    return () => {
      live = false;
    };
  }, []);

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
        if (!user?.access.pro) setMessage({ text: 'Payment received. Aced Pro switches on within a minute. If it has not, reopen this page.' });
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
          <h1 className="display pro-title">You have Aced Pro</h1>
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
            <a className="list-row" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Aced Pro support')}`}>
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
        {trialEnds &&
          (session?.user.trialReminder !== false && features?.push && typeof Notification !== 'undefined' && Notification.permission === 'granted' ? (
            <p className="footnote pw-testing">We will remind you on {new Date(Date.parse(trialEnds) - 2 * 86_400_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.</p>
          ) : (
            <button className="btn btn-tinted btn-block" onClick={() => trialReminder(trialEnds)}>
              <BellIcon size={18} /> Add a reminder 2 days before the trial ends
            </button>
          ))}
        <BottomBar>
          <Link to={firstRun ? '/' : '/learn'} replace={firstRun} className="btn btn-primary btn-lg btn-block">
            Keep learning
          </Link>
        </BottomBar>
        {sheet}
      </div>
    );
  }

  const buyFounding = async () => {
    track('paywall_cta_tapped', { from, plan: 'founding' });
    setBusy(true);
    setMessage(undefined);
    const result = await purchaseLifetime();
    track('purchase_result', { plan: 'founding', ok: String(result.ok) });
    if (result.ok === 'redirect') return;
    setBusy(false);
    if (!result.ok) {
      haptic('warning');
      if (result.needsAccount) {
        navigate(`/signin?next=${encodeURIComponent(`/pro?from=${from}&plan=founding`)}`);
        return;
      }
      setMessage({ text: result.reason, bad: true });
    }
  };

  const buy = async () => {
    if (founder) return buyFounding();
    track('paywall_cta_tapped', { from, plan: plan.id, remind: String(remindable && remind) });
    setBusy(true);
    setMessage(undefined);
    // Set the reminder while the tap still counts as the player's, so the browser can ask for permission.
    if (remindable && currentSession()) await setTrialReminder(remind).catch(() => undefined);
    // From the win-back email: the server checks the offer is still open for this account.
    const result = await purchase(plan, settings, params.get('offer') === 'winback' ? { offer: 'winback' } : {});
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
  const rows = compareRows(coachLive, LEAD_PERK[from]);
  const covers = heroLessons(settings.profile, settings.access);
  const decline = firstRun ? 'Continue with the free plan' : 'Not now';
  const timeline = open === true && plan.trialDays > 0 && !founder;
  const seatsLine = founding ? foundingLeftLine(founding) : undefined;
  // A push is promised only where one can arrive: the server sends them and this browser can show them.
  const remindable = timeline && !!features?.push && !pushBlocker();

  return (
    <div className="pw focus-column">
      <header className="pw-hero">
        <HeroPattern />
        <div className="pw-top">
          <button className="icon-btn btn pw-close" aria-label="Close" onClick={close} data-haptic="off">
            <CloseIcon size={18} />
          </button>
          <div className="pw-eyebrow">
            <BrandMark size={20} /> Aced Pro
          </div>
        </div>
        <h1 className="display pw-title">{HEADLINES[from] ?? 'Train every spot you play'}</h1>
        {covers.length === 3 && (
          <div className="pw-fan" aria-hidden="true">
            {covers.map((e, i) => (
              <div key={e.key} className="pw-fan-card" style={{ '--i': i } as CSSProperties}>
                <LessonCover cover={e.content!.cover} size="sm" />
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="pw-compare" role="table" aria-label="Free and Aced Pro compared">
        <div className="pw-row pw-row-head" role="row">
          <span role="columnheader" className="pw-row-label">
            <span className="sr-only">Feature</span>
          </span>
          <span role="columnheader" className="pw-col">
            Free
          </span>
          <span role="columnheader" className="pw-col pw-col-pro">
            <span className="pw-pro-chip">Pro</span>
          </span>
        </div>
        {rows.map((r, n) => (
          <div key={r.id} className="pw-row" role="row" style={{ '--n': n } as CSSProperties}>
            <span role="cell" className="pw-row-label">
              {r.title}
              {r.id === 'lessons' && inPlan > 0 && <span className="pw-row-note">{inPlan} in your plan</span>}
            </span>
            <span role="cell" className="pw-col">
              {r.free ? <CheckIcon size={16} strokeWidth={2.4} aria-label="Included" /> : <span className="pw-none" aria-label="Not included" />}
            </span>
            <span role="cell" className="pw-col pw-col-pro">
              {r.live ? (
                <span className="pw-yes">
                  <CheckIcon size={13} strokeWidth={3} aria-label="Included" />
                </span>
              ) : (
                <span className="pw-soon">Soon</span>
              )}
            </span>
          </div>
        ))}
      </div>

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
        {founding?.open && (
          <button
            role="radio"
            aria-checked={planId === 'founding'}
            className={`pw-plan pw-plan-founding${planId === 'founding' ? ' selected' : ''}`}
            data-haptic="select"
            onClick={() => setPlanId('founding')}
          >
            <span className="pw-badge">{seatsLine ?? `First ${founding.seats} players`}</span>
            <span className="pw-check" aria-hidden="true">
              {planId === 'founding' && <CheckIcon size={14} strokeWidth={2.6} />}
            </span>
            <span className="pw-plan-label">Founding member</span>
            <span className="pw-plan-price num">{formatPrice(founding.price)}</span>
            <span className="pw-plan-per">Once. Pro for as long as Aced runs.</span>
          </button>
        )}
      </div>

      {founder && (
        <ul className="pw-perks" aria-label="What founding members get">
          {FOUNDING.perks.map((perk) => (
            <li key={perk}>
              <CheckIcon size={15} strokeWidth={2.6} aria-hidden="true" />
              {perk}
            </li>
          ))}
        </ul>
      )}

      {timeline && (
        <ol className="pw-timeline" aria-label="How the free week works">
          <li>
            <span className="pw-dot" aria-hidden="true" />
            <strong>Today</strong>
            <span>Everything in Pro unlocks. You pay nothing.</span>
          </li>
          {remindable && remind && (
            <li>
              <span className="pw-dot" aria-hidden="true" />
              <strong>{dateIn(plan.trialDays - 2)}</strong>
              <span>We send you a reminder before you pay.</span>
            </li>
          )}
          <li>
            <span className="pw-dot" aria-hidden="true" />
            <strong>{charge}</strong>
            <span>You pay {formatPrice(plan.price)} for the year. Cancel before then and pay nothing.</span>
          </li>
          <li className="pw-renews">It renews each year until you cancel in Account.</li>
          {remindable && (
            <li className="pw-remind">
              <span>Remind me before I pay</span>
              <Toggle checked={remind} onChange={setRemind} label="Remind me before I pay" />
            </li>
          )}
        </ol>
      )}

      <div className="pw-links">
        <button className="link-btn" onClick={() => setRestoring(true)} data-haptic="select">
          Restore purchases
        </button>
        <Link to="/invite" className="link-btn">
          Invite a friend for a free month
        </Link>
        <Link to="/terms" className="link-btn">
          Terms
        </Link>
        <Link to="/privacy" className="link-btn">
          Privacy
        </Link>
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
            ) : founder ? (
              <>
                <strong>{formatPrice(founding!.price)}</strong> once. Nothing renews.
              </>
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
              {busy ? 'One moment' : founder ? 'Become a founding member' : plan.trialDays > 0 ? 'Start my free week' : 'Subscribe monthly'}
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

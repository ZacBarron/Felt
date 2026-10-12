import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { annualSavings, formatPrice, isPro, PLANS, type PlanOption, purchase, restorePurchases } from '../state/access';
import { goalCopy } from '../state/goals';
import { LESSON_ENTRIES } from '../state/lessons';
import { useSettings } from '../state/settings';
import { BrandMark, HeroPattern } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { BellIcon, CheckIcon, CloseIcon, LearnIcon, LockIcon, ReviewIcon, SkipIcon, SolverIcon, StatsIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';

const LESSON_COUNT = LESSON_ENTRIES.filter((e) => e.content).length;

const BENEFITS = [
  { icon: LearnIcon, title: `All ${LESSON_COUNT} lessons`, note: 'Math, preflop, postflop, river play, exploits and tournaments' },
  { icon: SolverIcon, title: 'Felt Solver', note: 'Solve your own river and turn spots, combo by combo' },
  { icon: SkipIcon, title: 'Skip what you know', note: 'Test out of any module and go straight to your gaps' },
  { icon: ReviewIcon, title: 'Every chart in spaced review', note: 'Drills built from the edges of each range' },
  { icon: StatsIcon, title: 'New lessons and tools as they ship', note: 'Session tracking and hand review are next' },
];

function perMonth(plan: PlanOption) {
  return plan.period === 'year' ? plan.price / 12 : plan.price;
}

function dateIn(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * The Felt Pro paywall. Honest by design: the price, the trial length and
 * the day you will be charged are all on screen before you tap, and closing
 * is always one tap away.
 */
export function ProPage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get('from');
  const { settings, update } = useSettings();
  const [planId, setPlanId] = useState<PlanOption['id']>('annual');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const plan = PLANS.find((p) => p.id === planId)!;
  const goal = goalCopy(settings.profile.goal);
  const close = () => (from === 'onboarding' ? navigate('/', { replace: true }) : navigate(-1));

  if (isPro(settings.access)) {
    return (
      <div className="stack focus-column lesson-done">
        <div className="hero pro-hero reveal">
          <HeroPattern />
          <BrandMark size={52} />
          <h1 className="display pro-title">You have Felt Pro</h1>
          <p className="pro-sub">
            {settings.access.trialEndsAt
              ? `Your free trial runs until ${new Date(settings.access.trialEndsAt).toLocaleDateString()}.`
              : 'Every lesson and tool is unlocked.'}
          </p>
        </div>
        <BottomBar>
          <Link to="/learn" className="btn btn-primary btn-lg btn-block">
            Keep learning
          </Link>
        </BottomBar>
      </div>
    );
  }

  const buy = async () => {
    setBusy(true);
    setMessage(undefined);
    const result = await purchase(plan, settings);
    setBusy(false);
    if (!result.ok) {
      haptic('warning');
      setMessage(result.reason);
      return;
    }
    haptic('success');
    update({ ...settings, access: result.access });
    navigate(from === 'onboarding' ? '/' : -1 as unknown as string, { replace: from === 'onboarding' });
  };

  const restore = async () => {
    const result = await restorePurchases(settings);
    if (result.ok) update({ ...settings, access: result.access });
    else setMessage(result.reason);
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
        <BrandMark size={52} />
        <div className="hero-label">Felt Pro</div>
        <h1 className="display pro-title">
          {from === 'check'
            ? 'Unlock the lessons you need'
            : goal && from === 'onboarding'
              ? `Your plan to ${goal.plan} is ready`
              : 'Train every spot, every street'}
        </h1>
        <p className="pro-sub">Built on exact math and solver checked strategy, in short sessions that fit your day.</p>
      </div>

      <div className="list pro-benefits">
        {BENEFITS.map(({ icon: Icon, title, note }, i) => (
          <div key={title} className="list-row reveal" style={{ animationDelay: `${80 + i * 50}ms` }}>
            <span className="pro-benefit-icon">
              <Icon size={20} />
            </span>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 600 }}>{title}</span>
              <span className="footnote">{note}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="plan-options" role="radiogroup" aria-label="Choose a plan">
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
            <span className="plan-radio">{p.id === planId && <CheckIcon size={14} />}</span>
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

      {plan.trialDays > 0 && (
        <section>
          <h2 className="section-title">How your trial works</h2>
          <div className="trial-timeline card">
            <div className="trial-step">
              <span className="trial-dot">
                <LockIcon size={14} />
              </span>
              <div>
                <strong>Today</strong>
                <div className="footnote">Everything unlocks. No charge.</div>
              </div>
            </div>
            <div className="trial-step">
              <span className="trial-dot">
                <BellIcon size={14} />
              </span>
              <div>
                <strong>{dateIn(plan.trialDays - 2)}</strong>
                <div className="footnote">We remind you that your trial is ending.</div>
              </div>
            </div>
            <div className="trial-step">
              <span className="trial-dot">
                <CheckIcon size={14} />
              </span>
              <div>
                <strong>{dateIn(plan.trialDays)}</strong>
                <div className="footnote">
                  You are charged {formatPrice(plan.price)}. Cancel before then and you pay nothing.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {message && <div className="explain bad reveal">{message}</div>}

      {from === 'onboarding' && (
        <button className="btn btn-plain btn-block pro-later" onClick={close}>
          Continue with the free plan
        </button>
      )}

      <p className="footnote pro-fine">
        {plan.trialDays > 0
          ? `Free for ${plan.trialDays} days, then ${formatPrice(plan.price)} a year. `
          : `${formatPrice(plan.price)} a month. `}
        Renews automatically until you cancel. Cancel anytime in your account settings.
        <br />
        <button className="link-btn" onClick={restore}>
          Restore purchases
        </button>
        {' · '}
        <a href="/terms" className="link-btn">
          Terms
        </a>
        {' · '}
        <a href="/privacy" className="link-btn">
          Privacy
        </a>
      </p>

      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={buy} disabled={busy} data-haptic="off">
          {busy ? 'One moment' : plan.trialDays > 0 ? `Start ${plan.trialDays} day free trial` : `Subscribe for ${formatPrice(plan.price)} a month`}
        </button>
      </BottomBar>
    </div>
  );
}

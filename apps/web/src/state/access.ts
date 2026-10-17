import { CURRICULUM } from '@felt/content';
import { api, currentSession, refreshMe, serverFeatures, type ServerAccess, type ServerFeatures, type ServerUser, updateSessionUser } from './api';
import type { Access, AppSettings } from './settings';

/**
 * Aced Pro: what is free, what is paid, and what it costs.
 *
 * Everything about the business model lives here so it can be tuned in one
 * place. Purchases are not connected to a store yet: `purchase` is the seam
 * where a payment provider (App Store, Play Billing or a web checkout) plugs
 * in. Until then, developer mode grants Pro locally so both sides of the
 * paywall can be tested.
 */

export interface PlanOption {
  id: 'annual' | 'monthly';
  label: string;
  price: number;
  period: 'year' | 'month';
  trialDays: number;
}

export const CURRENCY = 'USD';

export const PLANS: PlanOption[] = [
  { id: 'annual', label: 'Yearly', price: 79.99, period: 'year', trialDays: 7 },
  { id: 'monthly', label: 'Monthly', price: 14.99, period: 'month', trialDays: 0 },
];

/**
 * Founding members: one payment, the same as a year of Pro, for Pro as long
 * as Aced runs. The server holds the seat count and refuses a purchase once
 * every seat is taken (GET /api/billing/founding has the live count).
 */
export const FOUNDING = {
  price: 79.99,
  seats: 500,
  perks: [
    'Aced Pro for as long as Aced runs',
    'A monthly feedback call with the team, for a limited time',
    'A private Discord group',
    'A swag pack if we hit a milestone',
  ],
} as const;

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(amount);
}

/** Savings of the yearly plan against twelve months, rounded down to a whole percent. */
export function annualSavings(): number {
  const annual = PLANS.find((p) => p.id === 'annual')!;
  const monthly = PLANS.find((p) => p.id === 'monthly')!;
  return Math.floor((1 - annual.price / (monthly.price * 12)) * 100);
}

/**
 * Free modules: the whole basics track, so anyone can learn the game, and the
 * first module of every other track, so a new player can try each part of
 * the app. Everything else needs Pro.
 */
export const FREE_MODULES: ReadonlySet<string> = new Set(
  CURRICULUM.flatMap((t) => (t.id === 'basics' ? t.modules.map((m) => `${t.id}/${m.id}`) : [`${t.id}/${t.modules[0].id}`])),
);

export function isPro(access: Access, now = new Date()): boolean {
  // The testing switch unlocks Pro on its own. Forcing Pro off needs developer mode.
  if (access.devPro === true) return true;
  if (access.devMode && access.devPro === false) return false;
  // The founding purchase never lapses.
  if (access.lifetime) return true;
  // A server entitlement has an end date and lapses on its own, even offline.
  if (access.until !== undefined) return new Date(access.until) > now;
  if (access.trialEndsAt && new Date(access.trialEndsAt) > now) return true;
  return access.pro;
}

/**
 * "Unlock Aced Pro for testing" in Settings: the developer Pro override,
 * switched on or off without developer mode. It changes this device only.
 */
export const testingPro = (access: Access) => access.devPro === true;

export function setTestingPro(access: Access, on: boolean): Access {
  return { ...access, devPro: on ? true : undefined };
}

/** Access as the Aced server reports it, keeping this device's developer switches. */
export function accessFromServer(server: ServerAccess, local: Access): Access {
  return {
    devMode: local.devMode,
    devPro: local.devPro,
    pro: server.pro,
    plan: server.plan ?? undefined,
    // Pro with no end date (lifetime, or testing on the server) stays on. No Pro and no date reads as lapsed.
    until: server.lifetime ? undefined : (server.until ?? (server.pro ? undefined : new Date(0).toISOString())),
    trialEndsAt: server.trialing && server.until ? server.until : undefined,
    ...(server.lifetime ? { lifetime: true } : {}),
  };
}

export function isLessonFree(key: string): boolean {
  const [track, module] = key.split('/');
  return FREE_MODULES.has(`${track}/${module}`);
}

export function canOpenLesson(key: string, access: Access): boolean {
  return isPro(access) || isLessonFree(key);
}

/** Paid features outside lessons. */
export type ProFeature = 'solver' | 'all-lessons' | 'paint-drills' | 'coach' | 'weekly';

/**
 * Where Pro players reach a person for priority support. Empty hides priority
 * support everywhere: never promise a perk with no one behind it.
 */
export const SUPPORT_EMAIL = '';

/**
 * Everything Pro adds, in the order the paywall shows it. `live` is false for
 * a perk that needs something this build does not have yet (the coach needs a
 * server with the coach turned on); the paywall labels those "Coming soon".
 */
export type ProPerkId = 'lessons' | 'coach' | 'weekly' | 'solver' | 'support';
export interface ProPerk {
  id: ProPerkId;
  title: string;
  note: string;
  live: boolean;
}

export function proPerks({ proLessons, coach }: { proLessons: number; coach: boolean }): ProPerk[] {
  return [
    { id: 'lessons', title: `${proLessons} more lessons`, note: 'River play, exploits and tournaments', live: true },
    { id: 'coach', title: 'AI coach', note: 'Ask about any hand. It knows your weak spots.', live: coach },
    { id: 'weekly', title: 'Weekly Pro challenge', note: 'Ten hard spots each week. Beat your best.', live: true },
    { id: 'solver', title: 'Solve your own spots', note: 'Any board, range and stack size', live: true },
    ...(SUPPORT_EMAIL ? [{ id: 'support' as const, title: 'Priority support', note: 'Your questions go to the front of the line', live: true }] : []),
  ];
}

export function canUse(feature: ProFeature, access: Access): boolean {
  return isPro(access) || feature === 'paint-drills';
}

export type PurchaseResult =
  | { ok: true; access: Access }
  | { ok: false; reason: string; needsAccount?: boolean }
  /** Sent to Stripe Checkout; the page is about to leave. */
  | { ok: 'redirect' };

/**
 * Whether a tap on the buy button can complete: the server takes payments,
 * or this is a developer build or device. undefined while the server is asked.
 * The paywall says calmly that purchases are not open instead of failing after a tap.
 */
export function purchasesOpen(features: ServerFeatures | null | undefined, access: Access, dev = import.meta.env.DEV): boolean | undefined {
  if (dev || access.devMode) return true;
  if (features === undefined) return undefined;
  return !!features?.billing;
}

/**
 * Starts a purchase. With the Aced server and Stripe set up, this opens
 * Stripe Checkout for the signed in player. Otherwise only developer mode
 * can complete one, locally.
 */
export async function purchase(plan: PlanOption, settings: AppSettings, options: { offer?: 'winback' } = {}): Promise<PurchaseResult> {
  const features = await serverFeatures();
  if (features?.billing && !(settings.access.devMode && settings.access.devPro !== undefined)) {
    if (!currentSession()) return { ok: false, reason: 'Sign in first. That way Aced Pro works on all your devices.', needsAccount: true };
    try {
      // The win-back offer is checked again on the server; an expired one is simply the usual price.
      const { url } = await api<{ url: string }>('/billing/checkout', { body: { plan: plan.id, ...(options.offer ? { offer: options.offer } : {}) } });
      location.assign(url);
      return { ok: 'redirect' };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'We could not open checkout. Try again in a moment.' };
    }
  }
  if (!settings.access.devMode && !import.meta.env.DEV) {
    return { ok: false, reason: 'You cannot buy Aced Pro yet. Your progress is safe, and free features stay free.' };
  }
  const trialEndsAt = plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86_400_000).toISOString() : undefined;
  return { ok: true, access: { ...settings.access, pro: true, plan: plan.id, trialEndsAt } };
}

/**
 * What "Restore purchases" found. Every outcome has words to show: a restore
 * never ends silently.
 * - `restored`: the account has Aced Pro, and `access` switches it on here.
 * - `sign-in`: purchases belong to an account, so the player signs in first.
 * - `not-found`: signed in, but this account has no Aced Pro.
 * - `unavailable`: Aced could not check (no server, offline, no accounts).
 */
export type RestoreResult =
  | { kind: 'restored'; title: string; message: string; access: Access }
  | { kind: 'sign-in' | 'not-found' | 'unavailable'; title: string; message: string };

export interface RestoreFacts {
  /** What the server offers, or null when it did not answer. */
  features: ServerFeatures | null;
  /** Signed in after asking the server (an expired sign in reads as signed out). */
  signedIn: boolean;
  /** The account as the server just reported it. */
  user?: ServerUser | null;
  /** Set when the server answered health but the account check failed. */
  error?: string;
  local: Access;
}

/** The decision behind "Restore purchases", kept pure so every state is tested. */
export function decideRestore({ features, signedIn, user, error, local }: RestoreFacts): RestoreResult {
  if (!features)
    return { kind: 'unavailable', title: 'Aced could not check', message: 'The Aced server did not answer. Check your connection and try again.' };
  if (!features.accounts)
    return { kind: 'unavailable', title: 'No accounts here yet', message: 'Aced Pro is restored through an account. This server has no accounts yet.' };
  if (!signedIn)
    return { kind: 'sign-in', title: 'Sign in to restore', message: 'Aced Pro belongs to your account. Sign in and Aced checks it for you.' };
  if (error || !user) return { kind: 'unavailable', title: 'Aced could not check', message: error ?? 'Aced could not reach your account. Try again in a moment.' };
  const name = user.email ?? 'this account';
  if (user.access.pro || features.proForEveryone) {
    // An older answer from a testing server can still say no Pro; the server's switch wins.
    const server: ServerAccess = user.access.pro ? user.access : { pro: true, until: null, plan: null, trialing: false };
    return { kind: 'restored', title: 'Aced Pro is back on', message: `Aced Pro is on for ${name}.`, access: accessFromServer(server, local) };
  }
  if (!features.billing)
    return { kind: 'not-found', title: 'No purchase found', message: `There is no Aced Pro purchase on ${name}. Purchases are not open yet, so there is nothing to restore.` };
  return {
    kind: 'not-found',
    title: 'No purchase found',
    message: `There is no Aced Pro purchase on ${name}. If you bought it with another account, log out and sign in with that one.`,
  };
}

/**
 * Restore purchases: asks the Aced server what this account owns. A host
 * waking from sleep can be slow, so health gets longer than usual here.
 */
export async function restorePurchases(settings: AppSettings): Promise<RestoreResult> {
  const features = await serverFeatures(15_000);
  let user: ServerUser | null | undefined;
  let error: string | undefined;
  if (features?.accounts && currentSession()) {
    try {
      user = await refreshMe();
    } catch (e) {
      // An expired sign in clears the session, which reads as signed out below.
      if (currentSession()) error = e instanceof Error ? e.message : undefined;
    }
  }
  return decideRestore({ features, signedIn: !!currentSession(), user, error, local: settings.access });
}

/** Opens Stripe's page for the card on file and invoices. */
export async function manageSubscription(): Promise<string | undefined> {
  try {
    const { url } = await api<{ url: string }>('/billing/portal', { body: {} });
    location.assign(url);
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : 'We could not open your subscription settings. Try again.';
  }
}

/* Managing Aced Pro: status, the cancel flow and its one offer --------------------- */

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled' | 'lifetime' | 'none';
/** Where a subscription is billed. Only Stripe exists today; App Store and Play come with the native apps. */
export type Store = 'stripe' | 'app_store' | 'play';

export const CANCEL_REASONS = ['too_expensive', 'not_using', 'missing_feature', 'finished', 'technical', 'other'] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  too_expensive: 'It costs too much',
  not_using: "I'm not using it enough",
  missing_feature: "It's missing something",
  finished: 'I got what I needed',
  technical: 'Something is broken',
  other: 'Something else',
};

/** Reasons where a note helps us most. The box is optional. */
export const ASK_DETAIL: ReadonlySet<CancelReason> = new Set(['missing_feature', 'technical', 'other']);

export type CancelOffer =
  | { kind: 'coupon'; text: string; percentOff: number | null; amountOff: number | null; duration: 'once' | 'repeating' | 'forever'; months: number | null }
  | { kind: 'annual' }
  | { kind: 'pause'; months: number[] };

/** The subscription as GET /api/billing/subscription reports it. */
export interface Subscription {
  plan: string | null;
  status: SubscriptionStatus;
  store: Store | null;
  /** End of the paid period (or the trial). While paused, the end of what was paid. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pausedUntil: string | null;
  billingIssue: boolean;
  bonusUntil: string | null;
  /** The one offer for each reason, or null. Decided by the server. */
  offers: Record<CancelReason, CancelOffer | null>;
}

export type CancelOutcome = 'canceled' | 'coupon' | 'annual' | 'pause';

/**
 * Where a subscription is managed. Stripe runs in Aced's own cancel flow.
 * Apple owns the last cancel step for App Store subscriptions, and Play for
 * its own, so native builds hand off to the store's page (on iOS,
 * StoreKit's showManageSubscriptions does the same in app).
 */
export function manageRoute(store: Store | null): { kind: 'in-app' } | { kind: 'store'; url: string; label: string } | { kind: 'none' } {
  if (store === 'app_store') return { kind: 'store', url: 'https://apps.apple.com/account/subscriptions', label: 'Open App Store subscriptions' };
  if (store === 'play') return { kind: 'store', url: 'https://play.google.com/store/account/subscriptions', label: 'Open Google Play subscriptions' };
  if (store === 'stripe') return { kind: 'in-app' };
  return { kind: 'none' };
}

/** Oct 23, or Oct 23, 2027 when it is not this year. */
export function billingDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

const planPrice = (id: PlanOption['id']) => PLANS.find((p) => p.id === id)!;

export interface ManageSummary {
  title: string;
  /** One or two short sentences about where the plan stands. */
  line: string;
  canCancel: boolean;
  /** Undo a cancel or end a pause, with the button label. */
  resume?: string;
}

/** What the Manage Pro screen says about a subscription. Lifetime has nothing to renew or cancel. */
export function manageSummary(sub: Subscription, now = new Date()): ManageSummary {
  const date = (iso: string | null) => (iso ? billingDate(iso, now) : '');
  const title =
    sub.status === 'lifetime'
      ? 'Founding member'
      : sub.plan === 'annual'
        ? 'Aced Pro yearly'
        : sub.plan === 'monthly'
          ? 'Aced Pro monthly'
          : sub.plan === 'invite' && sub.bonusUntil
            ? 'Aced Pro from invites'
            : 'Free plan';
  const live = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
  const canCancel = live && !sub.cancelAtPeriodEnd && !!sub.store;
  const end = date(sub.currentPeriodEnd);
  switch (sub.status) {
    case 'lifetime':
      return { title, line: 'Pro for as long as Aced runs.', canCancel: false };
    case 'trialing':
      return sub.cancelAtPeriodEnd
        ? { title, line: `Your trial ends on ${end}. You won't be charged.`, canCancel, resume: 'Keep Aced Pro' }
        : { title, line: `Free trial until ${end}. Then ${formatPrice(planPrice('annual').price)} a year.`, canCancel };
    case 'active':
      return sub.cancelAtPeriodEnd
        ? { title, line: `Pro ends on ${end}. Then you're on the free plan.`, canCancel, resume: 'Keep Aced Pro' }
        : { title, line: `Renews on ${end}.`, canCancel };
    case 'past_due':
      return { title, line: "Your last payment didn't go through. Pro stays on while we retry.", canCancel };
    case 'paused': {
      const back = date(sub.pausedUntil);
      const inPaid = !!sub.currentPeriodEnd && Date.parse(sub.currentPeriodEnd) > now.getTime();
      return inPaid
        ? { title, line: `Pro stays on until ${end}. Then it pauses until ${back}.`, canCancel: false, resume: 'Cancel the pause' }
        : { title, line: `Paused until ${back}. Billing starts again then.`, canCancel: false, resume: 'Resume Pro today' };
    }
    default:
      return sub.plan === 'invite' && sub.bonusUntil
        ? { title, line: `Free from invites until ${date(sub.bonusUntil)}.`, canCancel: false }
        : { title, line: 'Every track has free lessons.', canCancel: false };
  }
}

/** "30% off" or "$20 off": the short form for a button. */
export function couponShort(o: Extract<CancelOffer, { kind: 'coupon' }>): string {
  if (o.percentOff !== null) return `${o.percentOff}% off`;
  return `${formatPrice(o.amountOff ?? 0).replace(/\.00$/, '')} off`;
}

export interface OfferCopy {
  title: string;
  body: string[];
  action: string;
}

/** The one offer, in words. Cancel Pro sits next to it at the same size. */
export function offerCopy(offer: CancelOffer, pauseMonths = 1): OfferCopy {
  if (offer.kind === 'coupon')
    return { title: 'Stay for less', body: [`Keep Pro with ${offer.text}.`, 'Everything in Pro stays the same.'], action: `Take ${couponShort(offer)}` };
  if (offer.kind === 'annual') {
    const annual = planPrice('annual').price;
    return {
      title: 'Switch to yearly',
      body: [`Yearly is ${formatPrice(annual)} a year. That's ${formatPrice(Math.floor((annual / 12) * 100) / 100)} a month.`, `You save ${annualSavings()}% against monthly.`, "You pay today. What's left of this month comes off."],
      action: 'Switch to yearly',
    };
  }
  return {
    title: 'Take a break instead',
    body: ["Pause Pro for 1 or 2 months. You pay nothing while it's paused.", 'Your rating and plan wait for you.'],
    action: `Pause for ${pauseMonths} ${pauseMonths === 1 ? 'month' : 'months'}`,
  };
}

/** A line under the reasons when there is no offer. */
export function reasonNote(reason: CancelReason): string {
  switch (reason) {
    case 'finished':
      return 'Nice work. Review and the daily challenge stay free.';
    case 'technical':
      return 'Sorry about that. Tell us what broke. We read every note.';
    case 'missing_feature':
      return 'Tell us what Aced should add. We read every note.';
    case 'other':
      return 'Anything you want to tell us? We read every note.';
    case 'too_expensive':
      return 'The free plan keeps review and the daily challenge.';
    case 'not_using':
      return 'Your progress stays. Come back any time.';
  }
}

/** The confirmation after the cancel flow: the end date, and that the free plan and all progress stay. */
export function outcomeCopy(outcome: CancelOutcome, sub: Subscription, wasTrial: boolean, now = new Date()): { title: string; body: string[] } {
  const end = sub.currentPeriodEnd ? billingDate(sub.currentPeriodEnd, now) : '';
  switch (outcome) {
    case 'canceled':
      return wasTrial
        ? { title: 'Your trial is cancelled', body: [`Pro stays on until ${end}. You won't be charged.`, 'After that the free plan and all your progress stay.'] }
        : {
            title: `Aced Pro ends on ${end}`,
            body: ['You keep Pro until then. Nothing more is charged.', "After that you're on the free plan. Your rating, review and progress all stay."],
          };
    case 'coupon': {
      const offer = sub.offers.too_expensive;
      return { title: 'Your discount is on', body: [offer?.kind === 'coupon' ? `You get ${offer.text}.` : 'The discount is on your plan.', `Pro renews on ${end}.`] };
    }
    case 'annual':
      return { title: "You're on yearly now", body: [`Pro renews on ${end}.`, 'The rest of your month came off the price.'] };
    case 'pause':
      return {
        title: 'Your break is set',
        body: [`Pro stays on until ${end}.`, `Billing starts again on ${sub.pausedUntil ? billingDate(sub.pausedUntil, now) : ''}.`, 'You can resume sooner in Account.'],
      };
  }
}

export async function fetchSubscription(): Promise<Subscription> {
  return api<Subscription>('/billing/subscription');
}

/**
 * The cancel flow's one request. A reason is optional: cancelling never
 * waits on an answer. With acceptOffer the reason's offer is taken instead.
 */
export async function cancelPro(body: { reason?: CancelReason; detail?: string; acceptOffer?: boolean; pauseMonths?: number }) {
  const token = currentSession()?.token;
  const res = await api<{ outcome: CancelOutcome; subscription: Subscription; user: ServerUser }>('/billing/cancel', { body });
  if (token) updateSessionUser(token, res.user);
  return res;
}

/** Undoes a cancel or ends a pause. */
export async function resumePro() {
  const token = currentSession()?.token;
  const res = await api<{ subscription: Subscription; user: ServerUser }>('/billing/resume', { body: {} });
  if (token) updateSessionUser(token, res.user);
  return res;
}

/** Starts the founding (lifetime) purchase in Stripe Checkout. The server refuses once every seat is taken. */
export async function purchaseLifetime(): Promise<PurchaseResult> {
  const features = await serverFeatures();
  if (!features?.billing) return { ok: false, reason: 'You cannot buy Aced Pro yet. Your progress is safe, and free features stay free.' };
  if (!currentSession()) return { ok: false, reason: 'Sign in first. That way Aced Pro works on all your devices.', needsAccount: true };
  try {
    const { url } = await api<{ url: string }>('/billing/lifetime', { body: {} });
    location.assign(url);
    return { ok: 'redirect' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'We could not open checkout. Try again in a moment.' };
  }
}

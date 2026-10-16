import { CURRICULUM } from '@felt/content';
import { api, currentSession, refreshMe, serverFeatures, type ServerAccess, type ServerFeatures, type ServerUser } from './api';
import type { Access, AppSettings } from './settings';

/**
 * Suited Pro: what is free, what is paid, and what it costs.
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
  // A server entitlement has an end date and lapses on its own, even offline.
  if (access.until !== undefined) return new Date(access.until) > now;
  if (access.trialEndsAt && new Date(access.trialEndsAt) > now) return true;
  return access.pro;
}

/**
 * "Unlock Suited Pro for testing" in Settings: the developer Pro override,
 * switched on or off without developer mode. It changes this device only.
 */
export const testingPro = (access: Access) => access.devPro === true;

export function setTestingPro(access: Access, on: boolean): Access {
  return { ...access, devPro: on ? true : undefined };
}

/** Access as the Suited server reports it, keeping this device's developer switches. */
export function accessFromServer(server: ServerAccess, local: Access): Access {
  return {
    devMode: local.devMode,
    devPro: local.devPro,
    pro: server.pro,
    plan: server.plan ?? undefined,
    // Pro with no end date (testing on the server) stays on. No Pro and no date reads as lapsed.
    until: server.until ?? (server.pro ? undefined : new Date(0).toISOString()),
    trialEndsAt: server.trialing && server.until ? server.until : undefined,
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
 * Starts a purchase. With the Suited server and Stripe set up, this opens
 * Stripe Checkout for the signed in player. Otherwise only developer mode
 * can complete one, locally.
 */
export async function purchase(plan: PlanOption, settings: AppSettings): Promise<PurchaseResult> {
  const features = await serverFeatures();
  if (features?.billing && !(settings.access.devMode && settings.access.devPro !== undefined)) {
    if (!currentSession()) return { ok: false, reason: 'Sign in first. That way Suited Pro works on all your devices.', needsAccount: true };
    try {
      const { url } = await api<{ url: string }>('/billing/checkout', { body: { plan: plan.id } });
      location.assign(url);
      return { ok: 'redirect' };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'We could not open checkout. Try again in a moment.' };
    }
  }
  if (!settings.access.devMode && !import.meta.env.DEV) {
    return { ok: false, reason: 'You cannot buy Suited Pro yet. Your progress is safe, and free features stay free.' };
  }
  const trialEndsAt = plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86_400_000).toISOString() : undefined;
  return { ok: true, access: { ...settings.access, pro: true, plan: plan.id, trialEndsAt } };
}

/**
 * What "Restore purchases" found. Every outcome has words to show: a restore
 * never ends silently.
 * - `restored`: the account has Suited Pro, and `access` switches it on here.
 * - `sign-in`: purchases belong to an account, so the player signs in first.
 * - `not-found`: signed in, but this account has no Suited Pro.
 * - `unavailable`: Suited could not check (no server, offline, no accounts).
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
    return { kind: 'unavailable', title: 'Suited could not check', message: 'The Suited server did not answer. Check your connection and try again.' };
  if (!features.accounts)
    return { kind: 'unavailable', title: 'No accounts here yet', message: 'Suited Pro is restored through an account. This server has no accounts yet.' };
  if (!signedIn)
    return { kind: 'sign-in', title: 'Sign in to restore', message: 'Suited Pro belongs to your account. Sign in and Suited checks it for you.' };
  if (error || !user) return { kind: 'unavailable', title: 'Suited could not check', message: error ?? 'Suited could not reach your account. Try again in a moment.' };
  const name = user.email ?? 'this account';
  if (user.access.pro || features.proForEveryone) {
    // An older answer from a testing server can still say no Pro; the server's switch wins.
    const server: ServerAccess = user.access.pro ? user.access : { pro: true, until: null, plan: null, trialing: false };
    return { kind: 'restored', title: 'Suited Pro is back on', message: `Suited Pro is on for ${name}.`, access: accessFromServer(server, local) };
  }
  if (!features.billing)
    return { kind: 'not-found', title: 'No purchase found', message: `There is no Suited Pro purchase on ${name}. Purchases are not open yet, so there is nothing to restore.` };
  return {
    kind: 'not-found',
    title: 'No purchase found',
    message: `There is no Suited Pro purchase on ${name}. If you bought it with another account, log out and sign in with that one.`,
  };
}

/**
 * Restore purchases: asks the Suited server what this account owns. A host
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

/** Opens Stripe's page for changing or cancelling a subscription. */
export async function manageSubscription(): Promise<string | undefined> {
  try {
    const { url } = await api<{ url: string }>('/billing/portal', { body: {} });
    location.assign(url);
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : 'We could not open your subscription settings. Try again.';
  }
}

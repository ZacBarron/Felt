import { CURRICULUM } from '@felt/content';
import { api, currentSession, refreshMe, serverFeatures, type ServerAccess } from './api';
import type { Access, AppSettings } from './settings';

/**
 * Felt Pro: what is free, what is paid, and what it costs.
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
 * Free modules: the first module of every track, so a new player can try
 * each part of the app. Everything else needs Pro.
 */
export const FREE_MODULES: ReadonlySet<string> = new Set(CURRICULUM.map((t) => `${t.id}/${t.modules[0].id}`));

export function isPro(access: Access, now = new Date()): boolean {
  if (access.devMode && access.devPro !== undefined) return access.devPro;
  // A server entitlement has an end date and lapses on its own, even offline.
  if (access.until !== undefined) return new Date(access.until) > now;
  if (access.trialEndsAt && new Date(access.trialEndsAt) > now) return true;
  return access.pro;
}

/** Access as the Felt server reports it, keeping this device's developer switches. */
export function accessFromServer(server: ServerAccess, local: Access): Access {
  return {
    devMode: local.devMode,
    devPro: local.devPro,
    pro: server.pro,
    plan: server.plan ?? undefined,
    until: server.until ?? new Date(0).toISOString(),
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
export type ProFeature = 'solver' | 'all-lessons' | 'paint-drills';

export function canUse(feature: ProFeature, access: Access): boolean {
  return isPro(access) || feature === 'paint-drills';
}

export type PurchaseResult =
  | { ok: true; access: Access }
  | { ok: false; reason: string; needsAccount?: boolean }
  /** Sent to Stripe Checkout; the page is about to leave. */
  | { ok: 'redirect' };

/**
 * Starts a purchase. With the Felt server and Stripe set up, this opens
 * Stripe Checkout for the signed in player. Otherwise only developer mode
 * can complete one, locally.
 */
export async function purchase(plan: PlanOption, settings: AppSettings): Promise<PurchaseResult> {
  const features = await serverFeatures();
  if (features?.billing && !(settings.access.devMode && settings.access.devPro !== undefined)) {
    if (!currentSession()) return { ok: false, reason: 'Sign in first. That way Felt Pro works on all your devices.', needsAccount: true };
    try {
      const { url } = await api<{ url: string }>('/billing/checkout', { body: { plan: plan.id } });
      location.assign(url);
      return { ok: 'redirect' };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'We could not open checkout. Try again in a moment.' };
    }
  }
  if (!settings.access.devMode && !import.meta.env.DEV) {
    return { ok: false, reason: 'You cannot buy Felt Pro yet. Your progress is safe, and free features stay free.' };
  }
  const trialEndsAt = plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86_400_000).toISOString() : undefined;
  return { ok: true, access: { ...settings.access, pro: true, plan: plan.id, trialEndsAt } };
}

export async function restorePurchases(settings: AppSettings): Promise<PurchaseResult> {
  const features = await serverFeatures();
  if (features?.billing) {
    if (!currentSession()) return { ok: false, reason: 'Sign in with the email you subscribed with.', needsAccount: true };
    try {
      const user = await refreshMe();
      if (user?.access.pro) return { ok: true, access: accessFromServer(user.access, settings.access) };
      return { ok: false, reason: 'We did not find a subscription on this account.' };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'We could not check your subscription. Try again.' };
    }
  }
  if (settings.access.pro) return { ok: true, access: settings.access };
  return { ok: false, reason: 'We did not find any purchases on this device.' };
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

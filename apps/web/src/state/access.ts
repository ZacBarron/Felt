import { CURRICULUM } from '@felt/content';
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

export function isPro(access: Access): boolean {
  if (access.devMode && access.devPro !== undefined) return access.devPro;
  if (access.trialEndsAt && new Date(access.trialEndsAt) > new Date()) return true;
  return access.pro;
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

export type PurchaseResult = { ok: true; access: Access } | { ok: false; reason: string };

/** Starts a purchase. Without a store connected, only developer mode can complete one. */
export async function purchase(plan: PlanOption, settings: AppSettings): Promise<PurchaseResult> {
  if (!settings.access.devMode && !import.meta.env.DEV) {
    return { ok: false, reason: 'Purchases are not open yet. Your progress is saved, and everything free stays free.' };
  }
  const trialEndsAt = plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86_400_000).toISOString() : undefined;
  return { ok: true, access: { ...settings.access, pro: true, plan: plan.id, trialEndsAt } };
}

export async function restorePurchases(settings: AppSettings): Promise<PurchaseResult> {
  if (settings.access.pro) return { ok: true, access: settings.access };
  return { ok: false, reason: 'No purchases found for this device.' };
}

import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { addMonths } from './lifecycle.ts';
import { entitlementFromSubscription, type StripeCall } from './services.ts';

/**
 * Stripe subscription changes for the cancel flow, and keeping the player's
 * row in step with what Stripe reports. Every Stripe call goes through the
 * injected StripeCall, so tests pass a fake.
 */

interface BillingRow {
  id: string;
  lifetime: number;
  paid_through: string | null;
  paused_until: string | null;
  churned_at: string | null;
  last_paid_at: string | null;
  stripe_subscription: string | null;
  cancel_at_period_end: number;
  pro_until: string | null;
}

const LIVE = new Set(['active', 'trialing', 'past_due']);

const row = (db: Db, userId: string) =>
  db
    .prepare('SELECT id, lifetime, paid_through, paused_until, churned_at, last_paid_at, stripe_subscription, cancel_at_period_end, pro_until FROM users WHERE id = ?')
    .get(userId) as BillingRow | undefined;

/**
 * Writes what a Stripe subscription grants. A paused subscription keeps Pro
 * only to the end of the period the player paid for. A lifetime player keeps
 * Pro whatever an old subscription does. When a paid subscription ends, the
 * end date is kept as churned_at for win-back.
 */
export function applySubscription(db: Db, config: Config, userId: string, sub: Record<string, unknown>, now: Date) {
  const u = row(db, userId);
  if (!u) return;
  const e = entitlementFromSubscription(sub, { annual: config.stripe.priceAnnual, monthly: config.stripe.priceMonthly }, Math.floor(now.getTime() / 1000));
  const live = !!e.status && LIVE.has(e.status);
  if (u.lifetime) {
    db.prepare('UPDATE users SET stripe_subscription = ?, sub_status = ?, cancel_at_period_end = ? WHERE id = ?').run(
      e.subscriptionId ?? u.stripe_subscription,
      e.status,
      e.cancelAtPeriodEnd ? 1 : 0,
      userId,
    );
    return;
  }
  const paused = live && e.paused;
  let proUntil = e.proUntil;
  if (paused && u.paid_through && (!proUntil || u.paid_through < proUntil)) proUntil = u.paid_through;
  // Only a subscription that was paid for counts as churn. A trial cancelled before paying does not.
  const churnedAt = live ? null : (u.churned_at ?? (u.last_paid_at ? proUntil : null));
  db.prepare(
    `UPDATE users SET pro_until = ?, plan = ?, trialing = ?, trial_used = CASE WHEN ? THEN 1 ELSE trial_used END,
       stripe_subscription = ?, sub_status = ?, cancel_at_period_end = ?, churned_at = ?,
       paid_through = CASE WHEN ? THEN paid_through ELSE NULL END, paused_until = CASE WHEN ? THEN paused_until ELSE NULL END
     WHERE id = ?`,
  ).run(
    proUntil,
    e.plan,
    e.trialing ? 1 : 0,
    sub.trial_end ? 1 : 0,
    e.subscriptionId ?? u.stripe_subscription,
    e.status,
    e.cancelAtPeriodEnd ? 1 : 0,
    churnedAt,
    paused ? 1 : 0,
    paused ? 1 : 0,
    userId,
  );
}

/** Cancels at the end of the paid period. Pro stays on until then. */
export async function cancelAtPeriodEnd(db: Db, config: Config, stripe: StripeCall, userId: string, now: Date) {
  const u = row(db, userId)!;
  const sub = await stripe('POST', `subscriptions/${u.stripe_subscription}`, { cancel_at_period_end: true });
  applySubscription(db, config, userId, sub, now);
}

/** The retention coupon on the current subscription. Counted so it is offered at most once a year. */
export async function applyCoupon(db: Db, config: Config, stripe: StripeCall, userId: string, coupon: string, now: Date) {
  const u = row(db, userId)!;
  const sub = await stripe('POST', `subscriptions/${u.stripe_subscription}`, { discounts: [{ coupon }], cancel_at_period_end: false });
  db.prepare('UPDATE users SET retention_coupon_at = ? WHERE id = ?').run(now.toISOString(), userId);
  applySubscription(db, config, userId, sub, now);
}

/**
 * Monthly to yearly. Stripe starts the yearly period now and credits the
 * unused part of the month on the first yearly invoice.
 */
export async function switchToAnnual(db: Db, config: Config, stripe: StripeCall, userId: string, now: Date) {
  const u = row(db, userId)!;
  const current = await stripe('GET', `subscriptions/${u.stripe_subscription}`);
  const item = (current.items as { data?: { id?: string }[] } | undefined)?.data?.[0]?.id;
  if (!item) throw new Error('Subscription has no item to switch.');
  const sub = await stripe('POST', `subscriptions/${u.stripe_subscription}`, {
    items: [{ id: item, price: config.stripe.priceAnnual }],
    proration_behavior: 'always_invoice',
    cancel_at_period_end: false,
  });
  applySubscription(db, config, userId, sub, now);
}

/**
 * Pauses for 1 or 2 months after the paid period. Pro stays on to the end
 * of what was paid, invoices in the pause are voided, and billing starts
 * again when the pause ends (runPauseResumes), with a fresh period from
 * that day. Aced resumes it itself, so an annual plan pauses for months,
 * not a year.
 */
export async function pause(db: Db, config: Config, stripe: StripeCall, userId: string, months: number, now: Date) {
  const u = row(db, userId)!;
  const paidThrough = u.pro_until && Date.parse(u.pro_until) > now.getTime() ? u.pro_until : now.toISOString();
  const pausedUntil = addMonths(paidThrough, months);
  db.prepare('UPDATE users SET paid_through = ?, paused_until = ? WHERE id = ?').run(paidThrough, pausedUntil, userId);
  const sub = await stripe('POST', `subscriptions/${u.stripe_subscription}`, { pause_collection: { behavior: 'void' }, cancel_at_period_end: false });
  applySubscription(db, config, userId, sub, now);
}

/**
 * Undoes a cancel or a pause. Back from a pause inside the paid period, the
 * next invoice simply goes ahead. After it, billing starts again today with
 * a new period, so no unpaid time is given away.
 */
export async function resume(db: Db, config: Config, stripe: StripeCall, userId: string, now: Date) {
  const u = row(db, userId)!;
  let params: Record<string, unknown>;
  if (u.paused_until) {
    const inPaid = !!u.paid_through && Date.parse(u.paid_through) > now.getTime();
    params = inPaid ? { pause_collection: '' } : { pause_collection: '', billing_cycle_anchor: 'now', proration_behavior: 'none' };
  } else params = { cancel_at_period_end: false };
  const sub = await stripe('POST', `subscriptions/${u.stripe_subscription}`, params);
  db.prepare('UPDATE users SET paid_through = NULL, paused_until = NULL WHERE id = ?').run(userId);
  applySubscription(db, config, userId, sub, now);
}

/** Ends pauses that are due. Run from the scheduler. */
export async function runPauseResumes(db: Db, config: Config, stripe: StripeCall, now = new Date()): Promise<number> {
  const due = db.prepare('SELECT id FROM users WHERE paused_until IS NOT NULL AND paused_until <= ? AND stripe_subscription IS NOT NULL').all(now.toISOString()) as {
    id: string;
  }[];
  let done = 0;
  for (const { id } of due) {
    try {
      await resume(db, config, stripe, id, now);
      done++;
    } catch (e) {
      console.error('Resuming a paused subscription failed', e);
    }
  }
  return done;
}

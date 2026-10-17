import { serverEvent, unlinkUser } from '../analytics.ts';
import { applySubscription, cancelAtPeriodEnd, pause, resume } from '../billing.ts';
import type { Config } from '../config.ts';
import { type Db, tx } from '../db.ts';
import { PAUSE_MONTHS } from '../lifecycle.ts';
import { audit, type Actor } from '../ops.ts';
import { type Mailer, newCode, sha256, type StripeCall } from '../services.ts';

/**
 * What staff can do to a player's account from the console (docs/ADMIN.md).
 * Every action needs a reason and a confirm, and writes one audit row with
 * the account's state before and after. Money moves only through Stripe;
 * the console never sees card details.
 */

export const ACTIONS = {
  grant_pro: { label: 'Grant Pro', note: 'Free Pro for a number of days, on top of anything paid.', stripe: false, danger: false },
  revoke_pro: { label: 'Revoke granted Pro', note: 'Ends Pro given by staff or invites, and a comped founding place. Paid Pro is cancelled or refunded instead.', stripe: false, danger: true },
  extend_trial: { label: 'Extend the trial', note: 'Moves the first charge later in Stripe.', stripe: true, danger: false },
  comp_founding: { label: 'Comp a founding place', note: 'Pro for as long as Aced runs, no charge. Takes one of the seats.', stripe: false, danger: false },
  refund_last: { label: 'Refund the last payment', note: 'Refunds the latest charge in Stripe and removes Pro now.', stripe: true, danger: true },
  cancel_sub: { label: 'Cancel at period end', note: 'Pro stays on to the end of what was paid.', stripe: true, danger: true },
  resume_sub: { label: 'Resume the subscription', note: 'Undoes a cancel or ends a pause.', stripe: true, danger: false },
  pause_sub: { label: 'Pause the subscription', note: 'Pauses billing for 1 or 2 months after the paid period.', stripe: true, danger: false },
  resend_receipt: { label: 'Resend the last receipt', note: 'Stripe emails the receipt for the latest charge.', stripe: true, danger: false },
  send_signin_code: { label: 'Email a sign in code', note: 'A fresh 6 digit code, good for 10 minutes.', stripe: false, danger: false },
  unsubscribe: { label: 'Unsubscribe from marketing', note: 'Turns off tips and news email. Account email still goes.', stripe: false, danger: false },
  reset_push: { label: 'Reset push', note: 'Removes every device subscription and turns reminders off.', stripe: false, danger: false },
  sign_out_all: { label: 'Sign out everywhere', note: 'Ends every session on every device.', stripe: false, danger: true },
  delete_user: { label: 'Delete the player', note: 'Deletes the account and everything stored with it. Billing in Stripe is not touched.', stripe: false, danger: true },
} as const;
export type ActionId = keyof typeof ACTIONS;
export const isAction = (a: unknown): a is ActionId => typeof a === 'string' && Object.prototype.hasOwnProperty.call(ACTIONS, a);

export interface ActionDeps {
  db: Db;
  config: Config;
  stripe?: StripeCall;
  mailer: Mailer;
  now: () => Date;
}

export interface ActionInput {
  reason: string;
  days?: number;
  months?: number;
  /** For delete: the player's id or email, typed again. */
  confirmText?: string;
}

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

interface Row {
  id: string;
  email: string | null;
  plan: string | null;
  pro_until: string | null;
  bonus_until: string | null;
  lifetime: number;
  trialing: number;
  stripe_customer: string | null;
  stripe_subscription: string | null;
  sub_status: string | null;
  cancel_at_period_end: number;
  paused_until: string | null;
  email_opt_in: number;
  reminders: number;
  comp_reason: string | null;
}

const LIVE = ['active', 'trialing', 'past_due'];
const DAY = 86_400_000;

/** The parts of an account the audit log keeps before and after an action. */
export function snapshot(db: Db, id: string) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined;
  if (!u) return null;
  const n = (sql: string) => (db.prepare(sql).get(id) as { n: number }).n;
  return {
    plan: u.plan,
    pro_until: u.pro_until,
    bonus_until: u.bonus_until,
    lifetime: !!u.lifetime,
    trialing: !!u.trialing,
    sub_status: u.sub_status,
    cancel_at_period_end: !!u.cancel_at_period_end,
    paused_until: u.paused_until,
    email_opt_in: !!u.email_opt_in,
    reminders: !!u.reminders,
    sessions: n('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?'),
    push_devices: n('SELECT COUNT(*) AS n FROM push_subs WHERE user_id = ?'),
  };
}

export async function runAction(d: ActionDeps, actor: Actor, userId: string, action: ActionId, input: ActionInput): Promise<ActionResult> {
  const { db, config, stripe, now } = d;
  const reason = input.reason.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500);
  if (reason.length < 3) return { ok: false, message: 'Write a reason. It goes in the audit log.' };
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Row | undefined;
  if (!u) return { ok: false, message: 'No player with that id.' };
  if (ACTIONS[action].stripe && !stripe) return { ok: false, message: 'Stripe is not set up on this server.' };
  const before = snapshot(db, userId);
  const iso = now().toISOString();
  const event = (name: Parameters<typeof serverEvent>[1], props: Record<string, unknown>) => serverEvent(db, name, props as never, { userId, now: now() });
  let message = '';

  switch (action) {
    case 'grant_pro': {
      const days = Math.round(input.days ?? 0);
      if (!(days >= 1 && days <= 3650)) return { ok: false, message: 'Pick 1 to 3650 days.' };
      const from = Math.max(now().getTime(), u.bonus_until ? Date.parse(u.bonus_until) : 0);
      db.prepare('UPDATE users SET bonus_until = ?, comp_reason = ? WHERE id = ?').run(new Date(from + days * DAY).toISOString(), reason, userId);
      message = `Granted ${days} days of Pro.`;
      break;
    }
    case 'revoke_pro': {
      const comped = !!u.lifetime && !!u.comp_reason;
      tx(db, () => {
        db.prepare('UPDATE users SET bonus_until = NULL WHERE id = ?').run(userId);
        if (comped) {
          db.prepare("UPDATE users SET lifetime = 0, plan = NULL, comp_reason = NULL WHERE id = ?").run(userId);
          db.prepare("DELETE FROM lifetime_checkouts WHERE user_id = ? AND session_id LIKE 'comp_%'").run(userId);
        }
      });
      message = comped ? 'Removed granted Pro and the comped founding place.' : 'Removed granted Pro. Paid Pro is unchanged.';
      break;
    }
    case 'extend_trial': {
      const days = Math.round(input.days ?? 0);
      if (!(days >= 1 && days <= 60)) return { ok: false, message: 'Pick 1 to 60 days.' };
      if (!u.trialing || !u.stripe_subscription) return { ok: false, message: 'This player is not in a trial.' };
      const end = Math.max(now().getTime(), u.pro_until ? Date.parse(u.pro_until) : 0) + days * DAY;
      const sub = await stripe!('POST', `subscriptions/${u.stripe_subscription}`, { trial_end: Math.floor(end / 1000), proration_behavior: 'none' });
      applySubscription(db, config, userId, sub, now());
      message = `Trial extended by ${days} days.`;
      break;
    }
    case 'comp_founding': {
      if (u.lifetime) return { ok: false, message: 'This player already has a founding place.' };
      tx(db, () => {
        db.prepare("UPDATE users SET lifetime = 1, plan = 'lifetime', comp_reason = ?, churned_at = NULL, billing_issue = 0 WHERE id = ?").run(reason, userId);
        db.prepare('INSERT OR IGNORE INTO lifetime_checkouts (session_id, user_id, created_at, expires_at, completed_at) VALUES (?, ?, ?, ?, ?)').run(`comp_${userId}`, userId, iso, iso, iso);
      });
      // A running subscription would charge again: it ends at the period end.
      if (stripe && u.stripe_subscription && u.sub_status && LIVE.includes(u.sub_status) && !u.cancel_at_period_end) {
        const sub = await stripe('POST', `subscriptions/${u.stripe_subscription}`, { cancel_at_period_end: true });
        applySubscription(db, config, userId, sub, now());
      }
      message = 'Comped a founding place.';
      break;
    }
    case 'refund_last': {
      if (!u.stripe_customer) return { ok: false, message: 'This player has never paid.' };
      const list = await stripe!('GET', `charges?customer=${encodeURIComponent(u.stripe_customer)}&limit=1`);
      const charge = (list.data as { id: string; paid?: boolean; refunded?: boolean; amount?: number }[] | undefined)?.[0];
      if (!charge || !charge.paid || charge.refunded) return { ok: false, message: 'There is no payment left to refund.' };
      await stripe!('POST', 'refunds', { charge: charge.id, metadata: { by: actor.name } });
      // Pro ends now. The webhook (charge.refunded) records the refund itself, so it is counted once.
      if (u.lifetime) {
        tx(db, () => {
          db.prepare("UPDATE users SET lifetime = 0, plan = NULL, pro_until = ? WHERE id = ?").run(iso, userId);
          db.prepare('DELETE FROM lifetime_checkouts WHERE user_id = ? AND completed_at IS NOT NULL').run(userId);
        });
      }
      if (u.stripe_subscription && u.sub_status && LIVE.includes(u.sub_status)) {
        const sub = await stripe!('DELETE', `subscriptions/${u.stripe_subscription}`);
        applySubscription(db, config, userId, sub, now());
      }
      db.prepare('UPDATE users SET pro_until = ?, trialing = 0 WHERE id = ? AND (pro_until IS NULL OR pro_until > ?)').run(iso, userId, iso);
      message = `Refunded ${typeof charge.amount === 'number' ? `$${(charge.amount / 100).toFixed(2)}` : 'the last payment'} and removed Pro.`;
      break;
    }
    case 'cancel_sub': {
      if (!u.stripe_subscription || !u.sub_status || !LIVE.includes(u.sub_status)) return { ok: false, message: 'There is no live subscription.' };
      if (u.cancel_at_period_end) return { ok: false, message: 'It already ends at the period end.' };
      await cancelAtPeriodEnd(db, config, stripe!, userId, now());
      event('subscription_cancelled', { plan: u.plan ?? undefined, reason: 'staff' });
      message = 'The subscription ends at the period end.';
      break;
    }
    case 'resume_sub': {
      if (!u.stripe_subscription || !(u.cancel_at_period_end || u.paused_until)) return { ok: false, message: 'Nothing to resume.' };
      await resume(db, config, stripe!, userId, now());
      event('subscription_resumed', { from: u.paused_until ? 'pause' : 'cancel' });
      message = 'The subscription is back on.';
      break;
    }
    case 'pause_sub': {
      const months = PAUSE_MONTHS.find((m) => m === input.months);
      if (!months) return { ok: false, message: 'Pick 1 or 2 months.' };
      if (!u.stripe_subscription || !u.sub_status || !LIVE.includes(u.sub_status) || u.paused_until) return { ok: false, message: 'There is no live subscription to pause.' };
      await pause(db, config, stripe!, userId, months, now());
      event('subscription_paused', { months });
      message = `Paused for ${months} ${months === 1 ? 'month' : 'months'}.`;
      break;
    }
    case 'resend_receipt': {
      if (!u.stripe_customer || !u.email) return { ok: false, message: 'This player has no payments or no email.' };
      const list = await stripe!('GET', `charges?customer=${encodeURIComponent(u.stripe_customer)}&limit=1`);
      const charge = (list.data as { id: string }[] | undefined)?.[0];
      if (!charge) return { ok: false, message: 'There is no payment yet.' };
      // Setting the receipt address makes Stripe send the receipt again.
      await stripe!('POST', `charges/${charge.id}`, { receipt_email: u.email });
      message = 'Stripe is sending the receipt.';
      break;
    }
    case 'send_signin_code': {
      if (!u.email) return { ok: false, message: 'This player has no email. They sign in with a passkey.' };
      const code = newCode();
      db.prepare('INSERT OR REPLACE INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)').run(u.email, sha256(`${u.email}:${code}`), new Date(now().getTime() + 10 * 60_000).toISOString());
      await d.mailer.send(u.email, `Your Aced code: ${code}`, `Your Aced sign in code is ${code}. It works for 10 minutes.\n\nIf you did not ask for it, ignore this email.`);
      message = 'Sent a sign in code.';
      break;
    }
    case 'unsubscribe': {
      if (!u.email_opt_in) return { ok: false, message: 'Marketing email is already off.' };
      db.prepare('UPDATE users SET email_opt_in = 0 WHERE id = ?').run(userId);
      event('email_unsubscribed', { via: 'staff' });
      message = 'Marketing email is off.';
      break;
    }
    case 'reset_push': {
      db.prepare('DELETE FROM push_subs WHERE user_id = ?').run(userId);
      db.prepare('UPDATE users SET reminders = 0 WHERE id = ?').run(userId);
      message = 'Removed every push device and turned reminders off.';
      break;
    }
    case 'sign_out_all': {
      const n = Number(db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes);
      message = `Ended ${n} ${n === 1 ? 'session' : 'sessions'}.`;
      break;
    }
    case 'delete_user': {
      const typed = (input.confirmText ?? '').trim().toLowerCase();
      if (!typed || (typed !== u.id.toLowerCase() && typed !== (u.email ?? '').toLowerCase())) return { ok: false, message: 'Type the player’s id or email to confirm.' };
      unlinkUser(db, userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      message = 'Deleted the player and their data.';
      break;
    }
  }
  audit(db, actor, now(), { action, target: userId, reason, before, after: snapshot(db, userId) });
  return { ok: true, message };
}

/** Everything stored about a player, for a privacy request. Secrets (token hashes, keys) are left out. */
export function exportUser(db: Db, userId: string) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!u) return undefined;
  const { unsub_token: _t, ...user } = u;
  const all = (sql: string) => db.prepare(sql).all(userId);
  const installs = (db.prepare('SELECT install_id FROM installs WHERE user_id = ?').all(userId) as { install_id: string }[]).map((r) => r.install_id);
  const snapshot = db.prepare('SELECT version, data, bytes, updated_at, device FROM snapshots WHERE user_id = ?').get(userId) as { data?: string } | undefined;
  let progress: unknown = null;
  try {
    progress = snapshot?.data ? JSON.parse(snapshot.data) : null;
  } catch {
    progress = snapshot?.data ?? null;
  }
  return {
    exportedAt: new Date().toISOString(),
    user,
    passkeys: all('SELECT id, device_type, backed_up, created_at, last_used FROM passkeys WHERE user_id = ?'),
    sessions: all('SELECT created_at, last_seen FROM sessions WHERE user_id = ?'),
    pushDevices: (all('SELECT endpoint, created_at FROM push_subs WHERE user_id = ?') as { endpoint: string; created_at: string }[]).map((p) => ({
      service: (() => {
        try {
          return new URL(p.endpoint).host;
        } catch {
          return 'unknown';
        }
      })(),
      created_at: p.created_at,
    })),
    sync: snapshot ? { ...snapshot, data: undefined, progress } : null,
    dailyResults: all('SELECT number, scores, right_count, created_at FROM daily_results WHERE user_id = ?'),
    leagues: all('SELECT week, league, start_rating, rating, decisions FROM league_scores WHERE user_id = ?'),
    answers: all('SELECT item_id, score, rating, at FROM answers WHERE user_id = ? ORDER BY at'),
    referrals: db.prepare('SELECT referred_id, joined_at, qualified_at, rewarded FROM referrals WHERE referrer_id = ? OR referred_id = ?').all(userId, userId),
    cancelFeedback: all('SELECT reason, detail, offer_shown, offer_taken, at FROM cancel_feedback WHERE user_id = ?'),
    emailsSent: all("SELECT kind, key, at FROM notices_sent WHERE user_id = ? ORDER BY at"),
    pushesSent: all('SELECT kind, at FROM push_log WHERE user_id = ? ORDER BY at'),
    staffNotes: all('SELECT at, author, body FROM staff_notes WHERE user_id = ? ORDER BY at'),
    coachUsage: all('SELECT day, count FROM coach_usage WHERE user_id = ?'),
    usage: installs.map((id) => ({
      install: id,
      events: db.prepare('SELECT at, name, app, props FROM events WHERE install_id = ? ORDER BY at LIMIT 20000').all(id),
    })),
  };
}

import type { Config } from './config.ts';
import type { Db } from './db.ts';
import {
  type CouponInfo,
  couponInfo,
  dueEmails,
  type EmailKind,
  emailCopy,
  isMarketing,
  MARKETING,
  marketingAllowed,
  marketingFooter,
  type WeekStats,
  winbackEligible,
} from './lifecycle.ts';
import { serverEvent } from './analytics.ts';
import type { Flags } from './flags.ts';
import { lastOpen } from './push.ts';
import { type Mailer, newToken, safeZone, type StripeCall } from './services.ts';

const DAY_MS = 86_400_000;

interface Row {
  id: string;
  email: string;
  tz: string | null;
  trialing: number;
  trial_reminder: number;
  pro_until: string | null;
  bonus_until: string | null;
  lifetime: number;
  billing_issue: number;
  billing_issue_at: string | null;
  churned_at: string | null;
  retention_coupon_at: string | null;
  last_active_at: string | null;
  last_study_day: string | null;
  email_opt_in: number;
  holdout: number;
  unsub_token: string | null;
}

/** Sent emails live in notices_sent with this prefix on the kind. */
const KIND = (k: EmailKind) => `email-${k}`;

/** The player's week from the answers the server has: decisions, right answers, rating change and daily challenges. */
export function weekStats(db: Db, userId: string, now: Date): WeekStats {
  const since = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const { n, right } = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(score >= 1), 0) AS right FROM answers WHERE user_id = ? AND at > ?').get(userId, since) as {
    n: number;
    right: number;
  };
  const first = db.prepare('SELECT rating FROM answers WHERE user_id = ? AND at > ? ORDER BY at ASC LIMIT 1').get(userId, since) as { rating: number } | undefined;
  const last = db.prepare('SELECT rating FROM answers WHERE user_id = ? AND at > ? ORDER BY at DESC LIMIT 1').get(userId, since) as { rating: number } | undefined;
  const dailies = (db.prepare('SELECT COUNT(*) AS n FROM daily_results WHERE user_id = ? AND created_at > ?').get(userId, since) as { n: number }).n;
  // Each answer carries the rating before it, so this is the change up to the last answer: an estimate.
  const ratingChange = n >= 2 && first && last ? Math.round(last.rating - first.rating) : undefined;
  return { decisions: n, right, ratingChange, dailies };
}

let warnedNoAddress = false;

/**
 * Sends the lifecycle emails that are due (see dueEmails). Run from the
 * scheduler every few minutes. Transactional email goes to anyone with an
 * address. Marketing email needs opt in, a postal address in
 * MAIL_POSTAL_ADDRESS and a player outside the holdout, and carries the one
 * tap unsubscribe link and headers.
 */
export async function runLifecycleEmails(db: Db, mailer: Mailer, config: Config, now = new Date(), stripe?: StripeCall, flags?: Flags): Promise<number> {
  if (flags && !flags.bool('email.enabled')) return 0;
  const postal = config.lifecycle.postalAddress;
  if (!postal && !warnedNoAddress) {
    warnedNoAddress = true;
    console.log('Marketing email is off: set MAIL_POSTAL_ADDRESS to turn it on. Transactional email still goes.');
  }
  const soon = new Date(now.getTime() + 2.5 * DAY_MS).toISOString();
  const users = db
    .prepare(
      `SELECT id, email, tz, trialing, trial_reminder, pro_until, bonus_until, lifetime, billing_issue, billing_issue_at, churned_at, retention_coupon_at,
              last_active_at, last_study_day, email_opt_in, holdout, unsub_token
       FROM users WHERE email IS NOT NULL AND (
         (trialing = 1 AND trial_reminder = 1 AND pro_until > ? AND pro_until <= ?)
         OR billing_issue = 1
         OR (email_opt_in = 1 AND holdout = 0)
       )`,
    )
    .all(now.toISOString(), soon) as unknown as Row[];

  // Read once per run, and only when a win-back offer could go out.
  let coupon: CouponInfo | undefined | null = null;
  const winbackCoupon = async () => {
    if (coupon !== null) return coupon;
    coupon = undefined;
    if (stripe && config.stripe.retentionCoupon) {
      try {
        coupon = couponInfo(await stripe('GET', `coupons/${encodeURIComponent(config.stripe.retentionCoupon)}`));
      } catch (e) {
        console.error('Could not read the retention coupon', e);
      }
    }
    return coupon;
  };

  let sent = 0;
  for (const u of users) {
    const tz = safeZone(u.tz);
    const notices = db.prepare("SELECT kind, key, at FROM notices_sent WHERE user_id = ? AND kind LIKE 'email-%'").all(u.id) as { kind: string; key: string; at: string }[];
    const marketingKinds = new Set(MARKETING.map(KIND));
    const lastActiveAt = lastOpen(u.last_active_at, u.last_study_day);
    const base = {
      optIn: !!u.email_opt_in,
      holdout: !!u.holdout,
      postalAddress: !!postal,
      lastActiveAt,
      now,
    };
    const marketing = marketingAllowed(base);
    const proNow = !!u.lifetime || [u.pro_until, u.bonus_until].some((d) => !!d && Date.parse(d) > now.getTime());
    const canWinback = marketing && !!u.churned_at && !proNow && winbackEligible(u.churned_at, u.retention_coupon_at, now) && !!(await winbackCoupon());
    const answersThisWeek = marketing
      ? (db.prepare('SELECT COUNT(*) AS n FROM answers WHERE user_id = ? AND at > ?').get(u.id, new Date(now.getTime() - 7 * DAY_MS).toISOString()) as { n: number }).n
      : 0;
    const due = dueEmails({
      ...base,
      hasEmail: true,
      tz,
      trialing: !!u.trialing,
      trialReminder: !!u.trial_reminder,
      proUntil: u.pro_until,
      proNow,
      lifetime: !!u.lifetime,
      billingIssueAt: u.billing_issue ? u.billing_issue_at : null,
      churnedAt: u.churned_at,
      answersThisWeek,
      winbackOffer: canWinback,
      sent: new Set(notices.map((n) => `${n.kind.slice('email-'.length)}:${n.key}`)),
      marketingSent: notices.filter((n) => marketingKinds.has(n.kind)).map((n) => n.at),
    });

    for (const { kind, key } of due) {
      // A paused program sends nothing and marks nothing as sent.
      if (flags && !flags.bool(`program.${kind}`)) continue;
      const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });
      const copy = emailCopy(kind, key, {
        appUrl: config.appUrl,
        date,
        week: kind === 'weekly-digest' ? weekStats(db, u.id, now) : undefined,
        coupon: kind === 'winback-offer' ? ((await winbackCoupon()) ?? undefined) : undefined,
      });
      let text = copy.text;
      let headers: Record<string, string> | undefined;
      if (isMarketing(kind)) {
        let token = u.unsub_token;
        if (!token) {
          token = newToken();
          db.prepare('UPDATE users SET unsub_token = ? WHERE id = ?').run(token, u.id);
          u.unsub_token = token;
        }
        const url = `${config.lifecycle.serverUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
        text = `${text}\n\n${marketingFooter(url, postal!)}`;
        headers = { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
      }
      // Recorded first so a slow send is never repeated by the next run. A failed send is cleared to try again.
      db.prepare('INSERT OR IGNORE INTO notices_sent (user_id, kind, key, at) VALUES (?, ?, ?, ?)').run(u.id, KIND(kind), key, now.toISOString());
      try {
        await mailer.send(u.email, copy.subject, text, headers ? { headers } : undefined);
        serverEvent(db, 'email_sent', { kind }, { userId: u.id, now });
        sent++;
      } catch (e) {
        console.error(`Email ${kind} failed`, e);
        db.prepare('DELETE FROM notices_sent WHERE user_id = ? AND kind = ? AND key = ?').run(u.id, KIND(kind), key);
      }
    }
  }
  return sent;
}

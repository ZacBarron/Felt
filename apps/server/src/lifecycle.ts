/**
 * Retention and lifecycle rules, kept pure so every branch is unit tested:
 * the cancel flow's one offer per reason, the subscription status the app
 * shows, and which lifecycle emails are due. The database and Stripe calls
 * that act on these live in billing.ts and emails.ts.
 */

const DAY_MS = 86_400_000;

// Cancel flow -------------------------------------------------------------------

export const CANCEL_REASONS = ['too_expensive', 'not_using', 'missing_feature', 'finished', 'technical', 'other'] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
export const isCancelReason = (r: unknown): r is CancelReason => typeof r === 'string' && (CANCEL_REASONS as readonly string[]).includes(r);

/** A retention coupon at most once in this many days per account. */
export const COUPON_EVERY_DAYS = 365;
/** Pause lengths the "not using it" offer allows, in months. */
export const PAUSE_MONTHS = [1, 2] as const;

/** A Stripe coupon, as much of it as the offer copy needs. */
export interface CouponInfo {
  id: string;
  percentOff?: number;
  /** In the currency's main unit (dollars), not cents. */
  amountOff?: number;
  duration: 'once' | 'repeating' | 'forever';
  months?: number;
}

export type RetentionOffer = { kind: 'coupon'; coupon: CouponInfo } | { kind: 'annual' } | { kind: 'pause'; months: readonly number[] };

export interface OfferFacts {
  plan: string | null;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  /** The retention coupon, when one is set up and Stripe described it. */
  coupon?: CouponInfo;
  /** When this account last took a retention coupon. */
  couponTakenAt: string | null;
  /** The yearly price is set up, so a monthly player can switch. */
  annualAvailable: boolean;
  now: Date;
}

/**
 * The one offer for a cancel reason, or none. Price gets a cheaper way to
 * stay: monthly players switch to yearly, yearly players get the retention
 * coupon at most once a year. Not using it gets a pause. Every other reason
 * gets no offer. Nobody in a free trial, already cancelling, paused or with
 * a payment problem sees an offer: they only need the facts.
 */
export function retentionOffer(reason: CancelReason, f: OfferFacts): RetentionOffer | null {
  if (f.status !== 'active' || f.cancelAtPeriodEnd) return null;
  if (reason === 'not_using') return { kind: 'pause', months: PAUSE_MONTHS };
  if (reason !== 'too_expensive') return null;
  if (f.plan === 'monthly') return f.annualAvailable ? { kind: 'annual' } : null;
  if (f.plan !== 'annual' || !f.coupon) return null;
  if (f.couponTakenAt && f.now.getTime() - Date.parse(f.couponTakenAt) < COUPON_EVERY_DAYS * DAY_MS) return null;
  return { kind: 'coupon', coupon: f.coupon };
}

/** Every reason with its offer, as the cancel screen needs them. */
export function offersByReason(f: OfferFacts): Record<CancelReason, RetentionOffer | null> {
  return Object.fromEntries(CANCEL_REASONS.map((r) => [r, retentionOffer(r, f)])) as Record<CancelReason, RetentionOffer | null>;
}

/** The offer as stored in cancel_feedback.offer_shown. */
export const offerLabel = (o: RetentionOffer | null) => (o ? (o.kind === 'coupon' ? `coupon:${o.coupon.id}` : o.kind) : null);

/** Reads a Stripe coupon object. Amounts come in cents. */
export function couponInfo(raw: Record<string, unknown>): CouponInfo | undefined {
  if (typeof raw.id !== 'string' || raw.valid === false) return undefined;
  const duration = raw.duration === 'once' || raw.duration === 'repeating' || raw.duration === 'forever' ? raw.duration : undefined;
  if (!duration) return undefined;
  const percentOff = typeof raw.percent_off === 'number' ? raw.percent_off : undefined;
  const amountOff = typeof raw.amount_off === 'number' ? raw.amount_off / 100 : undefined;
  if (percentOff === undefined && amountOff === undefined) return undefined;
  return { id: raw.id, percentOff, amountOff, duration, months: typeof raw.duration_in_months === 'number' ? raw.duration_in_months : undefined };
}

/** "30% off" or "$20 off", then how long, in plain words. */
export function describeCoupon(c: CouponInfo): string {
  const off = c.percentOff !== undefined ? `${c.percentOff}% off` : `$${(c.amountOff ?? 0).toFixed(2).replace(/\.00$/, '')} off`;
  if (c.duration === 'forever') return `${off} for as long as you stay`;
  if (c.duration === 'repeating' && c.months) return `${off} for ${c.months} ${c.months === 1 ? 'month' : 'months'}`;
  return `${off} your next payment`;
}

/** Adds whole calendar months in UTC, holding the day where the month allows. */
export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

// Subscription status ---------------------------------------------------------------

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled' | 'lifetime' | 'none';

export interface StatusFacts {
  lifetime: boolean;
  /** Stripe's own status, as last reported. */
  subStatus: string | null;
  pausedUntil: string | null;
  proUntil: string | null;
  now: Date;
}

/** The status the app shows. Stripe statuses that end access read as canceled. */
export function subscriptionStatus(f: StatusFacts): SubscriptionStatus {
  if (f.lifetime) return 'lifetime';
  if (!f.subStatus) return 'none';
  if (f.pausedUntil) return 'paused';
  if (f.subStatus === 'trialing') return 'trialing';
  if (f.subStatus === 'past_due') return 'past_due';
  if (f.subStatus === 'active') return 'active';
  // incomplete: the first payment has not gone through yet.
  if (f.subStatus === 'incomplete') return f.proUntil && Date.parse(f.proUntil) > f.now.getTime() ? 'past_due' : 'none';
  return 'canceled';
}

// Founding (lifetime) seats ------------------------------------------------------------

export const FOUNDING_SEATS = 500;
/** The founding price in dollars: the same as one year. Shown on the site; Stripe holds the real price. */
export const FOUNDING_PRICE = 79.99;
/** How long a checkout holds a seat. Stripe's shortest checkout expiry. */
export const SEAT_HOLD_MINUTES = 30;

/** Seats still open, counting checkouts in progress as held. */
export const seatsLeft = (taken: number, held: number, seats = FOUNDING_SEATS) => Math.max(0, seats - taken - held);

// Lifecycle email -------------------------------------------------------------------------

/** Transactional email goes to everyone with an address. Marketing email needs opt in. */
export const TRANSACTIONAL = ['trial-ending', 'billing-issue', 'billing-issue-again'] as const;
export const MARKETING = ['weekly-digest', 'winback-news', 'winback-offer'] as const;
export type EmailKind = (typeof TRANSACTIONAL)[number] | (typeof MARKETING)[number];
export const isMarketing = (k: EmailKind) => (MARKETING as readonly string[]).includes(k);

/** Marketing email stops after this many days with no visit (sunset). */
export const SUNSET_DAYS = 90;
/** Marketing email cap: at most this many in 7 days, and none within a day of the last. */
export const MARKETING_WEEK_CAP = 2;
/** Win-back windows, in days after Pro ended. */
export const WINBACK_NEWS_DAYS = [30, 45] as const;
export const WINBACK_OFFER_DAYS = [60, 90] as const;
/** A second note about a failed payment if it still fails after this many days. */
export const BILLING_AGAIN_DAYS = 7;

export interface EmailFacts {
  hasEmail: boolean;
  optIn: boolean;
  holdout: boolean;
  /** MAIL_POSTAL_ADDRESS is set. CASL needs it on every marketing email. */
  postalAddress: boolean;
  tz: string;
  now: Date;
  trialing: boolean;
  trialReminder: boolean;
  proUntil: string | null;
  proNow: boolean;
  lifetime: boolean;
  billingIssueAt: string | null;
  churnedAt: string | null;
  lastActiveAt: string | null;
  /** Graded answers in the last 7 days. */
  answersThisWeek: number;
  /** A retention coupon is set up and this account may take it. */
  winbackOffer: boolean;
  /** Keys already sent, as `kind:key`. */
  sent: ReadonlySet<string>;
  /** When recent marketing emails went out (ISO). */
  marketingSent: readonly string[];
}

export interface DueEmail {
  kind: EmailKind;
  key: string;
}

/** The player's local weekday (0 Monday) and minutes after midnight. */
function localWeek(now: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
  return { weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Monday of the player's local week, as YYYY-MM-DD: the digest's key. */
export function localWeekKey(now: Date, tz: string): string {
  const { weekday } = localWeek(now, tz);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - weekday);
  return d.toISOString().slice(0, 10);
}

const daysSince = (iso: string, now: Date) => (now.getTime() - Date.parse(iso)) / DAY_MS;

/**
 * The emails due for one player right now, at most one marketing email.
 * Transactional: the trial reminder (2 days before, if the player kept it
 * on) and a failed payment (at once, then once more after a week).
 * Marketing, only with opt in, outside the holdout, with a postal address
 * and within the sunset: the weekly digest (Monday 9 am local or later, only
 * after a week with answers) and win-back (news at 30 to 45 days after Pro
 * ended, one offer at 60 to 90).
 */
export function dueEmails(f: EmailFacts): DueEmail[] {
  if (!f.hasEmail) return [];
  const out: DueEmail[] = [];
  const fresh = (kind: EmailKind, key: string) => !f.sent.has(`${kind}:${key}`);
  const t = f.now.getTime();

  if (f.trialing && f.trialReminder && f.proUntil) {
    const left = Date.parse(f.proUntil) - t;
    if (left > 1.5 * DAY_MS && left <= 2.5 * DAY_MS && fresh('trial-ending', f.proUntil)) out.push({ kind: 'trial-ending', key: f.proUntil });
  }
  if (f.billingIssueAt) {
    if (fresh('billing-issue', f.billingIssueAt)) out.push({ kind: 'billing-issue', key: f.billingIssueAt });
    else if (daysSince(f.billingIssueAt, f.now) >= BILLING_AGAIN_DAYS && fresh('billing-issue-again', f.billingIssueAt))
      out.push({ kind: 'billing-issue-again', key: f.billingIssueAt });
  }

  if (!marketingAllowed(f)) return out;
  const recent = f.marketingSent.map((s) => Date.parse(s)).filter((s) => s > t - 7 * DAY_MS);
  if (recent.length >= MARKETING_WEEK_CAP || recent.some((s) => s > t - DAY_MS)) return out;

  if (f.churnedAt && !f.proNow && !f.lifetime) {
    const since = daysSince(f.churnedAt, f.now);
    if (since >= WINBACK_NEWS_DAYS[0] && since < WINBACK_NEWS_DAYS[1] && fresh('winback-news', f.churnedAt)) return [...out, { kind: 'winback-news', key: f.churnedAt }];
    if (f.winbackOffer && since >= WINBACK_OFFER_DAYS[0] && since < WINBACK_OFFER_DAYS[1] && fresh('winback-offer', f.churnedAt))
      return [...out, { kind: 'winback-offer', key: f.churnedAt }];
  }
  const { weekday, minutes } = localWeek(f.now, f.tz);
  const week = localWeekKey(f.now, f.tz);
  if (weekday === 0 && minutes >= 9 * 60 && minutes < 21 * 60 && f.answersThisWeek > 0 && fresh('weekly-digest', week)) out.push({ kind: 'weekly-digest', key: week });
  return out;
}

/** Marketing email: opt in, not in the holdout, a postal address to print, and a visit within SUNSET_DAYS. */
export function marketingAllowed(f: Pick<EmailFacts, 'optIn' | 'holdout' | 'postalAddress' | 'lastActiveAt' | 'now'>): boolean {
  if (!f.optIn || f.holdout || !f.postalAddress) return false;
  return !!f.lastActiveAt && daysSince(f.lastActiveAt, f.now) < SUNSET_DAYS;
}

/** Whether a player who left can take the win-back coupon now: 60 to 90 days after Pro ended, at most once a year. */
export function winbackEligible(churnedAt: string | null, couponTakenAt: string | null, now: Date): boolean {
  if (!churnedAt) return false;
  const since = daysSince(churnedAt, now);
  if (since < WINBACK_OFFER_DAYS[0] || since >= WINBACK_OFFER_DAYS[1]) return false;
  return !couponTakenAt || daysSince(couponTakenAt, now) >= COUPON_EVERY_DAYS;
}

// Email copy --------------------------------------------------------------------------------
// Plain text in the brand voice (docs/VOICE.md): short sentences, at most one
// comma, no exclamation marks, no guilt and no fake urgency.

export interface WeekStats {
  decisions: number;
  right: number;
  /** Rating change over the week, rounded. Undefined with fewer than 2 answers. */
  ratingChange?: number;
  dailies: number;
}

export interface EmailContext {
  appUrl: string;
  date: (iso: string) => string;
  week?: WeekStats;
  coupon?: CouponInfo;
}

export function emailCopy(kind: EmailKind, key: string, ctx: EmailContext): { subject: string; text: string } {
  const link = (path: string) => `${ctx.appUrl}${path}`;
  switch (kind) {
    case 'trial-ending': {
      const day = ctx.date(key);
      return {
        subject: `Your free week ends on ${day}`,
        text: [
          `Your Aced Pro trial ends on ${day}. Your yearly plan starts then.`,
          `Want to stop? Cancel before ${day} and you won't pay. Open Account in Aced and tap Manage Pro.`,
          'You keep the free plan and all your progress either way.',
          link('/account'),
        ].join('\n\n'),
      };
    }
    case 'billing-issue':
      return {
        subject: "Your payment didn't go through",
        text: [
          "Your last payment for Aced Pro didn't go through. Pro stays on while we try again.",
          'Update your card to keep it. It takes about a minute.',
          link('/account'),
        ].join('\n\n'),
      };
    case 'billing-issue-again':
      return {
        subject: 'Aced Pro still needs a new card',
        text: ['We still could not take your payment for Aced Pro. Pro stays on while we retry.', 'Update your card in Account to keep it.', link('/account')].join('\n\n'),
      };
    case 'weekly-digest': {
      const w = ctx.week ?? { decisions: 0, right: 0, dailies: 0 };
      const lines = [`You made ${w.decisions} ${w.decisions === 1 ? 'decision' : 'decisions'} this week. You got ${w.right} right.`];
      if (w.ratingChange !== undefined)
        lines.push(
          w.ratingChange > 0
            ? `Your Aced Rating went up about ${w.ratingChange}.`
            : w.ratingChange < 0
              ? `Your Aced Rating went down about ${-w.ratingChange}.`
              : 'Your Aced Rating held steady.',
        );
      if (w.dailies) lines.push(`You played ${w.dailies} daily ${w.dailies === 1 ? 'challenge' : 'challenges'}.`);
      return {
        subject: 'Your week in decisions',
        text: [lines.join('\n'), 'Your review is waiting when you are ready.', link('/review')].join('\n\n'),
      };
    }
    case 'winback-news':
      return {
        subject: 'Your progress is still here',
        text: [
          'Aced Pro ended last month. Your Aced Rating and review history are where you left them.',
          'The free plan keeps your daily challenge and review. Every track still has free lessons.',
          'Pick up where you stopped.',
          link('/learn'),
        ].join('\n\n'),
      };
    case 'winback-offer': {
      const until = ctx.date(new Date(Date.parse(key) + WINBACK_OFFER_DAYS[1] * DAY_MS).toISOString());
      const offer = ctx.coupon ? describeCoupon(ctx.coupon) : 'a lower price';
      return {
        subject: 'Come back to Aced Pro for less',
        text: [
          `You can restart Aced Pro with ${offer}. The offer is open until ${until}.`,
          'Your rating and review history are waiting.',
          link('/pro?offer=winback'),
        ].join('\n\n'),
      };
    }
  }
}

/** The footer every marketing email carries: why it came, a one tap unsubscribe and the postal address. */
export function marketingFooter(unsubscribeUrl: string, postalAddress: string): string {
  return ['--', 'You get this because you turned on tips and news in Aced.', `Unsubscribe in one tap: ${unsubscribeUrl}`, postalAddress].join('\n');
}

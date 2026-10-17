import { describe, expect, it } from 'vitest';
import {
  addMonths,
  CANCEL_REASONS,
  couponInfo,
  describeCoupon,
  dueEmails,
  type EmailFacts,
  emailCopy,
  type EmailKind,
  isCancelReason,
  localWeekKey,
  MARKETING,
  marketingAllowed,
  marketingFooter,
  offerLabel,
  offersByReason,
  type OfferFacts,
  retentionOffer,
  seatsLeft,
  subscriptionStatus,
  TRANSACTIONAL,
  winbackEligible,
} from '../src/lifecycle.ts';

const now = new Date('2026-10-14T15:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const coupon = { id: 'RETAIN30', percentOff: 30, duration: 'once' as const };

describe('cancel reasons', () => {
  it('knows the six reasons and nothing else', () => {
    expect(CANCEL_REASONS).toEqual(['too_expensive', 'not_using', 'missing_feature', 'finished', 'technical', 'other']);
    expect(isCancelReason('not_using')).toBe(true);
    expect(isCancelReason('bored')).toBe(false);
    expect(isCancelReason(3)).toBe(false);
  });
});

describe('one offer per reason', () => {
  const annual: OfferFacts = { plan: 'annual', status: 'active', cancelAtPeriodEnd: false, coupon, couponTakenAt: null, annualAvailable: true, now };
  const monthly: OfferFacts = { ...annual, plan: 'monthly' };

  it('offers a yearly player the coupon on price', () => {
    expect(retentionOffer('too_expensive', annual)).toEqual({ kind: 'coupon', coupon });
  });

  it('offers the coupon at most once in 12 months', () => {
    expect(retentionOffer('too_expensive', { ...annual, couponTakenAt: daysAgo(200) })).toBeNull();
    expect(retentionOffer('too_expensive', { ...annual, couponTakenAt: daysAgo(366) })).toEqual({ kind: 'coupon', coupon });
  });

  it('offers nothing on price without a coupon set up', () => {
    expect(retentionOffer('too_expensive', { ...annual, coupon: undefined })).toBeNull();
  });

  it('offers a monthly player yearly on price instead', () => {
    expect(retentionOffer('too_expensive', monthly)).toEqual({ kind: 'annual' });
    expect(retentionOffer('too_expensive', { ...monthly, annualAvailable: false })).toBeNull();
  });

  it('offers nothing on price for an unknown plan', () => {
    expect(retentionOffer('too_expensive', { ...annual, plan: null })).toBeNull();
  });

  it('offers a pause of 1 or 2 months when not using it', () => {
    expect(retentionOffer('not_using', annual)).toEqual({ kind: 'pause', months: [1, 2] });
    expect(retentionOffer('not_using', monthly)).toEqual({ kind: 'pause', months: [1, 2] });
  });

  it('offers nothing for the other reasons', () => {
    for (const r of ['missing_feature', 'finished', 'technical', 'other'] as const) expect(retentionOffer(r, annual)).toBeNull();
  });

  it('offers nothing during a trial, a pause, a payment problem or after cancelling', () => {
    for (const status of ['trialing', 'paused', 'past_due', 'canceled', 'lifetime', 'none'] as const) {
      expect(retentionOffer('not_using', { ...annual, status })).toBeNull();
      expect(retentionOffer('too_expensive', { ...annual, status })).toBeNull();
    }
    expect(retentionOffer('not_using', { ...annual, cancelAtPeriodEnd: true })).toBeNull();
  });

  it('lists every reason with its offer and labels what was shown', () => {
    const all = offersByReason(monthly);
    expect(Object.keys(all)).toEqual([...CANCEL_REASONS]);
    expect(all).toMatchObject({ too_expensive: { kind: 'annual' }, not_using: { kind: 'pause' }, finished: null });
    expect(offerLabel(retentionOffer('too_expensive', annual))).toBe('coupon:RETAIN30');
    expect(offerLabel({ kind: 'pause', months: [1, 2] })).toBe('pause');
    expect(offerLabel(null)).toBeNull();
  });
});

describe('coupons', () => {
  it('reads a Stripe coupon, amounts in dollars', () => {
    expect(couponInfo({ id: 'A', valid: true, percent_off: 25, duration: 'repeating', duration_in_months: 3 })).toEqual({
      id: 'A',
      percentOff: 25,
      amountOff: undefined,
      duration: 'repeating',
      months: 3,
    });
    expect(couponInfo({ id: 'B', amount_off: 2000, duration: 'once' })).toMatchObject({ amountOff: 20 });
  });

  it('refuses invalid or odd coupons', () => {
    expect(couponInfo({ id: 'C', valid: false, percent_off: 10, duration: 'once' })).toBeUndefined();
    expect(couponInfo({ id: 'D', percent_off: 10, duration: 'sometimes' })).toBeUndefined();
    expect(couponInfo({ id: 'E', duration: 'once' })).toBeUndefined();
    expect(couponInfo({ percent_off: 10, duration: 'once' })).toBeUndefined();
  });

  it('describes a coupon in plain words', () => {
    expect(describeCoupon({ id: 'a', percentOff: 30, duration: 'once' })).toBe('30% off your next payment');
    expect(describeCoupon({ id: 'b', amountOff: 20, duration: 'repeating', months: 3 })).toBe('$20 off for 3 months');
    expect(describeCoupon({ id: 'c', amountOff: 7.5, duration: 'repeating', months: 1 })).toBe('$7.50 off for 1 month');
    expect(describeCoupon({ id: 'd', percentOff: 10, duration: 'forever' })).toBe('10% off for as long as you stay');
  });
});

describe('dates', () => {
  it('adds calendar months and keeps the day where it can', () => {
    expect(addMonths('2026-10-14T15:00:00.000Z', 1)).toBe('2026-11-14T15:00:00.000Z');
    expect(addMonths('2026-10-14T15:00:00.000Z', 2)).toBe('2026-12-14T15:00:00.000Z');
    expect(addMonths('2026-01-31T00:00:00.000Z', 1)).toBe('2026-02-28T00:00:00.000Z');
    expect(addMonths('2026-12-15T00:00:00.000Z', 2)).toBe('2027-02-15T00:00:00.000Z');
  });

  it('keys the digest by the Monday of the local week', () => {
    // Wed Oct 14 in New York.
    expect(localWeekKey(now, 'America/New_York')).toBe('2026-10-12');
    // Monday 1 am in Tokyo is still Sunday in UTC.
    expect(localWeekKey(new Date('2026-10-18T16:30:00Z'), 'Asia/Tokyo')).toBe('2026-10-19');
    expect(localWeekKey(new Date('2026-10-18T16:30:00Z'), 'UTC')).toBe('2026-10-12');
  });
});

describe('subscription status', () => {
  const base = { lifetime: false, subStatus: 'active', pausedUntil: null, proUntil: daysAgo(-10), now };
  it('maps Stripe and Aced state to one status', () => {
    expect(subscriptionStatus({ ...base, lifetime: true })).toBe('lifetime');
    expect(subscriptionStatus({ ...base, subStatus: null })).toBe('none');
    expect(subscriptionStatus({ ...base, pausedUntil: daysAgo(-40) })).toBe('paused');
    expect(subscriptionStatus({ ...base, subStatus: 'trialing' })).toBe('trialing');
    expect(subscriptionStatus({ ...base, subStatus: 'past_due' })).toBe('past_due');
    expect(subscriptionStatus(base)).toBe('active');
    expect(subscriptionStatus({ ...base, subStatus: 'canceled' })).toBe('canceled');
    expect(subscriptionStatus({ ...base, subStatus: 'unpaid' })).toBe('canceled');
    expect(subscriptionStatus({ ...base, subStatus: 'incomplete_expired' })).toBe('canceled');
    expect(subscriptionStatus({ ...base, subStatus: 'incomplete' })).toBe('past_due');
    expect(subscriptionStatus({ ...base, subStatus: 'incomplete', proUntil: null })).toBe('none');
  });
});

describe('founding seats', () => {
  it('counts held checkouts and never goes below zero', () => {
    expect(seatsLeft(0, 0)).toBe(500);
    expect(seatsLeft(498, 1)).toBe(1);
    expect(seatsLeft(499, 1)).toBe(0);
    expect(seatsLeft(600, 0)).toBe(0);
  });
});

describe('which emails are due', () => {
  // Wed 11:00 in New York.
  const f: EmailFacts = {
    hasEmail: true,
    optIn: true,
    holdout: false,
    postalAddress: true,
    tz: 'America/New_York',
    now,
    trialing: false,
    trialReminder: true,
    proUntil: null,
    proNow: false,
    lifetime: false,
    billingIssueAt: null,
    churnedAt: null,
    lastActiveAt: daysAgo(1),
    answersThisWeek: 12,
    winbackOffer: true,
    sent: new Set(),
    marketingSent: [],
  };
  // Monday Oct 19, 9:30 am in New York.
  const monday = new Date('2026-10-19T13:30:00Z');

  it('sends nothing without an address', () => {
    expect(dueEmails({ ...f, hasEmail: false, billingIssueAt: daysAgo(0) })).toEqual([]);
  });

  it('sends the trial reminder 2 days before, once, if the player kept it on', () => {
    const proUntil = new Date(now.getTime() + 48 * 3_600_000).toISOString();
    const trial = { ...f, trialing: true, proUntil, optIn: false };
    expect(dueEmails(trial)).toEqual([{ kind: 'trial-ending', key: proUntil }]);
    expect(dueEmails({ ...trial, trialReminder: false })).toEqual([]);
    expect(dueEmails({ ...trial, sent: new Set([`trial-ending:${proUntil}`]) })).toEqual([]);
    expect(dueEmails({ ...trial, proUntil: new Date(now.getTime() + 5 * 86_400_000).toISOString() })).toEqual([]);
  });

  it('sends a failed payment note at once and again after a week, opt in or not', () => {
    const issue = { ...f, optIn: false, holdout: true, billingIssueAt: daysAgo(0) };
    expect(dueEmails(issue)).toEqual([{ kind: 'billing-issue', key: issue.billingIssueAt }]);
    const sentOnce = new Set([`billing-issue:${daysAgo(3)}`]);
    expect(dueEmails({ ...issue, billingIssueAt: daysAgo(3), sent: sentOnce })).toEqual([]);
    const later = { ...issue, billingIssueAt: daysAgo(8), sent: new Set([`billing-issue:${daysAgo(8)}`]) };
    expect(dueEmails(later)).toEqual([{ kind: 'billing-issue-again', key: later.billingIssueAt }]);
    expect(dueEmails({ ...later, sent: new Set([...later.sent, `billing-issue-again:${later.billingIssueAt}`]) })).toEqual([]);
  });

  it('sends the weekly digest on Monday morning after a week with answers', () => {
    expect(dueEmails({ ...f, now: monday })).toEqual([{ kind: 'weekly-digest', key: '2026-10-19' }]);
    // Not on other days, not before 9 am, not after a quiet week, not twice.
    expect(dueEmails(f)).toEqual([]);
    expect(dueEmails({ ...f, now: new Date('2026-10-19T12:30:00Z') })).toEqual([]);
    expect(dueEmails({ ...f, now: monday, answersThisWeek: 0 })).toEqual([]);
    expect(dueEmails({ ...f, now: monday, sent: new Set(['weekly-digest:2026-10-19']) })).toEqual([]);
  });

  it('keeps marketing to opted in players outside the holdout, with an address, inside the sunset', () => {
    const m = { ...f, now: monday };
    expect(dueEmails({ ...m, optIn: false })).toEqual([]);
    expect(dueEmails({ ...m, holdout: true })).toEqual([]);
    expect(dueEmails({ ...m, postalAddress: false })).toEqual([]);
    expect(dueEmails({ ...m, lastActiveAt: new Date(monday.getTime() - 91 * 86_400_000).toISOString() })).toEqual([]);
    expect(dueEmails({ ...m, lastActiveAt: null })).toEqual([]);
  });

  it('caps marketing at 2 a week and 1 a day', () => {
    const m = { ...f, now: monday };
    expect(dueEmails({ ...m, marketingSent: [new Date(monday.getTime() - 3_600_000).toISOString()] })).toEqual([]);
    const two = [2, 4].map((d) => new Date(monday.getTime() - d * 86_400_000).toISOString());
    expect(dueEmails({ ...m, marketingSent: two })).toEqual([]);
    expect(dueEmails({ ...m, marketingSent: two.slice(0, 1) })).toHaveLength(1);
  });

  it('sends win-back news at 30 to 45 days and one offer at 60 to 90', () => {
    expect(dueEmails({ ...f, churnedAt: daysAgo(31) })).toEqual([{ kind: 'winback-news', key: daysAgo(31) }]);
    expect(dueEmails({ ...f, churnedAt: daysAgo(29) })).toEqual([]);
    expect(dueEmails({ ...f, churnedAt: daysAgo(50) })).toEqual([]);
    expect(dueEmails({ ...f, churnedAt: daysAgo(61) })).toEqual([{ kind: 'winback-offer', key: daysAgo(61) }]);
    expect(dueEmails({ ...f, churnedAt: daysAgo(61), winbackOffer: false })).toEqual([]);
    expect(dueEmails({ ...f, churnedAt: daysAgo(91) })).toEqual([]);
    expect(dueEmails({ ...f, churnedAt: daysAgo(61), sent: new Set([`winback-offer:${daysAgo(61)}`]) })).toEqual([]);
  });

  it('sends no win-back to a player who has Pro again or bought lifetime', () => {
    expect(dueEmails({ ...f, churnedAt: daysAgo(31), proNow: true })).toEqual([]);
    expect(dueEmails({ ...f, churnedAt: daysAgo(31), lifetime: true })).toEqual([]);
  });

  it('sends transactional mail alongside one marketing email at most', () => {
    const both = { ...f, now: monday, churnedAt: new Date(monday.getTime() - 31 * 86_400_000).toISOString(), billingIssueAt: daysAgo(0) };
    expect(dueEmails(both).map((e) => e.kind)).toEqual(['billing-issue', 'winback-news']);
  });
});

describe('marketing and win-back rules', () => {
  it('needs every condition for marketing', () => {
    const ok = { optIn: true, holdout: false, postalAddress: true, lastActiveAt: daysAgo(89), now };
    expect(marketingAllowed(ok)).toBe(true);
    expect(marketingAllowed({ ...ok, lastActiveAt: daysAgo(90) })).toBe(false);
  });

  it('opens the win-back coupon from day 60 to 90, once a year', () => {
    expect(winbackEligible(null, null, now)).toBe(false);
    expect(winbackEligible(daysAgo(59), null, now)).toBe(false);
    expect(winbackEligible(daysAgo(60), null, now)).toBe(true);
    expect(winbackEligible(daysAgo(90), null, now)).toBe(false);
    expect(winbackEligible(daysAgo(70), daysAgo(100), now)).toBe(false);
    expect(winbackEligible(daysAgo(70), daysAgo(400), now)).toBe(true);
  });
});

describe('email copy', () => {
  const ctx = {
    appUrl: 'https://aced.example',
    date: (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    week: { decisions: 42, right: 31, ratingChange: 18, dailies: 3 },
    coupon: { id: 'X', percentOff: 30, duration: 'once' as const },
  };
  const kinds: EmailKind[] = [...TRANSACTIONAL, ...MARKETING];

  it('follows the voice rules in every email', () => {
    for (const kind of kinds) {
      const { subject, text } = emailCopy(kind, '2026-10-23T15:00:00.000Z', ctx);
      const all = `${subject}\n${text}`;
      expect(all, kind).not.toMatch(/[\u2013\u2014!;]/);
      for (const sentence of text.split(/(?<=[.?])\s+/)) expect((sentence.match(/,/g) ?? []).length, `${kind}: ${sentence}`).toBeLessThanOrEqual(1);
      expect(text).toContain('https://aced.example/');
    }
  });

  it('puts real numbers in the digest', () => {
    const { text } = emailCopy('weekly-digest', '2026-10-19', ctx);
    expect(text).toContain('You made 42 decisions this week. You got 31 right.');
    expect(text).toContain('Your Aced Rating went up about 18.');
    expect(text).toContain('You played 3 daily challenges.');
    expect(emailCopy('weekly-digest', 'k', { ...ctx, week: { decisions: 1, right: 0, dailies: 0 } }).text).toContain('You made 1 decision this week.');
    expect(emailCopy('weekly-digest', 'k', { ...ctx, week: { decisions: 5, right: 2, ratingChange: -7, dailies: 1 } }).text).toContain('went down about 7.');
    expect(emailCopy('weekly-digest', 'k', { ...ctx, week: { decisions: 5, right: 2, ratingChange: 0, dailies: 1 } }).text).toContain('held steady');
  });

  it('names the trial end date and the win-back offer with its end', () => {
    expect(emailCopy('trial-ending', '2026-10-23T15:00:00.000Z', ctx).subject).toBe('Your free week ends on Oct 23');
    const offer = emailCopy('winback-offer', '2026-10-01T00:00:00.000Z', ctx).text;
    expect(offer).toContain('30% off your next payment');
    expect(offer).toContain('open until Dec 30');
  });

  it('ends marketing email with the reason, the unsubscribe link and the address', () => {
    const footer = marketingFooter('https://api.example/api/email/unsubscribe?token=abc', '1 Main St, Toronto ON');
    expect(footer).toContain('turned on tips and news');
    expect(footer).toContain('https://api.example/api/email/unsubscribe?token=abc');
    expect(footer).toContain('1 Main St, Toronto ON');
  });
});

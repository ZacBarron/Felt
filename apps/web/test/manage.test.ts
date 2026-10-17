import { describe, expect, it } from 'vitest';
import {
  accessFromServer,
  billingDate,
  CANCEL_REASON_LABELS,
  CANCEL_REASONS,
  type CancelOffer,
  couponShort,
  FOUNDING,
  isPro,
  manageRoute,
  manageSummary,
  offerCopy,
  outcomeCopy,
  PLANS,
  reasonNote,
  type Subscription,
} from '../src/state/access';

const NOW = new Date('2026-10-16T12:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();
const noOffers = Object.fromEntries(CANCEL_REASONS.map((r) => [r, null])) as Subscription['offers'];
const sub = (patch: Partial<Subscription> = {}): Subscription => ({
  plan: 'annual',
  status: 'active',
  store: 'stripe',
  currentPeriodEnd: inDays(7),
  cancelAtPeriodEnd: false,
  pausedUntil: null,
  billingIssue: false,
  bonusUntil: null,
  offers: noOffers,
  ...patch,
});
const coupon: CancelOffer = { kind: 'coupon', text: '30% off your next payment', percentOff: 30, amountOff: null, duration: 'once', months: null };

/** The voice rules every line of this flow follows (docs/VOICE.md). */
function voice(lines: string[]) {
  for (const line of lines) {
    expect(line, line).not.toMatch(/[\u2013\u2014!;]/);
    for (const sentence of line.split(/(?<=[.?])\s+/)) expect((sentence.match(/,/g) ?? []).length, sentence).toBeLessThanOrEqual(1);
  }
}

describe('founding members', () => {
  it('costs the same as a year and has 500 seats', () => {
    expect(FOUNDING.price).toBe(PLANS.find((p) => p.id === 'annual')!.price);
    expect(FOUNDING.price).toBe(79.99);
    expect(FOUNDING.seats).toBe(500);
    voice([...FOUNDING.perks]);
  });

  it('keeps lifetime Pro on forever, even offline years later', () => {
    const access = accessFromServer({ pro: true, until: null, plan: 'lifetime', trialing: false, lifetime: true }, { pro: false });
    expect(access).toMatchObject({ pro: true, lifetime: true, plan: 'lifetime', until: undefined });
    expect(isPro(access, new Date('2040-01-01'))).toBe(true);
    // The developer switch still wins in developer mode, for testing the free side.
    expect(isPro({ ...access, devMode: true, devPro: false })).toBe(false);
  });

  it('shows no renewal or cancel for lifetime', () => {
    const s = manageSummary(sub({ plan: 'lifetime', status: 'lifetime', currentPeriodEnd: null }), NOW);
    expect(s).toEqual({ title: 'Founding member', line: 'Pro for as long as Aced runs.', canCancel: false });
  });
});

describe('where a subscription is managed', () => {
  it('runs Stripe in the app and sends store subscriptions to the store', () => {
    expect(manageRoute('stripe')).toEqual({ kind: 'in-app' });
    expect(manageRoute('app_store')).toMatchObject({ kind: 'store', url: 'https://apps.apple.com/account/subscriptions' });
    expect(manageRoute('play')).toMatchObject({ kind: 'store', url: 'https://play.google.com/store/account/subscriptions' });
    expect(manageRoute(null)).toEqual({ kind: 'none' });
  });
});

describe('the Manage Pro summary', () => {
  const end = billingDate(inDays(7), NOW);

  it('names the renewal date', () => {
    expect(manageSummary(sub(), NOW)).toEqual({ title: 'Aced Pro yearly', line: `Renews on ${end}.`, canCancel: true });
    expect(manageSummary(sub({ plan: 'monthly' }), NOW).title).toBe('Aced Pro monthly');
  });

  it('offers to keep Pro after cancelling, with the end date', () => {
    expect(manageSummary(sub({ cancelAtPeriodEnd: true }), NOW)).toEqual({
      title: 'Aced Pro yearly',
      line: `Pro ends on ${end}. Then you're on the free plan.`,
      canCancel: false,
      resume: 'Keep Aced Pro',
    });
  });

  it('describes a trial and a cancelled trial', () => {
    expect(manageSummary(sub({ status: 'trialing' }), NOW).line).toBe(`Free trial until ${end}. Then $79.99 a year.`);
    expect(manageSummary(sub({ status: 'trialing', cancelAtPeriodEnd: true }), NOW).line).toBe(`Your trial ends on ${end}. You won't be charged.`);
  });

  it('stays calm about a failed payment and still lets the player cancel', () => {
    expect(manageSummary(sub({ status: 'past_due', billingIssue: true }), NOW)).toMatchObject({ canCancel: true, line: "Your last payment didn't go through. Pro stays on while we retry." });
  });

  it('describes a pause inside and after the paid period', () => {
    const back = billingDate(inDays(40), NOW);
    expect(manageSummary(sub({ status: 'paused', pausedUntil: inDays(40) }), NOW)).toEqual({
      title: 'Aced Pro yearly',
      line: `Pro stays on until ${end}. Then it pauses until ${back}.`,
      canCancel: false,
      resume: 'Cancel the pause',
    });
    expect(manageSummary(sub({ status: 'paused', currentPeriodEnd: inDays(-3), pausedUntil: inDays(40) }), NOW)).toMatchObject({
      line: `Paused until ${back}. Billing starts again then.`,
      resume: 'Resume Pro today',
    });
  });

  it('shows invites and the free plan without a cancel button', () => {
    expect(manageSummary(sub({ plan: 'invite', status: 'none', store: null, bonusUntil: inDays(20) }), NOW)).toMatchObject({
      title: 'Aced Pro from invites',
      canCancel: false,
    });
    expect(manageSummary(sub({ plan: null, status: 'none', store: null }), NOW)).toEqual({ title: 'Free plan', line: 'Every track has free lessons.', canCancel: false });
    expect(manageSummary(sub({ status: 'canceled' }), NOW).canCancel).toBe(false);
  });

  it('needs a store to cancel through', () => {
    expect(manageSummary(sub({ store: null }), NOW).canCancel).toBe(false);
  });

  it('writes dates the voice guide way', () => {
    expect(billingDate('2026-10-23T12:00:00Z', NOW)).toBe('Oct 23');
    expect(billingDate('2027-10-23T12:00:00Z', NOW)).toBe('Oct 23, 2027');
  });
});

describe('the one offer', () => {
  it('words the coupon from what Stripe says', () => {
    expect(offerCopy(coupon)).toEqual({ title: 'Stay for less', body: ['Keep Pro with 30% off your next payment.', 'Everything in Pro stays the same.'], action: 'Take 30% off' });
    expect(couponShort({ ...coupon, percentOff: null, amountOff: 20 } as Extract<CancelOffer, { kind: 'coupon' }>)).toBe('$20 off');
  });

  it('computes the yearly switch rather than typing it', () => {
    const copy = offerCopy({ kind: 'annual' });
    expect(copy.action).toBe('Switch to yearly');
    expect(copy.body[0]).toBe("Yearly is $79.99 a year. That's $6.66 a month.");
    expect(copy.body[1]).toBe('You save 55% against monthly.');
  });

  it('names the pause length on the button', () => {
    expect(offerCopy({ kind: 'pause', months: [1, 2] }).action).toBe('Pause for 1 month');
    expect(offerCopy({ kind: 'pause', months: [1, 2] }, 2).action).toBe('Pause for 2 months');
  });

  it('follows the voice rules everywhere', () => {
    const lines: string[] = [];
    const all: CancelOffer[] = [coupon, { kind: 'annual' }, { kind: 'pause', months: [1, 2] }];
    for (const o of all) {
      const c = offerCopy(o);
      lines.push(c.title, c.action, ...c.body);
      // Buttons start with a verb.
      expect(c.action).toMatch(/^(Take|Switch|Pause)\b/);
    }
    for (const r of CANCEL_REASONS) lines.push(CANCEL_REASON_LABELS[r], reasonNote(r));
    const after = sub({ pausedUntil: inDays(60), offers: { ...noOffers, too_expensive: coupon } });
    for (const kind of ['canceled', 'coupon', 'annual', 'pause'] as const) {
      const c = outcomeCopy(kind, after, false, NOW);
      lines.push(c.title, ...c.body);
    }
    const trial = outcomeCopy('canceled', after, true, NOW);
    lines.push(trial.title, ...trial.body);
    voice(lines);
  });
});

describe('the confirmation', () => {
  const end = billingDate(inDays(7), NOW);

  it('states the end date and that the free plan and progress stay', () => {
    const c = outcomeCopy('canceled', sub({ cancelAtPeriodEnd: true }), false, NOW);
    expect(c.title).toBe(`Aced Pro ends on ${end}`);
    expect(c.body.join(' ')).toContain("you're on the free plan");
    expect(c.body.join(' ')).toContain('progress all stay');
  });

  it('tells a cancelled trial it will not be charged', () => {
    const c = outcomeCopy('canceled', sub({ status: 'trialing', cancelAtPeriodEnd: true }), true, NOW);
    expect(c.title).toBe('Your trial is cancelled');
    expect(c.body[0]).toBe(`Pro stays on until ${end}. You won't be charged.`);
  });

  it('gives the dates of a pause', () => {
    const c = outcomeCopy('pause', sub({ status: 'paused', pausedUntil: inDays(37) }), false, NOW);
    expect(c.body).toEqual([`Pro stays on until ${end}.`, `Billing starts again on ${billingDate(inDays(37), NOW)}.`, 'You can resume sooner in Account.']);
  });
});

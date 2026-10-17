import { beforeEach, describe, expect, it } from 'vitest';
import { runPauseResumes } from '../src/billing.ts';
import { FOUNDING_SEATS } from '../src/lifecycle.ts';
import { harness } from './harness.ts';

let h: ReturnType<typeof harness>;
beforeEach(() => {
  h = harness();
});

const DAY_MS = 86_400_000;
const lastPost = () => h.stripe.calls.filter((c) => c.method === 'POST' && c.path.startsWith('subscriptions/')).at(-1)!;
const feedback = () => h.db.prepare('SELECT reason, detail, offer_shown, offer_taken FROM cancel_feedback').all();

describe('subscription status', () => {
  it('reports the plan, period end, cancel state, billing issue and offers', async () => {
    const { token, user } = await h.signIn();
    let sub = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(sub).toMatchObject({ plan: null, status: 'none', currentPeriodEnd: null, cancelAtPeriodEnd: false, billingIssue: false, store: null });
    expect(sub.offers.too_expensive).toBeNull();

    await h.subscribe(user.id, 'annual');
    sub = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(sub).toMatchObject({ plan: 'annual', status: 'active', cancelAtPeriodEnd: false, store: 'stripe', pausedUntil: null });
    expect(Date.parse(sub.currentPeriodEnd) - h.state.clock.getTime()).toBe(20 * DAY_MS);
    expect(sub.offers).toEqual({
      too_expensive: { kind: 'coupon', text: '30% off your next payment', percentOff: 30, amountOff: null, duration: 'once', months: null },
      not_using: { kind: 'pause', months: [1, 2] },
      missing_feature: null,
      finished: null,
      technical: null,
      other: null,
    });
    expect((await h.call('GET', '/api/billing/subscription')).status).toBe(401);
  });

  it('finds the subscription in Stripe for accounts that paid before it was stored', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'monthly');
    h.db.prepare('UPDATE users SET stripe_subscription = NULL, sub_status = NULL WHERE id = ?').run(user.id);
    const sub = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(sub).toMatchObject({ status: 'active', plan: 'monthly' });
    expect(h.stripe.calls.some((c) => c.path.startsWith('subscriptions?customer=cus_1'))).toBe(true);
  });
});

describe('cancel flow', () => {
  it('cancels at the period end without an offer and keeps Pro until then', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'annual');
    const res = await (await h.call('POST', '/api/billing/cancel', { reason: 'finished', detail: '  Got what I needed.\n' }, token)).json();
    expect(res.outcome).toBe('canceled');
    expect(lastPost().params).toEqual({ cancel_at_period_end: true });
    expect(res.subscription).toMatchObject({ status: 'active', cancelAtPeriodEnd: true });
    expect(res.user.access.pro).toBe(true);
    expect(feedback()).toEqual([{ reason: 'finished', detail: 'Got what I needed.', offer_shown: null, offer_taken: 0 }]);
    // Already cancelling: no offers, and resume undoes it.
    expect(res.subscription.offers.not_using).toBeNull();
    const back = await (await h.call('POST', '/api/billing/resume', {}, token)).json();
    expect(lastPost().params).toEqual({ cancel_at_period_end: false });
    expect(back.subscription.cancelAtPeriodEnd).toBe(false);
  });

  it('cancels without a reason, and offers nothing then', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'annual');
    expect((await h.call('POST', '/api/billing/cancel', { acceptOffer: true }, token)).status).toBe(409);
    expect((await (await h.call('POST', '/api/billing/cancel', {}, token)).json()).outcome).toBe('canceled');
    expect(feedback()).toEqual([{ reason: 'none', detail: null, offer_shown: null, offer_taken: 0 }]);
  });

  it('cancels even when an offer was shown, and records that it was', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'annual');
    const res = await (await h.call('POST', '/api/billing/cancel', { reason: 'too_expensive' }, token)).json();
    expect(res.outcome).toBe('canceled');
    expect(feedback()).toEqual([{ reason: 'too_expensive', detail: null, offer_shown: 'coupon:RETAIN30', offer_taken: 0 }]);
  });

  it('applies the coupon on price, at most once in 12 months', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'annual');
    const res = await (await h.call('POST', '/api/billing/cancel', { reason: 'too_expensive', acceptOffer: true }, token)).json();
    expect(res.outcome).toBe('coupon');
    expect(lastPost().params).toEqual({ discounts: [{ coupon: 'RETAIN30' }], cancel_at_period_end: false });
    expect(feedback()).toEqual([{ reason: 'too_expensive', detail: null, offer_shown: 'coupon:RETAIN30', offer_taken: 1 }]);
    // The next time, no coupon: the offer is gone and taking it is refused.
    expect(res.subscription.offers.too_expensive).toBeNull();
    expect((await h.call('POST', '/api/billing/cancel', { reason: 'too_expensive', acceptOffer: true }, token)).status).toBe(409);
    // A year and a day later it is back.
    h.state.clock = new Date(h.state.clock.getTime() + 366 * DAY_MS);
    h.stripe.subs.get('sub_1')!.items = { data: [{ id: 'si_1', price: { id: 'price_annual' }, current_period_end: Math.floor(h.state.clock.getTime() / 1000) + 86400 }] };
    await h.webhook('customer.subscription.updated', h.stripe.subs.get('sub_1')!);
    // Sign in again: a sign in unused for a year has expired.
    const again = await h.signIn();
    const later = await (await h.call('GET', '/api/billing/subscription', undefined, again.token)).json();
    expect(later.offers.too_expensive).toMatchObject({ kind: 'coupon' });
  });

  it('offers a monthly player yearly on price and switches them', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'monthly');
    const sub = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(sub.offers.too_expensive).toEqual({ kind: 'annual' });
    // The coupon is never asked about for a monthly player.
    expect(h.stripe.calls.some((c) => c.path.startsWith('coupons/'))).toBe(false);
    const res = await (await h.call('POST', '/api/billing/cancel', { reason: 'too_expensive', acceptOffer: true }, token)).json();
    expect(res.outcome).toBe('annual');
    expect(lastPost().params).toEqual({ items: [{ id: 'si_1', price: 'price_annual' }], proration_behavior: 'always_invoice', cancel_at_period_end: false });
    expect(res.subscription).toMatchObject({ plan: 'annual', status: 'active' });
  });

  it('pauses after the paid period, then resumes on its own with a fresh period', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'annual', { days: 20 });
    const paidThrough = new Date(h.state.clock.getTime() + 20 * DAY_MS).toISOString();
    const res = await (await h.call('POST', '/api/billing/cancel', { reason: 'not_using', acceptOffer: true, pauseMonths: 2 }, token)).json();
    expect(res.outcome).toBe('pause');
    expect(lastPost().params).toEqual({ pause_collection: { behavior: 'void' }, cancel_at_period_end: false });
    expect(res.subscription).toMatchObject({ status: 'paused', currentPeriodEnd: paidThrough });
    expect(res.subscription.pausedUntil).toBe(new Date(Date.parse(paidThrough) + 61 * DAY_MS).toISOString());
    expect(feedback()).toEqual([{ reason: 'not_using', detail: null, offer_shown: 'pause', offer_taken: 1 }]);

    // Pro to the end of what was paid, even when Stripe moves the period on.
    expect(res.user.access).toMatchObject({ pro: true, until: paidThrough });
    h.state.clock = new Date(h.state.clock.getTime() + 25 * DAY_MS);
    const s = h.stripe.subs.get('sub_1')!;
    (s.items as { data: { current_period_end: number }[] }).data[0].current_period_end = Math.floor(h.state.clock.getTime() / 1000) + 340 * 86400;
    await h.webhook('customer.subscription.updated', s);
    let me = (await (await h.call('GET', '/api/me', undefined, token)).json()).user;
    expect(me.access.pro).toBe(false);

    // Not due yet: nothing happens.
    expect(await runPauseResumes(h.db, h.config, h.stripe.call, h.state.clock)).toBe(0);
    h.state.clock = new Date(Date.parse(res.subscription.pausedUntil) + 60_000);
    expect(await runPauseResumes(h.db, h.config, h.stripe.call, h.state.clock)).toBe(1);
    expect(lastPost().params).toEqual({ pause_collection: '', billing_cycle_anchor: 'now', proration_behavior: 'none' });
    me = (await (await h.call('GET', '/api/me', undefined, token)).json()).user;
    expect(me.access.pro).toBe(true);
    const after = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(after).toMatchObject({ status: 'active', pausedUntil: null });
  });

  it('ends a pause early inside the paid period without a new charge', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'monthly');
    await h.call('POST', '/api/billing/cancel', { reason: 'not_using', acceptOffer: true }, token);
    const back = await (await h.call('POST', '/api/billing/resume', {}, token)).json();
    expect(lastPost().params).toEqual({ pause_collection: '' });
    expect(back.subscription).toMatchObject({ status: 'active', pausedUntil: null });
  });

  it('gives a trial no offers but lets it cancel', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'annual', { status: 'trialing', days: 5 });
    const sub = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(sub.status).toBe('trialing');
    expect(Object.values(sub.offers).every((o) => o === null)).toBe(true);
    expect((await h.call('POST', '/api/billing/cancel', { reason: 'not_using', acceptOffer: true }, token)).status).toBe(409);
    expect((await (await h.call('POST', '/api/billing/cancel', { reason: 'not_using' }, token)).json()).outcome).toBe('canceled');
  });

  it('checks the reason and that there is something to cancel', async () => {
    const { token, user } = await h.signIn();
    expect((await h.call('POST', '/api/billing/cancel', { reason: 'bored' }, token)).status).toBe(400);
    expect((await h.call('POST', '/api/billing/cancel', {}, token)).status).toBe(404);
    expect((await h.call('POST', '/api/billing/cancel', { reason: 'other' }, token)).status).toBe(404);
    expect((await h.call('POST', '/api/billing/resume', {}, token)).status).toBe(409);
    await h.subscribe(user.id, 'annual');
    expect((await h.call('POST', '/api/billing/resume', {}, token)).status).toBe(409);
  });
});

describe('billing issues', () => {
  it('flags a failed payment, keeps Pro through the retries and clears on payment', async () => {
    const { token, user } = await h.signIn();
    const sub = await h.subscribe(user.id, 'monthly');
    await h.webhook('invoice.payment_failed', { customer: 'cus_1' });
    // Stripe moves the subscription to past_due and opens the next period while it retries.
    await h.webhook('customer.subscription.updated', { ...sub, status: 'past_due' });
    let me = (await (await h.call('GET', '/api/me', undefined, token)).json()).user;
    expect(me.access).toMatchObject({ pro: true, billingIssue: true });
    let s = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(s).toMatchObject({ status: 'past_due', billingIssue: true });
    // A second failure keeps the first date, so the emails are not repeated.
    const first = (h.db.prepare('SELECT billing_issue_at FROM users').get() as { billing_issue_at: string }).billing_issue_at;
    h.state.clock = new Date(h.state.clock.getTime() + 3 * DAY_MS);
    await h.webhook('invoice.payment_failed', { customer: 'cus_1' });
    expect(h.db.prepare('SELECT billing_issue_at FROM users').get()).toEqual({ billing_issue_at: first });

    await h.webhook('invoice.paid', { customer: 'cus_1', amount_paid: 1499 });
    await h.webhook('customer.subscription.updated', { ...sub, status: 'active' });
    me = (await (await h.call('GET', '/api/me', undefined, token)).json()).user;
    expect(me.access).toMatchObject({ pro: true, billingIssue: false });
    s = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(s.billingIssue).toBe(false);
  });

  it('opens the billing portal for the card and comes back to Account', async () => {
    const { token, user } = await h.signIn();
    await h.subscribe(user.id, 'monthly');
    expect((await (await h.call('POST', '/api/billing/portal', {}, token)).json()).url).toBe('https://billing.stripe.test/p1');
    expect(h.stripe.calls.at(-1)!.params).toMatchObject({ customer: 'cus_1', return_url: 'https://aced.example/account' });
  });

  it('marks churn only for a subscription that was paid for', async () => {
    const a = await h.signIn('a@example.com');
    const paid = await h.subscribe(a.user.id, 'monthly');
    await h.webhook('customer.subscription.deleted', { ...paid, status: 'canceled', ended_at: Math.floor(h.state.clock.getTime() / 1000) });
    expect(h.db.prepare('SELECT churned_at FROM users WHERE id = ?').get(a.user.id)).toEqual({ churned_at: h.state.clock.toISOString() });

    const b = await h.signIn('b@example.com');
    const trial = await h.subscribe(b.user.id, 'annual', { status: 'trialing', customer: 'cus_2', id: 'sub_2' });
    await h.webhook('customer.subscription.deleted', { ...trial, metadata: { user_id: b.user.id }, status: 'canceled', ended_at: Math.floor(h.state.clock.getTime() / 1000) });
    expect(h.db.prepare('SELECT churned_at FROM users WHERE id = ?').get(b.user.id)).toEqual({ churned_at: null });
  });
});

describe('founding members (lifetime)', () => {
  it('reports the price, seats and how many are taken', async () => {
    expect(await (await h.call('GET', '/api/billing/founding')).json()).toEqual({ price: 79.99, seats: 500, taken: 0, left: 500, open: true });
  });

  it('opens a one time checkout that holds a seat', async () => {
    const { token, user } = await h.signIn();
    const res = await (await h.call('POST', '/api/billing/lifetime', {}, token)).json();
    expect(res.url).toBe('https://checkout.stripe.test/1');
    const session = h.stripe.calls.find((c) => c.path === 'checkout/sessions')!.params!;
    expect(session).toMatchObject({
      mode: 'payment',
      client_reference_id: user.id,
      line_items: [{ price: 'price_lifetime', quantity: 1 }],
      metadata: { kind: 'lifetime', user_id: user.id },
      success_url: 'https://aced.example/pro?checkout=success&plan=lifetime',
    });
    expect(session.expires_at).toBe(Math.floor(h.state.clock.getTime() / 1000) + 31 * 60);
    expect(await (await h.call('GET', '/api/billing/founding')).json()).toMatchObject({ taken: 0, left: 499 });
    // A second try replaces the first hold instead of taking another seat.
    await h.call('POST', '/api/billing/lifetime', {}, token);
    expect(await (await h.call('GET', '/api/billing/founding')).json()).toMatchObject({ left: 499 });
    // The hold lapses with the checkout.
    h.state.clock = new Date(h.state.clock.getTime() + 40 * 60_000);
    expect(await (await h.call('GET', '/api/billing/founding')).json()).toMatchObject({ left: 500 });
  });

  it('gives Pro forever on payment and cancels a running subscription', async () => {
    const first = await h.signIn();
    const { user } = first;
    let { token } = first;
    await h.subscribe(user.id, 'monthly');
    await h.call('POST', '/api/billing/lifetime', {}, token);
    await h.webhook('checkout.session.completed', {
      id: 'cs_1',
      mode: 'payment',
      payment_status: 'paid',
      client_reference_id: user.id,
      customer: 'cus_1',
      metadata: { kind: 'lifetime', user_id: user.id },
    });
    expect(lastPost()).toMatchObject({ path: 'subscriptions/sub_1', params: { cancel_at_period_end: true } });
    // The subscription's own updates no longer change the plan.
    await h.webhook('customer.subscription.deleted', { ...h.stripe.subs.get('sub_1')!, status: 'canceled', ended_at: 1 });
    // Years later, still Pro, with no end date and nothing to renew or cancel.
    h.state.clock = new Date(h.state.clock.getTime() + 10 * 365 * DAY_MS);
    ({ token } = await h.signIn());
    const me = (await (await h.call('GET', '/api/me', undefined, token)).json()).user;
    expect(me.access).toEqual({ pro: true, until: null, plan: 'lifetime', trialing: false, lifetime: true, billingIssue: false });
    const sub = await (await h.call('GET', '/api/billing/subscription', undefined, token)).json();
    expect(sub).toMatchObject({ plan: 'lifetime', status: 'lifetime', currentPeriodEnd: null });
    expect(Object.values(sub.offers).every((o) => o === null)).toBe(true);
    expect((await h.call('POST', '/api/billing/cancel', { reason: 'other' }, token)).status).toBe(409);
    expect((await h.call('POST', '/api/billing/lifetime', {}, token)).status).toBe(409);
    expect((await h.call('POST', '/api/billing/checkout', { plan: 'annual' }, token)).status).toBe(409);
    expect(await (await h.call('GET', '/api/billing/founding')).json()).toMatchObject({ taken: 1 });
  });

  it('ignores an unpaid session and frees an expired one', async () => {
    const { token, user } = await h.signIn();
    await h.call('POST', '/api/billing/lifetime', {}, token);
    await h.webhook('checkout.session.completed', { id: 'cs_1', mode: 'payment', payment_status: 'unpaid', client_reference_id: user.id, metadata: { kind: 'lifetime' } });
    expect((await (await h.call('GET', '/api/me', undefined, token)).json()).user.access.pro).toBe(false);
    await h.webhook('checkout.session.expired', { id: 'cs_1', metadata: { kind: 'lifetime' } });
    expect(await (await h.call('GET', '/api/billing/founding')).json()).toMatchObject({ left: 500 });
  });

  it('refuses with a clear message when every seat is taken, counting held ones', async () => {
    const insert = h.db.prepare('INSERT INTO lifetime_checkouts (session_id, user_id, created_at, expires_at, completed_at) VALUES (?, ?, ?, ?, ?)');
    for (let i = 0; i < FOUNDING_SEATS - 1; i++) insert.run(`cs_old_${i}`, `u${i}`, 'x', 'x', '2026-10-01T00:00:00Z');
    const a = await h.signIn('a@example.com');
    const b = await h.signIn('b@example.com');
    expect((await h.call('POST', '/api/billing/lifetime', {}, a.token)).status).toBe(200);
    const full = await h.call('POST', '/api/billing/lifetime', {}, b.token);
    expect(full.status).toBe(409);
    expect((await full.json()).error).toBe('All 500 founding seats are taken. Yearly Pro costs the same and is still open.');
    expect(await (await h.call('GET', '/api/billing/founding')).json()).toMatchObject({ taken: 499, left: 0, open: false });
  });

  it('is off without a lifetime price', async () => {
    h = harness({ STRIPE_PRICE_LIFETIME: '' });
    const { token } = await h.signIn();
    expect((await h.call('POST', '/api/billing/lifetime', {}, token)).status).toBe(503);
    expect((await (await h.call('GET', '/api/billing/founding')).json()).open).toBe(false);
  });
});

describe('win-back checkout', () => {
  it('applies the coupon only inside the win-back window, once', async () => {
    const { token, user } = await h.signIn();
    const sub = await h.subscribe(user.id, 'monthly');
    await h.webhook('customer.subscription.deleted', { ...sub, status: 'canceled', ended_at: Math.floor(h.state.clock.getTime() / 1000) });
    const checkout = async () => {
      await h.call('POST', '/api/billing/checkout', { plan: 'annual', offer: 'winback' }, token);
      return h.stripe.calls.filter((c) => c.path === 'checkout/sessions').at(-1)!.params!;
    };
    // Too soon: the usual checkout with promotion codes.
    expect(await checkout()).toMatchObject({ allow_promotion_codes: true });
    h.state.clock = new Date(h.state.clock.getTime() + 61 * DAY_MS);
    const offer = await checkout();
    expect(offer).toMatchObject({ discounts: [{ coupon: 'RETAIN30' }], metadata: { offer: 'winback' } });
    expect(offer.allow_promotion_codes).toBeUndefined();
    await h.webhook('checkout.session.completed', { id: 'cs_9', mode: 'subscription', client_reference_id: user.id, customer: 'cus_1', metadata: { offer: 'winback' } });
    expect(await checkout()).toMatchObject({ allow_promotion_codes: true });
  });
});

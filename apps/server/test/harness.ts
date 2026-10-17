import { createHmac } from 'node:crypto';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { type Db, openDb } from '../src/db.ts';
import { createFlags } from '../src/flags.ts';
import type { MailOptions, StripeCall } from '../src/services.ts';

/** Responses are read loosely in tests; each assertion checks the shape it needs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Res = Omit<Response, 'json'> & { json(): Promise<any> };

export const ENV = {
  DEV_CODES: '1',
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ANNUAL: 'price_annual',
  STRIPE_PRICE_MONTHLY: 'price_monthly',
  STRIPE_PRICE_LIFETIME: 'price_lifetime',
  STRIPE_RETENTION_COUPON: 'RETAIN30',
  APP_URL: 'https://aced.example',
  SERVER_URL: 'https://api.aced.example',
  MAIL_POSTAL_ADDRESS: 'Aced, 1 Main St, Toronto ON',
  LIFECYCLE_HOLDOUT: '0.1',
};

const DAY = 86_400;

/**
 * A small Stripe that remembers subscriptions, so the cancel flow can be
 * followed end to end. Each call is recorded.
 */
export function fakeStripe(clock: () => Date) {
  const calls: { method: string; path: string; params?: Record<string, unknown> }[] = [];
  const subs = new Map<string, Record<string, unknown>>();
  /** The customer's charges, newest first, for refunds and receipts. */
  const charges: { id: string; paid: boolean; refunded: boolean; amount: number }[] = [{ id: 'ch_1', paid: true, refunded: false, amount: 7999 }];
  let sessions = 0;
  const call: StripeCall = async (method, path, params) => {
    calls.push({ method, path, params });
    if (path === 'customers') return { id: 'cus_1' };
    if (path === 'checkout/sessions') return { id: `cs_${++sessions}`, url: `https://checkout.stripe.test/${sessions}` };
    if (path === 'billing_portal/sessions') return { url: 'https://billing.stripe.test/p1' };
    if (path.startsWith('coupons/')) return { id: 'RETAIN30', valid: true, percent_off: 30, duration: 'once' };
    if (path.startsWith('subscriptions?')) return { data: [...subs.values()] };
    if (path.startsWith('charges?')) return { data: charges };
    if (path === 'refunds') {
      const ch = charges.find((c) => c.id === params?.charge);
      if (ch) ch.refunded = true;
      return { id: 're_1', charge: params?.charge };
    }
    if (path.startsWith('charges/')) return { id: path.slice(8), ...params };
    const id = path.match(/^subscriptions\/(.+)$/)?.[1];
    if (id) {
      const sub = subs.get(id);
      if (!sub) throw new Error(`Stripe subscriptions/${id}: No such subscription`);
      if (method === 'DELETE') {
        sub.status = 'canceled';
        return structuredClone(sub);
      }
      if (method === 'POST' && params) {
        const now = Math.floor(clock().getTime() / 1000);
        if ('cancel_at_period_end' in params) sub.cancel_at_period_end = params.cancel_at_period_end;
        if ('pause_collection' in params) sub.pause_collection = params.pause_collection === '' ? null : params.pause_collection;
        if (params.discounts) sub.discounts = params.discounts;
        const items = params.items as { price: string }[] | undefined;
        if (items) {
          sub.items = { data: [{ id: 'si_1', price: { id: items[0].price }, current_period_end: now + 365 * DAY }] };
        }
        if (params.billing_cycle_anchor === 'now') {
          const yearly = (sub.items as { data: { price: { id: string } }[] }).data[0].price.id === 'price_annual';
          (sub.items as { data: { current_period_end: number }[] }).data[0].current_period_end = now + (yearly ? 365 : 30) * DAY;
        }
      }
      return structuredClone(sub);
    }
    return {};
  };
  return { call, calls, subs, charges };
}

export function harness(env: Record<string, string> = {}) {
  const state = {
    clock: new Date('2026-10-14T15:00:00Z'),
    random: 0.5,
    mail: [] as { to: string; subject: string; text: string; options?: MailOptions }[],
  };
  const now = () => state.clock;
  const db: Db = openDb(':memory:');
  const config = loadConfig({ ...ENV, ...env });
  const stripe = fakeStripe(now);
  const mailer = { send: async (to: string, subject: string, text: string, options?: MailOptions) => void state.mail.push({ to, subject, text, options }) };
  const flags = createFlags(db, config);
  const app = createApp({ db, config, mailer, stripe: stripe.call, now, random: () => state.random, flags });

  const call = (method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}): Promise<Res> =>
    app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    }) as unknown as Promise<Res>;

  const signIn = async (email = 'player@example.com') => {
    const start = await (await call('POST', '/api/auth/start', { email })).json();
    const res = await call('POST', '/api/auth/verify', { email, code: start.devCode });
    state.mail.length = 0;
    return (await res.json()) as { token: string; user: { id: string; access: { pro: boolean } } };
  };

  let events = 0;
  /** Sends a signed webhook event. */
  const webhook = (type: string, object: Record<string, unknown>) => {
    const payload = JSON.stringify({ id: `evt_${++events}`, type, data: { object } });
    const t = Math.floor(state.clock.getTime() / 1000);
    const sig = `t=${t},v1=${createHmac('sha256', 'whsec_test').update(`${t}.${payload}`).digest('hex')}`;
    return call('POST', '/api/billing/webhook', payload, undefined, { 'Stripe-Signature': sig });
  };

  /** A paying subscriber: the subscription exists in the fake Stripe and Aced heard about it. */
  const subscribe = async (userId: string, plan: 'annual' | 'monthly', opts: { status?: string; days?: number; customer?: string; id?: string } = {}) => {
    const customer = opts.customer ?? 'cus_1';
    const id = opts.id ?? 'sub_1';
    const t = Math.floor(state.clock.getTime() / 1000);
    const sub: Record<string, unknown> = {
      id,
      customer,
      status: opts.status ?? 'active',
      metadata: { user_id: userId },
      cancel_at_period_end: false,
      pause_collection: null,
      items: { data: [{ id: 'si_1', price: { id: `price_${plan}` }, current_period_end: t + (opts.days ?? 20) * DAY }] },
    };
    if (opts.status === 'trialing') sub.trial_end = t + (opts.days ?? 20) * DAY;
    stripe.subs.set(id, sub);
    db.prepare('UPDATE users SET stripe_customer = ? WHERE id = ?').run(customer, userId);
    await webhook('customer.subscription.created', sub);
    if (opts.status !== 'trialing') await webhook('invoice.paid', { customer, amount_paid: plan === 'annual' ? 7999 : 1499 });
    return sub;
  };

  return { state, db, config, stripe, app, call, signIn, webhook, subscribe, mailer, flags };
}

import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { type Db, openDb } from '../src/db.ts';
import { REMINDER, runReminders, runTrialNotices, trialEndingNotice } from '../src/push.ts';
import type { StripeCall } from '../src/services.ts';

let db: Db;
let clock: Date;
let mail: { to: string; text: string }[];
let stripeCalls: { path: string; params?: Record<string, unknown> }[];

const config = loadConfig({
  DEV_CODES: '1',
  STRIPE_SECRET_KEY: 'sk_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_ANNUAL: 'price_annual',
  STRIPE_PRICE_MONTHLY: 'price_monthly',
  APP_URL: 'https://felt.example',
});

const fakeStripe: StripeCall = async (_method, path, params) => {
  stripeCalls.push({ path, params });
  if (path === 'customers') return { id: 'cus_1' };
  if (path === 'checkout/sessions') return { url: 'https://checkout.stripe.test/s1' };
  return { url: 'https://billing.stripe.test/p1' };
};

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDb(':memory:');
  clock = new Date('2026-10-14T15:00:00Z');
  mail = [];
  stripeCalls = [];
  app = createApp({
    db,
    config,
    mailer: { send: async (to, _subject, text) => void mail.push({ to, text }) },
    stripe: fakeStripe,
    now: () => clock,
  });
});

// Responses in tests are read loosely; each assertion checks the shape it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = Omit<Response, 'json'> & { json(): Promise<any> };

const call = (method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}): Promise<Res> =>
  app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as Promise<Res>;

async function signIn(email = 'player@example.com') {
  const start = await (await call('POST', '/api/auth/start', { email })).json();
  const res = await call('POST', '/api/auth/verify', { email, code: start.devCode });
  return (await res.json()) as { token: string; user: { id: string; access: { pro: boolean } } };
}

const backup = (n: number) => JSON.stringify({ format: 'felt-backup', version: 1, n });

describe('sign in', () => {
  it('emails a code that signs in once, creating the account', async () => {
    const start = await call('POST', '/api/auth/start', { email: ' Player@Example.com ' });
    expect(start.status).toBe(200);
    expect(mail[0].to).toBe('player@example.com');
    const code = (await start.json()).devCode as string;
    expect(mail[0].text).toContain(code);

    const ok = await call('POST', '/api/auth/verify', { email: 'player@example.com', code });
    expect(ok.status).toBe(200);
    const { token, user } = await ok.json();
    expect(user.email).toBe('player@example.com');
    expect((await call('GET', '/api/me', undefined, token)).status).toBe(200);

    // A used code cannot be replayed.
    expect((await call('POST', '/api/auth/verify', { email: 'player@example.com', code })).status).toBe(400);
  });

  it('rejects wrong and expired codes and limits attempts', async () => {
    const { devCode } = await (await call('POST', '/api/auth/start', { email: 'a@b.co' })).json();
    const wrong = devCode === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await call('POST', '/api/auth/verify', { email: 'a@b.co', code: wrong })).status).toBe(400);
    expect((await call('POST', '/api/auth/verify', { email: 'a@b.co', code: devCode })).status).toBe(429);

    const again = await (await call('POST', '/api/auth/start', { email: 'a@b.co' })).json();
    clock = new Date(clock.getTime() + 11 * 60 * 1000);
    expect((await call('POST', '/api/auth/verify', { email: 'a@b.co', code: again.devCode })).status).toBe(400);
  });

  it('limits codes per hour and needs a session for private routes', async () => {
    for (let i = 0; i < 5; i++) expect((await call('POST', '/api/auth/start', { email: 'x@y.co' })).status).toBe(200);
    expect((await call('POST', '/api/auth/start', { email: 'x@y.co' })).status).toBe(429);
    expect((await call('GET', '/api/me')).status).toBe(401);
    expect((await call('GET', '/api/me', undefined, 'not-a-token')).status).toBe(401);
  });

  it('signs out and deletes the account with its data', async () => {
    const { token } = await signIn();
    await call('PUT', '/api/sync', { baseVersion: 0, data: backup(1) }, token);
    expect((await call('DELETE', '/api/me', undefined, token)).status).toBe(200);
    expect((db.prepare('SELECT COUNT(*) AS n FROM snapshots').get() as { n: number }).n).toBe(0);
    expect((await call('GET', '/api/me', undefined, token)).status).toBe(401);
  });
});

describe('profile', () => {
  it('validates and stores reminder and league settings, with unique names', async () => {
    const a = await signIn('a@example.com');
    const b = await signIn('b@example.com');
    const res = await call('PATCH', '/api/me', { handle: 'river_rat', tz: 'America/Los_Angeles', cueMinutes: 19 * 60, reminders: true, leagues: true }, a.token);
    expect((await res.json()).user).toMatchObject({ handle: 'river_rat', tz: 'America/Los_Angeles', cueMinutes: 1140, reminders: true, leagues: true });
    expect((await call('PATCH', '/api/me', { handle: 'River_Rat' }, b.token)).status).toBe(409);
    expect((await call('PATCH', '/api/me', { handle: 'no spaces' }, b.token)).status).toBe(400);
    expect((await call('PATCH', '/api/me', { tz: 'Mars/Olympus' }, b.token)).status).toBe(400);
  });
});

describe('sync', () => {
  it('stores versioned snapshots and reports conflicts', async () => {
    const { token } = await signIn();
    expect(await (await call('GET', '/api/sync', undefined, token)).json()).toEqual({ version: 0 });
    expect((await (await call('PUT', '/api/sync', { baseVersion: 0, data: backup(1), device: 'iPhone' }, token)).json()).version).toBe(1);
    expect((await call('PUT', '/api/sync', { baseVersion: 1, data: backup(2) }, token)).status).toBe(200);
    // A device still on version 1 must not overwrite version 2.
    const stale = await call('PUT', '/api/sync', { baseVersion: 1, data: backup(3) }, token);
    expect(stale.status).toBe(409);
    expect((await stale.json()).version).toBe(2);
    const full = await (await call('GET', '/api/sync', undefined, token)).json();
    expect(full.version).toBe(2);
    expect(JSON.parse(full.data).n).toBe(2);
    const meta = await (await call('GET', '/api/sync?meta=1', undefined, token)).json();
    expect(meta.data).toBeUndefined();
  });

  it('only accepts Suited backups', async () => {
    const { token } = await signIn();
    expect((await call('PUT', '/api/sync', { baseVersion: 0, data: '{"x":1}' }, token)).status).toBe(400);
  });
});

describe('billing', () => {
  const sign = (payload: string, t = Math.floor(clock.getTime() / 1000)) =>
    `t=${t},v1=${createHmac('sha256', 'whsec_test').update(`${t}.${payload}`).digest('hex')}`;
  const event = (id: string, type: string, object: Record<string, unknown>) => JSON.stringify({ id, type, data: { object } });

  it('starts a checkout with one free trial on the yearly plan', async () => {
    const { token, user } = await signIn();
    const res = await call('POST', '/api/billing/checkout', { plan: 'annual' }, token);
    expect((await res.json()).url).toBe('https://checkout.stripe.test/s1');
    const session = stripeCalls.find((c) => c.path === 'checkout/sessions')!.params!;
    expect(session.client_reference_id).toBe(user.id);
    expect((session.subscription_data as { trial_period_days?: number }).trial_period_days).toBe(7);
    expect(session.success_url).toBe('https://felt.example/pro?checkout=success');
  });

  it('grants and ends Pro from signed subscription events, once each', async () => {
    const { token, user } = await signIn();
    const end = Math.floor(clock.getTime() / 1000) + 7 * 86400;
    const sub = { customer: 'cus_1', status: 'trialing', trial_end: end, metadata: { user_id: user.id }, items: { data: [{ price: { id: 'price_annual' }, current_period_end: end }] } };
    const payload = event('evt_1', 'customer.subscription.created', sub);
    expect((await call('POST', '/api/billing/webhook', payload, undefined, { 'Stripe-Signature': 't=1,v1=bad' })).status).toBe(400);
    expect((await call('POST', '/api/billing/webhook', payload, undefined, { 'Stripe-Signature': sign(payload) })).status).toBe(200);
    let me = (await (await call('GET', '/api/me', undefined, token)).json()).user;
    expect(me.access).toMatchObject({ pro: true, plan: 'annual', trialing: true });

    // The trial is used: the next checkout has none.
    await call('POST', '/api/billing/checkout', { plan: 'annual' }, token);
    expect((stripeCalls.at(-1)!.params!.subscription_data as { trial_period_days?: number }).trial_period_days).toBeUndefined();

    const ended = event('evt_2', 'customer.subscription.deleted', { ...sub, status: 'canceled', ended_at: Math.floor(clock.getTime() / 1000) - 1 });
    await call('POST', '/api/billing/webhook', ended, undefined, { 'Stripe-Signature': sign(ended) });
    me = (await (await call('GET', '/api/me', undefined, token)).json()).user;
    expect(me.access.pro).toBe(false);

    // A replayed event changes nothing.
    await call('POST', '/api/billing/webhook', payload, undefined, { 'Stripe-Signature': sign(payload) });
    expect((await (await call('GET', '/api/me', undefined, token)).json()).user.access.pro).toBe(false);
  });

  it('rejects old signatures', async () => {
    const payload = event('evt_3', 'customer.subscription.updated', {});
    const old = Math.floor(clock.getTime() / 1000) - 3600;
    expect((await call('POST', '/api/billing/webhook', payload, undefined, { 'Stripe-Signature': sign(payload, old) })).status).toBe(400);
  });
});

describe('Pro for everyone (testing)', () => {
  const testingApp = (env: Record<string, string>) =>
    createApp({ db, config: loadConfig({ DEV_CODES: '1', ...env }), mailer: { send: async () => undefined }, now: () => clock });

  it('is off by default and when blank', async () => {
    expect(config.proForEveryone).toBe(false);
    expect(loadConfig({ PRO_FOR_EVERYONE: '' }).proForEveryone).toBe(false);
    expect(loadConfig({ PRO_FOR_EVERYONE: 'false' }).proForEveryone).toBe(false);
    expect(loadConfig({ PRO_FOR_EVERYONE: ' TRUE ' }).proForEveryone).toBe(true);
    const health = await (await call('GET', '/api/health')).json();
    expect(health.features.proForEveryone).toBe(false);
    const { token } = await signIn();
    expect((await (await call('GET', '/api/me', undefined, token)).json()).user.access.pro).toBe(false);
    expect((await (await call('GET', '/api/coach', undefined, token)).json()).pro).toBe(false);
  });

  it('treats every signed in player as Pro and says so in health', async () => {
    app = testingApp({ PRO_FOR_EVERYONE: 'true' });
    expect((await (await call('GET', '/api/health')).json()).features.proForEveryone).toBe(true);
    const { token, user } = await signIn();
    // Pro from sign in on, with no end date so the device never reads it as lapsed.
    expect(user.access).toMatchObject({ pro: true, until: null, trialing: false });
    expect((await (await call('GET', '/api/me', undefined, token)).json()).user.access.pro).toBe(true);
    expect((await (await call('GET', '/api/coach', undefined, token)).json()).pro).toBe(true);
    // Signed out players get nothing.
    expect((await call('GET', '/api/coach')).status).toBe(401);
  });

  it('keeps a real subscription date when there is one', async () => {
    app = testingApp({ PRO_FOR_EVERYONE: 'true' });
    const { token, user } = await signIn();
    const until = new Date(clock.getTime() + 30 * 86_400_000).toISOString();
    db.prepare('UPDATE users SET pro_until = ?, plan = ? WHERE id = ?').run(until, 'annual', user.id);
    expect((await (await call('GET', '/api/me', undefined, token)).json()).user.access).toMatchObject({ pro: true, until, plan: 'annual' });
    // A lapsed one is not sent, so it cannot switch Pro off on the device.
    const lapsed = new Date(clock.getTime() - 86_400_000).toISOString();
    db.prepare('UPDATE users SET pro_until = ? WHERE id = ?').run(lapsed, user.id);
    expect((await (await call('GET', '/api/me', undefined, token)).json()).user.access).toMatchObject({ pro: true, until: null });
  });
});

describe('daily challenge stats', () => {
  it('counts each player once and ranks a result', async () => {
    const players = await Promise.all(['a', 'b', 'c', 'd'].map((n) => signIn(`${n}@example.com`)));
    const results = [[1, 1, 1, 1, 1], [1, 0, 1, 0.5, 0], [0, 0, 1, 0, 0], [1, 1, 0, 1, 1]];
    for (let i = 0; i < 4; i++) await call('POST', '/api/daily/287', { scores: results[i] }, players[i].token);
    // Replaying cannot improve a result.
    await call('POST', '/api/daily/287', { scores: [1, 1, 1, 1, 1] }, players[2].token);
    const stats = await (await call('GET', '/api/daily/287?right=4')).json();
    expect(stats.players).toBe(4);
    expect(stats.distribution).toEqual([0, 1, 1, 0, 1, 1]);
    expect(stats.items[2]).toBe(0.75);
    // Better than two players, tied with one: (2 + 0.5) / 4.
    expect(stats.percentile).toBeCloseTo(0.625);
  });
});

describe('leagues', () => {
  it('groups opted in players by rating band and ranks rating gained this week', async () => {
    const a = await signIn('a@example.com');
    const b = await signIn('b@example.com');
    const c = await signIn('c@example.com');
    expect((await call('POST', '/api/league', { rating: 1210, decisions: 5 }, a.token)).status).toBe(403);
    for (const [p, name] of [[a, 'alpha'], [b, 'bravo'], [c, 'charlie']] as const) await call('PATCH', '/api/me', { handle: name, leagues: true }, p.token);
    await call('POST', '/api/league', { rating: 1210, decisions: 5 }, a.token);
    await call('POST', '/api/league', { rating: 1250, decisions: 5 }, b.token);
    await call('POST', '/api/league', { rating: 1700, decisions: 5 }, c.token);
    await call('POST', '/api/league', { rating: 1260, decisions: 40 }, a.token);
    const table = await (await call('GET', '/api/league', undefined, a.token)).json();
    expect(table.joined).toBe(true);
    expect(table.standings.map((s: { handle: string }) => s.handle)).toEqual(['alpha', 'bravo']);
    expect(table.standings[0]).toMatchObject({ gained: 50, decisions: 40, you: true });
  });
});

describe('calibration', () => {
  it('fits a difficulty only for items with enough answers', async () => {
    const { token } = await signIn();
    const answers = Array.from({ length: 40 }, (_, i) => ({
      itemId: 'chart:9max-100-rfi-co:K9o',
      score: i % 4 === 0 ? 0 : 1,
      rating: 1300,
      at: new Date(clock.getTime() - i * 60_000).toISOString(),
    }));
    answers.push({ itemId: 'quiz:rare#2', score: 1, rating: 1300, at: clock.toISOString() });
    expect((await (await call('POST', '/api/answers', { answers }, token)).json()).stored).toBe(41);
    const cal = await (await call('GET', '/api/calibration')).json();
    expect(Object.keys(cal.items)).toEqual(['chart:9max-100-rfi-co:K9o']);
    // 75% right for 1300 players: the item is easier than 1300 by about 191 points.
    expect(cal.items['chart:9max-100-rfi-co:K9o'].difficulty).toBeCloseTo(1109, -1);
  });
});

describe('reminders', () => {
  it('sends once at the study time to players who have not studied, and drops dead subscriptions', async () => {
    const { token } = await signIn();
    await call('PATCH', '/api/me', { tz: 'America/New_York', cueMinutes: 11 * 60, reminders: true }, token);
    await call('POST', '/api/push/subscribe', { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } }, token);
    await call('POST', '/api/push/subscribe', { endpoint: 'https://push.example/gone', keys: { p256dh: 'k', auth: 'a' } }, token);
    const sent: string[] = [];
    const sender = async (sub: { endpoint: string }) => {
      sent.push(sub.endpoint);
      return sub.endpoint.endsWith('gone') ? ('gone' as const) : ('ok' as const);
    };
    // 15:00 UTC is 11:00 in New York in October.
    expect(await runReminders(db, sender, clock)).toBe(1);
    expect(sent).toHaveLength(2);
    expect(await runReminders(db, sender, new Date(clock.getTime() + 5 * 60_000))).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM push_subs').get() as { n: number }).n).toBe(1);

    // Studied today: no reminder tomorrow's check uses the new day.
    await call('PATCH', '/api/me', { lastStudyDay: '2026-10-15' }, token);
    expect(await runReminders(db, sender, new Date(clock.getTime() + 86_400_000))).toBe(0);
  });
});

describe('trial reminders', () => {
  const startTrial = (endsInHours: number) => {
    const until = new Date(clock.getTime() + endsInHours * 3_600_000).toISOString();
    db.prepare('UPDATE users SET trialing = 1, pro_until = ?, plan = ?').run(until, 'annual');
    return until;
  };

  it('sends once, 2 days before the trial ends, with the date and how to cancel', async () => {
    const { token } = await signIn();
    await call('PATCH', '/api/me', { tz: 'America/New_York' }, token);
    await call('POST', '/api/push/subscribe', { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } }, token);
    const sent: string[] = [];
    const sender = async (_sub: unknown, payload: string) => {
      sent.push(payload);
      return 'ok' as const;
    };
    startTrial(5 * 24);
    expect(await runTrialNotices(db, sender, clock)).toBe(0);
    const until = startTrial(48);
    expect(await runTrialNotices(db, sender, clock)).toBe(1);
    expect(await runTrialNotices(db, sender, new Date(clock.getTime() + 5 * 60_000))).toBe(0);
    expect(JSON.parse(sent[0])).toEqual(trialEndingNotice(until, 'America/New_York'));
    expect(JSON.parse(sent[0]).body).toBe('Suited Pro starts on Oct 16. To cancel, open Account in Suited.');
  });

  it('respects the reminder switch and needs a device to reach', async () => {
    const { token } = await signIn();
    const sender = async () => 'ok' as const;
    startTrial(48);
    expect(await runTrialNotices(db, sender, clock)).toBe(0);
    await call('POST', '/api/push/subscribe', { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } }, token);
    const me = await (await call('PATCH', '/api/me', { trialReminder: false }, token)).json();
    expect(me.user.trialReminder).toBe(false);
    expect(await runTrialNotices(db, sender, clock)).toBe(0);
  });
});

describe('what the daily reminder says', () => {
  it('names what is waiting when the device said so, and falls back to the plain line', async () => {
    const { token } = await signIn();
    await call('PATCH', '/api/me', { tz: 'America/New_York', cueMinutes: 11 * 60, reminders: true }, token);
    await call('POST', '/api/push/subscribe', { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } }, token);
    const sent: { title: string; body: string }[] = [];
    const sender = async (_sub: unknown, payload: string) => {
      sent.push(JSON.parse(payload));
      return 'ok' as const;
    };
    const me = await (await call('PATCH', '/api/me', { reminderBody: '  Hand rankings is next.\nIt takes 6 min.  ' }, token)).json();
    expect(me.user.reminderBody).toBe('Hand rankings is next. It takes 6 min.');
    await runReminders(db, sender, clock);
    expect(sent[0]).toEqual({ ...REMINDER, body: 'Hand rankings is next. It takes 6 min.' });

    await call('PATCH', '/api/me', { reminderBody: null }, token);
    await runReminders(db, sender, new Date(clock.getTime() + 86_400_000));
    expect(sent[1]).toEqual(REMINDER);
  });
});

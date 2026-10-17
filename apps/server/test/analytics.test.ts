import { describe, expect, it } from 'vitest';
import { RATE, retentionCutoff, runAnalyticsRetention, serverEvent } from '../src/analytics.ts';
import { activesByDay, activesByWeek, conversionBy, experiments, featureUsage, funnel, parseFilters, paywall, retentionBySource, retentionByWeek, revenue, vitals } from '../src/admin/metrics.ts';
import { harness } from './harness.ts';

const T0 = Date.parse('2026-10-14T15:00:00Z');
let n = 0;
const id = (s: string) => `${s}-${'x'.repeat(Math.max(0, 16 - s.length))}`;
const batch = (install: string, events: { name: string; at?: number; props?: Record<string, unknown> }[], over: Record<string, unknown> = {}) => ({
  v: 1,
  install: id(install),
  session: id(`s-${install}`),
  batch: id(`b${++n}`),
  app: 'web',
  ctx: { platform: 'ios', in_app: false, standalone: false, tzo: 0 },
  events: events.map((e) => ({ at: T0, ...e })),
  ...over,
});
const send = (h: ReturnType<typeof harness>, body: unknown, headers: Record<string, string> = {}) =>
  h.app.request('/api/events', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'text/plain', ...headers } });
const count = (h: ReturnType<typeof harness>, sql: string, ...args: unknown[]) => (h.db.prepare(sql).get(...(args as never[])) as { n: number }).n;

describe('POST /api/events', () => {
  it('stores a batch sent as text/plain and keeps no IP or user agent', async () => {
    const h = harness();
    const res = await send(h, batch('a', [{ name: 'app_open', props: { via: 'site' } }, { name: 'lesson_started', props: { lesson: 'basics/odds' } }]), {
      'User-Agent': 'Mozilla/5.0 (iPhone)',
      'X-Forwarded-For': '203.0.113.9',
    });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: 2, rejected: 0 });
    const rows = h.db.prepare('SELECT * FROM events').all() as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    const stored = JSON.stringify(h.db.prepare('SELECT * FROM events').all()) + JSON.stringify(h.db.prepare('SELECT * FROM installs').all());
    expect(stored).not.toContain('203.0.113.9');
    expect(stored).not.toContain('Mozilla');
    const cols = (h.db.prepare("SELECT name FROM pragma_table_info('events')").all() as { name: string }[]).map((c) => c.name);
    expect(cols.some((c) => /ip|agent|ua/i.test(c))).toBe(false);
  });

  it('refuses bad envelopes and drops unknown or server events', async () => {
    const h = harness();
    expect((await send(h, 'not json')).status).toBe(400);
    expect((await send(h, { v: 1 })).status).toBe(400);
    const res = await send(h, batch('b', [{ name: 'nope' }, { name: 'first_payment', props: { amount: 999 } }, { name: 'page_view' }, { name: 'app_open' }]));
    expect(await res.json()).toEqual({ accepted: 1, rejected: 3 });
    expect(count(h, "SELECT COUNT(*) AS n FROM events WHERE name = 'first_payment'")).toBe(0);
  });

  it('drops properties outside the schema', async () => {
    const h = harness();
    await send(h, batch('c', [{ name: 'cta_click' as never, props: {} }]));
    await send(h, batch('c', [{ name: 'app_open', props: { via: 'push', email: 'me@x.co', path: 'has spaces here' } }]));
    const props = (h.db.prepare("SELECT props FROM events WHERE name = 'app_open'").get() as { props: string }).props;
    expect(JSON.parse(props)).toEqual({ via: 'push' });
  });

  it('stores a resent batch once', async () => {
    const h = harness();
    const b = batch('d', [{ name: 'daily_active' }]);
    await send(h, b);
    const again = await send(h, b);
    expect(await again.json()).toMatchObject({ duplicate: true });
    expect(count(h, 'SELECT COUNT(*) AS n FROM events')).toBe(1);
  });

  it('rate limits each install', async () => {
    const h = harness();
    let last = 0;
    for (let i = 0; i <= RATE.batchesPerMinute; i++) last = (await send(h, batch('e', [{ name: 'daily_active' }]))).status;
    expect(last).toBe(429);
    // Another install is unaffected.
    expect((await send(h, batch('f', [{ name: 'daily_active' }]))).status).toBe(202);
  });

  it('refuses a batch over 50 events and a body over 64 KB', async () => {
    const h = harness();
    expect((await send(h, batch('g', Array.from({ length: 51 }, () => ({ name: 'daily_active' }))))).status).toBe(400);
    expect((await send(h, 'x'.repeat(70 * 1024), { 'Content-Length': String(70 * 1024) })).status).toBe(413);
  });

  it('accepts and drops everything while analytics is paused', async () => {
    const h = harness();
    h.flags.set('analytics.enabled', false, 'test', new Date().toISOString());
    const res = await send(h, batch('h', [{ name: 'daily_active' }]));
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ paused: true });
    expect(count(h, 'SELECT COUNT(*) AS n FROM events')).toBe(0);
  });

  it('keeps first touch and the rollups', async () => {
    const h = harness();
    h.state.clock = new Date(T0 + 2 * 86_400_000);
    await send(h, batch('i', [{ name: 'page_view' }, { name: 'cta_click' }], { app: 'site', attr: { utm_source: 'Mike', loc: 'bellagio' } }));
    await send(h, batch('i', [{ name: 'app_open', at: T0 + 60_000 }, { name: 'answer_graded', at: T0 + 120_000 }], { attr: { utm_source: 'other' } }));
    await send(h, batch('i', [{ name: 'daily_active', at: T0 + 86_400_000 }], { session: id('s-later') }));
    const inst = h.db.prepare('SELECT * FROM installs').get() as Record<string, unknown>;
    expect(inst).toMatchObject({ source: 'mike', utm_source: 'mike', loc: 'bellagio', first_app: 'site', first_day: '2026-10-14', last_day: '2026-10-15' });
    expect(count(h, 'SELECT COUNT(*) AS n FROM install_days')).toBe(2);
    const kinds = (h.db.prepare('SELECT kind FROM milestones ORDER BY kind').all() as { kind: string }[]).map((r) => r.kind);
    expect(kinds).toEqual(['app_open', 'cta', 'decision', 'visit']);
  });

  it('counts days in the player’s own time', async () => {
    const h = harness();
    // 02:00 UTC is 22:00 the day before in Toronto.
    await send(h, batch('j', [{ name: 'daily_active', at: Date.parse('2026-10-14T02:00:00Z') }], { ctx: { platform: 'ios', tzo: -240 } }));
    expect((h.db.prepare('SELECT day FROM install_days').get() as { day: string }).day).toBe('2026-10-13');
  });

  it('records experiment exposures once', async () => {
    const h = harness();
    await send(h, batch('k', [{ name: 'experiment_exposed', props: { exp: 'hero_cta', variant: 'daily' } }], { app: 'site' }));
    await send(h, batch('k', [{ name: 'experiment_exposed', props: { exp: 'hero_cta', variant: 'start' } }], { app: 'site' }));
    expect(h.db.prepare('SELECT exp, variant FROM exposures').all()).toEqual([{ exp: 'hero_cta', variant: 'daily' }]);
  });
});

describe('forget and link', () => {
  it('deletes everything an install sent', async () => {
    const h = harness();
    await send(h, batch('m', [{ name: 'app_open' }, { name: 'experiment_exposed', props: { exp: 'hero_cta', variant: 'start' } }]));
    const res = await h.app.request('/api/events/forget', { method: 'POST', body: JSON.stringify({ install: id('m') }), headers: { 'Content-Type': 'text/plain' } });
    expect(await res.json()).toEqual({ deleted: 2 });
    for (const t of ['events', 'installs', 'install_days', 'milestones', 'exposures']) expect(count(h, `SELECT COUNT(*) AS n FROM ${t}`)).toBe(0);
  });

  it('links an install to the account and copies first touch onto it, once', async () => {
    const h = harness();
    await send(h, batch('n', [{ name: 'page_view' }], { app: 'site', attr: { utm_source: 'creator1', loc: 'room9', landing: '/' } }));
    const s = await h.signIn();
    const res = await h.call('POST', '/api/events/link', { install: id('n'), created: true }, s.token);
    expect(await res.json()).toEqual({ linked: true });
    const u = h.db.prepare('SELECT first_install, first_source, first_utm_source, first_loc FROM users WHERE id = ?').get(s.user.id);
    expect(u).toEqual({ first_install: id('n'), first_source: 'creator1', first_utm_source: 'creator1', first_loc: 'room9' });
    // Another account cannot take the install, and the first touch never moves.
    const other = await h.signIn('other@example.com');
    expect(await (await h.call('POST', '/api/events/link', { install: id('n') }, other.token)).json()).toEqual({ linked: false });
    expect((h.db.prepare('SELECT user_id FROM installs').get() as { user_id: string }).user_id).toBe(s.user.id);
  });

  it('links an install the server has not heard of yet', async () => {
    const h = harness();
    const s = await h.signIn();
    await h.call('POST', '/api/events/link', { install: id('new') }, s.token);
    await send(h, batch('new', [{ name: 'app_open' }], { attr: { utm_source: 'late' } }));
    expect(h.db.prepare('SELECT user_id, source FROM installs').get()).toEqual({ user_id: s.user.id, source: 'late' });
  });

  it('needs a signed in player to link', async () => {
    const h = harness();
    expect((await h.call('POST', '/api/events/link', { install: id('q') })).status).toBe(401);
  });

  it('removes the link when the account is deleted, keeping anonymous counts', async () => {
    const h = harness();
    await send(h, batch('o', [{ name: 'app_open' }]));
    const s = await h.signIn();
    await h.call('POST', '/api/events/link', { install: id('o') }, s.token);
    await h.call('DELETE', '/api/me', undefined, s.token);
    expect(h.db.prepare('SELECT user_id FROM installs').get()).toEqual({ user_id: null });
    expect(count(h, 'SELECT COUNT(*) AS n FROM events')).toBe(1);
  });
});

describe('server events', () => {
  it('counts money under the linked install, so the funnel joins it', async () => {
    const h = harness();
    await send(h, batch('p', [{ name: 'page_view' }], { app: 'site', attr: { utm_source: 'mike' } }));
    const s = await h.signIn();
    await h.call('POST', '/api/events/link', { install: id('p'), created: true }, s.token);
    await h.subscribe(s.user.id, 'monthly');
    const names = (h.db.prepare("SELECT name FROM events WHERE app = 'server' ORDER BY id").all() as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(['subscription_started', 'first_payment']);
    const kinds = (h.db.prepare('SELECT kind FROM milestones ORDER BY kind').all() as { kind: string }[]).map((r) => r.kind);
    expect(kinds).toEqual(['paid', 'trial', 'visit']);
    expect((h.db.prepare('SELECT revenue_cents FROM users').get() as { revenue_cents: number }).revenue_cents).toBe(1499);
    // A renewal is a renewal, not a second first payment.
    await h.webhook('invoice.paid', { customer: 'cus_1', amount_paid: 1499 });
    expect(count(h, "SELECT COUNT(*) AS n FROM events WHERE name = 'subscription_renewed'")).toBe(1);
  });

  it('counts a failed payment once per episode and its recovery', async () => {
    const h = harness();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'annual');
    await h.webhook('invoice.payment_failed', { customer: 'cus_1' });
    await h.webhook('invoice.payment_failed', { customer: 'cus_1' });
    await h.webhook('invoice.paid', { customer: 'cus_1', amount_paid: 7999 });
    expect(count(h, "SELECT COUNT(*) AS n FROM events WHERE name = 'payment_failed'")).toBe(1);
    expect(count(h, "SELECT COUNT(*) AS n FROM events WHERE name = 'payment_recovered'")).toBe(1);
  });

  it('counts the cancel flow once, from the server, never from the webhook too', async () => {
    const h = harness();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'annual');
    await h.call('POST', '/api/billing/cancel', { reason: 'other' }, s.token);
    expect(count(h, "SELECT COUNT(*) AS n FROM events WHERE name = 'subscription_cancelled'")).toBe(1);
    await h.webhook('customer.subscription.updated', { ...h.stripe.subs.get('sub_1')!, cancel_at_period_end: true });
    expect(count(h, "SELECT COUNT(*) AS n FROM events WHERE name = 'subscription_cancelled'")).toBe(1);
    await h.webhook('customer.subscription.deleted', { ...h.stripe.subs.get('sub_1')!, status: 'canceled' });
    expect(count(h, "SELECT COUNT(*) AS n FROM events WHERE name = 'subscription_ended'")).toBe(1);
  });

  it('records an anonymous count when no install is linked', () => {
    const h = harness();
    serverEvent(h.db, 'email_sent', { kind: 'weekly-digest' }, { now: new Date(T0) });
    expect(h.db.prepare("SELECT install_id, props FROM events WHERE name = 'email_sent'").get()).toEqual({ install_id: null, props: '{"kind":"weekly-digest"}' });
  });
});

describe('retention', () => {
  it('deletes raw events and idle installs older than 13 months', () => {
    const h = harness();
    const now = new Date('2026-10-17T12:00:00Z');
    expect(retentionCutoff(now)).toBe('2025-09-17');
    const ins = h.db.prepare("INSERT INTO events (at, day, name, app, install_id) VALUES (0, ?, 'daily_active', 'web', ?)");
    for (let i = 0; i < 12; i++) ins.run('2025-09-01', id('old'));
    ins.run('2025-09-17', id('new'));
    h.db.prepare("INSERT INTO installs (install_id, first_at, first_day, first_session, first_app, last_day, platform) VALUES (?, 0, '2025-01-01', 's', 'web', '2025-08-01', 'ios')").run(id('old'));
    h.db.prepare("INSERT INTO installs (install_id, first_at, first_day, first_session, first_app, last_day, platform) VALUES (?, 0, '2025-01-01', 's', 'web', '2026-10-01', 'ios')").run(id('new'));
    h.db.prepare("INSERT INTO install_days (install_id, day) VALUES (?, '2025-08-01'), (?, '2026-10-01')").run(id('old'), id('new'));
    const out = runAnalyticsRetention(h.db, now, 5);
    expect(out).toEqual({ events: 12, installs: 1 });
    expect(count(h, 'SELECT COUNT(*) AS n FROM events')).toBe(1);
    expect((h.db.prepare('SELECT install_id FROM installs').all() as { install_id: string }[]).map((r) => r.install_id)).toEqual([id('new')]);
    expect(count(h, 'SELECT COUNT(*) AS n FROM install_days')).toBe(1);
  });
});

/** A small, known population: two sources, three days, one test. */
async function fixture() {
  const h = harness();
  const day = (d: number, extra = 0) => T0 + d * 86_400_000 + extra;
  h.state.clock = new Date(day(3));
  // Mike: 4 site visitors. 2 open the app, 1 answers in the same visit, 1 answers on a later visit. 1 comes back on day 1.
  for (let i = 0; i < 4; i++) {
    const evs = [{ name: 'page_view', at: day(0) }, ...(i < 2 ? [{ name: 'cta_click', at: day(0, 1000) }] : [])];
    await send(h, batch(`mike${i}`, evs, { app: 'site', attr: { utm_source: 'mike', loc: 'bellagio' } }));
    await send(h, batch(`mike${i}`, [{ name: 'experiment_exposed', at: day(0), props: { exp: 'hero_cta', variant: i % 2 ? 'daily' : 'start' } }], { app: 'site', attr: { utm_source: 'mike' } }));
  }
  await send(h, batch('mike0', [{ name: 'app_open', at: day(0, 2000) }, { name: 'answer_graded', at: day(0, 3000) }, { name: 'paywall_viewed', at: day(0, 4000), props: { from: 'onboarding' } }]));
  await send(h, batch('mike1', [{ name: 'app_open', at: day(0, 2000) }]));
  await send(h, batch('mike1', [{ name: 'answer_graded', at: day(2) }, { name: 'lesson_finished', at: day(2) }], { session: id('s-mike1-later') }));
  await send(h, batch('mike0', [{ name: 'daily_active', at: day(1) }], { session: id('s-mike0-d1') }));
  // Direct: 2 installs straight into the app on day 1, one on Android in an in-app browser.
  await send(h, batch('dir0', [{ name: 'app_open', at: day(1) }, { name: 'hand_dealt', at: day(1) }, { name: 'web_vital', at: day(1), props: { metric: 'LCP', value: 1800, rating: 'good' } }]));
  await send(h, batch('dir1', [{ name: 'app_open', at: day(1) }, { name: 'web_vital', at: day(1), props: { metric: 'LCP', value: 4200, rating: 'poor' } }], { ctx: { platform: 'android', in_app: true, tzo: 0 } }));
  // mike0 subscribes after the paywall.
  const s = await h.signIn();
  await h.call('POST', '/api/events/link', { install: id('mike0'), created: true }, s.token);
  await h.subscribe(s.user.id, 'monthly');
  return { h, now: new Date(day(3)) };
}

describe('dashboard metrics on fixture data', () => {
  const f = (over: Record<string, string> = {}) => parseFilters({ from: '2026-10-14', to: '2026-10-17', ...over }, new Date('2026-10-17T12:00:00Z'));

  it('counts active and new installs by day and week', async () => {
    const { h } = await fixture();
    const days = activesByDay(h.db, f());
    expect(days.map((d) => d.day)).toEqual(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']);
    expect(days.map((d) => d.new)).toEqual([4, 2, 0, 0]);
    expect(days[0].active).toBe(4);
    expect(days[1].active).toBe(3); // mike0 back, dir0, dir1
    expect(activesByWeek(h.db, f())[0]).toEqual({ week: '2026-10-12', active: 6 });
  });

  it('builds the funnel with activation in the first visit only', async () => {
    const { h } = await fixture();
    const site = funnel(h.db, f(), true);
    expect(site.cohort).toBe(4);
    const by = Object.fromEntries(site.steps.map((s) => [s.id, s.n]));
    expect(by).toMatchObject({ visit: 4, cta: 2, app_open: 2, activated: 1, lesson: 1, account: 0, trial: 1, paid: 1 });
    expect(site.steps.find((s) => s.id === 'cta')!.ofPrev).toBe(0.5);
    expect(funnel(h.db, f(), false).cohort).toBe(6);
  });

  it('filters by source, device and in-app browser', async () => {
    const { h } = await fixture();
    expect(funnel(h.db, f({ source: 'mike' }), false).cohort).toBe(4);
    expect(funnel(h.db, f({ source: 'direct' }), false).cohort).toBe(2);
    expect(funnel(h.db, f({ platform: 'android' }), false).cohort).toBe(1);
    expect(funnel(h.db, f({ in_app: '1' }), false).cohort).toBe(1);
    expect(activesByDay(h.db, f({ platform: 'android' }))[1].active).toBe(1);
  });

  it('computes day 1 retention among installs old enough', async () => {
    const { h } = await fixture();
    const [week] = retentionByWeek(h.db, f(), '2026-10-17');
    expect(week.key).toBe('2026-10-12');
    expect(week.size).toBe(6);
    // Day 1: mike0 came back. Six installs are old enough.
    expect(week.rates[0]).toBeCloseTo(1 / 6);
    // Day 7 and 30 are still in the future.
    expect(week.rates[1]).toBeNull();
    const bySource = retentionBySource(h.db, f(), '2026-10-17');
    expect(bySource.find((r) => r.key === 'mike')!.rates[0]).toBe(0.25);
  });

  it('converts by source, creator and card room', async () => {
    const { h } = await fixture();
    const rows = conversionBy(h.db, f(), 'source');
    expect(rows.find((r) => r.key === 'mike')).toEqual({ key: 'mike', installs: 4, appOpen: 2, activated: 1, account: 0, trial: 1, paid: 1 });
    expect(conversionBy(h.db, f(), 'loc').find((r) => r.key === 'bellagio')!.installs).toBe(4);
    expect(conversionBy(h.db, f(), 'utm_source').find((r) => r.key === '(none)')!.installs).toBe(2);
  });

  it('reports features, the paywall, tests and vitals', async () => {
    const { h, now } = await fixture();
    const feats = Object.fromEntries(featureUsage(h.db, f()).map((x) => [x.id, x.installs]));
    expect(feats).toMatchObject({ lessons: 1, play: 1, coach: 0 });
    expect(paywall(h.db, f())).toEqual([{ from: 'onboarding', views: 1, installs: 1, checkouts: 0, converted: 1 }]);
    const exps = experiments(h.db, f(), '2026-10-17');
    expect(exps.map((e) => [e.variant, e.exposed])).toEqual([
      ['daily', 2],
      ['start', 2],
    ]);
    expect(exps.find((e) => e.variant === 'start')!.paid).toBe(1);
    expect(vitals(h.db, f())).toEqual([{ metric: 'LCP', app: 'web', n: 2, p75: 4200, good: 0.5 }]);
    const rev = revenue(h.db, f(), now, 500);
    expect(rev.active.monthly).toBe(1);
    expect(rev.mrr).toBe(14.99);
    expect(rev.received).toBe(14.99);
    expect(rev.bySource.find((x) => x.source === 'mike')).toMatchObject({ accounts: 1, paying: 1, revenue: 14.99 });
  });
});

describe('query plans', () => {
  it('uses indexes for the dashboard, never a full scan of events', () => {
    const h = harness();
    const plan = (sql: string, ...args: unknown[]) =>
      (h.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...(args as never[])) as { detail: string }[]).map((r) => r.detail).join(' | ');
    const checks = [
      plan("SELECT COUNT(*) FROM events e WHERE e.name = 'hand_dealt' AND e.day BETWEEN '2026-01-01' AND '2026-02-01'"),
      plan("SELECT d.day, COUNT(*) FROM install_days d WHERE d.day BETWEEN '2026-01-01' AND '2026-02-01' GROUP BY d.day"),
      plan("SELECT COUNT(*) FROM installs i WHERE i.first_day BETWEEN '2026-01-01' AND '2026-02-01'"),
      plan("SELECT m.kind, COUNT(*) FROM installs i JOIN milestones m ON m.install_id = i.install_id WHERE i.first_day BETWEEN '2026-01-01' AND '2026-02-01' GROUP BY m.kind"),
      plan("DELETE FROM events WHERE id IN (SELECT id FROM events WHERE day < '2025-01-01' LIMIT 10)"),
      plan('SELECT * FROM events WHERE install_id = ? ORDER BY at DESC LIMIT 100', 'x'),
    ];
    for (const p of checks) {
      expect(p).not.toMatch(/SCAN events(?! USING)/);
      expect(p).toMatch(/USING (COVERING )?INDEX|USING PRIMARY KEY|SEARCH/);
    }
  });
});

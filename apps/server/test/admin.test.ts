import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/admin/auth.ts';
import { csvCell, toCsv } from '../src/admin/csv.ts';
import { checkFlagValue } from '../src/flags.ts';
import { runLifecycleEmails } from '../src/emails.ts';
import { runReminders } from '../src/push.ts';
import { harness } from './harness.ts';

const TOKEN = 'owner-token-0123456789';
const setup = () => harness({ ADMIN_TOKEN: TOKEN });
type H = ReturnType<typeof setup>;

const auth = { Authorization: `Bearer ${TOKEN}` };
const get = (h: H, path: string, headers: Record<string, string> = auth) => h.app.request(path, { headers });
const form = (h: H, path: string, fields: Record<string, string>, headers: Record<string, string> = auth) =>
  h.app.request(path, { method: 'POST', body: new URLSearchParams(fields).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers } });
const audits = (h: H) => h.db.prepare('SELECT actor, role, action, target, reason, before, after FROM audit_log ORDER BY id').all() as Record<string, string | null>[];
const act = (h: H, userId: string, action: string, extra: Record<string, string> = {}, headers = auth) =>
  form(h, `/admin/users/${userId}/action`, { action, reason: 'Support ticket 12', confirm: 'yes', ...extra }, headers);
const msg = (res: Response) => {
  const loc = new URL(res.headers.get('Location') ?? '/', 'http://x');
  return { ok: loc.searchParams.get('ok'), err: loc.searchParams.get('err'), path: loc.pathname };
};

async function cookieLogin(h: H, token = TOKEN) {
  const res = await form(h, '/admin/login', { token }, {});
  const set = res.headers.get('Set-Cookie') ?? '';
  const cookie = set.split(';')[0];
  const page = await (await h.app.request('/admin/flags', { headers: { Cookie: cookie } })).text();
  const csrf = page.match(/name="csrf" value="([^"]+)"/)?.[1];
  return { res, set, cookie, csrf };
}

describe('console access', () => {
  it('is off without ADMIN_TOKEN, as if it did not exist', async () => {
    const h = harness();
    expect((await h.app.request('/admin')).status).toBe(404);
    expect((await h.app.request('/admin/login')).status).toBe(404);
    expect((await h.app.request('/api/admin/metrics', { headers: auth })).status).toBe(404);
  });

  it('ignores a token that is too short', async () => {
    const h = harness({ ADMIN_TOKEN: 'short' });
    expect((await h.app.request('/admin/login')).status).toBe(404);
  });

  it('sends a stranger to sign in, and refuses the JSON without a token', async () => {
    const h = setup();
    const res = await h.app.request('/admin');
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/admin/login');
    expect((await h.app.request('/api/admin/metrics')).status).toBe(401);
    expect((await h.app.request('/api/admin/metrics', { headers: { Authorization: 'Bearer wrong-token-0123456789' } })).status).toBe(401);
  });

  it('serves the JSON metrics to the token in a header', async () => {
    const h = setup();
    const res = await h.app.request('/api/admin/metrics?days=7', { headers: { 'X-Admin-Token': TOKEN } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown[]>;
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['actives', 'funnel', 'retention', 'conversion', 'features', 'paywall', 'experiments', 'revenue', 'vitals', 'errors']));
    expect(body.actives).toHaveLength(7);
  });

  it('signs in once with a cookie limited to /admin, HttpOnly and SameSite Strict', async () => {
    const h = setup();
    const { res, set, cookie } = await cookieLogin(h);
    expect(res.status).toBe(303);
    expect(set).toMatch(/aced_admin=/);
    expect(set).toMatch(/Path=\/admin;/);
    expect(set).toMatch(/HttpOnly/);
    expect(set).toMatch(/SameSite=Strict/);
    expect(set).not.toContain(TOKEN);
    expect((await h.app.request('/admin', { headers: { Cookie: cookie } })).status).toBe(200);
    expect(audits(h)[0]).toMatchObject({ actor: 'owner', action: 'sign_in' });
  });

  it('refuses a forged or expired cookie', async () => {
    const h = setup();
    const { cookie } = await cookieLogin(h);
    const [name, value] = cookie.split('=');
    const [id, exp, sig] = value.split('.');
    expect((await h.app.request('/admin', { headers: { Cookie: `${name}=${id}.${Number(exp) + 1000}.${sig}` } })).status).toBe(303);
    h.state.clock = new Date(h.state.clock.getTime() + 13 * 3_600_000);
    expect((await h.app.request('/admin', { headers: { Cookie: cookie } })).status).toBe(303);
  });

  it('turns away a wrong token and slows down guessing', async () => {
    const h = setup();
    const res = await form(h, '/admin/login', { token: 'nope' }, {});
    expect(msg(res).err).toMatch(/not right/);
    for (let i = 0; i < 12; i++) await form(h, '/admin/login', { token: 'nope' }, {});
    const blocked = await form(h, '/admin/login', { token: TOKEN }, {});
    expect(msg(blocked).err).toMatch(/Too many/);
  });

  it('asks a cookie sign in for the form token, so another site cannot post', async () => {
    const h = setup();
    const s = await h.signIn();
    const { cookie, csrf } = await cookieLogin(h);
    expect(csrf).toBeTruthy();
    const without = await form(h, `/admin/users/${s.user.id}/note`, { body: 'Hello' }, { Cookie: cookie });
    expect(without.status).toBe(403);
    const withToken = await form(h, `/admin/users/${s.user.id}/note`, { body: 'Hello', csrf: csrf! }, { Cookie: cookie });
    expect(msg(withToken).ok).toBe('Note saved.');
  });

  it('logs out by clearing the cookie', async () => {
    const h = setup();
    const res = await h.app.request('/admin/logout', { method: 'POST' });
    expect(res.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
  });

  it('serves pages with a strict content policy and no caching', async () => {
    const h = setup();
    const res = await get(h, '/admin');
    expect(res.headers.get('Content-Security-Policy')).toMatch(/default-src 'none'/);
    expect(res.headers.get('Content-Security-Policy')).toMatch(/script-src 'sha256-/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('roles', () => {
  it('lets support read and write notes, and nothing else', async () => {
    const h = setup();
    const s = await h.signIn();
    const { token } = createAdmin(h.db, 'sam', 'support', { id: 'owner', name: 'owner', role: 'owner' }, new Date());
    const sam = { Authorization: `Bearer ${token}` };
    expect((await get(h, '/admin', sam)).status).toBe(200);
    expect((await get(h, `/admin/users/${s.user.id}`, sam)).status).toBe(200);
    expect(msg(await form(h, `/admin/users/${s.user.id}/note`, { body: 'Called them' }, sam)).ok).toBe('Note saved.');
    expect((await act(h, s.user.id, 'grant_pro', { days: '30' }, sam)).status).toBe(403);
    expect((await form(h, '/admin/flags/coach.enabled', { value: 'false', reason: 'test' }, sam)).status).toBe(403);
    expect((await get(h, '/admin/access', sam)).status).toBe(403);
    expect((await get(h, '/admin/export/users.csv', sam)).status).toBe(403);
    const log = audits(h);
    expect(log.find((a) => a.action === 'add_note')).toMatchObject({ actor: 'sam', role: 'support' });
  });

  it('lets the owner add an admin, shows the token once and can turn it off', async () => {
    const h = setup();
    const res = await form(h, '/admin/access', { name: 'Pat', role: 'support', reason: 'New hire' });
    const token = decodeURIComponent(new URL(res.headers.get('Location')!, 'http://x').searchParams.get('token')!);
    expect(token).toMatch(/^adm_/);
    expect(JSON.stringify(h.db.prepare('SELECT * FROM admins').all())).not.toContain(token);
    expect((await get(h, '/admin', { Authorization: `Bearer ${token}` })).status).toBe(200);
    const id = (h.db.prepare('SELECT id FROM admins').get() as { id: string }).id;
    await form(h, `/admin/access/${id}/disable`, { reason: 'Left' });
    expect((await get(h, '/admin', { Authorization: `Bearer ${token}` })).status).toBe(303);
    expect(audits(h).map((a) => a.action)).toEqual(['add_admin', 'disable_admin']);
  });
});

describe('player actions', () => {
  it('needs a reason and the confirm box, and logs before and after', async () => {
    const h = setup();
    const s = await h.signIn();
    expect(msg(await form(h, `/admin/users/${s.user.id}/action`, { action: 'grant_pro', days: '30', reason: 'x', confirm: 'yes' })).err).toMatch(/reason/);
    expect(msg(await form(h, `/admin/users/${s.user.id}/action`, { action: 'grant_pro', days: '30', reason: 'Goodwill' })).err).toMatch(/confirm/);
    expect(msg(await act(h, s.user.id, 'grant_pro', { days: '30' })).ok).toBe('Granted 30 days of Pro.');
    const me = await (await h.call('GET', '/api/me', undefined, s.token)).json();
    expect(me.user.access.pro).toBe(true);
    const row = audits(h).find((a) => a.action === 'grant_pro')!;
    expect(row).toMatchObject({ actor: 'owner', target: s.user.id, reason: 'Support ticket 12' });
    expect(JSON.parse(row.before!).bonus_until).toBeNull();
    expect(JSON.parse(row.after!).bonus_until).toBeTruthy();
    expect(msg(await act(h, s.user.id, 'revoke_pro')).ok).toMatch(/Removed granted Pro/);
    expect((await (await h.call('GET', '/api/me', undefined, s.token)).json()).user.access.pro).toBe(false);
  });

  it('logs every look at a player', async () => {
    const h = setup();
    const s = await h.signIn();
    const page = await (await get(h, `/admin/users/${s.user.id}`)).text();
    expect(page).toContain('player@example.com');
    expect(audits(h).at(-1)).toMatchObject({ action: 'view_user', target: s.user.id });
  });

  it('comps a founding place, which takes a seat', async () => {
    const h = setup();
    const s = await h.signIn();
    expect(msg(await act(h, s.user.id, 'comp_founding')).ok).toBe('Comped a founding place.');
    const me = await (await h.call('GET', '/api/me', undefined, s.token)).json();
    expect(me.user.access).toMatchObject({ pro: true, lifetime: true });
    expect((await (await h.call('GET', '/api/billing/founding')).json()).taken).toBe(1);
    expect(msg(await act(h, s.user.id, 'revoke_pro')).ok).toMatch(/founding/);
    expect((await (await h.call('GET', '/api/billing/founding')).json()).taken).toBe(0);
  });

  it('refunds the last payment in Stripe and removes Pro now', async () => {
    const h = setup();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'annual');
    expect(msg(await act(h, s.user.id, 'refund_last')).ok).toBe('Refunded $79.99 and removed Pro.');
    expect(h.stripe.calls.some((c) => c.path === 'refunds' && c.params?.charge === 'ch_1')).toBe(true);
    expect(h.stripe.calls.some((c) => c.method === 'DELETE' && c.path === 'subscriptions/sub_1')).toBe(true);
    expect((await (await h.call('GET', '/api/me', undefined, s.token)).json()).user.access.pro).toBe(false);
    expect(msg(await act(h, s.user.id, 'refund_last')).err).toMatch(/no payment left/);
  });

  it('cancels, pauses and resumes through Stripe, counting each once', async () => {
    const h = setup();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'annual');
    expect(msg(await act(h, s.user.id, 'cancel_sub')).ok).toMatch(/period end/);
    expect(msg(await act(h, s.user.id, 'cancel_sub')).err).toMatch(/already/);
    expect(msg(await act(h, s.user.id, 'resume_sub')).ok).toMatch(/back on/);
    expect(msg(await act(h, s.user.id, 'pause_sub', { months: '2' })).ok).toBe('Paused for 2 months.');
    const names = (h.db.prepare("SELECT name FROM events WHERE app = 'server' AND name LIKE 'subscription_%' ORDER BY id").all() as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(['subscription_started', 'subscription_cancelled', 'subscription_resumed', 'subscription_paused']);
  });

  it('extends a trial in Stripe', async () => {
    const h = setup();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'annual', { status: 'trialing', days: 5 });
    expect(msg(await act(h, s.user.id, 'extend_trial', { days: '7' })).ok).toBe('Trial extended by 7 days.');
    const call = h.stripe.calls.find((c) => c.params && 'trial_end' in c.params)!;
    expect(call.params!.trial_end).toBe(Math.floor(h.state.clock.getTime() / 1000) + 12 * 86_400);
    expect(msg(await act(h, s.user.id, 'extend_trial', { days: '99' })).err).toMatch(/1 to 60/);
  });

  it('resends a receipt, emails a code, unsubscribes and resets push', async () => {
    const h = setup();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'monthly');
    expect(msg(await act(h, s.user.id, 'resend_receipt')).ok).toMatch(/receipt/);
    expect(h.stripe.calls.at(-1)).toMatchObject({ path: 'charges/ch_1', params: { receipt_email: 'player@example.com' } });
    expect(msg(await act(h, s.user.id, 'send_signin_code')).ok).toBe('Sent a sign in code.');
    expect(h.state.mail.at(-1)!.subject).toMatch(/Your Aced code: \d{6}/);
    await h.call('PATCH', '/api/me', { emailOptIn: true }, s.token);
    expect(msg(await act(h, s.user.id, 'unsubscribe')).ok).toBe('Marketing email is off.');
    h.db.prepare("INSERT INTO push_subs (endpoint, user_id, p256dh, auth, created_at) VALUES ('https://push.example/1', ?, 'k', 'a', 'now')").run(s.user.id);
    expect(msg(await act(h, s.user.id, 'reset_push')).ok).toMatch(/Removed every push device/);
    expect((h.db.prepare('SELECT COUNT(*) AS n FROM push_subs').get() as { n: number }).n).toBe(0);
  });

  it('signs a player out everywhere', async () => {
    const h = setup();
    const s = await h.signIn();
    expect(msg(await act(h, s.user.id, 'sign_out_all')).ok).toBe('Ended 1 session.');
    expect((await h.call('GET', '/api/me', undefined, s.token)).status).toBe(401);
  });

  it('deletes a player only after the id or email is typed again', async () => {
    const h = setup();
    const s = await h.signIn();
    expect(msg(await act(h, s.user.id, 'delete_user', { confirm_text: 'someone else' })).err).toMatch(/Type/);
    const res = await act(h, s.user.id, 'delete_user', { confirm_text: 'PLAYER@example.com' });
    expect(msg(res)).toMatchObject({ ok: 'Deleted the player and their data.', path: '/admin/users' });
    expect(h.db.prepare('SELECT * FROM users').all()).toHaveLength(0);
    expect(audits(h).at(-1)).toMatchObject({ action: 'delete_user', target: s.user.id, after: 'null' });
  });

  it('exports a player’s data as JSON with a reason, and logs it', async () => {
    const h = setup();
    const s = await h.signIn();
    const refused = await form(h, `/admin/users/${s.user.id}/export`, { reason: 'GDPR' });
    expect(msg(refused).err).toMatch(/confirm/);
    const res = await form(h, `/admin/users/${s.user.id}/export`, { reason: 'Access request', confirm: 'yes' });
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment/);
    const data = (await res.json()) as { user: Record<string, unknown> };
    expect(data.user.email).toBe('player@example.com');
    expect(data.user.unsub_token).toBeUndefined();
    expect(JSON.stringify(data)).not.toMatch(/token_hash|public_key/);
    expect(audits(h).at(-1)).toMatchObject({ action: 'export_user', reason: 'Access request' });
  });
});

describe('flags and config', () => {
  it('checks values by kind and range', () => {
    const h = setup();
    const def = (k: string) => h.flags.def(k)!;
    expect(checkFlagValue(def('coach.enabled'), 'false')).toEqual({ ok: true, value: false });
    expect(checkFlagValue(def('coach.enabled'), 'maybe').ok).toBe(false);
    expect(checkFlagValue(def('lifecycle.holdout'), '0.2')).toEqual({ ok: true, value: 0.2 });
    expect(checkFlagValue(def('lifecycle.holdout'), '2').ok).toBe(false);
    expect(checkFlagValue(def('founding.seats'), '10.5').ok).toBe(false);
    expect(checkFlagValue(def('site.notice'), 'x'.repeat(141)).ok).toBe(false);
  });

  it('changes a flag from the console with a logged before and after, and resets it', async () => {
    const h = setup();
    expect(msg(await form(h, '/admin/flags/founding.seats', { value: '300', reason: 'Smaller run' })).ok).toMatch(/saved/);
    expect((await (await h.call('GET', '/api/billing/founding')).json()).seats).toBe(300);
    expect(audits(h).at(-1)).toMatchObject({ action: 'set_flag', target: 'flag:founding.seats', before: '500', after: '300', reason: 'Smaller run' });
    expect(msg(await form(h, '/admin/flags/founding.seats', { value: 'lots', reason: 'oops' })).err).toMatch(/number/);
    expect(msg(await form(h, '/admin/flags/founding.seats', { value: '1', reason: '' })).err).toMatch(/reason/);
    await form(h, '/admin/flags/founding.seats', { reset: '1', value: '', reason: 'Back' });
    expect((await (await h.call('GET', '/api/billing/founding')).json()).seats).toBe(500);
  });

  it('serves only public flags to browsers, with a short cache', async () => {
    const h = setup();
    h.flags.set('exp.hero_cta', false, 'test', new Date().toISOString());
    const res = await h.call('GET', '/api/config');
    expect(res.headers.get('Cache-Control')).toMatch(/max-age=60/);
    const body = await res.json();
    expect(body.flags['exp.hero_cta']).toBe(false);
    expect(body.flags['analytics.enabled']).toBe(true);
    expect(body.flags['coach.enabled']).toBeUndefined();
    expect(body.flags['lifecycle.holdout']).toBeUndefined();
  });

  it('kills the coach and closes founding', async () => {
    const h = harness({ ADMIN_TOKEN: TOKEN });
    h.flags.set('coach.enabled', false, 'test', 'now');
    expect((await (await h.call('GET', '/api/health')).json()).features.coach).toBe(false);
    h.flags.set('founding.open', false, 'test', 'now');
    expect((await (await h.call('GET', '/api/billing/founding')).json()).open).toBe(false);
    const s = await h.signIn();
    expect((await h.call('POST', '/api/billing/lifetime', {}, s.token)).status).toBe(503);
  });

  it('uses the holdout share for new accounts', async () => {
    const h = setup();
    h.state.random = 0.3;
    h.flags.set('lifecycle.holdout', 0.5, 'test', 'now');
    const s = await h.signIn();
    expect((h.db.prepare('SELECT holdout FROM users WHERE id = ?').get(s.user.id) as { holdout: number }).holdout).toBe(1);
  });

  it('rolls a percent flag out by id, the same way every time', () => {
    const h = setup();
    h.flags.set('coach.rollout', 50, 'test', 'now');
    let on = 0;
    for (let i = 0; i < 1000; i++) if (h.flags.on('coach.rollout', `user-${i}`)) on++;
    expect(on).toBeGreaterThan(430);
    expect(on).toBeLessThan(570);
    expect(h.flags.on('coach.rollout', 'user-7')).toBe(h.flags.on('coach.rollout', 'user-7'));
    h.flags.set('coach.rollout', 0, 'test', 'now');
    expect(h.flags.on('coach.rollout', 'user-7')).toBe(false);
  });

  it('stops push and email programs when paused', async () => {
    const h = setup();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'annual');
    await h.webhook('invoice.payment_failed', { customer: 'cus_1' });
    h.flags.set('program.billing-issue', false, 'test', 'now');
    expect(await runLifecycleEmails(h.db, h.mailer, h.config, h.state.clock, undefined, h.flags)).toBe(0);
    h.flags.set('program.billing-issue', true, 'test', 'now');
    h.flags.set('email.enabled', false, 'test', 'now');
    expect(await runLifecycleEmails(h.db, h.mailer, h.config, h.state.clock, undefined, h.flags)).toBe(0);
    h.flags.set('email.enabled', true, 'test', 'now');
    expect(await runLifecycleEmails(h.db, h.mailer, h.config, h.state.clock, undefined, h.flags)).toBe(1);
    expect((h.db.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'email_sent'").get() as { n: number }).n).toBe(1);
    h.flags.set('push.enabled', false, 'test', 'now');
    expect(await runReminders(h.db, async () => 'ok', h.state.clock, h.flags)).toBe(0);
  });
});

describe('docs/ADMIN.md', () => {
  it('lists every flag and every action', async () => {
    const { readFileSync } = await import('node:fs');
    const doc = readFileSync(new URL('../../../docs/ADMIN.md', import.meta.url), 'utf8');
    const h = setup();
    const missing = h.flags.defs.map((d) => d.key).filter((k) => !k.startsWith('program.') && !doc.includes(`\`${k}\``));
    expect(missing).toEqual([]);
    const { ACTIONS } = await import('../src/admin/actions.ts');
    expect(Object.values(ACTIONS).filter((a) => !doc.includes(`| ${a.label} |`))).toEqual([]);
  });
});

describe('lifecycle, operations and exports', () => {
  it('previews every program and sends a test', async () => {
    const h = setup();
    for (const p of ['trial-ending', 'billing-issue', 'weekly-digest', 'winback-offer', 'push-reminder', 'push-closing', 'push-trial-ending']) {
      const res = await get(h, `/admin/lifecycle/preview/${p}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toMatch(/<pre>/);
    }
    const res = await form(h, '/admin/lifecycle/test', { program: 'weekly-digest', to: 'me@example.com', reason: 'Check copy' });
    expect(msg(res).ok).toBe('Sent a test to me@example.com.');
    expect(h.state.mail.at(-1)).toMatchObject({ to: 'me@example.com', subject: '[Test] Your week in decisions' });
    expect(h.state.mail.at(-1)!.text).toContain('n=email.weekly-digest');
    expect(audits(h).at(-1)).toMatchObject({ action: 'send_test', target: 'program:weekly-digest' });
  });

  it('pauses a program from the lifecycle page', async () => {
    const h = setup();
    const res = await form(h, '/admin/flags/program.weekly-digest', { value: 'false', reason: 'Copy review', return: '/admin/lifecycle' });
    expect(msg(res)).toMatchObject({ path: '/admin/lifecycle' });
    expect(h.flags.bool('program.weekly-digest')).toBe(false);
  });

  it('renders every page, with charts and tables', async () => {
    const h = setup();
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'monthly');
    for (const path of ['/admin', '/admin/growth', '/admin/product', '/admin/revenue', '/admin/users', '/admin/users?q=player', `/admin/users/${s.user.id}`, '/admin/flags', '/admin/lifecycle', '/admin/ops', '/admin/audit', '/admin/access']) {
      const res = await get(h, path);
      expect(res.status, path).toBe(200);
      const text = await res.text();
      expect(text, path).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    const overview = await (await get(h, '/admin')).text();
    expect(overview).toMatch(/<svg viewBox/);
    expect(overview).toMatch(/Show the numbers/);
  });

  it('escapes what players typed', async () => {
    const h = setup();
    const s = await h.signIn();
    h.db.prepare('UPDATE users SET handle = ? WHERE id = ?').run('<script>alert(1)</script>', s.user.id);
    const text = await (await get(h, `/admin/users/${s.user.id}`)).text();
    expect(text).not.toContain('<script>alert(1)</script>');
    expect(text).toContain('&lt;script&gt;');
  });

  it('records webhook runs and failures for the health page', async () => {
    const h = setup();
    await h.app.request('/api/billing/webhook', { method: 'POST', body: '{}', headers: { 'Stripe-Signature': 't=1,v1=bad' } });
    const s = await h.signIn();
    await h.subscribe(s.user.id, 'monthly');
    const row = h.db.prepare("SELECT runs, failures, last_error FROM job_runs WHERE job = 'webhook'").get() as { runs: number; failures: number; last_error: string };
    expect(row.failures).toBe(1);
    expect(row.runs).toBeGreaterThan(1);
    expect(await (await get(h, '/admin/ops')).text()).toMatch(/1 failed/);
  });

  it('exports CSV, guards against formulas and logs personal data downloads', async () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(toCsv([{ a: 1, b: null }])).toBe('a,b\r\n1,\r\n');
    const h = setup();
    await h.signIn();
    h.db.prepare("INSERT INTO waitlist (email, list, joined_at) VALUES ('=cmd@x.co', 'ios', 'now'), ('b@x.co', 'founding', 'now')").run();
    const res = await get(h, '/admin/export/waitlist.csv?list=ios');
    expect(res.headers.get('Content-Type')).toMatch(/text\/csv/);
    const text = await res.text();
    expect(text).toContain("'=cmd@x.co");
    expect(text).not.toContain('b@x.co');
    expect(audits(h).at(-1)).toMatchObject({ action: 'export_csv', target: 'export:waitlist' });
    expect((await get(h, '/admin/export/funnel.csv')).status).toBe(200);
    expect((await get(h, '/admin/export/nothing.csv')).status).toBe(404);
  });
});

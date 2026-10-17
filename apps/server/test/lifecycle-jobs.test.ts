import { beforeEach, describe, expect, it } from 'vitest';
import { runLifecycleEmails, weekStats } from '../src/emails.ts';
import { CLOSING_NOTE, runReminders, runTrialNotices } from '../src/push.ts';
import { harness } from './harness.ts';

let h: ReturnType<typeof harness>;
beforeEach(() => {
  h = harness();
});

const DAY_MS = 86_400_000;
const later = (days: number, from = h.state.clock) => new Date(from.getTime() + days * DAY_MS);
const run = (at = h.state.clock) => runLifecycleEmails(h.db, h.mailer, h.config, at, h.stripe.call);

describe('holdout and consent at sign up', () => {
  it('puts a new account in the holdout by chance and gives it an unsubscribe token', async () => {
    h.state.random = 0.05;
    const a = await h.signIn('a@example.com');
    h.state.random = 0.5;
    const b = await h.signIn('b@example.com');
    const rows = h.db.prepare('SELECT id, holdout, unsub_token, email_opt_in FROM users ORDER BY email').all() as { id: string; holdout: number; unsub_token: string; email_opt_in: number }[];
    expect(rows.map((r) => [r.id, r.holdout, r.email_opt_in])).toEqual([
      [a.user.id, 1, 0],
      [b.user.id, 0, 0],
    ]);
    expect(rows[0].unsub_token).toMatch(/^[\w-]{40,}$/);
    // The holdout is never shown to the player.
    expect(JSON.stringify(a.user)).not.toContain('holdout');
  });

  it('uses LIFECYCLE_HOLDOUT, 0.1 by default', () => {
    expect(harness({ LIFECYCLE_HOLDOUT: '' }).config.lifecycle.holdout).toBe(0.1);
    expect(harness({ LIFECYCLE_HOLDOUT: '0.25' }).config.lifecycle.holdout).toBe(0.25);
    expect(harness({ LIFECYCLE_HOLDOUT: '2' }).config.lifecycle.holdout).toBe(0.1);
  });

  it('records opt in with its time, off by default', async () => {
    const { token, user } = await h.signIn();
    expect((user as unknown as { emailOptIn: boolean }).emailOptIn).toBe(false);
    const on = await (await h.call('PATCH', '/api/me', { emailOptIn: true }, token)).json();
    expect(on.user.emailOptIn).toBe(true);
    expect(h.db.prepare('SELECT email_opt_in, email_opt_in_at FROM users').get()).toEqual({ email_opt_in: 1, email_opt_in_at: h.state.clock.toISOString() });
    const off = await (await h.call('PATCH', '/api/me', { emailOptIn: false }, token)).json();
    expect(off.user.emailOptIn).toBe(false);
  });
});

describe('one tap unsubscribe', () => {
  it('turns marketing email off from the link or the mail app button', async () => {
    const { token } = await h.signIn();
    await h.call('PATCH', '/api/me', { emailOptIn: true }, token);
    const { unsub_token } = h.db.prepare('SELECT unsub_token FROM users').get() as { unsub_token: string };
    const page = await h.app.request(`/api/email/unsubscribe?token=${unsub_token}`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    const html = await page.text();
    expect(html).toContain("You're unsubscribed");
    expect(html.slice(html.indexOf('<body>'))).not.toMatch(/[\u2013\u2014!]/);
    expect(h.db.prepare('SELECT email_opt_in FROM users').get()).toEqual({ email_opt_in: 0 });

    await h.call('PATCH', '/api/me', { emailOptIn: true }, token);
    const post = await h.app.request(`/api/email/unsubscribe?token=${unsub_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    expect(post.status).toBe(200);
    expect(h.db.prepare('SELECT email_opt_in FROM users').get()).toEqual({ email_opt_in: 0 });
  });

  it('says so calmly when the link is wrong', async () => {
    const res = await h.app.request('/api/email/unsubscribe?token=nope');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('This link does not work');
    expect((await h.app.request('/api/email/unsubscribe')).status).toBe(404);
  });
});

describe('lifecycle email', () => {
  const optIn = async (email = 'player@example.com') => {
    const s = await h.signIn(email);
    await h.call('PATCH', '/api/me', { emailOptIn: true, tz: 'America/New_York' }, s.token);
    return s;
  };
  const answers = async (token: string, n: number, at = h.state.clock) =>
    h.call(
      'POST',
      '/api/answers',
      {
        answers: Array.from({ length: n }, (_, i) => ({
          itemId: `chart:x:${i}`,
          score: i % 4 === 0 ? 0 : 1,
          rating: 1200 + i * 2,
          at: new Date(at.getTime() - (n - i) * 60_000).toISOString(),
        })),
      },
      token,
    );
  // Monday Oct 19, 9:30 am in New York.
  const monday = new Date('2026-10-19T13:30:00Z');

  it('sends the weekly digest with real numbers, the footer and the unsubscribe headers', async () => {
    const { token, user } = await optIn();
    h.state.clock = new Date('2026-10-17T15:00:00Z');
    await answers(token, 12);
    await h.call('POST', '/api/daily/300', { scores: [1, 1, 0, 1, 1] }, token);
    expect(weekStats(h.db, user.id, monday)).toEqual({ decisions: 12, right: 9, ratingChange: 22, dailies: 1 });

    expect(await run(monday)).toBe(1);
    const m = h.state.mail[0];
    expect(m.subject).toBe('Your week in decisions');
    expect(m.text).toContain('You made 12 decisions this week. You got 9 right.');
    expect(m.text).toContain('Your Aced Rating went up about 22.');
    expect(m.text).toContain('You played 1 daily challenge.');
    const { unsub_token } = h.db.prepare('SELECT unsub_token FROM users').get() as { unsub_token: string };
    const url = `https://api.aced.example/api/email/unsubscribe?token=${encodeURIComponent(unsub_token)}`;
    expect(m.text).toContain(`Unsubscribe in one tap: ${url}`);
    expect(m.text).toContain('Aced, 1 Main St, Toronto ON');
    expect(m.options?.headers).toEqual({ 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });

    // Once a week.
    expect(await run(new Date(monday.getTime() + 600_000))).toBe(0);
  });

  it('skips the digest after a quiet week, without opt in, in the holdout or without an address', async () => {
    const { token } = await optIn();
    h.state.clock = new Date('2026-10-17T15:00:00Z');
    expect(await run(monday)).toBe(0);
    await answers(token, 3);
    await h.call('PATCH', '/api/me', { emailOptIn: false }, token);
    expect(await run(monday)).toBe(0);
    await h.call('PATCH', '/api/me', { emailOptIn: true }, token);
    h.db.prepare('UPDATE users SET holdout = 1').run();
    expect(await run(monday)).toBe(0);
    h.db.prepare('UPDATE users SET holdout = 0').run();
    const noAddress = harness({ MAIL_POSTAL_ADDRESS: '' });
    expect(await runLifecycleEmails(h.db, noAddress.mailer, noAddress.config, monday)).toBe(0);
    expect(await run(monday)).toBe(1);
  });

  it('stops marketing email after 90 days without a visit', async () => {
    const { token } = await optIn();
    await answers(token, 3);
    // Answers came in, but the player has not opened Aced for 91 days.
    h.db.prepare('UPDATE users SET last_active_at = ?').run(later(-91, monday).toISOString());
    expect(await run(monday)).toBe(0);
  });

  it('sends the trial reminder email to everyone who kept the reminder on', async () => {
    const { token, user } = await h.signIn();
    await h.call('PATCH', '/api/me', { tz: 'America/New_York' }, token);
    const until = later(2).toISOString();
    h.db.prepare("UPDATE users SET trialing = 1, plan = 'annual', pro_until = ? WHERE id = ?").run(until, user.id);
    expect(await run()).toBe(1);
    expect(h.state.mail[0]).toMatchObject({ to: 'player@example.com', subject: 'Your free week ends on Oct 16' });
    expect(h.state.mail[0].text).toContain('Open Account in Aced and tap Manage Pro.');
    expect(h.state.mail[0].options).toBeUndefined();
    expect(await run()).toBe(0);
  });

  it('sends billing issue email without opt in, even in the holdout, then once more after a week', async () => {
    const { user } = await h.signIn();
    h.db.prepare('UPDATE users SET holdout = 1 WHERE id = ?').run(user.id);
    await h.subscribe(user.id, 'monthly');
    await h.webhook('invoice.payment_failed', { customer: 'cus_1' });
    expect(await run()).toBe(1);
    expect(h.state.mail[0].subject).toBe("Your payment didn't go through");
    expect(h.state.mail[0].text).not.toContain('Unsubscribe');
    expect(await run(later(3))).toBe(0);
    expect(await run(later(7))).toBe(1);
    expect(h.state.mail[1].subject).toBe('Aced Pro still needs a new card');
    await h.webhook('invoice.paid', { customer: 'cus_1', amount_paid: 1499 });
    expect(await run(later(14))).toBe(0);
  });

  it('sends win-back news at day 30 to 45 and one offer at day 60 to 90, never to the holdout', async () => {
    const { token, user } = await optIn();
    const sub = await h.subscribe(user.id, 'monthly');
    await h.webhook('customer.subscription.deleted', { ...sub, status: 'canceled', ended_at: Math.floor(h.state.clock.getTime() / 1000) });
    const churn = h.state.clock;
    // The free player keeps visiting.
    const visit = (at: Date) => h.db.prepare('UPDATE users SET last_active_at = ?').run(at.toISOString());

    visit(later(29, churn));
    expect(await run(later(29, churn))).toBe(0);
    visit(later(31, churn));
    expect(await run(later(31, churn))).toBe(1);
    expect(h.state.mail[0].subject).toBe('Your progress is still here');
    expect(h.state.mail[0].text).not.toMatch(/%|\$/);
    expect(await run(later(33, churn))).toBe(0);

    visit(later(61, churn));
    expect(await run(later(61, churn))).toBe(1);
    expect(h.state.mail[1].subject).toBe('Come back to Aced Pro for less');
    expect(h.state.mail[1].text).toContain('30% off your next payment');
    expect(h.state.mail[1].text).toContain('https://aced.example/pro?offer=winback');
    expect(await run(later(70, churn))).toBe(0);
    void token;
  });

  it('sends no win-back to the holdout', async () => {
    const { user } = await optIn();
    h.db.prepare('UPDATE users SET holdout = 1 WHERE id = ?').run(user.id);
    const sub = await h.subscribe(user.id, 'monthly');
    await h.webhook('customer.subscription.deleted', { ...sub, status: 'canceled', ended_at: Math.floor(h.state.clock.getTime() / 1000) });
    h.db.prepare('UPDATE users SET last_active_at = ?').run(later(31).toISOString());
    expect(await run(later(31))).toBe(0);
  });

  it('tries a failed send again on the next run', async () => {
    const { user } = await h.signIn();
    await h.subscribe(user.id, 'monthly');
    await h.webhook('invoice.payment_failed', { customer: 'cus_1' });
    let fail = true;
    const flaky = { send: async () => (fail ? Promise.reject(new Error('down')) : undefined) };
    expect(await runLifecycleEmails(h.db, flaky, h.config, h.state.clock)).toBe(0);
    fail = false;
    expect(await runLifecycleEmails(h.db, flaky, h.config, h.state.clock)).toBe(1);
  });
});

describe('push caps in the scheduler', () => {
  const setUp = async () => {
    const s = await h.signIn();
    await h.call('PATCH', '/api/me', { tz: 'America/New_York', cueMinutes: 11 * 60, reminders: true }, s.token);
    await h.call('POST', '/api/push/subscribe', { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } }, s.token);
    return s;
  };
  const payloads: { title: string; body: string }[] = [];
  const sender = async (_sub: unknown, payload: string) => {
    payloads.push(JSON.parse(payload));
    return 'ok' as const;
  };
  beforeEach(() => {
    payloads.length = 0;
  });

  it('logs every push and holds a reminder when the day already had one', async () => {
    const { user } = await setUp();
    h.db.prepare("INSERT INTO push_log (user_id, kind, at) VALUES (?, 'trial-ending', ?)").run(user.id, new Date(h.state.clock.getTime() - 3_600_000).toISOString());
    expect(await runReminders(h.db, sender, h.state.clock)).toBe(0);
    expect(await runReminders(h.db, sender, later(1))).toBe(1);
    expect(h.db.prepare("SELECT COUNT(*) AS n FROM push_log WHERE kind = 'reminder'").get()).toEqual({ n: 1 });
  });

  it('sends the closing note once after 14 days away, then stops until the player is back', async () => {
    const { token } = await setUp();
    // Phoenix has no daylight saving, so 15:00 UTC is 8 am there all month.
    await h.call('PATCH', '/api/me', { tz: 'America/Phoenix', cueMinutes: 8 * 60 }, token);
    const start = h.state.clock;
    let sent = 0;
    // Two weeks of reminders with no visit.
    for (let d = 0; d <= 14; d++) sent += await runReminders(h.db, sender, later(d, start));
    expect(payloads.at(-1)).toEqual(CLOSING_NOTE);
    expect(payloads.filter((p) => p.title === CLOSING_NOTE.title)).toHaveLength(1);
    expect(payloads.length).toBeLessThanOrEqual(8);
    for (let d = 15; d <= 30; d++) await runReminders(h.db, sender, later(d, start));
    expect(payloads.at(-1)).toEqual(CLOSING_NOTE);
    expect(sent).toBe(payloads.length);

    // The player comes back: reminders start again.
    h.state.clock = later(31, start);
    await h.call('GET', '/api/me', undefined, token);
    await runReminders(h.db, sender, later(32, start));
    expect(payloads.at(-1)!.title).toBe('Your poker plan is ready');
  });

  it('holds the trial reminder through quiet hours and counts it', async () => {
    const { user } = await setUp();
    // 03:00 in New York.
    const night = new Date('2026-10-14T07:00:00Z');
    const until = new Date(night.getTime() + 48 * 3_600_000).toISOString();
    h.db.prepare("UPDATE users SET trialing = 1, plan = 'annual', pro_until = ? WHERE id = ?").run(until, user.id);
    expect(await runTrialNotices(h.db, sender, night)).toBe(0);
    // 08:00 in New York, still inside the window.
    expect(await runTrialNotices(h.db, sender, new Date('2026-10-14T12:00:00Z'))).toBe(1);
    expect(h.db.prepare("SELECT COUNT(*) AS n FROM push_log WHERE kind = 'trial-ending'").get()).toEqual({ n: 1 });
  });
});

describe('waitlist hardening', () => {
  const join = (body: unknown, ip = '203.0.113.7') => h.call('POST', '/api/waitlist', body, undefined, { 'X-Forwarded-For': `${ip}, 10.0.0.1` });

  it('stores the source and platform', async () => {
    const res = await join({ email: 'amy@example.com', list: 'founding', source: 'hero', platform: 'ios', company: '' });
    expect(await res.json()).toEqual({ ok: true });
    expect(h.db.prepare('SELECT email, list, source, platform FROM waitlist').all()).toEqual([{ email: 'amy@example.com', list: 'founding', source: 'hero', platform: 'ios' }]);
  });

  it('cleans odd source values and accepts missing ones', async () => {
    await join({ email: 'a@example.com', list: 'ios', source: '<script>hero</script>' });
    await join({ email: 'b@example.com', list: 'ios' });
    expect(h.db.prepare('SELECT source, platform FROM waitlist ORDER BY email').all()).toEqual([
      { source: 'scripthero/script', platform: null },
      { source: null, platform: null },
    ]);
  });

  it('answers a filled honeypot normally and stores nothing', async () => {
    const res = await join({ email: 'bot@example.com', list: 'ios', company: 'Acme' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(h.db.prepare('SELECT COUNT(*) AS n FROM waitlist').get()).toEqual({ n: 0 });
  });

  it('allows 5 requests a minute from one address', async () => {
    for (let i = 0; i < 5; i++) expect((await join({ email: `p${i}@example.com`, list: 'ios' })).status).toBe(200);
    const blocked = await join({ email: 'p5@example.com', list: 'ios' });
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe('Too many tries. Wait a minute and try again.');
    // Another address is fine, and a minute later so is this one.
    expect((await join({ email: 'q@example.com', list: 'ios' }, '198.51.100.2')).status).toBe(200);
    h.state.clock = new Date(h.state.clock.getTime() + 61_000);
    expect((await join({ email: 'p5@example.com', list: 'ios' })).status).toBe(200);
  });
});

import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Config } from './config.ts';
import { type Db, tx } from './db.ts';
import {
  CALIBRATION_MIN_ANSWERS,
  dailySummary,
  entitlementFromSubscription,
  fitDifficulty,
  LEAGUE_SIZE,
  type Mailer,
  newCode,
  newId,
  newToken,
  normalizeEmail,
  ratingBand,
  sha256,
  type StripeCall,
  validHandle,
  verifyStripeSignature,
  weekKey,
} from './services.ts';

export interface Deps {
  db: Db;
  config: Config;
  mailer: Mailer;
  stripe?: StripeCall;
  now?: () => Date;
}

interface UserRow {
  id: string;
  email: string;
  handle: string | null;
  created_at: string;
  tz: string | null;
  cue_minutes: number | null;
  reminders: number;
  leagues: number;
  last_study_day: string | null;
  pro_until: string | null;
  plan: string | null;
  trialing: number;
  trial_used: number;
  stripe_customer: string | null;
}

type Env = { Variables: { user: UserRow; token: string } };

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;
const SESSION_IDLE_DAYS = 180;

export function publicUser(u: UserRow, now: Date) {
  const pro = !!u.pro_until && new Date(u.pro_until) > now;
  return {
    id: u.id,
    email: u.email,
    handle: u.handle,
    tz: u.tz,
    cueMinutes: u.cue_minutes,
    reminders: !!u.reminders,
    leagues: !!u.leagues,
    lastStudyDay: u.last_study_day,
    access: { pro, until: u.pro_until, plan: u.plan, trialing: pro && !!u.trialing },
  };
}

async function json<T>(c: Context): Promise<Partial<T>> {
  try {
    return (await c.req.json()) as Partial<T>;
  } catch {
    return {};
  }
}

export function createApp({ db, config, mailer, stripe, now = () => new Date() }: Deps) {
  const app = new Hono<Env>();
  const iso = () => now().toISOString();

  // Plain error messages players can act on; details stay in the log.
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Something went wrong on the server. Try again in a moment.' }, 500);
  });

  const requireUser = async (c: Context<Env>, next: () => Promise<void>) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return c.json({ error: 'Sign in first.' }, 401);
    const row = db
      .prepare('SELECT u.*, s.last_seen FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
      .get(sha256(token)) as (UserRow & { last_seen: string }) | undefined;
    if (!row || now().getTime() - Date.parse(row.last_seen) > SESSION_IDLE_DAYS * 86_400_000) return c.json({ error: 'Your sign in has expired. Sign in again.' }, 401);
    db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').run(iso(), sha256(token));
    c.set('user', row);
    c.set('token', token);
    await next();
  };

  const freshUser = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow;

  // Health and features -------------------------------------------------------

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      features: {
        accounts: !!config.email.resendKey || config.devCodes,
        billing: !!(stripe && config.stripe.priceAnnual && config.stripe.priceMonthly),
        push: !!(config.push.publicKey && config.push.privateKey),
      },
    }),
  );

  // Sign in with an emailed code ---------------------------------------------------

  app.post('/api/auth/start', async (c) => {
    const email = normalizeEmail((await json<{ email: string }>(c)).email);
    if (!email) return c.json({ error: 'Enter a valid email address.' }, 400);
    const hourAgo = new Date(now().getTime() - 3_600_000).toISOString();
    const recent = (db.prepare('SELECT COUNT(*) AS n FROM login_requests WHERE email = ? AND at > ?').get(email, hourAgo) as { n: number }).n;
    if (recent >= MAX_CODES_PER_HOUR) return c.json({ error: 'Too many codes requested. Wait an hour and try again.' }, 429);
    const code = newCode();
    tx(db, () => {
      db.prepare('DELETE FROM login_requests WHERE at < ?').run(hourAgo);
      db.prepare('INSERT INTO login_requests (email, at) VALUES (?, ?)').run(email, iso());
      db.prepare('INSERT OR REPLACE INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)').run(
        email,
        sha256(`${email}:${code}`),
        new Date(now().getTime() + CODE_TTL_MS).toISOString(),
      );
    });
    await mailer.send(email, `Your Felt code: ${code}`, `Your Felt sign in code is ${code}. It works for 10 minutes.\n\nIf you did not ask for it, ignore this email.`);
    return c.json({ ok: true, ...(config.devCodes ? { devCode: code } : {}) });
  });

  app.post('/api/auth/verify', async (c) => {
    const body = await json<{ email: string; code: string }>(c);
    const email = normalizeEmail(body.email);
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) return c.json({ error: 'Enter the 6 digit code from the email.' }, 400);
    const row = db.prepare('SELECT * FROM login_codes WHERE email = ?').get(email) as
      | { code_hash: string; expires_at: string; attempts: number }
      | undefined;
    if (!row || Date.parse(row.expires_at) < now().getTime()) return c.json({ error: 'That code has expired. Request a new one.' }, 400);
    if (row.attempts >= MAX_CODE_ATTEMPTS) return c.json({ error: 'Too many wrong tries. Request a new code.' }, 429);
    if (row.code_hash !== sha256(`${email}:${code}`)) {
      db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
      return c.json({ error: 'That code is not right. Check the email and try again.' }, 400);
    }
    const token = newToken();
    const user = tx(db, () => {
      db.prepare('DELETE FROM login_codes WHERE email = ?').run(email);
      let u = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRow | undefined;
      if (!u) {
        db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').run(newId(), email, iso());
        u = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRow;
      }
      db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)').run(sha256(token), u.id, iso(), iso());
      return u;
    });
    return c.json({ token, user: publicUser(user, now()) });
  });

  app.post('/api/auth/logout', requireUser, (c) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(c.get('token')));
    return c.json({ ok: true });
  });

  // Profile -----------------------------------------------------------------

  app.get('/api/me', requireUser, (c) => c.json({ user: publicUser(c.get('user'), now()) }));

  app.patch('/api/me', requireUser, async (c) => {
    const body = await json<{
      handle: string | null;
      tz: string;
      cueMinutes: number | null;
      reminders: boolean;
      leagues: boolean;
      lastStudyDay: string;
    }>(c);
    const u = c.get('user');
    const set: Record<string, unknown> = {};
    if (body.handle !== undefined) {
      if (body.handle !== null && !validHandle(body.handle)) return c.json({ error: 'Use 3 to 20 letters, numbers or underscores.' }, 400);
      if (body.handle && db.prepare('SELECT 1 FROM users WHERE handle = ? COLLATE NOCASE AND id != ?').get(body.handle, u.id))
        return c.json({ error: 'That name is taken. Try another.' }, 409);
      set.handle = body.handle;
    }
    if (body.tz !== undefined) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: body.tz });
        set.tz = body.tz;
      } catch {
        return c.json({ error: 'Unknown time zone.' }, 400);
      }
    }
    if (body.cueMinutes !== undefined) {
      if (body.cueMinutes !== null && !(Number.isInteger(body.cueMinutes) && body.cueMinutes >= 0 && body.cueMinutes < 1440))
        return c.json({ error: 'Pick a time of day.' }, 400);
      set.cue_minutes = body.cueMinutes;
    }
    if (body.reminders !== undefined) set.reminders = body.reminders ? 1 : 0;
    if (body.leagues !== undefined) set.leagues = body.leagues ? 1 : 0;
    if (body.lastStudyDay !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.lastStudyDay)) return c.json({ error: 'Bad date.' }, 400);
      set.last_study_day = body.lastStudyDay;
    }
    const keys = Object.keys(set);
    if (keys.length) db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...(Object.values(set) as never[]), u.id);
    return c.json({ user: publicUser(freshUser(u.id), now()) });
  });

  /** Deletes the account and everything stored with it. Billing must be cancelled in Stripe separately. */
  app.delete('/api/me', requireUser, (c) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(c.get('user').id);
    return c.json({ ok: true });
  });

  // Sync: one versioned snapshot per player -----------------------------------------------

  app.get('/api/sync', requireUser, (c) => {
    const meta = c.req.query('meta') === '1';
    const row = db.prepare(`SELECT version, updated_at, bytes, device${meta ? '' : ', data'} FROM snapshots WHERE user_id = ?`).get(c.get('user').id) as
      | { version: number; updated_at: string; bytes: number; device: string | null; data?: string }
      | undefined;
    if (!row) return c.json({ version: 0 });
    return c.json({ version: row.version, updatedAt: row.updated_at, bytes: row.bytes, device: row.device, ...(meta ? {} : { data: row.data }) });
  });

  app.put(
    '/api/sync',
    requireUser,
    bodyLimit({ maxSize: config.maxSnapshotBytes + 4096, onError: (c) => c.json({ error: 'Your data is too large to sync. Remove some imported hands and try again.' }, 413) }),
    async (c) => {
      const body = await json<{ baseVersion: number; data: string; device: string }>(c);
      if (typeof body.data !== 'string' || typeof body.baseVersion !== 'number') return c.json({ error: 'Nothing to sync.' }, 400);
      try {
        const parsed = JSON.parse(body.data) as { format?: string };
        if (parsed.format !== 'felt-backup') throw new Error();
      } catch {
        return c.json({ error: 'That is not Felt data.' }, 400);
      }
      const id = c.get('user').id;
      const data = body.data;
      const result = tx(db, () => {
        const current = (db.prepare('SELECT version FROM snapshots WHERE user_id = ?').get(id) as { version: number } | undefined)?.version ?? 0;
        // Someone else synced first: the client decides which copy to keep.
        if (current !== body.baseVersion) return { conflict: true as const, version: current };
        const version = current + 1;
        db.prepare(
          'INSERT INTO snapshots (user_id, version, data, bytes, updated_at, device) VALUES (?, ?, ?, ?, ?, ?) ' +
            'ON CONFLICT (user_id) DO UPDATE SET version = excluded.version, data = excluded.data, bytes = excluded.bytes, updated_at = excluded.updated_at, device = excluded.device',
        ).run(id, version, data, Buffer.byteLength(data), iso(), typeof body.device === 'string' ? body.device.slice(0, 80) : null);
        return { conflict: false as const, version };
      });
      if (result.conflict) return c.json({ error: 'Your data changed on another device.', version: result.version }, 409);
      return c.json({ version: result.version, updatedAt: iso() });
    },
  );

  // Billing (Stripe) ---------------------------------------------------------

  const billingReady = () => !!(stripe && config.stripe.priceAnnual && config.stripe.priceMonthly);

  app.post('/api/billing/checkout', requireUser, async (c) => {
    if (!billingReady()) return c.json({ error: 'Purchases are not open yet.' }, 503);
    const plan = (await json<{ plan: string }>(c)).plan;
    const price = plan === 'annual' ? config.stripe.priceAnnual : plan === 'monthly' ? config.stripe.priceMonthly : undefined;
    if (!price) return c.json({ error: 'Choose a plan.' }, 400);
    const u = c.get('user');
    let customer = u.stripe_customer;
    if (!customer) {
      customer = (await stripe!('POST', 'customers', { email: u.email, metadata: { user_id: u.id } })).id as string;
      db.prepare('UPDATE users SET stripe_customer = ? WHERE id = ?').run(customer, u.id);
    }
    // One free trial per player, on the yearly plan, matching the paywall.
    const trial = plan === 'annual' && !u.trial_used && config.stripe.trialDays > 0 ? config.stripe.trialDays : undefined;
    const session = await stripe!('POST', 'checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: u.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { user_id: u.id }, ...(trial ? { trial_period_days: trial } : {}) },
      allow_promotion_codes: true,
      success_url: `${config.appUrl}/pro?checkout=success`,
      cancel_url: `${config.appUrl}/pro?checkout=cancel`,
    });
    return c.json({ url: session.url });
  });

  app.post('/api/billing/portal', requireUser, async (c) => {
    const u = c.get('user');
    if (!billingReady() || !u.stripe_customer) return c.json({ error: 'No subscription found for this account.' }, 404);
    const session = await stripe!('POST', 'billing_portal/sessions', { customer: u.stripe_customer, return_url: `${config.appUrl}/settings` });
    return c.json({ url: session.url });
  });

  app.post('/api/billing/webhook', async (c) => {
    const secret = config.stripe.webhookSecret;
    if (!secret) return c.json({ error: 'Webhook not configured.' }, 503);
    const payload = await c.req.text();
    if (!verifyStripeSignature(payload, c.req.header('Stripe-Signature'), secret, Math.floor(now().getTime() / 1000)))
      return c.json({ error: 'Bad signature.' }, 400);
    const event = JSON.parse(payload) as { id: string; type: string; data: { object: Record<string, unknown> } };
    // Stripe can deliver an event more than once.
    if (db.prepare('SELECT 1 FROM stripe_events WHERE id = ?').get(event.id)) return c.json({ received: true });
    const obj = event.data.object;
    tx(db, () => {
      db.prepare('INSERT INTO stripe_events (id, at) VALUES (?, ?)').run(event.id, iso());
      if (event.type === 'checkout.session.completed' && obj.client_reference_id && obj.customer) {
        db.prepare('UPDATE users SET stripe_customer = ? WHERE id = ? AND stripe_customer IS NULL').run(obj.customer as string, obj.client_reference_id as string);
      }
      if (event.type.startsWith('customer.subscription.')) {
        const metaUser = (obj.metadata as { user_id?: string } | undefined)?.user_id;
        const user = (metaUser
          ? db.prepare('SELECT id FROM users WHERE id = ?').get(metaUser)
          : db.prepare('SELECT id FROM users WHERE stripe_customer = ?').get(obj.customer as string)) as { id: string } | undefined;
        if (!user) return;
        const e = entitlementFromSubscription(obj, { annual: config.stripe.priceAnnual, monthly: config.stripe.priceMonthly }, Math.floor(now().getTime() / 1000));
        db.prepare('UPDATE users SET pro_until = ?, plan = ?, trialing = ?, trial_used = CASE WHEN ? THEN 1 ELSE trial_used END WHERE id = ?').run(
          e.proUntil,
          e.plan,
          e.trialing ? 1 : 0,
          obj.trial_end ? 1 : 0,
          user.id,
        );
      }
    });
    return c.json({ received: true });
  });

  // Push reminders -----------------------------------------------------------

  app.get('/api/push/key', (c) => (config.push.publicKey ? c.json({ key: config.push.publicKey }) : c.json({ error: 'Reminders are not set up on this server.' }, 503)));

  app.post('/api/push/subscribe', requireUser, async (c) => {
    const sub = await json<{ endpoint: string; keys: { p256dh: string; auth: string } }>(c);
    if (typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth)
      return c.json({ error: 'That subscription is not valid.' }, 400);
    db.prepare(
      'INSERT INTO push_subs (endpoint, user_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth',
    ).run(sub.endpoint, c.get('user').id, sub.keys.p256dh, sub.keys.auth, iso());
    return c.json({ ok: true });
  });

  app.delete('/api/push/subscribe', requireUser, async (c) => {
    const { endpoint } = await json<{ endpoint: string }>(c);
    db.prepare('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?').run(endpoint ?? '', c.get('user').id);
    return c.json({ ok: true });
  });

  // Daily challenge stats ------------------------------------------------------------

  const dailyRows = (number: number) =>
    (db.prepare('SELECT scores, right_count FROM daily_results WHERE number = ?').all(number) as { scores: string; right_count: number }[]).map((r) => ({
      scores: JSON.parse(r.scores) as number[],
      right: r.right_count,
    }));

  app.post('/api/daily/:number', requireUser, async (c) => {
    const number = Number(c.req.param('number'));
    const { scores } = await json<{ scores: number[] }>(c);
    if (!Number.isInteger(number) || number < 1) return c.json({ error: 'Unknown challenge.' }, 400);
    if (!Array.isArray(scores) || scores.length !== 5 || scores.some((s) => typeof s !== 'number' || s < 0 || s > 1))
      return c.json({ error: 'A result has five scores between 0 and 1.' }, 400);
    const right = scores.filter((s) => s >= 1).length;
    // The first result counts; replays cannot improve it.
    db.prepare('INSERT OR IGNORE INTO daily_results (number, user_id, scores, right_count, created_at) VALUES (?, ?, ?, ?, ?)').run(
      number,
      c.get('user').id,
      JSON.stringify(scores),
      right,
      iso(),
    );
    const mine = db.prepare('SELECT right_count FROM daily_results WHERE number = ? AND user_id = ?').get(number, c.get('user').id) as { right_count: number };
    return c.json(dailySummary(dailyRows(number), mine.right_count));
  });

  app.get('/api/daily/:number', (c) => {
    const number = Number(c.req.param('number'));
    if (!Number.isInteger(number) || number < 1) return c.json({ error: 'Unknown challenge.' }, 400);
    const mine = c.req.query('right');
    return c.json(dailySummary(dailyRows(number), mine === undefined ? undefined : Number(mine)));
  });

  // Leagues ---------------------------------------------------------------------

  app.post('/api/league', requireUser, async (c) => {
    const u = c.get('user');
    if (!u.leagues || !u.handle) return c.json({ error: 'Join leagues and pick a display name first.' }, 403);
    const { rating, decisions } = await json<{ rating: number; decisions: number }>(c);
    if (typeof rating !== 'number' || rating < 0 || rating > 4000 || !Number.isInteger(decisions) || decisions! < 0)
      return c.json({ error: 'Bad league update.' }, 400);
    const week = weekKey(now());
    tx(db, () => {
      const existing = db.prepare('SELECT league FROM league_scores WHERE week = ? AND user_id = ?').get(week, u.id);
      if (existing) {
        db.prepare('UPDATE league_scores SET rating = ?, decisions = ?, updated_at = ? WHERE week = ? AND user_id = ?').run(rating, decisions!, iso(), week, u.id);
        return;
      }
      const band = ratingBand(rating);
      const open = db
        .prepare('SELECT league, COUNT(*) AS n FROM league_scores WHERE week = ? AND band = ? GROUP BY league HAVING n < ? ORDER BY league DESC LIMIT 1')
        .get(week, band, LEAGUE_SIZE) as { league: number } | undefined;
      const league = open?.league ?? ((db.prepare('SELECT MAX(league) AS m FROM league_scores WHERE week = ?').get(week) as { m: number | null }).m ?? 0) + 1;
      db.prepare(
        'INSERT INTO league_scores (week, user_id, league, band, start_rating, rating, decisions, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(week, u.id, league, band, rating, rating, decisions!, iso());
    });
    return c.json({ ok: true });
  });

  app.get('/api/league', requireUser, (c) => {
    const u = c.get('user');
    const week = weekKey(now());
    const mine = db.prepare('SELECT league FROM league_scores WHERE week = ? AND user_id = ?').get(week, u.id) as { league: number } | undefined;
    const end = new Date(Date.parse(`${week}T00:00:00Z`) + 7 * 86_400_000).toISOString();
    if (!mine) return c.json({ week, endsAt: end, joined: false, standings: [] });
    const rows = db
      .prepare(
        'SELECT l.user_id, u.handle, l.rating - l.start_rating AS gained, l.decisions FROM league_scores l JOIN users u ON u.id = l.user_id WHERE l.week = ? AND l.league = ? ORDER BY gained DESC, l.decisions DESC',
      )
      .all(week, mine.league) as { user_id: string; handle: string | null; gained: number; decisions: number }[];
    return c.json({
      week,
      endsAt: end,
      joined: true,
      standings: rows.map((r, i) => ({ rank: i + 1, handle: r.handle ?? 'Player', gained: Math.round(r.gained), decisions: r.decisions, you: r.user_id === u.id })),
    });
  });

  // Item calibration -----------------------------------------------------------------

  app.post('/api/answers', requireUser, async (c) => {
    const { answers } = await json<{ answers: { itemId: string; score: number; rating: number; at: string }[] }>(c);
    if (!Array.isArray(answers) || answers.length > 5000) return c.json({ error: 'Send up to 5000 answers at a time.' }, 400);
    const insert = db.prepare('INSERT OR IGNORE INTO answers (user_id, item_id, score, rating, at) VALUES (?, ?, ?, ?, ?)');
    let stored = 0;
    tx(db, () => {
      for (const a of answers) {
        if (typeof a?.itemId !== 'string' || a.itemId.length > 200 || !(a.score >= 0 && a.score <= 1) || !(a.rating > 0 && a.rating < 4000) || Number.isNaN(Date.parse(a.at))) continue;
        stored += Number(insert.run(c.get('user').id, a.itemId, a.score, a.rating, a.at).changes);
      }
    });
    return c.json({ stored });
  });

  app.get('/api/calibration', (c) => {
    const items = db.prepare('SELECT item_id, COUNT(*) AS n FROM answers GROUP BY item_id HAVING n >= ?').all(CALIBRATION_MIN_ANSWERS) as { item_id: string; n: number }[];
    const select = db.prepare('SELECT score, rating FROM answers WHERE item_id = ?');
    const out: Record<string, { difficulty: number; answers: number }> = {};
    for (const { item_id, n } of items) out[item_id] = { difficulty: Math.round(fitDifficulty(select.all(item_id) as { score: number; rating: number }[])), answers: n };
    return c.json({ minAnswers: CALIBRATION_MIN_ANSWERS, items: out });
  });

  return app;
}

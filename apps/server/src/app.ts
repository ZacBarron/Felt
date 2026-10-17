import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { getConnInfo } from '@hono/node-server/conninfo';
import { askCoach, type CoachClient, coachErrorResponse, parseCoachRequest, REFUSAL_REPLY, TRUNCATED_NOTE } from './coach.ts';
import type { Config } from './config.ts';
import { type Db, tx } from './db.ts';
import { applyCoupon, applySubscription, cancelAtPeriodEnd, pause, resume, switchToAnnual } from './billing.ts';
import {
  type CouponInfo,
  couponInfo,
  describeCoupon,
  FOUNDING_PRICE,

  isCancelReason,
  offerLabel,
  offersByReason,
  PAUSE_MONTHS,
  type RetentionOffer,
  retentionOffer,
  SEAT_HOLD_MINUTES,
  seatsLeft,
  subscriptionStatus,
  winbackEligible,
} from './lifecycle.ts';
import { mountPasskeys, passkeysReady, simpleWebAuthn, type WebAuthnLib } from './passkeys.ts';
import { parseBatch, validId } from '@felt/core/analytics';
import { forgetInstall, ingest, linkInstall, RateLimiter, serverEvent, unlinkUser } from './analytics.ts';
import { createFlags, type Flags } from './flags.ts';
import { jobRan } from './ops.ts';
import { mountAdmin, type OpsState } from './admin.ts';
import {
  CALIBRATION_MIN_ANSWERS,
  dailySummary,
  localTime,
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
  /** The AI coach's Claude client. Without it the coach is off. */
  coach?: CoachClient;
  /** Passkey verification. Tests pass a fake; the real library is the default. */
  webauthn?: WebAuthnLib;
  now?: () => Date;
  /** Random numbers for the lifecycle holdout. Tests pass a fixed one. */
  random?: () => number;
  /** Feature flags. main.ts passes the instance its scheduler uses too. */
  flags?: Flags;
}

interface UserRow {
  id: string;
  /** Optional: a passkey account can have no email. */
  email: string | null;
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
  /** 1 when the player wants a push 2 days before a free trial ends. */
  trial_reminder: number;
  /** What the daily reminder says is waiting, written by the player's device. */
  reminder_body: string | null;
  /** Invite code, made the first time the player opens Invite. */
  ref_code: string | null;
  /** Free Pro from invites runs to this date. */
  bonus_until: string | null;
  /** The subscription as Stripe last reported it. */
  stripe_subscription: string | null;
  sub_status: string | null;
  cancel_at_period_end: number;
  /** While paused: Pro runs to paid_through, billing starts again at paused_until. */
  paid_through: string | null;
  paused_until: string | null;
  /** A renewal payment failed. Pro stays on while Stripe retries. */
  billing_issue: number;
  billing_issue_at: string | null;
  /** The founding purchase: Pro for as long as Aced runs. */
  lifetime: number;
  retention_coupon_at: string | null;
  /** When paid Pro ended, for win-back. Cleared when it comes back. */
  churned_at: string | null;
  last_paid_at: string | null;
  last_active_at: string | null;
  /** Marketing email consent (CASL: explicit opt in, off by default), with when it was given. */
  email_opt_in: number;
  email_opt_in_at: string | null;
  unsub_token: string | null;
  /** In the lifecycle holdout: no marketing email. Never shown anywhere. */
  holdout: number;
}

type Env = { Variables: { user: UserRow; token: string } };

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;
/**
 * A session lasts until it goes unused for this long. Every signed in request
 * renews it, so a player who opens Aced now and then stays signed in.
 */
export const SESSION_IDLE_DAYS = 180;

/** Graded answers a friend gives before an invite pays the inviter. */
export const QUALIFY_ANSWERS = 10;
/** Months of Pro an inviter can earn in a year. */
export const MAX_REFERRAL_MONTHS = 12;
/** Days of Pro a month of invite reward is. */
export const REFERRAL_MONTH_DAYS = 30;
/** How long after making an account a player can still claim an invite. */
export const REFERRAL_CLAIM_DAYS = 14;

/** Paid through a date still ahead, or the founding purchase, which never ends. */
const paidPro = (u: UserRow, now: Date) => !!u.lifetime || (!!u.pro_until && new Date(u.pro_until) > now);

/** Free Pro earned from invites, still running. */
const bonusPro = (u: UserRow, now: Date) => !!u.bonus_until && new Date(u.bonus_until) > now;

/** Lists the site can add an email to. */
const WAITLISTS = ['ios', 'android', 'founding'];
/** Waitlist requests one address may make in a minute. */
export const WAITLIST_PER_MINUTE = 5;

/** Aced Pro for this player: paid, from invites, or every signed in player while PRO_FOR_EVERYONE is on. */
export function userHasPro(u: UserRow, now: Date, proForEveryone = false) {
  return proForEveryone || paidPro(u, now) || bonusPro(u, now);
}

export function publicUser(u: UserRow, now: Date, passkeys = 0, proForEveryone = false) {
  const paid = paidPro(u, now);
  const bonus = bonusPro(u, now);
  const pro = paid || bonus || proForEveryone;
  // Pro for testing has no end date. A lapsed date would read as expired on the device.
  const latest = [paid ? u.pro_until : null, bonus ? u.bonus_until : null].filter(Boolean).sort().at(-1) ?? null;
  const until = paid || bonus || !proForEveryone ? (latest ?? u.pro_until) : null;
  return {
    id: u.id,
    email: u.email,
    passkeys,
    handle: u.handle,
    tz: u.tz,
    cueMinutes: u.cue_minutes,
    reminders: !!u.reminders,
    trialReminder: u.trial_reminder !== 0,
    reminderBody: u.reminder_body,
    leagues: !!u.leagues,
    lastStudyDay: u.last_study_day,
    emailOptIn: !!u.email_opt_in,
    access: {
      pro,
      // Lifetime Pro has no end date.
      until: u.lifetime ? null : until,
      plan: u.lifetime ? 'lifetime' : paid ? u.plan : bonus ? 'invite' : u.plan,
      trialing: paid && !u.lifetime && !!u.trialing,
      lifetime: !!u.lifetime,
      billingIssue: !!u.billing_issue && !u.lifetime,
    },
  };
}

async function json<T>(c: Context): Promise<Partial<T>> {
  try {
    return (await c.req.json()) as Partial<T>;
  } catch {
    return {};
  }
}

export function createApp({ db, config, mailer, stripe, coach, webauthn = simpleWebAuthn, now = () => new Date(), random = Math.random, flags = createFlags(db, config) }: Deps) {
  const app = new Hono<Env>();
  const iso = () => now().toISOString();
  /** Server errors and uptime, in memory, for the console's health screen. */
  const ops: OpsState = { startedAt: now().toISOString(), errors: [] };

  // Browsers on the listed sites (such as the GitHub Pages copy of the app) may call the API.
  // Sign in uses bearer tokens, never cookies, so credentials stay off.
  if (config.allowedOrigins.length) {
    const allowed = new Set(config.allowedOrigins);
    app.use(
      '/api/*',
      cors({
        origin: (origin) => (allowed.has(origin) ? origin : null),
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        maxAge: 86_400,
        credentials: false,
      }),
    );
  }

  // Plain error messages players can act on; details stay in the log.
  app.onError((err, c) => {
    console.error(err);
    ops.errors.push(now().getTime());
    if (ops.errors.length > 1000) ops.errors.splice(0, ops.errors.length - 1000);
    return c.json({ error: 'Something went wrong on the server. Try again in a moment.' }, 500);
  });

  /** The user behind this request's bearer token, renewing the session. */
  const sessionUser = (c: Context): { user: UserRow; token: string } | undefined => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return undefined;
    const row = db
      .prepare('SELECT u.*, s.last_seen FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
      .get(sha256(token)) as (UserRow & { last_seen: string }) | undefined;
    if (!row) return undefined;
    if (now().getTime() - Date.parse(row.last_seen) > SESSION_IDLE_DAYS * 86_400_000) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
      return undefined;
    }
    db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').run(iso(), sha256(token));
    // The last visit, for the closing note and the email sunset. Written at most once an hour.
    const hourAgo = new Date(now().getTime() - 3_600_000).toISOString();
    db.prepare('UPDATE users SET last_active_at = ? WHERE id = ? AND (last_active_at IS NULL OR last_active_at < ?)').run(iso(), row.id, hourAgo);
    const { last_seen: _seen, ...user } = row;
    return { user, token };
  };

  const requireUser = async (c: Context<Env>, next: () => Promise<void>) => {
    const header = c.req.header('Authorization') ?? '';
    if (!header.startsWith('Bearer ')) return c.json({ error: 'Sign in first.' }, 401);
    const found = sessionUser(c);
    if (!found) return c.json({ error: 'Your sign in has expired. Sign in again.' }, 401);
    c.set('user', found.user);
    c.set('token', found.token);
    await next();
  };

  const freshUser = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow;
  const passkeyCount = (id: string) => (db.prepare('SELECT COUNT(*) AS n FROM passkeys WHERE user_id = ?').get(id) as { n: number }).n;
  const userJson = (u: UserRow) => publicUser(u, now(), passkeyCount(u.id), config.proForEveryone);

  /** A new session for a user: the token goes to the device, only its hash is stored. */
  const startSession = (userId: string) => {
    const token = newToken();
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)').run(sha256(token), userId, iso(), iso());
    return { token, user: userJson(freshUser(userId)) };
  };

  /**
   * Every new account gets an unsubscribe token and, by chance, a place in
   * the lifecycle holdout (no marketing email), so the emails can be
   * measured against players who never got them.
   */
  const initUser = (id: string) => {
    db.prepare('UPDATE users SET unsub_token = ?, holdout = ? WHERE id = ?').run(newToken(), random() < flags.num('lifecycle.holdout') ? 1 : 0, id);
  };

  const emailReady = () => !!config.email.resendKey || config.devCodes;

  // Health and features -------------------------------------------------------

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      features: {
        accounts: emailReady() || passkeysReady(config),
        email: emailReady(),
        passkeys: passkeysReady(config),
        billing: !!(stripe && config.stripe.priceAnnual && config.stripe.priceMonthly),
        push: !!(config.push.publicKey && config.push.privateKey),
        coach: !!coach && flags.bool('coach.enabled'),
        // Testing: every signed in player has Aced Pro.
        proForEveryone: config.proForEveryone,
      },
    }),
  );

  // Sign in with an emailed code ---------------------------------------------------

  /** Emails a 6 digit code, limited to a few an hour for each address. */
  const sendCode = async (c: Context, rawEmail: unknown) => {
    if (!emailReady()) return c.json({ error: 'Email sign in is not set up on this server.' }, 503);
    const email = normalizeEmail(rawEmail);
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
    await mailer.send(email, `Your Aced code: ${code}`, `Your Aced sign in code is ${code}. It works for 10 minutes.\n\nIf you did not ask for it, ignore this email.`);
    return c.json({ ok: true, ...(config.devCodes ? { devCode: code } : {}) });
  };

  /** Checks a code. Returns the email it proves, or an error response. A right code works once. */
  const checkCode = (c: Context, body: { email?: unknown; code?: unknown }): { email: string } | Response => {
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
    db.prepare('DELETE FROM login_codes WHERE email = ?').run(email);
    return { email };
  };

  app.post('/api/auth/start', async (c) => sendCode(c, (await json<{ email: string }>(c)).email));

  app.post('/api/auth/verify', async (c) => {
    const checked = checkCode(c, await json<{ email: string; code: string }>(c));
    if (checked instanceof Response) return checked;
    const { email } = checked;
    const user = tx(db, () => {
      let u = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRow | undefined;
      if (!u) {
        const id = newId();
        db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').run(id, email, iso());
        initUser(id);
        u = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRow;
      }
      return u;
    });
    return c.json(startSession(user.id));
  });

  // Add an email to the signed in account (a passkey account starts without one).
  app.post('/api/me/email/start', requireUser, async (c) => {
    const email = normalizeEmail((await json<{ email: string }>(c)).email);
    if (email && db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, c.get('user').id))
      return c.json({ error: 'That email is already used by another Aced account.' }, 409);
    return sendCode(c, email ?? '');
  });

  app.post('/api/me/email/verify', requireUser, async (c) => {
    const checked = checkCode(c, await json<{ email: string; code: string }>(c));
    if (checked instanceof Response) return checked;
    const u = c.get('user');
    if (db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(checked.email, u.id))
      return c.json({ error: 'That email is already used by another Aced account.' }, 409);
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(checked.email, u.id);
    return c.json({ user: userJson(freshUser(u.id)) });
  });

  app.post('/api/auth/logout', requireUser, (c) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(c.get('token')));
    return c.json({ ok: true });
  });

  // Profile -----------------------------------------------------------------

  app.get('/api/me', requireUser, (c) => c.json({ user: userJson(c.get('user')) }));

  app.patch('/api/me', requireUser, async (c) => {
    const body = await json<{
      handle: string | null;
      tz: string;
      cueMinutes: number | null;
      reminders: boolean;
      trialReminder: boolean;
      reminderBody: string | null;
      leagues: boolean;
      lastStudyDay: string;
      emailOptIn: boolean;
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
    if (body.trialReminder !== undefined) set.trial_reminder = body.trialReminder ? 1 : 0;
    if (body.reminderBody !== undefined) {
      // Plain text for a notification: one line, no control characters, short.
      const line = typeof body.reminderBody === 'string' ? body.reminderBody.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 140) : '';
      set.reminder_body = line || null;
    }
    if (body.leagues !== undefined) set.leagues = body.leagues ? 1 : 0;
    // Consent is recorded with its time (CASL asks for proof). Turning it off keeps the record of when it was given.
    if (body.emailOptIn !== undefined && !!body.emailOptIn !== !!u.email_opt_in) {
      set.email_opt_in = body.emailOptIn ? 1 : 0;
      if (body.emailOptIn) set.email_opt_in_at = iso();
    }
    if (body.lastStudyDay !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.lastStudyDay)) return c.json({ error: 'Bad date.' }, 400);
      set.last_study_day = body.lastStudyDay;
    }
    const keys = Object.keys(set);
    if (keys.length) db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...(Object.values(set) as never[]), u.id);
    return c.json({ user: userJson(freshUser(u.id)) });
  });

  /** Deletes the account and everything stored with it. Billing must be cancelled in Stripe separately. */
  app.delete('/api/me', requireUser, (c) => {
    // Usage counts stay anonymous: the link to this account goes with it.
    unlinkUser(db, c.get('user').id);
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
        return c.json({ error: 'That is not Aced data.' }, 400);
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

  // Passkeys ---------------------------------------------------------------------

  mountPasskeys(app, {
    db,
    config,
    lib: webauthn,
    now,
    userFor: (c) => sessionUser(c)?.user,
    signIn: startSession,
    userJson: (id) => userJson(freshUser(id)),
    onUserCreated: initUser,
  });

  // Billing (Stripe) ---------------------------------------------------------

  const billingReady = () => !!(stripe && config.stripe.priceAnnual && config.stripe.priceMonthly);
  const lifetimeReady = () => !!(stripe && config.stripe.priceLifetime) && flags.bool('founding.open');
  const foundingSeats = () => flags.num('founding.seats');
  const LIVE = ['active', 'trialing', 'past_due'];

  /** The player's Stripe customer, made on their first purchase. */
  const customerFor = async (u: UserRow) => {
    if (u.stripe_customer) return u.stripe_customer;
    const customer = (await stripe!('POST', 'customers', { email: u.email ?? undefined, metadata: { user_id: u.id } })).id as string;
    db.prepare('UPDATE users SET stripe_customer = ? WHERE id = ?').run(customer, u.id);
    return customer;
  };

  /** The retention coupon as Stripe describes it, cached for an hour (a failed read is retried after 5 minutes). */
  let couponCache: { until: number; info?: CouponInfo } | undefined;
  const retentionCoupon = async (): Promise<CouponInfo | undefined> => {
    const id = config.stripe.retentionCoupon;
    if (!stripe || !id) return undefined;
    if (couponCache && now().getTime() < couponCache.until) return couponCache.info;
    try {
      const info = couponInfo(await stripe('GET', `coupons/${encodeURIComponent(id)}`));
      couponCache = { until: now().getTime() + 3_600_000, info };
    } catch (e) {
      console.error('Could not read the retention coupon', e);
      couponCache = { until: now().getTime() + 300_000 };
    }
    return couponCache.info;
  };

  /**
   * Accounts that paid before Aced stored the subscription id: ask Stripe
   * once for the latest subscription and store it.
   */
  const syncSubscription = async (u: UserRow): Promise<UserRow> => {
    if (!stripe || !u.stripe_customer || u.stripe_subscription || u.lifetime) return u;
    const list = await stripe('GET', `subscriptions?customer=${encodeURIComponent(u.stripe_customer)}&status=all&limit=1`);
    const sub = (list.data as Record<string, unknown>[] | undefined)?.[0];
    if (sub) applySubscription(db, config, u.id, sub, now());
    return freshUser(u.id);
  };

  const statusOf = (u: UserRow) =>
    subscriptionStatus({ lifetime: !!u.lifetime, subStatus: u.sub_status, pausedUntil: u.paused_until, proUntil: u.pro_until, now: now() });

  /** What decides the cancel flow's offers. Stripe is asked about the coupon only when it could be offered. */
  const offerFacts = async (u: UserRow) => {
    const base = {
      plan: u.plan,
      status: statusOf(u),
      cancelAtPeriodEnd: !!u.cancel_at_period_end,
      couponTakenAt: u.retention_coupon_at,
      annualAvailable: !!config.stripe.priceAnnual,
      now: now(),
    };
    const couldShow = retentionOffer('too_expensive', { ...base, coupon: { id: 'probe', percentOff: 1, duration: 'once' } })?.kind === 'coupon';
    return { ...base, coupon: couldShow ? await retentionCoupon() : undefined };
  };

  const offerJson = (o: RetentionOffer | null) =>
    !o
      ? null
      : o.kind === 'coupon'
        ? { kind: 'coupon' as const, text: describeCoupon(o.coupon), percentOff: o.coupon.percentOff ?? null, amountOff: o.coupon.amountOff ?? null, duration: o.coupon.duration, months: o.coupon.months ?? null }
        : o.kind === 'pause'
          ? { kind: 'pause' as const, months: [...o.months] }
          : { kind: 'annual' as const };

  /** The subscription as the Manage Pro screen shows it. */
  const subscriptionJson = async (u: UserRow) => {
    const status = statusOf(u);
    const bonus = bonusPro(u, now());
    const offers = offersByReason(await offerFacts(u));
    return {
      plan: u.lifetime ? 'lifetime' : paidPro(u, now()) ? u.plan : bonus ? 'invite' : u.plan,
      status,
      // Where it is billed. App Store and Play come with the native apps.
      store: u.lifetime || u.stripe_subscription ? ('stripe' as const) : null,
      currentPeriodEnd: u.lifetime ? null : u.paused_until ? u.paid_through : u.pro_until,
      cancelAtPeriodEnd: !!u.cancel_at_period_end,
      pausedUntil: u.paused_until,
      billingIssue: !!u.billing_issue && !u.lifetime,
      bonusUntil: bonus ? u.bonus_until : null,
      offers: Object.fromEntries(Object.entries(offers).map(([k, o]) => [k, offerJson(o)])),
    };
  };

  app.get('/api/billing/subscription', requireUser, async (c) => {
    const u = await syncSubscription(c.get('user'));
    return c.json(await subscriptionJson(u));
  });

  app.post('/api/billing/checkout', requireUser, async (c) => {
    if (!billingReady()) return c.json({ error: 'Purchases are not open yet.' }, 503);
    const body = await json<{ plan: string; offer: string }>(c);
    const plan = body.plan;
    const price = plan === 'annual' ? config.stripe.priceAnnual : plan === 'monthly' ? config.stripe.priceMonthly : undefined;
    if (!price) return c.json({ error: 'Choose a plan.' }, 400);
    const u = c.get('user');
    if (u.lifetime) return c.json({ error: 'You have Aced Pro for as long as Aced runs. There is nothing more to buy.' }, 409);
    const customer = await customerFor(u);
    // One free trial per player, on the yearly plan, matching the paywall.
    const trial = plan === 'annual' && !u.trial_used && config.stripe.trialDays > 0 ? config.stripe.trialDays : undefined;
    // The win-back offer: the retention coupon, 60 to 90 days after Pro ended, at most once a year.
    const winback = body.offer === 'winback' && !!config.stripe.retentionCoupon && winbackEligible(u.churned_at, u.retention_coupon_at, now());
    const session = await stripe!('POST', 'checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: u.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { user_id: u.id }, ...(trial ? { trial_period_days: trial } : {}) },
      // Stripe takes a coupon or promotion codes, not both.
      ...(winback ? { discounts: [{ coupon: config.stripe.retentionCoupon }], metadata: { offer: 'winback' } } : { allow_promotion_codes: true }),
      success_url: `${config.appUrl}/pro?checkout=success`,
      cancel_url: `${config.appUrl}/pro?checkout=cancel`,
    });
    return c.json({ url: session.url });
  });

  app.post('/api/billing/portal', requireUser, async (c) => {
    const u = c.get('user');
    if (!billingReady() || !u.stripe_customer) return c.json({ error: 'No subscription found for this account.' }, 404);
    const session = await stripe!('POST', 'billing_portal/sessions', { customer: u.stripe_customer, return_url: `${config.appUrl}/account` });
    return c.json({ url: session.url });
  });

  /**
   * The cancel flow. The reason comes first (and may be skipped). With acceptOffer the one offer
   * for that reason is taken (a coupon, yearly or a pause); without it the
   * subscription cancels at the end of the paid period, and Pro stays on
   * until then. Either way the answer is stored for us to read.
   */
  app.post('/api/billing/cancel', requireUser, async (c) => {
    if (!stripe) return c.json({ error: 'Purchases are not open yet.' }, 503);
    const body = await json<{ reason: unknown; detail: unknown; acceptOffer: unknown; pauseMonths: unknown }>(c);
    // A reason is optional: cancelling never waits on an answer. A skipped one is stored as none.
    const given = body.reason === undefined || body.reason === null || body.reason === '' ? null : body.reason;
    if (given !== null && !isCancelReason(given)) return c.json({ error: 'That reason is not one Aced knows.' }, 400);
    const reason = given;
    const u = await syncSubscription(c.get('user'));
    if (u.lifetime) return c.json({ error: 'Your Aced Pro is for as long as Aced runs. There is nothing to cancel.' }, 409);
    if (!u.stripe_subscription || !u.sub_status || !LIVE.includes(u.sub_status)) return c.json({ error: 'There is no subscription to cancel on this account.' }, 404);
    const detail = typeof body.detail === 'string' ? body.detail.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 1000) || null : null;
    const offer = reason ? retentionOffer(reason, await offerFacts(u)) : null;
    if (body.acceptOffer && !offer) return c.json({ error: 'That offer is not open for this account.' }, 409);
    const take = !!body.acceptOffer && !!offer;
    if (take && offer.kind === 'coupon') await applyCoupon(db, config, stripe, u.id, offer.coupon.id, now());
    else if (take && offer.kind === 'annual') await switchToAnnual(db, config, stripe, u.id, now());
    else if (take && offer.kind === 'pause') {
      const months = PAUSE_MONTHS.find((m) => m === body.pauseMonths) ?? PAUSE_MONTHS[0];
      await pause(db, config, stripe, u.id, months, now());
    } else await cancelAtPeriodEnd(db, config, stripe, u.id, now());
    db.prepare('INSERT INTO cancel_feedback (user_id, reason, detail, offer_shown, offer_taken, at) VALUES (?, ?, ?, ?, ?, ?)').run(
      u.id,
      reason ?? 'none',
      detail,
      offerLabel(offer),
      take ? 1 : 0,
      iso(),
    );
    // The money side of the cancel flow, counted once here (the webhook does not count it again).
    if (take && offer.kind === 'pause') serverEvent(db, 'subscription_paused', { months: PAUSE_MONTHS.find((m) => m === body.pauseMonths) ?? PAUSE_MONTHS[0] }, { userId: u.id, now: now() });
    if (take) serverEvent(db, 'retention_offer_taken', { offer: offer.kind, reason: reason ?? 'none' }, { userId: u.id, now: now() });
    else serverEvent(db, 'subscription_cancelled', { plan: u.plan ?? undefined, reason: reason ?? 'none', offer: offer?.kind }, { userId: u.id, now: now() });
    const after = freshUser(u.id);
    return c.json({ outcome: take ? offer!.kind : 'canceled', subscription: await subscriptionJson(after), user: userJson(after) });
  });

  /** Undoes a cancel before the period ends, or ends a pause early. */
  app.post('/api/billing/resume', requireUser, async (c) => {
    if (!stripe) return c.json({ error: 'Purchases are not open yet.' }, 503);
    const u = c.get('user');
    if (!u.stripe_subscription || !(u.cancel_at_period_end || u.paused_until)) return c.json({ error: 'Aced Pro is not cancelled or paused.' }, 409);
    await resume(db, config, stripe, u.id, now());
    serverEvent(db, 'subscription_resumed', { from: u.paused_until ? 'pause' : 'cancel' }, { userId: u.id, now: now() });
    const after = freshUser(u.id);
    return c.json({ subscription: await subscriptionJson(after), user: userJson(after) });
  });

  // Founding members: one payment, Pro for as long as Aced runs, FOUNDING_SEATS seats.

  /** Seats bought, and seats held by checkouts still open. A seat stays taken after its account is deleted. */
  const foundingCounts = () => ({
    taken: (db.prepare('SELECT COUNT(*) AS n FROM lifetime_checkouts WHERE completed_at IS NOT NULL').get() as { n: number }).n,
    held: (db.prepare('SELECT COUNT(*) AS n FROM lifetime_checkouts WHERE completed_at IS NULL AND expires_at > ?').get(iso()) as { n: number }).n,
  });

  app.get('/api/billing/founding', (c) => {
    const { taken, held } = foundingCounts();
    const left = seatsLeft(taken, held, foundingSeats());
    return c.json({ price: FOUNDING_PRICE, seats: foundingSeats(), taken, left, open: lifetimeReady() && left > 0 });
  });

  app.post('/api/billing/lifetime', requireUser, async (c) => {
    if (!lifetimeReady()) return c.json({ error: 'Founding seats are not open yet.' }, 503);
    const u = c.get('user');
    if (u.lifetime) return c.json({ error: 'You already have Aced Pro for as long as Aced runs.' }, 409);
    // Count and hold in one step, so two checkouts at once cannot pass the cap.
    const hold = `hold_${newId()}`;
    const expires = new Date(now().getTime() + (SEAT_HOLD_MINUTES + 2) * 60_000);
    const full = tx(db, () => {
      db.prepare('DELETE FROM lifetime_checkouts WHERE user_id = ? AND completed_at IS NULL').run(u.id);
      const { taken, held } = foundingCounts();
      if (seatsLeft(taken, held, foundingSeats()) <= 0) return true;
      db.prepare('INSERT INTO lifetime_checkouts (session_id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(hold, u.id, iso(), expires.toISOString());
      return false;
    });
    if (full) return c.json({ error: `All ${foundingSeats()} founding seats are taken. Yearly Pro costs the same and is still open.` }, 409);
    try {
      const customer = await customerFor(u);
      const meta = { kind: 'lifetime', user_id: u.id };
      const session = await stripe!('POST', 'checkout/sessions', {
        mode: 'payment',
        customer,
        client_reference_id: u.id,
        line_items: [{ price: config.stripe.priceLifetime, quantity: 1 }],
        metadata: meta,
        payment_intent_data: { metadata: meta },
        // Stripe's shortest expiry is 30 minutes. The seat is held a little longer.
        expires_at: Math.floor(now().getTime() / 1000) + (SEAT_HOLD_MINUTES + 1) * 60,
        success_url: `${config.appUrl}/pro?checkout=success&plan=lifetime`,
        cancel_url: `${config.appUrl}/pro?checkout=cancel`,
      });
      db.prepare('UPDATE lifetime_checkouts SET session_id = ? WHERE session_id = ?').run(session.id as string, hold);
      return c.json({ url: session.url });
    } catch (e) {
      db.prepare('DELETE FROM lifetime_checkouts WHERE session_id = ?').run(hold);
      throw e;
    }
  });

  app.post('/api/billing/webhook', async (c) => {
    const secret = config.stripe.webhookSecret;
    if (!secret) return c.json({ error: 'Webhook not configured.' }, 503);
    const payload = await c.req.text();
    if (!verifyStripeSignature(payload, c.req.header('Stripe-Signature'), secret, Math.floor(now().getTime() / 1000))) {
      jobRan(db, 'webhook', now(), new Error('Bad signature'));
      return c.json({ error: 'Bad signature.' }, 400);
    }
    const event = JSON.parse(payload) as { id: string; type: string; data: { object: Record<string, unknown> } };
    // Stripe can deliver an event more than once.
    if (db.prepare('SELECT 1 FROM stripe_events WHERE id = ?').get(event.id)) return c.json({ received: true });
    const obj = event.data.object;
    const meta = (obj.metadata as { user_id?: string; kind?: string; offer?: string } | null | undefined) ?? {};
    const byCustomer = (customer: unknown) =>
      typeof customer === 'string' ? (db.prepare('SELECT * FROM users WHERE stripe_customer = ?').get(customer) as UserRow | undefined) : undefined;
    // A subscription left running after a founding purchase is cancelled once the webhook is done.
    let retire: string | undefined;
    const ev = (name: Parameters<typeof serverEvent>[1], props: Record<string, unknown>, userId?: string) =>
      serverEvent(db, name, props as never, { userId, now: now() });
    tx(db, () => {
      db.prepare('INSERT INTO stripe_events (id, at) VALUES (?, ?)').run(event.id, iso());
      if (event.type === 'checkout.session.completed' && obj.client_reference_id && obj.customer) {
        db.prepare('UPDATE users SET stripe_customer = ? WHERE id = ? AND stripe_customer IS NULL').run(obj.customer as string, obj.client_reference_id as string);
      }
      if (event.type === 'checkout.session.completed' && obj.mode === 'payment' && meta.kind === 'lifetime' && obj.payment_status === 'paid') {
        const userId = (obj.client_reference_id as string | undefined) ?? meta.user_id;
        const u = userId ? userById(userId) : undefined;
        db.prepare(
          'INSERT INTO lifetime_checkouts (session_id, user_id, created_at, expires_at, completed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (session_id) DO UPDATE SET completed_at = excluded.completed_at',
        ).run(obj.id as string, userId ?? 'unknown', iso(), iso(), iso());
        if (u) {
          db.prepare(
            "UPDATE users SET lifetime = 1, plan = 'lifetime', pro_until = NULL, trialing = 0, churned_at = NULL, billing_issue = 0, billing_issue_at = NULL, paused_until = NULL, paid_through = NULL, last_paid_at = ? WHERE id = ?",
          ).run(iso(), u.id);
          if (typeof obj.amount_total === 'number') db.prepare('UPDATE users SET revenue_cents = revenue_cents + ? WHERE id = ?').run(obj.amount_total, u.id);
          if (!u.lifetime) ev('founding_seat_sold', { amount: typeof obj.amount_total === 'number' ? obj.amount_total / 100 : undefined }, u.id);
          if (u.stripe_subscription && u.sub_status && LIVE.includes(u.sub_status) && !u.cancel_at_period_end) retire = u.stripe_subscription;
        }
      }
      if (event.type === 'checkout.session.completed' && meta.offer === 'winback' && obj.client_reference_id) {
        db.prepare('UPDATE users SET retention_coupon_at = ? WHERE id = ?').run(iso(), obj.client_reference_id as string);
      }
      // An abandoned founding checkout gives its seat back.
      if (event.type === 'checkout.session.expired' && meta.kind === 'lifetime') {
        db.prepare('DELETE FROM lifetime_checkouts WHERE session_id = ? AND completed_at IS NULL').run(obj.id as string);
      }
      // A failed renewal: Pro stays on while Stripe retries (the grace period), and Aced asks for a new card.
      if (event.type === 'invoice.payment_failed') {
        const u = byCustomer(obj.customer);
        // One failure per episode: Stripe's retries are not new failures.
        if (u && !u.billing_issue) ev('payment_failed', { plan: u.plan ?? undefined }, u.id);
        if (u) db.prepare('UPDATE users SET billing_issue = 1, billing_issue_at = COALESCE(billing_issue_at, ?) WHERE id = ?').run(iso(), u.id);
      }
      if (event.type === 'invoice.paid') {
        const u = byCustomer(obj.customer);
        const paid = typeof obj.amount_paid === 'number' && obj.amount_paid > 0;
        if (u && u.billing_issue) ev('payment_recovered', { plan: u.plan ?? undefined }, u.id);
        if (u && paid) {
          const amount = (obj.amount_paid as number) / 100;
          db.prepare('UPDATE users SET revenue_cents = revenue_cents + ? WHERE id = ?').run(obj.amount_paid as number, u.id);
          if (!u.last_paid_at) ev('first_payment', { plan: u.plan ?? undefined, after_trial: !!u.trial_used, amount }, u.id);
          else ev('subscription_renewed', { plan: u.plan ?? undefined, amount }, u.id);
        }
        if (u)
          db.prepare('UPDATE users SET billing_issue = 0, billing_issue_at = NULL, last_paid_at = CASE WHEN ? THEN ? ELSE last_paid_at END WHERE id = ?').run(
            paid ? 1 : 0,
            iso(),
            u.id,
          );
      }
      if (event.type.startsWith('customer.subscription.')) {
        const user = meta.user_id ? userById(meta.user_id) : byCustomer(obj.customer);
        if (!user) return;
        applySubscription(db, config, user.id, obj, now());
        const after = userById(user.id)!;
        if (event.type === 'customer.subscription.created') ev('subscription_started', { plan: after.plan ?? undefined, trial: obj.status === 'trialing' }, user.id);
        const live = (s: string | null) => !!s && LIVE.includes(s);
        if (live(user.sub_status) && !live(after.sub_status)) ev('subscription_ended', { plan: user.plan ?? undefined }, user.id);
      }
      // A refund issued in Stripe or from the console. Pro is removed by the console action, not here.
      if (event.type === 'charge.refunded') {
        const u = byCustomer(obj.customer);
        if (u && typeof obj.amount_refunded === 'number') db.prepare('UPDATE users SET revenue_cents = MAX(0, revenue_cents - ?) WHERE id = ?').run(obj.amount_refunded, u.id);
        ev('refund', { amount: typeof obj.amount_refunded === 'number' ? obj.amount_refunded / 100 : undefined }, u?.id);
      }
    });
    jobRan(db, 'webhook', now());
    if (retire && stripe) {
      try {
        await stripe('POST', `subscriptions/${retire}`, { cancel_at_period_end: true });
      } catch (e) {
        console.error('Could not cancel the subscription after a founding purchase', e);
      }
    }
    return c.json({ received: true });
  });

  // Email preferences ---------------------------------------------------------------

  /** A small plain page for the one tap unsubscribe link. */
  const unsubscribePage = (ok: boolean) => {
    const [title, lines] = ok
      ? ["You're unsubscribed", ["Aced won't send you tips or news.", 'Emails about your account and payments still come.', 'Changed your mind? Turn it back on in Settings in Aced.']]
      : ['This link does not work', ['It may be old or copied wrong.', 'Turn off tips and news in Settings in Aced instead.']];
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aced email</title><style>body{margin:0;padding:48px 16px;font:17px/1.5 -apple-system,system-ui,sans-serif;background:#f4f1ec;color:#1f1d1a}main{max-width:28rem;margin:0 auto}h1{font-size:1.5rem}@media (prefers-color-scheme:dark){body{background:#161513;color:#ece8e1}}</style></head><body><main><h1>${title}</h1>${lines.map((l) => `<p>${l}</p>`).join('')}</main></body></html>`;
  };

  /** One tap, from the link (GET) or the mail app's unsubscribe button (POST, RFC 8058). */
  const unsubscribe = (c: Context) => {
    const token = c.req.query('token') ?? '';
    const user = token.length >= 16 ? (db.prepare('SELECT id, email_opt_in FROM users WHERE unsub_token = ?').get(token) as { id: string; email_opt_in: number } | undefined) : undefined;
    const done = !!user && Number(db.prepare('UPDATE users SET email_opt_in = 0 WHERE unsub_token = ?').run(token).changes) > 0;
    if (user?.email_opt_in) serverEvent(db, 'email_unsubscribed', { via: c.req.method === 'POST' ? 'header' : 'link' }, { userId: user.id, now: now() });
    return c.html(unsubscribePage(done), done ? 200 : 404);
  };
  app.get('/api/email/unsubscribe', unsubscribe);
  app.post('/api/email/unsubscribe', unsubscribe);

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

  // AI coach ---------------------------------------------------------------------

  const hasPro = (u: UserRow) => userHasPro(u, now(), config.proForEveryone);

  /** The player's own date, so the daily cap resets at their midnight. */
  const coachDay = (u: UserRow) => {
    try {
      return localTime(now(), u.tz ?? 'UTC').day;
    } catch {
      return localTime(now(), 'UTC').day;
    }
  };

  const coachUsed = (userId: string, day: string) =>
    (db.prepare('SELECT count FROM coach_usage WHERE user_id = ? AND day = ?').get(userId, day) as { count: number } | undefined)?.count ?? 0;

  /** The coach for this player: built in, not switched off in the console, and in the rollout. */
  const coachOn = (u: UserRow) => !!coach && flags.bool('coach.enabled') && flags.on('coach.rollout', u.id);

  app.get('/api/coach', requireUser, (c) => {
    const u = c.get('user');
    const limit = flags.num('coach.daily_limit');
    return c.json({ on: coachOn(u), pro: hasPro(u), limit, remaining: Math.max(0, limit - coachUsed(u.id, coachDay(u))) });
  });

  app.post(
    '/api/coach',
    requireUser,
    bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'This chat is too long. Start a new chat.' }, 413) }),
    async (c) => {
      const u = c.get('user');
      if (!coach || !coachOn(u)) return c.json({ error: 'The coach is not turned on for this server.' }, 503);
      if (!hasPro(u)) return c.json({ error: 'The coach is part of Aced Pro.', reason: 'pro' }, 403);
      const parsed = parseCoachRequest(await json(c));
      if (!parsed.ok) return c.json({ error: parsed.error }, 400);

      // Reserve today's message before calling, so two requests at once cannot pass the cap.
      const day = coachDay(u);
      const limit = flags.num('coach.daily_limit');
      const reserved = tx(db, () => {
        const n = coachUsed(u.id, day);
        if (n >= limit) return undefined;
        db.prepare('INSERT INTO coach_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT (user_id, day) DO UPDATE SET count = count + 1').run(u.id, day);
        return n + 1;
      });
      if (reserved === undefined)
        return c.json({ error: `You have used all ${limit} coach messages for today. You get ${limit} more at midnight.`, remaining: 0 }, 429);
      const remaining = Math.max(0, limit - reserved);

      try {
        const result = await askCoach(coach!, { model: config.coach.model, effort: config.coach.effort, messages: parsed.messages, context: parsed.context });
        if (result.kind === 'refusal') return c.json({ reply: REFUSAL_REPLY, refused: true, remaining });
        return c.json({ reply: result.text + (result.truncated ? TRUNCATED_NOTE : ''), remaining });
      } catch (err) {
        // A failed call does not use up a message.
        db.prepare('UPDATE coach_usage SET count = MAX(0, count - 1) WHERE user_id = ? AND day = ?').run(u.id, day);
        console.error('Coach request failed', err);
        const { status, error } = coachErrorResponse(err);
        return c.json({ error }, status);
      }
    },
  );

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

  // Invites ------------------------------------------------------------------------
  // A friend who joins with a code gets a month of Pro. The inviter gets a month
  // once the friend has answered QUALIFY_ANSWERS graded questions, up to
  // MAX_REFERRAL_MONTHS a year. Rewards follow study, not sign ups.

  const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newRefCode = () => Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
  const addMonth = (u: UserRow) => {
    const from = Math.max(now().getTime(), u.bonus_until ? Date.parse(u.bonus_until) : 0, u.pro_until ? Date.parse(u.pro_until) : 0);
    db.prepare('UPDATE users SET bonus_until = ? WHERE id = ?').run(new Date(from + REFERRAL_MONTH_DAYS * 86_400_000).toISOString(), u.id);
  };
  const userById = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  const rewardedThisYear = (referrer: string) =>
    (db.prepare('SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND rewarded = 1 AND qualified_at > ?').get(referrer, new Date(now().getTime() - 365 * 86_400_000).toISOString()) as { n: number }).n;

  /** Counts an invite once the friend has studied enough, and pays the inviter if they have months left this year. */
  const qualifyReferral = (userId: string) => {
    const ref = db.prepare('SELECT referrer_id FROM referrals WHERE referred_id = ? AND qualified_at IS NULL').get(userId) as { referrer_id: string } | undefined;
    if (!ref) return;
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM answers WHERE user_id = ?').get(userId) as { n: number };
    if (n < QUALIFY_ANSWERS) return;
    tx(db, () => {
      const pay = rewardedThisYear(ref.referrer_id) < MAX_REFERRAL_MONTHS;
      db.prepare('UPDATE referrals SET qualified_at = ?, rewarded = ? WHERE referred_id = ?').run(iso(), pay ? 1 : 0, userId);
      const referrer = userById(ref.referrer_id);
      if (pay && referrer) addMonth(referrer);
    });
  };

  app.get('/api/referrals', requireUser, (c) => {
    let u = c.get('user');
    if (!u.ref_code) {
      for (let i = 0; i < 5 && !u.ref_code; i++) {
        try {
          db.prepare('UPDATE users SET ref_code = ? WHERE id = ? AND ref_code IS NULL').run(newRefCode(), u.id);
        } catch {
          // A clash with another code: try again.
        }
        u = userById(u.id)!;
      }
    }
    const friends = db.prepare('SELECT joined_at, qualified_at FROM referrals WHERE referrer_id = ? ORDER BY joined_at DESC').all(u.id) as { joined_at: string; qualified_at: string | null }[];
    const months = (db.prepare('SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND rewarded = 1').get(u.id) as { n: number }).n;
    return c.json({
      code: u.ref_code,
      friends: friends.map((f) => ({ joinedAt: f.joined_at, qualified: !!f.qualified_at })),
      months,
      monthsLeft: Math.max(0, MAX_REFERRAL_MONTHS - rewardedThisYear(u.id)),
      bonusUntil: u.bonus_until && Date.parse(u.bonus_until) > now().getTime() ? u.bonus_until : null,
    });
  });

  app.get('/api/referrals/code/:code', (c) => {
    const row = db.prepare('SELECT handle FROM users WHERE ref_code = ?').get(c.req.param('code').toUpperCase()) as { handle: string | null } | undefined;
    return row ? c.json({ name: row.handle }) : c.json({ error: 'That invite code is not known.' }, 404);
  });

  app.post('/api/referrals/claim', requireUser, async (c) => {
    const u = c.get('user');
    const code = String((await json<{ code: string }>(c)).code ?? '').toUpperCase();
    const referrer = db.prepare('SELECT * FROM users WHERE ref_code = ?').get(code) as UserRow | undefined;
    if (!referrer) return c.json({ error: 'That invite code is not known.' }, 404);
    if (referrer.id === u.id) return c.json({ error: 'You cannot invite yourself.' }, 400);
    if (now().getTime() - Date.parse(u.created_at) > REFERRAL_CLAIM_DAYS * 86_400_000) return c.json({ error: 'Invites are for new accounts.' }, 400);
    const already = db.prepare('SELECT 1 FROM referrals WHERE referred_id = ?').get(u.id);
    if (already) return c.json({ user: userJson(userById(u.id)!), claimed: false });
    tx(db, () => {
      db.prepare('INSERT INTO referrals (referred_id, referrer_id, joined_at) VALUES (?, ?, ?)').run(u.id, referrer.id, iso());
      addMonth(u);
    });
    qualifyReferral(u.id);
    return c.json({ user: userJson(userById(u.id)!), claimed: true });
  });

  // Waitlists -------------------------------------------------------------------------

  // The site's "notify me" forms: iPhone, Android and founding members. Joining twice is fine.
  // A bot that fills the hidden company field gets the normal answer and nothing is stored.
  // Each address may try WAITLIST_PER_MINUTE times a minute.
  const waitlistHits = new Map<string, number[]>();
  const clientIp = (c: Context) => {
    const header = c.req.header('fly-client-ip') ?? c.req.header('cf-connecting-ip') ?? c.req.header('true-client-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0];
    if (header?.trim()) return header.trim();
    try {
      return getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      return 'unknown';
    }
  };
  const tooMany = (ip: string) => {
    const t = now().getTime();
    const hits = (waitlistHits.get(ip) ?? []).filter((at) => at > t - 60_000);
    hits.push(t);
    waitlistHits.set(ip, hits);
    // Forget quiet addresses now and then, so the map stays small.
    if (waitlistHits.size > 5000) for (const [k, v] of waitlistHits) if (v.every((at) => at <= t - 60_000)) waitlistHits.delete(k);
    return hits.length > WAITLIST_PER_MINUTE;
  };

  app.post('/api/waitlist', async (c) => {
    if (tooMany(clientIp(c))) return c.json({ error: 'Too many tries. Wait a minute and try again.' }, 429);
    const body = await json<{ email?: unknown; list?: unknown; source?: unknown; platform?: unknown; company?: unknown }>(c);
    const email = String(body.email ?? '').trim().toLowerCase();
    const list = String(body.list ?? '');
    if (typeof body.company === 'string' && body.company.trim()) return c.json({ ok: true });
    if (!WAITLISTS.includes(list)) return c.json({ error: 'Pick iPhone, Android or founding member.' }, 400);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Enter a valid email address.' }, 400);
    const tag = (v: unknown) => (typeof v === 'string' && v.trim() ? v.replace(/[^\w.:/-]/g, '').slice(0, 80) || null : null);
    db.prepare('INSERT OR IGNORE INTO waitlist (email, list, joined_at, source, platform) VALUES (?, ?, ?, ?, ?)').run(email, list, iso(), tag(body.source), tag(body.platform));
    return c.json({ ok: true });
  });

  // Analytics (docs/ANALYTICS.md) -----------------------------------------------------

  // Cookieless and anonymous. Browsers send text/plain (a simple request, no
  // preflight) with sendBeacon or fetch in no-cors mode, so the answer is
  // never read: a bad batch is simply dropped. No IP address is stored; the
  // address is used only in memory, for the rate limit.
  const limiter = new RateLimiter();
  const eventsBody = bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'Too large.' }, 413) });

  app.post('/api/events', eventsBody, async (c) => {
    let raw: unknown;
    try {
      raw = JSON.parse(await c.req.text());
    } catch {
      return c.json({ error: 'Not JSON.' }, 400);
    }
    const t = now().getTime();
    const batch = parseBatch(raw, t);
    if (!batch) return c.json({ error: 'Not a batch.' }, 400);
    // Paused from the console: accepted and dropped, so devices do not retry.
    if (!flags.bool('analytics.enabled')) return c.json({ accepted: 0, rejected: batch.events.length + batch.rejected, paused: true }, 202);
    if (!limiter.allow(batch.install, clientIp(c), batch.events.length, t)) return c.json({ error: 'Too many events.' }, 429);
    if (!limiter.fresh(batch.install, batch.batch, t)) return c.json({ accepted: 0, rejected: 0, duplicate: true }, 202);
    return c.json(ingest(db, batch), 202);
  });

  // The Settings switch turned off: delete what this install sent.
  app.post('/api/events/forget', eventsBody, async (c) => {
    let install: unknown;
    try {
      install = (JSON.parse(await c.req.text()) as { install?: unknown }).install;
    } catch {
      install = undefined;
    }
    if (!validId(install)) return c.json({ error: 'Not an install.' }, 400);
    if (!limiter.allow(`forget:${clientIp(c)}`, clientIp(c), 1, now().getTime())) return c.json({ error: 'Too many requests.' }, 429);
    return c.json({ deleted: forgetInstall(db, install) });
  });

  // After making an account or signing in: tie this install to the account.
  app.post('/api/events/link', requireUser, async (c) => {
    const body = await json<{ install: unknown }>(c);
    if (!validId(body.install)) return c.json({ error: 'Not an install.' }, 400);
    return c.json({ linked: linkInstall(db, body.install, c.get('user').id, now()) });
  });

  // Public flags for the site and the app. Cached briefly; both keep a copy and safe defaults.
  app.get('/api/config', (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ v: 1, flags: flags.public() });
  });

  // The operations console ------------------------------------------------------------
  mountAdmin(app, { db, config, flags, stripe, mailer, now, ops, random });

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
    if (stored) qualifyReferral(c.get('user').id);
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

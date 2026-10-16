import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// Tokens and codes -------------------------------------------------------

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const newId = () => randomBytes(12).toString('base64url');
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function normalizeEmail(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : undefined;
}

export const validHandle = (h: unknown): h is string => typeof h === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(h);

// Email ----------------------------------------------------------------

export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

/** Sends through Resend when a key is set; otherwise prints to the log for local use. */
export function createMailer(resendKey: string | undefined, from: string): Mailer {
  if (!resendKey) {
    return {
      async send(to, subject, text) {
        console.log(`[email to ${to}] ${subject}\n${text}`);
      },
    };
  }
  return {
    async send(to, subject, text) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
    },
  };
}

// Stripe -----------------------------------------------------------------

/** Encodes nested params the way Stripe expects: line_items[0][price]=... */
export function stripeForm(params: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => parts.push(typeof item === 'object' ? stripeForm(item as Record<string, unknown>, `${key}[${i}]`) : `${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`));
    else if (typeof v === 'object') parts.push(stripeForm(v as Record<string, unknown>, key));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.filter(Boolean).join('&');
}

export type StripeCall = (method: 'GET' | 'POST', path: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

export function createStripe(secretKey: string): StripeCall {
  return async (method, path, params) => {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method,
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: method === 'POST' && params ? stripeForm(params) : undefined,
    });
    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Stripe ${path}: ${(body.error as { message?: string } | undefined)?.message ?? res.status}`);
    return body;
  };
}

/** Checks a Stripe-Signature header (v1 scheme) against the raw body. */
export function verifyStripeSignature(payload: string, header: string | undefined, secret: string, nowSeconds: number, toleranceSeconds = 300): boolean {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(t) || !signatures.length || Math.abs(nowSeconds - t) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex'));
  return signatures.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export interface Entitlement {
  proUntil: string | null;
  plan: string | null;
  trialing: boolean;
}

/**
 * What a Stripe subscription grants. Newer API versions keep the period end
 * on each item instead of the subscription, so both are read.
 */
export function entitlementFromSubscription(
  sub: Record<string, unknown>,
  prices: { annual?: string; monthly?: string },
  nowSeconds: number,
): Entitlement {
  const items = (sub.items as { data?: { price?: { id?: string }; current_period_end?: number }[] } | undefined)?.data ?? [];
  const priceId = items[0]?.price?.id;
  const plan = priceId === prices.annual ? 'annual' : priceId === prices.monthly ? 'monthly' : null;
  const status = sub.status as string;
  const periodEnd = (sub.current_period_end as number | undefined) ?? items[0]?.current_period_end;
  const trialEnd = sub.trial_end as number | undefined;
  const live = status === 'active' || status === 'trialing' || status === 'past_due';
  const end = live ? (status === 'trialing' && trialEnd ? trialEnd : periodEnd) : (sub.ended_at as number | undefined) ?? nowSeconds;
  return {
    proUntil: end ? new Date(end * 1000).toISOString() : null,
    plan,
    trialing: status === 'trialing',
  };
}

// Reminders ---------------------------------------------------------------

/** Local date (YYYY-MM-DD) and minutes after midnight in a time zone. */
export function localTime(now: Date, tz: string): { day: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export interface ReminderCandidate {
  tz: string;
  cueMinutes: number;
  lastStudyDay: string | null;
  /** Reminders sent since the player last studied, newest first. */
  sentSinceStudy: string[];
}

/** Window after the cue time in which a reminder may go out (the scheduler runs every few minutes). */
export const REMINDER_WINDOW_MIN = 30;

/**
 * One reminder a day at the player's own study time, only if they have not
 * studied yet. Ignored reminders decay: after three in a row, every third
 * day; after seven, none until the player comes back.
 */
export function shouldRemind(c: ReminderCandidate, now: Date): { send: boolean; day: string } {
  const { day, minutes } = localTime(now, c.tz);
  const inWindow = minutes >= c.cueMinutes && minutes < c.cueMinutes + REMINDER_WINDOW_MIN;
  if (!inWindow || c.lastStudyDay === day || c.sentSinceStudy.includes(day)) return { send: false, day };
  const ignored = c.sentSinceStudy.length;
  if (ignored >= 7) return { send: false, day };
  if (ignored >= 3) {
    const last = c.sentSinceStudy[0];
    const daysSince = (Date.parse(day) - Date.parse(last)) / 86_400_000;
    if (daysSince < 3) return { send: false, day };
  }
  return { send: true, day };
}

// Leagues -----------------------------------------------------------------

export const LEAGUE_SIZE = 30;

/** Monday of the current week (UTC) as YYYY-MM-DD; leagues run Monday to Monday. */
export function weekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Leagues group players by Suited Rating tier (150 points wide from 900), so players compete with similar levels. */
export function ratingBand(rating: number): number {
  return Math.max(0, Math.min(8, Math.floor((rating - 900) / 150) + 1));
}

// Item calibration ------------------------------------------------------------

export const CALIBRATION_MIN_ANSWERS = 30;

/**
 * Fits an item's difficulty from players' answers: the difficulty at which
 * the Elo expected scores add up to the observed scores (maximum likelihood
 * for the logistic model), by Newton steps from a prior.
 */
export function fitDifficulty(answers: readonly { score: number; rating: number }[], prior = 1300): number {
  let d = prior;
  const k = Math.LN10 / 400;
  for (let i = 0; i < 30; i++) {
    let f = 0;
    let df = 0;
    for (const a of answers) {
      const p = 1 / (1 + 10 ** ((d - a.rating) / 400));
      f += a.score - p;
      df += p * (1 - p) * k;
    }
    if (df < 1e-9) break;
    // Expected scores fall as difficulty rises, so f grows with d: step against it.
    const step = Math.max(-200, Math.min(200, f / df));
    d -= step;
    if (Math.abs(step) < 0.01) break;
  }
  return Math.max(600, Math.min(2400, d));
}

// Daily challenge stats ------------------------------------------------------------

export function dailySummary(rows: readonly { scores: number[]; right: number }[], mine?: number) {
  const players = rows.length;
  const distribution = [0, 1, 2, 3, 4, 5].map((n) => rows.filter((r) => r.right === n).length);
  const items = [0, 1, 2, 3, 4].map((i) => (players ? rows.filter((r) => (r.scores[i] ?? 0) >= 1).length / players : 0));
  // Share of players you did better than, counting ties as half.
  const percentile =
    mine === undefined || !players ? undefined : (rows.filter((r) => r.right < mine).length + rows.filter((r) => r.right === mine).length / 2) / players;
  return { players, distribution, items, percentile };
}

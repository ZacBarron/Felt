import { localDay } from '@felt/core/analytics';
import type { Db } from '../db.ts';

/**
 * The console's numbers (docs/ANALYTICS.md, Metric definitions). Every
 * query reads the small rollups (installs, install_days, milestones,
 * exposures) or the events index on (name, day), so each one stays fast
 * with millions of raw events. A test checks the query plans.
 */

export interface Filters {
  from: string;
  to: string;
  source?: string;
  platform?: string;
  /** '1' in an in-app browser, '0' not. */
  inApp?: string;
}

const DAY = 86_400_000;
const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Reads filters from a query string. The default range is the last 30 days. */
export function parseFilters(q: Record<string, string | undefined>, now: Date): Filters {
  const today = localDay(now.getTime(), 0);
  const to = isDay(q.to) ? q.to : today;
  const days = Number(q.days);
  const from = isDay(q.from) ? q.from : addDays(to, -((Number.isInteger(days) && days > 0 && days <= 400 ? days : 30) - 1));
  const tag = (v: string | undefined) => (v && /^[a-z0-9_.:/,#+-]{1,80}$/.test(v) ? v : undefined);
  return {
    from: from <= to ? from : to,
    to,
    source: tag(q.source),
    platform: ['ios', 'android', 'desktop'].includes(q.platform ?? '') ? q.platform : undefined,
    inApp: q.in_app === '1' || q.in_app === '0' ? q.in_app : undefined,
  };
}

/** SQL and arguments for the segment filters on installs aliased `i`. */
function segment(f: Filters): { sql: string; args: string[] } {
  const parts: string[] = [];
  const args: string[] = [];
  if (f.source) parts.push('i.source = ?'), args.push(f.source);
  if (f.platform) parts.push('i.platform = ?'), args.push(f.platform);
  if (f.inApp) parts.push('i.in_app = ?'), args.push(f.inApp);
  return { sql: parts.length ? ` AND ${parts.join(' AND ')}` : '', args };
}
const hasSegment = (f: Filters) => !!(f.source || f.platform || f.inApp);
/** For event queries: limits events (aliased e) to installs in the segment. */
function eventSegment(f: Filters): { sql: string; args: string[] } {
  if (!hasSegment(f)) return { sql: '', args: [] };
  const s = segment(f);
  return { sql: ` AND e.install_id IN (SELECT i.install_id FROM installs i WHERE 1 = 1${s.sql})`, args: s.args };
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

const rate = (n: number, d: number) => (d > 0 ? n / d : null);

// Actives ------------------------------------------------------------------------------------

export interface ActiveDay {
  day: string;
  active: number;
  new: number;
}

/** Installs active each day (any event), and installs first seen that day. */
export function activesByDay(db: Db, f: Filters): ActiveDay[] {
  const s = segment(f);
  const join = hasSegment(f) ? ' JOIN installs i ON i.install_id = d.install_id' : '';
  const active = new Map(
    (db.prepare(`SELECT d.day AS day, COUNT(*) AS n FROM install_days d${join} WHERE d.day BETWEEN ? AND ?${s.sql} GROUP BY d.day`).all(f.from, f.to, ...s.args) as { day: string; n: number }[]).map(
      (r) => [r.day, r.n],
    ),
  );
  const fresh = new Map(
    (db.prepare(`SELECT i.first_day AS day, COUNT(*) AS n FROM installs i WHERE i.first_day BETWEEN ? AND ?${s.sql} GROUP BY i.first_day`).all(f.from, f.to, ...s.args) as { day: string; n: number }[]).map(
      (r) => [r.day, r.n],
    ),
  );
  return daysBetween(f.from, f.to).map((day) => ({ day, active: active.get(day) ?? 0, new: fresh.get(day) ?? 0 }));
}

/** The Monday of a day's week. */
export function weekOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return addDays(day, -((d.getUTCDay() + 6) % 7));
}

/** Installs active in each week (Monday to Sunday) that overlaps the range. */
export function activesByWeek(db: Db, f: Filters): { week: string; active: number }[] {
  const s = segment(f);
  const join = hasSegment(f) ? ' JOIN installs i ON i.install_id = d.install_id' : '';
  const out: { week: string; active: number }[] = [];
  const count = db.prepare(`SELECT COUNT(DISTINCT d.install_id) AS n FROM install_days d${join} WHERE d.day BETWEEN ? AND ?${s.sql}`);
  for (let w = weekOf(f.from); w <= f.to && out.length < 60; w = addDays(w, 7)) {
    out.push({ week: w, active: (count.get(w, addDays(w, 6), ...s.args) as { n: number }).n });
  }
  return out;
}

// Funnel -----------------------------------------------------------------------------------

export const FUNNEL = [
  { id: 'visit', label: 'Site visit' },
  { id: 'cta', label: 'CTA click' },
  { id: 'app_open', label: 'App open' },
  { id: 'onboarded', label: 'Onboarding done' },
  { id: 'activated', label: 'Activated' },
  { id: 'lesson', label: 'First lesson done' },
  { id: 'account', label: 'Account made' },
  { id: 'trial', label: 'Trial or founding' },
  { id: 'paid', label: 'Paid' },
] as const;
export type FunnelStep = (typeof FUNNEL)[number]['id'];

export interface FunnelRow {
  id: FunnelStep;
  label: string;
  n: number;
  /** Share of the cohort. */
  ofStart: number | null;
  /** Share of the step before. */
  ofPrev: number | null;
}

/**
 * New installs in the range (the cohort) and how many reached each step.
 * Activated means a graded answer in the install's first visit. With
 * `siteOnly`, the cohort is installs that arrived on the site.
 */
export function funnel(db: Db, f: Filters, siteOnly: boolean): { cohort: number; steps: FunnelRow[] } {
  const s = segment(f);
  const where = `i.first_day BETWEEN ? AND ?${s.sql}${siteOnly ? " AND i.first_app = 'site'" : ''}`;
  const args = [f.from, f.to, ...s.args];
  const cohort = (db.prepare(`SELECT COUNT(*) AS n FROM installs i WHERE ${where}`).get(...args) as { n: number }).n;
  const counts = new Map(
    (db.prepare(`SELECT m.kind AS kind, COUNT(*) AS n FROM installs i JOIN milestones m ON m.install_id = i.install_id WHERE ${where} GROUP BY m.kind`).all(...args) as { kind: string; n: number }[]).map(
      (r) => [r.kind, r.n],
    ),
  );
  const activated = (
    db.prepare(`SELECT COUNT(*) AS n FROM installs i JOIN milestones m ON m.install_id = i.install_id AND m.kind = 'decision' WHERE ${where} AND m.session_id = i.first_session`).get(...args) as {
      n: number;
    }
  ).n;
  let prev: number | undefined;
  const steps = FUNNEL.map(({ id, label }) => {
    const n = id === 'activated' ? activated : (counts.get(id) ?? 0);
    const row = { id, label, n, ofStart: rate(n, cohort), ofPrev: prev === undefined ? rate(n, cohort) : rate(n, prev) };
    prev = n;
    return row;
  });
  return { cohort, steps };
}

// Retention --------------------------------------------------------------------------------

export const RETENTION_DAYS = [1, 7, 30] as const;

export interface RetentionRow {
  key: string;
  size: number;
  /** Share back on day N, among installs old enough to have reached day N. Null when none are. */
  rates: (number | null)[];
  /** Installs old enough for each day. */
  eligible: number[];
}

/**
 * Day N retention: the share of installs active again exactly N days after
 * their first day (in the player's own time), among those old enough.
 */
function retention(db: Db, f: Filters, group: 'week' | 'source', today: string): RetentionRow[] {
  const s = segment(f);
  const key = group === 'week' ? 'i.first_day' : 'i.source';
  const rows = db
    .prepare(
      `SELECT ${key} AS k, i.first_day AS first_day,
         ${RETENTION_DAYS.map((n) => `EXISTS (SELECT 1 FROM install_days d WHERE d.install_id = i.install_id AND d.day = date(i.first_day, '+${n} day')) AS r${n}`).join(', ')}
       FROM installs i WHERE i.first_day BETWEEN ? AND ?${s.sql}`,
    )
    .all(f.from, f.to, ...s.args) as ({ k: string; first_day: string } & Record<string, number>)[];
  const groups = new Map<string, { size: number; back: number[]; eligible: number[] }>();
  for (const r of rows) {
    const k = group === 'week' ? weekOf(r.first_day) : r.k;
    const g = groups.get(k) ?? { size: 0, back: RETENTION_DAYS.map(() => 0), eligible: RETENTION_DAYS.map(() => 0) };
    g.size++;
    RETENTION_DAYS.forEach((n, j) => {
      if (addDays(r.first_day, n) > today) return;
      g.eligible[j]++;
      g.back[j] += r[`r${n}`] ? 1 : 0;
    });
    groups.set(k, g);
  }
  return [...groups.entries()]
    .map(([k, g]) => ({ key: k, size: g.size, eligible: g.eligible, rates: g.back.map((b, j) => rate(b, g.eligible[j])) }))
    .sort((a, b) => (group === 'week' ? a.key.localeCompare(b.key) : b.size - a.size));
}

export const retentionByWeek = (db: Db, f: Filters, today: string) => retention(db, f, 'week', today);
export const retentionBySource = (db: Db, f: Filters, today: string) => retention(db, f, 'source', today);

// Conversion by source --------------------------------------------------------------------

export interface ConversionRow {
  key: string;
  installs: number;
  appOpen: number;
  activated: number;
  account: number;
  trial: number;
  paid: number;
}

/** New installs in the range grouped by a first touch column, with the steps they reached. */
export function conversionBy(db: Db, f: Filters, column: 'source' | 'utm_source' | 'loc'): ConversionRow[] {
  const s = segment(f);
  const col = `COALESCE(i.${column}, '(none)')`;
  const rows = db
    .prepare(
      `SELECT ${col} AS key, COUNT(*) AS installs,
         SUM(EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = i.install_id AND m.kind = 'app_open')) AS appOpen,
         SUM(EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = i.install_id AND m.kind = 'decision' AND m.session_id = i.first_session)) AS activated,
         SUM(EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = i.install_id AND m.kind = 'account')) AS account,
         SUM(EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = i.install_id AND m.kind = 'trial')) AS trial,
         SUM(EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = i.install_id AND m.kind = 'paid')) AS paid
       FROM installs i WHERE i.first_day BETWEEN ? AND ?${s.sql} GROUP BY ${col} ORDER BY installs DESC LIMIT 50`,
    )
    .all(f.from, f.to, ...s.args) as unknown as ConversionRow[];
  return rows;
}

/** Sources seen, most installs first, for the filter menu. */
export function sources(db: Db, limit = 40): string[] {
  return (db.prepare('SELECT source, COUNT(*) AS n FROM installs GROUP BY source ORDER BY n DESC LIMIT ?').all(limit) as { source: string }[]).map((r) => r.source);
}

// Product -----------------------------------------------------------------------------------

export const FEATURES = [
  { id: 'lessons', label: 'Lessons', event: 'lesson_finished' },
  { id: 'review', label: 'Review', event: 'review_finished' },
  { id: 'play', label: 'Play', event: 'hand_dealt' },
  { id: 'ranges', label: 'Ranges', event: 'ranges_viewed' },
  { id: 'daily', label: 'Daily challenge', event: 'daily_finished' },
  { id: 'weekly', label: 'Weekly challenge', event: 'weekly_finished' },
  { id: 'practice', label: 'Practice', event: 'practice_finished' },
  { id: 'solver', label: 'Solver', event: 'solver_run' },
  { id: 'coach', label: 'Coach', event: 'coach_asked' },
] as const;

export function featureUsage(db: Db, f: Filters): { id: string; label: string; events: number; installs: number }[] {
  const s = eventSegment(f);
  const q = db.prepare(`SELECT COUNT(*) AS events, COUNT(DISTINCT e.install_id) AS installs FROM events e WHERE e.name = ? AND e.day BETWEEN ? AND ?${s.sql}`);
  return FEATURES.map((x) => ({ id: x.id, label: x.label, ...(q.get(x.event, f.from, f.to, ...s.args) as { events: number; installs: number }) }));
}

/** Events by name in the range, most first. */
export function eventCounts(db: Db, f: Filters): { name: string; n: number }[] {
  const s = eventSegment(f);
  return db.prepare(`SELECT e.name AS name, COUNT(*) AS n FROM events e WHERE e.day BETWEEN ? AND ?${s.sql} GROUP BY e.name ORDER BY n DESC`).all(f.from, f.to, ...s.args) as {
    name: string;
    n: number;
  }[];
}

export interface PaywallRow {
  from: string;
  views: number;
  installs: number;
  checkouts: number;
  /** Installs that viewed and then started a trial or founding. */
  converted: number;
}

/** Paywall views by where they came from, and how many of those installs went on to a trial or founding. */
export function paywall(db: Db, f: Filters): PaywallRow[] {
  const s = eventSegment(f);
  const views = db
    .prepare(
      `SELECT COALESCE(json_extract(e.props, '$.from'), 'direct') AS src, COUNT(*) AS views, COUNT(DISTINCT e.install_id) AS installs,
         COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = e.install_id AND m.kind = 'trial' AND m.at >= e.at) THEN e.install_id END) AS converted
       FROM events e WHERE e.name = 'paywall_viewed' AND e.day BETWEEN ? AND ?${s.sql} GROUP BY src ORDER BY views DESC`,
    )
    .all(f.from, f.to, ...s.args) as { src: string; views: number; installs: number; converted: number }[];
  const checkouts = new Map(
    (
      db
        .prepare(`SELECT COALESCE(json_extract(e.props, '$.from'), 'direct') AS src, COUNT(*) AS n FROM events e WHERE e.name = 'checkout_started' AND e.day BETWEEN ? AND ?${s.sql} GROUP BY src`)
        .all(f.from, f.to, ...s.args) as { src: string; n: number }[]
    ).map((r) => [r.src, r.n]),
  );
  return views.map((v) => ({ from: v.src, views: v.views, installs: v.installs, checkouts: checkouts.get(v.src) ?? 0, converted: v.converted }));
}

export interface ExperimentRow {
  exp: string;
  variant: string;
  exposed: number;
  cta: number;
  appOpen: number;
  activated: number;
  /** Back on day 1, among those old enough. */
  d1: number | null;
  paid: number;
}

/** Each test's arms: exposed installs and the steps they reached after exposure. */
export function experiments(db: Db, f: Filters, today: string): ExperimentRow[] {
  const s = segment(f);
  const after = (kind: string) => `SUM(EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = x.install_id AND m.kind = '${kind}' AND m.at >= x.at))`;
  return (
    db
      .prepare(
        `SELECT x.exp AS exp, x.variant AS variant, COUNT(*) AS exposed, ${after('cta')} AS cta, ${after('app_open')} AS appOpen,
           SUM(EXISTS (SELECT 1 FROM milestones m WHERE m.install_id = x.install_id AND m.kind = 'decision' AND m.session_id = i.first_session)) AS activated,
           SUM(CASE WHEN date(i.first_day, '+1 day') <= ? THEN 1 ELSE 0 END) AS d1Eligible,
           SUM(CASE WHEN date(i.first_day, '+1 day') <= ? AND EXISTS (SELECT 1 FROM install_days d WHERE d.install_id = x.install_id AND d.day = date(i.first_day, '+1 day')) THEN 1 ELSE 0 END) AS d1Back,
           ${after('paid')} AS paid
         FROM exposures x JOIN installs i ON i.install_id = x.install_id WHERE x.day BETWEEN ? AND ?${s.sql} GROUP BY x.exp, x.variant ORDER BY x.exp, x.variant`,
      )
      .all(today, today, f.from, f.to, ...s.args) as (Omit<ExperimentRow, 'd1'> & { d1Eligible: number; d1Back: number })[]
  ).map(({ d1Eligible, d1Back, ...r }) => ({ ...r, d1: rate(d1Back, d1Eligible) }));
}

// Retention and billing ---------------------------------------------------------------------

export function cancelReasons(db: Db, f: Filters): { reason: string; n: number; shown: number; taken: number }[] {
  return db
    .prepare(
      `SELECT reason, COUNT(*) AS n, SUM(offer_shown IS NOT NULL) AS shown, SUM(offer_taken) AS taken FROM cancel_feedback
       WHERE at >= ? AND at < ? GROUP BY reason ORDER BY n DESC`,
    )
    .all(`${f.from}T00:00:00.000Z`, `${addDays(f.to, 1)}T00:00:00.000Z`) as { reason: string; n: number; shown: number; taken: number }[];
}

/** Counts of named events in the range, for small tables. */
export function counts(db: Db, f: Filters, names: readonly string[]): Record<string, number> {
  const s = eventSegment(f);
  const q = db.prepare(`SELECT COUNT(*) AS n FROM events e WHERE e.name = ? AND e.day BETWEEN ? AND ?${s.sql}`);
  return Object.fromEntries(names.map((n) => [n, (q.get(n, f.from, f.to, ...s.args) as { n: number }).n]));
}

// Quality ---------------------------------------------------------------------------------

export interface VitalRow {
  metric: string;
  app: string;
  n: number;
  p75: number;
  good: number | null;
}

const p = (sorted: number[], q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0);

/** The 75th percentile of each web vital by surface, the number Google reports. */
export function vitals(db: Db, f: Filters): VitalRow[] {
  const s = eventSegment(f);
  const rows = db
    .prepare(
      `SELECT json_extract(e.props, '$.metric') AS metric, e.app AS app, json_extract(e.props, '$.value') AS value, json_extract(e.props, '$.rating') AS rating
       FROM events e WHERE e.name = 'web_vital' AND e.day BETWEEN ? AND ?${s.sql} LIMIT 200000`,
    )
    .all(f.from, f.to, ...s.args) as { metric: string | null; app: string; value: number | null; rating: string | null }[];
  const groups = new Map<string, { values: number[]; good: number }>();
  for (const r of rows) {
    if (!r.metric || typeof r.value !== 'number') continue;
    const k = `${r.metric}|${r.app}`;
    const g = groups.get(k) ?? { values: [], good: 0 };
    g.values.push(r.value);
    if (r.rating === 'good') g.good++;
    groups.set(k, g);
  }
  return [...groups.entries()]
    .map(([k, g]) => {
      const [metric, app] = k.split('|');
      const sorted = g.values.sort((a, b) => a - b);
      return { metric, app, n: sorted.length, p75: p(sorted, 0.75), good: rate(g.good, sorted.length) };
    })
    .sort((a, b) => a.metric.localeCompare(b.metric) || a.app.localeCompare(b.app));
}

export function errorsByDay(db: Db, f: Filters): { day: string; n: number }[] {
  const s = eventSegment(f);
  const byDay = new Map(
    (db.prepare(`SELECT e.day AS day, COUNT(*) AS n FROM events e WHERE e.name = 'error' AND e.day BETWEEN ? AND ?${s.sql} GROUP BY e.day`).all(f.from, f.to, ...s.args) as { day: string; n: number }[]).map(
      (r) => [r.day, r.n],
    ),
  );
  return daysBetween(f.from, f.to).map((day) => ({ day, n: byDay.get(day) ?? 0 }));
}

export function topErrors(db: Db, f: Filters): { app: string; name: string; hash: string; route: string; n: number; installs: number }[] {
  const s = eventSegment(f);
  return db
    .prepare(
      `SELECT e.app AS app, COALESCE(json_extract(e.props, '$.name'), '?') AS name, COALESCE(json_extract(e.props, '$.hash'), '?') AS hash,
         COALESCE(json_extract(e.props, '$.route'), '?') AS route, COUNT(*) AS n, COUNT(DISTINCT e.install_id) AS installs
       FROM events e WHERE e.name = 'error' AND e.day BETWEEN ? AND ?${s.sql} GROUP BY 1, 2, 3, 4 ORDER BY n DESC LIMIT 20`,
    )
    .all(f.from, f.to, ...s.args) as { app: string; name: string; hash: string; route: string; n: number; installs: number }[];
}

// Revenue -------------------------------------------------------------------------------------

/**
 * List prices, in dollars, for MRR. Keep in step with PLANS in
 * apps/web/src/state/access.ts. MRR uses list prices, so coupons are not
 * taken off: the console says so. Money received comes from Stripe's own
 * amounts instead.
 */
export const LIST_PRICES = { annual: 79.99, monthly: 14.99 } as const;

export interface Revenue {
  mrr: number;
  arr: number;
  /** Paying subscriptions by plan, trials not included. */
  active: { annual: number; monthly: number };
  trials: number;
  pastDue: number;
  paused: number;
  cancelling: number;
  founding: { sold: number; comped: number; held: number; seats: number; left: number };
  /** Money received in the range, from Stripe's amounts. */
  received: number;
  refunds: number;
  refundCount: number;
  /** Subscriptions that ended in the range, over those live at its start (an estimate). */
  churned: number;
  churnRate: number | null;
  failed: number;
  recovered: number;
  /** Money received each week. */
  weekly: { week: string; amount: number }[];
  /** Accounts and money by first touch source. LTV is money received per account so far. */
  bySource: { source: string; accounts: number; paying: number; revenue: number; ltv: number }[];
}

export function revenue(db: Db, f: Filters, now: Date, seats: number): Revenue {
  const nowIso = now.toISOString();
  const live = db
    .prepare(
      `SELECT plan, COUNT(*) AS n FROM users WHERE lifetime = 0 AND sub_status IN ('active', 'past_due') AND trialing = 0 AND pro_until > ? AND paused_until IS NULL GROUP BY plan`,
    )
    .all(nowIso) as { plan: string | null; n: number }[];
  const active = { annual: 0, monthly: 0 };
  for (const r of live) if (r.plan === 'annual' || r.plan === 'monthly') active[r.plan] += r.n;
  const mrr = Math.round((active.annual * (LIST_PRICES.annual / 12) + active.monthly * LIST_PRICES.monthly) * 100) / 100;
  const one = (sql: string, ...args: (string | number)[]) => (db.prepare(sql).get(...args) as { n: number | null }).n ?? 0;
  const trials = one(`SELECT COUNT(*) AS n FROM users WHERE trialing = 1 AND pro_until > ?`, nowIso);
  const pastDue = one(`SELECT COUNT(*) AS n FROM users WHERE billing_issue = 1 AND lifetime = 0`);
  const paused = one(`SELECT COUNT(*) AS n FROM users WHERE paused_until IS NOT NULL`);
  const cancelling = one(`SELECT COUNT(*) AS n FROM users WHERE cancel_at_period_end = 1 AND pro_until > ?`, nowIso);
  const sold = one(`SELECT COUNT(*) AS n FROM lifetime_checkouts WHERE completed_at IS NOT NULL AND session_id NOT LIKE 'comp_%'`);
  const comped = one(`SELECT COUNT(*) AS n FROM lifetime_checkouts WHERE completed_at IS NOT NULL AND session_id LIKE 'comp_%'`);
  const held = one(`SELECT COUNT(*) AS n FROM lifetime_checkouts WHERE completed_at IS NULL AND expires_at > ?`, nowIso);
  const money = (names: string[]) =>
    one(
      `SELECT SUM(json_extract(e.props, '$.amount')) AS n FROM events e WHERE e.name IN (${names.map(() => '?').join(', ')}) AND e.day BETWEEN ? AND ?`,
      ...names,
      f.from,
      f.to,
    );
  const PAID = ['first_payment', 'subscription_renewed', 'founding_seat_sold'];
  const received = Math.round(money(PAID) * 100) / 100;
  const refunds = Math.round(money(['refund']) * 100) / 100;
  const refundCount = one(`SELECT COUNT(*) AS n FROM events e WHERE e.name = 'refund' AND e.day BETWEEN ? AND ?`, f.from, f.to);
  const churned = one(`SELECT COUNT(*) AS n FROM events e WHERE e.name = 'subscription_ended' AND e.day BETWEEN ? AND ?`, f.from, f.to);
  // Live at the start of the range: live now, plus those that ended since it began, minus those started since. An estimate.
  const startedSince = one(`SELECT COUNT(*) AS n FROM events e WHERE e.name = 'subscription_started' AND e.day >= ?`, f.from);
  const endedSince = one(`SELECT COUNT(*) AS n FROM events e WHERE e.name = 'subscription_ended' AND e.day >= ?`, f.from);
  const liveNow = active.annual + active.monthly + trials;
  const atStart = Math.max(0, liveNow + endedSince - startedSince);
  const weekly = new Map<string, number>();
  for (const r of db
    .prepare(`SELECT e.day AS day, SUM(json_extract(e.props, '$.amount')) AS amount FROM events e WHERE e.name IN (?, ?, ?) AND e.day BETWEEN ? AND ? GROUP BY e.day`)
    .all(...PAID, f.from, f.to) as { day: string; amount: number | null }[]) {
    const w = weekOf(r.day);
    weekly.set(w, (weekly.get(w) ?? 0) + (r.amount ?? 0));
  }
  const weeks: { week: string; amount: number }[] = [];
  for (let w = weekOf(f.from); w <= f.to && weeks.length < 60; w = addDays(w, 7)) weeks.push({ week: w, amount: Math.round((weekly.get(w) ?? 0) * 100) / 100 });
  const bySource = (
    db
      .prepare(
        `SELECT COALESCE(first_source, '(unknown)') AS source, COUNT(*) AS accounts, SUM(revenue_cents > 0) AS paying, SUM(revenue_cents) AS cents
         FROM users GROUP BY 1 ORDER BY cents DESC, accounts DESC LIMIT 30`,
      )
      .all() as { source: string; accounts: number; paying: number; cents: number }[]
  ).map((r) => ({ source: r.source, accounts: r.accounts, paying: r.paying ?? 0, revenue: (r.cents ?? 0) / 100, ltv: Math.round(((r.cents ?? 0) / Math.max(1, r.accounts)) ) / 100 }));
  return {
    mrr,
    arr: Math.round(mrr * 12 * 100) / 100,
    active,
    trials,
    pastDue,
    paused,
    cancelling,
    founding: { sold, comped, held, seats, left: Math.max(0, seats - sold - comped - held) },
    received,
    refunds,
    refundCount,
    churned,
    churnRate: rate(churned, atStart),
    failed: one(`SELECT COUNT(*) AS n FROM events e WHERE e.name = 'payment_failed' AND e.day BETWEEN ? AND ?`, f.from, f.to),
    recovered: one(`SELECT COUNT(*) AS n FROM events e WHERE e.name = 'payment_recovered' AND e.day BETWEEN ? AND ?`, f.from, f.to),
    weekly: weeks,
    bySource,
  };
}

// Everything at once, for GET /api/admin/metrics --------------------------------------------------

export function allMetrics(db: Db, f: Filters, now: Date, seats: number) {
  const today = localDay(now.getTime(), 0);
  return {
    filters: f,
    actives: activesByDay(db, f),
    weekly: activesByWeek(db, f),
    funnel: { site: funnel(db, f, true), all: funnel(db, f, false) },
    retention: { byWeek: retentionByWeek(db, f, today), bySource: retentionBySource(db, f, today), days: RETENTION_DAYS },
    conversion: { source: conversionBy(db, f, 'source'), creator: conversionBy(db, f, 'utm_source'), room: conversionBy(db, f, 'loc') },
    features: featureUsage(db, f),
    paywall: paywall(db, f),
    experiments: experiments(db, f, today),
    cancel: cancelReasons(db, f),
    billing: counts(db, f, ['payment_failed', 'payment_recovered', 'billing_banner_shown', 'billing_banner_tapped']),
    vitals: vitals(db, f),
    errors: { byDay: errorsByDay(db, f), top: topErrors(db, f) },
    revenue: revenue(db, f, now, seats),
  };
}

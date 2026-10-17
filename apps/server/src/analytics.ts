import {
  ALSO_MILESTONE,
  type CleanBatch,
  EVENTS,
  type EventProps,
  localDay,
  MILESTONE_OF,
  type ServerEventName,
  sourceOf,
  validId,
} from '@felt/core/analytics';
import { type Db, tx } from './db.ts';

/**
 * Server side of product analytics (docs/ANALYTICS.md): storing batches
 * from browsers, linking an install to an account, deleting an install on
 * request, recording what only the server knows (money and messages), and
 * deleting old events.
 *
 * Nothing here stores an IP address or a user agent. The rate limiter keeps
 * counters in memory only.
 */

export const RETENTION_MONTHS = 13;
/** Per install: batches a minute and events in 10 minutes. */
export const RATE = { batchesPerMinute: 30, eventsPer10Min: 1200 };
/** Per network address, in memory only: batches a minute. Stops one device faking many installs. */
export const RATE_PER_ADDRESS = 120;

export interface IngestResult {
  accepted: number;
  rejected: number;
  duplicate?: boolean;
}

/** Counters in memory, never written anywhere. */
export class RateLimiter {
  private hits = new Map<string, { minute: number; batches: number; window: number; events: number }>();
  private addresses = new Map<string, { minute: number; batches: number }>();
  /** Recent batch ids, so a batch resent by a closing page is stored once. */
  private seen = new Map<string, number>();

  allow(install: string, address: string, events: number, now: number): boolean {
    const minute = Math.floor(now / 60_000);
    const window = Math.floor(now / 600_000);
    const a = this.addresses.get(address);
    const byAddr = a && a.minute === minute ? a : { minute, batches: 0 };
    if (byAddr.batches >= RATE_PER_ADDRESS) return false;
    const h = this.hits.get(install);
    const cur = { minute, batches: h?.minute === minute ? h.batches : 0, window, events: h?.window === window ? h.events : 0 };
    if (cur.batches >= RATE.batchesPerMinute || cur.events + events > RATE.eventsPer10Min) return false;
    cur.batches++;
    cur.events += events;
    byAddr.batches++;
    this.hits.set(install, cur);
    this.addresses.set(address, byAddr);
    if (this.hits.size > 50_000) this.sweep(minute, window);
    return true;
  }

  /** True the first time a batch id is seen in the last hour. */
  fresh(install: string, batch: string, now: number): boolean {
    const key = `${install}:${batch}`;
    const at = this.seen.get(key);
    if (at !== undefined && now - at < 3_600_000) return false;
    this.seen.set(key, now);
    if (this.seen.size > 100_000) for (const [k, t] of this.seen) if (now - t > 3_600_000) this.seen.delete(k);
    return true;
  }

  private sweep(minute: number, window: number) {
    for (const [k, v] of this.hits) if (v.minute !== minute && v.window !== window) this.hits.delete(k);
    for (const [k, v] of this.addresses) if (v.minute !== minute) this.addresses.delete(k);
  }
}

/** Stores a checked batch and keeps the rollups in step. One transaction. */
export function ingest(db: Db, b: CleanBatch): IngestResult {
  if (!b.events.length) return { accepted: 0, rejected: b.rejected };
  const { ctx } = b;
  const first = b.events.reduce((m, e) => Math.min(m, e.at), Number.POSITIVE_INFINITY);
  const last = b.events.reduce((m, e) => Math.max(m, e.at), 0);
  const a = b.attr;
  const insertEvent = db.prepare(
    'INSERT INTO events (at, day, name, app, install_id, session_id, platform, in_app, standalone, props) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertDay = db.prepare('INSERT OR IGNORE INTO install_days (install_id, day) VALUES (?, ?)');
  const insertMilestone = db.prepare('INSERT OR IGNORE INTO milestones (install_id, kind, at, day, session_id) VALUES (?, ?, ?, ?, ?)');
  const insertExposure = db.prepare('INSERT OR IGNORE INTO exposures (install_id, exp, variant, at, day) VALUES (?, ?, ?, ?, ?)');
  tx(db, () => {
    // The install: first touch wins, so a later visit never overwrites where it came from.
    db.prepare(
      `INSERT INTO installs (install_id, first_at, first_day, first_session, first_app, last_day, platform, in_app, standalone, source,
         utm_source, utm_medium, utm_campaign, utm_content, src, loc, ref, referrer, landing)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (install_id) DO UPDATE SET
         first_session = CASE WHEN excluded.first_at < first_at THEN excluded.first_session ELSE first_session END,
         first_app = CASE WHEN excluded.first_at < first_at THEN excluded.first_app ELSE first_app END,
         first_day = CASE WHEN excluded.first_at < first_at THEN excluded.first_day ELSE first_day END,
         first_at = MIN(first_at, excluded.first_at),
         last_day = MAX(last_day, excluded.last_day),
         standalone = MAX(standalone, excluded.standalone),
         source = CASE WHEN source = 'direct' AND utm_source IS NULL AND src IS NULL AND ref IS NULL AND referrer IS NULL THEN excluded.source ELSE source END,
         utm_source = COALESCE(utm_source, excluded.utm_source), utm_medium = COALESCE(utm_medium, excluded.utm_medium),
         utm_campaign = COALESCE(utm_campaign, excluded.utm_campaign), utm_content = COALESCE(utm_content, excluded.utm_content),
         src = COALESCE(src, excluded.src), loc = COALESCE(loc, excluded.loc), ref = COALESCE(ref, excluded.ref),
         referrer = COALESCE(referrer, excluded.referrer), landing = COALESCE(landing, excluded.landing)`,
    ).run(
      b.install,
      first,
      localDay(first, ctx.tzo),
      b.session,
      b.app,
      localDay(last, ctx.tzo),
      ctx.platform,
      ctx.in_app ? 1 : 0,
      ctx.standalone ? 1 : 0,
      sourceOf(a),
      a.utm_source ?? null,
      a.utm_medium ?? null,
      a.utm_campaign ?? null,
      a.utm_content ?? null,
      a.src ?? null,
      a.loc ?? null,
      a.ref ?? null,
      a.referrer ?? null,
      a.landing ?? null,
    );
    const days = new Set<string>();
    for (const e of b.events) {
      const day = localDay(e.at, ctx.tzo);
      days.add(day);
      const props = Object.keys(e.props).length ? JSON.stringify(e.props) : null;
      insertEvent.run(e.at, day, e.name, b.app, b.install, b.session, ctx.platform, ctx.in_app ? 1 : 0, ctx.standalone ? 1 : 0, props);
      const m = MILESTONE_OF[e.name];
      if (m) insertMilestone.run(b.install, m, e.at, day, b.session);
      if (e.name === 'experiment_exposed' && typeof e.props.exp === 'string' && typeof e.props.variant === 'string')
        insertExposure.run(b.install, e.props.exp, e.props.variant, e.at, day);
    }
    for (const d of days) insertDay.run(b.install, d);
  });
  return { accepted: b.events.length, rejected: b.rejected };
}

/**
 * Ties an install to an account. The first link wins. The account keeps a
 * copy of that install's first touch, which outlives the 13 month event
 * retention, so revenue can always be traced to its source.
 */
export function linkInstall(db: Db, install: string, userId: string, now: Date): boolean {
  if (!validId(install)) return false;
  return tx(db, () => {
    const ms = now.getTime();
    // The install may not have reached the server yet: make a bare row the next batch fills in.
    db.prepare(
      `INSERT OR IGNORE INTO installs (install_id, first_at, first_day, first_session, first_app, last_day, platform) VALUES (?, ?, ?, ?, 'web', ?, 'desktop')`,
    ).run(install, ms, localDay(ms, 0), install, localDay(ms, 0));
    db.prepare('UPDATE installs SET user_id = ?, linked_at = ? WHERE install_id = ? AND user_id IS NULL').run(userId, now.toISOString(), install);
    const row = db.prepare('SELECT * FROM installs WHERE install_id = ?').get(install) as
      | { user_id: string | null; source: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; loc: string | null; ref: string | null; landing: string | null; first_at: number }
      | undefined;
    if (!row || row.user_id !== userId) return false;
    db.prepare(
      `UPDATE users SET first_install = ?, first_source = ?, first_utm_source = ?, first_medium = ?, first_campaign = ?, first_loc = ?, first_ref = ?, first_landing = ?, first_seen_at = ?
       WHERE id = ? AND first_install IS NULL`,
    ).run(install, row.source, row.utm_source, row.utm_medium, row.utm_campaign, row.loc, row.ref, row.landing, row.first_at, userId);
    return true;
  });
}

/** Deletes everything an install sent, when the player turns sharing off. */
export function forgetInstall(db: Db, install: string): number {
  if (!validId(install)) return 0;
  return tx(db, () => {
    const n = Number(db.prepare('DELETE FROM events WHERE install_id = ?').run(install).changes);
    for (const t of ['install_days', 'milestones', 'exposures', 'installs']) db.prepare(`DELETE FROM ${t} WHERE install_id = ?`).run(install);
    db.prepare('UPDATE users SET first_install = NULL WHERE first_install = ?').run(install);
    return n;
  });
}

/** When an account is deleted: its installs stay as anonymous counts, without the link. */
export function unlinkUser(db: Db, userId: string) {
  db.prepare('UPDATE installs SET user_id = NULL, linked_at = NULL WHERE user_id = ?').run(userId);
}

/** The install a user's server events are counted under: the first one linked. */
export function installFor(db: Db, userId: string | undefined): string | undefined {
  if (!userId) return undefined;
  const u = db.prepare('SELECT first_install FROM users WHERE id = ?').get(userId) as { first_install: string | null } | undefined;
  if (u?.first_install) return u.first_install;
  return (db.prepare('SELECT install_id FROM installs WHERE user_id = ? ORDER BY first_at LIMIT 1').get(userId) as { install_id: string } | undefined)?.install_id;
}

/**
 * Records an event only the server knows, such as a renewal. It is counted
 * under the account's linked install when there is one, so it joins the
 * funnel; otherwise it is an anonymous count. The app never sends these
 * names (the ingest endpoint refuses them), so nothing is counted twice.
 */
export function serverEvent<N extends ServerEventName>(db: Db, name: N, props: EventProps<N>, opts: { userId?: string; now: Date }) {
  const at = opts.now.getTime();
  const install = installFor(db, opts.userId);
  const day = localDay(at, 0);
  const clean: Record<string, string | number | boolean> = {};
  const spec = (EVENTS as Record<string, { props: Record<string, string> }>)[name].props;
  for (const [k, v] of Object.entries(props as Record<string, unknown>)) if (v !== undefined && v !== null && k in spec) clean[k] = v as string | number | boolean;
  db.prepare('INSERT INTO events (at, day, name, app, install_id, props) VALUES (?, ?, ?, ?, ?, ?)').run(
    at,
    day,
    name,
    'server',
    install ?? null,
    Object.keys(clean).length ? JSON.stringify(clean) : null,
  );
  if (install) {
    for (const m of [MILESTONE_OF[name], ALSO_MILESTONE[name]]) if (m) db.prepare('INSERT OR IGNORE INTO milestones (install_id, kind, at, day) VALUES (?, ?, ?, ?)').run(install, m, at, day);
    db.prepare('INSERT OR IGNORE INTO install_days (install_id, day) VALUES (?, ?)').run(install, day);
  }
}

/** The first day kept: 13 months before now. */
export function retentionCutoff(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - RETENTION_MONTHS, now.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

/**
 * Deletes raw events older than 13 months, and installs not seen since then
 * (with their rollups), in small steps so the server never stalls. An
 * account keeps its own copy of first touch.
 */
export function runAnalyticsRetention(db: Db, now: Date, step = 5000): { events: number; installs: number } {
  const cutoff = retentionCutoff(now);
  let events = 0;
  for (;;) {
    const n = Number(db.prepare('DELETE FROM events WHERE id IN (SELECT id FROM events WHERE day < ? LIMIT ?)').run(cutoff, step).changes);
    events += n;
    if (n < step) break;
  }
  let installs = 0;
  for (;;) {
    const ids = (db.prepare('SELECT install_id FROM installs WHERE last_day < ? LIMIT ?').all(cutoff, step) as { install_id: string }[]).map((r) => r.install_id);
    if (!ids.length) break;
    tx(db, () => {
      for (const id of ids) {
        for (const t of ['install_days', 'milestones', 'exposures', 'installs']) db.prepare(`DELETE FROM ${t} WHERE install_id = ?`).run(id);
      }
    });
    installs += ids.length;
    if (ids.length < step) break;
  }
  db.prepare('DELETE FROM install_days WHERE day < ?').run(cutoff);
  return { events, installs };
}

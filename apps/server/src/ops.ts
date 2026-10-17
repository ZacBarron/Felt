import type { Db } from './db.ts';

/**
 * The audit log and job health for the operations console (docs/ADMIN.md).
 * Every admin action writes one audit row: who, when, what, on whom, why,
 * and the state before and after.
 */

export type AdminRole = 'owner' | 'support';

export interface Actor {
  /** The admin's id, or "owner" for ADMIN_TOKEN. */
  id: string;
  name: string;
  role: AdminRole;
}

export interface AuditEntry {
  action: string;
  target?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}

const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v));

export function audit(db: Db, actor: Actor, at: Date, e: AuditEntry) {
  db.prepare('INSERT INTO audit_log (at, actor, role, action, target, reason, before, after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    at.toISOString(),
    actor.name,
    actor.role,
    e.action,
    e.target ?? null,
    e.reason ?? null,
    json(e.before),
    json(e.after),
  );
}

export interface AuditRow {
  id: number;
  at: string;
  actor: string;
  role: string;
  action: string;
  target: string | null;
  reason: string | null;
  before: string | null;
  after: string | null;
}

export function auditLog(db: Db, opts: { target?: string; limit?: number; before?: number } = {}): AuditRow[] {
  const limit = Math.min(500, opts.limit ?? 100);
  if (opts.target) return db.prepare('SELECT * FROM audit_log WHERE target = ? ORDER BY id DESC LIMIT ?').all(opts.target, limit) as unknown as AuditRow[];
  return db.prepare('SELECT * FROM audit_log WHERE id < ? ORDER BY id DESC LIMIT ?').all(opts.before ?? Number.MAX_SAFE_INTEGER, limit) as unknown as AuditRow[];
}

/** Jobs the console reports on. */
export const JOBS = ['reminders', 'trial_notices', 'lifecycle_email', 'pause_resumes', 'retention', 'webhook'] as const;
export type Job = (typeof JOBS)[number];

/** Records one run of a scheduled job (or one webhook delivery). */
export function jobRan(db: Db, job: Job, at: Date, error?: unknown) {
  const iso = at.toISOString();
  const message = error === undefined ? null : (error instanceof Error ? error.message : String(error)).slice(0, 300);
  db.prepare(
    `INSERT INTO job_runs (job, last_run, last_ok, last_error, last_error_at, runs, failures) VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT (job) DO UPDATE SET last_run = excluded.last_run, runs = runs + 1,
       last_ok = CASE WHEN ? IS NULL THEN excluded.last_run ELSE last_ok END,
       last_error = COALESCE(excluded.last_error, last_error), last_error_at = COALESCE(excluded.last_error_at, last_error_at),
       failures = failures + excluded.failures`,
  ).run(job, iso, message ? null : iso, message, message ? iso : null, message ? 1 : 0, message);
}

/** Runs a job and records how it went. Errors are logged and recorded, never thrown. */
export async function runJob<T>(db: Db, job: Job, now: () => Date, fn: () => Promise<T> | T): Promise<T | undefined> {
  try {
    const out = await fn();
    jobRan(db, job, now());
    return out;
  } catch (e) {
    console.error(`Job ${job} failed`, e);
    jobRan(db, job, now(), e);
    return undefined;
  }
}

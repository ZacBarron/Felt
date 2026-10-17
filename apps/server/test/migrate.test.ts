import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDb } from '../src/db.ts';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('migrations', () => {
  it('makes email optional without losing users or anything that points at them', () => {
    dir = mkdtempSync(join(tmpdir(), 'felt-db-'));
    const path = join(dir, 'felt.sqlite');
    // A database as the previous release left it: version 2, email required.
    const old = new DatabaseSync(path);
    old.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, handle TEXT UNIQUE, created_at TEXT NOT NULL, tz TEXT, cue_minutes INTEGER,
        reminders INTEGER NOT NULL DEFAULT 0, leagues INTEGER NOT NULL DEFAULT 0, last_study_day TEXT, pro_until TEXT, plan TEXT,
        trialing INTEGER NOT NULL DEFAULT 0, trial_used INTEGER NOT NULL DEFAULT 0, stripe_customer TEXT UNIQUE);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, created_at TEXT NOT NULL, last_seen TEXT NOT NULL);
      CREATE TABLE snapshots (user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE, version INTEGER NOT NULL, data TEXT NOT NULL, bytes INTEGER NOT NULL, updated_at TEXT NOT NULL, device TEXT);
      INSERT INTO users (id, email, handle, created_at, pro_until) VALUES ('u1', 'a@b.co', 'ace', '2026-01-01', '2027-01-01');
      INSERT INTO sessions VALUES ('h1', 'u1', '2026-01-01', '2026-01-01');
      INSERT INTO snapshots VALUES ('u1', 3, '{}', 2, '2026-01-01', 'iPhone');
      PRAGMA user_version = 2;
    `);
    old.close();

    const db = openDb(path);
    expect((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(8);
    expect(db.prepare('SELECT id, email, handle, pro_until FROM users').all()).toEqual([{ id: 'u1', email: 'a@b.co', handle: 'ace', pro_until: '2027-01-01' }]);
    // Lifecycle (version 8): an unsubscribe token for everyone, the last visit from sessions,
    // email off until the player opts in, and nobody already here put in the holdout.
    const life = db.prepare('SELECT unsub_token, last_active_at, email_opt_in, holdout, lifetime, billing_issue FROM users').get() as Record<string, unknown>;
    expect(life).toMatchObject({ last_active_at: '2026-01-01', email_opt_in: 0, holdout: 0, lifetime: 0, billing_issue: 0 });
    expect(life.unsub_token).toMatch(/^[0-9a-f]{32}$/);
    expect(db.prepare('SELECT COUNT(*) AS n FROM cancel_feedback').get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT name FROM pragma_table_info('waitlist') WHERE name IN ('source', 'platform')").all()).toHaveLength(2);
    expect((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(1);
    expect((db.prepare('SELECT version FROM snapshots').get() as { version: number }).version).toBe(3);
    // Email is optional now, still unique when set.
    db.prepare("INSERT INTO users (id, email, created_at) VALUES ('u2', NULL, '2026-02-01')").run();
    db.prepare("INSERT INTO users (id, email, created_at) VALUES ('u3', NULL, '2026-02-01')").run();
    expect(() => db.prepare("INSERT INTO users (id, email, created_at) VALUES ('u4', 'a@b.co', '2026-02-01')").run()).toThrow();
    // Foreign keys are back on and still cascade.
    expect((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys).toBe(1);
    db.prepare("DELETE FROM users WHERE id = 'u1'").run();
    expect((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM snapshots').get() as { n: number }).n).toBe(0);
    db.close();
  });
});

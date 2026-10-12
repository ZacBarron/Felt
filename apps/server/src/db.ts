import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

// Loaded through the builtin loader: bundlers and test runners do not all know node:sqlite yet.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

export type Db = DatabaseSyncType;

/**
 * Schema changes, applied in order and recorded in user_version. Never edit
 * a shipped migration; add a new one.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    handle TEXT UNIQUE,
    created_at TEXT NOT NULL,
    tz TEXT,
    cue_minutes INTEGER,
    reminders INTEGER NOT NULL DEFAULT 0,
    leagues INTEGER NOT NULL DEFAULT 0,
    last_study_day TEXT,
    pro_until TEXT,
    plan TEXT,
    trialing INTEGER NOT NULL DEFAULT 0,
    trial_used INTEGER NOT NULL DEFAULT 0,
    stripe_customer TEXT UNIQUE
  );
  CREATE TABLE login_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE login_requests (email TEXT NOT NULL, at TEXT NOT NULL);
  CREATE INDEX login_requests_email ON login_requests (email, at);
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    last_seen TEXT NOT NULL
  );
  CREATE TABLE snapshots (
    user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    data TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    device TEXT
  );
  CREATE TABLE push_subs (
    endpoint TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE reminders_sent (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    PRIMARY KEY (user_id, day)
  );
  CREATE TABLE daily_results (
    number INTEGER NOT NULL,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    scores TEXT NOT NULL,
    right_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (number, user_id)
  );
  CREATE TABLE league_scores (
    week TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    league INTEGER NOT NULL,
    band INTEGER NOT NULL,
    start_rating REAL NOT NULL,
    rating REAL NOT NULL,
    decisions INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (week, user_id)
  );
  CREATE INDEX league_scores_league ON league_scores (week, league);
  CREATE TABLE answers (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    score REAL NOT NULL,
    rating REAL NOT NULL,
    at TEXT NOT NULL,
    PRIMARY KEY (user_id, item_id, at)
  );
  CREATE INDEX answers_item ON answers (item_id);
  CREATE TABLE stripe_events (id TEXT PRIMARY KEY, at TEXT NOT NULL);
  `,
];

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function migrate(db: Db) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

/** Runs a function in a transaction. */
export function tx<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

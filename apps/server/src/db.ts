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
  // Coach messages per player per day (the player's own date), for the daily cap.
  `
  CREATE TABLE coach_usage (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
  `,
  // Passkeys. A passkey account needs no email, so users.email becomes optional.
  // SQLite cannot drop NOT NULL in place: the table is rebuilt (foreign keys are
  // off while migrating, so nothing cascades).
  `
  CREATE TABLE users_next (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
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
  INSERT INTO users_next SELECT id, email, handle, created_at, tz, cue_minutes, reminders, leagues, last_study_day, pro_until, plan, trialing, trial_used, stripe_customer FROM users;
  DROP TABLE users;
  ALTER TABLE users_next RENAME TO users;
  CREATE TABLE passkeys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    device_type TEXT,
    backed_up INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_used TEXT
  );
  CREATE INDEX passkeys_user ON passkeys (user_id);
  CREATE TABLE webauthn_challenges (
    id TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    kind TEXT NOT NULL,
    user_id TEXT,
    existing INTEGER NOT NULL DEFAULT 0,
    label TEXT,
    expires_at TEXT NOT NULL
  );
  `,
  `
  ALTER TABLE users ADD COLUMN trial_reminder INTEGER NOT NULL DEFAULT 1;
  CREATE TABLE notices_sent (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    key TEXT NOT NULL,
    at TEXT NOT NULL,
    PRIMARY KEY (user_id, kind, key)
  );
  `,
  `
  ALTER TABLE users ADD COLUMN reminder_body TEXT;
  `,
  // Invites: a code per player. A friend who joins with it gets a month of Pro
  // at once; the inviter gets a month once the friend has studied (rewarded).
  `
  ALTER TABLE users ADD COLUMN ref_code TEXT;
  CREATE UNIQUE INDEX users_ref_code ON users (ref_code);
  ALTER TABLE users ADD COLUMN bonus_until TEXT;
  CREATE TABLE referrals (
    referred_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    referrer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL,
    qualified_at TEXT,
    rewarded INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX referrals_referrer ON referrals (referrer_id);
  `,
  // The marketing site's waitlists: native apps coming soon and founding members.
  `
  CREATE TABLE waitlist (
    email TEXT NOT NULL,
    list TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (email, list)
  );
  `,
  // Retention and lifecycle: the subscription as Stripe last reported it, the
  // cancel flow, the founding (lifetime) purchase, billing issues, push caps,
  // email consent (CASL: marketing email is opt in) and a holdout group.
  // Seats in lifetime_checkouts keep no foreign key: a seat stays taken after
  // its account is deleted.
  `
  ALTER TABLE users ADD COLUMN stripe_subscription TEXT;
  ALTER TABLE users ADD COLUMN sub_status TEXT;
  ALTER TABLE users ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN paid_through TEXT;
  ALTER TABLE users ADD COLUMN paused_until TEXT;
  ALTER TABLE users ADD COLUMN billing_issue INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN billing_issue_at TEXT;
  ALTER TABLE users ADD COLUMN lifetime INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN retention_coupon_at TEXT;
  ALTER TABLE users ADD COLUMN churned_at TEXT;
  ALTER TABLE users ADD COLUMN last_paid_at TEXT;
  ALTER TABLE users ADD COLUMN last_active_at TEXT;
  ALTER TABLE users ADD COLUMN email_opt_in INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN email_opt_in_at TEXT;
  ALTER TABLE users ADD COLUMN unsub_token TEXT;
  ALTER TABLE users ADD COLUMN holdout INTEGER NOT NULL DEFAULT 0;
  UPDATE users SET unsub_token = lower(hex(randomblob(16)));
  UPDATE users SET last_active_at = (SELECT MAX(last_seen) FROM sessions s WHERE s.user_id = users.id);
  CREATE UNIQUE INDEX users_unsub_token ON users (unsub_token);
  CREATE TABLE cancel_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    detail TEXT,
    offer_shown TEXT,
    offer_taken INTEGER NOT NULL DEFAULT 0,
    at TEXT NOT NULL
  );
  CREATE INDEX cancel_feedback_user ON cancel_feedback (user_id, at);
  CREATE TABLE push_log (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    at TEXT NOT NULL
  );
  CREATE INDEX push_log_user ON push_log (user_id, at);
  CREATE TABLE lifetime_checkouts (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    completed_at TEXT
  );
  ALTER TABLE waitlist ADD COLUMN source TEXT;
  ALTER TABLE waitlist ADD COLUMN platform TEXT;
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
  if (current >= MIGRATIONS.length) return;
  // The SQLite way to change a table: foreign keys off (outside a transaction),
  // rebuild, check every reference still holds, then turn them back on.
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    for (let v = current; v < MIGRATIONS.length; v++) {
      db.exec('BEGIN');
      try {
        db.exec(MIGRATIONS[v]);
        const broken = db.prepare('PRAGMA foreign_key_check').all();
        if (broken.length) throw new Error(`Migration ${v + 1} broke ${broken.length} references`);
        db.exec(`PRAGMA user_version = ${v + 1}`);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
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

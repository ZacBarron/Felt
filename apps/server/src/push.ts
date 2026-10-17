import webpush from 'web-push';
import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { localTime, outsideQuietHours, safeZone, shouldRemind } from './services.ts';

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends one push. Resolves to "gone" when the browser has dropped the subscription. */
export type PushSender = (sub: PushSub, payload: string) => Promise<'ok' | 'gone'>;

export function createPushSender(config: Config): PushSender | undefined {
  const { publicKey, privateKey, subject } = config.push;
  if (!publicKey || !privateKey) return undefined;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return async (sub, payload) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 3600 });
      return 'ok';
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return 'gone';
      throw e;
    }
  };
}

/** The reminder text: what is waiting, never guilt or a countdown. */
export const REMINDER = {
  title: 'Your poker plan is ready',
  body: "Today's lesson, review and daily challenge are waiting.",
  url: '/',
};

/** The daily reminder, naming what is waiting when the device said so. */
export const reminderFor = (body: string | null) => (body ? { ...REMINDER, body } : REMINDER);

/**
 * The one note after two weeks of reminders without a visit. Then reminders
 * stop until the player opens Aced again. No sulk and no guilt.
 */
export const CLOSING_NOTE = {
  title: 'Reminders are paused',
  body: "We'll stop reminders here. Your plan is waiting when you're back.",
  url: '/',
};

const DAY_MS = 86_400_000;

/** Sends a payload to every device of a player, dropping dead subscriptions. Returns the devices reached. */
async function sendToPlayer(db: Db, send: PushSender, userId: string, payload: string): Promise<number> {
  const subs = db.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').all(userId) as unknown as PushSub[];
  let sent = 0;
  for (const sub of subs) {
    try {
      if ((await send(sub, payload)) === 'gone') db.prepare('DELETE FROM push_subs WHERE endpoint = ?').run(sub.endpoint);
      else sent++;
    } catch (e) {
      console.error('Push failed', e);
    }
  }
  return sent;
}

/** Every push is logged per player (not per device) for the daily and weekly caps. */
const logPush = (db: Db, userId: string, kind: string, now: Date) =>
  db.prepare('INSERT INTO push_log (user_id, kind, at) VALUES (?, ?, ?)').run(userId, kind, now.toISOString());

const pushesSince = (db: Db, userId: string, since: Date) =>
  (db.prepare('SELECT at FROM push_log WHERE user_id = ? AND at > ? ORDER BY at DESC').all(userId, since.toISOString()) as { at: string }[]).map((r) => r.at);

/** The later of the last visit and the last study day (counted from its start). */
export function lastOpen(lastActiveAt: string | null, lastStudyDay: string | null): string | null {
  const values = [lastActiveAt, lastStudyDay ? `${lastStudyDay}T00:00:00.000Z` : null].filter((v): v is string => !!v);
  return values.sort().at(-1) ?? null;
}

/**
 * Sends today's study reminders that are due. Run every few minutes; each
 * player gets at most one a day, at their own study time, within the push
 * caps, and the closing note once when reminders stopped working.
 */
export async function runReminders(db: Db, send: PushSender, now = new Date()): Promise<number> {
  const users = db
    .prepare(
      'SELECT id, tz, cue_minutes, last_study_day, reminder_body, last_active_at FROM users WHERE reminders = 1 AND tz IS NOT NULL AND cue_minutes IS NOT NULL AND EXISTS (SELECT 1 FROM push_subs p WHERE p.user_id = users.id)',
    )
    .all() as { id: string; tz: string; cue_minutes: number; last_study_day: string | null; reminder_body: string | null; last_active_at: string | null }[];
  let sent = 0;
  for (const u of users) {
    const tz = safeZone(u.tz);
    // A reminder counts as ignored until the player studies or opens Aced again.
    const openDay = u.last_active_at ? localTime(new Date(u.last_active_at), tz).day : '';
    const since = [u.last_study_day ?? '', openDay].sort().at(-1)!;
    const sentSinceStudy = (db.prepare('SELECT day FROM reminders_sent WHERE user_id = ? AND day > ? ORDER BY day DESC').all(u.id, since) as { day: string }[]).map(
      (r) => r.day,
    );
    const closing = db.prepare("SELECT MAX(at) AS at FROM notices_sent WHERE user_id = ? AND kind = 'push-closing'").get(u.id) as { at: string | null };
    const decision = shouldRemind(
      {
        tz,
        cueMinutes: u.cue_minutes,
        lastStudyDay: u.last_study_day,
        sentSinceStudy,
        pushesSent: pushesSince(db, u.id, new Date(now.getTime() - 7 * DAY_MS)),
        lastOpenAt: lastOpen(u.last_active_at, u.last_study_day),
        closingSentAt: closing.at,
      },
      now,
    );
    if (!decision.send) continue;
    db.prepare('INSERT OR IGNORE INTO reminders_sent (user_id, day) VALUES (?, ?)').run(u.id, decision.day);
    if (decision.kind === 'closing')
      db.prepare("INSERT OR IGNORE INTO notices_sent (user_id, kind, key, at) VALUES (?, 'push-closing', ?, ?)").run(u.id, decision.day, now.toISOString());
    logPush(db, u.id, decision.kind, now);
    const payload = decision.kind === 'closing' ? CLOSING_NOTE : reminderFor(u.reminder_body);
    sent += await sendToPlayer(db, send, u.id, JSON.stringify(payload));
  }
  return sent;
}

/**
 * The trial reminder: when the free week ends and how to cancel, sent
 * once, 2 days before. Plain facts, the same tone as the paywall timeline.
 */
export function trialEndingNotice(proUntil: string, tz: string | null) {
  let date: string;
  try {
    date = new Date(proUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz ?? 'UTC' });
  } catch {
    date = new Date(proUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  return { title: 'Your free week ends in 2 days', body: `Aced Pro starts on ${date}. To cancel, open Account in Aced.`, url: '/account' };
}

/**
 * Sends trial reminders that are due: players in a free trial that ends in
 * 36 to 60 hours, who kept the reminder on and have a device to reach.
 * Each trial gets at most one, keyed by its end date. It is a promise made
 * on the paywall, so the caps never hold it back. It still counts toward
 * them, and it waits out quiet hours (the 24 hour window always has room).
 */
export async function runTrialNotices(db: Db, send: PushSender, now = new Date()): Promise<number> {
  const from = new Date(now.getTime() + 1.5 * DAY_MS).toISOString();
  const to = new Date(now.getTime() + 2.5 * DAY_MS).toISOString();
  const users = db
    .prepare(
      `SELECT id, tz, pro_until FROM users
       WHERE trialing = 1 AND trial_reminder = 1 AND pro_until > ? AND pro_until <= ?
       AND EXISTS (SELECT 1 FROM push_subs p WHERE p.user_id = users.id)
       AND NOT EXISTS (SELECT 1 FROM notices_sent n WHERE n.user_id = users.id AND n.kind = 'trial-ending' AND n.key = users.pro_until)`,
    )
    .all(from, to) as { id: string; tz: string | null; pro_until: string }[];
  let sent = 0;
  for (const u of users) {
    if (!outsideQuietHours(now, safeZone(u.tz))) continue;
    db.prepare("INSERT OR IGNORE INTO notices_sent (user_id, kind, key, at) VALUES (?, 'trial-ending', ?, ?)").run(u.id, u.pro_until, now.toISOString());
    logPush(db, u.id, 'trial-ending', now);
    sent += await sendToPlayer(db, send, u.id, JSON.stringify(trialEndingNotice(u.pro_until, u.tz)));
  }
  return sent;
}

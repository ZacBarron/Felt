import webpush from 'web-push';
import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { shouldRemind } from './services.ts';

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

/**
 * Sends today's study reminders that are due. Run every few minutes; each
 * player gets at most one a day, at their own study time.
 */
export async function runReminders(db: Db, send: PushSender, now = new Date()): Promise<number> {
  const users = db
    .prepare(
      'SELECT id, tz, cue_minutes, last_study_day FROM users WHERE reminders = 1 AND tz IS NOT NULL AND cue_minutes IS NOT NULL AND EXISTS (SELECT 1 FROM push_subs p WHERE p.user_id = users.id)',
    )
    .all() as { id: string; tz: string; cue_minutes: number; last_study_day: string | null }[];
  let sent = 0;
  for (const u of users) {
    const sentSinceStudy = (
      db.prepare('SELECT day FROM reminders_sent WHERE user_id = ? AND day > ? ORDER BY day DESC').all(u.id, u.last_study_day ?? '') as { day: string }[]
    ).map((r) => r.day);
    const decision = shouldRemind({ tz: u.tz, cueMinutes: u.cue_minutes, lastStudyDay: u.last_study_day, sentSinceStudy }, now);
    if (!decision.send) continue;
    db.prepare('INSERT OR IGNORE INTO reminders_sent (user_id, day) VALUES (?, ?)').run(u.id, decision.day);
    const subs = db.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').all(u.id) as unknown as PushSub[];
    for (const sub of subs) {
      try {
        if ((await send(sub, JSON.stringify(REMINDER))) === 'gone') db.prepare('DELETE FROM push_subs WHERE endpoint = ?').run(sub.endpoint);
        else sent++;
      } catch (e) {
        console.error('Push failed', e);
      }
    }
  }
  return sent;
}

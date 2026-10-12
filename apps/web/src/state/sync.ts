import { dayKey, replayRatings, type RatingEvent } from '@felt/core';
import { Dexie } from 'dexie';
import { useSyncExternalStore } from 'react';
import { api, ApiError, currentSession, refreshMe, updateMe } from './api';
import { exportBackup, importBackup } from './backup';
import { setCalibration, calibratedDifficulty } from './calibration';
import { db } from './db';
import { activityDates } from './rating';

/**
 * Keeps this device and the player's cloud copy in step. The server holds
 * one versioned snapshot; a device pushes when its data changed and pulls
 * when the cloud is newer and nothing changed here. When both changed, the
 * player chooses which copy to keep: nothing is merged silently.
 */

const META_KEY = 'felt.sync.v1';

export interface SyncMeta {
  /** Cloud version this device last matched; undefined before the first sync. */
  version?: number;
  syncedAt?: string;
  dirty: boolean;
  /** Cloud version that conflicts with local changes, waiting for the player to choose. */
  conflict?: { version: number; updatedAt?: string; device?: string | null };
  /** Highest answer id already sent for calibration. */
  answersSent?: number;
  calibratedAt?: string;
  error?: string;
}

let meta: SyncMeta = read();
const listeners = new Set<() => void>();

function read(): SyncMeta {
  try {
    const saved = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as Partial<SyncMeta>;
    return { ...saved, dirty: saved.dirty ?? false };
  } catch {
    return { dirty: false };
  }
}

function write(next: Partial<SyncMeta>) {
  meta = { ...meta, ...next };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Storage blocked: sync state lives for this visit.
  }
  listeners.forEach((l) => l());
}

export const syncMeta = () => meta;

export function useSyncMeta(): SyncMeta {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => meta,
  );
}

/** Forget sync state, e.g. on sign out, so another account starts clean. */
export function resetSync() {
  write({ version: undefined, syncedAt: undefined, dirty: false, conflict: undefined, answersSent: undefined, error: undefined });
}

// Change tracking --------------------------------------------------------------

let pushTimer: ReturnType<typeof setTimeout> | undefined;
let applying = false;

/** Marks local data as changed and schedules a push. */
export function markDirty() {
  if (applying) return;
  if (!meta.dirty) write({ dirty: true });
  if (!currentSession()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow().catch(() => undefined), 20_000);
}

let started = false;

/** Watches the database for changes and pushes when the app goes to the background. */
export function startSync() {
  if (started) return;
  started = true;
  Dexie.on('storagemutated', (parts: Record<string, unknown>) => {
    // The local event log is analytics, not progress.
    if (Object.keys(parts).some((k) => !k.includes('/events/'))) markDirty();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && meta.dirty && currentSession()) void pushNow().catch(() => undefined);
  });
}

// Push and pull ----------------------------------------------------------------

interface CloudMeta {
  version: number;
  updatedAt?: string;
  device?: string | null;
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Browser';
}

async function hasLocalProgress() {
  const [answers, lessons, reviews] = await Promise.all([db.answers.count(), db.lessons.count(), db.reviews.count()]);
  return answers + lessons + reviews > 0;
}

async function upload(baseVersion: number) {
  const data = await exportBackup();
  try {
    const r = await api<{ version: number; updatedAt: string }>('/sync', { method: 'PUT', body: { baseVersion, data, device: deviceName() }, timeoutMs: 60_000 });
    write({ version: r.version, syncedAt: r.updatedAt, dirty: false, conflict: undefined, error: undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const cloud = await api<CloudMeta>('/sync?meta=1');
      write({ conflict: cloud, error: undefined });
      return;
    }
    write({ error: e instanceof Error ? e.message : 'Sync failed.' });
    throw e;
  }
}

async function download(): Promise<boolean> {
  const cloud = await api<CloudMeta & { data?: string }>('/sync', { timeoutMs: 60_000 });
  if (!cloud.data) return false;
  applying = true;
  try {
    await importBackup(cloud.data);
  } finally {
    applying = false;
  }
  write({ version: cloud.version, syncedAt: cloud.updatedAt, dirty: false, conflict: undefined, error: undefined });
  return true;
}

/** Sends this device's data now. */
export async function pushNow() {
  if (!currentSession()) return;
  if (meta.conflict) return;
  if (meta.version === undefined) return firstSync();
  await upload(meta.version);
  await afterSync();
}

/**
 * The first sync after signing in: an empty cloud gets this device's data,
 * an empty device gets the cloud's, and when both have progress the player
 * chooses.
 */
export async function firstSync(): Promise<'pushed' | 'pulled' | 'choose'> {
  const cloud = await api<CloudMeta>('/sync?meta=1');
  if (cloud.version === 0) {
    await upload(0);
    await afterSync();
    return 'pushed';
  }
  if (!(await hasLocalProgress())) {
    await download();
    return 'pulled';
  }
  write({ conflict: cloud });
  return 'choose';
}

/**
 * On app start: brings in a newer cloud copy before the app renders, when
 * this device has no unsynced changes. Returns true if data was replaced.
 */
export async function pullIfNewer(): Promise<boolean> {
  if (!currentSession() || meta.version === undefined || meta.conflict) return false;
  const cloud = await api<CloudMeta>('/sync?meta=1', { timeoutMs: 3000 });
  if (cloud.version <= meta.version) return false;
  if (meta.dirty) {
    write({ conflict: cloud });
    return false;
  }
  return download();
}

/** Resolves a conflict with the copy the player picked. */
export async function keepCopy(choice: 'device' | 'cloud') {
  const conflict = meta.conflict;
  if (!conflict) return;
  if (choice === 'cloud') {
    await download();
    location.reload();
    return;
  }
  write({ conflict: undefined });
  await upload(conflict.version);
  await afterSync();
}

// Extras that ride along with a sync ---------------------------------------------

/** Rating events with the player's rating just before each answer, for calibration. */
async function answersWithRating() {
  const answers = await db.answers.orderBy('at').toArray();
  const events: RatingEvent[] = answers.map((a) => ({ at: a.at.getTime(), itemId: a.itemId, domain: a.domain, difficulty: a.difficulty, score: a.score }));
  const { history, overall } = replayRatings(events);
  // replayRatings sorts by time (stably), the same order as these answers, so history lines up with them.
  const before = answers.map((a, i) => ({ answer: a, rating: i === 0 ? 1200 : history[i - 1].rating }));
  return { before, overall };
}

async function afterSync() {
  const session = currentSession();
  if (!session) return;
  const today = dayKey(new Date());
  const studiedToday = (await activityDates()).some((d) => dayKey(d) === today);
  const { before, overall } = await answersWithRating();
  const tasks: Promise<unknown>[] = [];

  if (studiedToday && session.user.lastStudyDay !== today) tasks.push(updateMe({ lastStudyDay: today }));

  const fresh = before.filter(({ answer }) => (answer.id ?? 0) > (meta.answersSent ?? 0)).slice(0, 5000);
  if (fresh.length) {
    tasks.push(
      api('/answers', {
        body: { answers: fresh.map(({ answer, rating }) => ({ itemId: answer.itemId, score: answer.score, rating, at: answer.at.toISOString() })) },
      }).then(() => write({ answersSent: Math.max(...fresh.map(({ answer }) => answer.id ?? 0)) })),
    );
  }

  if (session.user.leagues && session.user.handle && before.length) {
    const weekStart = mondayUtc(new Date());
    const decisions = before.filter(({ answer }) => answer.at >= weekStart).length;
    tasks.push(api('/league', { body: { rating: Math.round(overall.rating), decisions } }));
  }

  // Fitted difficulties change slowly: once a day is plenty.
  if (!meta.calibratedAt || Date.now() - Date.parse(meta.calibratedAt) > 86_400_000) {
    tasks.push(
      api<{ items: Record<string, { difficulty: number }> }>('/calibration').then((r) => {
        setCalibration(Object.fromEntries(Object.entries(r.items).map(([k, v]) => [k, v.difficulty])));
        write({ calibratedAt: new Date().toISOString() });
      }),
    );
  }
  tasks.push(refreshMe());
  await Promise.allSettled(tasks);
}

function mondayUtc(now: Date) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

// Re-exported so pages can show where a difficulty came from.
export { calibratedDifficulty };

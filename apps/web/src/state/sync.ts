import { dayKey, replayRatings, type RatingEvent } from '@felt/core';
import { Dexie } from 'dexie';
import { useSyncExternalStore } from 'react';
import { api, ApiError, currentSession, refreshMe, updateMe } from './api';
import { exportBackup, importBackup } from './backup';
import { claudeCloud, cloudGet, CloudConflict, cloudMeta, cloudPut } from './cloud';
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
  /** A push is in flight. Never restored from storage. */
  saving?: boolean;
  /**
   * The account this device last synced with, kept after logging out. Signing
   * back in to the same account then picks up where it left off instead of
   * asking which copy to keep.
   */
  previous?: { userId: string; version: number };
}

let meta: SyncMeta = read();
const listeners = new Set<() => void>();

function read(): SyncMeta {
  try {
    const saved = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as Partial<SyncMeta>;
    return { ...saved, dirty: saved.dirty ?? false, saving: false };
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

/** Remembers which account and version this device matched, before logging out. */
export function rememberAccount(userId: string) {
  if (meta.version !== undefined && !meta.dirty && !meta.conflict) write({ previous: { userId, version: meta.version } });
  else write({ previous: undefined });
}

/** Forget sync state, e.g. on sign out, so another account starts clean. */
export function resetSync() {
  write({ version: undefined, syncedAt: undefined, dirty: false, conflict: undefined, answersSent: undefined, error: undefined, saving: false });
}

/** Tells the app that synced data replaced what was on screen, so settings reload from storage. */
export const DATA_REPLACED = 'felt:data-replaced';
const notifyReplaced = () => window.dispatchEvent(new Event(DATA_REPLACED));

/** A cloud to sync with: the Felt server account, or the claude.ai artifact store. */
export const cloudReady = () => !!currentSession() || !!claudeCloud();

// Change tracking --------------------------------------------------------------

let pushTimer: ReturnType<typeof setTimeout> | undefined;
let applying = false;

/** Marks local data as changed and schedules a push. */
export function markDirty() {
  if (applying) return;
  if (!meta.dirty) write({ dirty: true });
  if (!cloudReady()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow().catch(() => undefined), 20_000);
}

let started = false;
let hiddenAt = 0;
/** Coming back after this long checks for a newer copy from another device. */
const PULL_AFTER_MS = 2 * 60 * 1000;

/**
 * Watches the database for changes. Saves when the app goes to the
 * background, when the page is closed and when the connection comes back.
 * Coming back to the app after a while brings in a newer copy from another
 * device, when nothing changed here.
 */
export function startSync() {
  if (started) return;
  started = true;
  Dexie.on('storagemutated', (parts: Record<string, unknown>) => {
    // The local event log is analytics, not progress.
    if (Object.keys(parts).some((k) => !k.includes('/events/'))) markDirty();
  });
  const saveSoon = () => {
    if (meta.dirty && cloudReady()) void pushNow().catch(() => undefined);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      saveSoon();
    } else if (hiddenAt && Date.now() - hiddenAt > PULL_AFTER_MS) {
      hiddenAt = 0;
      void pullIfNewer()
        .then((replaced) => replaced && notifyReplaced())
        .catch(() => undefined);
    }
  });
  // Best effort when the page is closing: iOS often skips the visibility change.
  window.addEventListener('pagehide', saveSoon);
  window.addEventListener('online', saveSoon);
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

// The Felt server account wins when both exist: it also carries leagues and Pro.
const remoteMeta = (timeoutMs?: number): Promise<CloudMeta> => {
  const c = claudeCloud();
  if (!currentSession() && c) return cloudMeta(c);
  return api<CloudMeta>('/sync?meta=1', timeoutMs ? { timeoutMs } : {});
};

const remoteGet = (): Promise<CloudMeta & { data?: string }> => {
  const c = claudeCloud();
  if (!currentSession() && c) return cloudGet(c);
  return api<CloudMeta & { data?: string }>('/sync', { timeoutMs: 60_000 });
};

async function upload(baseVersion: number) {
  const data = await exportBackup();
  write({ saving: true });
  try {
    const c = claudeCloud();
    const r =
      !currentSession() && c
        ? await cloudPut(c, baseVersion, data, deviceName())
        : await api<{ version: number; updatedAt: string }>('/sync', { method: 'PUT', body: { baseVersion, data, device: deviceName() }, timeoutMs: 60_000 });
    write({ version: r.version, syncedAt: r.updatedAt, dirty: false, conflict: undefined, error: undefined });
  } catch (e) {
    if (e instanceof CloudConflict) {
      write({ conflict: e.cloud, error: undefined });
      return;
    }
    if (e instanceof ApiError && e.status === 409) {
      const cloud = await api<CloudMeta>('/sync?meta=1');
      write({ conflict: cloud, error: undefined });
      return;
    }
    write({ error: e instanceof Error ? e.message : 'Sync did not work. Felt will try again soon.' });
    throw e;
  } finally {
    if (meta.saving) write({ saving: false });
  }
}

async function download(): Promise<boolean> {
  const cloud = await remoteGet();
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
  if (!cloudReady()) return;
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
export async function firstSync(): Promise<'pushed' | 'pulled' | 'choose' | 'same'> {
  const cloud = await remoteMeta();
  if (cloud.version === 0) {
    await upload(0);
    await afterSync();
    return 'pushed';
  }
  // Back on the account this device last matched: no need to choose.
  const previous = meta.previous;
  const userId = currentSession()?.user.id;
  if (previous && userId && previous.userId === userId) {
    write({ previous: undefined });
    if (cloud.version === previous.version) {
      if (meta.dirty) {
        await upload(previous.version);
        await afterSync();
      } else write({ version: cloud.version, syncedAt: cloud.updatedAt, conflict: undefined, error: undefined });
      return 'same';
    }
    if (!meta.dirty) {
      await download();
      return 'pulled';
    }
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
  if (!cloudReady() || meta.version === undefined || meta.conflict) return false;
  const cloud = await remoteMeta(3000);
  if (cloud.version <= meta.version) return false;
  if (meta.dirty) {
    write({ conflict: cloud });
    return false;
  }
  return download();
}

/**
 * Resolves a conflict with the copy the player picked. Taking the cloud copy
 * reloads the app, unless the caller reloads its settings itself.
 */
export async function keepCopy(choice: 'device' | 'cloud', { reload = true }: { reload?: boolean } = {}) {
  const conflict = meta.conflict;
  if (!conflict) return;
  if (choice === 'cloud') {
    await download();
    if (reload) location.reload();
    else notifyReplaced();
    return;
  }
  write({ conflict: undefined });
  await upload(conflict.version);
  await afterSync();
}

/** The cloud copy as text, without applying it, so the player can see what it holds. */
export async function cloudCopy(): Promise<{ data?: string; updatedAt?: string; device?: string | null }> {
  const cloud = await remoteGet();
  return { data: cloud.data, updatedAt: cloud.updatedAt, device: cloud.device };
}

/**
 * Saves everything now and says whether it worked, for moments that need to
 * know (like logging out). Never throws.
 */
export async function saveNow(): Promise<{ ok: true } | { ok: false; reason: 'offline' | 'conflict' | 'error'; message?: string }> {
  if (!cloudReady()) return { ok: false, reason: 'error', message: 'You are not signed in.' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
  try {
    if (meta.conflict) return { ok: false, reason: 'conflict' };
    if (meta.version === undefined) await firstSync();
    // Nothing changed since the last save: the cloud already matches.
    else if (meta.dirty) await upload(meta.version);
    if (meta.conflict) return { ok: false, reason: 'conflict' };
    if (meta.dirty || meta.version === undefined) return { ok: false, reason: 'error', message: meta.error };
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError && e.status === 0) return { ok: false, reason: 'offline' };
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : undefined };
  }
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

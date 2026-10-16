import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setSession } from '../src/state/api';
import { db } from '../src/state/db';
import { firstSync, rememberAccount, resetSync, syncMeta } from '../src/state/sync';

const store = new Map<string, string>();
let cloud: { version: number; data?: string };
let puts: number;

const user = (id: string) => ({ id, email: null, passkeys: 1, handle: null, tz: null, cueMinutes: null, reminders: false, leagues: false, lastStudyDay: null, access: { pro: false, until: null, plan: null, trialing: false } });

beforeEach(async () => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  await Promise.all(db.tables.map((t) => t.clear()));
  cloud = { version: 0 };
  puts = 0;
  // A tiny stand in for the Suited server's sync routes.
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url);
    let body: unknown = {};
    if (path.includes('/sync') && init?.method === 'PUT') {
      const sent = JSON.parse(String(init.body)) as { baseVersion: number; data: string };
      puts++;
      cloud = { version: sent.baseVersion + 1, data: sent.data };
      body = { version: cloud.version, updatedAt: new Date().toISOString() };
    } else if (path.includes('/sync?meta=1')) body = { version: cloud.version };
    else if (path.includes('/sync')) body = cloud;
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  resetSync();
  setSession(null);
});

/** Signs in as a user on this device and syncs once, so the cloud matches this device. */
async function syncedAs(id: string) {
  await db.lessons.put({ key: 'basics/rules/goal', status: 'done', step: 5, correct: 2, answered: 2, updatedAt: new Date() });
  setSession({ token: 't', user: user(id) });
  expect(await firstSync()).toBe('pushed');
}

describe('signing back in', () => {
  it('picks up where it left off on the same account, without asking', async () => {
    await syncedAs('u1');
    rememberAccount('u1');
    setSession(null);
    resetSync();

    setSession({ token: 't2', user: user('u1') });
    expect(await firstSync()).toBe('same');
    expect(syncMeta().conflict).toBeUndefined();
    expect(syncMeta().version).toBe(1);
    expect(puts).toBe(1);
  });

  it('sends changes made as a guest in between', async () => {
    await syncedAs('u1');
    rememberAccount('u1');
    setSession(null);
    resetSync();
    // Studying while logged out marks the copy as changed.
    (await import('../src/state/sync')).markDirty();

    setSession({ token: 't2', user: user('u1') });
    expect(await firstSync()).toBe('same');
    expect(puts).toBe(2);
    expect(syncMeta().dirty).toBe(false);
  });

  it('still asks when a different account signs in on a device with progress', async () => {
    await syncedAs('u1');
    rememberAccount('u1');
    setSession(null);
    resetSync();
    cloud = { version: 4, data: cloud.data };

    setSession({ token: 't3', user: user('u2') });
    expect(await firstSync()).toBe('choose');
    expect(syncMeta().conflict?.version).toBe(4);
  });
});

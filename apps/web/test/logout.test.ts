import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, currentSession, refreshMe, type Session, setSession, updateMe } from '../src/state/api';
import { logOut } from '../src/state/auth';

const store = new Map<string, string>();
const user = (id: string) => ({ id, email: null, passkeys: 1, handle: null, tz: null, cueMinutes: null, reminders: false, leagues: false, lastStudyDay: null, access: { pro: false, until: null, plan: null, trialing: false } });

/** Requests to /me wait until the test lets them answer, like a slow server. */
let waiting: (() => void)[] = [];
const release = () => waiting.splice(0).forEach((r) => r());
let status = 200;

beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: () => null,
    length: 0,
  };
  status = 200;
  waiting = [];
  vi.stubGlobal('fetch', async (url: string) => {
    if (String(url).includes('/me')) await new Promise<void>((r) => waiting.push(r));
    return new Response(JSON.stringify({ user: user('u1') }), { status, headers: { 'Content-Type': 'application/json' } });
  });
  setSession(null);
});

const signIn = (token = 't1') => setSession({ token, user: user('u1') });

describe('logging out', () => {
  it('stays logged out when a request that started before returns after', async () => {
    signIn();
    const refresh = refreshMe();
    const patch = updateMe({ handle: 'Zed' });
    await logOut();
    expect(currentSession()).toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    release();
    await Promise.all([refresh, patch]);
    expect(currentSession()).toBeNull();
    expect(store.get('felt.session.v1')).toBeUndefined();
  });

  it('does not let an old request end a new account session', async () => {
    signIn('old');
    status = 401;
    const old = api('/me').catch(() => undefined);
    setSession({ token: 'new', user: user('u2') });
    await new Promise((r) => setTimeout(r, 0));
    release();
    await old;
    expect(currentSession()?.token).toBe('new');
  });

  it('never stores a session without a token', () => {
    setSession({ user: user('u1') } as unknown as Session);
    expect(currentSession()).toBeNull();
  });
});

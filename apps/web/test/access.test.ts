import { describe, expect, it } from 'vitest';
import { accessFromServer, decideRestore, isPro, setTestingPro, testingPro } from '../src/state/access';
import type { ServerFeatures, ServerUser } from '../src/state/api';
import type { Access } from '../src/state/settings';

const NOW = new Date('2026-10-16T12:00:00Z');
const later = new Date(NOW.getTime() + 30 * 86_400_000).toISOString();
const free: Access = { pro: false };

const features = (patch: Partial<ServerFeatures> = {}): ServerFeatures => ({ accounts: true, billing: false, push: false, coach: true, ...patch });
const user = (access: Partial<ServerUser['access']> = {}, email: string | null = 'ana@example.com'): ServerUser => ({
  id: 'u1',
  email,
  handle: null,
  tz: null,
  cueMinutes: null,
  reminders: false,
  leagues: false,
  lastStudyDay: null,
  access: { pro: false, until: null, plan: null, trialing: false, ...access },
});

describe('restore purchases', () => {
  it('says plainly when the server does not answer', () => {
    const r = decideRestore({ features: null, signedIn: true, local: free });
    expect(r.kind).toBe('unavailable');
    expect(r.message).toMatch(/did not answer/);
  });

  it('says so when the server has no accounts', () => {
    expect(decideRestore({ features: features({ accounts: false }), signedIn: false, local: free }).kind).toBe('unavailable');
  });

  it('asks a signed out player to sign in first', () => {
    const r = decideRestore({ features: features(), signedIn: false, local: free });
    expect(r.kind).toBe('sign-in');
    expect(r.title).toBe('Sign in to restore');
  });

  it('switches Pro on when the account has it, keeping device switches', () => {
    const local: Access = { pro: false, devMode: true };
    const r = decideRestore({ features: features({ billing: true }), signedIn: true, user: user({ pro: true, until: later, plan: 'annual' }), local });
    expect(r.kind).toBe('restored');
    if (r.kind !== 'restored') return;
    expect(r.message).toBe('Aced Pro is on for ana@example.com.');
    expect(r.access).toMatchObject({ pro: true, plan: 'annual', until: later, devMode: true });
    expect(isPro(r.access, NOW)).toBe(true);
  });

  it('switches Pro on for every signed in player while the server is testing', () => {
    const r = decideRestore({ features: features({ proForEveryone: true }), signedIn: true, user: user(), local: free });
    expect(r.kind).toBe('restored');
    if (r.kind === 'restored') expect(isPro(r.access, NOW)).toBe(true);
  });

  it('says no purchase is on the account, and why, with billing off', () => {
    const r = decideRestore({ features: features(), signedIn: true, user: user(), local: free });
    expect(r.kind).toBe('not-found');
    expect(r.message).toMatch(/ana@example.com/);
    expect(r.message).toMatch(/Purchases are not open yet/);
  });

  it('suggests another account when billing is on and nothing is found', () => {
    const r = decideRestore({ features: features({ billing: true }), signedIn: true, user: user({}, null), local: free });
    expect(r.kind).toBe('not-found');
    expect(r.message).toMatch(/this account/);
    expect(r.message).toMatch(/another account/);
  });

  it('reports a failed account check instead of guessing', () => {
    const r = decideRestore({ features: features(), signedIn: true, error: 'Could not reach the Aced server. Check your connection.', local: free });
    expect(r).toMatchObject({ kind: 'unavailable', message: 'Could not reach the Aced server. Check your connection.' });
    expect(decideRestore({ features: features(), signedIn: true, user: null, local: free }).kind).toBe('unavailable');
  });

  it('never restores a lapsed subscription', () => {
    const past = new Date(NOW.getTime() - 86_400_000).toISOString();
    expect(decideRestore({ features: features({ billing: true }), signedIn: true, user: user({ pro: false, until: past }), local: free }).kind).toBe('not-found');
  });
});

describe('Pro for testing', () => {
  it('unlocks Pro on this device without developer mode and switches back off', () => {
    const on = setTestingPro(free, true);
    expect(testingPro(on)).toBe(true);
    expect(isPro(on, NOW)).toBe(true);
    const off = setTestingPro(on, false);
    expect(off.devPro).toBeUndefined();
    expect(isPro(off, NOW)).toBe(false);
  });

  it('lets developer mode still force Pro off', () => {
    expect(isPro({ pro: true, devMode: true, devPro: false }, NOW)).toBe(false);
    // Without developer mode a stale off switch is ignored.
    expect(isPro({ pro: true, devPro: false }, NOW)).toBe(true);
  });

  it('keeps Pro from a server with no end date on', () => {
    const access = accessFromServer({ pro: true, until: null, plan: null, trialing: false }, free);
    expect(isPro(access, NOW)).toBe(true);
    expect(isPro(accessFromServer({ pro: false, until: null, plan: null, trialing: false }, { pro: true }), NOW)).toBe(false);
  });
});

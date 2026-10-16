import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureReferral, clearPendingReferral, pendingReferral, shareUrl } from '../src/state/referral';

const store = new Map<string, string>();
let replaced: string | undefined;

beforeEach(() => {
  store.clear();
  replaced = undefined;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('history', { state: null, replaceState: (_s: unknown, _t: string, url: string) => void (replaced = url) });
  vi.stubGlobal('location', { origin: 'https://zacbarron.github.io', href: 'https://zacbarron.github.io/Felt/' });
});

describe('invite links', () => {
  it('keeps the code from a link and tidies the address', () => {
    expect(captureReferral('https://zacbarron.github.io/Felt/?ref=ab12cd3&daily=4')).toBe('AB12CD3');
    expect(pendingReferral()).toBe('AB12CD3');
    expect(replaced).toBe('/Felt/?daily=4');
    clearPendingReferral();
    expect(pendingReferral()).toBeUndefined();
  });

  it('ignores junk and your own code', () => {
    expect(captureReferral('https://zacbarron.github.io/Felt/?ref=<script>')).toBeUndefined();
    store.set('felt.ref.mine.v1', 'MINE123');
    captureReferral('https://zacbarron.github.io/Felt/?ref=MINE123');
    expect(pendingReferral()).toBeUndefined();
  });

  it('adds your code to every shared link', () => {
    expect(shareUrl()).not.toContain('ref=');
    store.set('felt.ref.mine.v1', 'MINE123');
    const url = new URL(shareUrl('play', { daily: '12' }));
    expect(url.pathname.endsWith('/play')).toBe(true);
    expect(url.searchParams.get('ref')).toBe('MINE123');
    expect(url.searchParams.get('daily')).toBe('12');
  });
});

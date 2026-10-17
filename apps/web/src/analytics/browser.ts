import { type Attribution, ATTRIBUTION_KEYS, cleanTag, hashMessage, inAppBrowser, platformOf } from '@felt/core/analytics';
import type { Analytics, AnalyticsEnv, KeyValueStore } from './client';

/**
 * The real browser behind the analytics queue, shared by the site and the
 * app. Nothing here reads cookies, fingerprints the device or sends the user
 * agent: the platform and the in-app flag are worked out here and only the
 * result is sent.
 */

const safeStore = (pick: () => Storage): KeyValueStore | null => {
  try {
    const s = pick();
    const probe = 'felt.probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
};

/** 16 random bytes as base64url: 22 characters. */
export function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The first touch the site stored (felt.attribution.v1). The app reads the same key: one origin. */
export const ATTRIBUTION_KEY = 'felt.attribution.v1';

export function storedAttribution(storage: KeyValueStore | null): Attribution | undefined {
  try {
    const raw = JSON.parse(storage?.getItem(ATTRIBUTION_KEY) ?? 'null') as Record<string, unknown> | null;
    if (!raw) return undefined;
    const out: Attribution = {};
    for (const k of [...ATTRIBUTION_KEYS, 'landing', 'referrer'] as const) {
      const v = cleanTag(raw[k]);
      if (v) out[k] = v;
    }
    return out;
  } catch {
    return undefined;
  }
}

export const isStandalone = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
};

export function browserEnv(): AnalyticsEnv {
  const storage = safeStore(() => window.localStorage);
  const session = safeStore(() => window.sessionStorage);
  const platform = platformOf(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  const inApp = inAppBrowser(navigator.userAgent);
  return {
    storage,
    session,
    now: () => Date.now(),
    newId: randomId,
    async send(url, body, beacon) {
      if (beacon && typeof navigator.sendBeacon === 'function') {
        // text/plain keeps it a simple request: no preflight, no cookies needed.
        return navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
      }
      try {
        // no-cors: the server reads it, the page never needs the answer.
        await fetch(url, {
          method: 'POST',
          body,
          mode: 'no-cors',
          credentials: 'omit',
          keepalive: body.length < 60_000,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        });
        return true;
      } catch {
        return false;
      }
    },
    signals: () => {
      const n = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
      const w = window as Window & { doNotTrack?: string };
      return { gpc: n.globalPrivacyControl === true, dnt: n.doNotTrack === '1' || w.doNotTrack === '1' || n.msDoNotTrack === '1' };
    },
    context: () => ({ platform, in_app: inApp, standalone: isStandalone(), tzo: -new Date().getTimezoneOffset() }),
    attribution: () => storedAttribution(storage),
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (h) => window.clearTimeout(h as number),
  };
}

/** Sends the queue when the page hides or closes. Mobile Safari often skips unload, so both are used. */
export function flushOnHide(a: Analytics) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') a.hidden();
  });
  window.addEventListener('pagehide', () => a.hidden());
}

// Web vitals ----------------------------------------------------------------------------

type Metric = 'LCP' | 'CLS' | 'INP';
const THRESHOLDS: Record<Metric, [number, number]> = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500] };
export const vitalRating = (m: Metric, v: number) => (v <= THRESHOLDS[m][0] ? 'good' : v <= THRESHOLDS[m][1] ? 'needs_improvement' : 'poor');

/**
 * Largest contentful paint, layout shift and interaction delay for a
 * sample of page loads, reported once when the page first hides. INP here is
 * the slowest interaction seen, close to the official value for short visits.
 */
export function observeVitals(a: Analytics, sampleRate: number, path: () => string) {
  if (!a.enabled() || Math.random() >= sampleRate || typeof PerformanceObserver === 'undefined') return;
  let lcp = 0;
  let cls = 0;
  let session = 0;
  let sessionStart = 0;
  let sessionLast = 0;
  let inp = 0;
  const watch = (type: string, fn: (entries: PerformanceEntryList) => void, extra: Record<string, unknown> = {}) => {
    try {
      new PerformanceObserver((list) => fn(list.getEntries())).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
    } catch {
      // Not supported here: that metric is left out.
    }
  };
  watch('largest-contentful-paint', (es) => {
    for (const e of es) lcp = e.startTime;
  });
  watch('layout-shift', (es) => {
    for (const e of es as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      if (e.hadRecentInput) continue;
      // Shifts within 1 second of each other (and 5 seconds in all) form one window. CLS is the worst window.
      if (session && e.startTime - sessionLast < 1000 && e.startTime - sessionStart < 5000) session += e.value;
      else {
        session = e.value;
        sessionStart = e.startTime;
      }
      sessionLast = e.startTime;
      cls = Math.max(cls, session);
    }
  });
  watch(
    'event',
    (es) => {
      for (const e of es as (PerformanceEntry & { interactionId?: number })[]) if (e.interactionId) inp = Math.max(inp, e.duration);
    },
    { durationThreshold: 40 },
  );
  let sent = false;
  a.onHide(() => {
    if (sent) return;
    sent = true;
    const p = path();
    if (lcp) a.track('web_vital', { metric: 'LCP', value: Math.round(lcp), rating: vitalRating('LCP', lcp), path: p });
    a.track('web_vital', { metric: 'CLS', value: Math.round(cls * 1000) / 1000, rating: vitalRating('CLS', cls), path: p });
    if (inp) a.track('web_vital', { metric: 'INP', value: Math.round(inp), rating: vitalRating('INP', inp), path: p });
  });
}

// Errors ----------------------------------------------------------------------------------

/** Errors a page reports at most, so a loop cannot flood the queue. */
const MAX_ERRORS = 10;

/**
 * Unhandled errors and rejections, as a hash of the message and the error's
 * type. No stack and no message text leave the device: either could hold
 * the player's data.
 */
export function observeErrors(a: Analytics, route: () => string) {
  let count = 0;
  const report = (kind: 'error' | 'rejection', reason: unknown, fallback: string) => {
    if (count++ >= MAX_ERRORS) return;
    const name = reason instanceof Error ? reason.name : typeof reason;
    const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : fallback;
    a.track('error', { kind, name: cleanTag(name, 40) ?? 'unknown', hash: hashMessage(message), route: route() });
  };
  window.addEventListener('error', (e) => {
    // Failed images and scripts fire plain events, not ErrorEvents. Those are left out.
    if (!(e instanceof ErrorEvent)) return;
    report('error', e.error, e.message ?? '');
  });
  window.addEventListener('unhandledrejection', (e) => report('rejection', e.reason, ''));
}

/** The first part of a path, as a coarse route: /learn/basics/odds becomes learn. */
export function routeOf(pathname: string, base = '/'): string {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return cleanTag(rest.replace(/^\/+/, '').split('/')[0] || 'home', 40) ?? 'home';
}

// Public config and feature flags ------------------------------------------------------------

/** The server's public flags, cached here so the next start (and the site's head script) can use them. */
export const CONFIG_KEY = 'felt.config.v1';

export type FlagValue = boolean | number | string | { percent: number };
export interface PublicConfig {
  flags: Record<string, FlagValue>;
  /** When this copy was fetched, in ms. */
  at?: number;
}

export function cachedConfig(storage: KeyValueStore | null): PublicConfig | undefined {
  try {
    const c = JSON.parse(storage?.getItem(CONFIG_KEY) ?? 'null') as PublicConfig | null;
    return c && typeof c.flags === 'object' && c.flags ? c : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetches GET /api/config and caches it. Never throws: with no server the
 * cached copy (or nothing, meaning the safe defaults) is used.
 */
export async function refreshConfig(apiBase: string, storage: KeyValueStore | null, timeoutMs = 4000): Promise<PublicConfig | undefined> {
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase}/api/config`, { signal: controller?.signal, credentials: 'omit' });
    if (!res.ok) return cachedConfig(storage);
    const body = (await res.json()) as PublicConfig;
    if (!body || typeof body.flags !== 'object') return cachedConfig(storage);
    const next = { flags: body.flags, at: Date.now() };
    try {
      storage?.setItem(CONFIG_KEY, JSON.stringify(next));
    } catch {
      // Not cached: the defaults apply next time.
    }
    return next;
  } catch {
    return cachedConfig(storage);
  } finally {
    clearTimeout(timer);
  }
}

/** A flag's value, or the fallback when the server never said or said something of another kind. */
export function flag<T extends boolean | number | string>(config: PublicConfig | undefined, key: string, fallback: T): T {
  const v = config?.flags[key];
  return typeof v === typeof fallback ? (v as T) : fallback;
}

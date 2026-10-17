import type { ClientEventName, EventProps } from '@felt/core/analytics';
import { browserEnv, cachedConfig, flag, flushOnHide, isStandalone, observeErrors, observeVitals, refreshConfig, routeOf } from '../analytics/browser';
import { type Analytics, createAnalytics, KEYS } from '../analytics/client';
import { api, apiBase, currentSession } from './api';
import { db } from './db';

/**
 * Product events. Each one goes to two places:
 *
 * - The local log on this device (developer mode can export it).
 * - Aced's own server, anonymously, unless the player turned off "Share
 *   anonymous usage" or the browser sends Global Privacy Control or Do Not
 *   Track. See docs/ANALYTICS.md for every event and what it carries.
 *
 * track() is typed against the event dictionary in @felt/core/analytics,
 * so a wrong name or property does not compile.
 */

let client: Analytics | undefined;

/** The analytics queue, once the app has started it (never in tests). */
export const analytics = () => client;

export function track<N extends ClientEventName>(name: N, props?: EventProps<N>) {
  void db.events.add({ at: new Date(), name, props: props as Record<string, string | number | boolean | undefined> }).catch(() => {
    // Storage can be blocked; measurement never breaks the app.
  });
  client?.track(name, props);
}

export async function exportEvents(): Promise<string> {
  return JSON.stringify(await db.events.orderBy('at').toArray(), null, 2);
}

const DAY_KEY = 'felt.analytics.day.v1';
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** One ping per local day the app is open, so a phone that keeps Aced open for days still counts each day. */
function dailyPing() {
  try {
    const today = localDate();
    if (localStorage.getItem(DAY_KEY) === today) return;
    localStorage.setItem(DAY_KEY, today);
  } catch {
    return;
  }
  track('daily_active', { standalone: isStandalone() });
}

/**
 * How this visit started: a push or email link (?n=push.reminder), the
 * marketing site, a shared link, or straight in. The n tag is removed from
 * the address afterwards.
 */
export function arrival(url: URL, referrer: string): { via: string; channel?: string; kind?: string } {
  const n = url.searchParams.get('n');
  if (n && /^[a-z]+\.[a-z0-9_-]+$/.test(n)) {
    const [channel, kind] = n.split('.');
    return { via: channel, channel, kind };
  }
  if (url.searchParams.has('daily') || url.searchParams.has('invite')) return { via: 'share' };
  try {
    if (referrer && new URL(referrer).origin === url.origin) return { via: 'site' };
  } catch {
    // An odd referrer counts as direct.
  }
  return { via: referrer ? 'link' : 'direct' };
}

/** Starts analytics for the app. Called once from main.tsx. */
export function startAnalytics() {
  if (client || typeof window === 'undefined') return;
  const env = browserEnv();
  // The server's flags, from the last visit. Fresh ones are fetched for next time.
  const config = cachedConfig(env.storage);
  void refreshConfig(apiBase(), env.storage);
  // The owner can pause all collection from the console (analytics.enabled).
  if (!flag(config, 'analytics.enabled', true)) return;
  const returning = (() => {
    try {
      return !!localStorage.getItem(KEYS.install);
    } catch {
      return false;
    }
  })();
  client = createAnalytics({
    app: 'web',
    endpoint: `${apiBase()}/api/events`,
    env,
    warn: import.meta.env.DEV ? (m) => console.warn(m) : undefined,
  });
  const base = import.meta.env.BASE_URL ?? '/';
  const route = () => routeOf(location.pathname, base);
  flushOnHide(client);
  observeErrors(client, route);
  observeVitals(client, flag(config, 'analytics.vitals_sample', 0.25), route);

  const url = new URL(location.href);
  const how = arrival(url, document.referrer);
  track('app_open', { standalone: isStandalone(), path: route(), via: how.via, returning });
  if (how.channel) {
    track('notification_opened', { channel: how.channel, kind: how.kind });
    url.searchParams.delete('n');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  dailyPing();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') dailyPing();
  });
  // A player already signed in on an older build: make sure this install is linked.
  if (currentSession()) void linkInstall(false);
}

/** Whether this device shares anonymous usage (the Settings switch). */
export function usageSharing(): { on: boolean; blocked: 'gpc' | 'dnt' | null } {
  const c = client ?? createAnalytics({ app: 'web', endpoint: '', env: browserEnv() });
  return { on: c.optedIn(), blocked: c.blocked() };
}

/** The Settings switch. Off deletes what is waiting and asks the server to delete what this device sent. */
export function setUsageSharing(on: boolean) {
  const c = client ?? createAnalytics({ app: 'web', endpoint: `${apiBase()}/api/events`, env: browserEnv() });
  c.setEnabled(on);
}

/**
 * Links this install to the signed in account on the server, so a purchase
 * can be traced to the link that brought the player. Only while sharing is
 * on. Best effort.
 */
export async function linkInstall(created: boolean) {
  const install = client?.installId();
  if (!install || !currentSession()) return;
  // Make sure the server has heard of this install first.
  await client?.flush().catch(() => undefined);
  await api('/events/link', { body: { install, created } }).catch(() => undefined);
}

import {
  type App,
  type Attribution,
  type Batch,
  type BatchContext,
  cleanProps,
  type ClientEventName,
  type EventProps,
  MAX_BATCH,
} from '@felt/core/analytics';

/**
 * The analytics queue, shared by the site and the app. Cookieless and
 * anonymous: a random install id in localStorage, a visit id in
 * sessionStorage, coarse device fields worked out here, and events sent in
 * small batches to Aced's own server. See docs/ANALYTICS.md.
 *
 * It never blocks the page and never throws. Failures are retried a few
 * times, then dropped. Global Privacy Control, Do Not Track and the
 * "Share anonymous usage" switch each stop it completely.
 *
 * Everything that touches the browser comes in through `AnalyticsEnv`, so
 * the queue is tested without one (apps/web/test/analytics.test.ts).
 */

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface AnalyticsEnv {
  /** localStorage, or null when it is blocked. */
  storage: KeyValueStore | null;
  /** sessionStorage, or null when it is blocked. */
  session: KeyValueStore | null;
  now(): number;
  /** A random id, 16 to 40 characters of A to Z, a to z, 0 to 9, _ and -. */
  newId(): string;
  /**
   * Posts a batch. `beacon` is set while the page is going away. Resolves to
   * true when the batch left the device (or was handed to the browser).
   */
  send(url: string, body: string, beacon: boolean): Promise<boolean>;
  /** Global Privacy Control and Do Not Track, as the browser reports them. */
  signals(): { gpc: boolean; dnt: boolean };
  context(): BatchContext;
  /** First touch attribution, if the site stored any. */
  attribution(): Attribution | undefined;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
}

export interface AnalyticsOptions {
  app: App;
  /** The full address of POST /api/events. */
  endpoint: string;
  env: AnalyticsEnv;
  /** How long events wait before a batch goes. */
  flushMs?: number;
  /** Events kept while the server cannot be reached. Older ones are dropped first. */
  maxQueue?: number;
  /** Tries per batch before it is dropped. */
  maxTries?: number;
  /** Warn about properties the schema drops (development builds). */
  warn?: (message: string) => void;
}

interface Queued {
  name: string;
  at: number;
  props: Record<string, string | number | boolean>;
  /** The visit the event belongs to. */
  s: string;
}

export const KEYS = {
  install: 'felt.anon.v1',
  prefs: 'felt.analytics.v1',
  queue: 'felt.analytics.queue.v1',
  exposures: 'felt.exp.v1',
  down: 'felt.analytics.down.v1',
  visit: 'felt.visit.v1',
} as const;

/** A visit ends after this long without an event. */
export const VISIT_IDLE_MS = 30 * 60_000;
/** The install id is replaced after about 13 months, so no id lives longer than the data it labels. */
export const INSTALL_MAX_AGE_MS = 395 * 86_400_000;

export type Blocked = 'gpc' | 'dnt' | null;

export interface Analytics {
  track<N extends ClientEventName>(name: N, props?: EventProps<N>): void;
  /** Sends what is queued now. With `beacon`, uses sendBeacon (the page is closing). */
  flush(beacon?: boolean): Promise<void>;
  /** Runs `fn` just before the queue is sent as the page hides (web vitals report here). */
  onHide(fn: () => void): void;
  /** Call when the page hides or closes. */
  hidden(): void;
  /** On unless the browser asks not to track or the player turned it off. */
  enabled(): boolean;
  /** Why it is off by the browser's request, if it is. */
  blocked(): Blocked;
  /** The player's switch. Off deletes the queue, forgets the install id and asks the server to delete it. */
  setEnabled(on: boolean): void;
  /** The player's choice, ignoring the browser signals. */
  optedIn(): boolean;
  installId(): string | undefined;
  visitId(): string;
  /** Logs an experiment exposure once per install and test. */
  exposure(exp: string, variant: string): void;
  /** Events waiting to go. */
  pending(): number;
  /** True when the last send failed: experiments then show the control. */
  serverDown(): boolean;
}

const parse = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export function createAnalytics(opts: AnalyticsOptions): Analytics {
  const { env, app, endpoint } = opts;
  const flushMs = opts.flushMs ?? 4000;
  const maxQueue = opts.maxQueue ?? 200;
  const maxTries = opts.maxTries ?? 3;

  const get = (k: string) => {
    try {
      return env.storage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  };
  const set = (k: string, v: string) => {
    try {
      env.storage?.setItem(k, v);
    } catch {
      // Full or blocked: measurement never breaks the page.
    }
  };
  const del = (k: string) => {
    try {
      env.storage?.removeItem(k);
    } catch {
      // Blocked storage has nothing to delete.
    }
  };

  let queue: Queued[] = parse<Queued[]>(get(KEYS.queue), []).filter((q) => q && typeof q.name === 'string' && typeof q.s === 'string');
  let timer: unknown;
  let backoff = flushMs;
  let sending = false;
  /** The batch being sent or waiting to be tried again. A page close resends it with the same id. */
  let current: { id: string; events: Queued[]; tries: number } | undefined;
  const hooks: (() => void)[] = [];
  let memoryVisit: { id: string; last: number } | undefined;
  let memoryInstall: string | undefined;

  const blocked = (): Blocked => {
    try {
      const s = env.signals();
      return s.gpc ? 'gpc' : s.dnt ? 'dnt' : null;
    } catch {
      return null;
    }
  };
  const optedIn = () => parse<{ off?: boolean }>(get(KEYS.prefs), {}).off !== true;
  const enabled = () => !blocked() && optedIn();

  const save = () => (queue.length ? set(KEYS.queue, JSON.stringify(queue)) : del(KEYS.queue));

  const installId = (create: boolean): string | undefined => {
    const saved = parse<{ id?: string; at?: number } | null>(get(KEYS.install), null);
    if (saved?.id && typeof saved.at === 'number' && env.now() - saved.at < INSTALL_MAX_AGE_MS) return saved.id;
    if (memoryInstall) return memoryInstall;
    if (!create) return undefined;
    const id = env.newId();
    set(KEYS.install, JSON.stringify({ id, at: env.now() }));
    // A new id starts its tests fresh.
    del(KEYS.exposures);
    // Without storage the id lasts for this page only.
    if (!get(KEYS.install)) memoryInstall = id;
    return id;
  };

  const visitId = (): string => {
    const now = env.now();
    let v: { id: string; last: number } | undefined;
    try {
      v = parse<{ id: string; last: number } | undefined>(env.session?.getItem(KEYS.visit), undefined);
    } catch {
      v = undefined;
    }
    v ??= memoryVisit;
    v = !v?.id || now - v.last > VISIT_IDLE_MS ? { id: env.newId(), last: now } : { ...v, last: now };
    memoryVisit = v;
    try {
      env.session?.setItem(KEYS.visit, JSON.stringify(v));
    } catch {
      // The id lives in memory instead.
    }
    return v.id;
  };

  const schedule = (ms: number) => {
    if (timer !== undefined) return;
    timer = env.setTimer(() => {
      timer = undefined;
      void flush(false);
    }, ms);
  };
  const cancelTimer = () => {
    if (timer !== undefined) env.clearTimer(timer);
    timer = undefined;
  };

  const body = (id: string, events: Queued[], install: string): string => {
    const batch: Batch = {
      v: 1,
      install,
      session: events[0].s,
      batch: id,
      app,
      ctx: env.context(),
      attr: env.attribution(),
      events: events.map((e) => ({ name: e.name, at: e.at, props: e.props })),
    };
    return JSON.stringify(batch);
  };

  /** The next batch: up to MAX_BATCH events of one visit, oldest first. */
  const nextBatch = (): Queued[] => {
    const out: Queued[] = [];
    for (const q of queue) {
      if (q.s !== queue[0].s || out.length >= MAX_BATCH) break;
      out.push(q);
    }
    return out;
  };

  const remove = (events: Queued[]) => {
    const gone = new Set(events);
    queue = queue.filter((q) => !gone.has(q));
  };

  const trySend = async (payload: string, beacon: boolean) => {
    try {
      return await env.send(endpoint, payload, beacon);
    } catch {
      return false;
    }
  };

  async function flush(beacon = false): Promise<void> {
    if (!enabled()) {
      queue = [];
      current = undefined;
      save();
      return;
    }
    const install = installId(true);
    if (!install) return;
    if (beacon) {
      cancelTimer();
      // The page is closing. Hand everything to the browser, the batch in flight with its own id.
      if (current) {
        void trySend(body(current.id, current.events, install), true);
        remove(current.events);
        current = undefined;
      }
      while (queue.length) {
        const events = nextBatch();
        if (!(await trySend(body(env.newId(), events, install), true))) break;
        remove(events);
      }
      // Whatever the browser would not take waits in storage for the next visit.
      save();
      return;
    }
    if (sending) return;
    sending = true;
    cancelTimer();
    try {
      while (queue.length || current) {
        current ??= { id: env.newId(), events: nextBatch(), tries: 0 };
        const batch = current;
        const ok = await trySend(body(batch.id, batch.events, install), false);
        if (current !== batch) break; // Sent by a page close or switched off meanwhile.
        if (ok) {
          del(KEYS.down);
          backoff = flushMs;
          remove(batch.events);
          current = undefined;
          continue;
        }
        set(KEYS.down, String(env.now()));
        batch.tries++;
        if (batch.tries >= maxTries) {
          // Dropped after a few tries. Analytics is never worth a player's battery.
          remove(batch.events);
          current = undefined;
        }
        backoff = Math.min(backoff * 2, 60_000);
        schedule(backoff);
        break;
      }
    } finally {
      sending = false;
      save();
    }
  }

  const api: Analytics = {
    track(name, props) {
      if (!enabled()) return;
      const cleaned = cleanProps(name, props);
      if (cleaned.dropped && opts.warn) opts.warn(`Analytics dropped ${cleaned.dropped} of the properties of ${name}.`);
      queue.push({ name, at: env.now(), props: cleaned.props, s: visitId() });
      if (queue.length > maxQueue) {
        const keep = new Set(current?.events ?? []);
        const extra = queue.length - maxQueue;
        let cut = 0;
        queue = queue.filter((q) => keep.has(q) || cut++ >= extra);
      }
      save();
      if (!sending) schedule(flushMs);
    },
    flush,
    onHide(fn) {
      hooks.push(fn);
    },
    hidden() {
      for (const fn of hooks) {
        try {
          fn();
        } catch {
          // A broken hook never stops the flush.
        }
      }
      void flush(true);
    },
    enabled,
    blocked,
    optedIn,
    setEnabled(on) {
      if (on) {
        del(KEYS.prefs);
        return;
      }
      const old = installId(false);
      set(KEYS.prefs, JSON.stringify({ off: true }));
      queue = [];
      current = undefined;
      cancelTimer();
      for (const k of [KEYS.queue, KEYS.install, KEYS.exposures, KEYS.down]) del(k);
      memoryInstall = undefined;
      // Ask the server to delete what this device sent. Best effort.
      if (old) void env.send(`${endpoint}/forget`, JSON.stringify({ install: old }), false).catch(() => false);
    },
    installId: () => (enabled() ? installId(true) : undefined),
    visitId,
    exposure(exp, variant) {
      if (!enabled()) return;
      installId(true);
      const seen = parse<Record<string, string>>(get(KEYS.exposures), {});
      if (seen[exp] === variant) return;
      seen[exp] = variant;
      set(KEYS.exposures, JSON.stringify(seen));
      api.track('experiment_exposed', { exp, variant });
    },
    pending: () => queue.length,
    serverDown: () => !!get(KEYS.down),
  };
  return api;
}

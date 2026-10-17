import { describe, expect, it } from 'vitest';
import { parseBatch } from '@felt/core/analytics';
import { type AnalyticsEnv, createAnalytics, INSTALL_MAX_AGE_MS, KEYS, VISIT_IDLE_MS } from '../src/analytics/client';
import { arrival } from '../src/state/events';
import { routeOf, storedAttribution, vitalRating } from '../src/analytics/browser';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

/** A fake browser: a clock, timers run by hand, and a network that records what was sent. */
function fakeEnv(opts: { gpc?: boolean; dnt?: boolean; online?: boolean } = {}) {
  let clock = Date.parse('2026-10-17T12:00:00Z');
  let ids = 0;
  const timers: { fn: () => void; at: number }[] = [];
  const sent: { url: string; body: string; beacon: boolean }[] = [];
  const state = { online: opts.online ?? true, beaconOk: true, gpc: !!opts.gpc, dnt: !!opts.dnt };
  const storage = memoryStore();
  const session = memoryStore();
  const env: AnalyticsEnv = {
    storage,
    session,
    now: () => clock,
    newId: () => `id-${String(++ids).padStart(14, '0')}`,
    send: async (url, body, beacon) => {
      if (beacon) {
        sent.push({ url, body, beacon });
        return state.beaconOk;
      }
      if (!state.online) return false;
      sent.push({ url, body, beacon });
      return true;
    },
    signals: () => ({ gpc: state.gpc, dnt: state.dnt }),
    context: () => ({ platform: 'ios', in_app: false, standalone: true, tzo: -240 }),
    attribution: () => ({ utm_source: 'mike' }),
    setTimer: (fn, ms) => {
      const t = { fn, at: clock + ms };
      timers.push(t);
      return t;
    },
    clearTimer: (t) => {
      const i = timers.indexOf(t as (typeof timers)[number]);
      if (i >= 0) timers.splice(i, 1);
    },
  };
  /** Moves the clock and runs the timers that are due. */
  const tick = async (ms: number) => {
    clock += ms;
    for (const t of [...timers].sort((a, b) => a.at - b.at)) {
      if (t.at > clock) continue;
      timers.splice(timers.indexOf(t), 1);
      t.fn();
      await new Promise((r) => setTimeout(r, 0));
    }
    await new Promise((r) => setTimeout(r, 0));
  };
  const batches = () => sent.filter((s) => !s.url.endsWith('/forget')).map((s) => JSON.parse(s.body));
  return { env, sent, state, storage, session, tick, batches, timers };
}

const make = (f: ReturnType<typeof fakeEnv>, extra: Partial<Parameters<typeof createAnalytics>[0]> = {}) =>
  createAnalytics({ app: 'web', endpoint: 'https://api.test/api/events', env: f.env, flushMs: 1000, ...extra });

describe('the analytics queue', () => {
  it('batches events and sends them after a short wait', async () => {
    const f = fakeEnv();
    const a = make(f);
    a.track('app_open', { standalone: true, via: 'direct' });
    a.track('lesson_started', { lesson: 'basics/odds' });
    expect(f.sent).toHaveLength(0);
    await f.tick(1000);
    const [b] = f.batches();
    expect(f.batches()).toHaveLength(1);
    expect(b.events.map((e: { name: string }) => e.name)).toEqual(['app_open', 'lesson_started']);
    expect(b.app).toBe('web');
    expect(b.attr).toEqual({ utm_source: 'mike' });
    expect(a.pending()).toBe(0);
  });

  it('sends what the server accepts', async () => {
    const f = fakeEnv();
    const a = make(f);
    a.track('answer_graded', { source: 'lesson', correct: true, score: 1 });
    await f.tick(1000);
    const parsed = parseBatch(f.batches()[0], Date.parse('2026-10-17T12:00:01Z'))!;
    expect(parsed.events).toHaveLength(1);
    expect(parsed.rejected).toBe(0);
  });

  it('keeps the same install id, and a new visit after 30 idle minutes', async () => {
    const f = fakeEnv();
    const a = make(f);
    a.track('move_next' as never);
    a.track('daily_active');
    await f.tick(1000);
    const first = f.batches()[0];
    await f.tick(VISIT_IDLE_MS + 1);
    a.track('daily_active');
    await f.tick(1000);
    const second = f.batches().at(-1);
    expect(second.install).toBe(first.install);
    expect(second.session).not.toBe(first.session);
  });

  it('never mixes two visits in one batch', async () => {
    const f = fakeEnv();
    const a = make(f, { flushMs: VISIT_IDLE_MS * 2 });
    a.track('daily_active');
    await f.tick(VISIT_IDLE_MS + 1);
    a.track('daily_active');
    await a.flush();
    await f.tick(0);
    const sessions = f.batches().map((b) => b.session);
    expect(new Set(sessions).size).toBe(2);
  });

  it('sends at most 50 events a batch', async () => {
    const f = fakeEnv();
    const a = make(f);
    for (let i = 0; i < 120; i++) a.track('daily_active');
    await f.tick(1000);
    expect(f.batches().map((b) => b.events.length)).toEqual([50, 50, 20]);
  });

  it('retries with the same batch id, then drops it after 3 tries', async () => {
    const f = fakeEnv({ online: false });
    const a = make(f);
    a.track('daily_active');
    await f.tick(1000);
    expect(a.serverDown()).toBe(true);
    expect(a.pending()).toBe(1);
    await f.tick(2000);
    await f.tick(4000);
    expect(a.pending()).toBe(0);
    expect(f.sent).toHaveLength(0);
  });

  it('recovers when the network comes back and clears the down flag', async () => {
    const f = fakeEnv({ online: false });
    const a = make(f);
    a.track('daily_active');
    await f.tick(1000);
    f.state.online = true;
    await f.tick(2000);
    expect(f.batches()).toHaveLength(1);
    expect(a.serverDown()).toBe(false);
  });

  it('caps the queue and drops the oldest first', () => {
    const f = fakeEnv({ online: false });
    const a = make(f, { maxQueue: 5 });
    for (let i = 0; i < 8; i++) a.track('faq_opened' as never, { q: i } as never);
    expect(a.pending()).toBe(5);
    const kept = JSON.parse(f.storage.getItem(KEYS.queue)!) as { props: { q: number } }[];
    expect(kept.map((k) => k.props.q)).toEqual([3, 4, 5, 6, 7]);
  });

  it('keeps the queue in storage so a reload sends it', async () => {
    const f = fakeEnv({ online: false });
    make(f).track('daily_active');
    f.state.online = true;
    const b = make(f);
    expect(b.pending()).toBe(1);
    await b.flush();
    expect(f.batches()).toHaveLength(1);
  });

  it('hands everything to sendBeacon when the page hides, and runs the hooks first', async () => {
    const f = fakeEnv();
    const a = make(f);
    a.onHide(() => a.track('web_vital', { metric: 'CLS', value: 0.01 }));
    a.track('daily_active');
    a.hidden();
    await f.tick(0);
    expect(f.sent.every((s) => s.beacon)).toBe(true);
    expect(f.batches()[0].events.map((e: { name: string }) => e.name)).toEqual(['daily_active', 'web_vital']);
    expect(a.pending()).toBe(0);
    expect(f.storage.getItem(KEYS.queue)).toBeNull();
  });

  it('keeps events in storage when the browser refuses the beacon', async () => {
    const f = fakeEnv();
    f.state.beaconOk = false;
    const a = make(f);
    a.track('daily_active');
    a.hidden();
    await f.tick(0);
    expect(a.pending()).toBe(1);
    expect(f.storage.getItem(KEYS.queue)).not.toBeNull();
  });

  it('drops properties the schema does not allow and says so in development', async () => {
    const f = fakeEnv();
    const warnings: string[] = [];
    const a = make(f, { warn: (m) => warnings.push(m) });
    a.track('cta_click', { cta: 'start free', pos: 'hero' });
    await f.tick(1000);
    expect(f.batches()[0].events[0].props).toEqual({ pos: 'hero' });
    expect(warnings).toHaveLength(1);
  });

  it('logs an experiment exposure once', async () => {
    const f = fakeEnv();
    const a = make(f);
    a.exposure('hero_cta', 'daily');
    a.exposure('hero_cta', 'daily');
    await f.tick(1000);
    expect(f.batches()[0].events).toHaveLength(1);
    expect(f.batches()[0].events[0]).toMatchObject({ name: 'experiment_exposed', props: { exp: 'hero_cta', variant: 'daily' } });
  });

  it('replaces the install id after about 13 months', async () => {
    const f = fakeEnv();
    const a = make(f);
    const first = a.installId();
    f.storage.setItem(KEYS.install, JSON.stringify({ id: first, at: Date.parse('2026-10-17T12:00:00Z') - INSTALL_MAX_AGE_MS - 1 }));
    expect(a.installId()).not.toBe(first);
  });
});

describe('privacy signals and the off switch', () => {
  it('sends nothing and makes no id under Global Privacy Control', async () => {
    const f = fakeEnv({ gpc: true });
    const a = make(f);
    a.track('daily_active');
    a.exposure('hero_cta', 'daily');
    a.hidden();
    await f.tick(5000);
    expect(f.sent).toHaveLength(0);
    expect(f.storage.getItem(KEYS.install)).toBeNull();
    expect(a.enabled()).toBe(false);
    expect(a.blocked()).toBe('gpc');
    expect(a.installId()).toBeUndefined();
  });

  it('sends nothing under Do Not Track', async () => {
    const f = fakeEnv({ dnt: true });
    const a = make(f);
    a.track('daily_active');
    await f.tick(5000);
    expect(f.sent).toHaveLength(0);
    expect(a.blocked()).toBe('dnt');
  });

  it('deletes a queue made before the browser started asking', async () => {
    const f = fakeEnv({ online: false });
    make(f).track('daily_active');
    f.state.gpc = true;
    const b = make(f);
    await b.flush();
    expect(f.storage.getItem(KEYS.queue)).toBeNull();
  });

  it('turning it off deletes the queue and the id, and asks the server to forget', async () => {
    const f = fakeEnv({ online: false });
    const a = make(f);
    a.track('daily_active');
    a.exposure('hero_cta', 'daily');
    const id = a.installId();
    f.state.online = true;
    a.setEnabled(false);
    expect(a.pending()).toBe(0);
    for (const k of [KEYS.queue, KEYS.install, KEYS.exposures]) expect(f.storage.getItem(k)).toBeNull();
    const forget = f.sent.find((s) => s.url.endsWith('/events/forget'));
    expect(JSON.parse(forget!.body)).toEqual({ install: id });
    a.track('daily_active');
    await f.tick(5000);
    expect(f.batches()).toHaveLength(0);
    expect(a.optedIn()).toBe(false);
  });

  it('turning it back on starts a fresh id', async () => {
    const f = fakeEnv();
    const a = make(f);
    const before = a.installId();
    a.setEnabled(false);
    a.setEnabled(true);
    a.track('daily_active');
    await f.tick(1000);
    expect(f.batches()[0].install).not.toBe(before);
  });
});

describe('helpers', () => {
  it('tells how a visit started', () => {
    expect(arrival(new URL('https://acedpoker.app/app/?n=push.reminder'), '')).toEqual({ via: 'push', channel: 'push', kind: 'reminder' });
    expect(arrival(new URL('https://acedpoker.app/app/?n=email.weekly-digest'), '')).toMatchObject({ channel: 'email', kind: 'weekly-digest' });
    expect(arrival(new URL('https://acedpoker.app/app/daily?daily=12'), '')).toEqual({ via: 'share' });
    expect(arrival(new URL('https://acedpoker.app/app/'), 'https://acedpoker.app/')).toEqual({ via: 'site' });
    expect(arrival(new URL('https://acedpoker.app/app/'), 'https://t.co/x')).toEqual({ via: 'link' });
    expect(arrival(new URL('https://acedpoker.app/app/'), '')).toEqual({ via: 'direct' });
    expect(arrival(new URL('https://acedpoker.app/app/?n=bad tag'), '')).toEqual({ via: 'direct' });
  });

  it('reduces a path to a coarse route', () => {
    expect(routeOf('/app/learn/basics/odds', '/app/')).toBe('learn');
    expect(routeOf('/app/', '/app/')).toBe('home');
    expect(routeOf('/daily')).toBe('daily');
  });

  it('reads first touch attribution, cleaned', () => {
    const s = memoryStore();
    s.setItem('felt.attribution.v1', JSON.stringify({ utm_source: 'Mike Poker', loc: 'bellagio', email: 'x@y.z', at: 1 }));
    expect(storedAttribution(s)).toEqual({ utm_source: 'mike_poker', loc: 'bellagio' });
    expect(storedAttribution(memoryStore())).toBeUndefined();
  });

  it('rates web vitals by the published thresholds', () => {
    expect(vitalRating('LCP', 2400)).toBe('good');
    expect(vitalRating('LCP', 3000)).toBe('needs_improvement');
    expect(vitalRating('INP', 600)).toBe('poor');
    expect(vitalRating('CLS', 0.05)).toBe('good');
  });
});

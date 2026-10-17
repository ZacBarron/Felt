import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { assign, EXPERIMENTS } from '@felt/core/analytics';
import { describe, expect, it } from 'vitest';
import { storeFirstTouch, variantTag } from '../src/analytics';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script data-ab>([\s\S]*?)<\/script>/)![1];

/** Runs the head script with a fake page and returns what it set. */
function run(opts: { store?: Record<string, string>; platform?: string; gpc?: boolean; dnt?: string } = {}) {
  const store: Record<string, string> = { ...(opts.store ?? {}) };
  const attrs: Record<string, string> = {};
  const window: Record<string, unknown> = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => void (store[k] = v),
      removeItem: (k: string) => void delete store[k],
    },
  };
  const document = { documentElement: { dataset: { platform: opts.platform ?? 'ios' }, setAttribute: (k: string, v: string) => void (attrs[k] = v) } };
  runInNewContext(script, {
    window,
    document,
    navigator: { globalPrivacyControl: opts.gpc, doNotTrack: opts.dnt },
    crypto: { getRandomValues: (b: Uint8Array) => b.fill(7) },
    btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
    JSON,
    Date,
    Math,
    Uint8Array,
    String,
  });
  return { store, attrs, ab: window.__acedAb as Record<string, string> };
}

const withId = (id: string, extra: Record<string, string> = {}) => ({ 'felt.anon.v1': JSON.stringify({ id, at: Date.now() }), ...extra });

describe('the inline A/B script', () => {
  it('has the same tests as core', () => {
    const tests = script.match(/tests = (\[\[.*?\]\]);/)?.[1];
    expect(tests).toBeDefined();
    const parsed = JSON.parse(tests!.replace(/'/g, '"')) as [string, [string, number][], number][];
    expect(parsed.map(([id, variants, phones]) => ({ id, variants: variants.map(([v, w]) => ({ id: v, weight: w })), phonesOnly: !!phones }))).toEqual(
      EXPERIMENTS.filter((e) => e.on).map((e) => ({ id: e.id, variants: e.variants, phonesOnly: !!e.phonesOnly })),
    );
  });

  it('buckets exactly like core for many installs', () => {
    for (let i = 0; i < 300; i++) {
      const id = `install-${i}-abcdefghij`;
      const { ab } = run({ store: withId(id) });
      for (const e of EXPERIMENTS) expect(ab[e.id]).toBe(assign(id, e));
    }
  });

  it('makes an install id on the first visit in the client format', () => {
    const { store, ab } = run();
    const saved = JSON.parse(store['felt.anon.v1']) as { id: string; at: number };
    expect(saved.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(ab.hero_cta).toBe(assign(saved.id, EXPERIMENTS[0]));
  });

  it('shows the control and makes no id under GPC, Do Not Track or the off switch', () => {
    for (const r of [run({ gpc: true }), run({ dnt: '1' }), run({ store: { 'felt.analytics.v1': '{"off":true}' } })]) {
      expect(r.ab).toEqual({});
      expect(r.store['felt.anon.v1']).toBeUndefined();
      expect(r.attrs['data-ab-hero-cta']).toBe('start');
      expect(r.attrs['data-ab-sticky-bar']).toBe('on');
    }
  });

  it('shows the control while the server is down or has turned a test off', () => {
    const down = run({ store: withId('install-down-abcdefgh', { 'felt.analytics.down.v1': '1' }) });
    expect(down.ab).toEqual({});
    const off = run({ store: withId('install-off-abcdefghi', { 'felt.config.v1': JSON.stringify({ flags: { 'exp.hero_cta': false } }) }) });
    expect(off.ab.hero_cta).toBeUndefined();
    expect(off.attrs['data-ab-hero-cta']).toBe('start');
    expect(off.ab.sticky_bar).toBeDefined();
  });

  it('keeps desktop out of phone only tests', () => {
    const { ab, attrs } = run({ store: withId('install-desk-abcdefgh'), platform: 'desktop' });
    expect(ab.sticky_bar).toBeUndefined();
    expect(attrs['data-ab-sticky-bar']).toBe('on');
    expect(ab.hero_cta).toBeDefined();
  });

  it('survives blocked storage', () => {
    const r = runInNewContext(`(function(){ try { ${script} } catch (e) { return 'threw'; } return window.__acedAb; })()`, {
      window: {
        get localStorage() {
          throw new Error('blocked');
        },
      },
      document: { documentElement: { dataset: { platform: 'ios' }, setAttribute: () => undefined } },
      navigator: {},
      JSON,
      Date,
      Math,
    });
    expect(r).toEqual({});
  });
});

describe('site analytics helpers', () => {
  it('tags the variants', () => {
    expect(variantTag({ hero_cta: 'daily', sticky_bar: 'off' })).toBe('hero_cta:daily,sticky_bar:off');
    expect(variantTag({})).toBeUndefined();
  });

  it('stores first touch once, cleaned, with the referring site', () => {
    const store: Record<string, string> = {};
    const s = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) };
    storeFirstTouch(s, new URL('https://acedpoker.app/?utm_source=Mike%20Poker&loc=Bellagio&x=1'), 'https://www.instagram.com/p/1');
    const first = JSON.parse(store['felt.attribution.v1']);
    expect(first).toMatchObject({ utm_source: 'mike_poker', loc: 'bellagio', referrer: 'instagram.com', landing: '/' });
    storeFirstTouch(s, new URL('https://acedpoker.app/?utm_source=other'), '');
    expect(JSON.parse(store['felt.attribution.v1']).utm_source).toBe('mike_poker');
  });
});

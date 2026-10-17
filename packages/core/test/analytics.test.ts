import { describe, expect, it } from 'vitest';
import {
  assign,
  bucket,
  cleanProps,
  cleanTag,
  EVENTS,
  EXPERIMENTS,
  fnv1a,
  hashMessage,
  inAppBrowser,
  isEventName,
  localDay,
  MAX_BATCH,
  MILESTONE_OF,
  MILESTONES,
  parseBatch,
  platformOf,
  referrerHost,
  sourceOf,
  validTag,
} from '../src/analytics';

const NOW = Date.parse('2026-10-17T12:00:00Z');
const ID = 'abcdefghijklmnop1234';
const batch = (over: Record<string, unknown> = {}, events: unknown[] = [{ name: 'page_view', at: NOW, props: { path: '/' } }]) => ({
  v: 1,
  install: ID,
  session: 'sessionsession123',
  batch: 'batchbatchbatch12',
  app: 'site',
  ctx: { platform: 'ios', in_app: true, standalone: false, tzo: -240 },
  events,
  ...over,
});

describe('event dictionary', () => {
  it('knows its own names and nothing else', () => {
    expect(isEventName('page_view')).toBe(true);
    expect(isEventName('toString')).toBe(false);
    expect(isEventName('made_up')).toBe(false);
  });

  it('uses snake case names and short property names', () => {
    for (const [name, spec] of Object.entries(EVENTS)) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
      for (const k of Object.keys(spec.props)) expect(k.length).toBeLessThanOrEqual(20);
    }
  });

  it('maps every milestone to an event that exists', () => {
    for (const [name, m] of Object.entries(MILESTONE_OF)) {
      expect(isEventName(name)).toBe(true);
      expect(MILESTONES).toContain(m);
    }
  });
});

describe('tags', () => {
  it('cleans free values into tags', () => {
    expect(cleanTag('  Poker Coach Mike ')).toBe('poker_coach_mike');
    expect(cleanTag('Ünïcode & <b>')).toBe('ncode__b');
    expect(cleanTag('x'.repeat(200))).toHaveLength(80);
    expect(cleanTag('   ')).toBeUndefined();
    expect(cleanTag(42)).toBeUndefined();
  });

  it('refuses anything that could hold a sentence or an email address', () => {
    expect(validTag('preflop/opens/utg')).toBe(true);
    expect(validTag('hero_cta:daily,sticky_bar:off')).toBe(true);
    expect(validTag('hello world')).toBe(false);
    expect(validTag('me@example.com')).toBe(false);
    expect(validTag('')).toBe(false);
    expect(validTag('x'.repeat(81))).toBe(false);
  });
});

describe('cleanProps', () => {
  it('keeps allowed properties of the right kind', () => {
    expect(cleanProps('cta_click', { cta: 'start_free', pos: 'hero' })).toEqual({ props: { cta: 'start_free', pos: 'hero' }, dropped: 0 });
    expect(cleanProps('faq_opened', { q: 3 })).toEqual({ props: { q: 3 }, dropped: 0 });
    expect(cleanProps('page_view', { in_app: true })).toEqual({ props: { in_app: true }, dropped: 0 });
  });

  it('drops unknown keys, wrong kinds and long or spaced strings', () => {
    const r = cleanProps('cta_click', { cta: 'start free', pos: 7, email: 'a@b.co', variant: 'x'.repeat(90) });
    expect(r.props).toEqual({});
    expect(r.dropped).toBe(4);
  });

  it('drops numbers that are not finite or are huge, and rounds the rest', () => {
    expect(cleanProps('web_vital', { value: Number.NaN }).dropped).toBe(1);
    expect(cleanProps('web_vital', { value: 1e12 }).dropped).toBe(1);
    expect(cleanProps('web_vital', { value: 0.123456789 }).props.value).toBe(0.1235);
  });

  it('skips undefined values and refuses arrays', () => {
    expect(cleanProps('cta_click', { cta: undefined })).toEqual({ props: {}, dropped: 0 });
    expect(cleanProps('cta_click', ['x']).dropped).toBe(1);
  });

  it('cannot be tricked by inherited keys', () => {
    expect(cleanProps('move_next', { toString: 's' }).dropped).toBe(1);
  });
});

describe('parseBatch', () => {
  it('accepts a good batch', () => {
    const b = parseBatch(batch(), NOW)!;
    expect(b.events).toEqual([{ name: 'page_view', at: NOW, props: { path: '/' } }]);
    expect(b.ctx).toEqual({ platform: 'ios', in_app: true, standalone: false, tzo: -240 });
    expect(b.rejected).toBe(0);
  });

  it('refuses a bad envelope', () => {
    expect(parseBatch(null, NOW)).toBeUndefined();
    expect(parseBatch(batch({ v: 2 }), NOW)).toBeUndefined();
    expect(parseBatch(batch({ install: 'short' }), NOW)).toBeUndefined();
    expect(parseBatch(batch({ install: 'has spaces in it ok' }), NOW)).toBeUndefined();
    expect(parseBatch(batch({ app: 'server' }), NOW)).toBeUndefined();
    expect(parseBatch(batch({}, []), NOW)).toBeUndefined();
    const many = Array.from({ length: MAX_BATCH + 1 }, () => ({ name: 'move_next', at: NOW }));
    expect(parseBatch(batch({}, many), NOW)).toBeUndefined();
  });

  it('drops unknown events, server events and events from the other surface', () => {
    const b = parseBatch(
      batch({}, [
        { name: 'nope', at: NOW },
        { name: 'subscription_started', at: NOW },
        { name: 'app_open', at: NOW },
        { name: 'experiment_exposed', at: NOW, props: { exp: 'hero_cta', variant: 'daily' } },
      ]),
      NOW,
    )!;
    expect(b.events.map((e) => e.name)).toEqual(['experiment_exposed']);
    expect(b.rejected).toBe(3);
  });

  it('uses the server time when the device clock is far off', () => {
    const b = parseBatch(
      batch({}, [
        { name: 'move_next', at: NOW - 8 * 86_400_000 },
        { name: 'move_next', at: NOW + 3_600_000 },
        { name: 'move_next', at: 'soon' },
        { name: 'move_next', at: NOW - 60_000 },
      ]),
      NOW,
    )!;
    expect(b.events.map((e) => e.at)).toEqual([NOW, NOW, NOW, NOW - 60_000]);
  });

  it('cleans the context and the attribution', () => {
    const b = parseBatch(batch({ ctx: { platform: 'windows', tzo: 99999 }, attr: { utm_source: 'Mike Poker', evil: 'x', loc: 'Bellagio' } }), NOW)!;
    expect(b.ctx).toEqual({ platform: 'desktop', in_app: false, standalone: false, tzo: 0 });
    expect(b.attr).toEqual({ utm_source: 'mike_poker', loc: 'bellagio' });
  });
});

describe('device fields', () => {
  it('reads the platform', () => {
    expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('desktop');
    expect(platformOf('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('android');
    expect(platformOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });

  it('spots in-app browsers', () => {
    expect(inAppBrowser('Mozilla/5.0 (iPhone) Instagram 300.0')).toBe(true);
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 15) musical_ly_2023')).toBe(true);
    expect(inAppBrowser('Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1')).toBe(false);
  });

  it('reduces a referrer to its host and leaves our own out', () => {
    expect(referrerHost('https://www.instagram.com/p/abc?x=1', 'acedpoker.app')).toBe('instagram.com');
    expect(referrerHost('https://acedpoker.app/', 'acedpoker.app')).toBeUndefined();
    expect(referrerHost('', 'acedpoker.app')).toBeUndefined();
  });

  it('works out the local day from the offset', () => {
    // 2 am UTC is still the evening before in Toronto (UTC-4).
    expect(localDay(Date.parse('2026-10-17T02:00:00Z'), -240)).toBe('2026-10-16');
    expect(localDay(Date.parse('2026-10-17T02:00:00Z'), 0)).toBe('2026-10-17');
  });
});

describe('hashing', () => {
  it('matches the published FNV-1a values', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  it('hashes an error the same way whatever the numbers and quoted values', () => {
    const a = hashMessage("Cannot read 'pot' of undefined at 12");
    const b = hashMessage('Cannot read "stack" of undefined at 99');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(hashMessage('x is not a function')).not.toBe(a);
  });
});

describe('experiments', () => {
  it('assigns the same variant every time', () => {
    const exp = EXPERIMENTS[0];
    expect(assign(ID, exp)).toBe(assign(ID, exp));
  });

  it('splits by weight', () => {
    const exp = { id: 'w', variants: [{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }] };
    let a = 0;
    for (let i = 0; i < 4000; i++) if (assign(`install-number-${i}-xyz`, exp) === 'a') a++;
    expect(a / 4000).toBeGreaterThan(0.71);
    expect(a / 4000).toBeLessThan(0.79);
  });

  it('buckets each test on its own', () => {
    let same = 0;
    for (let i = 0; i < 2000; i++) {
      const id = `install-number-${i}-xyz`;
      if (bucket(id, 'one') < 0.5 === bucket(id, 'two') < 0.5) same++;
    }
    expect(same / 2000).toBeGreaterThan(0.45);
    expect(same / 2000).toBeLessThan(0.55);
  });

  it('falls back to the control when weights are all zero', () => {
    expect(assign(ID, { id: 'z', variants: [{ id: 'a', weight: 0 }, { id: 'b', weight: 0 }] })).toBe('a');
  });

  it('starts every test with its control', () => {
    expect(EXPERIMENTS.map((e) => e.variants[0].id)).toEqual(['start', 'on']);
  });
});

describe('docs/ANALYTICS.md', () => {
  it('lists every event in the dictionary', async () => {
    const { readFileSync } = await import('node:fs');
    const doc = readFileSync(new URL('../../../docs/ANALYTICS.md', import.meta.url), 'utf8');
    const missing = Object.keys(EVENTS).filter((name) => !doc.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });
});

describe('sourceOf', () => {
  it('prefers the creator tag, then src, ref and the referring site', () => {
    expect(sourceOf({ utm_source: 'mike', src: 'qr' })).toBe('mike');
    expect(sourceOf({ src: 'qr', ref: 'friend' })).toBe('qr');
    expect(sourceOf({ ref: 'friend' })).toBe('friend');
    expect(sourceOf({ referrer: 'instagram.com' })).toBe('instagram.com');
    expect(sourceOf({})).toBe('direct');
  });
});

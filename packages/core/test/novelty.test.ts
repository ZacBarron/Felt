import { describe, expect, it } from 'vitest';
import {
  buildChart,
  comboText,
  dealCombo,
  drillHands,
  growDeck,
  handClassOf,
  hashString,
  lastSeen,
  mixedDeck,
  noveltyPick,
  rememberSeen,
  ROLE_WEIGHT,
  rotation,
  rotationAt,
  seededRandom,
  shuffled,
  spreadOrder,
  type ChartSpec,
} from '../src';

const items = Array.from({ length: 40 }, (_, i) => ({ id: `i${i}`, spot: `s${i % 4}`, seat: `p${i % 5}` }));
const facets = (x: (typeof items)[number]) => [`spot:${x.spot}`, `seat:${x.seat}`];

describe('seen memory', () => {
  it('keeps the newest entry per key and caps the log', () => {
    let log = rememberSeen([], ['a', 'b'], 1);
    log = rememberSeen(log, ['a', 'c'], 2);
    expect(log).toEqual([
      { key: 'b', at: 1 },
      { key: 'a', at: 2 },
      { key: 'c', at: 2 },
    ]);
    expect(lastSeen(log).get('a')).toBe(2);
    const big = rememberSeen([], Array.from({ length: 50 }, (_, i) => `k${i}`), 5, 10);
    expect(big).toHaveLength(10);
    expect(rememberSeen(big, ['new'], 6, 10).at(-1)).toEqual({ key: 'new', at: 6 });
    expect(rememberSeen(big, ['new'], 6, 10)).toHaveLength(10);
  });

  it('hashes strings stably', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('novelty pick', () => {
  it('picks distinct items, never more than asked or than exist', () => {
    const p = noveltyPick(items, { n: 10, key: (x) => x.id, rand: seededRandom(1) });
    expect(new Set(p.map((x) => x.id)).size).toBe(10);
    expect(noveltyPick(items.slice(0, 3), { n: 10, key: (x) => x.id, rand: seededRandom(1) })).toHaveLength(3);
    expect(noveltyPick([...items, ...items], { n: 100, key: (x) => x.id, rand: seededRandom(1) })).toHaveLength(40);
  });

  it('skips items seen inside the window until the fresh ones run out, oldest first', () => {
    const now = 1_000_000;
    const seen = new Map(items.slice(0, 35).map((x, i) => [x.id, now - 1000 + i] as const));
    const p = noveltyPick(items, { n: 7, key: (x) => x.id, seen, now, windowMs: 60_000, rand: seededRandom(3) });
    expect(p.slice(0, 5).map((x) => x.id).sort()).toEqual(['i35', 'i36', 'i37', 'i38', 'i39']);
    expect(p.slice(5).map((x) => x.id)).toEqual(['i0', 'i1']);
    // Outside the window everything is fresh again.
    const later = noveltyPick(items, { n: 40, key: (x) => x.id, seen, now: now + 120_000, windowMs: 60_000, rand: seededRandom(3) });
    expect(later).toHaveLength(40);
  });

  it('spreads a set across facets', () => {
    for (let s = 0; s < 20; s++) {
      const p = noveltyPick(items, { n: 8, key: (x) => x.id, facets, rand: seededRandom(s) });
      // 4 spot types and 8 picks: each spot type twice.
      const spots = new Map<string, number>();
      for (const x of p) spots.set(x.spot, (spots.get(x.spot) ?? 0) + 1);
      expect(Math.max(...spots.values()), `seed ${s}`).toBeLessThanOrEqual(3);
      expect(spots.size).toBe(4);
      // Neighbours rarely share a spot type.
      const same = p.slice(1).filter((x, i) => x.spot === p[i].spot).length;
      expect(same).toBeLessThanOrEqual(2);
    }
  });

  it('follows weights and never picks a zero weight', () => {
    let heavy = 0;
    for (let s = 0; s < 200; s++) {
      const p = noveltyPick(items, { n: 1, key: (x) => x.id, weight: (x) => (x.id === 'i0' ? 0 : x.id === 'i1' ? 39 : 1), rand: seededRandom(s) });
      expect(p[0].id).not.toBe('i0');
      if (p[0].id === 'i1') heavy++;
    }
    // i1 carries about half the weight.
    expect(heavy).toBeGreaterThan(70);
    expect(heavy).toBeLessThan(130);
  });

  it('replays the same picks from the same seed', () => {
    const a = noveltyPick(items, { n: 10, key: (x) => x.id, facets, rand: seededRandom(9) });
    const b = noveltyPick(items, { n: 10, key: (x) => x.id, facets, rand: seededRandom(9) });
    expect(a).toEqual(b);
  });
});

describe('orders and rotations', () => {
  it('spreads neighbours without dropping or adding items', () => {
    const list = ['a1', 'a2', 'a3', 'b1', 'b2', 'c1'];
    const out = spreadOrder(list, (x) => [x[0]]);
    expect([...out].sort()).toEqual([...list].sort());
    expect(out.slice(1).filter((x, i) => x[0] === out[i][0]).length).toBe(0);
    // Order is kept where nothing needs to move.
    expect(spreadOrder(['a', 'b', 'c'], (x) => [x])).toEqual(['a', 'b', 'c']);
  });

  it('builds a fixed rotation that holds every item once, mixed across groups', () => {
    const order = rotation(items, { salt: 'test', group: (x) => x.spot, key: (x) => x.id, facets: (x) => [x.seat] });
    expect(order).toHaveLength(items.length);
    expect(new Set(order.map((x) => x.id)).size).toBe(items.length);
    expect(rotation([...items].reverse(), { salt: 'test', group: (x) => x.spot, key: (x) => x.id, facets: (x) => [x.seat] })).toEqual(order);
    // Round robin: any 4 in a row cover every spot type.
    for (let i = 0; i + 4 <= order.length; i += 4) expect(new Set(order.slice(i, i + 4).map((x) => x.spot)).size).toBe(4);
    expect(rotationAt(order, 0)).toBe(order[0]);
    expect(rotationAt(order, order.length)).toBe(order[0]);
    expect(rotationAt(order, -1)).toBe(order[order.length - 1]);
    expect(rotationAt([], 3)).toBeUndefined();
  });

  it('shuffles without losing items', () => {
    const out = shuffled(items, seededRandom(4));
    expect(out.map((x) => x.id).sort()).toEqual(items.map((x) => x.id).sort());
  });
});

describe('dealing cards', () => {
  it('deals a combo of the class and avoids recent ones', () => {
    for (let s = 0; s < 50; s++) {
      const c = dealCombo('AKs', seededRandom(s), ['AsKs', 'AhKh', 'AdKd']);
      expect(handClassOf(c[0], c[1])).toBe('AKs');
      expect(comboText(c)).toBe('AcKc');
    }
    // With every combo avoided, any combo still comes back.
    const all = ['AsKs', 'AhKh', 'AdKd', 'AcKc'];
    expect(all).toContain(comboText(dealCombo('AKs', seededRandom(1), all)));
    const pairs = new Set(Array.from({ length: 60 }, (_, s) => comboText(dealCombo('77', seededRandom(s)))));
    expect(pairs.size).toBe(6);
  });
});

const spec = (id: string, spot: ChartSpec['spot'], raise: string): ChartSpec => ({
  id,
  title: id,
  game: 'cash',
  tableSize: 9,
  stackBb: 100,
  hero: 'BTN',
  spot,
  basis: 'gto',
  source: 'starter-approx',
  actions: [{ id: 'raise', label: 'Raise', range: raise }],
});

describe('review decks that mix and grow', () => {
  const a = buildChart(spec('a', 'rfi', '22+, A2s+, KTs+, A9o:0.5'));
  const b = buildChart(spec('b', 'rfi', 'TT+, AQs+'));
  const c = buildChart(spec('c', 'vs-open', '99+, AJs+, KQs:0.5'));
  const d = buildChart(spec('d', 'vs-3bet', 'QQ+, AKs'));

  it('weights mixed hands and close calls above clear hands', () => {
    const hands = drillHands(a);
    expect(hands).toHaveLength(169);
    expect(hands.find((h) => h.hand === 'A9o')!.role).toBe('mixed');
    expect(hands.find((h) => h.hand === '72o')!.role).toBe('clear');
    expect(hands.find((h) => h.hand === 'A9o')!.weight).toBe(ROLE_WEIGHT.mixed);
    expect(ROLE_WEIGHT.mixed).toBeGreaterThan(ROLE_WEIGHT.clear);
    expect(ROLE_WEIGHT.close).toBeGreaterThan(ROLE_WEIGHT.clear);
  });

  it('introduces cards from several charts and spot types at once', () => {
    const deck = mixedDeck([a, b, c, d], { active: 3 });
    const all = [a, b, c, d].reduce((t, ch) => t + drillHands(ch).filter((h) => h.role !== 'clear').length + 1, 0);
    expect(deck).toHaveLength(all);
    expect(new Set(deck.map((s) => s.id)).size).toBe(deck.length);
    // The first cards come from three charts, one per spot type, round robin.
    expect(new Set(deck.slice(0, 6).map((s) => s.chartId))).toEqual(new Set(['a', 'c', 'd']));
    // A chart's painting card comes after its close calls.
    for (const ch of ['a', 'b', 'c', 'd']) {
      const paint = deck.findIndex((s) => s.id === `paint:${ch}`);
      expect(deck.slice(paint + 1).some((s) => s.chartId === ch)).toBe(false);
    }
    // Known cards are skipped and free their place.
    const known = new Set(deck.filter((s) => s.chartId === 'a').map((s) => s.id));
    const rest = mixedDeck([a, b, c, d], { active: 3, known });
    expect(rest.some((s) => s.chartId === 'a')).toBe(false);
    expect(new Set(rest.slice(0, 6).map((s) => s.chartId))).toEqual(new Set(['b', 'c', 'd']));
  });

  it('grows the deck with mature cards and keeps charts that have cards', () => {
    const ids = (xs: { spec: { id: string } }[]) => xs.map((x) => x.spec.id);
    expect(ids(growDeck([a], [b, c, d], { mature: 0, started: new Set() }))).toEqual(['a']);
    expect(ids(growDeck([a], [b, c, d], { mature: 65, started: new Set() }))).toEqual(['a', 'b', 'c']);
    expect(ids(growDeck([a], [b, c, d], { mature: 0, started: new Set(['d']) }))).toEqual(['a', 'd']);
    expect(ids(growDeck([a], [a, b], { mature: 100, started: new Set() }))).toEqual(['a', 'b']);
  });
});

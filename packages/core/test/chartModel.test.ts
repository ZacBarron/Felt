import { describe, expect, it } from 'vitest';
import {
  actionsFromMixes,
  ALL_HAND_CLASSES,
  buildChart,
  type Chart,
  type ChartSpec,
  combineRules,
  comboCount,
  continueOf,
  continueText,
  deriveMixes,
  deriveVariant,
  type HandMix,
  NO_CHANGE,
  openSizeRule,
  playability,
  premium,
  rangeText,
  stackRule,
} from '../src';

const spec = (actions: ChartSpec['actions'], reach?: string): ChartSpec => ({
  id: 't',
  title: 'T',
  game: 'cash',
  tableSize: 9,
  stackBb: 100,
  hero: 'BB',
  spot: 'vs-open',
  basis: 'gto',
  source: 'starter-approx',
  actions,
  reach,
});

const OPEN = buildChart(
  spec([{ id: 'raise', label: 'Raise', range: '22+, A2s+, K9s+, K8s:0.5, QTs+, Q9s:0.4, JTs, J9s:0.3, T9s:0.6, 98s:0.3, ATo+, A9o:0.5, KJo+, KTo:0.4, QJo:0.3' }]),
);
const DEFEND = buildChart(
  spec([
    { id: '3bet', label: '3bet', range: 'QQ+, JJ:0.5, AK, AQs, A5s:0.6, A4s:0.5, KQs:0.4, 76s:0.3' },
    { id: 'call', label: 'Call', range: '22-JJ, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, A8o+, KTo+, QTo+, JTo, T9o:0.5' },
  ]),
);

const combos = (mixes: ReadonlyMap<string, HandMix>, ids?: string[]) =>
  ALL_HAND_CLASSES.reduce((t, h) => {
    const m = mixes.get(h)!;
    const f = ids ? ids.reduce((s, id) => s + (m[id] ?? 0), 0) : continueOf(m);
    return t + f * comboCount(h);
  }, 0);

function valid(mixes: ReadonlyMap<string, HandMix>) {
  for (const h of ALL_HAND_CLASSES) {
    const m = mixes.get(h)!;
    const sum = Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum, h).toBeCloseTo(1, 9);
    for (const f of Object.values(m)) {
      expect(f).toBeGreaterThanOrEqual(0);
      // 5% steps, like the hand written charts.
      expect(Math.abs(f * 20 - Math.round(f * 20)), `${h} ${f}`).toBeLessThan(1e-9);
    }
  }
}

describe('hand features', () => {
  it('rates small pairs and suited connectors above weak offsuit hands for deep play', () => {
    expect(playability('22')).toBeGreaterThan(playability('KK'));
    expect(playability('76s')).toBeGreaterThan(playability('KTo'));
    expect(playability('A5s')).toBeGreaterThan(playability('A9s'));
    expect(playability('K7o')).toBeLessThan(playability('KQo'));
    for (const h of ALL_HAND_CLASSES) expect(Math.abs(playability(h))).toBeLessThanOrEqual(1);
    expect(premium('AA')).toBe(1);
    expect(premium('AKo')).toBe(1);
    expect(premium('T9s')).toBe(0);
  });
});

describe('deriveMixes', () => {
  it('returns the base chart unchanged with no change', () => {
    const out = deriveMixes(DEFEND, { rule: NO_CHANGE, raise: '3bet', call: 'call' });
    for (const h of ALL_HAND_CLASSES) {
      const a = DEFEND.mixes.get(h)!;
      const b = out.get(h)!;
      for (const id of ['3bet', 'call', 'fold']) expect(b[id] ?? 0, h).toBeCloseTo(a[id] ?? 0, 9);
    }
  });

  it('hits the target width and keeps every mix valid', () => {
    for (const width of [0.6, 0.8, 1.2, 1.4]) {
      const out = deriveMixes(OPEN, { rule: { ...NO_CHANGE, width }, raise: 'raise' });
      valid(out);
      const target = width * combos(OPEN.mixes);
      // Within a few combos: frequencies move in 5% steps.
      expect(Math.abs(combos(out) - target)).toBeLessThan(12);
    }
  });

  it('tightens from the bottom and widens from the top, keeping the base order', () => {
    const tight = deriveMixes(OPEN, { rule: { ...NO_CHANGE, width: 0.7 }, raise: 'raise' });
    const wide = deriveMixes(OPEN, { rule: { ...NO_CHANGE, width: 1.3 }, raise: 'raise' });
    for (const h of ALL_HAND_CLASSES) {
      const b = continueOf(OPEN.mixes.get(h));
      expect(continueOf(tight.get(h)), h).toBeLessThanOrEqual(b + 1e-9);
      expect(continueOf(wide.get(h)), h).toBeGreaterThanOrEqual(b - 1e-9);
    }
    // The core of the range survives, the edge goes first.
    expect(continueOf(tight.get('AA'))).toBe(1);
    expect(continueOf(tight.get('AQs'))).toBe(1);
    expect(continueOf(tight.get('98s'))).toBeLessThan(continueOf(OPEN.mixes.get('98s')));
    // Folded junk stays folded when widening a little.
    expect(continueOf(wide.get('72o'))).toBe(0);
  });

  it('never folds a premium the base chart always plays', () => {
    const out = deriveMixes(DEFEND, { rule: { ...NO_CHANGE, width: 0.3 }, raise: '3bet', call: 'call' });
    for (const h of ['AA', 'KK', 'QQ', 'AKs', 'AKo']) expect(continueOf(out.get(h)), h).toBe(1);
  });

  it('tilts toward pairs and suited hands deep and toward high cards short', () => {
    const deep = deriveMixes(OPEN, { rule: { width: 1, tilt: 1, aggression: 0 }, raise: 'raise' });
    const short = deriveMixes(OPEN, { rule: { width: 1, tilt: -1, aggression: 0 }, raise: 'raise' });
    const share = (m: ReadonlyMap<string, HandMix>, hands: string[]) => hands.reduce((t, h) => t + continueOf(m.get(h)), 0);
    const spec = ['22', '33', '44', '98s', 'T9s', 'J9s'];
    const high = ['KTo', 'QJo', 'A9o', 'K8s'];
    expect(share(deep, spec)).toBeGreaterThan(share(short, spec));
    expect(share(short, high)).toBeGreaterThan(share(deep, high));
  });

  it('moves calls to raises with aggression and back without it', () => {
    const base3 = combos(DEFEND.mixes, ['3bet']);
    const up = deriveMixes(DEFEND, { rule: { width: 1, tilt: 0, aggression: 0.6 }, raise: '3bet', call: 'call' });
    const down = deriveMixes(DEFEND, { rule: { width: 1, tilt: 0, aggression: -0.6 }, raise: '3bet', call: 'call' });
    valid(up);
    valid(down);
    expect(combos(up, ['3bet'])).toBeGreaterThan(base3);
    expect(combos(down, ['3bet'])).toBeLessThan(base3);
    // Continuing stays the same: only the split changes.
    expect(combos(up)).toBeCloseTo(combos(DEFEND.mixes), 0);
    // Premiums keep raising when raises turn into calls.
    expect(down.get('AA')!['3bet']).toBe(1);
  });

  it('scales raises to a raise width', () => {
    const half = deriveMixes(DEFEND, { rule: { ...NO_CHANGE, raiseWidth: 0.6 }, raise: '3bet', call: 'call' });
    expect(combos(half, ['3bet']) / combos(DEFEND.mixes, ['3bet'])).toBeGreaterThan(0.5);
    expect(combos(half, ['3bet']) / combos(DEFEND.mixes, ['3bet'])).toBeLessThan(0.75);
    expect(half.get('KK')!['3bet']).toBe(1);
  });

  it('keeps hands outside the reach out', () => {
    const reach = new Set(['AA', 'KK', 'AKs', 'A5s', '76s']);
    const chart: Chart = { ...DEFEND, reach };
    const out = deriveMixes(chart, { rule: { ...NO_CHANGE, width: 1.5 }, raise: '3bet', call: 'call' });
    for (const h of ALL_HAND_CLASSES) if (!reach.has(h)) expect(continueOf(out.get(h)), h).toBe(0);
  });
});

describe('rules', () => {
  it('tightens bigger opens and defense against them', () => {
    expect(openSizeRule('rfi', 'opener', 4).width).toBeLessThan(openSizeRule('rfi', 'opener', 3).width);
    expect(openSizeRule('rfi', 'opener', 2.5).width).toBe(1);
    // The big blind feels the price most.
    expect(openSizeRule('vs-open', 'bb', 5).width).toBeLessThan(openSizeRule('vs-open', 'ip', 5).width);
    // 3bets fall less than the whole defense: the cut is mostly flats.
    const r = openSizeRule('vs-open', 'bb', 5);
    expect(r.raiseWidth!).toBeGreaterThan(r.width);
  });

  it('interpolates stack depth between anchors', () => {
    expect(stackRule('rfi', 'opener', 100)).toEqual({ width: 1, tilt: 0, aggression: 0 });
    const r50 = stackRule('vs-open', 'ip', 50);
    const r40 = stackRule('vs-open', 'ip', 40);
    const r60 = stackRule('vs-open', 'ip', 60);
    expect(r50.width).toBeGreaterThan(r40.width);
    expect(r50.width).toBeLessThan(r60.width);
    expect(stackRule('vs-3bet', 'opener', 40).aggression).toBeGreaterThan(0);
    expect(stackRule('vs-3bet', 'opener', 200).aggression).toBeLessThan(0);
    // Beyond the anchors the end rule holds.
    expect(stackRule('rfi', 'opener', 20)).toEqual(stackRule('rfi', 'opener', 40));
  });

  it('combines stack and size', () => {
    const c = combineRules({ width: 0.9, tilt: 0.5, aggression: 0.2 }, { width: 0.8, tilt: 0.7, aggression: 0, raiseWidth: 0.9 });
    expect(c.width).toBeCloseTo(0.72);
    expect(c.tilt).toBe(1);
    expect(c.raiseWidth).toBe(0.9);
  });

  it('defends tighter against bigger opens, with fewer flats', () => {
    const at = (open: number) => deriveVariant(DEFEND, { family: 'vs-open', role: 'bb', stackBb: 100, openBb: open }, { raise: '3bet', call: 'call' });
    const w = [2.5, 3, 4, 5].map((o) => combos(at(o)));
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeLessThan(w[i - 1]);
    const calls = [2.5, 5].map((o) => combos(at(o), ['call']));
    const raises = [2.5, 5].map((o) => combos(at(o), ['3bet']));
    expect(calls[1] / calls[0]).toBeLessThan(raises[1] / raises[0]);
  });

  it('shifts flats to 3bets short and back deep', () => {
    const at = (stack: number) => deriveVariant(DEFEND, { family: 'vs-open', role: 'ip', stackBb: stack, openBb: 2.5 }, { raise: '3bet', call: 'call' });
    const share = (m: ReadonlyMap<string, HandMix>) => combos(m, ['3bet']) / combos(m);
    expect(share(at(40))).toBeGreaterThan(share(at(100)));
    expect(share(at(200))).toBeLessThan(share(at(100)));
  });
});

describe('chart notation', () => {
  it('writes mixes back to ranges that rebuild the same chart', () => {
    const out = deriveMixes(DEFEND, { rule: { width: 0.8, tilt: 0.3, aggression: 0.2 }, raise: '3bet', call: 'call' });
    const again = buildChart(spec(actionsFromMixes(out, [{ id: '3bet', label: '3bet' }, { id: 'call', label: 'Call' }])));
    for (const h of ALL_HAND_CLASSES) {
      const a = out.get(h)!;
      const b = again.mixes.get(h)!;
      for (const id of ['3bet', 'call', 'fold']) expect(b[id] ?? 0, h).toBeCloseTo(a[id] ?? 0, 9);
    }
  });

  it('writes pure hands plainly and mixed hands with a frequency', () => {
    expect(rangeText(new Map([['AA', 1], ['KK', 0.5], ['72o', 0]]))).toBe('AA, KK:0.5');
    expect(continueText(DEFEND.mixes, ['3bet'])).toContain('A5s:0.6');
  });
});

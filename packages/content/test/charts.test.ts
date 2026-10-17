import {
  actionFrequencies,
  ALL_HAND_CLASSES,
  buildChart,
  type Chart,
  CHART_OPENS,
  CHART_STACKS,
  type ChartMeta,
  continueOf,
  positionsFor,
  reaches,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CHART_LIBRARY, chartSpec, STARTER_CHARTS, variantId } from '../src';

/**
 * The chart library as a whole: every curated and derived chart is sound,
 * the spots it promises exist, and the numbers move the way poker says
 * they should (tighter from early seats, tighter against bigger opens, 4bets
 * only from hands that got there).
 */

const cache = new Map<string, Chart>();
const chart = (id: string): Chart => {
  let c = cache.get(id);
  if (!c) {
    const spec = chartSpec(id);
    if (!spec) throw new Error(`No chart ${id}`);
    c = buildChart(spec);
    cache.set(id, c);
  }
  return c;
};
/** Share of all combos that continue, counting only hands that reach the spot. */
const plays = (id: string) => {
  const c = chart(id);
  return 1 - (actionFrequencies(c).fold ?? 0) - (c.reach ? 0 : 0);
};
const action = (id: string, a: string) => actionFrequencies(chart(id))[a] ?? 0;
const at = (id: string, stack: number, open: number) => (stack === 100 && open === 2.5 ? id : variantId(id, stack, open));

describe('chart library', () => {
  it('has unique ids, real seats and a source on every chart', () => {
    expect(new Set(CHART_LIBRARY.map((c) => c.id)).size).toBe(CHART_LIBRARY.length);
    for (const m of CHART_LIBRARY) {
      expect(positionsFor(m.tableSize), m.id).toContain(m.hero);
      for (const v of [...(m.villains ?? []), ...(m.caller ?? [])]) expect(positionsFor(m.tableSize), m.id).toContain(v);
      expect(['starter-approx', 'model-approx']).toContain(m.source);
      expect(m.note, m.id).toBeTruthy();
    }
  });

  it('labels every derived chart with the chart it comes from', () => {
    const starters = new Set(STARTER_CHARTS.map((c) => c.id));
    for (const m of CHART_LIBRARY.filter((c) => c.source === 'model-approx')) {
      expect(starters.has(m.derived!.from), m.id).toBe(true);
      expect(m.note, m.id).toMatch(/derived/);
      expect(m.core, m.id).toBeFalsy();
    }
    // Curated charts are never marked derived.
    for (const s of STARTER_CHARTS) expect(s.derived, s.id).toBeUndefined();
  });

  it('builds every chart with whole mixes in 5% steps', () => {
    for (const m of CHART_LIBRARY) {
      const c = chart(m.id);
      for (const h of ALL_HAND_CLASSES) {
        const mix = c.mixes.get(h)!;
        const sum = Object.values(mix).reduce((a, b) => a + b, 0);
        expect(sum, `${m.id} ${h}`).toBeCloseTo(1, 9);
        for (const f of Object.values(mix)) expect(Math.abs(f * 20 - Math.round(f * 20)), `${m.id} ${h}`).toBeLessThan(1e-6);
      }
    }
  });

  it('keeps the meta of every chart in step with its full spec', () => {
    for (const m of CHART_LIBRARY) {
      const s = chartSpec(m.id)!;
      for (const k of ['id', 'title', 'tableSize', 'stackBb', 'openBb', 'hero', 'spot', 'source', 'versus'] as const) expect(s[k], `${m.id} ${k}`).toEqual(m[k]);
    }
  });

  it('never folds aces where they can be dealt', () => {
    for (const m of CHART_LIBRARY) {
      const c = chart(m.id);
      if (reaches(c, 'AA')) expect(continueOf(c.mixes.get('AA')), m.id).toBe(1);
    }
  });

  it('acts only with hands that reach the spot', () => {
    for (const m of CHART_LIBRARY) {
      const c = chart(m.id);
      if (!c.reach) continue;
      for (const h of ALL_HAND_CLASSES) if (continueOf(c.mixes.get(h)) > 0) expect(c.reach.has(h), `${m.id} ${h}`).toBe(true);
    }
  });
});

describe('coverage', () => {
  const has = (pred: (m: ChartMeta) => boolean) => CHART_LIBRARY.some(pred);

  for (const tableSize of [6, 9]) {
    const seats = positionsFor(tableSize);
    const starters = (m: ChartMeta) => m.tableSize === tableSize && m.source === 'starter-approx';

    it(`covers every open and every defense, ${tableSize}-handed`, () => {
      for (let i = 0; i < seats.length - 1; i++) {
        expect(has((m) => starters(m) && m.spot === 'rfi' && m.hero === seats[i]), `${seats[i]} open`).toBe(true);
        for (let j = i + 1; j < seats.length; j++) {
          expect(has((m) => starters(m) && m.spot === 'vs-open' && m.hero === seats[j] && m.villains?.[0] === seats[i]), `${seats[j]} vs ${seats[i]}`).toBe(true);
          expect(has((m) => starters(m) && m.spot === 'vs-3bet' && m.hero === seats[i] && !!m.villains?.includes(seats[j])), `${seats[i]} vs ${seats[j]} 3bet`).toBe(true);
        }
      }
    });

    it(`covers 4bets, squeezes, blind vs blind, limpers and straddles, ${tableSize}-handed`, () => {
      for (const spot of ['vs-4bet', 'squeeze', 'vs-squeeze', 'bvb', 'vs-limp'] as const) expect(has((m) => starters(m) && m.spot === spot), spot).toBe(true);
      for (const seat of ['CO', 'BTN', 'SB', 'BB']) for (const n of [1, 2, 3]) expect(has((m) => starters(m) && m.spot === 'vs-limp' && m.hero === seat && m.limpers === n), `${seat} ${n}`).toBe(true);
      expect(has((m) => m.tableSize === tableSize && m.spot === 'straddle' && m.hero === 'BTN')).toBe(true);
    });

    it(`has every stack and open size for opens, defense and 3bets, ${tableSize}-handed`, () => {
      for (const spot of ['rfi', 'vs-open', 'vs-3bet'] as const) {
        for (const stack of CHART_STACKS) for (const open of CHART_OPENS) expect(has((m) => m.tableSize === tableSize && m.spot === spot && m.stackBb === stack && m.openBb === open), `${spot} ${stack} ${open}`).toBe(true);
      }
    });
  }

  it('keeps 6-max ranges equal to the 9-handed seats with the same players behind', () => {
    const pairs: [string, string][] = [
      ['6max-100-rfi-utg', '9max-100-rfi-lj'],
      ['6max-100-hj-vs-utg', '9max-100-hj-vs-lj'],
      ['6max-100-bb-vs-hj', '9max-100-bb-vs-hj'],
      ['6max-100-utg-vs-blinds-3bet', '9max-100-lj-vs-blinds-3bet'],
    ];
    for (const [a, b] of pairs) for (const h of ALL_HAND_CLASSES) expect(chart(a).mixes.get(h), `${a} ${h}`).toEqual(chart(b).mixes.get(h));
  });
});

describe('poker sense, curated charts', () => {
  const NINE = positionsFor(9);
  const id = (hero: string, opener: string) => `9max-100-${hero.toLowerCase().replace('+', 'p')}-vs-${opener.toLowerCase().replace('+', 'p')}`;

  it('defends wider against later openers, seat by seat', () => {
    for (const hero of NINE) {
      const openers = NINE.slice(0, NINE.indexOf(hero));
      for (let i = 1; i < openers.length; i++) {
        if (openers[i] === 'SB') continue;
        expect(plays(id(hero, openers[i])), `${hero} vs ${openers[i]}`).toBeGreaterThanOrEqual(plays(id(hero, openers[i - 1])) - 1e-9);
      }
    }
  });

  it('flats more the fewer players are behind', () => {
    for (const opener of ['UTG', 'UTG+1', 'UTG+2']) {
      const seats = NINE.slice(NINE.indexOf(opener) + 1, NINE.indexOf('SB'));
      for (let i = 1; i < seats.length; i++) expect(action(id(seats[i], opener), 'call'), `${seats[i]} vs ${opener}`).toBeGreaterThanOrEqual(action(id(seats[i - 1], opener), 'call'));
    }
  });

  it('keeps the small blind to 3bet or fold and the big blind widest', () => {
    for (const opener of NINE.slice(0, NINE.indexOf('SB'))) {
      expect(action(id('SB', opener), 'call')).toBe(0);
      expect(plays(id('BB', opener))).toBeGreaterThan(plays(id('SB', opener)));
    }
  });

  it('squeezes tighter than it 3bets against the same opener', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.spot === 'squeeze')) {
      const plain = `${s.tableSize}max-100-${s.hero.toLowerCase()}-vs-${s.villains![0].toLowerCase().replace('+', 'p')}`;
      expect(plays(s.id), s.id).toBeLessThan(plays(plain));
    }
  });

  it('4bets only hands that opened, and 5bets only hands that 3bet', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.spot === 'vs-3bet' || c.spot === 'vs-4bet')) {
      const c = chart(s.id);
      for (const h of ALL_HAND_CLASSES) {
        const raise = c.mixes.get(h)![s.spot === 'vs-3bet' ? '4bet' : 'allin'] ?? 0;
        if (raise > 0) expect(c.reach!.has(h), `${s.id} ${h}`).toBe(true);
      }
    }
  });

  it('folds most of a wide 3bet range to a 4bet', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.spot === 'vs-4bet')) {
      const c = chart(s.id);
      const reached = [...c.reach!];
      const folds = reached.filter((h) => (c.mixes.get(h)!.fold ?? 0) > 0.5).length;
      expect(folds / reached.length, s.id).toBeGreaterThan(0.25);
    }
  });

  it('never folds the big blind to a limp', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.hero === 'BB' && (c.spot === 'vs-limp' || (c.spot === 'bvb' && c.limpers)))) {
      expect(action(s.id, 'fold'), s.id).toBe(0);
    }
  });

  it('isolates tighter against more limpers', () => {
    for (const seat of ['co', 'btn', 'sb', 'bb']) {
      const r = [1, 2, 3].map((n) => action(`9max-100-iso-${seat}-vs-${n}limp`, 'raise'));
      expect(r[1]).toBeLessThan(r[0]);
      expect(r[2]).toBeLessThan(r[1]);
    }
  });

  it('keeps every exploit chart labelled as one', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.spot === 'vs-limp')) {
      expect(s.basis).toBe('exploit');
      expect(s.note).toMatch(/limper/);
    }
  });
});

describe('poker sense, derived charts', () => {
  it('opens tighter with a bigger open, at every seat and stack', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.spot === 'rfi')) {
      for (const stack of CHART_STACKS) {
        const w = CHART_OPENS.map((o) => plays(at(s.id, stack, o)));
        // The small blind opens 3bb at 2.5bb and 3bb games alike.
        for (let i = 1; i < w.length; i++) expect(w[i], `${s.id} ${stack}`).toBeLessThanOrEqual(w[i - 1] + 1e-9);
        expect(w[3], `${s.id} ${stack}`).toBeLessThan(w[0]);
      }
    }
  });

  it('keeps later seats opening wider at every stack and size', () => {
    const seats = ['utg', 'utgp1', 'utgp2', 'lj', 'hj', 'co', 'btn'];
    for (const stack of CHART_STACKS) {
      for (const open of CHART_OPENS) {
        const w = seats.map((p) => plays(at(`9max-100-rfi-${p}`, stack, open)));
        for (let i = 1; i < w.length; i++) expect(w[i], `${seats[i]} ${stack} ${open}`).toBeGreaterThan(w[i - 1]);
      }
    }
  });

  it('defends tighter against a bigger open, with fewer flats', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.spot === 'vs-open' && c.villains![0] !== 'SB')) {
      for (const stack of CHART_STACKS) {
        const w = CHART_OPENS.map((o) => plays(at(s.id, stack, o)));
        for (let i = 1; i < w.length; i++) expect(w[i], `${s.id} ${stack} ${CHART_OPENS[i]}`).toBeLessThanOrEqual(w[i - 1] + 1e-9);
        expect(w[3], `${s.id} ${stack}`).toBeLessThan(w[0]);
        if (s.actions.some((a) => a.id === 'call')) {
          const calls = [2.5, 5].map((o) => action(at(s.id, stack, o), 'call'));
          expect(calls[1], `${s.id} ${stack}`).toBeLessThan(calls[0]);
        }
      }
    }
  });

  it('flats more deep and 3bets more of its range short, in position', () => {
    for (const s of STARTER_CHARTS.filter((c) => c.spot === 'vs-open' && c.hero === 'BTN')) {
      expect(action(at(s.id, 200, 2.5), 'call'), s.id).toBeGreaterThan(action(at(s.id, 40, 2.5), 'call'));
      const share = (x: string) => action(x, '3bet') / plays(x);
      expect(share(at(s.id, 40, 2.5)), s.id).toBeGreaterThan(share(s.id));
    }
  });

  it('answers a 3bet only with hands that open at that stack and size', () => {
    for (const stack of CHART_STACKS) {
      for (const open of CHART_OPENS) {
        const c = chart(at('9max-100-btn-vs-3bet', stack, open));
        const rfi = chart(at('9max-100-rfi-btn', stack, open));
        for (const h of ALL_HAND_CLASSES) expect(c.reach!.has(h), `${stack} ${open} ${h}`).toBe(continueOf(rfi.mixes.get(h)) > 0);
      }
    }
  });

  it('labels a 4bet all in when it is most of the stack', () => {
    expect(chartSpec(at('9max-100-utg-vs-3bet', 40, 2.5))!.actions[0].label).toBe('4bet all in');
    expect(chartSpec('9max-100-utg-vs-3bet')!.actions[0].label).toBe('4bet 22bb');
  });

  it('answers a 4bet deep only with hands that 3bet at that depth', () => {
    for (const stack of [150, 200]) {
      const c = chart(at('9max-100-bb-vs-btn-4bet', stack, 2.5));
      const defense = chart(at('9max-100-bb-vs-btn', stack, 2.5));
      for (const h of ALL_HAND_CLASSES) expect(c.reach!.has(h), `${stack} ${h}`).toBe((defense.mixes.get(h)!['3bet'] ?? 0) > 0);
    }
  });

  it('opens a straddled pot like the seat with the same players behind', () => {
    // UTG+1 with a straddle has 8 players behind, like UTG without one: about as tight.
    const s = plays('9max-100-o5-straddle-utgp1');
    expect(Math.abs(s - plays('9max-100-rfi-utg'))).toBeLessThan(0.03);
    expect(plays('9max-100-o5-straddle-btn')).toBeGreaterThan(plays('9max-100-o5-straddle-co'));
  });
});

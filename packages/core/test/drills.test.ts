import { describe, expect, it } from 'vitest';
import {
  type CardSeed,
  selectExtra,
  boundaryHands,
  buildChart,
  type ChartSpec,
  deckForCharts,
  primaryAction,
  scorePainting,
  scoreRecall,
  selectQueue,
  studyStreak,
} from '../src';

const spec: ChartSpec = {
  id: 'test',
  title: 'test',
  game: 'cash',
  tableSize: 9,
  stackBb: 100,
  hero: 'UTG',
  spot: 'rfi',
  basis: 'gto',
  source: 'custom',
  actions: [{ id: 'raise', label: 'Raise', range: 'TT+, AKs, AQs:0.5' }],
};
const chart = buildChart(spec);

describe('recall scoring', () => {
  it('accepts any meaningful part of a mix', () => {
    expect(scoreRecall({ raise: 1 }, 'raise')).toBe(1);
    expect(scoreRecall({ raise: 0.5, fold: 0.5 }, 'fold')).toBe(1);
    expect(scoreRecall({ raise: 0.9, fold: 0.1 }, 'fold')).toBe(0.5);
    expect(scoreRecall({ fold: 1 }, 'raise')).toBe(0);
    expect(primaryAction({ raise: 0.5, fold: 0.5 })).toBe('raise');
  });
});

describe('boundaryHands', () => {
  it('includes edges and mixes but not the interior', () => {
    const edge = boundaryHands(chart);
    expect(edge).toContain('TT');
    expect(edge).toContain('99');
    expect(edge).toContain('AQs');
    expect(edge).not.toContain('72o');
  });
});

describe('scorePainting', () => {
  it('scores only the combos that matter', () => {
    const perfect = new Map([...'TT JJ QQ KK AA AKs'.split(' ')].map((h) => [h, 'raise']));
    expect(scorePainting(chart, perfect).accuracy).toBe(1);

    const missedTens = new Map(perfect);
    missedTens.delete('TT');
    const score = scorePainting(chart, missedTens);
    expect(score.wrong).toEqual(['TT']);
    expect(score.accuracy).toBeCloseTo(1 - 6 / (30 + 4 + 4));
  });
});

describe('deck and queue', () => {
  it('introduces edge hands before painting the chart', () => {
    const deck = deckForCharts([chart]);
    expect(deck.at(-1)?.mode).toBe('paint');
    expect(new Set(deck.map((s) => s.id)).size).toBe(deck.length);
  });

  it('limits new cards to the daily budget', () => {
    const deck = deckForCharts([chart]);
    const now = new Date('2026-10-12T12:00:00');
    const known = [
      { id: deck[0].id, due: new Date('2026-10-11T12:00:00') },
      { id: deck[1].id, due: new Date('2026-10-20T12:00:00') },
    ];
    const q = selectQueue(known, deck, { now, newPerDay: 5, newIntroducedToday: 3 });
    expect(q.due.map((c) => c.id)).toEqual([deck[0].id]);
    expect(q.fresh).toHaveLength(2);
    expect(q.fresh[0].id).toBe(deck[2].id);
  });
});

describe('studyStreak', () => {
  it('counts consecutive days and forgives today until it ends', () => {
    const now = new Date('2026-10-12T09:00:00');
    const d = (s: string) => new Date(s);
    expect(studyStreak([d('2026-10-12T08:00:00'), d('2026-10-11T20:00:00'), d('2026-10-10T20:00:00')], now)).toBe(3);
    expect(studyStreak([d('2026-10-11T20:00:00'), d('2026-10-10T20:00:00')], now)).toBe(2);
    expect(studyStreak([d('2026-10-09T20:00:00')], now)).toBe(0);
  });
});

describe('charts with a limited reach', () => {
  const spec: ChartSpec = {
    id: 'reach-test',
    title: 'Open vs 3bet',
    game: 'cash',
    tableSize: 9,
    stackBb: 100,
    hero: 'UTG',
    spot: 'vs-3bet',
    basis: 'gto',
    source: 'custom',
    reach: 'TT+, AQs+, AKo',
    actions: [
      { id: '4bet', label: '4bet', range: 'KK+' },
      { id: 'call', label: 'Call', range: 'QQ, JJ, AQs+, AKo' },
    ],
  };
  const chart = buildChart(spec);

  it('only drills hands that can reach the spot', () => {
    const edges = boundaryHands(chart);
    expect(edges.every((h) => chart.reach!.has(h))).toBe(true);
    // TT folds next to JJ calling: a real edge. 99 never opened, so it is not drilled.
    expect(edges).toContain('TT');
    expect(edges).not.toContain('99');
  });

  it('scores a painting only on reachable hands', () => {
    const painted = new Map([
      ['AA', '4bet'],
      ['KK', '4bet'],
      ['QQ', 'call'],
      ['JJ', 'call'],
      ['AKs', 'call'],
      ['AQs', 'call'],
      ['AKo', 'call'],
      // Painting a hand that never opened does not count against you.
      ['72o', 'call'],
    ]);
    expect(scorePainting(chart, painted).accuracy).toBe(1);
  });
});

describe('extra practice', () => {
  const seed = (id: string): CardSeed => ({ id, kind: 'range-recall', mode: 'quick', chartId: 'c', hand: id, targetMs: 3000 });
  const card = (id: string, inDays: number) => ({ id, due: new Date(Date.UTC(2026, 9, 12) + inDays * 86_400_000) });

  it('mixes soonest due known cards with new ones, two to one', () => {
    const known = [card('k3', 3), card('k1', 1), card('k2', 2), card('k4', 4)];
    const seeds = ['k1', 'n1', 'n2'].map(seed);
    expect(selectExtra(known, seeds, { n: 6 }).map((c) => c.id)).toEqual(['k1', 'k2', 'n1', 'k3', 'k4', 'n2']);
  });

  it('skips cards just answered and never runs dry while anything is left', () => {
    const known = [card('k1', 1), card('k2', 2)];
    const out = selectExtra(known, [seed('n1')], { n: 10, exclude: new Set(['k1']) });
    expect(out.map((c) => c.id)).toEqual(['k2', 'n1']);
  });
});

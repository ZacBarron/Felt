import { describe, expect, it } from 'vitest';
import {
  type CardSeed,
  selectExtra,
  boundaryHands,
  buildChart,
  type ChartSpec,
  type HandMix,
  deckForCharts,
  primaryAction,
  mixAnswerOptions,
  mixBrushes,
  partOfMix,
  scoreMixAnswer,
  mixDistance,
  scoreMixPainting,
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

describe('mix painting', () => {
  it('measures the share of play that differs', () => {
    expect(mixDistance({ raise: 1 }, { raise: 1 })).toBe(0);
    expect(mixDistance({ raise: 1 }, { fold: 1 })).toBe(1);
    expect(mixDistance({ raise: 0.6 }, { raise: 0.5 })).toBeCloseTo(0.1);
    expect(mixDistance({ threeBet: 0.4, call: 0.6 }, { threeBet: 0.5, call: 0.5 })).toBeCloseTo(0.1);
    expect(mixDistance({ threeBet: 0.4, call: 0.6 }, { call: 0.75 })).toBeCloseTo(0.4);
  });

  it('counts a mix right within the tolerance', () => {
    const exact = new Map<string, Record<string, number>>([...'TT JJ QQ KK AA AKs'.split(' ')].map((h) => [h, { raise: 1 }]));
    exact.set('AQs', { raise: 0.5 });
    const s = scoreMixPainting(chart, exact);
    expect(s.accuracy).toBe(1);
    expect(s.closeness).toBe(1);

    // Painting the 50% hand as always raise is 0.5 away: wrong.
    const pure = new Map(exact);
    pure.set('AQs', { raise: 1 });
    expect(scoreMixPainting(chart, pure).wrong).toEqual(['AQs']);

    // A full step off (75% for a 50% hand) is wrong but still closer than pure.
    const step = new Map(exact);
    step.set('AQs', { raise: 0.75 });
    const off = scoreMixPainting(chart, step);
    expect(off.wrong).toEqual(['AQs']);
    expect(off.closeness).toBeGreaterThan(scoreMixPainting(chart, pure).closeness);
  });

  it('offers frequency brushes and splits only for pairs the chart mixes', () => {
    expect(mixBrushes(chart).map((b) => b.id)).toEqual(['raise:1', 'raise:0.75', 'raise:0.5', 'raise:0.25']);
    const defend = buildChart({
      ...spec,
      spot: 'vs-open',
      actions: [
        { id: 'threeBet', label: '3bet', range: 'QQ+, AKs:0.5' },
        { id: 'call', label: 'Call', range: 'JJ, TT, AKs' },
      ],
    });
    const brushes = mixBrushes(defend, { threeBet: '3bet', call: 'Call' });
    expect(brushes.at(-1)).toEqual({ id: 'threeBet+call', label: '3bet or Call', mix: { threeBet: 0.5, call: 0.5 } });
    expect(brushes).toHaveLength(9);
  });
});

describe('mix answers', () => {
  it('offers frequencies for a one action chart', () => {
    expect(mixAnswerOptions(chart, { raise: 'Raise', fold: 'Fold' }).map((o) => o.label)).toEqual(['Raise', 'Fold', 'Raise 75%', 'Raise 50%', 'Raise 25%']);
  });

  it('offers splits only for pairs the chart mixes', () => {
    const defend = buildChart({
      ...spec,
      spot: 'vs-open',
      actions: [
        { id: 'threeBet', label: '3bet', range: 'QQ+, AKs:0.5' },
        { id: 'call', label: 'Call', range: 'JJ, TT, AKs, 99:0.5' },
      ],
    });
    const ids = mixAnswerOptions(defend).map((o) => o.id);
    // AKs mixes 3bet and call; 99 mixes call and fold; nothing mixes 3bet and fold.
    expect(ids).toEqual(['threeBet', 'call', 'fold', 'threeBet+call', 'call+fold']);
  });

  it('grades right, close and wrong by distance', () => {
    expect(scoreMixAnswer({ raise: 0.6 }, { raise: 0.5 })).toMatchObject({ verdict: 'right', accuracy: 1 });
    // The main action of a 60/40 hand alone is 0.4 away: close.
    expect(scoreMixAnswer({ raise: 0.6 }, { raise: 1 })).toMatchObject({ verdict: 'close', accuracy: 0.5 });
    expect(scoreMixAnswer({ raise: 1 }, { fold: 1 })).toMatchObject({ verdict: 'wrong', accuracy: 0 });
    // Raising half the time with a hand that always folds is wrong, not close.
    expect(scoreMixAnswer({ fold: 1 }, { raise: 0.5 })).toMatchObject({ verdict: 'wrong' });
    // Raising a quarter of the time with a pure fold is a quarter off: close, not right.
    expect(scoreMixAnswer({ fold: 1 }, { raise: 0.25 })).toMatchObject({ verdict: 'close' });
  });

  it('never calls one action of a real mix a miss', () => {
    // 97s 3bets half the time and calls half: a pure 3bet or a pure call is part of the mix.
    expect(scoreMixAnswer({ threeBet: 0.5, call: 0.5 }, { threeBet: 1 })).toMatchObject({ verdict: 'close', accuracy: 0.5 });
    expect(scoreMixAnswer({ threeBet: 0.5, call: 0.5 }, { call: 1 })).toMatchObject({ verdict: 'close' });
    // Folding a hand that folds 30% of the time (fold is implied).
    expect(scoreMixAnswer({ raise: 0.7 }, { fold: 1 })).toMatchObject({ verdict: 'close' });
    // An action played under a quarter of the time is still a miss.
    expect(scoreMixAnswer({ raise: 0.85, call: 0.15 }, { call: 1 })).toMatchObject({ verdict: 'wrong' });
    expect(partOfMix({ raise: 0.25 }, { raise: 1 })).toBe(true);
    expect(partOfMix({ raise: 0.5 }, { raise: 0.5 })).toBe(false);
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

describe('mix answers between the buttons', () => {
  // BB vs a button open: 83s calls 25% and folds 75%. The buttons offer fold, call, 3bet and 50/50 pairs.
  const chartMix = { call: 0.25, fold: 0.75 };
  const offered: HandMix[] = [{ '3bet': 1 }, { call: 1 }, { fold: 1 }, { '3bet': 0.5, call: 0.5 }, { call: 0.5 }];

  it('counts the closest buttons as right when no button matches the mix', () => {
    expect(scoreMixAnswer(chartMix, { fold: 1 }, offered).verdict).toBe('right');
    expect(scoreMixAnswer(chartMix, { call: 0.5 }, offered).verdict).toBe('right');
    expect(scoreMixAnswer(chartMix, { call: 1 }, offered).verdict).toBe('close');
    expect(scoreMixAnswer(chartMix, { '3bet': 1 }, offered).verdict).toBe('wrong');
  });

  it('keeps the usual tolerance when a button matches', () => {
    expect(scoreMixAnswer({ call: 0.5 }, { fold: 1 }, offered).verdict).toBe('close');
    expect(scoreMixAnswer({ call: 0.5 }, { call: 0.5 }, offered).verdict).toBe('right');
  });
});

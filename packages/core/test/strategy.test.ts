import { describe, expect, it } from 'vitest';
import { actionFrequencies, buildChart, cardStrength, gradeDecision, gradeOutcome, Rating, State, type StrategyNode } from '../src';

const node: StrategyNode = {
  pot: 10,
  actions: [
    { id: 'check', label: 'Check', frequency: 0.35, ev: 4.1 },
    { id: 'bet33', label: 'Bet 33%', frequency: 0.6, ev: 4.2 },
    { id: 'bet150', label: 'Bet 150%', frequency: 0.05, ev: 3.0 },
  ],
};

describe('gradeDecision', () => {
  it('treats meaningful mixes as correct and grades the rest by EV loss', () => {
    expect(gradeDecision(node, 'bet33').grade).toBe('best');
    expect(gradeDecision(node, 'check').grade).toBe('correct');
    const overbet = gradeDecision(node, 'bet150');
    expect(overbet.evLoss).toBeCloseTo(1.2);
    expect(overbet.grade).toBe('mistake');
  });
});

describe('buildChart', () => {
  it('gives later actions only the leftover frequency', () => {
    const chart = buildChart({
      id: 't',
      title: 't',
      game: 'cash',
      tableSize: 6,
      stackBb: 100,
      spot: 'vs-open',
      basis: 'gto',
      hero: 'BB',
      source: 'custom',
      actions: [
        { id: '3bet', label: '3bet', range: 'AA, A5s:0.6' },
        { id: 'call', label: 'Call', range: 'AA, A2s-A5s' },
      ],
    });
    expect(chart.mixes.get('AA')).toEqual({ '3bet': 1 });
    expect(chart.mixes.get('A5s')!['3bet']).toBeCloseTo(0.6);
    expect(chart.mixes.get('A5s')!.call).toBeCloseTo(0.4);
    expect(chart.mixes.get('72o')).toEqual({ fold: 1 });
    const totals = actionFrequencies(chart);
    expect(totals['3bet'] + totals.call + totals.fold).toBeCloseTo(1);
  });
});

describe('gradeOutcome', () => {
  it('rewards fast correct recall and punishes misses', () => {
    expect(gradeOutcome({ accuracy: 1, responseMs: 1500, targetMs: 2000 })).toBe(Rating.Easy);
    expect(gradeOutcome({ accuracy: 1, responseMs: 4000, targetMs: 2000 })).toBe(Rating.Good);
    expect(gradeOutcome({ accuracy: 0.8, responseMs: 1000, targetMs: 2000 })).toBe(Rating.Hard);
    expect(gradeOutcome({ accuracy: 0.3, responseMs: 1000, targetMs: 2000 })).toBe(Rating.Again);
  });
});

describe('cardStrength', () => {
  it('separates unseen, learning and solid cards', () => {
    expect(cardStrength(undefined)).toBe('new');
    expect(cardStrength({ state: State.Learning, stability: 20 })).toBe('learning');
    expect(cardStrength({ state: State.Review, stability: 3 })).toBe('learning');
    expect(cardStrength({ state: State.Review, stability: 9 })).toBe('solid');
  });
});

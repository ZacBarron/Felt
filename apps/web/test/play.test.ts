import { BOTS } from '@felt/content';
import { act, type Card, FULL_DECK, legalActions, parseCards, type PreflopSpot, preflopSpot, startHandWithDeck } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { approxRange, chartForSpot, chartPosition, gradeHand, HERO, isClearFold, PLAY_ORDER, playPercentile, seatsFor } from '../src/state/play';

/** A deck that deals `holes` (by seat, dealt from the small blind) and then `board`. */
function deckFor(seats: number, button: number, holes: string[], board = ''): Card[] {
  const sb = seats === 2 ? button : (button + 1) % seats;
  const top: Card[] = [];
  const cards = holes.map((h) => parseCards(h));
  for (let round = 0; round < 2; round++) for (let k = 0; k < seats; k++) top.push(cards[(sb + k) % seats][round]);
  top.push(...parseCards(board));
  return [...top, ...FULL_DECK.filter((c) => !top.includes(c))];
}

const others = ['KdQd', 'JcTc', '9h8h', '7d6d', '5c4c', '3h2h', 'Kc2s', 'Qh3s'];
/** 9 handed with the player under the gun: the button is seat 6. */
const utgHand = (hero: string) => startHandWithDeck({ stacks: Array(9).fill(100), button: 6 }, deckFor(9, 6, [hero, ...others]));

describe('chartPosition', () => {
  it('matches seats by the players behind them', () => {
    expect(chartPosition('UTG', 9)).toBe('UTG');
    expect(chartPosition('UTG', 7)).toBe('UTG+2');
    expect(chartPosition('BTN', 6)).toBe('BTN');
    expect(chartPosition('BTN', 2)).toBeUndefined();
  });
});

describe('chartForSpot', () => {
  it('finds the open chart for the first player in', () => {
    const s = utgHand('AsAh');
    expect(s.players[HERO].position).toBe('UTG');
    const found = chartForSpot(preflopSpot(s, HERO));
    expect(found?.chart.spec.spot).toBe('rfi');
    expect(found?.exact).toBe(true);
  });

  it('is not exact when the open has a caller', () => {
    // 6 handed with the button on seat 1: UTG is seat 4, HJ seat 5 and the player the CO.
    let s = startHandWithDeck({ stacks: Array(6).fill(100), button: 1 }, deckFor(6, 1, ['AsKs', 'KdQd', 'JcTc', '9h8h', '7d6d', '5c4c']));
    // UTG opens and HJ calls.
    while (s.toAct !== HERO) s = act(s, s.log.some((a) => a.kind === 'raise') ? { kind: 'call' } : { kind: 'raise', to: 2.5 });
    const spot = preflopSpot(s, HERO);
    expect(spot.callers).toBeGreaterThan(0);
    expect(chartForSpot(spot)?.exact ?? false).toBe(false);
  });
});

describe('isClearFold', () => {
  it('skips only hands the chart always folds', () => {
    expect(isClearFold(utgHand('AdKh'))).toBe(false);
    expect(isClearFold(utgHand('7c2d'))).toBe(true);
    expect(isClearFold(utgHand('AsAh'))).toBe(false);
  });
});

describe('gradeHand', () => {
  it('grades preflop decisions by the chart', () => {
    const seats = seatsFor(9, BOTS.map((b) => b.id));
    const s = utgHand('AsAh');
    const raise = { kind: 'raise' as const, to: 2.5 };
    const fold = { kind: 'fold' as const };
    const good = gradeHand([{ state: s, action: raise }], seats, 1);
    expect(good[0]).toMatchObject({ tier: 'chart', grade: 'best', chart: { hand: 'AA' } });
    const bad = gradeHand([{ state: s, action: fold }], seats, 1);
    expect(bad[0]).toMatchObject({ tier: 'chart', grade: 'mistake' });
  });
});

describe('approxRange', () => {
  const spot = (over: Partial<PreflopSpot>): PreflopSpot => ({ kind: 'open', position: 'UTG', tableSize: 9, limpers: 0, raisers: [], callers: 0, reraised: false, raiseTo: 1, stackBb: 100, ...over });

  it('orders hands the way the opening charts add them', () => {
    expect(PLAY_ORDER[0]).toBe('AA');
    expect(playPercentile('AA')).toBe(0);
    expect(playPercentile('AKs')).toBeLessThan(playPercentile('K9o'));
    expect(playPercentile('72o')).toBeGreaterThan(0.9);
  });

  it('raises the best hands and folds trash in every spot', () => {
    const kinds: Partial<PreflopSpot>[] = [
      { kind: 'raised', position: 'HJ', raisers: ['UTG'], raiseTo: 2.5 },
      { kind: 'raised', position: 'CO', raisers: ['UTG'], callers: 1, raiseTo: 2.5 },
      { kind: '3bet', position: 'CO', raisers: ['CO', 'BTN'], reraised: true, raiseTo: 7.5 },
      { kind: '4bet', position: 'BTN', raisers: ['BTN', 'BB', 'BTN'], reraised: true, raiseTo: 24 },
      { kind: 'limped', position: 'CO', limpers: 1 },
    ];
    for (const k of kinds) {
      expect(approxRange(spot(k), 'AA').mix.raise).toBe(1);
      expect(approxRange(spot(k), '72o').mix.fold).toBe(1);
    }
  });

  it('lets the big blind check trash in a limped pot and defend wider than others', () => {
    expect(approxRange(spot({ kind: 'limped', position: 'BB', limpers: 2 }), '72o').mix.call).toBe(1);
    const bb = approxRange(spot({ kind: 'raised', position: 'BB', raisers: ['CO'], raiseTo: 2.5 }), 'K8o').width;
    const hj = approxRange(spot({ kind: 'raised', position: 'HJ', raisers: ['CO'], raiseTo: 2.5 }), 'K8o').width;
    expect(bb).toBeGreaterThan(hj);
  });

  it('opens most hands on the button heads up', () => {
    expect(approxRange(spot({ position: 'BTN', tableSize: 2 }), 'K7o').mix.raise).toBe(1);
  });
});

describe('every preflop decision is graded', () => {
  it('grades spots no chart covers by the approximate range', () => {
    const seats = seatsFor(9, BOTS.map((b) => b.id));
    for (let seed = 1; seed <= 60; seed++) {
      let s = startHandWithDeck({ stacks: Array(9).fill(100), button: seed % 9 }, deckFor(9, seed % 9, ['AsAh', 'KdQd', 'JcTc', '9h8h', '7d6d', '5c4c', '3h2h', 'Kc2s', 'Qh3s']));
      // A random line of limps and raises before the player.
      let k = seed;
      while (s.toAct !== HERO && s.toAct !== null) {
        const legal = legalActions(s);
        k = (k * 31 + 7) % 97;
        s = act(s, k % 3 === 0 && legal.raise ? { kind: 'raise', to: legal.raise.min } : k % 3 === 1 ? { kind: 'fold' } : legal.check ? { kind: 'check' } : { kind: 'call' });
      }
      if (s.toAct !== HERO) continue;
      const action = legalActions(s).check ? { kind: 'check' as const } : { kind: 'call' as const };
      const [g] = gradeHand([{ state: s, action }], seats, seed);
      expect(g.tier === 'chart' || g.tier === 'approx').toBe(true);
      expect(g.grade).toBeDefined();
      if (g.tier === 'approx') expect(g.rated).toBe(false);
    }
  });
});

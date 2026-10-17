import { BOTS } from '@felt/content';
import { act, type Card, FULL_DECK, type HandState, legalActions, parseCards, type PlayAction, type PreflopSpot, preflopSpot, seededRng, startHand, startHandWithDeck } from '@felt/core';
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

  /** 9 handed with the player in the CO (button on seat 1) after `before` acts. */
  const coAfter = (hero: string, before: (s: HandState) => PlayAction, setup: { straddle?: number } = {}) => {
    let s = startHandWithDeck({ stacks: Array(9).fill(100), button: 1, ...setup }, deckFor(9, 1, [hero, ...others]));
    while (s.toAct !== HERO) s = act(s, before(s));
    return s;
  };
  const limp = () => ({ kind: 'call' as const });
  const openTo = (to: number) => (s: HandState) => (s.log.some((a) => a.kind === 'raise') ? { kind: 'fold' as const } : { kind: 'raise' as const, to });

  it('skips trash facing a live size open the chart does not match exactly', () => {
    const s = coAfter('7c2d', openTo(5));
    expect(chartForSpot(preflopSpot(s, HERO))?.exact ?? false).toBe(false);
    expect(isClearFold(s)).toBe(true);
    expect(isClearFold(coAfter('AsAh', openTo(5)))).toBe(false);
  });

  it('skips trash in spots no chart covers, like 3 limpers', () => {
    const s = coAfter('7c2d', limp);
    expect(preflopSpot(s, HERO).limpers).toBeGreaterThan(2);
    expect(isClearFold(s)).toBe(true);
    expect(isClearFold(coAfter('AsAh', limp))).toBe(false);
  });

  it('skips trash in a straddled pot and heads up', () => {
    expect(isClearFold(coAfter('7c2d', (s) => (legalActions(s).fold ? { kind: 'fold' } : { kind: 'check' }), { straddle: 2 }))).toBe(true);
    expect(isClearFold(coAfter('AsAh', (s) => (legalActions(s).fold ? { kind: 'fold' } : { kind: 'check' }), { straddle: 2 }))).toBe(false);
    // Heads up the player is the big blind facing a raise.
    const hu = (hero: string) => act(startHandWithDeck({ stacks: [100, 100], button: 1 }, deckFor(2, 1, [hero, 'KdQd'])), { kind: 'raise', to: 2.5 });
    expect(isClearFold(hu('7c2d'))).toBe(true);
    expect(isClearFold(hu('AsAh'))).toBe(false);
    expect(isClearFold(hu('Kc7d'))).toBe(false);
  });

  it('never skips a hand the big blind can check', () => {
    // Everyone limps to the player in the big blind (button on seat 7).
    let s = startHandWithDeck({ stacks: Array(9).fill(100), button: 7 }, deckFor(9, 7, ['7c2d', ...others]));
    while (s.toAct !== HERO) s = act(s, { kind: 'call' });
    expect(legalActions(s).check).toBe(true);
    expect(isClearFold(s)).toBe(false);
  });

  it('only skips hands the grade would call a best fold', () => {
    const seats = seatsFor(9, BOTS.map((b) => b.id));
    let skipped = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const rng = seededRng(seed);
      const n = 2 + (seed % 8);
      let s = startHand({ stacks: Array.from({ length: n }, () => 40 + Math.floor(rng() * 160)), button: seed % n, straddle: seed % 5 === 0 ? 2 : 0 }, rng);
      while (s.toAct !== HERO && s.toAct !== null) {
        const legal = legalActions(s);
        const r = rng();
        s = act(s, r < 0.2 && legal.raise ? { kind: 'raise', to: Math.min(legal.raise.max, legal.raise.min + Math.floor(r * 20)) } : r < 0.6 ? (legal.fold ? { kind: 'fold' } : { kind: 'check' }) : legal.check ? { kind: 'check' } : { kind: 'call' });
      }
      if (s.toAct !== HERO || !isClearFold(s)) continue;
      skipped++;
      const [g] = gradeHand([{ state: s, action: { kind: 'fold' } }], seats, seed);
      expect(g.grade).toBe('best');
    }
    expect(skipped).toBeGreaterThan(100);
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

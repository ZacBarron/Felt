import { describe, expect, it } from 'vitest';
import {
  BOARD_TEXTURES,
  betShare,
  cardsToString,
  combosOf,
  comboRangeText,
  continueShare,
  dealBoard,
  flopTexture,
  generateSpot,
  parseCards,
  parseComboRange,
  parseRange,
  pickRiverDecision,
  PostflopSolver,
  RIVER_SIZES,
  seededRandom,
  solverActionId,
  strengthIn,
} from '../src';

const c = parseCards;

describe('board textures', () => {
  it('classes known flops', () => {
    expect(flopTexture(c('Kd7s2c'))).toBe('dry-high');
    expect(flopTexture(c('Ad8s3c'))).toBe('ace-high');
    expect(flopTexture(c('JhTh4c'))).toBe('wet');
    expect(flopTexture(c('KdKs4c'))).toBe('paired');
    expect(flopTexture(c('Ah8h3h'))).toBe('monotone');
    expect(flopTexture(c('7d6s4c'))).toBe('low-connected');
    expect(flopTexture(c('QdJsTc'))).toBe('wet');
  });

  it('deals five distinct cards with a flop of the texture asked, avoiding dead cards', () => {
    const rand = seededRandom(5);
    for (const t of BOARD_TEXTURES) {
      for (let i = 0; i < 20; i++) {
        const dead = c('AsKs');
        const b = dealBoard(t, rand, dead);
        expect(new Set(b).size).toBe(5);
        expect(b.some((x) => dead.includes(x))).toBe(false);
        expect(flopTexture(b.slice(0, 3))).toBe(t);
      }
    }
  });
});

describe('range narrowing', () => {
  it('expands class weights into combos off the board', () => {
    const r = combosOf(parseRange('AA, KQs:0.5'), c('As7d2c'));
    expect(r.filter((x) => x.weight === 1)).toHaveLength(3);
    expect(r.filter((x) => x.weight === 0.5)).toHaveLength(4);
  });

  it('ranks made hands and lifts draws', () => {
    const board = c('Jh8h2c');
    const range = [
      { cards: c('JdJc') as [number, number], weight: 1 },
      { cards: c('AhKh') as [number, number], weight: 1 },
      { cards: c('Ts9s') as [number, number], weight: 1 },
      { cards: c('5d4d') as [number, number], weight: 1 },
    ];
    const q = strengthIn(range, board);
    expect(q[0]).toBeGreaterThan(q[3]);
    // Ace high with a flush draw plays like at least a strong draw; T9 has an open ender.
    expect(q[1]).toBeGreaterThanOrEqual(0.55);
    expect(q[2]).toBeGreaterThanOrEqual(0.5);
    // On the river there are no draws.
    const r = strengthIn(range, c('Jh8h2c3s4s'));
    expect(r.every((x) => x >= 0 && x <= 1)).toBe(true);
  });

  it('bets wide when small and polar when big, and defends near the minimum', () => {
    expect(betShare(0.9, 0.33)).toBeGreaterThan(betShare(0.4, 0.33));
    expect(betShare(0.9, 0.75)).toBeGreaterThan(0.9);
    expect(betShare(0.55, 0.75)).toBeLessThan(betShare(0.2, 0.33));
    expect(continueShare(0.33)).toBeCloseTo(1 / 1.33 + 0.05, 6);
    expect(continueShare(0.75)).toBeLessThan(continueShare(0.33));
    expect(continueShare(10)).toBe(0.3);
  });
});

const ranges = [parseRange('22+, A2s+, K9s+, QTs+, JTs, T9s, 98s, 87s, ATo+, KJo+'), parseRange('22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, A8o+, KTo+, QTo+, JTo')] as const;
const setup = { ranges: [ranges[0], ranges[1]] as [Map<string, number>, Map<string, number>], aggressor: 1 as const, pot: 5.5, stack: 97.5 };

describe('generated spots', () => {
  it('replays the same hand from the same seed', () => {
    const a = generateSpot(setup, 3, seededRandom(3));
    const b = generateSpot(setup, 3, seededRandom(3));
    expect(a).toEqual(b);
    expect(generateSpot(setup, 4, seededRandom(4)).board).not.toEqual(a.board);
  });

  it('keeps pots, stacks and ranges consistent', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = generateSpot(setup, seed, seededRandom(seed));
      let pot = setup.pot;
      for (const st of s.streets) {
        expect(st.pot).toBeCloseTo(pot, 6);
        if (st.action.kind === 'bet') pot = Math.round((pot + 2 * st.action.amount) * 10) / 10;
      }
      expect(s.river.pot).toBeCloseTo(pot, 6);
      expect(s.river.stack).toBeGreaterThanOrEqual(s.river.pot * 0.5 - 1e-9);
      for (const r of s.river.ranges) {
        for (const x of r) {
          expect(s.board.some((b) => x.cards.includes(b))).toBe(false);
          expect(x.weight).toBeGreaterThanOrEqual(0.02);
          expect(x.weight).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('narrows the caller after a bet', () => {
    // Force a texture and look for a flop bet: the caller then holds fewer combos than it started with.
    let checked = 0;
    for (let seed = 1; seed < 60 && checked < 5; seed++) {
      const s = generateSpot(setup, seed, seededRandom(seed), 'dry-high');
      if (s.streets[0].action.kind !== 'bet') continue;
      const start = combosOf(ranges[0], s.board).reduce((t, x) => t + x.weight, 0);
      const end = s.river.ranges[0].reduce((t, x) => t + x.weight, 0);
      expect(end).toBeLessThan(start * 0.9);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('writes combo ranges the solver can read back', () => {
    const s = generateSpot(setup, 8, seededRandom(8));
    const text = comboRangeText(s.river.ranges[1]);
    const back = parseComboRange(text, s.board);
    expect(back).toHaveLength(s.river.ranges[1].length);
    expect(back.reduce((t, x) => t + x.weight, 0)).toBeCloseTo(s.river.ranges[1].reduce((t, x) => t + x.weight, 0), 6);
  });
});

describe('river decisions', () => {
  const spot = generateSpot(setup, 11, seededRandom(11));
  const solver = new PostflopSolver({
    board: spot.board,
    pot: spot.river.pot,
    effectiveStack: spot.river.stack,
    ranges: spot.river.ranges,
    sizes: { river: [{ bet: RIVER_SIZES[0], raise: [] }, { bet: RIVER_SIZES[1], raise: [] }] },
  });
  const exploitability = solver.solve({ targetPct: 0.3, maxIterations: 2000 });

  it('solves accurately and names actions by pot share', () => {
    expect(exploitability).toBeLessThanOrEqual(0.5);
    const root = solver.root;
    if (root.kind !== 'action') throw new Error('no decision');
    const ids = root.actions.map((a) => solverActionId(a, root.pot));
    expect(ids).toContain('check');
    expect(ids).toContain('bet33');
    expect(ids).toContain('bet75');
  });

  it('picks a line the villain takes and a hand where the choice matters', () => {
    for (const hero of [0, 1] as const) {
      const pick = pickRiverDecision(solver, hero, seededRandom(hero + 1));
      expect(pick).toBeDefined();
      expect(pick!.gap).toBeGreaterThanOrEqual(0.03);
      // The hero holds the hand, and the line ends at the hero's decision.
      expect(solver.hands[hero].cards.some((x) => cardsToString(x) === cardsToString(pick!.heroCards))).toBe(true);
      let path: number[] = [];
      for (const id of pick!.line) {
        const { node } = solver.walk(path);
        if (node.kind !== 'action') throw new Error('line leaves the tree');
        path = [...path, node.actions.findIndex((a) => solverActionId(a, node.pot) === id)];
      }
      const { node } = solver.walk(path);
      expect(node.kind === 'action' && node.player === hero).toBe(true);
      // The same seed picks the same decision.
      expect(pickRiverDecision(solver, hero, seededRandom(hero + 1))).toEqual(pick);
    }
  });

  it('finds nothing when no choice matters', () => {
    expect(pickRiverDecision(solver, 0, seededRandom(1), 100)).toBeUndefined();
  });
});

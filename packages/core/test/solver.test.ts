import { describe, expect, it } from 'vitest';
import { parseCards, parseRange, rangeToCombos, PostflopSolver, type WeightedCombo } from '../src';

const combos = (range: string, board: string): WeightedCombo[] => rangeToCombos(parseRange(range), parseCards(board));

describe('postflop solver', () => {
  it('matches the analytic polarized river game: bluff share and MDF', () => {
    // In position holds sets of kings (value) or six five (air). Out of position holds
    // only queen jack, a pure bluff catcher. One pot sized bet, no raises.
    const board = 'KsQd7h4c2s';
    const solver = new PostflopSolver({
      board: parseCards(board),
      pot: 10,
      effectiveStack: 100,
      ranges: [combos('QJ', board), combos('KK, 65', board)],
      sizes: { river: [{ bet: [], raise: [] }, { bet: [1], raise: [] }] },
      allIn: false,
    });
    const exp = solver.solve({ maxIterations: 3000, targetPct: 0.05 });
    expect(exp).toBeLessThan(0.1);

    // In position: bet every set, and bluff so that bluffs are a third of the bets.
    const { node, reach } = solver.walk([0]); // out of position checks
    if (node.kind !== 'action') throw new Error('expected action');
    const byClass = solver.classStrategy(node, reach[1]);
    const bet = node.actions.findIndex((a) => a.kind === 'bet');
    expect(byClass.get('KK')!.mix[bet]).toBeGreaterThan(0.99);
    // 3 value combos need 1.5 bluff combos out of 16 six fives.
    expect(byClass.get('65s')!.weight + byClass.get('65o')!.weight).toBeCloseTo(16, 6);
    const bluffRate = (byClass.get('65s')!.mix[bet] * 4 + byClass.get('65o')!.mix[bet] * 12) / 16;
    expect(bluffRate).toBeCloseTo(1.5 / 16, 2);

    // Out of position calls exactly MDF against a pot sized bet: 50%.
    const facing = solver.walk([0, bet]);
    if (facing.node.kind !== 'action') throw new Error('expected action');
    const call = facing.node.actions.findIndex((a) => a.kind === 'call');
    expect(solver.aggregate(facing.node, facing.reach[0])[call]).toBeCloseTo(0.5, 1);

    // Game value: in position wins the pot with sets, and earns from the bluffs being exactly break even.
    const [ev0, ev1] = solver.rangeEV();
    expect(ev0 + ev1).toBeCloseTo(10, 6);
  });

  it('converges on a real river spot with raises and all ins', () => {
    const board = 'Ah9c6d2s2h';
    const solver = new PostflopSolver({
      board: parseCards(board),
      pot: 20,
      effectiveStack: 80,
      ranges: [combos('A2s+, K9s+, 99-66, 87s, T8s', board), combos('AT+, 99, 66, 22, KQs, JTs, 87s, 75s', board)],
    });
    const exp = solver.solve({ maxIterations: 600, targetPct: 0.3 });
    expect(exp).toBeLessThan(0.5);
    const [ev0, ev1] = solver.rangeEV();
    expect(ev0 + ev1).toBeCloseTo(20, 4);
  });

  it('solves a turn spot through every river card', () => {
    const board = 'Kh8d4c3s';
    const solver = new PostflopSolver({
      board: parseCards(board),
      pot: 10,
      effectiveStack: 30,
      ranges: [combos('KQ, 88, 44, 65s, QJs', board), combos('KK, KJ, 99, A5s, 76s', board)],
      sizes: {
        turn: [{ bet: [0.5], raise: [] }, { bet: [0.75], raise: [] }],
        river: [{ bet: [0.75], raise: [] }, { bet: [0.75], raise: [] }],
      },
      maxRaises: 1,
    });
    const exp = solver.solve({ maxIterations: 400, targetPct: 0.5 });
    expect(exp).toBeLessThan(1);
  });

  it('values an all in before the river by its runout equity', () => {
    // Out of position can only check or shove; in position can only call or fold.
    const board = 'Kh8d4c3s';
    const solver = new PostflopSolver({
      board: parseCards(board),
      pot: 10,
      effectiveStack: 10,
      ranges: [[{ cards: parseCards('AhKs') as [number, number], weight: 1 }], [{ cards: parseCards('Qh9h') as [number, number], weight: 1 }]],
      sizes: { turn: [{ bet: [], raise: [] }, { bet: [], raise: [] }] },
    });
    solver.solve({ maxIterations: 300, targetPct: 0.01 });
    expect(solver.exploitability()).toBeLessThan(0.05);
    // Queen nine of hearts has 9 outs in 44 cards, 20.5%, but needs 33% to call: it folds,
    // so shoving wins the whole pot instead of 79.5% of it by checking down.
    const [ev0, ev1] = solver.rangeEV();
    expect(ev0).toBeCloseTo(10, 2);
    expect(ev1).toBeCloseTo(0, 2);
  });
});

import { buildChart, cardsToString, flopTexture, parseCards, parseComboRange, pickRiverDecision, PostflopSolver, seededRandom, solverActionId } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { BANKED_SCENARIOS, chartSpec, generatedScenario, parseScenarioCode, scenarioCode, scenarioTemplate, scenarioTemplates, templateSpot } from '../src';
import { SCENARIO_BANK } from '../src/scenarioBank';

/**
 * Generated scenarios: templates read from the chart library, hands that
 * replay the same from a seed, and a bank of seeds whose river decision was
 * checked with Aced Solver at build time.
 */

const solverFor = (code: string) => {
  const s = generatedScenario(code)!;
  const board = parseCards(s.river.board);
  return new PostflopSolver({
    board,
    pot: s.river.pot,
    effectiveStack: s.river.stack,
    ranges: [parseComboRange(s.river.ranges[0], board), parseComboRange(s.river.ranges[1], board)],
    sizes: { river: [{ bet: s.river.sizes[0], raise: s.river.raises }, { bet: s.river.sizes[1], raise: s.river.raises }] },
  });
};

describe('scenario templates', () => {
  const all = scenarioTemplates();

  it('covers single raised and 3bet pots at both table sizes, every stack, from either seat', () => {
    expect(all.length).toBeGreaterThan(400);
    for (const potType of ['srp', '3bp'] as const)
      for (const table of [6, 9])
        for (const stack of [40, 60, 100, 150, 200])
          for (const hero of [0, 1] as const) expect(all.some((t) => t.potType === potType && t.tableSize === table && t.stackBb === stack && t.hero === hero), `${potType} ${table} ${stack} ${hero}`).toBe(true);
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
  });

  it('counts only hand written charts toward the rating', () => {
    for (const t of all) {
      expect(t.rated).toBe(t.stackBb === 100);
      for (const r of t.rangeCharts) expect(chartSpec(r.chart)!.source).toBe(t.rated ? 'starter-approx' : 'model-approx');
    }
  });

  it('puts the right money in the pot', () => {
    const t = scenarioTemplate('srp-9-btn-bb-100-h1')!;
    expect(t.seats).toEqual(['BB', 'BTN']);
    expect(t.aggressor).toBe(1);
    expect(t.pot).toBe(5.5);
    expect(t.stack).toBe(97.5);
    const co = scenarioTemplate('srp-9-co-btn-100-h0')!;
    // The blinds fold: 2.5 + 2.5 + 1.5 dead.
    expect(co.pot).toBe(6.5);
    const three = scenarioTemplate('3bp-9-btn-bb-100-h0')!;
    expect(three.seats).toEqual(['BB', 'BTN']);
    expect(three.aggressor).toBe(0);
    expect(three.pot).toBe(22.5);
    expect(three.stack).toBe(89);
    const sb = scenarioTemplate('srp-9-sb-bb-100-h0')!;
    expect(sb.pot).toBe(6);
    expect(sb.seats).toEqual(['SB', 'BB']);
  });

  it('builds each side from the chart action that gets it there', () => {
    const t = scenarioTemplate('srp-9-btn-bb-100-h0')!;
    expect(t.rangeCharts).toEqual([
      { chart: '9max-100-bb-vs-btn', action: 'call' },
      { chart: '9max-100-rfi-btn', action: 'raise' },
    ]);
    expect(t.heroChart).toBe('9max-100-bb-vs-btn');
    const spot = templateSpot(t, 7);
    const call = buildChart(chartSpec('9max-100-bb-vs-btn')!);
    // Every combo the big blind holds on the river called the open some of the time.
    for (const c of spot.river.ranges[0]) {
      const [a, b] = c.cards;
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      const cls = '23456789TJQKA'[hi >> 2] + '23456789TJQKA'[lo >> 2] + (hi >> 2 === lo >> 2 ? '' : (hi & 3) === (lo & 3) ? 's' : 'o');
      expect(call.mixes.get(cls)!.call ?? 0, cls).toBeGreaterThan(0);
    }
  });
});

describe('generated hands', () => {
  it('replay the same from a seed, with pots that add up', () => {
    const t = scenarioTemplates().find((x) => x.potType === 'srp' && x.rated)!;
    for (let seed = 1; seed < 40; seed++) {
      const a = templateSpot(t, seed);
      expect(templateSpot(t, seed)).toEqual(a);
      expect(new Set(a.board).size).toBe(5);
      expect(flopTexture(a.board.slice(0, 3))).toBe(a.texture);
      let pot = t.pot;
      let stack = t.stack;
      for (const s of a.streets) {
        expect(s.pot).toBeCloseTo(pot, 6);
        if (s.action.kind === 'bet') {
          expect(s.action.amount).toBeCloseTo(Math.round(s.action.size * pot * 10) / 10, 6);
          pot = Math.round((pot + 2 * s.action.amount) * 10) / 10;
          stack = Math.round((stack - s.action.amount) * 10) / 10;
        }
      }
      expect(a.river.pot).toBeCloseTo(pot, 6);
      expect(a.river.stack).toBeCloseTo(stack, 6);
      // Enough behind for a real river decision.
      expect(a.river.stack).toBeGreaterThanOrEqual(a.river.pot * 0.5 - 1e-9);
      for (const r of a.river.ranges) for (const c of r) expect(a.board.includes(c.cards[0]) || a.board.includes(c.cards[1])).toBe(false);
    }
  });

  it('round trips codes and refuses hands outside the range', () => {
    const code = scenarioCode('srp-9-btn-bb-100-h1', 12, ['check'], 'AhKd');
    expect(parseScenarioCode(code)).toEqual({ template: 'srp-9-btn-bb-100-h1', seed: 12, line: ['check'], heroCards: 'AhKd' });
    expect(parseScenarioCode(scenarioCode('x-y', 3, [], 'AhKd'))!.line).toEqual([]);
    expect(parseScenarioCode('g.bad')).toBeUndefined();
    expect(generatedScenario('g.nope-100-h0.1.first.AhKd')).toBeUndefined();
    // 72o never opens from the button.
    expect(generatedScenario(scenarioCode('srp-9-btn-bb-100-h1', 12, ['check'], '7h2d'))).toBeUndefined();
  });
});

describe('the scenario bank', () => {
  it('holds distinct hands across textures, pot types, seats and stacks', () => {
    expect(SCENARIO_BANK.length).toBeGreaterThanOrEqual(150);
    expect(new Set(BANKED_SCENARIOS).size).toBe(BANKED_SCENARIOS.length);
    const specs = BANKED_SCENARIOS.map((c) => generatedScenario(c)!);
    const textures = new Set(SCENARIO_BANK.map(([t, seed]) => templateSpot(scenarioTemplate(t)!, seed).texture));
    expect(textures.size).toBe(6);
    expect(new Set(specs.map((s) => s.generated!.potType)).size).toBe(2);
    expect(new Set(specs.map((s) => s.generated!.tableSize)).size).toBe(2);
    expect(new Set(specs.map((s) => s.generated!.stackBb)).size).toBe(5);
    expect(new Set(specs.map((s) => `${s.hero.seat}-${s.villain.seat}`)).size).toBeGreaterThan(30);
    expect(specs.filter((s) => s.generated!.rated).length).toBeGreaterThanOrEqual(120);
  });

  it('replays every entry to a hand the hero holds, on a line the tree has', () => {
    for (const code of BANKED_SCENARIOS) {
      const s = generatedScenario(code);
      expect(s, code).toBeDefined();
      expect(s!.river.ranges.every((r) => r.length > 0)).toBe(true);
      expect(s!.title).not.toMatch(/[—–;]/);
      expect(s!.river.explain).not.toMatch(/[—–;]/);
      // Walk the line by solver action ids. No solve is needed to check the tree.
      const solver = solverFor(code);
      let path: number[] = [];
      for (const id of s!.river.line) {
        const { node } = solver.walk(path);
        expect(node.kind, code).toBe('action');
        if (node.kind !== 'action') break;
        const i = node.actions.findIndex((a) => solverActionId(a, node.pot) === id);
        expect(i, `${code} ${id}`).toBeGreaterThanOrEqual(0);
        path = [...path, i];
      }
      const { node } = solver.walk(path);
      expect(node.kind === 'action' && node.player === s!.river.hero, code).toBe(true);
    }
  });

  it('gives a river decision that matters, solved accurately', () => {
    // A sample, since solving all of them takes a while. The builder checked every one.
    for (const code of BANKED_SCENARIOS.filter((_, i) => i % 37 === 0)) {
      const solver = solverFor(code);
      const ex = solver.solve({ targetPct: 0.3, maxIterations: 2000 });
      expect(ex, code).toBeLessThanOrEqual(0.5);
      const s = generatedScenario(code)!;
      const pick = pickRiverDecision(solver, s.river.hero, seededRandom(s.generated!.seed ^ 0x5bd1e995));
      expect(pick, code).toBeDefined();
      // The build picked this exact decision.
      expect(pick!.line).toEqual(s.river.line);
      expect(cardsToString([...pick!.heroCards].sort((a, b) => b - a))).toBe(s.hero.cards);
      expect(pick!.gap).toBeGreaterThanOrEqual(0.03);
    }
  }, 120_000);
});


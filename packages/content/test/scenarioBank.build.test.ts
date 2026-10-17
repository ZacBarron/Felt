import { BOARD_TEXTURES, cardsToString, hashString, pickRiverDecision, PostflopSolver, RIVER_SIZES, seededRandom, shuffled } from '@felt/core';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scenarioTemplates, templateSpot } from '../src';

/**
 * Builds the scenario bank (src/scenarioBank.ts). Skipped in normal test
 * runs: `pnpm bank:scenarios` runs it. Each candidate hand is solved with
 * the same settings the app uses, and kept when the solve is accurate
 * (0.5% of the pot or better) and the hero's river decision matters (the
 * best and worst actions differ by at least 3% of the pot). Textures,
 * table sizes, pot types, hero sides and decision types are spread.
 */

const RATED = 150;
const UNRATED = 40;

describe.skipIf(!process.env.BUILD_SCENARIO_BANK)('scenario bank', () => {
  it('builds', () => {
    const all = scenarioTemplates();
    const rand = seededRandom(20261017);
    const bank: [string, number, string, string][] = [];
    const perTexture = new Map<string, number>();
    const perTemplate = new Map<string, number>();
    const started = performance.now();
    let tried = 0;
    let solveMs = 0;
    for (const [rated, quota] of [
      [true, RATED],
      [false, UNRATED],
    ] as const) {
      const pool = all.filter((t) => t.rated === rated);
      let kept = 0;
      for (let round = 0; kept < quota && round < 40; round++) {
        for (const t of shuffled(pool, rand)) {
          if (kept >= quota) break;
          if ((perTemplate.get(t.id) ?? 0) > round) continue;
          const seed = (hashString(`${t.id}|${round}`) % 900_000) + 100_000;
          const spot = templateSpot(t, seed);
          tried++;
          const cap = Math.ceil((RATED + UNRATED) / BOARD_TEXTURES.length) + 2;
          if ((perTexture.get(spot.texture) ?? 0) >= cap) continue;
          if (spot.river.ranges.some((r) => r.length < 12)) continue;
          const t0 = performance.now();
          const solver = new PostflopSolver({
            board: spot.board,
            pot: spot.river.pot,
            effectiveStack: spot.river.stack,
            ranges: spot.river.ranges,
            sizes: { river: [{ bet: RIVER_SIZES[0], raise: [] }, { bet: RIVER_SIZES[1], raise: [] }] },
          });
          const ex = solver.solve({ targetPct: 0.3, maxIterations: 2000 });
          solveMs += performance.now() - t0;
          if (ex > 0.5) continue;
          const pick = pickRiverDecision(solver, t.hero, seededRandom(seed ^ 0x5bd1e995));
          if (!pick) continue;
          bank.push([t.id, seed, pick.line.join('-'), cardsToString([...pick.heroCards].sort((a, b) => b - a))]);
          perTexture.set(spot.texture, (perTexture.get(spot.texture) ?? 0) + 1);
          perTemplate.set(t.id, (perTemplate.get(t.id) ?? 0) + 1);
          kept++;
        }
      }
    }
    const rows = bank.map((b) => `  [${JSON.stringify(b[0])}, ${b[1]}, ${JSON.stringify(b[2])}, ${JSON.stringify(b[3])}],`).join('\n');
    const file = `/**
 * Banked generated scenarios: [template, seed, river line, hero cards].
 * Written by \`pnpm bank:scenarios\` (test/scenarioBank.build.test.ts), which
 * solves each candidate with Aced Solver and keeps those whose river
 * decision matters. test/scenarioBank.test.ts checks every entry still
 * replays to the same hand.
 */
export const SCENARIO_BANK: [template: string, seed: number, line: string, hero: string][] = [
${rows}
];
`;
    writeFileSync(new URL('../src/scenarioBank.ts', import.meta.url), file);
    console.log(
      `banked ${bank.length} of ${tried} candidates in ${((performance.now() - started) / 1000).toFixed(1)}s, solving ${(solveMs / 1000).toFixed(1)}s`,
      Object.fromEntries(perTexture),
    );
    expect(bank.length).toBe(RATED + UNRATED);
  }, 900_000);
});

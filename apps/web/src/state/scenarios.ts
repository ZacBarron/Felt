import { BANKED_SCENARIOS, findScenario as findIn, parseScenarioCode, SCENARIOS, type ScenarioSpec, type ScenarioTemplate, scenarioTemplate, scenarioTemplates } from '@felt/content';
import { type GameSettings, noveltyPick } from '@felt/core';
import { dealGenerated } from './scenarioSolve';
import { markSeen, scenarioKey, seenMap } from './seen';

/**
 * Scenarios come from two places: the hand written set, and generated hands
 * (a bank of seeds checked at build time, plus fresh hands dealt on the
 * device). Hands played recently wait their turn, and the next hand is
 * spread across seats, pot types, stacks and table sizes.
 */

/** A hand written scenario or a generated one, by id. */
export const findScenario = (id: string): ScenarioSpec | undefined => findIn(id, SCENARIOS);

/** Hand written scenarios, and generated ones from hand written charts, count toward the Aced Rating. */
export const scenarioRated = (s: ScenarioSpec) => !s.generated || s.generated.rated;

/** Hands played within this window wait until nothing fresher is left. */
const SCENARIO_WINDOW_MS = 30 * 24 * 3600 * 1000;

/** Labels for spreading hands, read from the id alone so a long list stays fast. */
function facetsOf(id: string): string[] {
  const code = parseScenarioCode(id);
  const t = code && scenarioTemplate(code.template);
  if (!t) {
    const s = SCENARIOS.find((x) => x.id === id);
    return s ? [`seats:${s.hero.seat}-${s.villain.seat}`, 'pot:srp', 'stack:100', 'table:9', 'kind:hand-written'] : [];
  }
  return [`seats:${t.seats[t.hero]}-${t.seats[1 - t.hero]}`, `pot:${t.potType}`, `stack:${t.stackBb}`, `table:${t.tableSize}`, `hero:${t.hero}`];
}

/**
 * The next hands to offer. Hand written hands not played yet come first,
 * then hand written and banked hands mixed, with hands at the player's table
 * size a little more often.
 */
export function nextScenarios(played: ReadonlySet<string>, { n = 1, rand = Math.random, now = Date.now(), tableSize }: { n?: number; rand?: () => number; now?: number; tableSize?: number } = {}): string[] {
  const unplayed = SCENARIOS.filter((s) => !played.has(s.id));
  if (unplayed.length) return unplayed.slice(0, n).map((s) => s.id);
  const pool = [...SCENARIOS.map((s) => s.id), ...BANKED_SCENARIOS];
  const seen = seenMap('s:');
  for (const id of played) if (!seen.has(scenarioKey(id))) seen.set(scenarioKey(id), now);
  return noveltyPick(pool, {
    n,
    key: scenarioKey,
    weight: (id) => (tableSize && facetsOf(id).includes(`table:${tableSize}`) ? 1.5 : 1),
    facets: facetsOf,
    seen,
    now,
    windowMs: SCENARIO_WINDOW_MS,
    rand,
  });
}

/** Marks a hand as played on this device, so the next hands are other ones. */
export const markScenarioSeen = (id: string) => markSeen([scenarioKey(id)]);

/** Templates for fresh hands: mostly 100bb (rated), mostly the player's table size, spread across seats. */
function pickTemplate(game: Pick<GameSettings, 'tableSize'> | undefined, rand: () => number): ScenarioTemplate {
  const all = scenarioTemplates();
  const seen = seenMap('t:');
  const [t] = noveltyPick(all, {
    n: 1,
    key: (x) => `t:${x.id}`,
    weight: (x) => (x.rated ? 3 : 1) * (game && x.tableSize === game.tableSize ? 2 : 1),
    seen,
    now: Date.now(),
    windowMs: 7 * 24 * 3600 * 1000,
    rand,
  });
  markSeen([`t:${t.id}`]);
  return t;
}

/**
 * Deals a brand new hand: a template, a random seed, a river solve on the
 * device and a hero decision that matters. Tries a few seeds, since some
 * hands have no river decision worth asking.
 */
export async function dealFreshScenario(game?: Pick<GameSettings, 'tableSize'>, rand = Math.random): Promise<string | undefined> {
  for (let tries = 0; tries < 4; tries++) {
    const t = pickTemplate(game, rand);
    const seed = 100_000 + Math.floor(rand() * 900_000);
    const code = await dealGenerated(t, seed);
    if (code) return code;
  }
  return undefined;
}

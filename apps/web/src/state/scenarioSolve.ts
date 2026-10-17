import { cardsToString, comboRangeText, RIVER_SIZES } from '@felt/core';
import { type ScenarioRiver, type ScenarioTemplate, scenarioCode, templateSpot } from '@felt/content';
import type { FromWorker, HandView, NodeView } from '../solver/protocol';

export interface RiverResult {
  hand: HandView;
  exploitability: number;
  seconds: number;
}

/** Solves started this visit, by scenario id, so a hand dealt on one screen is not solved again on the next. */
const solves = new Map<string, Promise<RiverResult>>();

/**
 * Solves a river with Aced Solver in a worker. With `heroCards` it follows
 * the line to the hero's decision and returns the EV of each action for
 * those cards. With `pick` it first picks the hero's decision itself, for a
 * generated hand (see pickRiverDecision in core).
 */
function runRiver(
  river: Pick<ScenarioRiver, 'board' | 'pot' | 'stack' | 'ranges' | 'sizes' | 'raises'> & { line?: string[] },
  opts: { heroCards: string } | { pick: { hero: 0 | 1; seed: number } },
): Promise<RiverResult & { line: string[]; heroCards: string }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../solver/solver.worker.ts', import.meta.url), { type: 'module' });
    const done = (fn: () => void) => {
      worker.terminate();
      fn();
    };
    let line = river.line ?? [];
    let heroCards = 'heroCards' in opts ? opts.heroCards : '';
    let path: number[] = [];
    let step = 0;
    let solved: { exploitability: number; seconds: number } | undefined;

    const nextNode = () => {
      if (step >= line.length) {
        worker.postMessage({ type: 'hand', path, cards: heroCards });
        return;
      }
      worker.postMessage({ type: 'node', path });
    };

    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const msg = e.data;
      if (msg.type === 'error') return done(() => reject(new Error(msg.message)));
      if (msg.type === 'solved') {
        solved = { exploitability: msg.exploitability, seconds: msg.seconds };
        if ('pick' in opts) {
          worker.postMessage({ type: 'pick', hero: opts.pick.hero, seed: opts.pick.seed });
          return;
        }
        return nextNode();
      }
      if (msg.type === 'picked') {
        if (!msg.pick) return done(() => reject(new Error('No river decision in this hand.')));
        line = msg.pick.line;
        heroCards = msg.pick.cards;
        return nextNode();
      }
      if (msg.type === 'node') {
        const view: NodeView = msg.view;
        const index = view.actions.findIndex((a) => a.id === line[step]);
        if (index < 0) return done(() => reject(new Error(`The line ${line.join(', ')} does not exist in this spot.`)));
        path = [...path, index];
        step++;
        return nextNode();
      }
      if (msg.type === 'hand')
        return done(() => resolve({ hand: msg.view, exploitability: solved!.exploitability, seconds: solved!.seconds, line, heroCards }));
    };
    worker.onerror = (e) => done(() => reject(new Error(e.message)));

    worker.postMessage({
      type: 'solve',
      spot: {
        board: river.board,
        pot: river.pot,
        stack: river.stack,
        ranges: river.ranges,
        sizes: {
          river: [
            { bet: river.sizes[0], raise: river.raises },
            { bet: river.sizes[1], raise: river.raises },
          ],
        },
        targetPct: 0.3,
        maxIterations: 2000,
      },
    });
  });
}

/**
 * Solves a scenario's river with Aced Solver in a worker, follows the line
 * to the hero's decision, and returns the EV of each action for the hero's
 * exact cards. Grades built on this are exact for the stated ranges.
 */
export function solveRiver(river: ScenarioRiver, heroCards: string, id?: string): Promise<RiverResult> {
  const cached = id ? solves.get(id) : undefined;
  if (cached) return cached;
  const run = runRiver(river, { heroCards });
  if (id) {
    solves.set(id, run);
    run.catch(() => solves.delete(id));
  }
  return run;
}

/**
 * Deals a new generated hand: plays the template from the seed, solves the
 * river, then picks a hero decision that matters. Returns the scenario code,
 * or undefined when this seed has no good decision. Measured in Node at
 * about 70ms a solve on average; phones take a few times longer.
 */
export async function dealGenerated(t: ScenarioTemplate, seed: number): Promise<string | undefined> {
  const spot = templateSpot(t, seed);
  if (spot.river.ranges.some((r) => r.length < 12)) return undefined;
  const river = {
    board: cardsToString(spot.board),
    pot: spot.river.pot,
    stack: spot.river.stack,
    ranges: [comboRangeText(spot.river.ranges[0]), comboRangeText(spot.river.ranges[1])] as [string, string],
    sizes: RIVER_SIZES,
    raises: [],
  };
  try {
    const r = await runRiver(river, { pick: { hero: t.hero, seed: seed ^ 0x5bd1e995 } });
    const code = scenarioCode(t.id, seed, r.line, r.heroCards);
    solves.set(code, Promise.resolve(r));
    return code;
  } catch {
    return undefined;
  }
}

export type ScenarioGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/**
 * Grade from the EV lost against the best action, as a share of the pot.
 * Actions the solver itself plays often count as good even when slightly
 * behind, since mixing is part of the strategy.
 */
export function gradeChoice(hand: HandView, chosen: number): { grade: ScenarioGrade; lossBb: number; lossPct: number; best: number } {
  const best = hand.evs.reduce((b, ev, i) => (ev > hand.evs[b] ? i : b), 0);
  const lossBb = Math.max(0, hand.evs[best] - hand.evs[chosen]);
  const lossPct = hand.pot > 0 ? lossBb / hand.pot : 0;
  const grade: ScenarioGrade =
    chosen === best ? 'best' : hand.strategy[chosen] >= 0.25 || lossPct < 0.02 ? 'good' : lossPct < 0.06 ? 'inaccuracy' : lossPct < 0.15 ? 'mistake' : 'blunder';
  return { grade, lossBb, lossPct, best };
}

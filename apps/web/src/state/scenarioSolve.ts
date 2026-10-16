import type { ScenarioRiver } from '@felt/content';
import type { FromWorker, HandView, NodeView } from '../solver/protocol';

export interface RiverResult {
  hand: HandView;
  exploitability: number;
  seconds: number;
}

/**
 * Solves a scenario's river with Suited Solver in a worker, follows the line
 * to the hero's decision, and returns the EV of each action for the hero's
 * exact cards. Grades built on this are exact for the stated ranges.
 */
export function solveRiver(river: ScenarioRiver, heroCards: string): Promise<RiverResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../solver/solver.worker.ts', import.meta.url), { type: 'module' });
    const done = (fn: () => void) => {
      worker.terminate();
      fn();
    };
    let path: number[] = [];
    let step = 0;
    let solved: { exploitability: number; seconds: number } | undefined;

    const nextNode = () => {
      if (step >= river.line.length) {
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
        return nextNode();
      }
      if (msg.type === 'node') {
        const view: NodeView = msg.view;
        const index = view.actions.findIndex((a) => a.id === river.line[step]);
        if (index < 0) return done(() => reject(new Error(`The line ${river.line.join(', ')} does not exist in this spot.`)));
        path = [...path, index];
        step++;
        return nextNode();
      }
      if (msg.type === 'hand') return done(() => resolve({ hand: msg.view, exploitability: solved!.exploitability, seconds: solved!.seconds }));
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

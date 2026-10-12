/// <reference lib="webworker" />
import { cardsToString, isTerminal, parseCards, parseRange, PostflopSolver, rangeToCombos, type SolverAction } from '@felt/core';
import type { FromWorker, NodeView, RangeInput, ToWorker } from './protocol';

const toRange = (r: RangeInput) => (typeof r === 'string' ? parseRange(r) : new Map(r));

let solver: PostflopSolver | undefined;
let stopped = false;

const post = (m: FromWorker) => (self as unknown as Worker).postMessage(m);

/** Stable ids so action colors match the rest of the app: bet75 is a 75% pot bet. */
function actionId(a: SolverAction, pot: number): string {
  if (a.kind === 'bet' || a.kind === 'raise') return `${a.kind}${Math.round((a.amount / pot) * 100)}`;
  return a.kind;
}

function view(path: number[]): NodeView {
  const { node, reach, board } = solver!.walk(path);
  const base = { board: cardsToString(board), actions: [], aggregate: [], classes: [], cards: [] };
  if (isTerminal(node)) return { ...base, kind: node.kind };
  if (node.kind === 'chance') return { ...base, kind: 'chance', cards: node.cards.map((c) => cardsToString([c])) };
  const classes = [...solver!.classStrategy(node, reach[node.player])].map(([cls, e]) => [cls, e.weight, e.mix] as [string, number, number[]]);
  return {
    ...base,
    kind: 'action',
    player: node.player,
    pot: node.pot,
    actions: node.actions.map((a) => ({ id: actionId(a, node.pot), label: a.label })),
    aggregate: solver!.aggregate(node, reach[node.player]),
    classes,
  };
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  try {
    if (msg.type === 'stop') {
      stopped = true;
      return;
    }
    if (msg.type === 'node') {
      if (!solver) throw new Error('Nothing solved yet');
      post({ type: 'node', path: msg.path, view: view(msg.path) });
      return;
    }
    const { spot } = msg;
    stopped = false;
    const board = parseCards(spot.board);
    solver = new PostflopSolver({
      board,
      pot: spot.pot,
      effectiveStack: spot.stack,
      ranges: [rangeToCombos(toRange(spot.ranges[0]), board), rangeToCombos(toRange(spot.ranges[1]), board)],
      sizes: spot.sizes,
    });
    const started = performance.now();
    let exploitability = Infinity;
    // Run in slices so a stop message can get through between them.
    const slice = () => {
      if (stopped || !solver) return finish();
      solver.run(board.length === 5 ? 50 : 25);
      exploitability = solver.exploitability();
      post({ type: 'progress', iterations: solver.iterations, exploitability });
      if (exploitability <= spot.targetPct || solver.iterations >= spot.maxIterations) return finish();
      setTimeout(slice, 0);
    };
    const finish = () =>
      post({
        type: 'solved',
        iterations: solver!.iterations,
        exploitability,
        ev: solver!.rangeEV(),
        seconds: (performance.now() - started) / 1000,
        nodes: solver!.size,
      });
    slice();
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

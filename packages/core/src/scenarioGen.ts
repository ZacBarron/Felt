import { type Card, cardsToString, rankIndex, remainingDeck, suitIndex } from './cards';
import { drawsOf } from './bots';
import { evaluate } from './evaluator';
import { handClassCombos, type HandClass, type WeightedCombo } from './ranges';
import { shuffled } from './novelty';
import type { PostflopSolver, SolverAction } from './solver';

/**
 * Generated scenarios: heads up hands played to the river from real
 * preflop ranges, with a board of a chosen texture and a believable line.
 *
 * Two parts, and the app says which is which:
 * - The flop and turn are a model. Each player's range is narrowed street by
 *   street with simple stated rules (strong hands and draws bet and call,
 *   weak hands check and fold). This is our estimate of who gets to the river.
 * - The river is solved exactly by Aced Solver for those ranges, and the
 *   hero's decision is graded by the EV each action loses.
 *
 * Everything is deterministic from a seed, so a bank of good seeds can be
 * checked at build time and replayed on any device.
 */

export type BoardTexture = 'dry-high' | 'ace-high' | 'wet' | 'paired' | 'monotone' | 'low-connected';

export const BOARD_TEXTURES: readonly BoardTexture[] = ['dry-high', 'ace-high', 'wet', 'paired', 'monotone', 'low-connected'];

/** Words for a texture, for summaries. */
export const TEXTURE_WORDS: Record<BoardTexture, string> = {
  'dry-high': 'a dry high board',
  'ace-high': 'an ace high board',
  wet: 'a wet board',
  paired: 'a paired board',
  monotone: 'a one suit board',
  'low-connected': 'a low connected board',
};

/**
 * The texture class of a flop. Each flop has exactly one, checked in this
 * order: paired, one suit, low and connected (nine high or lower, within 4
 * ranks), wet (two suits with two cards within 2 ranks, or all three within
 * 3 ranks), ace high, and otherwise dry and high.
 */
export function flopTexture(flop: readonly Card[]): BoardTexture {
  const ranks = flop.map(rankIndex).sort((a, b) => b - a);
  const suits = new Set(flop.map(suitIndex)).size;
  const spread = ranks[0] - ranks[2];
  if (new Set(ranks).size < 3) return 'paired';
  if (suits === 1) return 'monotone';
  if (ranks[0] <= 7 && spread <= 4) return 'low-connected';
  const close = ranks[0] - ranks[1] <= 2 || ranks[1] - ranks[2] <= 2;
  if ((suits === 2 && close) || spread <= 3) return 'wet';
  if (ranks[0] === 12) return 'ace-high';
  return 'dry-high';
}

/** A flop of the texture, then a turn and river, avoiding dead cards. */
export function dealBoard(texture: BoardTexture, rand: () => number, dead: readonly Card[] = []): Card[] {
  const deck = remainingDeck(dead);
  const draw = (from: Card[]) => from.splice(Math.floor(rand() * from.length), 1)[0];
  for (let tries = 0; tries < 2000; tries++) {
    const left = [...deck];
    const flop = [draw(left), draw(left), draw(left)];
    if (flopTexture(flop) !== texture) continue;
    return [...flop, draw(left), draw(left)];
  }
  const left = [...deck];
  return [draw(left), draw(left), draw(left), draw(left), draw(left)];
}

/** A range as exact combos with weights, the board's cards removed. */
export type ComboRange = WeightedCombo[];

/** Expands class weights into combos that miss the dead cards. */
export function combosOf(range: ReadonlyMap<HandClass, number>, dead: readonly Card[]): ComboRange {
  const blocked = new Set(dead);
  const out: ComboRange = [];
  for (const [hand, w] of range) {
    if (w <= 0) continue;
    for (const cards of handClassCombos(hand)) if (!blocked.has(cards[0]) && !blocked.has(cards[1])) out.push({ cards, weight: w });
  }
  return out;
}

/**
 * How strong each combo is on a board, 0 to 1: its share of the range it
 * beats on made hand strength, raised for draws (a flush draw plays like at
 * least 0.55, an open ender 0.5, a gutshot 0.35, both 0.7).
 */
export function strengthIn(range: ComboRange, board: readonly Card[]): number[] {
  const scores = range.map((c) => evaluate([...c.cards, ...board]));
  const order = range.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
  const total = range.reduce((t, c) => t + c.weight, 0) || 1;
  const pct = new Array<number>(range.length).fill(0);
  let below = 0;
  for (let k = 0; k < order.length; ) {
    // Ties share one percentile.
    let j = k;
    let tied = 0;
    while (j < order.length && scores[order[j]] === scores[order[k]]) tied += range[order[j++]].weight;
    for (let x = k; x < j; x++) pct[order[x]] = (below + tied / 2) / total;
    below += tied;
    k = j;
  }
  return range.map((c, i) => {
    if (board.length >= 5) return pct[i];
    const d = drawsOf(c.cards, board);
    const draw = d.flush && d.openEnded ? 0.7 : d.flush ? 0.55 : d.openEnded ? 0.5 : d.gutshot ? 0.35 : 0;
    return Math.max(pct[i], draw);
  });
}

/** How often a hand of strength `q` bets `size` (a share of the pot): small bets are wide, big bets are polar. */
export function betShare(q: number, size: number): number {
  if (size <= 0.4) return q >= 0.5 ? 0.9 : q >= 0.25 ? 0.45 : 0.55;
  return q >= 0.7 ? 0.95 : q >= 0.45 ? 0.3 : q >= 0.34 ? 0.75 : 0.3;
}

/** The share of a range that continues against a bet of `size` pots: a little above the minimum defense. */
export function continueShare(size: number): number {
  return Math.min(0.85, Math.max(0.3, 1 / (1 + size) + 0.05));
}

/** Keeps the strongest `share` of a range by weight, with a soft edge. */
function keepTop(range: ComboRange, q: readonly number[], share: number): ComboRange {
  const order = range.map((_, i) => i).sort((a, b) => q[b] - q[a]);
  const total = range.reduce((t, c) => t + c.weight, 0) || 1;
  const rank = new Array<number>(range.length).fill(0);
  let acc = 0;
  for (const i of order) {
    rank[i] = (acc + range[i].weight / 2) / total;
    acc += range[i].weight;
  }
  const edge = 0.06;
  return range.map((c, i) => ({ cards: c.cards, weight: c.weight * Math.min(1, Math.max(0, (share + edge - rank[i]) / (2 * edge))) }));
}

export type StreetAction = { kind: 'check' } | { kind: 'bet'; by: 0 | 1; size: number; amount: number };

export interface GenStreet {
  street: 'flop' | 'turn';
  board: Card[];
  /** Pot at the start of the street. */
  pot: number;
  action: StreetAction;
}

export interface GenSetup {
  /** Ranges at the flop: out of position, then in position. */
  ranges: [ReadonlyMap<HandClass, number>, ReadonlyMap<HandClass, number>];
  /** Who raised last before the flop: 0 out of position, 1 in position. */
  aggressor: 0 | 1;
  /** Pot at the flop and the stack behind, in big blinds. */
  pot: number;
  stack: number;
}

export interface GenSpot {
  seed: number;
  texture: BoardTexture;
  board: Card[];
  streets: GenStreet[];
  /** At the river: pot, stack behind and both ranges as combos. */
  river: { pot: number; stack: number; ranges: [ComboRange, ComboRange] };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Narrows both ranges for one street's action. */
function playStreet(ranges: [ComboRange, ComboRange], board: Card[], action: StreetAction, aggressor: 0 | 1): [ComboRange, ComboRange] {
  const q = [strengthIn(ranges[0], board), strengthIn(ranges[1], board)] as const;
  if (action.kind === 'bet') {
    const bettor = action.by;
    const caller = (1 - bettor) as 0 | 1;
    const out: [ComboRange, ComboRange] = [[], []];
    out[bettor] = ranges[bettor].map((c, i) => ({ cards: c.cards, weight: c.weight * betShare(q[bettor][i], action.size) }));
    out[caller] = keepTop(ranges[caller], q[caller], continueShare(action.size));
    // The out of position player who checked before an in position bet checked with the hands that do not lead.
    if (bettor === 1 && aggressor === 0) out[0] = out[0].map((c, i) => ({ cards: c.cards, weight: c.weight * (1 - betShare(q[0][i], 0.33)) }));
    return out;
  }
  // Checked through: the aggressor checked the hands it would not bet, and so did an in position player.
  return [
    aggressor === 0 ? ranges[0].map((c, i) => ({ cards: c.cards, weight: c.weight * (1 - betShare(q[0][i], 0.33)) })) : ranges[0],
    ranges[1].map((c, i) => ({ cards: c.cards, weight: c.weight * (1 - betShare(q[1][i], 0.33)) })),
  ];
}

/**
 * Plays a hand from the flop to the river for a setup: deals a board of a
 * texture picked by the seed, picks a line, and narrows both ranges street
 * by street. Bets that would leave too little behind for a river decision
 * become checks.
 */
export function generateSpot(setup: GenSetup, seed: number, rand: () => number, texture?: BoardTexture): GenSpot {
  const tex = texture ?? BOARD_TEXTURES[Math.floor(rand() * BOARD_TEXTURES.length)];
  const board = dealBoard(tex, rand);
  let ranges: [ComboRange, ComboRange] = [combosOf(setup.ranges[0], board.slice(0, 3)), combosOf(setup.ranges[1], board.slice(0, 3))];
  let pot = setup.pot;
  let stack = setup.stack;
  const streets: GenStreet[] = [];
  const agg = setup.aggressor;
  let flopBet = false;
  for (const street of ['flop', 'turn'] as const) {
    const cards = board.slice(0, street === 'flop' ? 3 : 4);
    if (street === 'turn') ranges = ranges.map((r) => r.filter((c) => !c.cards.includes(cards[3]))) as [ComboRange, ComboRange];
    const r = rand();
    let action: StreetAction = { kind: 'check' };
    let by: 0 | 1 = agg;
    let size = 0;
    if (street === 'flop') {
      if (r < 0.5) size = 0.33;
      else if (r < 0.7) size = 0.75;
    } else if (flopBet) {
      if (r < 0.35) size = 0.75;
      else if (r < 0.55) size = 0.5;
    } else if (r < 0.4) size = 0.5;
    else if (r < 0.65 && agg === 1) {
      // A turn lead from the out of position player after the flop checked through.
      by = 0;
      size = 0.5;
    }
    const amount = round1(size * pot);
    // Keep enough behind for a river decision: at least half the pot after the call.
    if (size > 0 && stack - amount >= 0.5 * (pot + 2 * amount)) action = { kind: 'bet', by, size, amount };
    streets.push({ street, board: cards, pot, action });
    ranges = playStreet(ranges, cards, action, agg);
    if (action.kind === 'bet') {
      pot = round1(pot + 2 * action.amount);
      stack = round1(stack - action.amount);
      if (street === 'flop') flopBet = true;
    }
  }
  const river = board[4];
  const prune = (r: ComboRange) => r.filter((c) => !c.cards.includes(river) && c.weight >= 0.02).map((c) => ({ cards: c.cards, weight: Math.round(c.weight * 1000) / 1000 }));
  return { seed, texture: tex, board, streets, river: { pot, stack, ranges: [prune(ranges[0]), prune(ranges[1])] } };
}

/** Range text with exact combos and weights, for the solver and for storage. */
export function comboRangeText(range: ComboRange): string {
  return range.map((c) => `${cardsToString(c.cards)}${c.weight < 1 ? `:${c.weight}` : ''}`).join(', ');
}

/** Stable ids for solver actions so colors and lines match across the app: bet75 is a 75% pot bet. */
export function solverActionId(a: SolverAction, pot: number): string {
  if (a.kind === 'bet' || a.kind === 'raise') return `${a.kind}${Math.round((a.amount / pot) * 100)}`;
  return a.kind;
}

/** Bet sizes the river is solved with: a third pot and three quarters pot for each player. */
export const RIVER_SIZES: [number[], number[]] = [
  [0.33, 0.75],
  [0.33, 0.75],
];

export interface RiverPick {
  /** Actions before the hero's decision, by solver id. */
  line: string[];
  heroCards: [Card, Card];
  /** EV between the best and worst action for the hero's hand, as a share of the pot. */
  gap: number;
}

/**
 * After the river is solved, picks the hero's decision: a line the villain
 * really takes (at least 12% of the time), then a hand in the hero's range
 * that reaches it and for which the choice matters (the best and worst
 * actions differ by at least `minGap` of the pot). Undefined when no line
 * and hand qualify.
 */
export function pickRiverDecision(solver: PostflopSolver, hero: 0 | 1, rand: () => number, minGap = 0.03): RiverPick | undefined {
  const root = solver.root;
  if (root.kind !== 'action') return undefined;
  const ids = (path: number[]) => {
    const { node } = solver.walk(path);
    return node.kind === 'action' ? node.actions.map((a) => solverActionId(a, node.pot)) : [];
  };
  const often = (path: number[], index: number) => {
    const { node, reach } = solver.walk(path);
    if (node.kind !== 'action') return 0;
    return solver.aggregate(node, reach[node.player])[index] ?? 0;
  };
  // Candidate lines, as paths of action indices.
  const lines: number[][] = [];
  const rootIds = ids([]);
  if (hero === 0) {
    lines.push([]);
    const check = rootIds.indexOf('check');
    if (check >= 0) {
      const after = ids([check]);
      after.forEach((id, i) => {
        if (id.startsWith('bet') && often([check], i) >= 0.12) lines.push([check, i]);
      });
    }
  } else {
    rootIds.forEach((id, i) => {
      if ((id === 'check' || id.startsWith('bet')) && often([], i) >= 0.12) lines.push([i]);
    });
  }
  for (const path of shuffled(lines, rand)) {
    const { node, reach } = solver.walk(path);
    if (node.kind !== 'action' || node.player !== hero) continue;
    const hands = solver.hands[hero];
    const base = hands.weights;
    const strength = strengthIn(
      hands.cards.map((cards, i) => ({ cards, weight: base[i] })),
      solver.config.board,
    );
    const options: { i: number; gap: number; w: number }[] = [];
    for (let i = 0; i < hands.cards.length; i++) {
      // The hand reaches this decision most of the time it is held.
      if (reach[hero][i] < 0.25 * base[i] || base[i] <= 0) continue;
      const { evs } = solver.actionEVs(path, hands.cards[i]);
      const gap = (Math.max(...evs) - Math.min(...evs)) / node.pot;
      if (gap < minGap) continue;
      // Favor hands in the middle of the range, where the answer is not obvious: bluff catchers, thin value, bluffs.
      const q = strength[i];
      const middle = q >= 0.2 && q <= 0.85 ? 1 : 0.25;
      options.push({ i, gap, w: Math.min(gap, 0.3) * middle });
    }
    if (options.length === 0) continue;
    const total = options.reduce((t, o) => t + o.w, 0);
    let r = rand() * total;
    let pick = options[options.length - 1];
    for (const o of options) {
      r -= o.w;
      if (r < 0) {
        pick = o;
        break;
      }
    }
    const line = path.map((_, k) => ids(path.slice(0, k))[path[k]]);
    return { line, heroCards: hands.cards[pick.i], gap: pick.gap };
  }
  return undefined;
}

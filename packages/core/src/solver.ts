import type { Card } from './cards';
import { evaluate } from './evaluator';
import { handClassOf, type HandClass, type WeightedCombo } from './ranges';

/**
 * Heads up postflop solver.
 *
 * Discounted counterfactual regret minimization (DCFR, alpha 1.5, beta 0,
 * gamma 2) over a betting tree with user chosen sizes, solved per combo with
 * exact card removal. Chance nodes deal every remaining turn and river card,
 * so the answer is an equilibrium of the abstracted game, not an estimate.
 *
 * Accuracy is measured, not assumed: `exploitability()` computes a best
 * response for each player against the other's average strategy and reports
 * how much a perfect opponent could gain, as a share of the starting pot.
 *
 * Player 0 is out of position (acts first on every street), player 1 is in
 * position. Amounts are in big blinds. Utilities are chips won relative to
 * the start of the spot: the starting pot is up for grabs, and each player
 * risks what they put in during the spot.
 */

export type Street = 'flop' | 'turn' | 'river';
export type Player = 0 | 1;

export interface StreetSizes {
  /** Bet sizes as fractions of the pot. */
  bet: number[];
  /** Raise sizes as fractions of the pot after calling. */
  raise: number[];
}

/** Sizes for [out of position, in position]. */
export type PlayerSizes = [StreetSizes, StreetSizes];

export interface SolverConfig {
  /** 3, 4 or 5 cards. */
  board: readonly Card[];
  /** Pot at the start of the spot. */
  pot: number;
  /** Effective stack behind at the start of the spot. */
  effectiveStack: number;
  /** [out of position, in position]. Combos that touch the board are dropped. */
  ranges: [readonly WeightedCombo[], readonly WeightedCombo[]];
  /** Sizes per street. Streets left out use `DEFAULT_SIZES`. */
  sizes?: Partial<Record<Street, PlayerSizes>>;
  /** Offer an all in option at every decision. Default true. */
  allIn?: boolean;
  /** A bet that would leave less than this share of the pot behind becomes all in. Default 0.1. */
  allInMerge?: number;
  /** Maximum raises per street. Default 2. */
  maxRaises?: number;
}

export const DEFAULT_SIZES: PlayerSizes = [
  { bet: [0.33, 0.75], raise: [0.6] },
  { bet: [0.33, 0.75], raise: [0.6] },
];

export type ActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface SolverAction {
  kind: ActionKind;
  /** Chips this action adds for the actor. */
  amount: number;
  /** Total the actor has put in on this street after the action. */
  to: number;
  label: string;
}

export interface ActionNode {
  kind: 'action';
  player: Player;
  street: Street;
  /** Pot before this decision, including all bets so far. */
  pot: number;
  actions: SolverAction[];
  children: SolverNode[];
  /** regret[a * hands + i] for the acting player's hands. */
  regret: Float64Array;
  strategySum: Float64Array;
}

export interface ChanceNode {
  kind: 'chance';
  street: Street;
  cards: Card[];
  children: SolverNode[];
  /** Number of unseen cards for a fixed pair of hands: the chance divisor. */
  outcomes: number;
}

export interface TerminalNode {
  kind: 'fold' | 'showdown';
  /** Player who folded, for fold nodes. */
  folder?: Player;
  /** Chips each player put in during the spot. */
  contrib: [number, number];
  board?: BoardContext;
}

export type SolverNode = ActionNode | ChanceNode | TerminalNode;

export function isTerminal(node: SolverNode): node is TerminalNode {
  return node.kind === 'fold' || node.kind === 'showdown';
}

interface BoardContext {
  ranks: [Int32Array, Int32Array];
  order: [Int32Array, Int32Array];
}

interface Hands {
  cards: [Card, Card][];
  c1: Int32Array;
  c2: Int32Array;
  weights: Float64Array;
  /** Index of the identical combo in the other player's list, or -1. */
  same: Int32Array;
  /** Hands that contain each card. */
  withCard: Int32Array[];
}

function makeHands(list: WeightedCombo[], other: Map<number, number>, key: (c: [Card, Card]) => number): Hands {
  const cards = list.map((c) => c.cards);
  const buckets: number[][] = Array.from({ length: 52 }, () => []);
  cards.forEach(([a, b], i) => {
    buckets[a].push(i);
    buckets[b].push(i);
  });
  return {
    cards,
    c1: Int32Array.from(cards.map((c) => c[0])),
    c2: Int32Array.from(cards.map((c) => c[1])),
    weights: Float64Array.from(list.map((c) => c.weight)),
    same: Int32Array.from(cards.map((c) => other.get(key(c)) ?? -1)),
    withCard: buckets.map((b) => Int32Array.from(b)),
  };
}

const STREETS: Street[] = ['flop', 'turn', 'river'];
const streetOf = (boardLength: number): Street => STREETS[boardLength - 3];

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export class PostflopSolver {
  readonly config: SolverConfig;
  readonly root: SolverNode;
  readonly hands: [Hands, Hands];
  iterations = 0;
  private nodeCount = 0;
  /** Reused buffers for terminal evaluation, which never recurses. */
  private scratch: { cardTotal: Float64Array; card: Float64Array; win: Float64Array; lose: Float64Array };

  constructor(config: SolverConfig) {
    if (config.board.length < 3 || config.board.length > 5) throw new Error('Board needs 3 to 5 cards');
    this.config = config;
    const dead = new Set(config.board);
    const keep = (r: readonly WeightedCombo[]) => r.filter((c) => c.weight > 0 && !dead.has(c.cards[0]) && !dead.has(c.cards[1]));
    const r0 = keep(config.ranges[0]);
    const r1 = keep(config.ranges[1]);
    if (r0.length === 0 || r1.length === 0) throw new Error('A range is empty on this board');
    const key = (c: [Card, Card]) => Math.min(c[0], c[1]) * 64 + Math.max(c[0], c[1]);
    const index1 = new Map(r1.map((c, i) => [key(c.cards), i]));
    const index0 = new Map(r0.map((c, i) => [key(c.cards), i]));
    this.hands = [makeHands(r0, index1, key), makeHands(r1, index0, key)];
    const most = Math.max(r0.length, r1.length);
    this.scratch = { cardTotal: new Float64Array(52), card: new Float64Array(52), win: new Float64Array(most), lose: new Float64Array(most) };
    this.root = this.buildStreet([...config.board], [0, 0]);
  }

  get size(): number {
    return this.nodeCount;
  }

  // Tree ------------------------------------------------------------------

  private sizesFor(street: Street, player: Player): StreetSizes {
    return (this.config.sizes?.[street] ?? DEFAULT_SIZES)[player];
  }

  private buildStreet(board: Card[], contrib: [number, number]): SolverNode {
    const stack = this.config.effectiveStack;
    if (contrib[0] >= stack - 1e-9 || contrib[1] >= stack - 1e-9) return this.runout(board, contrib);
    return this.buildAction(board, contrib, 0, [0, 0], 0, false);
  }

  /** All in before the river: deal the rest with no more betting. */
  private runout(board: Card[], contrib: [number, number]): SolverNode {
    if (board.length === 5) return this.showdown(board, contrib);
    return this.chance(board, (next) => this.runout(next, contrib));
  }

  private chance(board: Card[], child: (next: Card[]) => SolverNode): ChanceNode {
    const used = new Set(board);
    const cards: Card[] = [];
    for (let c = 0; c < 52; c++) if (!used.has(c)) cards.push(c);
    this.nodeCount++;
    return {
      kind: 'chance',
      street: streetOf(board.length + 1),
      cards,
      children: cards.map((c) => child([...board, c])),
      outcomes: 52 - board.length - 4,
    };
  }

  private nextStreet(board: Card[], contrib: [number, number]): SolverNode {
    if (board.length === 5) return this.showdown(board, contrib);
    return this.chance(board, (next) => this.buildStreet(next, contrib));
  }

  private showdown(board: Card[], contrib: [number, number]): TerminalNode {
    this.nodeCount++;
    return { kind: 'showdown', contrib: [...contrib] as [number, number], board: this.boardContext(board) };
  }

  private boardCache = new Map<string, BoardContext>();

  private boardContext(board: Card[]): BoardContext {
    const id = [...board].sort((a, b) => a - b).join(',');
    const cached = this.boardCache.get(id);
    if (cached) return cached;
    const dead = new Set(board);
    const make = (h: Hands) => {
      const ranks = new Int32Array(h.cards.length).fill(-1);
      const valid: number[] = [];
      h.cards.forEach(([a, b], i) => {
        if (dead.has(a) || dead.has(b)) return;
        ranks[i] = evaluate([a, b, ...board]);
        valid.push(i);
      });
      valid.sort((x, y) => ranks[x] - ranks[y]);
      return { ranks, order: Int32Array.from(valid) };
    };
    const p0 = make(this.hands[0]);
    const p1 = make(this.hands[1]);
    const ctx: BoardContext = { ranks: [p0.ranks, p1.ranks], order: [p0.order, p1.order] };
    this.boardCache.set(id, ctx);
    return ctx;
  }

  /**
   * One decision. `street` holds what each player has put in on this street;
   * `contrib` holds totals for the spot before this street.
   */
  private buildAction(
    board: Card[],
    base: [number, number],
    player: Player,
    street: [number, number],
    raises: number,
    checked: boolean,
  ): SolverNode {
    const { pot, effectiveStack } = this.config;
    const total: [number, number] = [base[0] + street[0], base[1] + street[1]];
    const potNow = pot + total[0] + total[1];
    const other = (1 - player) as Player;
    const toCall = street[other] - street[player];
    const behind = effectiveStack - total[player];
    const merge = this.config.allInMerge ?? 0.1;
    const name = streetOf(board.length);
    const sizes = this.sizesFor(name, player);
    const actions: SolverAction[] = [];
    const children: SolverNode[] = [];
    const add = (action: SolverAction, child: () => SolverNode) => {
      if (actions.some((a) => a.kind === action.kind && Math.abs(a.amount - action.amount) < 1e-6)) return;
      actions.push(action);
      children.push(child());
    };
    const afterBet = (amount: number, kind: ActionKind) => {
      const next: [number, number] = [...street] as [number, number];
      next[player] += amount;
      return this.buildAction(board, base, other, next, kind === 'bet' ? raises : raises + 1, false);
    };
    const bets = (fractions: number[], kind: 'bet' | 'raise') => {
      const amounts: number[] = [];
      for (const f of fractions) {
        // A raise of f pot: call first, then add f times the pot after calling.
        let amount = kind === 'bet' ? f * potNow : toCall + f * (potNow + toCall);
        amount = round2(amount);
        if (amount >= behind || behind - amount < merge * (potNow + 2 * amount - toCall)) amount = behind;
        if (amount > toCall) amounts.push(amount);
      }
      return amounts;
    };

    if (toCall <= 1e-9) {
      add({ kind: 'check', amount: 0, to: street[player], label: 'Check' }, () =>
        checked || player === 1 ? this.nextStreet(board, total) : this.buildAction(board, base, other, street, raises, true),
      );
      for (const amount of bets(sizes.bet, 'bet')) {
        const allin = amount >= behind - 1e-9;
        add(
          { kind: allin ? 'allin' : 'bet', amount, to: street[player] + amount, label: allin ? `All in ${amount}` : `Bet ${amount}` },
          () => afterBet(amount, 'bet'),
        );
      }
      if ((this.config.allIn ?? true) && behind > 0)
        add({ kind: 'allin', amount: round2(behind), to: street[player] + behind, label: `All in ${round2(behind)}` }, () => afterBet(behind, 'bet'));
    } else {
      add({ kind: 'fold', amount: 0, to: street[player], label: 'Fold' }, () => {
        this.nodeCount++;
        return { kind: 'fold', folder: player, contrib: total };
      });
      const call = Math.min(toCall, behind);
      add({ kind: 'call', amount: round2(call), to: street[player] + call, label: `Call ${round2(call)}` }, () => {
        const next: [number, number] = [total[0], total[1]];
        next[player] += call;
        return this.nextStreet(board, next);
      });
      const otherBehind = effectiveStack - total[other];
      if (raises < (this.config.maxRaises ?? 2) && behind > toCall && otherBehind > 0) {
        for (const amount of bets(sizes.raise, 'raise')) {
          const allin = amount >= behind - 1e-9;
          add(
            { kind: allin ? 'allin' : 'raise', amount, to: street[player] + amount, label: allin ? `All in ${amount}` : `Raise to ${round2(street[player] + amount)}` },
            () => afterBet(amount, 'raise'),
          );
        }
        if (this.config.allIn ?? true)
          add({ kind: 'allin', amount: round2(behind), to: street[player] + behind, label: `All in ${round2(behind)}` }, () => afterBet(behind, 'raise'));
      }
    }

    this.nodeCount++;
    const n = this.hands[player].cards.length;
    return {
      kind: 'action',
      player,
      street: name,
      pot: round2(potNow),
      actions,
      children,
      regret: new Float64Array(actions.length * n),
      strategySum: new Float64Array(actions.length * n),
    };
  }

  // Solving ---------------------------------------------------------------

  /** Runs `n` more iterations (one update for each player per iteration). */
  run(n: number): void {
    for (let k = 0; k < n; k++) {
      const t = ++this.iterations;
      const pos = Math.pow(t, 1.5);
      const discount = { pos: pos / (pos + 1), neg: 0.5, strat: Math.pow(t / (t + 1), 2) };
      for (const p of [0, 1] as Player[]) {
        this.cfr(this.root, p, this.hands[p].weights.slice(), this.hands[1 - p].weights.slice(), discount);
      }
    }
  }

  /**
   * Solves until exploitability drops below `targetPct` percent of the pot or
   * `maxIterations` is reached. Returns the final exploitability.
   */
  solve({ maxIterations = 1000, targetPct = 0.3, checkEvery = 25, onProgress }: SolveOptions = {}): number {
    let exp = Infinity;
    while (this.iterations < maxIterations) {
      this.run(Math.min(checkEvery, maxIterations - this.iterations));
      exp = this.exploitability();
      onProgress?.(this.iterations, exp);
      if (exp <= targetPct) break;
    }
    return exp;
  }

  private currentStrategy(node: ActionNode, out: Float64Array): void {
    const n = this.hands[node.player].cards.length;
    const A = node.actions.length;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let a = 0; a < A; a++) sum += Math.max(0, node.regret[a * n + i]);
      for (let a = 0; a < A; a++) out[a * n + i] = sum > 0 ? Math.max(0, node.regret[a * n + i]) / sum : 1 / A;
    }
  }

  /** The average strategy: what the solver recommends. strategy[a * hands + i]. */
  averageStrategy(node: ActionNode): Float64Array {
    const n = this.hands[node.player].cards.length;
    const A = node.actions.length;
    const out = new Float64Array(A * n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let a = 0; a < A; a++) sum += node.strategySum[a * n + i];
      for (let a = 0; a < A; a++) out[a * n + i] = sum > 0 ? node.strategySum[a * n + i] / sum : 1 / A;
    }
    return out;
  }

  private cfr(node: SolverNode, p: Player, reachSelf: Float64Array, reachOpp: Float64Array, d: Discount): Float64Array {
    const n = this.hands[p].cards.length;
    if (isTerminal(node)) return this.terminal(node, p, reachOpp);
    if (node.kind === 'chance') return this.chanceValues(node, p, reachSelf, reachOpp, (child, rs, ro) => this.cfr(child, p, rs, ro, d));

    const A = node.actions.length;
    const sigma = new Float64Array(A * this.hands[node.player].cards.length);
    this.currentStrategy(node, sigma);
    if (node.player === p) {
      const values: Float64Array[] = [];
      const v = new Float64Array(n);
      for (let a = 0; a < A; a++) {
        const rs = new Float64Array(n);
        for (let i = 0; i < n; i++) rs[i] = reachSelf[i] * sigma[a * n + i];
        values.push(this.cfr(node.children[a], p, rs, reachOpp, d));
        for (let i = 0; i < n; i++) v[i] += sigma[a * n + i] * values[a][i];
      }
      for (let a = 0; a < A; a++) {
        for (let i = 0; i < n; i++) {
          const k = a * n + i;
          const r = node.regret[k];
          node.regret[k] = r * (r > 0 ? d.pos : d.neg) + values[a][i] - v[i];
          node.strategySum[k] = node.strategySum[k] * d.strat + reachSelf[i] * sigma[k];
        }
      }
      return v;
    }
    const m = this.hands[node.player].cards.length;
    const v = new Float64Array(n);
    for (let a = 0; a < A; a++) {
      const ro = new Float64Array(m);
      for (let j = 0; j < m; j++) ro[j] = reachOpp[j] * sigma[a * m + j];
      const child = this.cfr(node.children[a], p, reachSelf, ro, d);
      for (let i = 0; i < n; i++) v[i] += child[i];
    }
    return v;
  }

  private chanceValues(
    node: ChanceNode,
    p: Player,
    reachSelf: Float64Array,
    reachOpp: Float64Array,
    recurse: (child: SolverNode, rs: Float64Array, ro: Float64Array) => Float64Array,
  ): Float64Array {
    const self = this.hands[p];
    const opp = this.hands[1 - p];
    const n = self.c1.length;
    const v = new Float64Array(n);
    const inv = 1 / node.outcomes;
    for (let k = 0; k < node.cards.length; k++) {
      const card = node.cards[k];
      const rs = reachSelf.slice();
      const ro = reachOpp.slice();
      const blockedSelf = self.withCard[card];
      const blockedOpp = opp.withCard[card];
      for (let x = 0; x < blockedSelf.length; x++) rs[blockedSelf[x]] = 0;
      for (let x = 0; x < blockedOpp.length; x++) ro[blockedOpp[x]] = 0;
      const child = recurse(node.children[k], rs, ro);
      for (let x = 0; x < blockedSelf.length; x++) child[blockedSelf[x]] = 0;
      for (let i = 0; i < n; i++) v[i] += child[i] * inv;
    }
    return v;
  }

  /** Counterfactual values at a terminal: for each hand, payoff times opponent reach it does not block. */
  private terminal(node: TerminalNode, p: Player, reachOpp: Float64Array): Float64Array {
    const self = this.hands[p];
    const opp = this.hands[1 - p];
    const n = self.c1.length;
    const m = opp.c1.length;
    const pot = this.config.pot;
    const out = new Float64Array(n);
    const cardTotal = this.scratch.cardTotal.fill(0);
    const s1 = self.c1;
    const s2 = self.c2;
    const o1 = opp.c1;
    const o2 = opp.c2;
    const same = self.same;
    let total = 0;
    for (let j = 0; j < m; j++) {
      const r = reachOpp[j];
      if (r === 0) continue;
      total += r;
      cardTotal[o1[j]] += r;
      cardTotal[o2[j]] += r;
    }
    const compat = (i: number) => total - cardTotal[s1[i]] - cardTotal[s2[i]] + (same[i] >= 0 ? reachOpp[same[i]] : 0);

    if (node.kind === 'fold') {
      const folder = node.folder!;
      const payoff = folder === p ? -node.contrib[p] : pot + node.contrib[folder];
      for (let i = 0; i < n; i++) out[i] = payoff * compat(i);
      return out;
    }

    const c = node.contrib[p];
    const winPay = pot + node.contrib[1 - p];
    const losePay = -c;
    const tiePay = pot / 2 + (node.contrib[1 - p] - c) / 2;
    const ctx = node.board!;
    const hr = ctx.ranks[p];
    const or = ctx.ranks[1 - p];
    const ho = ctx.order[p];
    const oo = ctx.order[1 - p];
    const win = this.scratch.win;
    const lose = this.scratch.lose;
    const card = this.scratch.card.fill(0);

    // Opponent reach strictly below each hand, minus combos that share a card.
    let acc = 0;
    let k = 0;
    for (let x = 0; x < ho.length; x++) {
      const i = ho[x];
      while (k < oo.length && or[oo[k]] < hr[i]) {
        const j = oo[k++];
        const r = reachOpp[j];
        acc += r;
        card[o1[j]] += r;
        card[o2[j]] += r;
      }
      win[i] = acc - card[s1[i]] - card[s2[i]];
    }
    // And strictly above.
    acc = 0;
    card.fill(0);
    k = oo.length - 1;
    for (let x = ho.length - 1; x >= 0; x--) {
      const i = ho[x];
      while (k >= 0 && or[oo[k]] > hr[i]) {
        const j = oo[k--];
        const r = reachOpp[j];
        acc += r;
        card[o1[j]] += r;
        card[o2[j]] += r;
      }
      lose[i] = acc - card[s1[i]] - card[s2[i]];
    }
    for (let x = 0; x < ho.length; x++) {
      const i = ho[x];
      const tie = compat(i) - win[i] - lose[i];
      out[i] = winPay * win[i] + losePay * lose[i] + tiePay * tie;
    }
    return out;
  }

  // Evaluation ------------------------------------------------------------

  /**
   * Values for player p's hands when p best responds (`best`) or plays the
   * average strategy, against the other player's average strategy.
   */
  private evaluateNode(node: SolverNode, p: Player, reachSelf: Float64Array, reachOpp: Float64Array, best: boolean): Float64Array {
    const n = this.hands[p].cards.length;
    if (isTerminal(node)) return this.terminal(node, p, reachOpp);
    if (node.kind === 'chance') return this.chanceValues(node, p, reachSelf, reachOpp, (c, rs, ro) => this.evaluateNode(c, p, rs, ro, best));
    const A = node.actions.length;
    const avg = this.averageStrategy(node);
    if (node.player === p) {
      const v = new Float64Array(n).fill(best ? -Infinity : 0);
      for (let a = 0; a < A; a++) {
        const rs = new Float64Array(n);
        for (let i = 0; i < n; i++) rs[i] = best ? reachSelf[i] : reachSelf[i] * avg[a * n + i];
        const child = this.evaluateNode(node.children[a], p, rs, reachOpp, best);
        for (let i = 0; i < n; i++) v[i] = best ? Math.max(v[i], child[i]) : v[i] + avg[a * n + i] * child[i];
      }
      return v;
    }
    const m = this.hands[node.player].cards.length;
    const v = new Float64Array(n);
    for (let a = 0; a < A; a++) {
      const ro = new Float64Array(m);
      for (let j = 0; j < m; j++) ro[j] = reachOpp[j] * avg[a * m + j];
      const child = this.evaluateNode(node.children[a], p, reachSelf, ro, best);
      for (let i = 0; i < n; i++) v[i] += child[i];
    }
    return v;
  }

  /** Total weight of non-conflicting hand pairs: the normalizer for range EVs. */
  private pairWeight(): number {
    const [h0, h1] = this.hands;
    let total = 0;
    h0.cards.forEach(([a, b], i) => {
      h1.cards.forEach(([c, d], j) => {
        if (a !== c && a !== d && b !== c && b !== d) total += h0.weights[i] * h1.weights[j];
      });
    });
    return total;
  }

  private pairs?: number;

  /** Range EV for each player (average strategies), in chips. */
  rangeEV(): [number, number] {
    this.pairs ??= this.pairWeight();
    return [0, 1].map((p) => {
      const v = this.evaluateNode(this.root, p as Player, this.hands[p].weights.slice(), this.hands[1 - p].weights.slice(), false);
      let s = 0;
      for (let i = 0; i < v.length; i++) s += this.hands[p].weights[i] * v[i];
      return s / this.pairs!;
    }) as [number, number];
  }

  /**
   * How much a perfect opponent could win against these strategies, averaged
   * over both players, as a percent of the starting pot. Zero is an exact equilibrium.
   */
  exploitability(): number {
    this.pairs ??= this.pairWeight();
    let sum = 0;
    for (const p of [0, 1] as Player[]) {
      const v = this.evaluateNode(this.root, p, this.hands[p].weights.slice(), this.hands[1 - p].weights.slice(), true);
      for (let i = 0; i < v.length; i++) sum += this.hands[p].weights[i] * v[i];
    }
    const br = sum / this.pairs;
    return Math.max(0, ((br - this.config.pot) / 2 / this.config.pot) * 100);
  }

  /** EV of each of player p's hands at the root, in chips (NaN when no opponent combos are compatible). */
  handEVs(p: Player): Float64Array {
    const v = this.evaluateNode(this.root, p, this.hands[p].weights.slice(), this.hands[1 - p].weights.slice(), false);
    const opp = this.hands[1 - p];
    return v.map((x, i) => {
      const [a, b] = this.hands[p].cards[i];
      let w = 0;
      opp.cards.forEach(([c, d], j) => {
        if (a !== c && a !== d && b !== c && b !== d) w += opp.weights[j];
      });
      return w > 0 ? x / w : NaN;
    });
  }

  // Browsing --------------------------------------------------------------

  /**
   * Each player's reach (range weights times their own action probabilities)
   * at the node found by following `path` from the root. A path step is an
   * action index at action nodes and a card at chance nodes.
   */
  walk(path: readonly number[]): { node: SolverNode; reach: [Float64Array, Float64Array]; board: Card[] } {
    let node = this.root;
    const reach: [Float64Array, Float64Array] = [this.hands[0].weights.slice(), this.hands[1].weights.slice()];
    const board = [...this.config.board];
    for (const step of path) {
      if (node.kind === 'action') {
        const avg = this.averageStrategy(node);
        const n = this.hands[node.player].cards.length;
        const r = reach[node.player];
        for (let i = 0; i < n; i++) r[i] *= avg[step * n + i];
        node = node.children[step];
      } else if (node.kind === 'chance') {
        const k = node.cards.indexOf(step);
        if (k < 0) throw new Error('Card is not a chance outcome here');
        board.push(step);
        for (const p of [0, 1] as Player[])
          this.hands[p].cards.forEach(([a, b], i) => {
            if (a === step || b === step) reach[p][i] = 0;
          });
        node = node.children[k];
      } else {
        throw new Error('Path runs past the end of the hand');
      }
    }
    return { node, reach, board };
  }

  /**
   * Strategy at an action node grouped into the 169 hand classes, weighted by
   * how often each combo reaches the node. Returns action id to frequency per class.
   */
  classStrategy(node: ActionNode, reach: Float64Array): Map<HandClass, { weight: number; mix: number[] }> {
    const avg = this.averageStrategy(node);
    const hands = this.hands[node.player];
    const n = hands.cards.length;
    const out = new Map<HandClass, { weight: number; mix: number[] }>();
    hands.cards.forEach(([a, b], i) => {
      if (reach[i] <= 0) return;
      const cls = handClassOf(a, b);
      const entry = out.get(cls) ?? { weight: 0, mix: node.actions.map(() => 0) };
      entry.weight += reach[i];
      for (let x = 0; x < node.actions.length; x++) entry.mix[x] += reach[i] * avg[x * n + i];
      out.set(cls, entry);
    });
    for (const e of out.values()) e.mix = e.mix.map((m) => m / e.weight);
    return out;
  }

  /** Overall action frequencies at an action node for the acting player's range. */
  aggregate(node: ActionNode, reach: Float64Array): number[] {
    const avg = this.averageStrategy(node);
    const n = this.hands[node.player].cards.length;
    const totals = node.actions.map(() => 0);
    let w = 0;
    for (let i = 0; i < n; i++) {
      w += reach[i];
      for (let a = 0; a < node.actions.length; a++) totals[a] += reach[i] * avg[a * n + i];
    }
    return totals.map((t) => (w > 0 ? t / w : 0));
  }
}

interface Discount {
  pos: number;
  neg: number;
  strat: number;
}

export interface SolveOptions {
  maxIterations?: number;
  /** Stop once exploitability is at or below this percent of the pot. */
  targetPct?: number;
  checkEvery?: number;
  onProgress?: (iterations: number, exploitabilityPct: number) => void;
}

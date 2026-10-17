import type { Chart, ChartActionSpec, HandMix } from './charts';
import { preflopPercentile } from './preflopStrength';
import { ALL_HAND_CLASSES, comboCount, type HandClass } from './ranges';

/**
 * Derived charts: a documented rule that adjusts a hand written starter chart
 * to another stack depth or open size. It is an estimate, never a solve. Every
 * chart made this way carries the source 'model-approx', names the chart it
 * comes from, and the app says it is approximate and derived.
 *
 * The rule has two steps.
 *
 * 1. Width. Each hand gets a score: its continue frequency in the base chart,
 *    with pure hands ranked by strength above the mixed ones (premiums the
 *    base chart always plays are never cut), and hands the
 *    base chart folds ranked below zero by strength and playability (or by a
 *    wider chart when one is given). A tilt nudges hands that gain from deep
 *    stacks (pairs, suited connectors, suited wheel aces) up or down. Then
 *    one threshold moves through the scores until the range holds the target
 *    share of combos. The result keeps the base chart's order, so tightening
 *    removes its weakest hands first and widening adds the next ones, with
 *    graded edges in 5% steps like the hand written charts.
 *
 * 2. Split. Each continuing hand keeps the base chart's raise share. An
 *    aggression shift then moves high card calls to raises (short stacks, where
 *    flatting loses its implied odds) or moderate raises to calls (deep stacks,
 *    where 3bet pots get big). Premium hands keep raising. A raise width can
 *    then scale all raises, for example to cut flats more than 3bets facing a
 *    bigger open.
 *
 * The anchor numbers in STACK_RULES and openSizeRule are model choices that
 * follow the direction of published solver results at those depths and sizes.
 * Their sizes are rough. See docs/SOLVER_DATA.md.
 */

const RANKS = '23456789TJQKA';
const rankOf = (c: string) => RANKS.indexOf(c);
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const STEP = 20; // 5% steps
const step = (x: number) => Math.round(clamp(x) * STEP) / STEP;

/**
 * How much a hand gains from deep stacks, -1 to 1. Small pairs and suited
 * connectors make hidden strong hands and win big pots (+). Offsuit hands
 * with a weak kicker make dominated pairs and lose big pots (-). Premiums
 * play well at any depth (0).
 */
export function playability(hand: HandClass): number {
  const hi = rankOf(hand[0]);
  const lo = rankOf(hand[1]);
  if (hand.length === 2) {
    if (hi >= rankOf('Q')) return 0;
    if (hi >= rankOf('T')) return 0.15;
    if (hi >= rankOf('7')) return 0.6;
    return 1;
  }
  const suited = hand.endsWith('s');
  const gap = hi - lo - 1;
  if (hi === rankOf('A') && lo === rankOf('K')) return suited ? 0.1 : -0.1;
  let p = suited ? 0.25 : -0.45;
  if (suited) {
    if (hi === rankOf('A')) p += lo <= rankOf('5') ? 0.45 : 0.1;
    else p += [0.5, 0.35, 0.15, 0][Math.min(gap, 3)] + (hi <= rankOf('9') ? 0.15 : 0);
    if (lo >= rankOf('T')) p += 0.1;
  } else {
    if (lo >= rankOf('T')) p += 0.1;
    else if (hi >= rankOf('K')) p -= 0.35;
    else if (gap === 0) p += 0.25;
  }
  return clamp(p, -1, 1);
}

/** 1 for hands that raise at any depth (QQ+, AK), 0.5 for JJ and AQs, else 0. */
export function premium(hand: HandClass): number {
  if (['AA', 'KK', 'QQ', 'AKs', 'AKo'].includes(hand)) return 1;
  if (hand === 'JJ' || hand === 'AQs') return 0.5;
  return 0;
}

/** Share of the hand that continues (anything but fold). */
export function continueOf(mix: HandMix | undefined): number {
  if (!mix) return 0;
  let c = 0;
  for (const [id, f] of Object.entries(mix)) if (id !== 'fold') c += f;
  return c;
}

/** A change to a chart: how wide it plays and how it splits raises and calls. */
export interface VariantRule {
  /** Continuing combos as a share of the base chart's: below 1 tightens, above 1 widens. */
  width: number;
  /** -1 to 1. Positive favours hands that gain from deep stacks, negative favours high cards. */
  tilt: number;
  /** -1 to 1. Positive moves calls to raises, negative moves raises to calls. */
  aggression: number;
  /** Raise combos as a share of the base chart's raise combos. Missing leaves them as they fall. */
  raiseWidth?: number;
}

export const NO_CHANGE: VariantRule = { width: 1, tilt: 0, aggression: 0 };

export function combineRules(a: VariantRule, b: VariantRule): VariantRule {
  const raiseWidth = a.raiseWidth === undefined && b.raiseWidth === undefined ? undefined : (a.raiseWidth ?? 1) * (b.raiseWidth ?? 1);
  return { width: a.width * b.width, tilt: clamp(a.tilt + b.tilt, -1, 1), aggression: clamp(a.aggression + b.aggression, -1, 1), ...(raiseWidth === undefined ? {} : { raiseWidth }) };
}

export interface DeriveOptions {
  rule: VariantRule;
  /** The raise action: 'raise', '3bet', '4bet' or 'allin'. */
  raise: string;
  /** The flat action, when the chart has one. */
  call?: string;
  /** Hands that can reach the new spot. Missing keeps the base chart's reach. */
  reach?: ReadonlySet<HandClass>;
  /** A wider chart whose order decides which hands join first when widening. */
  wider?: Chart;
}

/** Combos a chart puts into one action, among allowed hands. */
export function actionCombos(chart: Chart, id: string, allowed: (h: HandClass) => boolean = () => true): number {
  let n = 0;
  for (const [h, m] of chart.mixes) if (allowed(h) && (!chart.reach || chart.reach.has(h))) n += (m[id] ?? 0) * comboCount(h);
  return n;
}

function combos(mixes: ReadonlyMap<HandClass, number>): number {
  let n = 0;
  for (const [h, f] of mixes) n += f * comboCount(h);
  return n;
}

/** Rank of each hand from 0 (worst) to 1 (best) by a score. */
function rank01(score: (h: HandClass) => number): Map<HandClass, number> {
  const sorted = [...ALL_HAND_CLASSES].sort((a, b) => score(a) - score(b));
  return new Map(sorted.map((h, i) => [h, i / (sorted.length - 1)]));
}

/**
 * New mixes for a variant of a chart. Every hand's mix sums to 1 (fold
 * included) and every frequency is a multiple of 5%.
 */
export function deriveMixes(base: Chart, opts: DeriveOptions): Map<HandClass, HandMix> {
  const { rule } = opts;
  const reach = opts.reach ?? base.reach;
  const allowed = (h: HandClass) => !reach || reach.has(h);
  const tilt = clamp(rule.tilt, -1, 1);

  const strength = rank01((h) => 1 - preflopPercentile(h) + 0.15 * tilt * playability(h));
  const play = rank01((h) => playability(h) + tilt * 0.3);
  const fallback = (h: HandClass) => {
    const own = 0.6 * strength.get(h)! + 0.4 * play.get(h)!;
    return opts.wider ? 0.85 * continueOf(opts.wider.mixes.get(h)) + 0.15 * own : own;
  };

  const baseCont = new Map<HandClass, number>();
  for (const h of ALL_HAND_CLASSES) baseCont.set(h, allowed(h) && (!base.reach || base.reach.has(h)) ? continueOf(base.mixes.get(h)) : 0);
  const pure = ALL_HAND_CLASSES.filter((h) => baseCont.get(h)! >= 1 - 1e-9).sort((a, b) => strength.get(a)! - strength.get(b)!);
  const inner = new Map(pure.map((h, i) => [h, pure.length > 1 ? i / (pure.length - 1) : 1]));

  const score = new Map<HandClass, number>();
  for (const h of ALL_HAND_CLASSES) {
    const b = baseCont.get(h)!;
    const s = b >= 1 - 1e-9 ? 1 + 2 * inner.get(h)! : b > 0 ? b : -1 + 0.95 * fallback(h);
    score.set(h, s + 0.25 * tilt * playability(h));
  }

  // Hands that can never join: outside the new reach.
  const at = (theta: number) => {
    const out = new Map<HandClass, number>();
    for (const h of ALL_HAND_CLASSES) {
      // Premiums the base chart always plays never drop out.
      const keep = premium(h) >= 1 && baseCont.get(h)! >= 1 - 1e-9 ? 1 : 0;
      out.set(h, allowed(h) ? Math.max(keep, step(score.get(h)! - theta)) : 0);
    }
    return out;
  };
  const identity = rule.width === 1 && tilt === 0;
  let cont: Map<HandClass, number>;
  if (identity) cont = new Map(baseCont);
  else {
    const target = rule.width * combos(baseCont);
    let lo = -2.5;
    let hi = 2.5;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (combos(at(mid)) > target) lo = mid;
      else hi = mid;
    }
    const a = at(lo);
    const b = at(hi);
    cont = Math.abs(combos(a) - target) <= Math.abs(combos(b) - target) ? a : b;
  }

  // Split: the base chart's raise share, shifted by aggression.
  const k = clamp(rule.aggression, -1, 1);
  const share = new Map<HandClass, number>();
  for (const h of ALL_HAND_CLASSES) {
    if (!opts.call) {
      share.set(h, 1);
      continue;
    }
    const b = baseCont.get(h)!;
    let r = b > 0 ? (base.mixes.get(h)?.[opts.raise] ?? 0) / b : 0;
    if (k > 0) r += k * (1 - r) * clamp((1 - playability(h)) / 2);
    else if (k < 0) r *= 1 + k * (1 - premium(h)) * (h.endsWith('o') ? 1 : 0.7);
    share.set(h, clamp(r));
  }
  if (opts.call && rule.raiseWidth !== undefined) {
    // Premiums keep their raise share; the rest scale together.
    const scaled = (h: HandClass, lambda: number) => (premium(h) >= 1 ? share.get(h)! : Math.min(1, share.get(h)! * lambda));
    const raiseCombos = (lambda: number) => ALL_HAND_CLASSES.reduce((t, h) => t + comboCount(h) * cont.get(h)! * scaled(h, lambda), 0);
    const target = Math.min(rule.raiseWidth * actionCombos(base, opts.raise, allowed), combos(cont));
    let lo = 0;
    let hi = 50;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (raiseCombos(mid) < target) lo = mid;
      else hi = mid;
    }
    for (const h of ALL_HAND_CLASSES) share.set(h, scaled(h, hi));
  }

  const out = new Map<HandClass, HandMix>();
  for (const h of ALL_HAND_CLASSES) {
    const c = cont.get(h)!;
    if (c <= 0) {
      out.set(h, { fold: 1 });
      continue;
    }
    const raise = step(c * share.get(h)!);
    const call = opts.call ? Math.round((c - raise) * STEP) / STEP : 0;
    const mix: HandMix = {};
    if (raise > 0) mix[opts.raise] = raise;
    if (call > 0) mix[opts.call!] = call;
    const fold = Math.round((1 - raise - call) * STEP) / STEP;
    if (fold > 0) mix.fold = fold;
    out.set(h, mix);
  }
  return out;
}

/** "AKs" at 100%, "AKs:0.35" otherwise, in grid order. */
export function rangeText(freqs: ReadonlyMap<HandClass, number>): string {
  return ALL_HAND_CLASSES.filter((h) => (freqs.get(h) ?? 0) > 0)
    .map((h) => {
      const f = freqs.get(h)!;
      return f >= 1 - 1e-9 ? h : `${h}:${Number(f.toFixed(2))}`;
    })
    .join(', ');
}

/**
 * Chart actions in the chart notation for a set of mixes. Frequencies are
 * absolute and sum to at most 1, so building the chart again gives back the
 * same mixes.
 */
export function actionsFromMixes(mixes: ReadonlyMap<HandClass, HandMix>, actions: readonly { id: string; label: string }[]): ChartActionSpec[] {
  return actions.map(({ id, label }) => ({ id, label, range: rangeText(new Map([...mixes].map(([h, m]) => [h, m[id] ?? 0]))) }));
}

/** Hands that continue in a chart's action, as a range string: the reach of the next spot. */
export function continueText(mixes: ReadonlyMap<HandClass, HandMix>, ids: readonly string[]): string {
  return rangeText(new Map([...mixes].map(([h, m]) => [h, ids.reduce((t, id) => t + (m[id] ?? 0), 0)])));
}

// Rules -------------------------------------------------------------------------------

/** Families of spots that share a stack rule. */
export type RuleFamily = 'rfi' | 'vs-open' | 'vs-3bet' | 'vs-4bet';
/** Who is deciding: an opener, a player in position behind the opener, or a blind. */
export type HeroRole = 'opener' | 'ip' | 'sb' | 'bb';

type Anchor = [stackBb: number, width: number, tilt: number, aggression: number];

/**
 * How each family changes with stack depth, at anchor depths. Between
 * anchors the rule is interpolated on a log scale.
 * - Shallower stacks: speculative hands lose their implied odds, so ranges
 *   tighten from the bottom, favour high cards, and calls turn into raises
 *   (a 4bet at 40bb is all in).
 * - Deeper stacks: pairs and suited connectors gain, offsuit hands lose, and
 *   fewer hands raise because raised pots get big out of position.
 */
export const STACK_RULES: Record<string, Anchor[]> = {
  'rfi': [[40, 0.92, -0.6, 0], [60, 0.96, -0.3, 0], [100, 1, 0, 0], [150, 0.99, 0.3, 0], [200, 0.97, 0.5, 0]],
  'vs-open:bb': [[40, 0.93, -0.5, 0.25], [60, 0.97, -0.25, 0.12], [100, 1, 0, 0], [150, 1, 0.3, -0.15], [200, 1, 0.45, -0.25]],
  'vs-open:sb': [[40, 0.9, -0.5, 0.25], [60, 0.95, -0.25, 0.12], [100, 1, 0, 0], [150, 1, 0.2, -0.15], [200, 1, 0.3, -0.25]],
  'vs-open:ip': [[40, 0.8, -0.6, 0.5], [60, 0.9, -0.3, 0.25], [100, 1, 0, 0], [150, 1.06, 0.35, -0.2], [200, 1.1, 0.5, -0.3]],
  'vs-3bet': [[40, 0.85, -0.6, 0.7], [60, 0.92, -0.3, 0.35], [100, 1, 0, 0], [150, 1, 0.3, -0.25], [200, 1, 0.45, -0.35]],
  'vs-4bet': [[100, 1, 0, 0], [150, 0.95, 0.2, -0.35], [200, 0.9, 0.3, -0.55]],
};

function ruleKey(family: RuleFamily, role: HeroRole): string {
  if (family === 'vs-open') return `vs-open:${role === 'opener' ? 'ip' : role}`;
  return family;
}

/** The stack depth part of a variant rule, against the 100bb starter chart. */
export function stackRule(family: RuleFamily, role: HeroRole, stackBb: number): VariantRule {
  const anchors = STACK_RULES[ruleKey(family, role)];
  const x = Math.log(stackBb);
  if (x <= Math.log(anchors[0][0])) return { width: anchors[0][1], tilt: anchors[0][2], aggression: anchors[0][3] };
  const last = anchors[anchors.length - 1];
  if (x >= Math.log(last[0])) return { width: last[1], tilt: last[2], aggression: last[3] };
  for (let i = 1; i < anchors.length; i++) {
    const [s1, w1, t1, a1] = anchors[i - 1];
    const [s2, w2, t2, a2] = anchors[i];
    if (stackBb <= s2) {
      const f = (x - Math.log(s1)) / (Math.log(s2) - Math.log(s1));
      return { width: w1 + f * (w2 - w1), tilt: t1 + f * (t2 - t1), aggression: a1 + f * (a2 - a1) };
    }
  }
  return NO_CHANGE;
}

/**
 * The open size part of a variant rule, against the starter chart's size.
 * - An open risks more to win the same blinds, so bigger opens come from
 *   tighter ranges: width falls as (base / size) to the power 0.38.
 * - Facing a bigger open, the price to continue is worse, most of all for
 *   the big blind: defense falls as (base / size) to the power 0.75 for the
 *   big blind, 0.6 for the small blind and 0.5 in position. 3bets fall only
 *   with the square root of that, so the cut comes mostly from flats.
 * - Facing a 3bet after a bigger open, the opening range itself is tighter.
 *   The reach does that work, so the rule changes nothing else.
 */
export function openSizeRule(family: RuleFamily, role: HeroRole, openBb: number, baseOpenBb = 2.5): VariantRule {
  const ratio = baseOpenBb / openBb;
  if (family === 'rfi') return { width: ratio ** 0.38, tilt: 0, aggression: 0 };
  if (family === 'vs-open') {
    const e = role === 'bb' ? 0.75 : role === 'sb' ? 0.6 : 0.5;
    const width = ratio ** e;
    return { width, tilt: 0, aggression: 0, raiseWidth: Math.sqrt(width) };
  }
  return NO_CHANGE;
}

export interface VariantSpot {
  family: RuleFamily;
  role: HeroRole;
  stackBb: number;
  openBb: number;
  /** The open size of the base chart. */
  baseOpenBb?: number;
}

/**
 * A starter chart moved to another stack and open size. The size rule's raise
 * width applies to the raises the stack rule leaves, so a short stack facing a
 * big open keeps both effects: more 3bets than flats, and fewer of each.
 */
export function deriveVariant(base: Chart, spot: VariantSpot, opts: Omit<DeriveOptions, 'rule'>): Map<HandClass, HandMix> {
  const s = stackRule(spot.family, spot.role, spot.stackBb);
  const z = openSizeRule(spot.family, spot.role, spot.openBb, spot.baseOpenBb);
  const both = combineRules(s, { ...z, raiseWidth: undefined });
  if (z.raiseWidth === undefined || !opts.call) return deriveMixes(base, { ...opts, rule: both });
  const stackOnly = deriveMixes(base, { ...opts, rule: s });
  const allowed = (h: HandClass) => !opts.reach || opts.reach.has(h);
  const fromStack = ALL_HAND_CLASSES.reduce((t, h) => t + (stackOnly.get(h)![opts.raise] ?? 0) * comboCount(h), 0);
  const fromBase = actionCombos(base, opts.raise, allowed);
  return deriveMixes(base, { ...opts, rule: { ...both, raiseWidth: fromBase > 0 ? (z.raiseWidth * fromStack) / fromBase : undefined } });
}

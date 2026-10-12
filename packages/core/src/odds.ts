/**
 * Pot math. All amounts are in the same unit (usually big blinds).
 * "pot" always means the pot before the decision, including any bet you face.
 */

/** Equity needed to call profitably (ignoring future streets). */
export function potOdds(pot: number, toCall: number): number {
  return toCall / (pot + toCall);
}

/**
 * Minimum defense frequency: how often the defender must continue so a
 * pure bluff of `bet` into `potBeforeBet` does not auto-profit.
 */
export function mdf(potBeforeBet: number, bet: number): number {
  return potBeforeBet / (potBeforeBet + bet);
}

/** Fold frequency a zero-equity bluff needs to break even (alpha). */
export function bluffBreakeven(potBeforeBet: number, bet: number): number {
  return bet / (potBeforeBet + bet);
}

/**
 * Value-to-bluff balance on the river for a polar range: the share of bluffs
 * that makes a bluff catcher indifferent to calling.
 */
export function optimalBluffShare(potBeforeBet: number, bet: number): number {
  return bet / (potBeforeBet + 2 * bet);
}

/** EV of calling versus folding (folding = 0), at showdown with no further action. */
export function callEV(pot: number, toCall: number, equity: number): number {
  return equity * (pot + toCall) - toCall;
}

/** EV of a pure bluff with no equity when called. */
export function bluffEV(potBeforeBet: number, bet: number, foldFrequency: number): number {
  return foldFrequency * potBeforeBet - (1 - foldFrequency) * bet;
}

/**
 * EV of betting with some equity when called. Assumes villain only folds
 * or calls and the hand then goes to showdown.
 */
export function betEV(potBeforeBet: number, bet: number, foldFrequency: number, equityWhenCalled: number): number {
  const whenCalled = equityWhenCalled * (potBeforeBet + 2 * bet) - bet;
  return foldFrequency * potBeforeBet + (1 - foldFrequency) * whenCalled;
}

/** Extra amount you must win on later streets to make a call break even. */
export function impliedOddsNeeded(pot: number, toCall: number, equity: number): number {
  return Math.max(0, toCall / equity - (pot + toCall));
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/** Exact chance of hitting at least one of `outs` in the next `cardsToCome` cards. */
export function outsToEquity(outs: number, unseen: number, cardsToCome: 1 | 2): number {
  return 1 - choose(unseen - outs, cardsToCome) / choose(unseen, cardsToCome);
}

/** The table shortcut: outs x 2 per card to come (x 4 on the flop going to the river). */
export function ruleOf2And4(outs: number, cardsToCome: 1 | 2): number {
  return (outs * (cardsToCome === 2 ? 4 : 2)) / 100;
}

/** Stack to pot ratio. */
export function spr(effectiveStack: number, pot: number): number {
  return effectiveStack / pot;
}

/**
 * Geometric bet sizing: the single pot fraction that, bet on each of the
 * remaining `streets`, gets the effective stack in exactly by the last one.
 * Each bet of f times the pot grows the pot by (1 + 2f).
 */
export function geometricBetFraction(pot: number, effectiveStack: number, streets: number): number {
  if (streets < 1) throw new Error('Need at least one street');
  return (Math.pow(1 + (2 * effectiveStack) / pot, 1 / streets) - 1) / 2;
}

/** Equity estimate from outs on the flop with the over 8 outs correction: outs x 4 minus (outs - 8). */
export function ruleOfFourCorrected(outs: number): number {
  return (outs * 4 - Math.max(0, outs - 8)) / 100;
}

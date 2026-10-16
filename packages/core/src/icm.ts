/**
 * The independent chip model (ICM): tournament chips turned into prize money.
 *
 * Malmuth-Harville: a player wins with probability equal to their share of
 * the chips. Given who has finished above them, each remaining player takes
 * the next place with probability equal to their share of the chips still in
 * play. A player's $EV is each payout times their chance of that place.
 *
 * ICM is a model. It ignores skill, position, blinds and how future hands
 * play. Everything here is exact arithmetic on that model, and lessons label
 * it as such.
 *
 * Conventions: stacks are chips (any unit, never negative); payouts are
 * listed from 1st place down, in money. A stack of 0 has already busted: it
 * gets nothing here, and places below the players still in are not handed
 * out. Use `allInValues` when a hand can bust someone, since it pays the
 * busted player their finishing place.
 */

/**
 * Finishing chances by place: `result[i][p]` is the chance that player i
 * finishes in place p + 1, for the first `places` places (default: one per
 * player still in). Exact, by dynamic programming over who has finished
 * above: each set of finishers is visited once, so 20 players and 9 places
 * is quick.
 */
export function finishChances(stacks: readonly number[], places = stacks.filter((s) => s > 0).length): number[][] {
  const n = stacks.length;
  if (n > 30) throw new RangeError('finishChances supports at most 30 players');
  for (const s of stacks) if (!(s >= 0) || !Number.isFinite(s)) throw new RangeError(`Stacks must be finite and not negative: ${s}`);
  const result = stacks.map(() => new Array<number>(Math.max(0, places)).fill(0));
  const total = stacks.reduce((a, b) => a + b, 0);
  if (total === 0 || places <= 0) return result;

  // level: the chance that exactly the players in each mask fill the top places, in some order.
  let level = new Map<number, number>([[0, 1]]);
  for (let place = 0; place < places; place++) {
    const next = new Map<number, number>();
    for (const [mask, p] of level) {
      let left = total;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) left -= stacks[i];
      if (left <= 0) continue;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i) || stacks[i] === 0) continue;
        const q = (p * stacks[i]) / left;
        result[i][place] += q;
        const m = mask | (1 << i);
        next.set(m, (next.get(m) ?? 0) + q);
      }
    }
    level = next;
    if (level.size === 0) break;
  }
  return result;
}

/**
 * Malmuth-Harville ICM equity: each player's expected prize money from their
 * stack. The values add up to the payouts that the players still in can win.
 */
export function icmEquity(stacks: readonly number[], payouts: readonly number[]): number[] {
  const alive = stacks.filter((s) => s > 0).length;
  const places = Math.min(payouts.length, alive);
  const chances = finishChances(stacks, places);
  return chances.map((row) => row.reduce((sum, p, place) => sum + p * payouts[place], 0));
}

/**
 * $EV for the player at `player` after a hand changes the stacks. If that
 * player has busted, they finish just below everyone still in. Use it only
 * when at most one player busts at a time, as in a 2 player all in.
 */
export function icmValueAfter(stacks: readonly number[], payouts: readonly number[], player: number): number {
  const alive = stacks.filter((s) => s > 0).length;
  if (stacks[player] === 0) return payouts[alive] ?? 0;
  return icmEquity(stacks, payouts.slice(0, alive))[player];
}

/** Hero's $EV in each outcome of an all in between hero and villain. */
export interface AllInValues {
  /** Hero folds (or does not shove): villain takes the pot and any live blind hero posted. */
  fold: number;
  /** Villain folds to hero's shove: hero takes the pot and any live blind villain posted. */
  steal: number;
  /** Hero and villain get all in and hero wins. */
  win: number;
  /** Hero and villain get all in and hero loses. */
  lose: number;
  /** Chips each player has at risk in the all in: the smaller of the two stacks. */
  risk: number;
  /** Chips hero adds to call the all in: risk less hero's live blind. */
  call: number;
  /** Dead chips in the middle that neither player has to match. */
  dead: number;
}

/** The pot around an all in. Every amount is in chips and defaults to 0. */
export interface AllInPot {
  /** Dead money: antes and folded players' blinds, already taken off their stacks. */
  dead?: number;
  /** Hero's live blind, already in front and counted in hero's stack. */
  heroLive?: number;
  /** Villain's live blind, already in front and counted in villain's stack. */
  villainLive?: number;
}

/**
 * The $EV of every outcome when hero and villain may get all in.
 *
 * `stacks` are each player's chips, counting a live blind they have in
 * front but not dead money they have posted (an ante). Each player risks the
 * smaller of the two stacks, and the winner also takes the dead money. With
 * no pot this is the bare chip flip that the ICM and bubble lessons price,
 * with blinds ignored.
 */
export function allInValues(
  stacks: readonly number[],
  payouts: readonly number[],
  hero: number,
  villain: number,
  { dead = 0, heroLive = 0, villainLive = 0 }: AllInPot = {},
): AllInValues {
  if (hero === villain) throw new RangeError('Hero and villain must be different players');
  if (!(stacks[hero] > 0) || !(stacks[villain] > 0)) throw new RangeError('Hero and villain must both have chips');
  if (!(dead >= 0) || !(heroLive >= 0) || !(villainLive >= 0)) throw new RangeError('Pot amounts cannot be negative');
  const risk = Math.min(stacks[hero], stacks[villain]);
  if (heroLive > risk || villainLive > risk) throw new RangeError('A live blind cannot be more than the chips at risk');
  /** Stacks after hero gains `gain`, villain loses `gain` and the winner of the dead money is `deadTo`. */
  const after = (gain: number, deadTo: number) =>
    stacks.map((s, i) => (i === hero ? s + gain : i === villain ? s - gain : s) + (i === deadTo ? dead : 0));
  const value = (st: number[]) => icmValueAfter(st, payouts, hero);
  return {
    fold: value(after(-heroLive, villain)),
    steal: value(after(villainLive, hero)),
    win: value(after(risk, hero)),
    lose: value(after(-risk, villain)),
    risk,
    call: risk - heroLive,
    dead,
  };
}

/** Hero's $EV of calling an all in with `equity`: eq × win + (1 − eq) × lose. */
export function icmCallEV(v: AllInValues, equity: number): number {
  return equity * v.win + (1 - equity) * v.lose;
}

/**
 * Hero's $EV of shoving: villain folds with chance `foldChance`, else hero
 * gets all in with `equity` against the hands that call.
 */
export function icmShoveEV(v: AllInValues, foldChance: number, equity: number): number {
  return foldChance * v.steal + (1 - foldChance) * icmCallEV(v, equity);
}

/** The equity hero needs to call in $EV: (fold − lose) ÷ (win − lose). */
export function icmRequiredEquity(v: AllInValues): number {
  return (v.fold - v.lose) / (v.win - v.lose);
}

/** The equity hero needs to call in chip EV: the call over the final pot, call ÷ (2 × risk + dead). */
export function chipRequiredEquity(v: Pick<AllInValues, 'risk' | 'call' | 'dead'>): number {
  return v.call / (2 * v.risk + v.dead);
}

/**
 * The risk premium: the extra equity a call needs in $EV beyond chip EV.
 * Positive when losing chips costs more money than winning them adds.
 */
export function riskPremium(v: AllInValues): number {
  return icmRequiredEquity(v) - chipRequiredEquity(v);
}

/**
 * The bubble factor of hero against villain: the money hero loses by losing
 * an all in, over the money hero gains by winning it, for the same chips.
 * No dead money, so both outcomes move `risk` chips. It is 1 when chips are
 * money, as heads up. The equity a call needs is then BF ÷ (1 + BF).
 */
export function bubbleFactor(stacks: readonly number[], payouts: readonly number[], hero: number, villain: number): number {
  const v = allInValues(stacks, payouts, hero, villain);
  return (v.fold - v.lose) / (v.win - v.fold);
}

/**
 * A chip chop: every player locks in the smallest payout still to be won,
 * and the rest of the money left is split by share of the chips.
 */
export function chipChop(stacks: readonly number[], payouts: readonly number[]): number[] {
  const n = stacks.length;
  if (payouts.length < n) throw new RangeError('A chop needs a payout for every player left');
  const left = payouts.slice(0, n);
  const floor = left[n - 1];
  const rest = left.reduce((a, b) => a + b, 0) - n * floor;
  const total = stacks.reduce((a, b) => a + b, 0);
  if (!(total > 0)) throw new RangeError('A chop needs chips in play');
  return stacks.map((s) => floor + (rest * s) / total);
}

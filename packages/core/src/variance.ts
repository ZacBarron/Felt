import { seededRandom } from './habits';
import { resultsHalfWidth } from './winrate';

/**
 * Win rate arithmetic and the variance model behind the results lessons.
 *
 * Converting bb/100 into bb or money per hour is arithmetic. Everything about
 * swings is a model: results over many hands are treated as a random walk
 * whose average is the true win rate and whose spread is the standard
 * deviation per 100 hands (a normal approximation, as in winrate.ts). The
 * model assumes the true win rate is known and fixed, which a real player's
 * never is, so lessons label these numbers as a model.
 */

/** Win rate per hour in big blinds: bb/100 times hands per hour, over 100. */
export function bbPerHour(bbPer100: number, handsPerHour: number): number {
  return (bbPer100 * handsPerHour) / 100;
}

/** Win rate per hour in money at a given big blind. */
export function moneyPerHour(bbPer100: number, handsPerHour: number, bigBlind: number): number {
  return bbPerHour(bbPer100, handsPerHour) * bigBlind;
}

/** The bb/100 that earns `bbPerHourTarget` at a given pace: the inverse of bbPerHour. */
export function bbPer100ForHourly(bbPerHourTarget: number, handsPerHour: number): number {
  return (bbPerHourTarget * 100) / handsPerHour;
}

/** Standard normal cumulative distribution: the chance a standard normal draw is below z. */
export function normalCdf(z: number): number {
  if (Number.isNaN(z)) return NaN;
  if (z > 0) return 1 - normalCdf(-z);
  const x = -z;
  if (x > 38) return 0;
  if (x < 3) {
    // erf series at x / sqrt(2): exact to about 1e-14 in this range.
    const t = x / Math.SQRT2;
    let term = t;
    let sum = t;
    for (let n = 1; n < 80; n++) {
      term *= (-t * t) / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17) break;
    }
    return 0.5 - sum / Math.sqrt(Math.PI);
  }
  // Upper tail by the Laplace continued fraction, evaluated from the bottom.
  let f = x;
  for (let k = 60; k >= 1; k--) f = x + k / f;
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI) / f;
}

/** The 95% range (or another z) of a win rate measured over `hands` hands: observed plus or minus the half width. */
export function winRateRange(observed: number, hands: number, sd100: number, z = 1.96): { low: number; high: number; halfWidth: number } {
  const halfWidth = z === 1.96 ? resultsHalfWidth(hands, sd100) : hands > 0 ? (z * sd100) / Math.sqrt(hands / 100) : Infinity;
  return { low: observed - halfWidth, high: observed + halfWidth, halfWidth };
}

/** Standard deviation of the total result over `hands` hands, in big blinds. */
export function resultsSpreadBb(hands: number, sd100: number): number {
  return sd100 * Math.sqrt(hands / 100);
}

/**
 * Chance that a player with this true win rate shows a measured win rate
 * below `threshold` bb/100 after `hands` hands. With the default threshold
 * of 0 it is the chance a real winner is behind.
 */
export function chanceResultsBelow(trueWinRate: number, sd100: number, hands: number, threshold = 0): number {
  if (hands <= 0) return NaN;
  const se = sd100 / Math.sqrt(hands / 100);
  return normalCdf((threshold - trueWinRate) / se);
}

/**
 * Risk of ruin: the chance of ever losing a bankroll of `bankrollBb` big
 * blinds, exp(-2 x WR x B / SD^2). It assumes a known, fixed win rate, no
 * moving down and no money added or taken out. A player who does not win has
 * no safe bankroll: the risk is 1.
 */
export function riskOfRuin(winRate: number, sd100: number, bankrollBb: number): number {
  if (bankrollBb <= 0) return 1;
  if (winRate <= 0) return 1;
  return Math.exp((-2 * winRate * bankrollBb) / (sd100 * sd100));
}

/**
 * Chance of falling at least `depthBb` below where you start at some point
 * within `hands` hands. The first passage formula for a random walk with
 * drift: as `hands` grows it tends to riskOfRuin (or 1 for a non winner).
 */
export function chanceToFallWithin(winRate: number, sd100: number, depthBb: number, hands: number): number {
  if (depthBb <= 0) return 1;
  if (hands <= 0) return 0;
  const n = hands / 100;
  const mean = winRate * n;
  const sd = sd100 * Math.sqrt(n);
  const a = normalCdf((-depthBb - mean) / sd);
  const k = (2 * winRate * depthBb) / (sd100 * sd100);
  // exp(k) times a tiny normal tail can overflow; combine them in log space.
  const tail = normalCdf((-depthBb + mean) / sd);
  const b = tail > 0 ? Math.exp(-k + Math.log(tail)) : 0;
  return Math.min(1, a + b);
}

/**
 * Over a long run of play, the share of the time a winner sits at least
 * `depthBb` below their best result so far. Under the model the distance
 * below the peak settles to an exponential with this tail, exp(-2 x WR x D /
 * SD^2): the same shape as risk of ruin. A non winner is below any depth
 * eventually, so the share is 1.
 */
export function shareOfTimeBelowPeak(winRate: number, sd100: number, depthBb: number): number {
  if (depthBb <= 0) return 1;
  if (winRate <= 0) return 1;
  return Math.exp((-2 * winRate * depthBb) / (sd100 * sd100));
}

/** Average distance below the peak over a long run, in big blinds: SD^2 / (2 x WR). Infinite for a non winner. */
export function averageDepthBelowPeak(winRate: number, sd100: number): number {
  return winRate > 0 ? (sd100 * sd100) / (2 * winRate) : Infinity;
}

/**
 * Average hands needed to climb back `depthBb` big blinds at a true win rate:
 * the depth over the win rate per hand. A non winner never climbs back on
 * average, so it is infinite.
 */
export function handsToRecover(depthBb: number, winRate: number): number {
  if (depthBb <= 0) return 0;
  return winRate > 0 ? (100 * depthBb) / winRate : Infinity;
}

export interface SimulatedResults {
  /** Hands played at each point, from 0. */
  hands: number[];
  /** One running total per simulated player, in big blinds, starting at 0. */
  paths: number[][];
  /** Expected total at each point: the true win rate times the hands. */
  expected: number[];
  /** Where 95% of totals land at each point, under the normal model. */
  low: number[];
  high: number[];
}

/**
 * Sample running totals for players who all share one true win rate and
 * standard deviation, from a seed, so a lesson picture and its test see the
 * same paths. Each step adds a normal draw for its block of hands.
 */
export function simulateResults(opts: { winRate: number; sd100: number; hands: number; paths: number; seed: number; steps?: number }): SimulatedResults {
  const steps = Math.max(1, Math.round(opts.steps ?? 100));
  const block = opts.hands / steps;
  const drift = (opts.winRate * block) / 100;
  const spread = opts.sd100 * Math.sqrt(block / 100);
  const rand = seededRandom(opts.seed);
  let spare: number | undefined;
  const normal = () => {
    if (spare !== undefined) {
      const s = spare;
      spare = undefined;
      return s;
    }
    // Box-Muller; 1 - u keeps the log away from 0.
    const u = 1 - rand();
    const v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  const hands = Array.from({ length: steps + 1 }, (_, i) => i * block);
  const paths = Array.from({ length: Math.max(0, Math.round(opts.paths)) }, () => {
    const path = [0];
    for (let i = 1; i <= steps; i++) path.push(path[i - 1] + drift + spread * normal());
    return path;
  });
  const expected = hands.map((h) => (opts.winRate * h) / 100);
  const half = hands.map((h) => 1.96 * resultsSpreadBb(h, opts.sd100));
  return { hands, paths, expected, low: expected.map((e, i) => e - half[i]), high: expected.map((e, i) => e + half[i]) };
}

/** The deepest drop below a running peak along one path of running totals, in big blinds. */
export function deepestDrop(path: readonly number[]): number {
  let peak = -Infinity;
  let deepest = 0;
  for (const x of path) {
    peak = Math.max(peak, x);
    deepest = Math.max(deepest, peak - x);
  }
  return deepest;
}

/**
 * Share of simulated players who hit a drop of at least `depthBb` below a
 * running peak (a downswing) within `hands` hands. A Monte Carlo estimate from
 * a seed, checked once per block of `block` hands (100 by default), so it
 * slightly understates drops that happen inside a block.
 */
export function simulatedDownswingChance(opts: { winRate: number; sd100: number; depthBb: number; hands: number; trials: number; seed: number; block?: number }): number {
  const steps = Math.max(1, Math.round(opts.hands / (opts.block ?? 100)));
  const { paths } = simulateResults({ winRate: opts.winRate, sd100: opts.sd100, hands: opts.hands, paths: opts.trials, seed: opts.seed, steps });
  if (paths.length === 0) return NaN;
  return paths.filter((p) => deepestDrop(p) >= opts.depthBb).length / paths.length;
}

import { expectedScore } from './rating';
import { type GameSettings, rakeFor } from './settings';

/**
 * What a rating is worth at the table.
 *
 * Poker is zero sum before costs: what one player wins, others lose, and the
 * house takes rake from every pot (plus tips, live). So the average player at
 * any table loses exactly the rake and tips per player. That part is pure
 * arithmetic from the game settings.
 *
 * The skill part is a model: your expected edge over the table grows with
 * how much stronger you are than the pool, using the same logistic curve as
 * the rating itself. Its inputs (the pool's rating and the scale of the edge)
 * are stated assumptions, and logged results replace the model as they
 * accumulate, through an ordinary normal (Bayesian) update.
 */

export interface TableAssumptions {
  /** Share of hands that see a flop (and so pay rake under no flop, no drop). */
  flopShare: number;
  /** Average final pot when a flop is seen, in big blinds. */
  flopPotBb: number;
  /** Average pot when the hand ends before the flop, in big blinds. */
  noFlopPotBb: number;
  /** Tip per pot won, in money (live). */
  tipPerPot: number;
  /** Average Felt Rating of the players in this game. */
  poolRating: number;
  /** Win rate in bb/100 before costs of a player who would win every decision against the pool. */
  edgeScale: number;
  /** Standard deviation of results per 100 hands, in big blinds. */
  sd100: number;
  /** Uncertainty of the model itself, in bb/100. */
  modelSd: number;
  handsPerHour: number;
}

/**
 * Starting assumptions by game. Labelled as assumptions in the app and
 * editable, until Felt has enough player data to fit them.
 */
export function defaultAssumptions(game: GameSettings): TableAssumptions {
  if (game.venue === 'live') {
    const small = game.stakes.bb <= 3;
    return {
      flopShare: 0.8,
      flopPotBb: small ? 20 : 25,
      noFlopPotBb: 2.5,
      tipPerPot: small ? 1 : 2,
      poolRating: small ? 1150 : 1300,
      edgeScale: 40,
      sd100: 100,
      modelSd: 6,
      handsPerHour: 30,
    };
  }
  return {
    flopShare: 0.4,
    flopPotBb: 12,
    noFlopPotBb: 2.5,
    tipPerPot: 0,
    poolRating: game.format === 'mtt' ? 1200 : 1400,
    edgeScale: 25,
    sd100: 90,
    modelSd: 4,
    handsPerHour: 75,
  };
}

export interface TableCosts {
  /** Rake per hand for the whole table, in big blinds. */
  rakePerHand: number;
  /** Rake each player pays on average, in bb per 100 hands. */
  rakePer100: number;
  /** Tips each player pays on average, in bb per 100 hands. */
  tipsPer100: number;
}

/** Rake and tips per player, from the game's rake rules and the assumed pot sizes. */
export function tableCosts(game: GameSettings, a: TableAssumptions): TableCosts {
  const bb = game.stakes.bb;
  const flop = rakeFor(a.flopPotBb * bb, game.rake, true) / bb;
  const noFlop = rakeFor(a.noFlopPotBb * bb, game.rake, false) / bb;
  const rakePerHand = a.flopShare * flop + (1 - a.flopShare) * noFlop;
  const tipsPerHand = a.tipPerPot / bb;
  return {
    rakePerHand,
    rakePer100: (rakePerHand * 100) / game.tableSize,
    tipsPer100: (tipsPerHand * 100) / game.tableSize,
  };
}

export interface WinRateEstimate {
  /** Edge over the table before costs, bb/100. */
  edge: number;
  /** Expected win rate after rake and tips, bb/100. */
  mean: number;
  /** Standard deviation of the estimate, bb/100. */
  sd: number;
  costs: TableCosts;
  /** Expected win rate of an average player in this game, bb/100: minus the costs. */
  average: number;
}

/** Edge before costs for a rating against the pool. Zero at the pool's own rating. */
export function skillEdge(rating: number, a: TableAssumptions): number {
  return a.edgeScale * (2 * expectedScore(rating, a.poolRating, 0) - 1);
}

/** Expected win rate from a rating and its uncertainty. */
export function estimateWinRate(rating: number, rd: number, game: GameSettings, a: TableAssumptions): WinRateEstimate {
  const costs = tableCosts(game, a);
  const cost = costs.rakePer100 + costs.tipsPer100;
  const edge = skillEdge(rating, a);
  const spread = (skillEdge(rating + rd, a) - skillEdge(rating - rd, a)) / 2;
  return { edge, mean: edge - cost, sd: Math.sqrt(spread * spread + a.modelSd * a.modelSd), costs, average: -cost };
}

/**
 * Combines the model with real results. Results over `hands` hands at
 * `observed` bb/100 have a standard error of sd100 / sqrt(hands / 100); the
 * estimate is the precision weighted average of the two.
 */
export function blendWithResults(
  prior: { mean: number; sd: number },
  observed: number,
  hands: number,
  sd100: number,
): { mean: number; sd: number; weightOnResults: number } {
  if (hands <= 0) return { ...prior, weightOnResults: 0 };
  const se = sd100 / Math.sqrt(hands / 100);
  const wPrior = 1 / (prior.sd * prior.sd);
  const wData = 1 / (se * se);
  return {
    mean: (prior.mean * wPrior + observed * wData) / (wPrior + wData),
    sd: Math.sqrt(1 / (wPrior + wData)),
    weightOnResults: wData / (wPrior + wData),
  };
}

/** Hands needed before results alone pin the win rate to within `halfWidth` bb/100, 95% of the time. */
export function handsForPrecision(halfWidth: number, sd100: number): number {
  return 100 * Math.pow((1.96 * sd100) / halfWidth, 2);
}

import type { HandMix } from './charts';
import { isMixed, scoreRecall } from './drills';
/**
 * Felt SkillRating: a Glicko rating for a player, where every graded decision is a
 * game against an item with its own difficulty rating.
 *
 * This is how adaptive learning systems use Elo (Pelánek 2016; Klinkenberg
 * et al. 2011): a learner of rating r answers an item of difficulty d
 * correctly with probability 1 / (1 + 10^((d - r) / 400)). Glicko (Glickman
 * 1999) adds a rating deviation, so a new player moves fast, a settled player
 * moves slowly, and time away widens the uncertainty again.
 *
 * Ratings are recomputed by replaying stored answers, so item difficulties
 * can be recalibrated later without losing anyone's history.
 */

export type SkillDomain = 'math' | 'preflop' | 'postflop' | 'exploit' | 'theory';

export const SKILL_DOMAINS: SkillDomain[] = ['preflop', 'postflop', 'math', 'exploit', 'theory'];

export interface SkillRating {
  rating: number;
  /** SkillRating deviation: one standard deviation of uncertainty, in rating points. */
  rd: number;
  games: number;
  /** Time of the last update, for widening rd after time away. */
  at?: number;
}

export interface RatingEvent {
  at: number;
  itemId: string;
  domain: SkillDomain;
  /** Item difficulty on the rating scale. */
  difficulty: number;
  /** 1 correct, 0 wrong, partial credit allowed. */
  score: number;
}

export const START_RATING = 1200;
export const START_RD = 350;
export const MIN_RD = 45;
/** Items are fixed opponents with a little uncertainty of their own. */
export const ITEM_RD = 60;
/** Rd above this is provisional, the same convention chess sites use. */
export const PROVISIONAL_RD = 110;
/** Growth of rd per day without play: from settled (50) back to new (350) in about 100 days. */
export const RD_GROWTH_PER_DAY = 35;

const Q = Math.LN10 / 400;
const g = (rd: number) => 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));

export function newRating(): SkillRating {
  return { rating: START_RATING, rd: START_RD, games: 0 };
}

/** Probability that a player of `rating` gets an item of `difficulty` right. */
export function expectedScore(rating: number, difficulty: number, itemRd = ITEM_RD): number {
  return 1 / (1 + Math.pow(10, (-g(itemRd) * (rating - difficulty)) / 400));
}

/** Rd after `days` without play, capped at the starting uncertainty. */
export function inflateRd(rd: number, days: number): number {
  return Math.min(START_RD, Math.sqrt(rd * rd + RD_GROWTH_PER_DAY * RD_GROWTH_PER_DAY * Math.max(0, days)));
}

/** A Glicko rating period: several results applied at once (Glickman 1999, step 2). */
export function updateRatingPeriod(
  current: SkillRating,
  games: readonly { difficulty: number; score: number; itemRd?: number }[],
  at = Date.now(),
): SkillRating {
  const days = current.at === undefined ? 0 : (at - current.at) / 86_400_000;
  const rd = inflateRd(current.rd, days);
  if (games.length === 0) return { ...current, rd, at };
  let dInv = 0;
  let sum = 0;
  for (const game of games) {
    const gj = g(game.itemRd ?? ITEM_RD);
    const e = expectedScore(current.rating, game.difficulty, game.itemRd ?? ITEM_RD);
    dInv += Q * Q * gj * gj * e * (1 - e);
    sum += gj * (Math.max(0, Math.min(1, game.score)) - e);
  }
  const denom = 1 / (rd * rd) + dInv;
  return {
    rating: current.rating + (Q / denom) * sum,
    rd: Math.max(MIN_RD, Math.sqrt(1 / denom)),
    games: current.games + games.length,
    at,
  };
}

/** One Glicko update against a single item. */
export function updateRating(current: SkillRating, difficulty: number, score: number, at = Date.now(), itemRd = ITEM_RD): SkillRating {
  return updateRatingPeriod(current, [{ difficulty, score, itemRd }], at);
}

export interface RatingSnapshot {
  overall: SkillRating;
  domains: Record<SkillDomain, SkillRating>;
  /** Overall rating after each event, for a history chart. */
  history: { at: number; rating: number; rd: number }[];
}

/** Replays answers in time order into an overall rating and one rating per domain. */
export function replayRatings(events: readonly RatingEvent[]): RatingSnapshot {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  let overall = newRating();
  const domains = Object.fromEntries(SKILL_DOMAINS.map((d) => [d, newRating()])) as Record<SkillDomain, SkillRating>;
  const history: RatingSnapshot['history'] = [];
  for (const e of sorted) {
    overall = updateRating(overall, e.difficulty, e.score, e.at);
    domains[e.domain] = updateRating(domains[e.domain], e.difficulty, e.score, e.at);
    history.push({ at: e.at, rating: overall.rating, rd: overall.rd });
  }
  return { overall, domains, history };
}

/** The rating as it stands now, with uncertainty widened for time away. */
export function currentRating(r: SkillRating, now = Date.now()): SkillRating {
  if (r.at === undefined) return r;
  return { ...r, rd: inflateRd(r.rd, (now - r.at) / 86_400_000) };
}

export function isProvisional(r: SkillRating): boolean {
  return r.rd > PROVISIONAL_RD;
}

/**
 * Tiers every 150 points. Chess classes are 200 points wide (USCF); 150 keeps
 * each step meaningful (the higher tier is expected to win about 70% of
 * decisions against the one below) while putting the next milestone close
 * enough to pull effort forward (the goal gradient, Kivetz, Urminsky and
 * Zheng 2006). The ladder stops at Elite: Felt's hardest items sit near 1700,
 * so higher tiers could not be measured honestly. While a rating is
 * provisional it has no tier (see `tierLabel`).
 *
 * Each tier also names a way of thinking about a hand. This follows the
 * "levels of thinking" ladder common in poker teaching: first what do I
 * have, then what do they have, then what do they think I have. Thinking in
 * ranges is the modern step past reading one hand, and balanced, mixed play
 * near equilibrium sits at the top. `skills` says what Felt actually rates
 * near each band, from `DIFFICULTY`: core lessons and math facts near 1250
 * to 1300, close calls on charts at 1350, solver and river spots at 1450 to
 * 1500, advanced lessons and painting whole charts at 1600.
 *
 * Be honest about what this is: Felt measures answers, not thoughts. The
 * rating is the measurement. The thinking line is a guide to what players
 * at that rating tend to get right, not a claim about how any one player
 * thinks.
 */
export interface Tier {
  min: number;
  name: string;
  /** The question a player at this tier asks at the table. */
  thinks: string;
  /** What Felt rates near this band, in plain words. */
  skills: string;
}

export const TIERS: Tier[] = [
  { min: -Infinity, name: 'Newcomer', thinks: 'How does a hand play out?', skills: 'Hand rankings and the order of betting.' },
  { min: 900, name: 'Beginner', thinks: 'What do I have?', skills: 'Which starting hands to play and how strong your hand is.' },
  { min: 1050, name: 'Developing', thinks: 'Where am I sitting, and what does it cost to call?', skills: 'Position and pot odds.' },
  { min: 1200, name: 'Solid', thinks: 'What might they have?', skills: 'Core lessons and the price of common bets.' },
  { min: 1350, name: 'Sharp', thinks: 'What range of hands could they have?', skills: 'Close calls on the opening and defending charts.' },
  { min: 1500, name: 'Regular', thinks: 'How do I mix my plays so I stay hard to read?', skills: 'Solver spots and river decisions.' },
  { min: 1650, name: 'Strong regular', thinks: 'What is this player doing wrong, and how do I profit?', skills: 'Advanced lessons and painting whole charts.' },
  { min: 1800, name: 'Expert', thinks: 'What do they think I have?', skills: 'Advanced questions, right about 3 times in 4.' },
  { min: 1950, name: 'Elite', thinks: 'Does my whole strategy hold up against anyone?', skills: 'The hardest questions, right nearly 9 times in 10.' },
];

/** The tier to show: none until the rating has settled. */
export function tierLabel(r: SkillRating): string {
  return r.games === 0 || isProvisional(r) ? 'Still settling' : tierFor(r.rating);
}

export function tierFor(rating: number): string {
  return tierAt(rating).name;
}

/** The next tier up and how far away it is, or undefined at the top. */
export function nextTier(rating: number): { name: string; min: number; pointsAway: number; progress: number } | undefined {
  const i = TIERS.findIndex((t) => t.min > rating);
  if (i < 0) return undefined;
  const next = TIERS[i];
  const floor = i > 1 ? TIERS[i - 1].min : next.min - 150;
  return { name: next.name, min: next.min, pointsAway: Math.ceil(next.min - rating), progress: Math.max(0, Math.min(1, (rating - floor) / (next.min - floor))) };
}

/** The tier a rating falls in. */
export function tierAt(rating: number): Tier {
  return [...TIERS].reverse().find((t) => rating >= t.min)!;
}

// How close is the next tier ---------------------------------------------

/** Rating points one answer moves, per unit of surprise (score minus expected), from the Glicko update. */
export function stepSize(rd: number, expected: number, itemRd = ITEM_RD): number {
  const gj = g(itemRd);
  return (Q * gj) / (1 / (rd * rd) + Q * Q * gj * gj * expected * (1 - expected));
}

/**
 * Expected rating change per answer against items you get right with
 * probability `expected`, when you actually get `accuracy` of them right.
 * A right answer adds `step x (1 - expected)` and a miss takes away
 * `step x expected`, so at `accuracy = expected` the average is zero: the
 * rating only climbs when you do better than it expects.
 */
export function gainPerAnswer(rd: number, expected: number, accuracy = expected): number {
  return stepSize(rd, expected) * (accuracy - expected);
}

/** The item difficulty a player of `rating` gets right with probability `expected`. */
export function difficultyFor(rating: number, expected: number, itemRd = ITEM_RD): number {
  return rating - (400 / g(itemRd)) * Math.log10(expected / (1 - expected));
}

/** Practice picks items near this expected success rate (`pickAdaptive`). */
export const PRACTICE_TARGET = 0.8;

export interface TierProgress {
  /** The tier the rating falls in. Shown only once the rating has settled. */
  tier: Tier;
  /** No tier yet: too few answers to trust the number. */
  settling: boolean;
  /** Answers until the rating settles: on questions at your level, and on practice questions. Settling ratings only. */
  answersToSettle?: { atLevel: number; inPractice: number };
  /** Undefined at the top tier. */
  next?: Tier;
  pointsAway?: number;
  /** 0 to 1 through the current tier. */
  progress?: number;
  /**
   * Our estimate of how many more right answers than misses it takes, on
   * questions at your level (half right expected), to reach the next tier.
   * Exact for a run of right answers; with misses mixed in it is close.
   */
  rightAnswers?: number;
  /** At your level a right answer adds this many points and a miss takes the same away. */
  perRight: number;
  /** On practice questions (about 80% expected) a right answer adds less and a miss costs more. */
  practice: { expected: number; perRight: number; perMiss: number };
}

const MAX_STEPS = 10_000;

/** Replays answers through the real update rule against items at a fixed expected score. */
function simulate(r: SkillRating, expected: number, score: number, done: (r: SkillRating, n: number) => boolean): number {
  let cur: SkillRating = { rating: r.rating, rd: r.rd, games: r.games };
  for (let n = 0; n < MAX_STEPS; n++) {
    if (done(cur, n)) return n;
    cur = updateRating(cur, difficultyFor(cur.rating, expected), score, 0);
  }
  return MAX_STEPS;
}

/**
 * How close a rating is to the next tier, in points and in answers. Pass the
 * rating as it stands now (`currentRating`), since time away widens rd and a
 * wider rd moves faster. The answer counts replay the Glicko update itself,
 * so they shrink rd answer by answer as the real rating would. They are
 * estimates: the real count depends on which questions you get.
 */
export function tierProgress(r: SkillRating): TierProgress {
  const settling = r.games === 0 || isProvisional(r);
  const tier = tierAt(r.rating);
  const perRight = gainPerAnswer(r.rd, 0.5, 1);
  const practice = {
    expected: PRACTICE_TARGET,
    perRight: gainPerAnswer(r.rd, PRACTICE_TARGET, 1),
    perMiss: -gainPerAnswer(r.rd, PRACTICE_TARGET, 0),
  };
  if (settling) {
    const settled = (x: SkillRating, n: number) => n > 0 && !isProvisional(x);
    const answersToSettle = {
      atLevel: Math.max(1, simulate(r, 0.5, 1, settled)),
      inPractice: Math.max(1, simulate(r, PRACTICE_TARGET, 1, settled)),
    };
    return { tier, settling, answersToSettle, perRight, practice };
  }
  const next = TIERS.find((t) => t.min > r.rating);
  if (!next) return { tier, settling, perRight, practice };
  const step = nextTier(r.rating)!;
  const rightAnswers = simulate(r, 0.5, 1, (x) => x.rating >= next.min);
  return { tier, settling, next, pointsAway: step.pointsAway, progress: step.progress, rightAnswers, perRight, practice };
}

/** 95% interval for the true rating. */
export function ratingInterval(r: SkillRating): [number, number] {
  return [r.rating - 1.96 * r.rd, r.rating + 1.96 * r.rd];
}

// Item difficulty priors -------------------------------------------------

/**
 * Starting difficulties. They are design priors, set so that core material
 * sits near the Contender to Regular tiers and fine distinctions near Expert and Pro. They
 * should be recalibrated from real answer data (difficulty ratings can be
 * fitted the same way player ratings are).
 */
export const DIFFICULTY = {
  /** A pure action on the range edge. */
  chartEdge: 1350,
  /** A mixed hand where some answers are still wrong: easier, since more than one answer counts. */
  chartMixed: 1250,
  /** Painting a whole chart. */
  chartPaint: 1600,
  lessonCore: 1300,
  lessonAdvanced: 1600,
  /** A decision from a saved solver spot: the player chose it after seeing the answer, so it is not rated as the hardest item. */
  solverSpot: 1450,
  /** A river decision in a scenario, graded by Felt Solver for the hero's exact hand. */
  scenarioRiver: 1500,
  /** A math fact from the review deck, like the price of a half pot bet. */
  mathFact: 1250,
} as const;

/**
 * Difficulty of a chart decision, or undefined when every answer would be
 * accepted (a hand every action plays often enough): such a question tells
 * the rating nothing, so it is not rated.
 */
export function chartItemDifficulty(mix: HandMix, actions: readonly string[]): number | undefined {
  const accepted = actions.filter((a) => scoreRecall(mix, a) === 1).length;
  if (accepted >= actions.length) return undefined;
  return isMixed(mix) ? DIFFICULTY.chartMixed : DIFFICULTY.chartEdge;
}

// Adaptive practice ------------------------------------------------------

export interface PracticeItem {
  id: string;
  domain: SkillDomain;
  difficulty: number;
}

/**
 * Picks practice items near a target success rate. Learning works best when
 * most answers are right but not all: adaptive systems aim near 75 to 85%
 * (Klinkenberg et al. 2011; Wilson et al. 2019). Weaker areas get more items,
 * and areas are interleaved rather than blocked (Rohrer and Taylor 2007).
 */
export function pickAdaptive<T extends PracticeItem>(
  items: readonly T[],
  ratingFor: (domain: SkillDomain) => number,
  { n = 10, target = PRACTICE_TARGET, rand = Math.random, exclude = new Set<string>() }: { n?: number; target?: number; rand?: () => number; exclude?: ReadonlySet<string> } = {},
): T[] {
  const pool = items.filter((i) => !exclude.has(i.id));
  // Score every item by how far its expected success is from the target, with a little noise to vary sessions.
  const scored = pool.map((item) => ({ item, gap: Math.abs(expectedScore(ratingFor(item.domain), item.difficulty) - target) + rand() * 0.04 }));
  scored.sort((a, b) => a.gap - b.gap);
  // Share of the session per area: weaker areas get more.
  const domains = [...new Set(pool.map((i) => i.domain))];
  const weakest = [...domains].sort((a, b) => ratingFor(a) - ratingFor(b));
  const byDomain = new Map(domains.map((d) => [d, scored.filter((s) => s.item.domain === d).map((s) => s.item)]));
  const picked: T[] = [];
  let round = 0;
  while (picked.length < n && [...byDomain.values()].some((q) => q.length)) {
    // Each round takes one from every area, and the weakest half take a second.
    for (const [rank, d] of weakest.entries()) {
      const queue = byDomain.get(d)!;
      const take = rank < Math.ceil(weakest.length / 2) ? 2 : 1;
      for (let k = 0; k < take && queue.length && picked.length < n; k++) picked.push(queue.shift()!);
    }
    round++;
    if (round > n) break;
  }
  // Interleave: no two items from the same area in a row where it can be avoided.
  const out: T[] = [];
  const rest = [...picked];
  while (rest.length) {
    const i = rest.findIndex((x) => x.domain !== out[out.length - 1]?.domain);
    out.push(rest.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return out;
}

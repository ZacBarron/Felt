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
 * Zheng 2006).
 */
export const TIERS: { min: number; name: string }[] = [
  { min: -Infinity, name: 'Newcomer' },
  { min: 900, name: 'Learner' },
  { min: 1050, name: 'Recreational' },
  { min: 1200, name: 'Contender' },
  { min: 1350, name: 'Grinder' },
  { min: 1500, name: 'Regular' },
  { min: 1650, name: 'Strong regular' },
  { min: 1800, name: 'Expert' },
  { min: 1950, name: 'Pro' },
  { min: 2100, name: 'Elite' },
  { min: 2250, name: 'World class' },
];

export function tierFor(rating: number): string {
  return [...TIERS].reverse().find((t) => rating >= t.min)!.name;
}

/** The next tier up and how far away it is, or undefined at the top. */
export function nextTier(rating: number): { name: string; min: number; pointsAway: number; progress: number } | undefined {
  const i = TIERS.findIndex((t) => t.min > rating);
  if (i < 0) return undefined;
  const next = TIERS[i];
  const floor = i > 1 ? TIERS[i - 1].min : next.min - 150;
  return { name: next.name, min: next.min, pointsAway: Math.ceil(next.min - rating), progress: Math.max(0, Math.min(1, (rating - floor) / (next.min - floor))) };
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
  /** A chart hand that is a clear raise or fold, away from the range edge. */
  chartClear: 1050,
  /** A pure action on the range edge. */
  chartEdge: 1350,
  /** A mixed hand: knowing it mixes, and which way. */
  chartMixed: 1550,
  /** Painting a whole chart. */
  chartPaint: 1600,
  lessonCore: 1300,
  lessonAdvanced: 1600,
  /** A decision taken from a solved spot. */
  solverSpot: 1700,
} as const;

/** Difficulty of a chart recall card from how far the hand is from the range edge and whether it mixes. */
export function chartItemDifficulty(isMixed: boolean, isEdge: boolean): number {
  if (isMixed) return DIFFICULTY.chartMixed;
  return isEdge ? DIFFICULTY.chartEdge : DIFFICULTY.chartClear;
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
  { n = 10, target = 0.8, rand = Math.random, exclude = new Set<string>() }: { n?: number; target?: number; rand?: () => number; exclude?: ReadonlySet<string> } = {},
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

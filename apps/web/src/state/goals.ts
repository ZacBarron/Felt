import { CURRICULUM } from '@felt/content';
import type { Experience, Focus, Goal, Profile } from './settings';

type Audience = 'beginner' | 'player' | 'all';

/**
 * Copy for onboarding choices. `plan` finishes the sentence "Your plan to ...".
 * Beginners (new, or play for fun) see goals in their own words; regular and
 * professional players see the ones that name their game. `plain` rewords a
 * shared goal for beginners.
 */
export const GOALS: { id: Goal; label: string; note: string; plan: string; audience: Audience; plain?: { label: string; note: string } }[] = [
  { id: 'learn', label: 'Learn the game properly', note: 'From the rules to a solid plan', plan: 'learn the game properly', audience: 'beginner' },
  { id: 'home-games', label: 'Win at home games', note: 'Beat friends and family', plan: 'win at home games', audience: 'beginner' },
  { id: 'casino', label: 'Play at a casino', note: 'Feel ready at a real table', plan: 'feel ready at a casino', audience: 'beginner' },
  { id: 'climb', label: 'Get really good', note: 'Climb as high as I can', plan: 'get really good at poker', audience: 'beginner' },
  { id: 'win-live', label: 'Win more at live cash', note: 'Beat the games I play now', plan: 'win more at live cash', audience: 'player' },
  { id: 'move-up', label: 'Move up in stakes', note: 'Get good enough for bigger games', plan: 'move up in stakes', audience: 'player' },
  { id: 'go-pro', label: 'Play professionally', note: 'Poker as a real income', plan: 'play at a professional level', audience: 'player' },
  { id: 'master-gto', label: 'Master GTO', note: 'Understand why solvers play the way they do', plan: 'master GTO', audience: 'player' },
  {
    id: 'tournaments',
    label: 'Go deep in tournaments',
    note: 'Short stacks and final tables',
    plan: 'go deep in tournaments',
    audience: 'all',
    plain: { label: 'Play tournaments', note: 'One buy in. Prizes go to the last players left.' },
  },
];

/** New players and people who play for fun get plain words and the basics first. */
export const isBeginner = (experience?: Experience) => experience === 'new' || experience === 'casual';

/** The goals to offer for an experience level, worded for that player. */
export function goalsFor(experience?: Experience) {
  const beginner = isBeginner(experience);
  return GOALS.filter((g) => g.audience === 'all' || (g.audience === 'beginner') === beginner).map((g) => (beginner && g.plain ? { ...g, ...g.plain } : g));
}

export const EXPERIENCE: { id: Experience; label: string; note: string }[] = [
  { id: 'new', label: 'New to poker', note: 'Start with the rules. No experience needed.' },
  { id: 'casual', label: 'I know the rules', note: 'I play for fun now and then' },
  { id: 'winning', label: 'I play regularly', note: 'I want a bigger edge in my games' },
  { id: 'pro', label: 'Poker is my job', note: 'Or close to it' },
];

/** A short reply under the experience question, so each answer feels heard. */
export const EXPERIENCE_REPLY: Record<Experience, string> = {
  new: 'Perfect. You start with how a hand works.',
  casual: 'Good. A short quiz will skip what you know.',
  winning: 'Good. Your quiz will skip straight to your gaps.',
  pro: 'Then expect hard spots. Your quiz skips the rest.',
};

/**
 * Tiers a player can aim for, from the rating ladder in core. What each one
 * means describes skill, never money: winnings depend on the game too.
 */
export const TARGETS: { tier: string; note: string }[] = [
  { tier: 'Solid', note: 'Sound basics and few big mistakes' },
  { tier: 'Regular', note: 'The right play in common spots' },
  { tier: 'Expert', note: 'Adjust to each opponent on purpose' },
  { tier: 'Elite', note: 'Close to perfect in every spot Felt rates' },
];

/** Each area says what it means in plain words, so the list works for every level. */
export const FOCUS: { id: Focus; label: string; note: string; module: string }[] = [
  { id: 'preflop', label: 'Preflop ranges', note: 'Which hands to play from each seat', module: 'preflop/rfi' },
  { id: 'postflop', label: 'Postflop decisions', note: 'What to do after the flop', module: 'postflop/cbet' },
  { id: 'sizing', label: 'Bet sizing', note: 'How much to bet and why', module: 'postflop/river' },
  { id: 'reads', label: 'Reading opponents', note: 'Spot their habits and use them', module: 'exploit/profiling' },
  { id: 'math', label: 'Poker math', note: 'Pot odds and your chance to win', module: 'foundations/math' },
  { id: 'mental', label: 'Tilt and mindset', note: 'Play well after a bad beat', module: 'mindset/mental' },
  { id: 'bankroll', label: 'Bankroll and swings', note: 'How much money to bring and why', module: 'mindset/mental' },
];

/** What each daily amount buys, never a finish line: there is always more to train. */
export const DAILY_OPTIONS: { minutes: number; note: string }[] = [
  { minutes: 5, note: 'Enough for your daily review' },
  { minutes: 10, note: 'A lesson plus your review' },
  { minutes: 15, note: 'Your full plan each day' },
  { minutes: 20, note: 'Your plan plus extra practice' },
];

/** Study cues for an if-then plan: "When I ..., I will study". */
export const CUES: { id: string; label: string; phrase: string; time: [number, number] }[] = [
  { id: 'coffee', label: 'When I start my day', phrase: 'start my day', time: [8, 0] },
  { id: 'lunch', label: 'On a break', phrase: 'take a break', time: [12, 30] },
  { id: 'before-play', label: 'Before I play', phrase: 'sit down to play', time: [18, 0] },
  { id: 'evening', label: 'In the evening', phrase: 'wind down in the evening', time: [21, 0] },
];

export const cueCopy = (id?: string) => CUES.find((c) => c.id === id);

export function goalCopy(goal?: Goal) {
  return GOALS.find((g) => g.id === goal);
}

/** Modules each goal brings forward in the path. */
export const GOAL_MODULES: Record<Goal, string[]> = {
  learn: [],
  'home-games': ['preflop/live-preflop', 'exploit/profiling'],
  casino: ['basics/money', 'preflop/live-preflop'],
  climb: ['foundations/math', 'preflop/rfi'],
  'win-live': ['preflop/live-preflop', 'exploit/adjustments'],
  'move-up': ['preflop/3bet-pots', 'postflop/river'],
  'go-pro': ['postflop/later-streets', 'exploit/profiling'],
  'master-gto': ['foundations/theory', 'foundations/ranges'],
  tournaments: ['tournaments/mtt-basics'],
};

/** The plan line for the goals a player picked: "To win more at live cash and move up in stakes". */
export function goalsLine(goals: readonly Goal[]): string | undefined {
  const plans = goals.map((g) => goalCopy(g)?.plan).filter(Boolean) as string[];
  if (plans.length === 0) return undefined;
  if (plans.length === 1) return `To ${plans[0]}`;
  if (plans.length === 2) return `To ${plans[0]} and ${plans[1]}`;
  return `Built for your ${plans.length} goals`;
}

const BASICS_MODULES = (CURRICULUM.find((t) => t.id === 'basics')?.modules ?? []).map((m) => `basics/${m.id}`);

/**
 * Path preferences from a profile: focus areas first, then the modules each
 * goal needs, in the order picked. Someone new starts with the basics
 * whatever their goals, and so does a casual player who skipped placement:
 * a goal like moving up should never put a 3bet lesson before the rules.
 */
export function pathPrefs(profile: Profile) {
  const goals = profile.goals ?? (profile.goal ? [profile.goal] : []);
  const basicsFirst = profile.experience === 'new' || (profile.experience === 'casual' && !profile.placedAt);
  const modules = [...(basicsFirst ? BASICS_MODULES : []), ...FOCUS.filter((f) => profile.focus.includes(f.id)).map((f) => f.module), ...goals.flatMap((g) => GOAL_MODULES[g])];
  return {
    placedAt: profile.placedAt && profile.placedAt !== 'all' ? profile.placedAt : undefined,
    focus: [...new Set(modules)],
  };
}

import type { Experience, Focus, Goal, Profile } from './settings';

/** Copy for onboarding choices. `plan` finishes the sentence "Your plan to ..." */
export const GOALS: { id: Goal; label: string; note: string; plan: string }[] = [
  { id: 'win-live', label: 'Win more at live cash', note: 'Beat the games I play now', plan: 'win more at live cash' },
  { id: 'move-up', label: 'Move up in stakes', note: 'Get good enough for bigger games', plan: 'move up in stakes' },
  { id: 'go-pro', label: 'Play professionally', note: 'Poker as a real income', plan: 'play at a professional level' },
  { id: 'master-gto', label: 'Master GTO', note: 'Understand why solvers play the way they do', plan: 'master GTO' },
  { id: 'tournaments', label: 'Go deep in tournaments', note: 'Short stacks and final tables', plan: 'go deep in tournaments' },
];

export const EXPERIENCE: { id: Experience; label: string; note: string }[] = [
  { id: 'new', label: 'New to the game', note: 'I know the rules and not much more' },
  { id: 'casual', label: 'Casual player', note: 'I play for fun and roughly break even' },
  { id: 'winning', label: 'Winning player', note: 'I beat my game and want a bigger edge' },
  { id: 'pro', label: 'Professional', note: 'Poker is my job, or close to it' },
];

export const FOCUS: { id: Focus; label: string; module: string }[] = [
  { id: 'preflop', label: 'Preflop ranges', module: 'preflop/rfi' },
  { id: 'postflop', label: 'Postflop decisions', module: 'postflop/cbet' },
  { id: 'sizing', label: 'Bet sizing', module: 'postflop/river' },
  { id: 'reads', label: 'Reading opponents', module: 'exploit/profiling' },
  { id: 'math', label: 'Poker math', module: 'foundations/math' },
  { id: 'mental', label: 'Tilt and mindset', module: 'mindset/mental' },
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
  { id: 'coffee', label: 'With my morning coffee', phrase: 'have my morning coffee', time: [8, 0] },
  { id: 'commute', label: 'On my commute', phrase: 'start my commute', time: [8, 30] },
  { id: 'lunch', label: 'On my lunch break', phrase: 'take my lunch break', time: [12, 30] },
  { id: 'before-play', label: 'Before I play', phrase: 'sit down to play', time: [18, 0] },
  { id: 'evening', label: 'In the evening', phrase: 'wind down in the evening', time: [21, 0] },
];

export const cueCopy = (id?: string) => CUES.find((c) => c.id === id);

export function goalCopy(goal?: Goal) {
  return GOALS.find((g) => g.id === goal);
}

/** Modules each goal brings forward in the path. */
export const GOAL_MODULES: Record<Goal, string[]> = {
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

/** Path preferences from a profile: focus areas first, then the modules each goal needs, in the order picked. */
export function pathPrefs(profile: Profile) {
  const goals = profile.goals ?? (profile.goal ? [profile.goal] : []);
  const modules = [...FOCUS.filter((f) => profile.focus.includes(f.id)).map((f) => f.module), ...goals.flatMap((g) => GOAL_MODULES[g])];
  return {
    placedAt: profile.placedAt && profile.placedAt !== 'all' ? profile.placedAt : undefined,
    focus: [...new Set(modules)],
  };
}

import type { Experience, Focus, Goal, Profile } from './settings';

/** Copy for onboarding choices. `plan` finishes the sentence "Your plan to ..." */
export const GOALS: { id: Goal; label: string; note: string; plan: string }[] = [
  { id: 'win-live', label: 'Win more at live cash', note: 'Beat the games I play now', plan: 'win more at live cash' },
  { id: 'move-up', label: 'Move up in stakes', note: 'Get good enough for bigger games', plan: 'move up in stakes' },
  { id: 'go-pro', label: 'Play professionally', note: 'Poker as a real income', plan: 'play at a professional level' },
  { id: 'master-gto', label: 'Master GTO', note: 'Understand why solvers play the way they do', plan: 'master GTO' },
  { id: 'tournaments', label: 'Go deep in tournaments', note: 'Short stacks, ICM, final tables', plan: 'go deep in tournaments' },
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

export const DAILY_OPTIONS: { minutes: number }[] = [{ minutes: 5 }, { minutes: 10 }, { minutes: 15 }, { minutes: 20 }];

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

/** Path preferences from a profile: focus areas first, then the modules the goal needs. */
export function pathPrefs(profile: Profile) {
  return {
    placedAt: profile.placedAt && profile.placedAt !== 'all' ? profile.placedAt : undefined,
    focus: [...FOCUS.filter((f) => profile.focus.includes(f.id)).map((f) => f.module), ...(profile.goal ? GOAL_MODULES[profile.goal] : [])],
  };
}

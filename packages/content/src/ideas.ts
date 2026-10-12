/**
 * Short ideas for the home screen, one per day. Each is a single true,
 * useful sentence or two; `basis` marks equilibrium theory vs pool exploits.
 */
export interface Idea {
  id: string;
  topic: 'Math' | 'Theory' | 'Exploit' | 'Mindset';
  title: string;
  body: string;
  basis: 'gto' | 'exploit' | 'general';
}

export const IDEAS: Idea[] = [
  {
    id: 'pot-odds',
    topic: 'Math',
    title: 'Pot sized bet, 33% to call',
    body: 'Facing a pot sized bet you call 1 to win 3, so you need 33% equity. Half pot needs 25%.',
    basis: 'general',
  },
  {
    id: 'mdf',
    topic: 'Theory',
    title: 'Defend half against a pot bet',
    body: 'Fold more than half your range to a pot sized bet and any two cards become a profitable bluff.',
    basis: 'gto',
  },
  {
    id: 'bluff-share',
    topic: 'Theory',
    title: 'One bluff for every two value bets',
    body: 'A balanced pot sized river bet is one third bluffs. At half pot, one quarter.',
    basis: 'gto',
  },
  {
    id: 'two-and-four',
    topic: 'Math',
    title: 'Outs times four, then two',
    body: 'On the flop, outs times 4 estimates your equity by the river; on the turn, outs times 2. Nine flush outs is about 35%.',
    basis: 'general',
  },
  {
    id: 'combos',
    topic: 'Math',
    title: 'Pairs are rare',
    body: 'A pair has 6 combos, a suited hand 4, an offsuit hand 12. AK is 16 combos; AA is only 6.',
    basis: 'general',
  },
  {
    id: 'blockers',
    topic: 'Theory',
    title: 'Blockers change the math',
    body: 'Holding the ace of a three suited board removes every nut flush from your opponent. That makes it a strong card to bluff with.',
    basis: 'gto',
  },
  {
    id: 'range-advantage',
    topic: 'Theory',
    title: 'Small bets on high boards',
    body: 'The preflop raiser has more strong hands on boards like K72 rainbow. That range advantage is why small, frequent c-bets work there.',
    basis: 'gto',
  },
  {
    id: 'position',
    topic: 'Theory',
    title: 'Position is equity you keep',
    body: 'Acting last lets you see more free cards and control the pot, so the same hand wins more often in position.',
    basis: 'general',
  },
  {
    id: 'suited',
    topic: 'Theory',
    title: 'Suited is worth more than it looks',
    body: 'Suitedness adds only a few points of raw equity, but flush draws and backdoors make suited hands far easier to play.',
    basis: 'general',
  },
  {
    id: 'live-river-raise',
    topic: 'Exploit',
    title: 'Live river raises are value',
    body: 'At low stakes live, big river raises are rarely bluffs. Folding more than the math says is usually the winning adjustment.',
    basis: 'exploit',
  },
  {
    id: 'live-iso',
    topic: 'Exploit',
    title: 'Punish limpers in position',
    body: 'Raise limpers with a wide, strong range from late position. Size up by about one big blind per limper.',
    basis: 'exploit',
  },
  {
    id: 'rake',
    topic: 'Theory',
    title: 'Rake taxes small pots',
    body: 'Rake takes the biggest bite from small and multiway pots, so tighten your cold calls when the drop is high.',
    basis: 'general',
  },
  {
    id: 'results',
    topic: 'Mindset',
    title: 'Judge the decision, not the card',
    body: "A good fold that would have won is still a good fold. Track your EV loss, not last night's result.",
    basis: 'general',
  },
  {
    id: 'spr',
    topic: 'Theory',
    title: 'Low SPR, simple decisions',
    body: 'With a stack to pot ratio under about 3, strong one pair hands are usually happy to get all in.',
    basis: 'general',
  },
];

/** A stable pick for the day, so the idea does not change on every render. */
export function ideaForDay(date: Date): Idea {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return IDEAS[day % IDEAS.length];
}

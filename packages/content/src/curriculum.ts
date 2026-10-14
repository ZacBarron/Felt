/**
 * The curriculum outline. Source of truth for tracks, modules and lessons;
 * docs/CURRICULUM.md explains the teaching approach around it.
 */

export type DrillKind =
  | 'range-recall' // paint or recall a range on the 13x13 grid
  | 'spot-action' // pick an action (and sizing) at a solver node
  | 'frequency' // estimate how often GTO takes each action
  | 'math' // pot odds, MDF, combos, EV, done fast
  | 'equity-estimate' // guess hand vs range equity, scored by error
  | 'concept'; // short recall cards for principles and definitions

export interface Lesson {
  id: string;
  title: string;
  drills: DrillKind[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Track {
  id: string;
  title: string;
  summary: string;
  modules: Module[];
}

const lesson = (id: string, title: string, drills: DrillKind[]): Lesson => ({ id, title, drills });

export const CURRICULUM: Track[] = [
  {
    id: 'basics',
    title: 'Poker basics',
    summary: 'The rules, a first strategy and how to play for money.',
    modules: [
      {
        id: 'rules',
        title: 'How a hand works',
        lessons: [
          lesson('goal', 'The goal and the cards', ['concept']),
          lesson('rankings', 'Hand rankings', ['concept']),
          lesson('best-five', 'Making your best five', ['concept']),
          lesson('hand-flow', 'How a hand plays out', ['concept']),
          lesson('actions', 'Your options on your turn', ['concept']),
          lesson('table-rules', 'Live table basics', ['concept']),
          lesson('side-pots', 'All in and side pots', ['concept', 'math']),
        ],
      },
      {
        id: 'first-strategy',
        title: 'Your first strategy',
        lessons: [
          lesson('big-blinds', 'Big blinds and stacks', ['concept', 'math']),
          lesson('position', 'Position and seat names', ['concept']),
          lesson('starting-hands', 'Starting hands', ['concept']),
          lesson('ranges', 'What a range is', ['concept']),
          lesson('odds', 'Odds in plain words', ['math']),
          lesson('the-nuts', 'Reading the board: the nuts', ['concept']),
        ],
      },
      {
        id: 'money',
        title: 'Playing for money',
        lessons: [
          lesson('stakes', 'How stakes work', ['concept', 'math']),
          lesson('card-room', 'Your first time at a card room', ['concept']),
          lesson('bankroll-start', 'Money set aside for poker', ['concept', 'math']),
        ],
      },
    ],
  },
  {
    id: 'foundations',
    title: 'Foundations',
    summary: 'The math and range thinking every later decision rests on.',
    modules: [
      {
        id: 'math',
        title: 'Poker math',
        lessons: [
          lesson('pot-odds', 'Pot odds and required equity', ['math']),
          lesson('ev', 'Expected value of every action', ['math', 'concept']),
          lesson('outs', 'Outs, draws and the rule of 2 and 4', ['math']),
          lesson('implied-odds', 'Implied and reverse implied odds', ['math', 'concept']),
          lesson('mdf-alpha', 'MDF and bluff break even (alpha)', ['math']),
          lesson('combos', 'Combinatorics and blockers', ['math']),
          lesson('spr', 'Stack to pot ratio and commitment', ['math', 'concept']),
        ],
      },
      {
        id: 'ranges',
        title: 'Thinking in ranges',
        lessons: [
          lesson('range-vs-range', 'Hand vs range and range vs range', ['equity-estimate']),
          lesson('advantages', 'Range advantage and nut advantage', ['concept', 'equity-estimate']),
          lesson('range-shapes', 'Linear, polarized and condensed ranges', ['concept']),
          lesson('equity-realization', 'Equity realization and position', ['concept']),
        ],
      },
      {
        id: 'theory',
        title: 'Game theory',
        lessons: [
          lesson('what-is-gto', 'What GTO means, and what it does not', ['concept']),
          lesson('solvers', 'How solvers work and how to read them', ['concept']),
          lesson('simplification', 'Simplified strategies and what they cost', ['concept']),
          lesson('equity-benchmarks', 'Equity benchmarks worth knowing', ['equity-estimate', 'math']),
        ],
      },
    ],
  },
  {
    id: 'preflop',
    title: 'Preflop GTO',
    summary: 'Memorize and understand ranges for every position and common spot.',
    modules: [
      {
        id: 'rfi',
        title: 'Opening ranges (RFI)',
        lessons: [
          lesson('rfi-ep', 'Early position opens', ['range-recall', 'spot-action']),
          lesson('rfi-lp', 'Late position opens', ['range-recall', 'spot-action']),
          lesson('rfi-sb', 'SB strategy: raise or limp', ['range-recall', 'spot-action']),
        ],
      },
      {
        id: 'vs-open',
        title: 'Facing an open',
        lessons: [
          lesson('bb-defense', 'Big blind defense', ['range-recall', 'frequency']),
          lesson('cold-3bet', '3bet or fold in position', ['range-recall', 'spot-action']),
          lesson('flatting', 'When flatting is allowed', ['concept', 'spot-action']),
          lesson('sb-vs-open', 'Small blind facing an open', ['concept', 'spot-action']),
          lesson('squeeze', 'Squeezing', ['concept', 'spot-action']),
        ],
      },
      {
        id: '3bet-pots',
        title: '3bet and 4bet pots',
        lessons: [
          lesson('vs-3bet', 'Facing a 3bet', ['range-recall', 'frequency']),
          lesson('4bet', '4bet and 5bet ranges', ['range-recall']),
          lesson('bvb', 'Blind vs blind', ['range-recall', 'spot-action']),
        ],
      },
      {
        id: 'stack-depth',
        title: 'Stack depth and sizing',
        lessons: [
          lesson('depth', 'How ranges change at 40, 60, 100 and 200bb', ['concept', 'range-recall']),
          lesson('open-sizing', 'Open and 3bet sizing theory', ['concept']),
          lesson('rake', 'How rake changes preflop play', ['concept', 'math']),
        ],
      },
      {
        id: 'live-preflop',
        title: 'Live preflop',
        lessons: [
          lesson('big-opens', 'Facing large live opens', ['concept', 'spot-action']),
          lesson('straddles', 'Straddled pots', ['concept', 'spot-action']),
          lesson('limped-pots', 'Overlimping and multiway limped pots', ['concept', 'spot-action']),
        ],
      },
    ],
  },
  {
    id: 'postflop',
    title: 'Postflop GTO',
    summary: 'Board textures, sizing, and the logic behind solver strategies.',
    modules: [
      {
        id: 'textures',
        title: 'Board textures',
        lessons: [
          lesson('texture-classes', 'Classifying flops', ['concept']),
          lesson('who-it-favors', 'Which range a board favors', ['equity-estimate', 'concept']),
        ],
      },
      {
        id: 'cbet',
        title: 'Continuation betting',
        lessons: [
          lesson('cbet-ip', 'C-betting in position', ['spot-action', 'frequency']),
          lesson('cbet-oop', 'C-betting out of position', ['spot-action', 'frequency']),
          lesson('sizing', 'Small range bets vs big polar bets', ['concept', 'spot-action']),
        ],
      },
      {
        id: 'defense',
        title: 'Defending',
        lessons: [
          lesson('vs-cbet', 'Facing a c-bet', ['spot-action', 'math']),
          lesson('check-raise', 'Check raising', ['spot-action', 'frequency']),
          lesson('probe', 'Probes and delayed c-bets', ['spot-action']),
        ],
      },
      {
        id: 'hand-reading',
        title: 'Hand reading',
        lessons: [
          lesson('narrowing', 'Hand reading: narrowing ranges street by street', ['concept', 'math']),
          lesson('semi-bluffs', 'Semi-bluffing with draws', ['spot-action', 'math']),
        ],
      },
      {
        id: 'later-streets',
        title: 'Turn and river',
        lessons: [
          lesson('turn-cards', 'Good and bad turn cards', ['spot-action', 'concept']),
          lesson('barreling', 'Double and triple barrels', ['spot-action', 'frequency']),
          lesson('bluff-selection', 'Choosing bluffs with blockers', ['spot-action', 'math']),
          lesson('bluff-catching', 'Bluff catching on the river', ['spot-action', 'math']),
          lesson('pot-control', 'Showdown value and pot control', ['spot-action', 'concept']),
        ],
      },
      {
        id: 'river',
        title: 'River play',
        lessons: [
          lesson('thin-value', 'Thin value bets', ['spot-action', 'concept']),
          lesson('overbets', 'Overbets', ['spot-action', 'concept']),
          lesson('block-bets', 'Small river bets and block bets', ['spot-action', 'concept']),
          lesson('river-raises', 'Raising the river', ['spot-action', 'math']),
        ],
      },
      {
        id: '3bet-postflop',
        title: '3bet pots postflop',
        lessons: [
          lesson('cbet-3bp', 'C-betting in 3bet pots', ['spot-action', 'frequency']),
          lesson('low-spr', 'Playing low SPR pots', ['spot-action', 'math']),
        ],
      },
      {
        id: 'multiway',
        title: 'Multiway pots',
        lessons: [
          lesson('multiway', 'How multiway changes everything', ['concept', 'spot-action']),
          lesson('multiway-cbet', 'Betting and defending multiway', ['spot-action', 'concept']),
        ],
      },
    ],
  },
  {
    id: 'exploit',
    title: 'Exploitation',
    summary: 'Deviate from GTO on purpose, against specific players and pools.',
    modules: [
      {
        id: 'profiling',
        title: 'Reading opponents',
        lessons: [
          lesson('archetypes', 'Player archetypes and their leaks', ['concept']),
          lesson('population', 'Population tendencies, live and online', ['concept']),
          lesson('hud-stats', 'Reading stats: VPIP, PFR, 3bet, fold to c-bet', ['concept', 'math']),
        ],
      },
      {
        id: 'adjustments',
        title: 'Making adjustments',
        lessons: [
          lesson('node-lock', 'Node locking: how GTO shifts vs a leak', ['concept', 'spot-action']),
          lesson('vs-station', 'Beating calling stations', ['spot-action']),
          lesson('vs-nit', 'Beating nits', ['spot-action']),
          lesson('vs-aggro', 'Beating maniacs and LAGs', ['spot-action']),
          lesson('live-limpers', 'Punishing limpers', ['range-recall', 'spot-action']),
        ],
      },
      {
        id: 'tells',
        title: 'Tells',
        lessons: [
          lesson('bet-patterns', 'Sizing and timing tells', ['concept']),
          lesson('physical', 'Physical live tells and their reliability', ['concept']),
          lesson('own-image', 'Managing your own image and tells', ['concept']),
          lesson('poker-face', 'Your poker face', ['concept']),
          lesson('using-tells', 'How much to trust a tell', ['concept', 'math']),
        ],
      },
    ],
  },
  {
    id: 'mindset',
    title: 'Mental game and bankroll',
    summary: 'Stay at A game, manage variance, study efficiently.',
    modules: [
      {
        id: 'mental',
        title: 'Mental game',
        lessons: [
          lesson('tilt', 'Recognizing and stopping tilt', ['concept']),
          lesson('variance', 'Variance, downswings and sample size', ['concept', 'math']),
          lesson('bankroll', 'Bankroll management and moving up', ['concept', 'math']),
          lesson('stop-rules', 'Knowing when to stop', ['concept']),
        ],
      },
      {
        id: 'study',
        title: 'Studying well',
        lessons: [
          lesson('study-plan', 'A study routine that sticks', ['concept']),
          lesson('hand-review', 'Reviewing your own hands', ['concept']),
        ],
      },
    ],
  },
  {
    id: 'results',
    title: 'Win rate, rake and variance',
    summary: 'What you win per hour, what the game costs and how much it swings.',
    modules: [
      {
        id: 'win-rate',
        title: 'Win rates',
        lessons: [
          lesson('bb-per-100', 'What bb/100 means', ['concept', 'math']),
          lesson('per-hour', 'Win rate per hour', ['math']),
          lesson('true-cost', 'What the game costs you', ['concept', 'math']),
          lesson('table-selection', 'Choosing a good table', ['concept']),
        ],
      },
      {
        id: 'rake',
        title: 'Rake',
        lessons: [
          lesson('how-rake-works', 'How rooms take rake', ['concept', 'math']),
          lesson('rake-cost', 'What rake costs you', ['math']),
          lesson('rake-strategy', 'Playing a raked game', ['concept']),
        ],
      },
      {
        id: 'variance',
        title: 'Variance',
        lessons: [
          lesson('standard-deviation', 'How much results swing', ['concept', 'math']),
          lesson('sample-size', 'How many hands you need', ['math']),
          lesson('downswings', 'Downswings', ['concept', 'math']),
          lesson('risk-of-ruin', 'Risk of ruin', ['math']),
          lesson('luck-vs-skill', 'Luck and skill', ['concept', 'math']),
        ],
      },
    ],
  },
  {
    id: 'tournaments',
    title: 'Tournaments',
    summary: 'Short stacks, antes and the money that ICM puts on survival.',
    modules: [
      {
        id: 'mtt-basics',
        title: 'Tournament basics',
        lessons: [
          lesson('antes', 'Antes and wider ranges', ['concept', 'math']),
          lesson('push-fold', 'Push or fold with a short stack', ['range-recall', 'math']),
          lesson('reshoves', 'Reshoving 12 to 25bb', ['spot-action', 'math']),
          lesson('icm', 'ICM: why chips are not money', ['concept', 'math']),
          lesson('bubble', 'The bubble and pay jumps', ['concept', 'math']),
          lesson('final-table', 'Final tables', ['concept', 'math']),
          lesson('bounties', 'Bounty tournaments', ['concept', 'math']),
          lesson('satellites', 'Satellites', ['concept', 'math']),
        ],
      },
    ],
  },
];

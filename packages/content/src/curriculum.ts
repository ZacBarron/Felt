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

/**
 * What orients a player before a topic: why it matters, when it comes up at
 * the table and what they will be able to do. Plain words, in docs/VOICE.md
 * style, and only promises the topic's lessons keep.
 */
export interface ModuleIntro {
  /** One or two short sentences on why the topic matters for winning. */
  why: string;
  /** One or two short sentences on the moment at the table it comes up. */
  when: string;
  /** Two or three outcomes that finish "You will", like "Know which hands to open from every seat". */
  youWill: string[];
}

export interface Module {
  id: string;
  title: string;
  intro: ModuleIntro;
  lessons: Lesson[];
}

export interface Track {
  id: string;
  title: string;
  summary: string;
  /** One sentence on why the track matters, shown under its summary. */
  intro: { why: string };
  modules: Module[];
}

const lesson = (id: string, title: string, drills: DrillKind[]): Lesson => ({ id, title, drills });

export const CURRICULUM: Track[] = [
  {
    id: 'basics',
    title: 'Poker basics',
    summary: 'The rules, a first strategy and how to play for money.',
    intro: { why: 'Start here if you have never played or want a clean refresher.' },
    modules: [
      {
        id: 'rules',
        title: 'How a hand works',
        intro: {
          why: 'You cannot make good choices until the rules feel natural. This topic covers the whole game in plain words.',
          when: 'Every hand you play follows these rules. You use them from the deal to the showdown.',
          youWill: ['Rank every poker hand from best to worst', 'Follow a hand from the deal to the showdown', 'Know your options when it is your turn'],
        },
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
        intro: {
          why: 'Knowing the rules is not enough to win. This topic gives you a simple plan for which hands to play.',
          when: 'You use it before every hand and on every board. It starts the moment you look at your cards.',
          youWill: ['Count stacks in big blinds', 'Pick strong starting hands for your seat', 'Find the nuts on any board'],
        },
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
        intro: {
          why: 'Real money adds a few new choices before you sit down. A little planning keeps poker fun and affordable.',
          when: 'It comes up when you pick a game and walk into a card room. It also matters on nights you lose.',
          youWill: ['Read a game name like 1/3', 'Get a seat and buy chips at a card room', 'Set aside money for poker that you can afford to lose'],
        },
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
    intro: { why: 'Every later decision rests on this math and on thinking in ranges.' },
    modules: [
      {
        id: 'math',
        title: 'Poker math',
        intro: {
          why: 'Math tells you if a call or a bet makes money over time. A few quick formulas settle most close decisions.',
          when: 'It comes up each time you face a bet or hold a draw. You also use it to size your own bets.',
          youWill: ['Turn a bet into the equity you need to call', 'Count your outs and your chance to hit', 'Count combos to see which hands are likely'],
        },
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
        intro: {
          why: 'Players rarely show their cards. Thinking in ranges lets you plan against every hand they could hold.',
          when: 'You use it on every street after the flop. It matters most when you choose whether to bet and how big.',
          youWill: ['Tell which player has the range advantage', 'Tell polarized ranges from condensed ones', 'Price calls by the equity you will really keep'],
        },
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
        intro: {
          why: 'GTO is a strategy that protects you against any opponent heads up. It gives you a safe default for every spot.',
          when: 'You use it when you study a spot away from the table. It shapes the simple rules you take into the game.',
          youWill: ['Know what GTO promises and where it stops', 'Read a solver and simplify what it says', 'Know the equity of common all in matchups'],
        },
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
    intro: { why: 'Good choices before the flop make every later street easier.' },
    modules: [
      {
        id: 'rfi',
        title: 'Opening ranges (RFI)',
        intro: {
          why: 'Opening is the most common choice you make before the flop. Good opens set up every street that follows.',
          when: 'It comes up when everyone folds to you before the flop. Your seat decides how many hands you raise.',
          youWill: ['Know which hands to open from every seat', 'Learn the weakest open in each hand family', 'Play the small blind when it folds to you'],
        },
        lessons: [
          lesson('rfi-ep', 'Early position opens', ['range-recall', 'spot-action']),
          lesson('rfi-lp', 'Late position opens', ['range-recall', 'spot-action']),
          lesson('rfi-sb', 'SB strategy: raise or limp', ['range-recall', 'spot-action']),
        ],
      },
      {
        id: 'vs-open',
        title: 'Facing an open',
        intro: {
          why: 'Someone opens before you in a large share of hands. Choosing well between 3bet, call and fold adds up fast.',
          when: 'It comes up when a player raises before your turn. Your seat and their seat shape the answer.',
          youWill: ['Defend the big blind with the right hands', 'Know when to 3bet and when to call', 'Squeeze when an open gets a call'],
        },
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
        intro: {
          why: '3bet pots are big pots, so mistakes in them cost a lot. Ranges get narrow and blockers start to matter.',
          when: 'It comes up when someone raises over your open. It also comes up when the 2 blinds fight alone.',
          youWill: ['Fold, call or 4bet against a 3bet', 'Pick 4bet bluffs with blockers', 'Play wide ranges blind vs blind'],
        },
        lessons: [
          lesson('vs-3bet', 'Facing a 3bet', ['range-recall', 'frequency']),
          lesson('4bet', '4bet and 5bet ranges', ['range-recall']),
          lesson('bvb', 'Blind vs blind', ['range-recall', 'spot-action']),
        ],
      },
      {
        id: 'stack-depth',
        title: 'Stack depth and sizing',
        intro: {
          why: 'The same hand can raise at one stack size and fold at another. Bet sizes and rake change the price too.',
          when: 'It comes up when stacks are short or deep. It also matters each time you choose your open size.',
          youWill: ['Adjust your hands to the stacks behind them', 'Choose open and 3bet sizes for your seat', 'See how rake turns close calls into folds'],
        },
        lessons: [
          lesson('depth', 'How ranges change at 40, 60, 100 and 200bb', ['concept', 'range-recall']),
          lesson('open-sizing', 'Open and 3bet sizing theory', ['concept']),
          lesson('rake', 'How rake changes preflop play', ['concept', 'math']),
        ],
      },
      {
        id: 'live-preflop',
        title: 'Live preflop',
        intro: {
          why: 'Live games often play far from the charts. Big opens, straddles and limpers change the math.',
          when: 'You will see it at most live cash tables. It starts with the first big open or limp.',
          youWill: ['Defend well against big live opens', 'Measure stacks in straddled pots', 'Choose between an iso raise and a limp behind'],
        },
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
    intro: { why: 'The biggest bets come after the flop, so this is where big pots are won.' },
    modules: [
      {
        id: 'textures',
        title: 'Board textures',
        intro: {
          why: 'The flop helps one range more than the other. Reading that shift tells you who should bet and how big.',
          when: 'You use it each time the flop lands. It is your first read after the cards come out.',
          youWill: ['Sort any flop into a few families', 'Tell which range a board favors', 'Pick a bet size that fits the board'],
        },
        lessons: [
          lesson('texture-classes', 'Classifying flops', ['concept']),
          lesson('who-it-favors', 'Which range a board favors', ['equity-estimate', 'concept']),
        ],
      },
      {
        id: 'cbet',
        title: 'Continuation betting',
        intro: {
          why: 'The preflop raiser faces this choice on most flops. Good c-bets win many pots without a fight.',
          when: 'It comes up when you raised before the flop and got called. It is your first choice on the flop.',
          youWill: ['Know which hands to bet and which to check', 'Adjust your c-bets in position and out of position', 'Choose between small bets and big ones'],
        },
        lessons: [
          lesson('cbet-ip', 'C-betting in position', ['spot-action', 'frequency']),
          lesson('cbet-oop', 'C-betting out of position', ['spot-action', 'frequency']),
          lesson('sizing', 'Small range bets vs big polar bets', ['concept', 'spot-action']),
          lesson('thick-thin', 'Thick and thin value', ['concept', 'equity-estimate']),
        ],
      },
      {
        id: 'defense',
        title: 'Defending',
        intro: {
          why: 'Facing a bet after the flop is one of the most common spots. Fold too much and players can bet any 2 cards.',
          when: 'It comes up when you called before the flop and the raiser bets. It also comes up when they check.',
          youWill: ['Know which hands to defend against a c-bet', 'Check raise with strong hands and draws', 'Bet the turn after the raiser checks back'],
        },
        lessons: [
          lesson('vs-cbet', 'Facing a c-bet', ['spot-action', 'math']),
          lesson('check-raise', 'Check raising', ['spot-action', 'frequency']),
          lesson('probe', 'Probes and delayed c-bets', ['spot-action']),
        ],
      },
      {
        id: 'hand-reading',
        title: 'Hand reading',
        intro: {
          why: 'Each bet and check tells you something about a hand. Reading it turns guesses into counted decisions.',
          when: 'You use it on every street and most of all on the river. It also helps you choose which draws to bet.',
          youWill: ['Narrow a range one street at a time', 'Count value hands and bluffs on the river', 'Semi bluff with your strongest draws'],
        },
        lessons: [
          lesson('narrowing', 'Hand reading: narrowing ranges street by street', ['concept', 'math']),
          lesson('semi-bluffs', 'Semi-bluffing with draws', ['spot-action', 'math']),
        ],
      },
      {
        id: 'later-streets',
        title: 'Turn and river',
        intro: {
          why: 'Bets get bigger on the turn and river. Good choices there decide the biggest pots.',
          when: 'It comes up after a flop bet gets called. Each new card asks if you should keep betting.',
          youWill: ['Tell good turn cards from bad ones', 'Pick bluffs and bluff catchers with blockers', 'Keep the pot small with medium hands'],
        },
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
        intro: {
          why: 'The river is your last chance to win more or lose less. Small edges there add up to real money.',
          when: 'It comes up when the last card lands. You choose how to bet or how to answer a bet.',
          youWill: ['Make thin value bets that get paid', 'Know when an overbet fits', 'Raise the river for value or as a bluff'],
        },
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
        intro: {
          why: '3bet pots are large and the stacks behind are small next to them. One pair often plays for the whole stack.',
          when: 'It comes up after a 3bet gets called. The flop arrives with a big pot already in the middle.',
          youWill: ['C-bet often and small on high boards as the 3bettor', 'Know when top pair should get all in', 'Use SPR to plan the whole hand'],
        },
        lessons: [
          lesson('cbet-3bp', 'C-betting in 3bet pots', ['spot-action', 'frequency']),
          lesson('low-spr', 'Playing low SPR pots', ['spot-action', 'math']),
        ],
      },
      {
        id: 'multiway',
        title: 'Multiway pots',
        intro: {
          why: 'Many pots have 3 or more players. Habits that work heads up stop working there.',
          when: 'It comes up when 2 or more players call before the flop. Live games see it most.',
          youWill: ['Know why bluffs need more folds multiway', 'C-bet less often and with stronger hands', 'Defend from the middle and last seats'],
        },
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
    intro: { why: 'Real opponents make mistakes, and this track shows you how to profit from them.' },
    modules: [
      {
        id: 'profiling',
        title: 'Reading opponents',
        intro: {
          why: 'Most opponents repeat the same mistakes. Spotting them early tells you which leak to attack.',
          when: 'It starts the moment you sit down and watch. Every showdown updates your read.',
          youWill: ['Label players by how they play', 'Know the common leaks of live and online players', 'Read stats without trusting noise'],
        },
        lessons: [
          lesson('archetypes', 'Player archetypes and their leaks', ['concept']),
          lesson('population', 'Population tendencies, live and online', ['concept']),
          lesson('hud-stats', 'Reading stats: VPIP, PFR, 3bet, fold to c-bet', ['concept', 'math']),
        ],
      },
      {
        id: 'adjustments',
        title: 'Making adjustments',
        intro: {
          why: 'GTO is a safe default, but it does not win the most against weak players. Adjusting to a leak earns more.',
          when: 'It comes up once you know a player’s leak. You use it at every table with a station or a nit.',
          youWill: ['Beat calling stations with thinner value bets', 'Steal from nits and respect their raises', 'Raise limpers to play them heads up'],
        },
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
        intro: {
          why: 'Players give away information in how they bet and act. Used with care it can settle a close decision.',
          when: 'It comes up most at live tables. A tell should only move a decision that is already close.',
          youWill: ['Read sizing and timing tells', 'Know how much weight a tell deserves', 'Keep your own routine the same every hand'],
        },
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
    id: 'formats',
    title: 'Other formats',
    summary: 'Games with fewer players or deeper stacks than a full ring.',
    intro: { why: 'Fewer players widen every range, so habits from full tables need new numbers.' },
    modules: [
      {
        id: 'heads-up',
        title: 'Heads up and blind vs blind',
        intro: {
          why: 'Heads up, you post a blind every hand and ranges get very wide. The same math explains blind vs blind at any table.',
          when: 'It comes up in heads up games and when 2 players are left. It also comes up each time it folds to the blinds.',
          youWill: ['Price raises and defense with only 2 players', 'Play the small blind against the big blind', 'Adjust your play to one opponent'],
        },
        lessons: [
          lesson('hu-preflop', 'Heads up preflop: the button opens most hands', ['math', 'concept']),
          lesson('hu-bb-defense', 'Defending the big blind heads up', ['math', 'equity-estimate']),
          lesson('bvb-full-ring', 'Blind vs blind in a full ring', ['math', 'concept']),
          lesson('hu-postflop', 'Postflop heads up', ['equity-estimate', 'concept']),
          lesson('hu-one-opponent', 'Adjusting to one opponent', ['math', 'concept']),
        ],
      },
      {
        id: 'short-handed',
        title: 'Short handed (6-max)',
        intro: {
          why: 'With fewer players behind you, every seat opens more hands. The blinds also come around faster and cost more.',
          when: 'It comes up at online 6-max tables and live tables with empty seats. It matters most in late seats and the blinds.',
          youWill: ['Open the right range for the players behind you', 'Steal and defend the blinds more often', 'Adjust your c-bets to wider ranges after the flop'],
        },
        lessons: [
          lesson('fewer-players', 'Fewer players, wider ranges', ['concept', 'math', 'range-recall']),
          lesson('blind-battles', 'More 3bets and blind battles', ['math', 'spot-action']),
          lesson('postflop-6max', 'Postflop at 6-max', ['concept', 'equity-estimate']),
        ],
      },
      {
        id: 'deep-stacks',
        title: 'Deep stacks',
        intro: {
          why: 'At 200bb the pot can grow twice as large as at 100bb. Hands that make the nuts gain and one pair hands lose.',
          when: 'It comes up at live tables where stacks run deep. It also comes up once you double your stack.',
          youWill: ['Plan a hand with SPR at 200bb', 'Keep one pair hands out of huge pots', 'Pick 3bet and 4bet hands that play well deep'],
        },
        lessons: [
          lesson('deep-changes', 'What changes deep', ['math', 'concept']),
          lesson('one-pair-deep', 'One pair hands deep', ['math', 'equity-estimate']),
          lesson('preflop-deep', 'Preflop deep', ['math', 'concept']),
        ],
      },
    ],
  },
  {
    id: 'mindset',
    title: 'Mental game and bankroll',
    summary: 'Stay at A game, manage variance, study efficiently.',
    intro: { why: 'Your skill only pays when you play your best and stay in the game.' },
    modules: [
      {
        id: 'mental',
        title: 'Mental game',
        intro: {
          why: 'A few tilted hands can erase most of a win rate. Protecting your best game is part of winning.',
          when: 'It comes up after a bad beat or a long losing run. It also comes up when you decide how long to play.',
          youWill: ['Catch tilt early and reset', 'Expect normal downswings and judge decisions', 'Set a bankroll and a loss limit before you play'],
        },
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
        intro: {
          why: 'Short focused study builds more skill than long rare sessions. The routine that works is the one you keep.',
          when: 'You use it away from the table. It shapes how you study and how you review your hands.',
          youWill: ['Build a daily routine that sticks', 'Review your own hands for a better next decision', 'Grade decisions instead of results'],
        },
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
    intro: { why: 'Knowing what you win and what the game costs keeps your goals honest.' },
    modules: [
      {
        id: 'win-rate',
        title: 'Win rates',
        intro: {
          why: 'A win rate tells you if your poker makes money. It also tells you what your time earns.',
          when: 'You use it after sessions and when you pick a game. It helps you compare live and online play.',
          youWill: ['Work out your win rate in bb/100', 'Turn a win rate into money per hour', 'Choose tables where your edge is bigger'],
        },
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
        intro: {
          why: 'Rake comes out of the pots you win. Over 100 hands it adds up to real money.',
          when: 'It comes up in every pot at a raked table. It matters most in small pots and close calls.',
          youWill: ['Know how rooms take rake', 'Turn your room’s rake into bb/100', 'Adjust your play for a raked game'],
        },
        lessons: [
          lesson('how-rake-works', 'How rooms take rake', ['concept', 'math']),
          lesson('rake-cost', 'What rake costs you', ['math']),
          lesson('rake-strategy', 'Playing a raked game', ['concept']),
        ],
      },
      {
        id: 'variance',
        title: 'Variance',
        intro: {
          why: 'Results swing a lot even for good players. Knowing how much keeps you calm and honest.',
          when: 'It comes up in a downswing or a hot run. It also matters each time you judge your own results.',
          youWill: ['Know how many hands it takes to trust a win rate', 'Expect deep downswings as a normal part of winning', 'See what sets your risk of ruin'],
        },
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
    intro: { why: 'Tournament chips are not money, so tournament play differs from cash games.' },
    modules: [
      {
        id: 'mtt-basics',
        title: 'Tournament basics',
        intro: {
          why: 'Tournaments add antes, short stacks and pay jumps. Each one changes which hands are worth playing.',
          when: 'It comes up as the blinds rise and stacks get short. It matters most near the money and at final tables.',
          youWill: ['Push or fold with a short stack', 'Use ICM to see why chips are not money', 'Adjust on the bubble and at final tables'],
        },
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
      {
        id: 'icm-play',
        title: 'Advanced tournament play',
        intro: {
          why: 'Near the money, the same hand can be a call for one stack and a fold for another. Exact ICM math shows which.',
          when: 'It comes up on the bubble and at final tables. It also comes up when the players left talk about a deal.',
          youWill: ['Price any all in call with the bubble factor', 'Know which stacks can attack and which must wait', 'Compare a chip chop with an ICM chop'],
        },
        lessons: [
          lesson('bubble-factor', 'Bubble factor and risk premium', ['math', 'concept']),
          lesson('big-stack', 'The big stack on the bubble', ['concept', 'math']),
          lesson('middle-stacks', 'Short and medium stacks on the bubble', ['concept', 'math']),
          lesson('pay-jumps', 'Folding into a pay jump', ['concept', 'math']),
          lesson('deals', 'ICM deals', ['concept', 'math']),
        ],
      },
    ],
  },
];

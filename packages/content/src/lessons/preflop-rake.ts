import type { LessonContent } from './types';

/** How the house cut changes preflop decisions. */
export const PREFLOP_RAKE_LESSONS: LessonContent[] = [
  {
    key: 'preflop/stack-depth/rake',
    level: 'core',
    minutes: 6,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'No rake', value: 38.7, tone: 'gray' },
        { label: 'With rake', value: 44.6 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'The house takes a cut',
        body: 'Rake is the room’s share of a pot. It comes out of the pot before the winner is paid. So every call wins a little less than the pot shows. Close calls feel it first.',
      },
      {
        kind: 'visual',
        title: 'How rooms take rake',
        art: {
          kind: 'tree',
          root: 'Where the rake comes from',
          branches: [
            { label: 'A share of the pot', value: 'Up to a cap', tone: 'red' },
            { label: 'A jackpot drop', value: 'A fixed extra', tone: 'red' },
            { label: 'Ends before the flop', value: 'Usually $0', tone: 'green' },
            { label: 'A time charge', value: 'Pots not raked', tone: 'gray' },
          ],
        },
        caption:
          'Most rooms take a percentage of the pot up to a cap. Many live rooms add a fixed amount for a jackpot. A pot that ends before the flop usually pays nothing. This is called **no flop, no drop**. Always check how your room does it.',
      },
      {
        kind: 'table',
        title: 'Rake in a live $1/$3 game',
        columns: ['Pot', 'Rake', 'Share of pot'],
        rows: [
          ['$20', '$3', '15.0%'],
          ['$31', '$4.10', '13.2%'],
          ['$60', '$6', '10.0%'],
          ['$200', '$6', '3.0%'],
          ['Ends before the flop', '$0', '0%'],
        ],
        note: 'An example structure. The room takes 10% up to $5, plus $1 for a jackpot. A pot with no flop pays nothing. The cap means small pots pay the biggest share.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Equity you need with rake',
        formula: 'Equity needed = call ÷ (final pot − rake)',
        parts: [
          ['call', 'What you put in now'],
          ['final pot', 'The pot after your call'],
        ],
        example:
          'The button opens to $15 in the $1/$3 game. The small blind folds and you call $12 from the big blind. The pot is $31 and the rake is $4.10. If no more money goes in, you need 12 ÷ 26.90 = **44.6%**. With no rake you would need 12 ÷ 31 = 38.7%.',
      },
      {
        kind: 'visual',
        title: 'The same call, with rake',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'No rake', value: 38.7, tone: 'gray' },
            { label: 'With $4.10 rake', value: 44.6, tone: 'red' },
          ],
        },
        caption: 'You call $12 into a $31 final pot. With no rake you need 12 ÷ 31 = 38.7%. The rake leaves $26.90 to win, so you need **44.6%**.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Close calls flip first',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'No rake', value: 0.04, tone: 'green' },
            { label: '5% rake', value: -0.04, tone: 'red' },
          ],
        },
        caption:
          'An online game takes 5% up to 3bb. Against a 2.5bb open, the big blind’s price moves from **27.3%** to **28.7%**. Say a call realizes 28% equity in the 5.5bb pot. With no rake it earns 0.28 × 5.5 − 1.5 = **+0.04bb**. Rake leaves 5.225bb, so the call earns **−0.04bb**. It has become a fold.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What raked strategies do',
        body: [
          'Solutions with rake defend the big blind a little tighter. Their weakest calls were the closest, so they go first.',
          'Small blind calls shrink the most. The small blind is out of position and the big blind still acts behind. Raked strategies there mostly 3bet or fold.',
          'Overcalls that build multiway pots shrink too. They are close calls already.',
          'A raise that wins before the flop pays no rake. So 3bets keep their value. These are directions from solver work, and exact ranges vary.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Live $1/$3 with 10% rake up to $5, plus $1. You call $12 in the big blind. The pot becomes $31 and nobody bets again. What equity do you need?',
        choices: ['38.7%', '48.0%', '44.6%'],
        answer: 2,
        explain:
          'The rake is $3.10 plus $1, so $4.10. You need 12 ÷ (31 − 4.10) = 44.6%. The 38.7% answer ignores the rake. The 48.0% answer uses the full $6, but this pot is too small to reach the cap.',
      },
      {
        kind: 'quiz',
        question: 'What does no flop, no drop mean?',
        choices: ['Limped pots pay no rake', 'A pot that ends before the flop pays no rake', 'Rake is taken only on the river'],
        answer: 1,
        explain: 'If everyone folds to a raise before the flop, the room takes nothing. A limped pot that sees a flop still pays. That is one reason raked strategies like to 3bet or fold.',
      },
      {
        kind: 'quiz',
        question: 'Which preflop play does rake hurt most?',
        choices: ['A call that only just beats the price', 'A 3bet that wins the pot at once', 'A call with a premium hand'],
        answer: 0,
        explain:
          'Rake takes a share of every pot that sees a flop. A call that barely profits can turn into a loss. A strong hand keeps most of its edge. A pot won before the flop pays nothing.',
      },
      {
        kind: 'takeaway',
        points: [
          'Rake comes out of the pot, so calls need more equity.',
          'With a cap, small pots pay the biggest share. Pots with no flop usually pay nothing.',
          'Close calls flip to folds first, especially in the small blind.',
          'Raked strategies lean toward 3bet or fold.',
        ],
      },
    ],
  },
];

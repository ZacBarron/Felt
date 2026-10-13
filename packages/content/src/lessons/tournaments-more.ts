import type { LessonContent } from './types';

/** Reshoves, the bubble and final tables. */
export const TOURNAMENT_MORE_LESSONS: LessonContent[] = [
  {
    key: 'tournaments/mtt-basics/reshoves',
    level: 'core',
    minutes: 7,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['BTN'], note: 'All in over the open' },
    steps: [
      {
        kind: 'intro',
        title: 'All in over an open',
        body: 'With 12 to 25bb, your 3bet is often all in. A reshove wins the open and the blinds with no flop. It also makes the opener decide for their whole stack.',
      },
      {
        kind: 'text',
        title: 'Why all in',
        body: [
          'At 20bb, a 3bet to 5bb uses a quarter of your stack. If the opener shoves back, you are priced in with most hands.',
          'A shove gets the folds without that problem. It also never leaves you guessing after the flop.',
          'Deeper than about 25bb, a shove risks too much to win the pot. Smaller 3bets take over there.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'EV of a reshove',
        formula: 'EV = F × pot + (1 − F) × (eq × final pot − risk)',
        parts: [
          ['F', 'Chance that the opener folds'],
          ['eq', 'Your equity against the hands that call'],
          ['risk', 'Chips you add by shoving'],
        ],
        example:
          'You have 20bb in the big blind with a 1bb ante. The button opens to 2.2bb and the small blind folds. The pot is 4.7bb. You risk 19bb more, and a call makes the pot 41.5bb. A hand with no equity needs 19 ÷ 23.7 = **80.2%** folds.',
      },
      {
        kind: 'table',
        title: 'A♠5♦ shoves 20bb over two openers',
        columns: ['Opener', 'Opens', 'Folds', 'EV'],
        rows: [
          ['Button', '39.7%', '82.4%', '+2.67bb'],
          ['Lojack', '13.0%', '45.7%', '−1.55bb'],
        ],
        note:
          'The opening ranges are assumptions for illustration. The button opens 526 combos and the lojack opens 172. Both call with 88+ and ATs+. They also call with KQs and AJo+. That is 82 combos once your cards are removed. A♠5♦ has 29.4% equity against them, exact over every board.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Fold equity comes from their range',
        body: [
          'The button opens many hands it cannot call with. So it folds **82.4%** of the time, and the shove earns **+2.67bb**.',
          'The lojack opens tight and calls with over half its opens. The same shove loses **1.55bb**.',
          'So reshove wide against wide openers. Tighten up against tight ones.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A♠5♦ against the lojack',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: '12bb', value: 0.24, tone: 'green' },
            { label: '20bb', value: -1.55, tone: 'red' },
            { label: '25bb', value: -2.67, tone: 'red' },
          ],
        },
        caption: 'Same ranges, three stacks. A shorter stack risks less for the same 4.7bb pot. At 12bb the shove still earns **+0.24bb**.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You have 20bb in the big blind. The pot is 4.7bb after a 2.2bb open and a 1bb ante. How often must the opener fold for a zero equity shove to break even?',
        choices: ['83.7%', '80.2%', '45.8%'],
        answer: 1,
        explain:
          'You risk 19bb to win 4.7bb. 19 ÷ (4.7 + 19) = 80.2%. The 83.7% answer leaves the ante out of the pot. The 45.8% answer divides by the pot after a call.',
      },
      {
        kind: 'quiz',
        question: 'The button calls a shove with the range from the table. Which shove gets more folds?',
        choices: ['A♠5♦', '7♠6♠', 'Both the same'],
        answer: 0,
        explain:
          'The A♠ removes some AA, AK and other ace combos from the calls. The button has 82 calling combos instead of 98. Folds rise from 80.4% to 82.4%. 7♠6♠ does better when called, with 32.0% equity against 29.4%.',
      },
      {
        kind: 'quiz',
        question: 'Who should you reshove widest against?',
        choices: ['A tight lojack opener', 'Both the same, since only your hand matters', 'A wide button opener'],
        answer: 2,
        explain:
          'A wide opener holds many hands that must fold. In the example the button folds 82.4% and the lojack 45.7%. Your hand matters too. But fold equity comes from their range.',
      },
      {
        kind: 'takeaway',
        points: [
          'From 12 to 25bb, a 3bet is often all in.',
          'EV of a reshove = F × pot + (1 − F) × (eq × final pot − risk).',
          'Wide openers fold more. Reshove wider against them.',
          'Aces block calls. These are chip EV numbers, and ICM tightens them near the money.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/mtt-basics/bubble',
    level: 'core',
    minutes: 7,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'A', bb: 20 },
        { label: 'B', bb: 15 },
        { label: 'C', bb: 10 },
        { label: 'D', bb: 5 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'One place from the money',
        body: 'The bubble is the last place that pays nothing. Bust now and you win nothing. Outlast one player and you are paid. That gap changes what every stack can risk.',
      },
      {
        kind: 'table',
        title: 'Four left, three paid',
        columns: ['Player', 'Stack', 'Chips', 'Money'],
        rows: [
          ['A', '20bb', '40%', '$33.60'],
          ['B', '15bb', '30%', '$29.49'],
          ['C', '10bb', '20%', '$23.59'],
          ['D', '5bb', '10%', '$13.32'],
        ],
        note: 'Blinds are 100 and 200. So the stacks are 4,000, 3,000, 2,000 and 1,000 chips. Payouts are $50, $30 and $20 from a $100 pool. Fourth pays nothing. Money is the ICM $EV, with blinds ignored.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'B faces an all in from A',
        formula: 'eq × 40.45 + (1 − eq) × 0 ≥ 29.49',
        example:
          'Folding keeps $29.49. Calling and winning gives B 6,000 chips, worth $40.45. Calling and losing busts B on the bubble for $0. So B needs 29.49 ÷ 40.45 = **72.9%**. Chip EV says 50%.',
      },
      {
        kind: 'visual',
        title: 'Equity needed to call the big stack',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Chip EV', value: 50, tone: 'gray' },
            { label: 'D calls A', value: 61.1 },
            { label: 'C calls A', value: 70.2 },
            { label: 'B calls A', value: 72.9, tone: 'red' },
          ],
        },
        caption: 'The medium stacks need the most. They have real money to lose and a short stack below them who may bust first.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'The big stack covers everyone',
        body: [
          'When A calls and loses, A is still in the tournament. So A needs only **52.9%** to call D’s shove. A needs **63.1%** to call B’s shove.',
          'B needs **53.7%** to call D, since B covers D too.',
          'So the pressure falls hardest on stacks that are covered. It is lightest on the stack that covers.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How bubble strategies adjust',
        body: [
          'Equilibrium bubble strategies have the big stack open and shove much wider. Few hands can call it.',
          'Medium stacks tighten up the most, above all against the big stack. They still attack the stacks they cover.',
          'The exact ranges depend on the stacks and payouts. These are directions, not charts.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'B has 3,000 chips and faces an all in from A, who covers. Folding is worth $29.49. Winning is worth $40.45 and losing is worth $0. What equity does B need?',
        choices: ['50.0%', '72.9%', '61.1%'],
        answer: 1,
        explain: '29.49 ÷ 40.45 = 72.9%. The 50% answer is chip EV, which ignores the bubble. The 61.1% answer is what D needs to call A.',
      },
      {
        kind: 'quiz',
        question: 'A shoves. Which stack needs the most equity to call?',
        choices: ['D with 5bb', 'C with 10bb', 'B with 15bb'],
        answer: 2,
        explain:
          'B needs 72.9%, C needs 70.2% and D needs 61.1%. D has only $13.32 at stake. The medium stacks have more money to lose. They can also wait for D to bust.',
      },
      {
        kind: 'quiz',
        question: 'Why can A call D’s shove with only 52.9% equity?',
        choices: ['A covers D, so a loss does not knock A out', 'D always shoves weak hands on the bubble', 'Big stacks play by chip EV'],
        answer: 0,
        explain:
          'Losing costs A 1,000 chips, and A still has 3,000. So the loss costs A little money. The model knows nothing about D’s hands. A still needs more than 50%, so chip EV is not the answer.',
      },
      {
        kind: 'takeaway',
        points: [
          'On the bubble, busting pays nothing and one more place pays.',
          'Covered stacks need far more than 50% to call.',
          'Medium stacks feel the most pressure.',
          'The stack that covers can attack.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/mtt-basics/final-table',
    level: 'advanced',
    minutes: 8,
    cover: {
      kind: 'curve',
      points: [
        [1, 40],
        [2, 25],
        [3, 16],
        [4, 11],
        [5, 8],
      ],
      xLabel: 'Place',
      yLabel: 'Payout, % of pool',
    },
    steps: [
      {
        kind: 'intro',
        title: 'Every place pays more',
        body: 'At a final table, each bust moves everyone up a pay jump. Survival is worth money on every hand. Stacks that cover others can use that. Stacks that are covered must respect it.',
      },
      {
        kind: 'table',
        title: 'Five left, chips against money',
        columns: ['Player', 'Stack', 'Chips', 'Money'],
        rows: [
          ['A', '30bb', '30%', '$240.61'],
          ['B', '20bb', '20%', '$201.98'],
          ['C', '20bb', '20%', '$201.98'],
          ['D', '15bb', '15%', '$177.71'],
          ['E', '15bb', '15%', '$177.71'],
        ],
        note: 'Blinds are 500 and 1,000, so A has 30,000 chips. Payouts are $400, $250, $160, $110 and $80 from a $1,000 pool. Money is the ICM $EV, with blinds ignored. A holds 30% of the chips but 24.1% of the money.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Covering against covered',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Chip EV', value: 50, tone: 'gray' },
            { label: 'A calls B', value: 57.6 },
            { label: 'B calls A', value: 62.8, tone: 'red' },
          ],
        },
        caption:
          'Both risk 20,000 chips. If A calls and loses, A keeps 10,000 and needs **57.6%**. If B calls and loses, B is out in 5th and needs **62.8%**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'A tiny stack adds pressure',
        body: [
          'Keep A at 30,000 and B at 20,000. Now make D and E 28,000 and 2,000 instead of 15,000 each.',
          'B now needs **64.9%** to call A, up from 62.8%. The 2,000 stack will often bust first. That pays B one more jump for free.',
          'So a very short stack makes the medium stacks tighten further.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Heads up, chips are money again',
        body: [
          'With 2 players left, $EV is second place plus your chip share of the gap. It is a straight line in chips.',
          'With 60% of the chips and payouts of $400 and $250, you have 250 + 0.6 × 150 = **$340**.',
          'So there is no risk premium heads up. Chip EV and ICM agree.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How final table strategies adjust',
        body: [
          'Equilibrium final table strategies let covering stacks open and shove wider against covered stacks.',
          'Covered medium stacks call the tightest. The biggest stack can put the most pressure on the table.',
          'ICM is a model. It ignores skill and position. It also ignores rising blinds. Treat its numbers as a guide.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'B has 20,000 chips and A covers with 30,000. A shoves. What equity does B need to call?',
        choices: ['50.0%', '57.6%', '62.8%'],
        answer: 2,
        explain:
          'Folding keeps $201.98. Winning is worth $274.15 and busting pays $80. (201.98 − 80) ÷ (274.15 − 80) = 62.8%. The 57.6% answer is what A needs to call B, since A survives a loss.',
      },
      {
        kind: 'quiz',
        question: 'Two players are left. Payouts are $400 and $250. You hold 60% of the chips. What is your ICM $EV?',
        choices: ['$340', '$240', '$390'],
        answer: 0,
        explain: 'You get $250 for sure and 60% of the $150 gap. That is $340. The $240 answer forgets that second place pays. The $390 answer takes 60% of all $650.',
      },
      {
        kind: 'quiz',
        question: 'A 2,000 chip stack joins the final table. How should the medium stacks call all ins between them?',
        choices: ['Wider, since the short stack is no threat', 'Tighter, since the short stack may bust first', 'No change, since ICM ignores tiny stacks'],
        answer: 1,
        explain:
          'If the tiny stack busts first, everyone moves up a pay jump. So busting now costs the medium stacks more. In the example, B’s price to call A rises from 62.8% to 64.9%.',
      },
      {
        kind: 'takeaway',
        points: [
          'Each bust moves everyone up a pay jump.',
          'Covered stacks need well over 50% to call.',
          'A very short stack makes medium stacks tighten further.',
          'Heads up, chips and money agree again.',
        ],
      },
    ],
  },
];

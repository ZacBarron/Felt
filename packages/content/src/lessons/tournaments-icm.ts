import type { LessonContent } from './types';

/**
 * Advanced tournament play: the bubble factor, the big stack and the medium
 * stacks on the bubble, folding into a pay jump and ICM deals. Every dollar
 * value, price and bubble factor comes from icm.ts in @felt/core (exact
 * Malmuth-Harville ICM) and is recomputed in
 * packages/content/test/tournaments-icm.test.ts. Equities against ranges are
 * sampled with the equity tool and stated as "about". Strategy beyond what
 * the tests compute is labelled as solver patterns.
 */
export const TOURNAMENT_ICM_LESSONS: LessonContent[] = [
  {
    key: 'tournaments/icm-play/bubble-factor',
    level: 'advanced',
    minutes: 8,
    cover: {
      kind: 'curve',
      points: [
        [1000, 63.4],
        [1500, 68],
        [2000, 71.5],
        [2500, 74.2],
        [3000, 76.2],
      ],
      xLabel: 'Your stack, chips',
      yLabel: 'Equity to call, %',
      mark: [3000, 76.2],
    },
    steps: [
      {
        kind: 'intro',
        title: 'What a chip costs on the bubble',
        body: 'On the bubble, chips you lose are worth more money than chips you win. The **bubble factor** measures that gap. It turns any all in into the equity you need to call.',
      },
      {
        kind: 'table',
        title: 'Four left, three paid',
        columns: ['Player', 'Stack', '$EV'],
        rows: [
          ['A', '5,000', '$37.58'],
          ['You', '3,000', '$30.83'],
          ['C', '1,000', '$15.79'],
          ['D', '1,000', '$15.79'],
        ],
        note: 'Payouts are $50, $30 and $20 from a $100 pool. Fourth pays nothing. Money is the ICM $EV. Blinds are ignored in this lesson.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'One all in against A',
        art: {
          kind: 'tree',
          root: 'A shoves and covers you',
          branches: [
            { label: 'Fold', value: '$30.83', tone: 'gray' },
            { label: 'Call and win', value: '$40.45, up $9.62', tone: 'green' },
            { label: 'Call and lose', value: '$0, down $30.83', tone: 'red' },
          ],
        },
        caption: 'Losing busts you on the bubble for nothing. Winning doubles you to 6,000 chips. Those chips add only $9.62.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'The bubble factor',
        formula: 'Bubble factor = money you lose ÷ money you win',
        parts: [
          ['Lose', 'Your $EV after folding, minus your $EV after losing'],
          ['Win', 'Your $EV after winning, minus your $EV after folding'],
        ],
        example: 'You lose $30.83 or win $9.62. 30.83 ÷ 9.62 is about **3.2**. Each chip you could lose costs about 3.2 times what a chip you could win adds.',
      },
      {
        kind: 'formula',
        title: 'From bubble factor to equity',
        formula: 'Equity needed = bubble factor ÷ (1 + bubble factor)',
        example: 'That is the same as lose ÷ (lose + win). 30.83 ÷ 40.45 = **76.2%**. Chip EV says 50%. The extra 26.2 points are the **risk premium**.',
      },
      {
        kind: 'visual',
        title: 'Chips against money',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Chip EV', value: 50, tone: 'gray' },
            { label: 'ICM', value: 76.2, tone: 'red' },
          ],
        },
        caption: 'Both bars are the equity you need to call A for 3,000 chips. Chip EV treats every chip the same. ICM prices what each chip is worth in money.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Same spot, three stacks',
        columns: ['Your stack', 'Bubble factor', 'Equity needed', 'Risk premium'],
        rows: [
          ['1,000', '1.73', '63.4%', '13.4 points'],
          ['2,000', '2.50', '71.5%', '21.5 points'],
          ['3,000', '3.21', '76.2%', '26.2 points'],
        ],
        note: 'A has 5,000 in every row and covers you. The other 2 players split the rest of the 10,000 chips evenly. Each row is exact ICM.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Bigger stack, higher price',
        art: {
          kind: 'curve',
          points: [
            [1000, 63.4],
            [1500, 68],
            [2000, 71.5],
            [2500, 74.2],
            [3000, 76.2],
          ],
          xLabel: 'Your stack, chips',
          yLabel: 'Equity to call, %',
          mark: [3000, 76.2],
        },
        caption: 'Your price to call A rises from 63.4% at 1,000 chips to 76.2% at 3,000. The other stacks shrink as yours grows.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why the price rises',
        body: [
          'Losing to A busts you for $0 in every row. So a loss costs your whole $EV.',
          'Your $EV grows from $14.17 to $30.83 as your stack grows. What a win adds grows only from $8.17 to $9.62. So the bubble factor climbs.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'After the bubble',
        art: {
          kind: 'bars',
          bars: [
            { label: 'Bubble, 4 left', value: 2.5, tone: 'red' },
            { label: 'In the money, 3 left', value: 1.35 },
            { label: 'Heads up', value: 1, tone: 'green' },
          ],
        },
        caption: 'Each bar is your bubble factor with 2,000 chips against A with 5,000. With 3 left, the third player has 3,000 and busting pays $20. Heads up, chips are money and the factor is exactly 1.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'Losing an all in costs you $30. Winning it adds $10. What is your bubble factor?',
        choices: ['3', '0.33', '1.5'],
        answer: 0,
        explain: 'Like the formula showed, the bubble factor is money you lose ÷ money you win. 30 ÷ 10 = 3. The 0.33 answer divides the wrong way.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Your bubble factor is 3. What equity do you need to call?',
        choices: ['50%', '75%', '67%'],
        answer: 1,
        explain: 'Equity needed = bubble factor ÷ (1 + bubble factor). 3 ÷ 4 = 75%. The 50% answer is chip EV. The extra 25 points are the risk premium.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'A covers you on the bubble. Your stack is 3,000 instead of 1,000. What happens to your price to call A?',
        choices: ['It rises', 'It falls', 'It stays at 50%'],
        answer: 0,
        explain: 'Like the table showed, it rises from 63.4% to 76.2%. A loss costs more of your $EV. A win adds only a little more.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Only 2 players are left. What is the bubble factor of an all in between them?',
        choices: ['Exactly 1', 'Above 1', 'Below 1'],
        answer: 0,
        explain: 'Like the last bars showed, heads up $EV is a straight line in chips. Each chip you lose costs what a chip you win adds. So you need 50%.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Bubble factor = money you lose ÷ money you win, for the same chips.',
          'Equity needed = bubble factor ÷ (1 + bubble factor). Anything above 50% is the risk premium.',
          'When a bigger stack covers you, more chips mean a higher price.',
          'The bubble factor falls after the bubble. Heads up it is exactly 1.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/icm-play/big-stack',
    level: 'advanced',
    minutes: 8,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'A', bb: 25 },
        { label: 'B', bb: 15 },
        { label: 'C', bb: 6 },
        { label: 'D', bb: 4 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'The stack that covers',
        body: 'On the bubble, the big stack can bust anyone at the table. Nobody can bust it. That makes its shoves very hard to call.',
      },
      {
        kind: 'visual',
        title: 'Four left, three paid',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'A', bb: 25 },
            { label: 'B', bb: 15 },
            { label: 'C', bb: 6 },
            { label: 'D', bb: 4 },
          ],
        },
        caption: 'Blinds are 100 and 200, so A has 5,000 chips. Payouts are $50, $30 and $20 from a $100 pool. Fourth pays nothing.',
      },
      {
        kind: 'table',
        title: 'Chips against money',
        columns: ['Player', 'Stack', 'Chips', '$EV'],
        rows: [
          ['A', '25bb', '50%', '$37.61'],
          ['B', '15bb', '30%', '$30.91'],
          ['C', '6bb', '12%', '$18.57'],
          ['D', '4bb', '8%', '$12.92'],
        ],
        note: 'Money is the ICM $EV before the blinds go in.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A shoves from the small blind',
        art: {
          kind: 'tree',
          root: 'B in the big blind faces 3,000',
          branches: [
            { label: 'Fold', value: '$30.10', tone: 'gray' },
            { label: 'Call and win', value: '$40.47', tone: 'green' },
            { label: 'Call and lose', value: '$0', tone: 'red' },
          ],
        },
        caption: 'Everyone folds to A in the small blind. A goes all in. Folding costs B the 200 big blind. Calling and losing busts B on the bubble.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'B’s price to call A',
        formula: 'eq × 40.47 + (1 − eq) × 0 ≥ 30.10',
        example: 'B needs 30.10 ÷ 40.47 = **74.4%**. Chip EV says 2,800 ÷ 6,000 = 46.7%. The risk premium is 27.7 points.',
      },
      {
        kind: 'visual',
        title: 'Big stack against short stack',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Call A, chip EV', value: 46.7, tone: 'gray' },
            { label: 'Call A, ICM', value: 74.4, tone: 'red' },
            { label: 'Call D, chip EV', value: 37.5, tone: 'gray' },
            { label: 'Call D, ICM', value: 40.3, tone: 'green' },
          ],
        },
        caption: 'In another hand, D shoves 800 from the small blind into B. B needs only **40.3%** to call. D cannot bust B.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why the gap is so big',
        body: [
          'Against A, a loss ends B’s tournament with nothing. Against D, a loss still leaves B with 2,200 chips.',
          'So B can call D wide. Against A, B must fold most hands.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Which hands can call A?',
        columns: ['Hand', 'Equity vs any 2 cards', 'At 74.4%'],
        rows: [
          ['AA', 'About 85%', 'Call'],
          ['TT', 'About 75%', 'Call'],
          ['99', 'About 72%', 'Fold'],
          ['AKs', 'About 67%', 'Fold'],
          ['AKo', 'About 65%', 'Fold'],
        ],
        note: 'Say A shoves every hand. Then B’s equity is its equity against any 2 cards. Only TT or better clears 74.4%. Each equity is simulated from 400,000 deals.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'An equilibrium for this spot',
        body: [
          'Aced checked every hand for both players. B’s best response to A shoving everything is to call with TT or better.',
          'Against those calls, every hand A holds gains by shoving. So in this model, A shoves every hand and B calls with TT or better.',
          'The model covers this one hand. It ignores skill and later hands.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'What shoving adds for A',
        art: {
          kind: 'bars',
          bars: [
            { label: 'K♦5♠', value: 0.72, tone: 'green' },
            { label: 'T♠9♠', value: 0.71, tone: 'green' },
            { label: '2♠2♦', value: 0.68, tone: 'green' },
            { label: '7♣2♦', value: 0.65, tone: 'green' },
          ],
        },
        caption: 'Each bar is what shoving adds over folding, in dollars. B calls with TT or better. B folds at least 97.6% of the time. Even 7♣2♦ gains **$0.65**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Real bubbles',
        body: [
          'Real tables add antes and more players behind. Equilibrium bubble strategies still point the same way.',
          'The big stack opens and shoves wide. Covered medium stacks fold most hands against it. They still call shorter stacks much wider.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'A covers B and shoves from the small blind. B is in the big blind. What equity does B need to call?',
        choices: ['46.7%', '74.4%', '40.3%'],
        answer: 1,
        explain: 'Like the formula showed, 30.10 ÷ 40.47 = 74.4%. The 46.7% answer is chip EV. The 40.3% answer is what B needs against D.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'B holds this hand in the big blind. A shoves every hand from the small blind. What should B do?',
        cards: 'AsKd',
        choices: ['Fold', 'Call', 'Either, it is close'],
        answer: 0,
        explain: 'Like the table showed, AK has about 65% against any 2 cards. B needs 74.4%. So even AK folds here.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Why does A gain by shoving 7♣2♦ into B?',
        choices: ['B must fold almost every hand', '7♣2♦ does well against TT or better', 'Chips are worth more to A'],
        answer: 0,
        explain: 'Like the bars showed, B calls only with TT or better. So B folds at least 97.6% of the time. The blinds A wins pay for the rare calls.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'B is a medium stack. Whose shove can B call wider?',
        choices: ['A short stack that B covers', 'The big stack that covers B', 'Both the same'],
        answer: 0,
        explain: 'Like the bars showed, B needs 40.3% against D and 74.4% against A. Losing to D still leaves B in the tournament.',
        point: 1,
      },
      {
        kind: 'takeaway',
        points: [
          'The stack that covers everyone can shove very wide on the bubble.',
          'A medium stack needs far more equity against a covering stack than against a short stack.',
          'Against a big stack’s shove, even AK can be a fold.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/icm-play/middle-stacks',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'B calls A', value: 3.23, tone: 'red' },
        { label: 'C calls A', value: 2.33 },
        { label: 'D calls A', value: 1.76, tone: 'green' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Stuck in the middle',
        body: 'Medium stacks have the most to lose on the bubble. A bigger stack can bust them. A short stack may bust first and pay them for waiting.',
      },
      {
        kind: 'visual',
        title: 'Four stacks on the bubble',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'A', bb: 25 },
            { label: 'B', bb: 15 },
            { label: 'C', bb: 6 },
            { label: 'D', bb: 4 },
          ],
        },
        caption: 'A has 5,000 chips and B has 3,000. C has 1,200 and D has 800. Payouts are $50, $30 and $20. Fourth pays nothing. Blinds are ignored here.',
      },
      {
        kind: 'table',
        title: 'Bubble factor by matchup',
        columns: ['Call', 'Bubble factor', 'Equity needed'],
        rows: [
          ['B calls A', '3.23', '76.4%'],
          ['C calls A', '2.33', '70.0%'],
          ['D calls A', '1.76', '63.8%'],
          ['C calls B', '2.11', '67.8%'],
          ['B calls D', '1.12', '52.8%'],
          ['A calls D', '1.07', '51.7%'],
        ],
        note: 'Each row is an all in for the smaller stack. Exact ICM.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Calling the big stack',
        art: {
          kind: 'bars',
          bars: [
            { label: 'B', value: 3.23, tone: 'red' },
            { label: 'C', value: 2.33 },
            { label: 'D', value: 1.76, tone: 'green' },
          ],
        },
        caption: 'Each bar is the bubble factor of calling A. The biggest covered stack pays the most. The shortest stack pays the least.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Chance to finish 4th',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'A', value: 3.2, tone: 'green' },
            { label: 'B', value: 8.8, tone: 'green' },
            { label: 'C', value: 34.3 },
            { label: 'D', value: 53.7, tone: 'red' },
          ],
        },
        caption: 'In the model, D finishes 4th for nothing **53.7%** of the time. B finishes 4th only 8.8% of the time.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why the short stack pays least',
        body: [
          'D is the most likely player to bust first. So folding keeps D only $12.92.',
          'B’s fold keeps $30.91. Busting throws away much more money.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'As D gets shorter',
        art: {
          kind: 'bars',
          bars: [
            { label: 'D has 1,000', value: 2.03 },
            { label: 'D has 500', value: 2.91 },
            { label: 'D has 200', value: 3.69, tone: 'red' },
          ],
        },
        caption: 'Each bar is C’s bubble factor to call A. A keeps 5,000 and B keeps 3,000. C and D share the other 2,000. A tiny D will often bust first.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'D pays less',
        art: {
          kind: 'bars',
          bars: [
            { label: 'D has 1,000', value: 2.03 },
            { label: 'D has 500', value: 1.43 },
            { label: 'D has 200', value: 1.16, tone: 'green' },
          ],
        },
        caption: 'Each bar is D’s own bubble factor to call A, in the same 3 cases. A tiny stack is close to busting anyway. So it has little left to protect.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How bubble strategies adjust',
        body: [
          'Equilibrium bubble strategies tighten medium stacks the most against bigger stacks.',
          'Short stacks shove and call wider than medium stacks. The exact ranges depend on the stacks and blinds.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'A covers everyone and shoves. Which stack has the highest bubble factor to call?',
        choices: ['B with 15bb', 'C with 6bb', 'D with 4bb'],
        answer: 0,
        explain: 'Like the bars showed, B pays 3.23 and C pays 2.33. D pays only 1.76. B has the most money to lose.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'D has 4bb. Why is D’s bubble factor the lowest?',
        choices: ['D’s fold is worth little money', 'D covers the other stacks', 'D has the best cards'],
        answer: 0,
        explain: 'Like the chances showed, D finishes 4th for nothing 53.7% of the time. Folding keeps D only $12.92. So a loss costs D little.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'D drops from 1,000 chips to 200 and C holds the rest. What happens to C’s price to call A?',
        choices: ['It rises', 'It falls', 'It stays the same'],
        answer: 0,
        explain: 'Like the bars showed, C’s bubble factor rises from 2.03 to 3.69. D will probably bust first. That pays C for waiting.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Which of these calls needs the least equity?',
        choices: ['A calls D', 'B calls A', 'C calls B'],
        answer: 0,
        explain: 'Like the table showed, A needs only 51.7% to call D. B needs 76.4% to call A. Covered stacks pay the most.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Medium stacks pay the most to call a bigger stack.',
          'The short stack pays the least. It is likely to bust first anyway.',
          'The shorter the short stack, the tighter the medium stacks must call.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/icm-play/pay-jumps',
    level: 'advanced',
    minutes: 8,
    cover: {
      kind: 'curve',
      points: [
        [1, 400],
        [2, 250],
        [3, 160],
        [4, 110],
        [5, 80],
      ],
      xLabel: 'Place',
      yLabel: 'Payout, $',
    },
    steps: [
      {
        kind: 'intro',
        title: 'When a fold earns money',
        body: 'At a final table, every bust pays the players left. Sometimes the best play is a fold that lets someone else bust first. This lesson prices that fold exactly.',
      },
      {
        kind: 'visual',
        title: 'Five left',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'A', bb: 35 },
            { label: 'B', bb: 25 },
            { label: 'You (C)', bb: 20 },
            { label: 'D', bb: 18 },
            { label: 'E', bb: 2 },
          ],
        },
        caption: 'Blinds are 500 and 1,000, so A has 35,000 chips. Blinds are ignored in the math.',
      },
      {
        kind: 'table',
        title: 'The pay jumps',
        columns: ['Place', 'Payout', 'Jump from the place below'],
        rows: [
          ['1st', '$400', '$150'],
          ['2nd', '$250', '$90'],
          ['3rd', '$160', '$50'],
          ['4th', '$110', '$30'],
          ['5th', '$80', 'Lowest place left'],
        ],
        note: 'The pool left is $1,000. Each bust moves every player left up one place.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A shoves into you',
        art: {
          kind: 'tree',
          root: 'A puts you all in for 20,000',
          branches: [
            { label: 'Fold', value: '$210.11', tone: 'gray' },
            { label: 'Call and win', value: '$277.44', tone: 'green' },
            { label: 'Call and lose', value: '$80 for 5th', tone: 'red' },
          ],
        },
        caption: 'A covers you. Folding keeps your ICM $EV of $210.11. Losing busts you in 5th.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Your price to call',
        formula: 'eq × 277.44 + (1 − eq) × 80 ≥ 210.11',
        example: 'You need 130.11 ÷ 197.44 = **65.9%**. Chip EV says 50%.',
      },
      {
        kind: 'visual',
        title: 'A good chip call that loses money',
        art: {
          kind: 'bars',
          bars: [
            { label: 'Call with 60%', value: -11.64, tone: 'red' },
            { label: 'Call with 70%', value: 8.1, tone: 'green' },
          ],
        },
        caption: 'Each bar is calling minus folding, in dollars. With 60% equity the call wins 4bb on average. It still loses **$11.64** against folding.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why the fold wins',
        body: [
          'E has 2bb and finishes 5th **83.5%** of the time in the model. You finish 5th only 5.2% of the time.',
          'A fold keeps that edge. A lost call throws it away.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Chance to finish 5th',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'A', value: 1.6, tone: 'green' },
            { label: 'B', value: 3.4, tone: 'green' },
            { label: 'You', value: 5.2, tone: 'green' },
            { label: 'D', value: 6.3, tone: 'green' },
            { label: 'E', value: 83.5, tone: 'red' },
          ],
        },
        caption: 'These are the model’s chances before the hand. The 2bb stack is by far the most likely next bust.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'The tiny stack raises your price',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'D and E at 10bb', value: 64.7 },
            { label: 'D at 18bb, E at 2bb', value: 65.9, tone: 'red' },
          ],
        },
        caption: 'Each bar is the equity you need to call A. Moving 8bb from E to D makes E a likely bust. That adds 1.2 points to your price.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'The tiny stack should not wait',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'E calls A', value: 52.5, tone: 'green' },
            { label: 'You call A', value: 65.9, tone: 'red' },
          ],
        },
        caption: 'E’s fold keeps only $96.52. A loss costs E just $16.52. Folding into a pay jump is for the medium stacks.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How final table strategies adjust',
        body: [
          'Equilibrium final table strategies fold many hands with medium stacks when a tiny stack is close to busting.',
          'The tiny stack itself shoves and calls wide. Exact ranges depend on the stacks and blinds.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'You bust in 5th instead of 4th at this final table. How much less do you win?',
        choices: ['$30', '$80', '$110'],
        answer: 0,
        explain: 'Like the table showed, 4th pays $110 and 5th pays $80. The pay jump is $30. The $80 answer is the whole 5th place prize.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You have 20bb and A covers you. A shoves. Your hand has 60% equity against A’s range. Call or fold?',
        choices: ['Fold', 'Call', 'It does not matter'],
        answer: 0,
        explain: 'Like the bars showed, calling loses $11.64 against folding. You need 65.9%. The call wins chips but loses money.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Moving 8bb from E to D leaves E with 2bb. What happens to your price to call A?',
        choices: ['It rises from 64.7% to 65.9%', 'It falls', 'It stays the same'],
        answer: 0,
        explain: 'Like the bars showed, a likely bust makes your own bust cost more. Your price rises by 1.2 points.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Which player should fold most often to wait for a pay jump?',
        choices: ['A 20bb stack', 'The 2bb stack', 'Both the same'],
        answer: 0,
        explain: 'Like the bars showed, you need 65.9% to call A. E needs only 52.5%. The medium stack has the most to protect.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Each bust moves everyone left up a pay jump.',
          'A call that wins chips can still lose money. Fold below the ICM price.',
          'A tiny stack close to busting raises the price for medium stacks.',
          'The tiny stack itself has little to protect. It should not wait.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/icm-play/deals',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'A, chip chop', value: 4400, tone: 'gray' },
        { label: 'A, ICM chop', value: 4105.88 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Splitting the money',
        body: 'Near the end, the players left sometimes agree to split the prize money instead of playing on. Two common ways are a **chip chop** and an **ICM chop**. They pay different amounts.',
      },
      {
        kind: 'visual',
        title: 'Three left',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'A', bb: 60 },
            { label: 'B', bb: 25 },
            { label: 'C', bb: 15 },
          ],
        },
        caption: 'Blinds are 5,000 and 10,000, so A has 600,000 chips. Payouts left are $5,000, $3,000 and $2,000. That is $10,000 to split.',
      },
      {
        kind: 'formula',
        title: 'A chip chop',
        formula: 'Chip chop = 3rd place money + chip share × the rest',
        example: 'Everyone locks in $2,000. The other $4,000 is split by chips. A gets 2,000 + 0.6 × 4,000 = **$4,400**.',
      },
      {
        kind: 'visual',
        title: 'Why 3rd place comes first',
        art: {
          kind: 'bars',
          bars: [
            { label: 'C, all $10,000 by chips', value: 1500, tone: 'red' },
            { label: 'C, 3rd place', value: 2000, tone: 'gray' },
            { label: 'C, chip chop', value: 2600, tone: 'green' },
          ],
        },
        caption: 'Split all $10,000 by chips and C gets $1,500. That is less than 3rd place pays. So a chip chop locks in 3rd place first.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Chip chop against ICM chop',
        columns: ['Player', 'Chips', 'Chip chop', 'ICM chop'],
        rows: [
          ['A', '60%', '$4,400.00', '$4,105.88'],
          ['B', '25%', '$3,000.00', '$3,169.12'],
          ['C', '15%', '$2,600.00', '$2,725.00'],
        ],
        note: 'An ICM chop pays each player their ICM $EV, computed exactly. Both columns add to $10,000.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'What ICM moves',
        art: {
          kind: 'bars',
          bars: [
            { label: 'A', value: -294.12, tone: 'red' },
            { label: 'B', value: 169.12, tone: 'green' },
            { label: 'C', value: 125, tone: 'green' },
          ],
        },
        caption: 'Each bar is the ICM chop minus the chip chop, in dollars. A chip chop pays the leader as if chips were money. ICM says the leader’s extra chips are worth less.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What the math leaves out',
        body: [
          'ICM ignores skill. A stronger player is worth more than the model says.',
          'It also ignores the blinds. When they are big, the short stack may bust soon. So whether a deal is good is a judgment call.',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Before you agree',
        body: 'Check that the event allows deals. Ask the tournament staff to record the split. Some deals keep a little money back for the winner.',
      },
      {
        kind: 'quiz',
        question: 'Three players chip chop $10,000. 3rd place pays $2,000. A has 60% of the chips. What does A get?',
        choices: ['$4,400', '$6,000', '$4,106'],
        answer: 0,
        explain: 'Like the formula showed, A gets $2,000 plus 60% of the other $4,000. That is $4,400. The $6,000 answer skips the lock in. The $4,106 answer is the ICM chop.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'In this example, who gets more from an ICM chop than from a chip chop?',
        choices: ['B and C', 'Only A', 'Nobody'],
        answer: 0,
        explain: 'Like the bars showed, B gains $169.12 and C gains $125. A gets $294.12 less. ICM values the leader’s chips below face value.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You are far stronger than the other 2 players. What does an ICM chop leave out?',
        choices: ['Your skill edge', 'Your stack', 'The payouts'],
        answer: 0,
        explain: 'ICM uses only stacks and payouts. It treats every player as equal in skill. So taking a deal is a judgment call, not math.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A chip chop locks in the last payout and splits the rest by chips.',
          'An ICM chop pays each player their ICM $EV. It moves money from the leader to the shorter stacks.',
          'ICM ignores skill and blinds. Taking a deal is a judgment call.',
        ],
      },
    ],
  },
];

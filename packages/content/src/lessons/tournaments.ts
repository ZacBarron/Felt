import type { LessonContent } from './types';

export const TOURNAMENT_LESSONS: LessonContent[] = [
  {
    key: 'tournaments/mtt-basics/antes',
    level: 'core',
    minutes: 5,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'No ante', bb: 1.5 },
        { label: 'BB ante', bb: 2.5 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Dead money changes every price',
        body: 'Antes put chips in the pot that nobody has to defend. More to win for the same risk means more hands are worth playing. That holds for the opener and for the blinds.',
      },
      {
        kind: 'visual',
        title: 'The pot before anyone acts',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Blinds only', bb: 1.5 },
            { label: '1bb BB ante', bb: 2.5 },
          ],
        },
        caption: 'Blinds are 0.5bb and 1bb. With a big blind ante, the big blind posts one ante for the whole table. If instead 9 players each ante 0.125bb, the pot is **2.625bb**.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'The ante is dead',
        art: {
          kind: 'tree',
          root: 'The big blind’s 2bb in front',
          branches: [
            { label: 'The 1bb blind', value: 'Live, counts toward a call', tone: 'green' },
            { label: 'The 1bb ante', value: 'Dead, belongs to the pot', tone: 'gray' },
          ],
        },
        caption: 'So against a 2.2bb open, the big blind still calls **1.2bb**. It just calls into a bigger pot.',
      },
      {
        kind: 'formula',
        title: 'The big blind’s price against a 2.2bb open',
        formula: 'Call ÷ (pot + call) = 1.2 ÷ (4.7 + 1.2)',
        example: 'The pot before the call is 0.5 + 1 + 1 ante + 2.2 open = 4.7bb. The big blind needs **20.3%** equity, before realization. Without the ante it needs 24.5%.',
      },
      {
        kind: 'visual',
        title: 'Prices with and without the ante',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Steal, no ante', value: 59.5, tone: 'gray' },
            { label: 'Steal, BB ante', value: 46.8 },
            { label: 'BB call, no ante', value: 24.5, tone: 'gray' },
            { label: 'BB call, BB ante', value: 20.3, tone: 'green' },
          ],
        },
        caption:
          'A steal with no equity needs risk ÷ (pot + risk) in folds. With the ante that is 2.2 ÷ 4.7 = 46.8%. The big blind needs less equity to call too.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why ranges widen',
        body: [
          'A steal that needs fewer folds can use weaker hands. So equilibrium tournament strategies open wider from every seat once antes are in play. The blinds get a better price, so they defend wider too.',
          'Tournament solutions also tend to open smaller than cash games, often 2 to 2.3bb. A small open risks less to win the same dead money.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Players who ignore the ante',
        body: 'Some players fold as if there were no ante, especially in the blinds. Treat that as a read to test, not a fact. If your own hands show your table folds too often to opens, steal more.',
      },
      {
        kind: 'quiz',
        question: 'Blinds are 0.5bb and 1bb with a 1bb big blind ante. How big is the pot before anyone acts?',
        choices: ['1.5bb', '2bb', '2.5bb'],
        answer: 2,
        explain: '0.5 + 1 + 1 = 2.5bb. That is 67% more to win than the 1.5bb pot without an ante. The 1.5bb answer forgets the ante.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'There is a 1bb big blind ante. The cutoff opens to 2.2bb and it folds to the big blind. How much does the big blind have to call?',
        choices: ['1.2bb', '0.2bb', '2.2bb'],
        answer: 0,
        explain: 'The blind is live, so its 1bb already counts. The ante is dead, so it does not. 2.2 − 1 = 1.2bb. The 0.2bb answer wrongly counts the ante toward the call.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'There is a 1bb big blind ante. How often must everyone fold for a 2.2bb steal with no equity to break even?',
        choices: ['59.5%', '46.8%', '88.0%'],
        answer: 1,
        explain: 'Like the bars showed, 2.2 ÷ (2.5 + 2.2) = 46.8%. The 59.5% answer is the price with no ante, 2.2 ÷ 3.7. The 88.0% answer leaves your own risk out of the pot.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A 1bb big blind ante makes the pot 2.5bb before anyone acts.',
          'The ante is dead. The big blind’s blind is live.',
          'A steal needs risk ÷ (pot + risk) in folds. Antes make it cheaper, so ranges widen.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/mtt-basics/push-fold',
    level: 'core',
    minutes: 7,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'SB', highlight: ['BB'], note: 'All in or fold' },
    steps: [
      {
        kind: 'intro',
        title: 'All in or nothing',
        body: 'With a short stack, raising and then folding to a reraise throws away too much of your stack. Shoving gets the most fold equity. It also never leaves you guessing on later streets.',
      },
      {
        kind: 'visual',
        title: 'Why short stacks shove',
        art: { kind: 'ring', value: 0.22, label: 'Of your stack in a 2.2bb open', caption: 'A 10bb stack' },
        caption:
          'If someone shoves over the open, you are often priced in. You may end up playing for stacks with a hand you did not want to. A shove makes every opponent decide for their whole stack. Full solutions at 12 to 15bb still use small opens and some small blind limps. The shorter the stack, the closer they get to pure push or fold.',
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'EV of a shove',
        formula: 'EV = F × pot + (1 − F) × (eq × final pot − risk)',
        parts: [
          ['F', 'Chance that everyone folds'],
          ['pot', 'Pot before you shove'],
          ['eq', 'Your equity against the hands that call'],
          ['final pot', 'Pot once you are called'],
          ['risk', 'Chips you add by shoving'],
        ],
        example: 'EV is measured against folding, which is worth 0 from this point. The fold term pays even with the worst hand. The called term is where hand strength matters.',
      },
      {
        kind: 'table',
        title: 'Small blind shoves 9♣3♦ into the big blind',
        columns: ['Stack', 'Risk', 'Final pot', 'EV'],
        rows: [
          ['10bb', '9.5', '21', '+0.57bb'],
          ['15bb', '14.5', '31', '−0.10bb'],
          ['20bb', '19.5', '41', '−0.77bb'],
        ],
        note: 'The pot is 2.5bb, with blinds of 0.5bb and 1bb and a 1bb BB ante. Stacks are counted after antes, and the big blind covers. The BB calling range is an assumption for illustration. It is 22+ and any ace. It adds K2s+, K7o+ and Q8s+. It also adds QTo+, J9s+ and JTo. That is 446 combos. After removing 9♣3♦, 425 of 1,225 hands call. So F = 65.3%. Equity when called is 30.7%, exact over every board.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'One hand, three stacks',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: '10bb', value: 0.57, tone: 'green' },
            { label: '15bb', value: -0.1, tone: 'red' },
            { label: '20bb', value: -0.77, tone: 'red' },
          ],
        },
        caption: 'The small blind shoves 9♣3♦ into the same assumed calling range. It earns **+0.57bb** at 10bb and loses money deeper.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Shorter stacks, wider shoves',
        body: [
          'Same hand, same caller. The shove goes from profitable to losing as the stack grows. The fold reward stays at 2.5bb.',
          'When called, each extra big blind in the stacks costs this hand about **0.39bb**. That is 1 − 2 × eq. The shove breaks even near **14bb**.',
          'In practice the big blind would call tighter against a bigger shove, because its price gets worse. The direction holds anyway. In equilibrium push or fold charts, shoving ranges widen as stacks shrink.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Fold equity compounds with players behind',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '1 behind', value: 85, tone: 'green' },
            { label: '2 behind', value: 72.3 },
            { label: '5 behind', value: 44.4 },
            { label: '8 behind', value: 27.2, tone: 'red' },
          ],
        },
        caption: 'This is an illustration. Each player behind folds 85% of the time, treated as separate choices. Each bar is the chance that all of them fold. Card removal makes real folds slightly linked.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Later seats shove wider',
        body: [
          'From early position, every player behind might hold a strong hand. So the chance that all of them fold drops fast. From the button or small blind, only one or two players can call.',
          'That is why shoving ranges widen seat by seat toward the button. They are widest in the small blind.',
        ],
      },
      {
        kind: 'visual',
        title: 'The gap: callers need more',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'BB needs vs a 10bb shove', value: 42.9, tone: 'red' },
            { label: 'BB needs vs a 20bb shove', value: 46.3, tone: 'red' },
            { label: '9♣3♦ when called', value: 30.7, tone: 'green' },
          ],
        },
        caption: 'Facing a 10bb shove, the big blind calls 9bb into a pot of 12bb. The shover profited with 30.7% when called, because folds paid for the rest. The caller gets no fold equity. So calling ranges are tighter than shoving ranges.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Chips, not money',
        body: 'These are chip EV numbers. Near the money and at final tables, losing chips costs more than winning them gains. Calling ranges tighten further there. The ICM lesson covers why.',
      },
      {
        kind: 'quiz',
        question: 'You are in the small blind with 10bb. The pot is 2.5bb with a big blind ante. How often must the big blind fold for a zero equity shove to break even?',
        choices: ['20.8%', '79.2%', '86.4%'],
        answer: 1,
        explain:
          'Set eq to 0 in the shove formula. You risk 9.5bb to win the 2.5bb pot. 9.5 ÷ (2.5 + 9.5) = 79.2%. The 86.4% answer leaves the ante out of the pot.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'At the same 10bb stack, who needs more equity when the chips go in?',
        choices: ['The small blind shoving', 'Both need the same', 'The big blind calling'],
        answer: 2,
        explain:
          'Like the gap bars showed, the shover also wins when the big blind folds. The caller wins only at showdown, so it needs 42.9% here. The shover can profit with 30.7%.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Effective stacks drop from 15bb to 8bb. What happens to equilibrium shoving ranges?',
        choices: ['They get wider', 'They get tighter', 'They stay the same'],
        answer: 0,
        explain:
          'A shove now risks less to win the same pot. Like 9♣3♦ showed, the same hand gains as the stack shrinks. In chip EV the ranges widen.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You are close to the money in a tournament. How do calling ranges compare with these chip EV numbers?',
        choices: ['Tighter', 'Wider', 'The same'],
        answer: 0,
        explain: 'Near the money, losing chips costs more than winning them gains. So calling ranges tighten further. The ICM lesson covers why.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'EV of a shove = F × pot + (1 − F) × (eq × final pot − risk).',
          'Shorter stacks and later seats shove wider.',
          'Callers need real equity. So calling ranges are tighter than shoving ranges.',
          'These are chip EV numbers. ICM tightens them near the money.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/mtt-basics/icm',
    level: 'advanced',
    minutes: 8,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'Chips', value: 50, tone: 'gray' },
        { label: 'Money', value: 38.4 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Chips are not money',
        body: 'In a cash game a chip is worth its face value. In a tournament, money is paid by finishing place. So the chips you could lose are worth more than the chips you could win. ICM (the independent chip model) turns chips into money.',
      },
      {
        kind: 'text',
        title: 'Why chips are worth less than linear',
        body: [
          'The winner does not get the whole prize pool. Doubling your stack never doubles your prize money. Once you are in the money, busting still pays the place you reach.',
          'So each extra chip adds less money than the one before. Risking chips in a close spot costs money, even when it gains chips on average.',
        ],
      },
      {
        kind: 'visual',
        title: 'How the model works',
        art: {
          kind: 'tree',
          root: 'ICM, place by place',
          branches: [
            { label: '1st', value: 'Your share of all the chips', tone: 'brass' },
            { label: '2nd', value: 'Each rival wins, then your share of the rest', tone: 'brass' },
            { label: '$EV', value: 'Each payout times its chance', tone: 'green' },
          ],
        },
        caption: 'Later places work the same way as 2nd. ICM is a model. It ignores skill and position. It also ignores rising blinds and how future hands play.',
      },
      {
        kind: 'formula',
        title: 'Chance that A finishes second',
        formula: 'P(A 2nd) = P(B 1st) × A ÷ (A + C) + P(C 1st) × A ÷ (A + B)',
        example: 'Stacks are A 5,000, B 3,000 and C 2,000. 0.3 × 5/7 + 0.2 × 5/8 = 0.2143 + 0.125 = **33.9%**.',
      },
      {
        kind: 'table',
        title: 'Finishing chances',
        columns: ['Player', '1st', '2nd', '3rd'],
        rows: [
          ['A 5,000', '50.0%', '33.9%', '16.1%'],
          ['B 3,000', '30.0%', '37.5%', '32.5%'],
          ['C 2,000', '20.0%', '28.6%', '51.4%'],
        ],
        note: 'Computed exactly with the model. Third place is whatever is left, so each row adds to 100%.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Chips against money',
        columns: ['Player', 'Chip share', 'Prize share', '$EV'],
        rows: [
          ['A', '50.0%', '38.4%', '$38.39'],
          ['B', '30.0%', '32.8%', '$32.75'],
          ['C', '20.0%', '28.9%', '$28.86'],
        ],
        note: 'Payouts are $50, $30 and $20 from a $100 pool. For A, 50 × 0.5 + 30 × 0.3393 + 20 × 0.1607 = $38.39. The three add to $100.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Chips against money',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'A, chips', value: 50, tone: 'gray' },
            { label: 'A, money', value: 38.4 },
            { label: 'C, chips', value: 20, tone: 'gray' },
            { label: 'C, money', value: 28.9 },
          ],
        },
        caption: 'The chip leader holds half the chips but **38.4%** of the money. The short stack holds 20% of the chips but **28.9%** of the money.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'What the table shows',
        art: {
          kind: 'bars',
          bars: [
            { label: 'A’s stack', value: 7.7, tone: 'gray' },
            { label: 'C’s stack', value: 14.4, tone: 'green' },
          ],
        },
        caption: 'Each bar is dollars per 1,000 chips. Per chip, A’s stack is worth about half as much money as C’s. Third place pays $20 even with zero chips left. That is why the short stack’s money share beats its chip share.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'B faces an all in from A, blinds ignored',
        columns: ['B’s choice', 'Stacks after', '$EV for B'],
        rows: [
          ['Fold', '5,000 / 3,000 / 2,000', '$32.75'],
          ['Call and win', '2,000 / 6,000 / 2,000', '$41.00'],
          ['Call and lose', 'B out in 3rd', '$20.00'],
        ],
        note: 'Stacks are in order A / B / C. After a win, B finishes 1st 60% of the time. B is 2nd 30% and 3rd 10%. 30 + 9 + 2 = $41.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'The risk premium',
        formula: 'eq × 41 + (1 − eq) × 20 ≥ 32.75',
        example:
          'B needs eq ≥ 12.75 ÷ 21 = **60.7%** to call. Chip EV says 50.0%, since B risks 3,000 to win 3,000. The extra 10.7 points is the risk premium. Winning gains $8.25, but losing costs $12.75.',
      },
      {
        kind: 'visual',
        title: 'Who pays the most',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Chip EV', value: 50, tone: 'gray' },
            { label: 'A calls C', value: 52.1 },
            { label: 'B calls A', value: 60.7, tone: 'red' },
          ],
        },
        caption:
          'A covers C, so a loss does not knock A out. Across all six pairings here, the biggest premium falls on the middle stack calling the big stack. So the covering stack can shove wider. Covered stacks must call tighter than chip EV says.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'In the ICM model, a 2,000 chip stack plays in a tournament with 10,000 chips in play. What is its chance to win?',
        choices: ['Less than 20%', 'Exactly 20%', 'More than 20%'],
        answer: 1,
        explain:
          'Like the model showed, the chance to finish first equals chip share. 2,000 ÷ 10,000 = 20%. The short stack’s extra money comes from the lower places, not from first.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'B has 3,000 and faces an all in from A, who covers. Blinds are ignored. What equity does B need to call under ICM?',
        choices: ['About 41%', 'About 50%', 'About 61%'],
        answer: 2,
        explain:
          'Like the table showed, winning takes B from $32.75 to $41. Losing drops B to $20. Breakeven is 12.75 ÷ 21 = 60.7%. The 50% answer is chip EV, which ignores the payouts.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Why is a chip worth less than its face value in a tournament?',
        choices: ['Payouts are spread over several places', 'Blinds rise as the tournament goes on', 'Big stacks can bully smaller stacks'],
        answer: 0,
        explain:
          'With payouts spread over places, doubling up never doubles your prize. In the model, only the payouts make chips and money differ. Rising blinds matter at the table, but they are not in the model.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'A covers C. Why can A shove wider against C than chip EV suggests?',
        choices: ['A loss does not knock A out, so C must call tighter', 'ICM gives the big stack extra chips', 'A has more skill than C'],
        answer: 0,
        explain: 'Like the bars showed, the covered stack pays the risk premium. A covers C, so A survives a loss. That lets the covering stack apply pressure.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Chips you lose cost more money than chips you win add.',
          'In the model, win chance equals chip share. Later places follow the same idea.',
          'Covered stacks need well above 50% to call an all in.',
          'Covering stacks can apply pressure. ICM is a model, not the whole game.',
        ],
      },
    ],
  },
];

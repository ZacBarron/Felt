import type { LessonContent } from './types';

export const TOURNAMENT_LESSONS: LessonContent[] = [
  {
    key: 'tournaments/mtt-basics/antes',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: '2.5' },
    steps: [
      {
        kind: 'intro',
        title: 'Dead money changes every price',
        body: 'Antes put chips in the pot that nobody has to defend. More to win for the same risk means more hands are worth playing, for the opener and for the blinds.',
      },
      {
        kind: 'table',
        title: 'The pot before anyone acts',
        columns: ['Format', 'Pot'],
        rows: [
          ['Blinds only', '1.5bb'],
          ['Big blind ante of 1bb', '2.5bb'],
          ['9 players ante 0.125bb each', '2.625bb'],
        ],
        note: 'Blinds of 0.5bb and 1bb. With a big blind ante, the big blind posts one ante for the whole table.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'The ante is dead',
        body: [
          'The big blind’s 1bb blind is live: it counts toward a call. The ante is not. It belongs to the pot and does not reduce what the big blind has to put in.',
          'So against a 2.2bb open, the big blind still calls **1.2bb**, but into a bigger pot.',
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'The big blind’s price against a 2.2bb open',
        formula: 'Call ÷ (pot + call) = 1.2 ÷ (4.7 + 1.2)',
        example: 'Pot before the call: 0.5 + 1 + 1 ante + 2.2 open = 4.7bb. The big blind needs **20.3%** equity, before thinking about realization. Without the ante it needs 24.5%.',
      },
      {
        kind: 'table',
        title: 'Prices with and without the ante',
        columns: ['Spot', 'No ante', 'BB ante'],
        rows: [
          ['Folds a 2.2bb steal needs', '59.5%', '46.8%'],
          ['Equity BB needs to call 2.2bb', '24.5%', '20.3%'],
        ],
        note: 'Steal: risk ÷ (pot + risk), with pots of 1.5bb and 2.5bb. Call: 1.2 ÷ (pot + 1.2), with pots of 3.7bb and 4.7bb. For comparison, a cash game BB against a 2.5bb open with no ante needs 27.3%.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why ranges widen',
        body: [
          'A steal that needs fewer folds can be made with weaker hands, so equilibrium tournament strategies open wider from every seat once antes are in play. The blinds get a better price, so they defend wider too.',
          'Tournament solutions also tend to open smaller than cash games, often 2 to 2.3bb. A small open risks less to win the same dead money.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Players who ignore the ante',
        body: 'Many players keep folding as if there were no ante, especially in the blinds. If your table folds too often to opens, steal more. Check this against your own hands before relying on it.',
      },
      {
        kind: 'quiz',
        question: 'Blinds 0.5bb and 1bb with a 1bb big blind ante. How big is the pot before anyone acts?',
        choices: ['1.5bb', '2bb', '2.5bb'],
        answer: 2,
        explain: '0.5 + 1 + 1 = 2.5bb. That is 67% more to win than the 1.5bb in a game without antes.',
      },
      {
        kind: 'quiz',
        question: 'Big blind ante of 1bb. The cutoff opens to 2.2bb and it folds to the big blind. How much does the big blind have to call?',
        choices: ['1.2bb', '0.2bb', '2.2bb'],
        answer: 0,
        explain: 'The blind is live, so 1bb already counts. The ante is dead, so it does not. 2.2 − 1 = 1.2bb.',
      },
      {
        kind: 'quiz',
        question: 'With a 1bb big blind ante, how often must everyone fold for a 2.2bb steal with no equity to break even?',
        choices: ['59.5%', '46.8%', '33.3%'],
        answer: 1,
        explain: '2.2 ÷ (2.5 + 2.2) = 46.8%. Without the ante it would be 2.2 ÷ 3.7 = 59.5%.',
      },
      {
        kind: 'takeaway',
        points: [
          'A 1bb big blind ante makes the pot 2.5bb before anyone acts.',
          'The ante is dead; the big blind’s blind is live.',
          'Cheaper steals and better prices mean wider opens and wider defense.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/mtt-basics/push-fold',
    level: 'core',
    minutes: 7,
    cover: { kind: 'figure', text: '10bb' },
    steps: [
      {
        kind: 'intro',
        title: 'All in or nothing',
        body: 'With a short stack, raising and folding to a reraise throws away too much of your stack. Shoving gets the most fold equity and never leaves you guessing on later streets.',
      },
      {
        kind: 'text',
        title: 'Why short stacks shove',
        body: [
          'At 10bb, a 2.2bb open is 22% of your stack. If someone shoves over it, you are often priced in with a hand you did not want to play for stacks.',
          'Shoving makes every opponent decide for their whole stack, and it denies them the chance to outplay you after the flop. Full solutions at 12 to 15bb still use small opens and, from the small blind, limps. The shorter the stack, the closer the full strategy gets to pure push or fold.',
        ],
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
        example: 'EV is measured against folding, which is worth 0 from this point. The fold term pays even with the worst hand; the called term is where hand strength matters.',
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
        note: 'Pot 2.5bb (blinds 0.5 and 1, BB ante 1). Stacks are measured after antes, and the big blind covers. Assumed BB calling range, for illustration only: 22+, any ace, K2s+, K7o+, Q8s+, QTo+, J9s+, JTo (446 combos). After removing 9♣3♦, 425 of 1,225 hands call, so F = 65.3%. Equity when called is about 30.6% (1,000,000 Monte Carlo trials).',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Shorter stacks, wider shoves',
        body: [
          'Same hand, same caller: the shove goes from profitable to losing as the stack grows. The fold reward stays at 2.5bb, but when called, each extra big blind in the stacks costs this hand about **0.39bb** (1 − 2 × eq). It breaks even near **14bb**.',
          'In practice the big blind would call tighter against a bigger shove, because its price gets worse. The direction holds anyway: in equilibrium push or fold charts, shoving ranges widen as stacks shrink.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Fold equity compounds with players behind',
        columns: ['Players behind', 'All fold'],
        rows: [
          ['1', '85.0%'],
          ['2', '72.3%'],
          ['5', '44.4%'],
          ['8', '27.3%'],
        ],
        note: 'Illustration: each player behind folds 85% of the time, treated as independent. Card removal makes real folds slightly correlated.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Later seats shove wider',
        body: [
          'From early position, every player behind is a chance to run into a strong hand, so the chance that all of them fold drops fast. From the button or small blind, only one or two players can call.',
          'That is why shoving ranges get wider seat by seat toward the button and widest in the small blind.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'The gap: callers need more',
        body: [
          'Facing a 10bb shove from the small blind, the big blind calls 9bb into a pot of 12bb, so it needs **42.9%** equity. Against a 20bb shove it needs **46.3%**.',
          'The shover profited with 30.6% equity when called, because folds paid for the rest. The caller has no fold equity, so calling ranges are always tighter than shoving ranges at the same stack.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Chips, not money',
        body: 'These are chip EV numbers. Near the money and at final tables, payouts make losing chips cost more than winning them gains, and calling ranges tighten further. That is the ICM lesson.',
      },
      {
        kind: 'quiz',
        question: 'Small blind with 10bb, pot 2.5bb with a big blind ante. A shove with zero equity breaks even if the big blind folds:',
        choices: ['62.5%', '79.2%', '90%'],
        answer: 1,
        explain: 'You risk 9.5 to win 2.5: 9.5 ÷ (2.5 + 9.5) = 79.2%. Real hands have equity when called, so they need fewer folds.',
      },
      {
        kind: 'quiz',
        question: 'At the same 10bb stack, who needs more equity: the small blind shoving, or the big blind calling the shove?',
        choices: ['The shover', 'They need the same', 'The caller'],
        answer: 2,
        explain: 'The shover also wins when the big blind folds. The caller only wins at showdown and needs 42.9% here.',
      },
      {
        kind: 'quiz',
        question: 'Effective stacks drop from 15bb to 8bb. What happens to equilibrium shoving ranges?',
        choices: ['They get wider', 'They get tighter', 'They stay the same'],
        answer: 0,
        explain: 'Less risk for the same pot: the fold term weighs more and losing when called costs less.',
      },
      {
        kind: 'takeaway',
        points: [
          'EV of a shove = F × pot + (1 − F) × (eq × final pot − risk).',
          'Shorter stacks and later seats shove wider.',
          'Callers need real equity, so calling ranges are tighter than shoving ranges.',
          'These are chip EV numbers; ICM tightens them near the money.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/mtt-basics/icm',
    level: 'advanced',
    minutes: 8,
    cover: { kind: 'figure', text: '$EV' },
    steps: [
      {
        kind: 'intro',
        title: 'Chips are not money',
        body: 'In a cash game a chip is worth its face value. In a tournament, the money is paid out by finishing place, so the chips you could lose are worth more than the chips you could win.',
      },
      {
        kind: 'text',
        title: 'Why chips are worth less than linear',
        body: [
          'The winner does not get the whole prize pool. Doubling your stack never doubles your prize money, and losing every chip still leaves you whatever place you have already reached.',
          'So each extra chip adds less money than the one before. Risking chips in a close spot costs money even when it gains chips on average.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'The Malmuth Harville model',
        body: [
          'Your chance to finish first equals your share of the chips. Your chance to finish second: for each other player, the chance they win, times your share of the chips left without them. Later places follow the same way.',
          'Your money equity, $EV, is each payout times the chance of that place. It is a model: it ignores skill, position, rising blinds and how future hands play.',
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Chance that A finishes second',
        formula: 'P(A 2nd) = P(B 1st) × A ÷ (A + C) + P(C 1st) × A ÷ (A + B)',
        example: 'Stacks A 5,000, B 3,000, C 2,000: 0.3 × 5/7 + 0.2 × 5/8 = 0.2143 + 0.125 = **33.9%**.',
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
        note: 'Malmuth Harville, computed exactly. Third place is whatever is left: each row adds to 100%.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Chips against money',
        columns: ['Player', 'Chip share', 'Prize share', '$EV'],
        rows: [
          ['A', '50%', '38.4%', '$38.39'],
          ['B', '30%', '32.8%', '$32.75'],
          ['C', '20%', '28.9%', '$28.86'],
        ],
        note: 'Payouts $50, $30 and $20 from a $100 pool. A: 50 × 0.5 + 30 × 0.3393 + 20 × 0.1607 = $38.39. The three add to $100.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What the table shows',
        body: [
          'The chip leader holds half the chips but only 38.4% of the money. The short stack holds 20% of the chips but 28.9% of the money, because third place pays $20 even with zero chips left.',
          'Per chip, A’s stack is worth about half as much money as C’s: $0.0077 against $0.0144.',
        ],
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
        note: 'Stacks in order A / B / C. After a win, B finishes 1st 60%, 2nd 30%, 3rd 10%: 30 + 9 + 2 = $41.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'The risk premium',
        formula: 'eq × 41 + (1 − eq) × 20 ≥ 32.75',
        example: 'B needs eq ≥ 12.75 ÷ 21 = **60.7%** to call. Chip EV says 50%, since B risks 3,000 to win 3,000. The extra 10.7 points is the risk premium: winning gains $8.25, losing costs $12.75.',
      },
      {
        kind: 'text',
        title: 'Who pays the most',
        body: [
          'In the same model, if C shoves 2,000 and A calls, A needs **52.1%**: A covers C, so a loss does not knock A out. In this example the biggest premium is paid by the middle stack facing the big stack.',
          'So under ICM the stack that covers can shove wider, and stacks that are covered must call tighter than chip EV says.',
        ],
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'Under Malmuth Harville, the chance that a 2,000 chip stack wins a tournament with 10,000 chips in play is:',
        choices: ['Less than 20%', '20%', 'More than 20%'],
        answer: 1,
        explain: 'The model’s starting assumption: chance to finish first equals share of chips.',
      },
      {
        kind: 'quiz',
        question: 'B has 3,000 and faces an all in from A, who covers. Blinds ignored, chip EV says call with 50%. What does ICM say here?',
        choices: ['About 50%', 'About 41%', 'About 61%'],
        answer: 2,
        explain: 'Winning takes B from $32.75 to $41, losing drops B to $20. Breakeven: 12.75 ÷ 21 = 60.7%.',
      },
      {
        kind: 'quiz',
        question: 'Why is a chip worth less than linear in a tournament?',
        choices: [
          'Payouts are spread over several places, so doubling up does not double your prize',
          'Blinds rise over time',
          'Big stacks play better',
        ],
        answer: 0,
        explain: 'The payout structure, not skill or blinds, is what makes chips and money diverge in the model.',
      },
      {
        kind: 'takeaway',
        points: [
          'Chips lost cost more money than chips won add.',
          'Malmuth Harville: win chance equals chip share, then the same idea for each place.',
          'Covered stacks need well above 50% to call all in.',
          'Covering stacks can apply pressure; ICM is a model, not the whole game.',
        ],
      },
    ],
  },
];

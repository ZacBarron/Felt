import type { LessonContent } from './types';

/**
 * Tournament gaps: bounty events and satellites. Prices come from pot odds
 * and ICM (each finishing order weighted by stack shares), recomputed in
 * packages/content/test/gaps2.test.ts. Buy in splits, the chip value of a
 * bounty and every stack are labelled as examples or as a model.
 */
export const GAPS_TOURNAMENT_LESSONS: LessonContent[] = [
  {
    key: 'tournaments/mtt-basics/bounties',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'No bounty', value: 45.8, tone: 'gray' },
        { label: '10bb bounty', value: 36.9, tone: 'green' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'A prize on every player',
        body: 'In a **bounty** tournament, part of each buy in is a prize on that player. Knock a player out and you win their bounty at once. That changes which calls are worth making.',
      },
      {
        kind: 'visual',
        title: 'Where an example buy in goes',
        art: {
          kind: 'tree',
          root: '$100 buy in',
          branches: [
            { label: 'Prize pool', value: '$50', tone: 'brass' },
            { label: 'Bounty on your head', value: '$50', tone: 'green' },
          ],
        },
        caption: 'This is an example split. Events differ, and the room also takes a fee.',
      },
      {
        kind: 'text',
        title: 'You must cover to collect',
        body: [
          'You win a bounty only by knocking that player out.',
          'So you need at least as many chips as they have. That is called **covering** them.',
          'If they cover you, their bounty is not on offer in this hand.',
        ],
      },
      {
        kind: 'visual',
        title: 'You cover this shove',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'You', bb: 40 },
            { label: 'Villain', bb: 20 },
          ],
        },
        caption: 'You have 40bb and villain shoves 20bb. If you call and win, villain is out. Their bounty is yours.',
      },
      {
        kind: 'formula',
        title: 'Add the bounty to what you win',
        formula: 'Equity needed = call ÷ (final pot + bounty)',
        parts: [
          ['call', 'Chips you add to call'],
          ['final pot', 'Pot once you call'],
          ['bounty', 'The bounty priced in chips'],
        ],
        example:
          'Blinds are 0.5bb and 1bb with a 1bb ante. Villain shoves 20bb on the button. The small blind folds and you call 19bb more. The final pot is 41.5bb. With no bounty you need 19 ÷ 41.5 = **45.8%**. With a 10bb bounty you need 19 ÷ 51.5 = **36.9%**.',
      },
      {
        kind: 'visual',
        title: 'The bounty lowers the price',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'No bounty', value: 45.8, tone: 'gray' },
            { label: '10bb bounty', value: 36.9, tone: 'green' },
          ],
        },
        caption: 'The same call needs about 8.9 points less equity. This is chip math. It counts the bounty as chips and leaves out ICM.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Pricing a bounty in chips',
        body: 'One simple estimate values a bounty at the chips its money bought. Say $50 of prize pool bought 20,000 starting chips. Then a $50 bounty is worth about 20,000 chips. At a 2,000 big blind, that is 10bb. Treat this as a model, not a fact.',
      },
      {
        kind: 'visual',
        title: 'Bigger bounty, cheaper call',
        art: {
          kind: 'curve',
          points: [
            [0, 45.8],
            [5, 40.9],
            [10, 36.9],
            [15, 33.6],
            [20, 30.9],
          ],
          xLabel: 'Bounty, bb',
          yLabel: 'Equity to call, %',
          mark: [10, 36.9],
        },
        caption: 'This is the same 19bb call with bounties from 0 to 20bb. As blinds rise, a fixed bounty is worth fewer bb. So a fixed bounty changes calls most while blinds are small.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Read the bounty rules',
        body: 'Rules differ by event. Some pay the whole bounty at once. Others add part of it to your own bounty. Check how much you collect before you price a call.',
      },
      {
        kind: 'quiz',
        question: 'You cover a shove. You call 19bb into a final pot of 41.5bb. The bounty is worth 10bb. What equity do you need?',
        choices: ['45.8%', '36.9%', '21.7%'],
        answer: 1,
        explain: 'Like the formula showed, add the bounty to what you win. 19 ÷ (41.5 + 10) = 36.9%. The 21.7% answer takes the bounty off your call instead.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You have 15bb. A player with 25bb shoves. Does their bounty lower your price?',
        choices: ['Yes, by the whole bounty', 'No, since you cannot knock them out', 'Only if you win the hand'],
        answer: 1,
        explain: 'You win a bounty only when you cover the player. You can win only 15bb from them, so they stay in with 10bb. Their bounty is not on offer.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'What does a bounty change when you cover an all in?',
        choices: ['It adds to what you win, so calls need less equity', 'It makes every call correct', 'Nothing, since bounties are paid later'],
        answer: 0,
        explain: 'Winning the hand also wins the bounty. That lowers the equity you need. You still need enough equity for the lower price.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'A bounty is worth 20,000 chips. That was 10bb at a 2,000 big blind. The big blind rises to 4,000. What is it worth now?',
        choices: ['5bb', '10bb', '20bb'],
        answer: 0,
        explain: '20,000 ÷ 4,000 = 5bb. A fixed bounty is worth fewer bb as blinds rise. So it changes calls most while blinds are small.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'You win a bounty only when you cover the player.',
          'Add the bounty to the final pot when you price a call.',
          'A bounty priced in chips is a model. It is worth fewer bb as blinds rise.',
        ],
      },
    ],
  },
  {
    key: 'tournaments/mtt-basics/satellites',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'curve',
      points: [
        [1, 1000],
        [2, 1000],
        [3, 1000],
        [4, 1000],
        [5, 0],
      ],
      xLabel: 'Finish',
      yLabel: 'Prize, $',
    },
    steps: [
      {
        kind: 'intro',
        title: 'Every seat pays the same',
        body: 'In a **satellite**, the prize is a seat in a bigger event. Every seat is worth the same. So 1st place pays no more than the last seat.',
      },
      {
        kind: 'visual',
        title: 'A flat payout',
        art: {
          kind: 'curve',
          points: [
            [1, 1000],
            [2, 1000],
            [3, 1000],
            [4, 1000],
            [5, 0],
          ],
          xLabel: 'Finish',
          yLabel: 'Prize, $',
        },
        caption: 'In this example 5 players are left and 4 seats pay $1,000 each. 5th place gets nothing. A normal final table pays more for each place you climb.',
      },
      {
        kind: 'text',
        title: 'Chips stop counting once you are safe',
        body: [
          'You can win only one seat, however many chips you have.',
          'So extra chips add almost nothing. Losing chips can still cost you the seat.',
          'This is ICM at its most extreme.',
        ],
      },
      {
        kind: 'table',
        title: 'Five stacks, four seats',
        columns: ['Stack', 'Share of chips', 'ICM value'],
        rows: [
          ['40bb', '$1,600', '$989'],
          ['30bb', '$1,200', '$979'],
          ['20bb', '$800', '$951'],
          ['7bb', '$280', '$737'],
          ['3bb', '$120', '$343'],
        ],
        note: 'The prize pool is $4,000. ICM values are our estimate from stack sizes alone, rounded to the dollar. Blinds are left out.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Chips against seats',
        art: {
          kind: 'bars',
          bars: [
            { label: '40bb, share of chips', value: 1600, tone: 'gray' },
            { label: '40bb, ICM value', value: 989, tone: 'brass' },
            { label: '3bb, share of chips', value: 120, tone: 'gray' },
            { label: '3bb, ICM value', value: 343, tone: 'green' },
          ],
        },
        caption: 'As a share of chips, the 40bb stack would be worth $1,600. ICM puts it at about $989, under one seat. The 3bb stack is worth about $343, far above its $120 chip share.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Folding aces',
        cards: 'AsAd',
        caption: 'You have 20bb. The 30bb stack shoves and everyone else folds. If you call and lose, you get nothing. ICM says the call needs **95.8%** equity. Aces win about **85%** against a random hand. So you fold.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Why folding is safe here',
        body: 'The 7bb and 3bb stacks are likely to bust before you. Folding keeps about a 95.1% chance at a seat in this model.',
      },
      {
        kind: 'visual',
        title: 'What it takes to call',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Chip math', value: 50, tone: 'gray' },
            { label: '20bb calls 30bb', value: 95.8, tone: 'red' },
            { label: '40bb calls 3bb', value: 52.9, tone: 'brass' },
          ],
        },
        caption: 'With blinds left out, chip math says a call needs 50%. Here the 20bb stack needs 95.8% to call the 30bb stack. Even the chip leader needs 52.9% to call the 3bb stack.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'In a satellite, 4 seats pay $1,000 each. You have the most chips by far. What is the most your stack can win?',
        choices: ['One seat worth $1,000', 'Your share of the $4,000 pool', 'More than $1,000 if you finish 1st'],
        answer: 0,
        explain: 'Every seat pays the same. 1st place wins one seat, just like 4th. Chips past a safe stack add almost nothing.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You have 20bb and a seat is close. The 30bb stack shoves. What does the model say about aces?',
        cards: 'AsAd',
        choices: ['Call, since aces are the best hand', 'Fold, since the call needs 95.8% equity', 'Call, since a win locks up a seat'],
        answer: 1,
        explain: 'Like the hand showed, losing costs your whole seat. Winning adds little to a seat you almost have. Aces win about 85% against a random hand, far short of 95.8%.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'Near the end of a satellite, what drives most decisions?',
        choices: ['Whether a play risks your seat', 'Building the biggest stack', 'Winning the most pots'],
        answer: 0,
        explain: 'A seat is the whole prize. Chips matter only as protection for it. So the first question is always what a play risks.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'In a satellite every seat pays the same. Chips past a safe stack add almost nothing.',
          'Calls that risk your seat need huge equity, even with aces.',
          'Near the end, ask first whether a play risks your seat.',
        ],
      },
    ],
  },
];

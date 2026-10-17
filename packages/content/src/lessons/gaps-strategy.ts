import type { LessonContent } from './types';

/**
 * Strategy gaps: showdown value and pot control, a grounded poker face, and
 * how much weight a tell deserves. Numbers are recomputed with @felt/core in
 * packages/content/test/gaps2.test.ts. Simple models and example sizes are
 * labelled as such in the copy.
 */
export const GAPS_STRATEGY_LESSONS: LessonContent[] = [
  {
    key: 'postflop/later-streets/pot-control',
    level: 'core',
    minutes: 6,
    cover: {
      kind: 'tree',
      root: 'Your hand on the river',
      branches: [
        { label: 'Value', value: 'Bet', tone: 'green' },
        { label: 'Showdown value', value: 'Often check', tone: 'brass' },
        { label: 'Nothing', value: 'Bluff or give up', tone: 'gray' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Not every hand wants a bigger pot',
        body: 'Some hands win often at showdown but gain little by betting. They have **showdown value**. Keeping the pot small with them is called **pot control**.',
      },
      {
        kind: 'visual',
        title: 'Three kinds of hands',
        art: {
          kind: 'tree',
          root: 'Your hand on the river',
          branches: [
            { label: 'Value', value: 'Bet', tone: 'green' },
            { label: 'Showdown value', value: 'Often check', tone: 'brass' },
            { label: 'Nothing', value: 'Bluff or give up', tone: 'gray' },
          ],
        },
        caption: 'Value hands bet because worse hands call. Hands with nothing bluff or give up. Medium hands sit in between and often check.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Second pair on the turn',
        cards: 'Qh9c',
        board: 'Kc9d5s2h',
        caption: 'You opened on the button and the big blind called. You bet the flop and they called again. Now you hold second pair in position. Most worse hands fold to another bet. Many better hands call or raise.',
      },
      {
        kind: 'text',
        title: 'Why a bet does little here',
        body: [
          'A bet earns when worse hands call. It also earns when better hands fold.',
          'Second pair gets neither very often. Worse hands fold and better hands stay.',
          'A check keeps the pot small. You still win at showdown when you are ahead.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Check or bet, in a simple model',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'Check', value: 12, tone: 'green' },
            { label: 'Bet 10bb', value: 8, tone: 'red' },
          ],
        },
        caption:
          'The river pot is 20bb and you act last. Your hand is ahead 60% of the time. Say worse hands always fold to a 10bb bet and better hands always call. Checking earns 0.6 × 20 = **12bb**. Betting earns 12 − 4 = **8bb**. This is a simple model, not a solver result.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Solvers still mix',
        body: 'Medium hands still bet some of the time. A bet can deny a free card to draws. It can also get value from worse pairs. Treat the check as the usual play, not the only one.',
      },
      {
        kind: 'visual',
        title: 'One check keeps the pot small',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'Bets called on turn and river', value: 62.5, tone: 'red' },
            { label: 'Check turn, call river', value: 25, tone: 'green' },
          ],
        },
        caption: 'The turn starts with a 10bb pot. Two called bets of 75% pot grow it to **62.5bb**. Check the turn and call one 75% bet on the river. Then it ends at **25bb**.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Adjust to the player',
        body: 'Against players who call too much, bet medium hands more for thin value. Against players who bluff too much, check and let them bet.',
      },
      {
        kind: 'quiz',
        question: 'On this river, which hand has showdown value but gains little by betting?',
        board: 'Kc9d5s2h7c',
        choiceCards: ['KsQs', '9h8h', '4h3h'],
        choices: ['K♠ Q♠', '9♥ 8♥', '4♥ 3♥'],
        answer: 1,
        explain: 'Like the 3 kinds of hands showed, 9♥8♥ has second pair. It beats bluffs but few hands that call. K♠Q♠ has top pair and can often bet for value. 4♥3♥ has nothing.',
        point: 0,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'The river pot is 20bb. You bet 10bb with a medium hand. Worse hands fold and better hands call. You are behind 40% of the time. How does betting compare with checking?',
        choices: ['It earns 4bb more', 'It earns the same', 'It earns 4bb less'],
        answer: 2,
        explain: 'Like the simple model showed, checking wins 0.6 × 20 = 12bb. Betting wins the same 12bb when worse hands fold. But it loses 10bb the 40% of the time you are called.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Why check back a medium hand in position?',
        choices: ['To keep the pot small and reach showdown cheaply', 'Because medium hands never win', 'To trap players holding the nuts'],
        answer: 0,
        explain: 'Like the pot sizes showed, a check keeps the pot small. You still win at showdown when you are ahead. Medium hands still bet some of the time, so it is not a fixed rule.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Sort hands into value, showdown value and nothing. Second pair usually has showdown value.',
          'A bet needs worse hands to call or better hands to fold. Medium hands get neither.',
          'Checking keeps the pot small. Solvers still mix in some bets with medium hands.',
        ],
      },
    ],
  },
  {
    key: 'exploit/tells/poker-face',
    level: 'core',
    minutes: 5,
    cover: {
      kind: 'tree',
      root: 'Every decision',
      branches: [
        { label: 'Same routine', tone: 'brass' },
        { label: 'Same pace', tone: 'brass' },
        { label: 'Same sizes', tone: 'green' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Consistency, not a stare',
        body: 'A good poker face is mostly consistency. Do the same things the same way on every hand. A stony stare is optional.',
      },
      {
        kind: 'visual',
        title: 'A routine for every decision',
        art: {
          kind: 'tree',
          root: 'Your turn to act',
          branches: [
            { label: 'Take one breath', value: 'Same pause every time', tone: 'brass' },
            { label: 'Decide', value: 'Think it through anyway', tone: 'brass' },
            { label: 'Say the action', value: 'Then stop talking', tone: 'green' },
            { label: 'Move your chips', value: 'One smooth motion', tone: 'green' },
          ],
        },
        caption: 'Run the same steps with aces and with air. A routine hides tells you do not know you have. The breath also slows you down before big decisions.',
        evidence: 'exploit',
      },
      {
        kind: 'text',
        title: 'Still and quiet',
        body: [
          'Keep your hands still and your chips neat.',
          'While you wait, look at the same spot each time. The middle of the table works well.',
          'Say your action clearly, then stop. Words during a hand carry tells too.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'visual',
        title: 'Size by the spot, not by your hand',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Value bet', value: 75, tone: 'green' },
            { label: 'Bluff', value: 75, tone: 'red' },
          ],
        },
        caption: 'Pick a bet size from the board and your range. Then use it with strong hands and bluffs alike. Many players bet big with the nuts and small with bluffs. That leak shows in every bet, whatever their face does.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'What balance looks like',
        art: { kind: 'ring', value: 0.3, label: 'Bluffs in a 75% pot river bet' },
        caption: 'Bet 75% of the pot on the river. If 30% of those bets are bluffs, a bluff catcher breaks even by calling. Then reading your size tells them nothing about this bet.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Strategy hides more than your face',
        body: 'Most opponents read bets far more than faces. If your lines are balanced, they have little left to read. A stony stare cannot hide a big bet that only comes with the nuts.',
      },
      {
        kind: 'quiz',
        question: 'Which habit gives away the least?',
        choices: ['Staring hard at opponents when you bluff', 'Betting bigger with your best hands', 'Using the same routine and sizes on every hand'],
        answer: 2,
        explain: 'Like the routine showed, sameness leaves nothing to read. A hard stare is a change in behavior. Bigger bets with the best hands turn your size into a tell.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Villain asks you a question while you are in a hand. What is the safest reply?',
        choices: ['Say your action and nothing more', 'Chat freely to look relaxed', 'Answer honestly about your hand'],
        answer: 0,
        explain: 'Like the still and quiet step said, words carry tells too. Saying only your action gives them nothing new. Friendly talk can wait until the hand is over.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Your face never moves. But you bet big with strong hands and small with bluffs. What gives you away?',
        choices: ['Nothing, since your face is perfect', 'Your bet sizes', 'Only your timing'],
        answer: 1,
        explain: 'Like the sizing picture showed, a size that changes with hand strength tells players what you hold. A perfect face cannot fix that. Use the same sizes with value and bluffs.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A poker face is the same routine on every hand.',
          'Stay still and look at one spot. Say only your action.',
          'Use the same bet sizes with strong hands and bluffs. Opponents read bets more than faces.',
        ],
      },
    ],
  },
  {
    key: 'exploit/tells/using-tells',
    level: 'core',
    minutes: 6,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'Equity needed', value: 25, tone: 'gray' },
        { label: 'Your estimate', value: 23, tone: 'red' },
        { label: 'After a tell', value: 28, tone: 'green' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'A tell is a nudge',
        body: 'A tell is evidence, not an answer. It should move close decisions only. This lesson shows how much weight to give one.',
      },
      {
        kind: 'visual',
        title: 'Read against their baseline',
        art: {
          kind: 'tree',
          root: 'Villain does something',
          branches: [
            { label: 'They always do it', value: 'Nothing new', tone: 'gray' },
            { label: 'It is new for them', value: 'A maybe', tone: 'brass' },
            { label: 'New, and showdowns matched it', value: 'A usable read', tone: 'green' },
          ],
        },
        caption: 'A tell means something only against how that player usually acts. Most of what you see at a table is noise.',
        evidence: 'exploit',
      },
      {
        kind: 'text',
        title: 'Weak, noisy and sometimes fake',
        body: [
          'Most tells are weak. People fidget for many reasons.',
          'Some players act on purpose. A **false tell** is acting weak with a strong hand, or the reverse.',
          'So let a tell shift your estimate a little. Never let it replace the math.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'formula',
        title: 'Start with the price',
        formula: 'Equity needed = call ÷ final pot',
        example: 'The pot is 30bb and villain bets 15bb on the river. You call 15bb to win a final pot of 60bb. 15 ÷ 60 = **25%**.',
      },
      {
        kind: 'visual',
        title: 'A close call can flip',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Equity needed', value: 25, tone: 'gray' },
            { label: 'Your estimate', value: 23, tone: 'red' },
            { label: 'After a tell', value: 28, tone: 'green' },
          ],
        },
        caption: 'Your estimate is 23%, just under the price. Calling loses **1.2bb** on average. Say a tell moves you to 28%. Now calling earns **1.8bb**. The 5 point shift is only an example. Nobody can measure a tell that exactly.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A clear fold stays a fold',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Equity needed', value: 25, tone: 'gray' },
            { label: 'Your estimate', value: 10, tone: 'red' },
            { label: 'After a tell', value: 15, tone: 'red' },
          ],
        },
        caption: 'Now your estimate is 10%. Calling loses **9bb**. The same tell moves you to 15%. Calling still loses **6bb**, so you fold.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Online, watch timing and sizing',
        body: 'Online there are no faces. Timing and bet sizes take their place. An instant call tends to point to a draw or a medium hand. Trust a pattern only after one player repeats it.',
      },
      {
        kind: 'quiz',
        question: 'You need 25% equity to call. You estimate 10%. Villain shows a weak tell. What is the play?',
        choices: ['Call, since the tell says they are bluffing', 'Fold, since a tell cannot close a 15 point gap', 'Raise to test the read'],
        answer: 1,
        explain: 'Like the clear fold showed, a weak tell moves your estimate a few points at most. At 10% the call loses 9bb. Even a generous shift leaves it losing across a 15 point gap.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'A player shakes on every bet, strong or weak. They shake again on the river. What does it tell you?',
        choices: ['They are strong', 'They are bluffing', 'Little, since shaking is their baseline'],
        answer: 2,
        explain: 'Like the baseline tree showed, a tell is a change from how a player usually acts. This player always shakes. So the shake adds nothing new.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'When should a tell change your decision?',
        choices: ['Only when the decision is already close', 'Whenever you notice one', 'Never, since every tell is fake'],
        answer: 0,
        explain: 'Like the close call showed, tells are weak evidence. They can tip 23% against a 25% price. They cannot rescue a clear fold.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Price the call first. Then let a tell move only close decisions.',
          'Read tells against each player’s baseline.',
        ],
      },
    ],
  },
];

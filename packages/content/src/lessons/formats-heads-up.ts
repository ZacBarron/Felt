import type { LessonContent } from './types';

/**
 * Heads up cash and blind vs blind. Every number here is recomputed in
 * test/formats-heads-up.test.ts. Felt has no 2-handed charts, so the lessons
 * teach with exact math, an illustration range that says it is one, and
 * solver patterns kept qualitative.
 */

/**
 * An illustration of a wide heads up button open, about 78% of hands. It folds
 * only the weakest offsuit hands. It is not solver output, and lessons say so.
 */
export const HU_ILLUSTRATION_RANGE =
  '22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J3o+, T5o+, 96o+, 86o+, 75o+, 65o';

export const FORMATS_HEADS_UP_LESSONS: LessonContent[] = [
  {
    key: 'formats/heads-up/hu-preflop',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'table', seats: 2, button: 'BTN', hero: 'BTN', highlight: ['BB'], note: 'The button posts the small blind' },
    steps: [
      {
        kind: 'intro',
        title: 'Two players, every hand',
        body: 'Heads up, you post a blind every hand. The button posts the small blind. It acts first before the flop and last after it.',
      },
      {
        kind: 'visual',
        title: 'The button is the small blind',
        art: { kind: 'table', seats: 2, button: 'BTN', hero: 'BTN', highlight: ['BB'], note: 'You act last after the flop' },
        caption: 'The button posts 0.5bb and the big blind posts 1bb. Before the flop the button acts first. On every later street it acts last.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Blinds come around fast',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'Heads up', value: 0.75, tone: 'brass' },
            { label: '9-handed', value: 0.17, tone: 'gray' },
          ],
        },
        caption:
          'Each hand the 2 blinds put in 1.5bb. Heads up, you pay half of that on average. That is 0.75bb a hand. 9-handed, you pay 1.5bb once every 9 hands. That is about 0.17bb a hand. Heads up costs 4.5 times as much.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'What a min raise risks',
        formula: 'Folds needed = 1.5 ÷ (1.5 + 1.5) = 50%',
        parts: [
          ['Pot before the raise', '0.5 + 1 = 1.5bb'],
          ['Raise to 2bb', 'The button adds 1.5bb'],
        ],
        example:
          'The button already has 0.5bb in. A min raise to 2bb adds 1.5bb to win a 1.5bb pot. As a pure bluff, it breaks even when the big blind folds **50%** of the time.',
      },
      {
        kind: 'visual',
        title: 'The big blind’s price',
        art: { kind: 'ring', value: 1 / 4, label: 'Equity to call', caption: 'Against a 2bb min raise' },
        caption:
          'The pot is 3bb after the raise. The big blind calls 1bb to make it 4bb. So it needs **25%** raw equity. Against a 2.5bb button open at a full table, it needs 27.3%.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'How often the big blind must defend',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Heads up, 2bb raise', value: 50, tone: 'brass' },
            { label: 'Heads up, 2.5bb raise', value: 42.9 },
            { label: '9-handed, 2.5bb button open', value: 37.5, tone: 'gray' },
          ],
        },
        caption:
          'This is MDF, the defense that stops any 2 cards from profiting at once. At a full table, both blinds share the 37.5%. Heads up, the big blind must reach 50% alone.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'A rough guide before the flop',
        body: [
          'MDF treats the raise as a pure bluff. Real raises have equity, and the hand plays on after the flop.',
          'So use it as a guide to how wide to defend. Do not use it as an exact rule.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'How solvers open at 100bb',
        art: {
          kind: 'tree',
          root: 'Heads up button, 100bb',
          branches: [
            { label: 'Opens', value: 'Most hands', tone: 'green' },
            { label: 'Folds', value: 'The weakest hands', tone: 'gray' },
          ],
        },
        caption:
          'Solver strategies open most hands from the heads up button. They use small sizes, from a min raise to about 2.5bb. Some also limp part of the range.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why so wide',
        body: [
          'The button acts last on every street after the flop. So it realizes more of its equity.',
          'Only the big blind can wake up with a strong hand. At a full table, an early open faces 8 players.',
          'The big blind defends wide in return. It calls a lot and 3bets often.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Heads up, who acts first before the flop?',
        choices: ['The button', 'The big blind'],
        answer: 0,
        explain: 'Like the table showed, the button posts the small blind. It acts first before the flop. After the flop it acts last on every street.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'The button min raises to 2bb. What raw equity does the big blind need to call?',
        choices: ['25%', '33.3%', '50%'],
        answer: 0,
        explain: 'Like the ring showed, the big blind calls 1bb to make a 4bb pot. 1 ÷ 4 = 25%. The 33.3% answer leaves its own blind out of the pot.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'The button min raises with any 2 cards. How often must the big blind defend so the raise does not profit at once?',
        choices: ['37.5%', '50%', '75%'],
        answer: 1,
        explain:
          'Like the bars showed, the raise adds 1.5bb to win 1.5bb. As a pure bluff it profits if the big blind folds more than 50%. At a full table both blinds share a 37.5% target.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Why do solvers open most hands from the heads up button?',
        choices: ['It has position after the flop and only 1 player behind', 'The big blind must fold 50% of the time', 'Weak hands win more often heads up'],
        answer: 0,
        explain: 'Like the solver step said, position lets the button realize more equity. Only the big blind can wake up with a hand. The 50% is what the big blind must defend.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Heads up, the button posts the small blind. It acts first before the flop and last after.',
          'Against a 2bb min raise, the big blind needs 25% raw equity.',
          'A min raise risks 1.5bb to win 1.5bb. So the big blind must defend about 50% alone.',
          'Solvers open most button hands at 100bb. Position and few players behind make weak hands playable.',
        ],
      },
    ],
  },
  {
    key: 'formats/heads-up/hu-bb-defense',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'cards', cards: '7h2c' },
    steps: [
      {
        kind: 'intro',
        title: 'You close the action',
        body: 'Heads up, you are the big blind in half of all hands. Most of those hands start with a raise. You get a good price but play out of position.',
      },
      {
        kind: 'table',
        title: 'Your price and your target',
        columns: ['Raise to', 'You call', 'Equity needed', 'MDF'],
        rows: [
          ['2bb', '1bb', '25%', '50%'],
          ['2.5bb', '1.5bb', '30%', '42.9%'],
          ['3bb', '2bb', '33.3%', '37.5%'],
        ],
        note: 'Equity needed is your call divided by the pot after you call. MDF divides the 1.5bb of blinds by that plus what the button adds. A smaller raise asks you to defend more.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'A wide range to defend against',
        body: [
          'To see the numbers, take a button that opens about 78% of hands. It folds only the weakest offsuit hands like 72o and T4o.',
          'This range is an illustration, not solver output. Solver ranges at 100bb are also very wide.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Raw equity against that range',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Price', value: 25, tone: 'brass' },
            { label: '72o', value: 32, tone: 'gray' },
            { label: 'J4o', value: 41 },
            { label: 'K9o', value: 55, tone: 'green' },
          ],
        },
        caption: 'Every starting hand has more than 30% equity against this range. Even 72o has about 32%. On raw equity alone you would defend every hand.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Watch the raise size',
        body: 'A bigger raise gives you a worse price. Like the table showed, you defend less against 3bb than against 2bb.',
      },
      {
        kind: 'visual',
        title: 'Realization decides what folds',
        art: {
          kind: 'tree',
          root: 'Big blind, out of position',
          branches: [
            { label: 'Suited and connected', value: 'Keeps more equity', tone: 'green' },
            { label: 'Weak offsuit', value: 'Keeps less', tone: 'red' },
          ],
        },
        caption:
          'The button acts last on every street. It can bet you off your equity before the river. So solvers still fold some of the weakest offsuit hands.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A hand that realizes well',
        cards: '6h5h',
        caption: '65s rarely starts with the best hand. But it flops straight draws and flush draws. Those let it keep calling and sometimes raise.',
      },
      {
        kind: 'text',
        title: 'Why the big blind 3bets more',
        body: [
          'A wide button range holds many hands that cannot call a 3bet. So 3bets win the pot often.',
          'Like the bars showed, hands like K9o are ahead of that range. They can raise for value.',
          'Solvers 3bet more often heads up than against a full ring button open.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Heads up, the button raises to 2.5bb. What raw equity do you need to call from the big blind?',
        choices: ['25%', '30%', '42.9%'],
        answer: 1,
        explain: 'Like the table showed, you call 1.5bb to make a 5bb pot. 1.5 ÷ 5 = 30%. The 42.9% is MDF, which is a different number.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Against the illustration range, why fold 72o at all?',
        cards: '7h2c',
        choices: ['It keeps too little of its equity out of position', 'Its raw equity is below the 25% price', 'The button only opens strong hands'],
        answer: 0,
        explain: 'Like the bars showed, 72o has about 32% raw equity. That beats the price. But out of position it gets bet off much of that equity.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Which hand keeps more of its equity out of position?',
        choices: ['65s', '93o'],
        choiceCards: ['6h5h', '9c3d'],
        answer: 0,
        explain: 'Like the hand showed, 65s flops draws that keep it in the hand. 93o makes few strong hands or draws.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Why does the big blind 3bet more heads up than at a full table?',
        choices: ['The button range is wider and holds many weak hands', 'The big blind has position', 'A 3bet costs less heads up'],
        answer: 0,
        explain: 'Like the 3bet step said, a wide range folds often to a 3bet. Some hands are also ahead of it for value. The big blind is still out of position.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Against a 2bb raise you need 25% raw equity. Against 2.5bb you need 30%.',
          'Against a wide range every hand clears the price. Realization out of position decides what folds.',
          'A wide button range folds often to 3bets. So the big blind 3bets more heads up.',
        ],
      },
    ],
  },
  {
    key: 'formats/heads-up/bvb-full-ring',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'SB', highlight: ['BB'], note: 'Folded to the blinds' },
    practice: ['9max-100-rfi-sb'],
    steps: [
      {
        kind: 'intro',
        title: 'Same blinds, no position',
        body: 'When 7 players fold, the 2 blinds play heads up. The blinds and the pot match a heads up game. But now the small blind has no position.',
      },
      {
        kind: 'visual',
        title: 'Folded to the small blind',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'SB', highlight: ['BB'], note: 'You act first after the flop' },
        caption:
          'The pot is 1.5bb. In a heads up game the small blind is the button and acts last after the flop. Here the button has folded. So the small blind acts first on every later street.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'What each choice costs',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'Limp', value: 0.5, tone: 'gray' },
            { label: 'Raise to 3bb', value: 2.5, tone: 'brass' },
          ],
        },
        caption: 'A limp adds 0.5bb to a 1.5bb pot. A raise to 3bb adds 2.5bb. As a pure bluff, that raise needs the big blind to fold **62.5%** of the time.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Raising a limp',
        formula: 'Folds needed = 3 ÷ (2 + 3) = 60%',
        parts: [
          ['Pot after the limp', '1 + 1 = 2bb'],
          ['Raise to 4bb', 'The big blind adds 3bb'],
        ],
        example:
          'Take a raise to 4bb as an example size. As a pure bluff it needs **60%** folds. If the small blind calls, it pays 3bb to make an 8bb pot. So it needs **37.5%** equity.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-sb',
        title: 'Felt’s chart raises or folds',
        caption: 'This starter chart raises about 42% of hands to 3bb. It leaves out limps to stay simple. So it approximates a strategy that really mixes.',
      },
      {
        kind: 'text',
        title: 'How solvers play blind vs blind',
        body: [
          'Modern solver strategies mix limps and raises from the small blind. Some strong hands limp too.',
          'Out of position, a limp keeps the pot small with hands that play poorly.',
          'The big blind raises those limps often. It has position, and a limping range holds fewer strong hands.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Heads up game or blind vs blind',
        art: {
          kind: 'tree',
          root: 'Small blind, pot 1.5bb',
          branches: [
            { label: 'Heads up button', value: 'Acts last, opens most hands', tone: 'green' },
            { label: 'Full ring small blind', value: 'Acts first, raises about 42%', tone: 'brass' },
          ],
        },
        caption: 'The pot and the blinds are the same. Position is what changes, and it sets how wide you can play. The 42% comes from Felt’s raise only chart.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the small blind. How much does a limp add to the pot?',
        choices: ['0.5bb', '1bb', '2.5bb'],
        answer: 0,
        explain: 'Like the bars showed, you already posted 0.5bb. A limp makes it 1bb, so it adds 0.5bb. A raise to 3bb adds 2.5bb.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You raise to 3bb from the small blind as a pure bluff. How often must the big blind fold for it to break even?',
        choices: ['50%', '62.5%', '75%'],
        answer: 1,
        explain: 'Like the bars showed, the raise adds 2.5bb to win 1.5bb. 2.5 ÷ 4 = 62.5%.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'The small blind limps and the big blind raises to 4bb. How much equity does the small blind need to call?',
        choices: ['37.5%', '30%', '60%'],
        answer: 0,
        explain: 'Like the formula showed, the small blind calls 3bb to make an 8bb pot. 3 ÷ 8 = 37.5%. The 60% is the fold rate a pure bluff raise needs.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'What do solvers do in the small blind when it folds to them?',
        choices: ['Mix limps and raises', 'Raise every hand they play', 'Limp every hand they play'],
        answer: 0,
        explain: 'Like the solver step said, small blind strategies mix limps and raises. Felt’s chart raises or folds to stay simple.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Why does the full ring small blind play tighter than a heads up button?',
        choices: ['It acts first after the flop', 'The pot is smaller', 'It posts a bigger blind'],
        answer: 0,
        explain: 'Like the tree showed, the pot and the blinds match. Only position changes. Out of position you realize less of your equity.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'The pot is 1.5bb. A limp adds 0.5bb and a raise to 3bb adds 2.5bb.',
          'The big blind raises limps often. A raise to 4bb needs 60% folds as a pure bluff.',
          'The pot matches heads up, but the small blind is out of position. So it plays tighter and mixes in limps.',
        ],
      },
    ],
  },
  {
    key: 'formats/heads-up/hu-postflop',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'UTG open', value: 28.8 },
        { label: 'Button open', value: 20.9 },
        { label: 'Heads up button', value: 16.8, tone: 'brass' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Wide ranges, weak hands',
        body: 'Heads up, both players start with wide ranges. Most flops miss most hands. So one pair is often good and bluff catching matters more.',
      },
      {
        kind: 'visual',
        title: 'An unpaired hand on the flop',
        art: { kind: 'ring', value: 6356 / 19600, label: 'Pairs a hole card', caption: 'Any unpaired hand' },
        caption: 'Of 19,600 possible flops, 6,356 pair at least one of your hole cards. That is **32.4%**. About 2 flops in 3 give you no pair.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Two unpaired hands',
        art: { kind: 'ring', value: 7140 / 17296, label: 'Neither pairs', caption: 'K♠7♦ against Q♥5♣' },
        caption: 'With 4 different ranks between them, the flop pairs neither hand **41.3%** of the time. Then king high or queen high can win.',
        evidence: 'math',
      },
      {
        kind: 'board',
        title: 'A dry king high flop',
        board: 'Ks7d2c',
        caption: 'K♠7♦2♣ has 3 suits and few straight draws. The table below counts how often each range has top pair or better here.',
      },
      {
        kind: 'table',
        title: 'Top pair or better on K♠7♦2♣',
        columns: ['Range', 'Top pair or better', 'Any pair or better'],
        rows: [
          ['UTG open, 9-handed', '28.8%', '57.9%'],
          ['Button open, 9-handed', '20.9%', '40.0%'],
          ['Heads up button', '16.8%', '38.9%'],
        ],
        note: 'Combos are counted after the board cards are removed, with each chart’s mixes as weights. The 9-handed ranges are Felt’s starter charts. The heads up range is an illustration that opens about 78% of hands. Top pair or better counts any king or AA. It also counts two pair and sets.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Top pair or better gets rarer',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'UTG open', value: 28.8 },
            { label: 'Button open', value: 20.9 },
            { label: 'Heads up button', value: 16.8, tone: 'brass' },
          ],
        },
        caption: 'The wider the range, the less often it holds top pair or better. Heads up, about 1 hand in 6 has it on this flop.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Who wins at showdown',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '2 hands', value: 43, tone: 'brass' },
            { label: '9 hands', value: 9.5, tone: 'gray' },
          ],
        },
        caption:
          'Deal random hands and run all 5 cards. With 2 players, the winner holds one pair or less about **43%** of the time. With 9 players it is under 10%. Both are simulated from 300,000 deals.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What changes in your play',
        body: [
          'With wide ranges, weaker made hands are worth a value bet. Second pair bets for value more often than at a full table.',
          'Middle pairs and ace high become bluff catchers. Calling down with them is part of the strategy.',
          'Bets and raises come more often too. Each range holds many hands that cannot stand pressure.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'You hold an unpaired hand. How often does the flop pair at least one of your hole cards?',
        choices: ['About 1 in 3', 'About 1 in 2', 'About 2 in 3'],
        answer: 0,
        explain: 'Like the ring showed, 6,356 of 19,600 flops pair a hole card. That is 32.4%. About 2 flops in 3 give you no pair.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'On this flop, which range holds top pair or better least often?',
        board: 'Ks7d2c',
        choices: ['A heads up button range', 'A 9-handed UTG open', 'A 9-handed button open'],
        answer: 0,
        explain: 'Like the table showed, the heads up range has top pair or better 16.8% of the time. The UTG open has it 28.8% of the time. Wider ranges hold more weak hands.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Two random hands run to showdown. About how often does the winner hold one pair or less?',
        choices: ['About 43%', 'About 10%', 'About 75%'],
        answer: 0,
        explain: 'Like the bars showed, the winner has one pair or less about 43% of the time with 2 hands. With 9 hands it is under 10%.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Heads up, you hold 9♥9♣ on K♠7♦2♣. The button bets small. What role does your hand usually play?',
        cards: '9h9c',
        board: 'Ks7d2c',
        choices: ['A bluff catcher', 'A pure bluff', 'The nuts'],
        answer: 0,
        explain: 'Like the solver step said, wide ranges turn middle pairs into bluff catchers. 99 beats the bluffs and loses to kings and better.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'An unpaired hand pairs a hole card on only 32.4% of flops.',
          'Wider ranges hold top pair or better less often. So one pair wins more pots heads up.',
          'Middle pairs and ace high become bluff catchers. Weaker hands bet for value.',
        ],
      },
    ],
  },
  {
    key: 'formats/heads-up/hu-one-opponent',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'ring', value: 1 / 2, label: 'Folds needed', caption: 'Min raise with any 2 cards' },
    steps: [
      {
        kind: 'intro',
        title: 'Same player, every hand',
        body: 'Heads up, every hand is against the same player. Their leaks show up quickly. So adjusting to them pays off fast.',
      },
      {
        kind: 'visual',
        title: 'Chances to read one player',
        art: {
          kind: 'bars',
          bars: [
            { label: 'Heads up', value: 50, tone: 'brass' },
            { label: '9-handed', value: 11.1, tone: 'gray' },
          ],
        },
        caption:
          'This counts how often per 100 hands you hold the button against one player’s big blind. Heads up it is 50 times. 9-handed it is about 11 times, against the player 2 seats to your left.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'A raise that gives up when called',
        formula: 'EV = F × 1.5 − (1 − F) × 1.5',
        parts: [
          ['F', 'How often the big blind folds'],
          ['1.5', 'The pot you win, and also what you add'],
        ],
        example:
          'Count a min raise as a bluff that gives up when called. At 60% folds it earns 0.6 × 1.5 − 0.4 × 1.5 = **+0.3bb**. At 50% it breaks even. Real hands also win some pots when called, so they do better.',
      },
      {
        kind: 'visual',
        title: 'EV of any 2 cards by fold rate',
        art: {
          kind: 'curve',
          points: [
            [40, -0.3],
            [50, 0],
            [60, 0.3],
            [70, 0.6],
            [80, 0.9],
          ],
          xLabel: 'Big blind folds, %',
          yLabel: 'EV per raise, bb',
          mark: [60, 0.3],
        },
        caption: 'Each extra 10% of folds adds 0.3bb per raise. This counts only the pot won before the flop. So it is a floor for real hands.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Overfolders and callers',
        body: [
          'Many players defend the big blind too little against small raises. Against them, raise more hands from the button.',
          'Others call almost every raise. Against them, raise more hands for value and bluff less.',
          'Check the read against your hands before you lean on it hard.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'visual',
        title: 'Pick the adjustment',
        art: {
          kind: 'tree',
          root: 'Their big blind',
          branches: [
            { label: 'Folds over 50%', value: 'Raise more hands', tone: 'green' },
            { label: 'Calls almost always', value: 'Value raise, bluff less', tone: 'brass' },
          ],
        },
        caption: 'Against a min raise, 50% folds is where any 2 cards break even. Above it, even a raise with no equity wins. Bluffs need folds, so a caller gets value instead.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'You saw 60% folds. How sure is it?',
        columns: ['Chances', 'Typical error', 'Plausible true rate'],
        rows: [
          ['20', '11.0%', '38% to 82%'],
          ['50', '6.9%', '46% to 74%'],
          ['200', '3.5%', '53% to 67%'],
        ],
        note: 'Typical error is √(p × (1 − p) ÷ n) with p = 0.6. The plausible range is about 2 typical errors each way. It assumes each hand is separate and the player never changes.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'Heads up, how many times per 100 hands do you hold the button against the same big blind?',
        choices: ['50', '11', '100'],
        answer: 0,
        explain: 'Like the bars showed, you hold the button every other hand. So that is 50 times per 100 hands. 9-handed it is about 11 times against one player.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'The big blind folds 60% to your min raise. What does a raise that gives up when called earn?',
        choices: ['+0.3bb', '+0.9bb', '−0.3bb'],
        answer: 0,
        explain: 'Like the formula showed, 0.6 × 1.5 − 0.4 × 1.5 = 0.3bb. Real hands do better because they win some pots when called.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Your heads up opponent calls almost every raise. What adjusts best?',
        choices: ['Raise more hands for value and bluff less', 'Raise every hand, since they fold too much', 'Limp every hand'],
        answer: 0,
        explain: 'Like the tree showed, bluffs need folds. A player who calls a lot gives few folds. So your value hands earn more and your bluffs earn less.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'After 50 raises they folded 60%. What could their true fold rate be?',
        choices: ['Anywhere from about 46% to 74%', 'Within 2 points of 60%', 'Exactly 60%'],
        answer: 0,
        explain: 'Like the table showed, the typical error after 50 chances is 6.9%. About 2 typical errors each way gives 46% to 74%.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Heads up, you raise into the same big blind up to 50 times per 100 hands.',
          'A min raise with any 2 cards breaks even at 50% folds. Each 10% more adds 0.3bb.',
          'Against an overfolder raise more hands. Against a caller, value raise more and bluff less.',
          'After 50 chances, a 60% fold rate could truly be anywhere from about 46% to 74%.',
        ],
      },
    ],
  },
];

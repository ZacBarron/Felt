import type { LessonContent } from './types';

/**
 * More multiway postflop: live limped pots, straddled pots and multiway 3bet
 * pots. Fold chances treat players as independent, which the lessons say.
 * Every number is recomputed in thin-spots.test.ts.
 */
export const POSTFLOP_MULTIWAY_MORE_LESSONS: LessonContent[] = [
  {
    key: 'postflop/multiway/limped-postflop',
    level: 'advanced',
    minutes: 5,
    cover: { kind: 'cards', cards: 'KcJd', board: 'Jh9h4c' },
    steps: [
      {
        kind: 'intro',
        title: 'Nobody has a strong range',
        body: 'In a limped pot no one raised. Every player may hold anything. So no one has a range advantage, and the pot is small next to the stacks.',
      },
      {
        kind: 'visual',
        title: 'Five players for 5bb',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BTN', highlight: ['UTG+1', 'LJ', 'SB', 'BB'], note: '5 players, 5bb pot' },
        caption: 'UTG+1 and the LJ limped. You limped the button and both blinds checked. 5 players see the flop for 5bb.',
      },
      {
        kind: 'visual',
        title: 'A half pot bluff into 4 players',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Folds a half pot bluff needs', value: 33.3, tone: 'gray' },
            { label: 'All 4 fold, each 70% of the time', value: 24, tone: 'red' },
            { label: 'All 4 fold, each 80% of the time', value: 41, tone: 'green' },
          ],
        },
        caption: 'Exact math, treating the players as independent. A half pot bluff needs 33.3% folds. Four players who each fold 70% fold together only **24%** of the time.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Bet for value, check your air',
        body: [
          'With 4 players left, someone often has a pair or a draw. Pure bluffs rarely work.',
          'Bet top pair and better for value. Many players call with weaker pairs and draws.',
          'Check most of your air. Bluff only with strong draws that can win when called.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'A deep pot',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 5 },
            { label: 'Behind', bb: 99 },
          ],
        },
        caption: 'The pot is 5bb with 99bb behind, an SPR (stack to pot ratio) of **19.8**. One pair rarely wants to play for the whole stack here.',
        evidence: 'math',
      },
      {
        kind: 'board',
        title: 'Who could hold what',
        board: 'Jh9h4c',
        caption: 'J♥9♥4♣ hits many limped hands. Any of 5 players can hold two pair or a set. Many more hold flush draws and straight draws.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live limped pots',
        body: 'Live limpers often call small bets with any pair and most draws. They fold big bets more often. Bet medium sizes for value, and save big bets for your rare bluffs.',
      },
      {
        kind: 'quiz',
        question: 'You bet half the pot into 4 players in a limped pot. Each folds 70% of the time, independently. How often do all 4 fold?',
        choices: ['24%', '33.3%', '70%'],
        answer: 0,
        explain: '0.7 × 0.7 × 0.7 × 0.7 = 24%. A half pot bluff needs 33.3%, so it loses.',
        point: 0,
        variants: [
          {
            question: 'You bet half the pot into 3 players in a limped pot. Each folds 70% of the time, independently. How often do all 3 fold?',
            choices: ['21%', '34.3%', '49%'],
            answer: 1,
            explain: '0.7 × 0.7 × 0.7 = 34.3%. That is just above the 33.3% a half pot bluff needs.',
          },
          {
            question: 'You bet half the pot into 2 players in a limped pot. Each folds 60% of the time, independently. How often do both fold?',
            choices: ['36%', '60%', '16%'],
            explain: '0.6 × 0.6 = 36%. That clears the 33.3% a half pot bluff needs, but only just.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Five players limp to the flop with 100bb stacks. The pot is 5bb. What is the SPR?',
        choices: ['About 5', 'About 20', 'About 50'],
        answer: 1,
        explain: 'The pot is 5bb with 99bb behind. 99 ÷ 5 = 19.8. One pair is rarely worth a stack here.',
        point: 1,
        variants: [
          {
            question: 'Four players limp to the flop with 100bb stacks. The pot is 4bb. What is the SPR?',
            choices: ['About 5', 'About 25', 'About 50'],
            explain: 'The pot is 4bb with 99bb behind. 99 ÷ 4 = 24.8. One pair is rarely worth a stack here.',
          },
          {
            question: 'Three players limp to the flop with 200bb stacks. The pot is 3bb. What is the SPR?',
            choices: ['About 20', 'About 66', 'About 100'],
            explain: 'The pot is 3bb with 199bb behind. 199 ÷ 3 = 66.3. Only very strong hands want a stack in a pot this small.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Five players see J♥9♥4♣ in a limped pot. It checks to you. Which hand is the best bet?',
        board: 'Jh9h4c',
        choiceCards: ['KcJd', '6s5s', 'Ad2c'],
        choices: ['K♣J♦', '6♠5♠', 'A♦2♣'],
        answer: 0,
        explain: 'KJ has top pair with a good kicker and gets called by worse. 65s and A2o have little equity, so betting them into 4 players rarely works.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            question: 'Five players see Q♠8♦3♣ in a limped pot. It checks to you. Which hand is the best bet?',
            board: 'Qs8d3c',
            choiceCards: ['7h6h', 'AdQc', 'Kc2d'],
            choices: ['7♥6♥', 'A♦Q♣', 'K♣2♦'],
            answer: 1,
            explain: 'AQ has top pair with the best kicker and gets called by worse. 76s and K2o have little equity, so betting them into 4 players rarely works.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'A bluff into 4 players needs all of them to fold. At 70% each that is only 24%.',
          'Limped pots are deep. An SPR near 20 means one pair is rarely worth a stack.',
          'Bet top pair and better for value. Check most of your air.',
        ],
      },
    ],
  },
  {
    key: 'postflop/multiway/straddled-postflop',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'AsKh', board: 'Kd8c4s' },
    steps: [
      {
        kind: 'intro',
        title: 'Big pots, short stacks',
        body: 'Straddled pots start bigger and often go multiway. The SPR on the flop is low. One strong pair can be worth a stack.',
      },
      {
        kind: 'visual',
        title: 'Three players in a straddled pot',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'HJ', highlight: ['BTN', 'UTG'], note: 'Straddle 2bb, HJ opens 6bb' },
        caption: 'You opened the HJ to 6bb in a straddled pot. The button and the straddle called. Three players see the flop.',
      },
      {
        kind: 'visual',
        title: 'Flop SPR at 100bb',
        art: {
          kind: 'bars',
          bars: [
            { label: '2.5bb open, 1 caller', value: 17.7, tone: 'gray' },
            { label: '6bb open, 2 callers', value: 4.8, tone: 'brass' },
            { label: '6bb open, 3 callers', value: 3.7, tone: 'red' },
          ],
        },
        caption: 'The first bar is a normal game with the big blind calling. The others are straddled pots where the straddle is one of the callers. Every caller makes the SPR (stack to pot ratio) lower.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What a low SPR changes',
        body: [
          'At an SPR near 4, top pair with a good kicker is often worth a stack. Even multiway it is ahead of many hands.',
          'Draws get good prices, but they face hands that will not fold.',
          'So bet strong hands for value and protection. Bluff less, since more players must fold.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Worth a stack here',
        cards: 'AsKh',
        board: 'Kd8c4s',
        caption: 'A♠K♥ on K♦8♣4♠ is top pair with the best kicker. At an SPR of 4.8 it is usually happy to get all in against 2 players.',
      },
      {
        kind: 'board',
        title: 'A board to slow down on',
        board: 'Th9h7c',
        caption: 'On T♥9♥7♣ three ranges hold many straights, two pairs and draws. Top pair is worth much less here. Bet it, but be ready to fold to big raises.',
      },
      {
        kind: 'formula',
        title: 'Three bets get it in',
        formula: '((1 + 2 × 4.8)^(1/3) − 1) ÷ 2 = 60%',
        parts: [
          ['Flop SPR', '94 ÷ 19.5 = 4.8'],
          ['Streets left', '3'],
        ],
        example: 'Three bets of about **60%** of the pot get 94bb in from a 19.5bb pot. You rarely need overbets in straddled pots.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live straddled pots',
        body: 'Live players call down light in big pots. Value bet top pair more thinly in straddled pots. Cut your multiway bluffs.',
      },
      {
        kind: 'quiz',
        question: 'In a straddled pot you open 6bb. Two players call, including the straddle. Stacks are 100bb. What is the flop SPR?',
        choices: ['About 2', 'About 4.8', 'About 10'],
        answer: 1,
        explain: 'The pot is 6 + 6 + 6 + 0.5 + 1 = 19.5bb with 94bb behind. 94 ÷ 19.5 = 4.8.',
        point: 0,
        variants: [
          {
            question: 'In a straddled pot you open 6bb. Three players call, including the straddle. Stacks are 100bb. What is the flop SPR?',
            choices: ['About 3.7', 'About 6', 'About 10'],
            answer: 0,
            explain: 'The pot is 4 × 6 + 0.5 + 1 = 25.5bb with 94bb behind. 94 ÷ 25.5 = 3.7.',
          },
          {
            question: 'In a straddled pot you open 8bb. Two players call, including the straddle. Stacks are 100bb. What is the flop SPR?',
            choices: ['About 2', 'About 3.6', 'About 10'],
            explain: 'The pot is 8 + 8 + 8 + 0.5 + 1 = 25.5bb with 92bb behind. 92 ÷ 25.5 = 3.6.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Three players see K♦8♣4♠ in a straddled pot with an SPR near 5. You hold A♠K♥. What is the usual plan?',
        cards: 'AsKh',
        board: 'Kd8c4s',
        choices: ['Bet for value and plan to get all in', 'Check and fold to a bet', 'Bet once and give up'],
        answer: 0,
        explain: 'At an SPR near 5, top pair with the best kicker is worth a stack against most multiway ranges. Bet for value and protection.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'Three players see Q♣7♦3♥ in a straddled pot with an SPR near 5. You hold A♥Q♦. What is the usual plan?',
            cards: 'AhQd',
            board: 'Qc7d3h',
            explain: 'At an SPR near 5, top pair with the best kicker is worth a stack against most multiway ranges. Bet for value and protection.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The flop pot is 19.5bb with 94bb behind. About what pot fraction on 3 streets gets it all in?',
        choices: ['About 33%', 'About 60%', 'About 120%'],
        answer: 1,
        explain: 'The SPR is 4.8. A bet of about 60% of the pot on the flop, turn and river gets it all in.',
        point: 2,
        variants: [
          {
            question: 'The flop pot is 25.5bb with 94bb behind. About what pot fraction on 3 streets gets it all in?',
            choices: ['About 33%', 'About 52%', 'About 100%'],
            explain: 'The SPR is 3.7. A bet of about 52% of the pot on each street gets it all in.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'Straddled pots play shallow. A 6bb open with 2 callers leaves an SPR near 4.8.',
          'At that SPR, top pair with a good kicker is often worth a stack.',
          'Bets of about 60% of the pot on 3 streets get it all in. Overbets are rarely needed.',
        ],
      },
    ],
  },
  {
    key: 'postflop/multiway/multiway-3bp',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Pot', bb: 39.5 },
        { label: 'Behind', bb: 87 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'A squeeze got 2 callers',
        body: 'Sometimes a squeeze gets called by both players. Now 3 players see a flop with a big pot and short stacks. Plans get simple fast.',
      },
      {
        kind: 'visual',
        title: 'The pot on the flop',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 39.5 },
            { label: 'Behind', bb: 87 },
          ],
        },
        caption: 'The cutoff opened, the button called and the big blind squeezed to 13bb. Both called. The pot is **39.5bb** with **87bb** behind, an SPR of 2.2.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'You act first against 2',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['CO', 'BTN'], note: '3 players, SPR 2.2' },
        caption: 'You squeezed from the big blind. You act first against 2 players with capped ranges.',
      },
      {
        kind: 'text',
        title: 'Who holds what',
        body: [
          'The squeezer holds big pairs and big aces. Both callers are capped, since they did not 4bet.',
          'The callers hold medium pairs and suited hands. Those hit low and middle boards.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'A third pot bluff into 2 players',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Folds the bet needs', value: 24.8, tone: 'gray' },
            { label: 'Both fold, each 50% of the time', value: 25, tone: 'brass' },
            { label: 'Both fold, each 40% of the time', value: 16, tone: 'red' },
          ],
        },
        caption: 'Exact math, treating the 2 players as independent. A 13bb bet into 39.5bb needs **24.8%** folds. Two players who each fold half the time fold together 25%.',
        evidence: 'math',
      },
      {
        kind: 'board',
        title: 'Bet this flop',
        board: 'As8d3c',
        caption: 'A♠8♦3♣ hits the squeezer’s big aces. The callers hold few strong aces. Bet small and often.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'Check this flop',
        board: '8h7h5c',
        caption: '8♥7♥5♣ hits the callers’ pairs and suited connectors. Check most hands. Your overpairs can still get all in at this SPR.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live squeeze callers',
        body: 'Live players call squeezes with hands like KQo and small pairs. Bet your top pairs for value. They will often call with worse.',
      },
      {
        kind: 'quiz',
        question: 'A squeeze to 13bb gets 2 callers. The small blind’s 0.5bb is dead and stacks are 100bb. What is the flop SPR?',
        choices: ['About 2.2', 'About 4', 'About 6'],
        answer: 0,
        explain: 'The pot is 13 + 13 + 13 + 0.5 = 39.5bb with 87bb behind. 87 ÷ 39.5 = 2.2.',
        point: 0,
        variants: [
          {
            question: 'A small blind squeeze to 12bb gets 2 callers. The big blind’s 1bb is dead and stacks are 100bb. What is the flop SPR?',
            choices: ['About 2.4', 'About 4', 'About 6'],
            explain: 'The pot is 12 + 12 + 12 + 1 = 37bb with 88bb behind. 88 ÷ 37 = 2.4.',
          },
          {
            question: 'A squeeze to 13bb gets 2 callers. The small blind’s 0.5bb is dead and stacks are 200bb. What is the flop SPR?',
            choices: ['About 2.2', 'About 4.7', 'About 9'],
            answer: 1,
            explain: 'The pot is 39.5bb with 187bb behind. 187 ÷ 39.5 = 4.7. Deep stacks give the callers more room.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You bet 13bb into 39.5bb against 2 players. Each folds 40% of the time, independently. Does a pure bluff profit?',
        choices: ['No. Both fold only 16% and it needs 24.8%', 'Yes. Each folds often enough', 'It breaks even exactly'],
        answer: 0,
        explain: '0.4 × 0.4 = 16%. The bet needs 13 ÷ 52.5 = 24.8% folds. So the bluff loses.',
        point: 1,
        variants: [
          {
            question: 'You bet 13bb into 39.5bb against 2 players. Each folds 60% of the time, independently. Does a pure bluff profit?',
            choices: ['No. Both fold only 16%', 'Yes. Both fold 36% and it needs 24.8%', 'It breaks even exactly'],
            answer: 1,
            explain: '0.6 × 0.6 = 36%. The bet needs 13 ÷ 52.5 = 24.8% folds. So the bluff profits.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You squeezed and got 2 callers. Which flop do you bet most often?',
        choiceCards: ['As8d3c', '8h7h5c', '9s8s6d'],
        choices: ['A♠8♦3♣', '8♥7♥5♣', '9♠8♠6♦'],
        answer: 0,
        explain: 'An ace high board hits your big aces and pairs. The low connected boards hit the callers’ pairs and suited connectors.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['7d6d4s', 'Kh9c2d', '6c5c3h'],
            choices: ['7♦6♦4♠', 'K♥9♣2♦', '6♣5♣3♥'],
            answer: 1,
            explain: 'A king high board hits your big pairs and AK. The low connected boards hit the callers’ pairs and suited connectors.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'A squeeze to 13bb called by 2 players leaves an SPR of about 2.2.',
          'A bluff into 2 players needs both to fold. At 40% each that is only 16%.',
          'Bet high boards that hit your big pairs and aces. Check boards that hit the callers.',
        ],
      },
    ],
  },
];

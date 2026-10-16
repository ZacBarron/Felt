import type { LessonContent } from './types';

/**
 * Playing for money: stakes and buy ins, a first visit to a card room, and a
 * first bankroll. Practical knowledge for someone who has never played for
 * money. Every conversion and count is exact and checked by the content tests.
 * Buy in limits and rake rules are labelled as examples, the buy in range as a
 * rule of thumb, and risk numbers as a model that agrees with
 * mindset/mental/variance and mindset/mental/bankroll.
 */
export const BASICS_MONEY_LESSONS: LessonContent[] = [
  {
    key: 'basics/money/stakes',
    level: 'core',
    minutes: 5,
    cover: {
      kind: 'tree',
      root: '1/3',
      branches: [
        { label: 'Small blind', value: '$1', tone: 'gray' },
        { label: 'Big blind', value: '$3', tone: 'brass' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'How stakes work',
        body: 'Every cash game has a name like 1/3. The name tells you the **stakes**, or how big the game is. Learn to read it and you can pick a game that fits you.',
      },
      {
        kind: 'visual',
        title: 'What 1/3 means',
        art: {
          kind: 'tree',
          root: 'A 1/3 game',
          branches: [
            { label: 'Small blind', value: '$1', tone: 'gray' },
            { label: 'Big blind', value: '$3', tone: 'brass' },
          ],
        },
        caption:
          'Stakes are named by the blinds. The first number is the small blind. The second is the big blind. So 1/3 means a $1 small blind and a $3 big blind. You will also see it written $1/$3.',
      },
      {
        kind: 'visual',
        title: 'One stack, three games',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: '$300 at 1/2', value: 150, tone: 'green' },
            { label: '$300 at 1/3', value: 100, tone: 'brass' },
            { label: '$300 at 2/5', value: 60, tone: 'red' },
          ],
        },
        caption:
          'Suited counts in big blinds, written bb. Divide money by the big blind to get bb. $300 is 150bb at 1/2. It is 100bb at 1/3 and 60bb at 2/5.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'From bb back to money',
        formula: 'Money = bb × big blind',
        parts: [
          ['bb', 'the amount in big blinds'],
          ['big blind', 'in money, like $3 at 1/3'],
        ],
        example: 'A 12bb bet at 1/3 is 12 × $3 = **$36**. At 1/2 the same 12bb is 12 × $2 = **$24**.',
      },
      {
        kind: 'text',
        title: 'Buying in',
        body: [
          'To join a cash game you swap money for chips. That amount is your **buy in**.',
          'Each room sets a **minimum buy in** and a **maximum buy in** for each game. Your buy in must fall between them. The limits vary by room.',
          'Your stack in big blinds is how deep you are. Suited’s starter charts assume you are 100bb deep.',
        ],
      },
      {
        kind: 'visual',
        title: 'An example buy in',
        art: {
          kind: 'tree',
          root: 'Example 1/3 game',
          branches: [
            { label: 'Minimum buy in', value: '$100, about 33bb', tone: 'gray' },
            { label: 'Maximum buy in', value: '$300, which is 100bb', tone: 'brass' },
          ],
        },
        caption: 'This is an example, not a rule. Each room sets its own limits. In this game a full $300 buy in makes you 100bb deep.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Cash game or tournament',
        art: {
          kind: 'tree',
          root: 'Two ways to play',
          branches: [
            { label: 'Cash game', value: 'Chips are money. Leave when you like', tone: 'green' },
            { label: 'Tournament', value: 'Fixed entry. Play until you bust or win', tone: 'brass' },
          ],
        },
        caption: 'The two formats work in different ways. Suited teaches cash games first. Tournaments get their own track.',
      },
      {
        kind: 'text',
        title: 'What the chips mean',
        body: [
          'In a **cash game** your chips are real money. A $5 chip is worth $5. You can cash out between hands and go home.',
          'In a **tournament** everyone pays the same entry, also called the buy in. Each player gets a stack of tournament chips. Those chips are not money.',
          'The blinds go up over time. You play until you lose all your chips or the tournament ends. Only the last players left win prize money.',
        ],
      },
      {
        kind: 'table',
        title: 'Reading Suited’s game list',
        columns: ['Words', 'What they mean'],
        rows: [
          ['Live cash', 'A cash game in person at a card room'],
          ['1/2 or 1/3', 'Blinds of $1/$2 or $1/$3'],
          ['9-handed', '9 players at the table'],
          ['Online cash', 'A cash game on a poker site or app'],
          ['6-max', 'A table of at most 6 players'],
          ['100bb', 'Stacks of about 100 big blinds'],
          ['Tournaments', 'A fixed entry for a share of the prizes'],
        ],
        note: 'Live means in person. Online means on a poker site or app.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Start small',
        body: 'The rules are the same at every stake. Only the money changes. So start at a small game and move up later.',
      },
      {
        kind: 'quiz',
        question: 'In a 1/3 game, how big is the big blind?',
        choices: ['$1', '$3', '$4'],
        answer: 1,
        explain: 'Like the 1/3 picture showed, the second number is the big blind. The first is the small blind. The $4 answer adds the 2 blinds together.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'At 2/5 someone bets 12bb. How much money is that?',
        choices: ['$24', '$60', '$12'],
        answer: 1,
        explain: 'Like the formula showed, multiply bb by the big blind. 12 × $5 is $60. The $24 answer uses the $2 small blind.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Which is true of tournament chips?',
        choices: ['You can cash them out between hands', 'They are not money. The last players left win the prizes.', 'Each chip is worth $1'],
        answer: 1,
        explain: 'Like the lesson said, tournament chips are not money. Only the last players left win prizes. You can cash out chips only in a cash game.',
        point: 3,
      },
      {
        kind: 'quiz',
        question: 'You buy in for $300 at 1/3. How deep are you?',
        choices: ['300bb', '150bb', '100bb'],
        answer: 2,
        explain: 'Like the bars showed, divide $300 by the $3 big blind to get 100bb. The 300bb answer divides by the $1 small blind. The 150bb answer would be right at 1/2.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'A room’s 1/3 game has a $100 minimum and a $300 maximum buy in. Which buy in can you make?',
        choices: ['$50', '$200', '$500'],
        answer: 1,
        explain: 'Like the example showed, your buy in must fall between the minimum and the maximum. $200 does. $50 is too little and $500 is too much.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          '1/3 means a $1 small blind and a $3 big blind.',
          'Divide money by the big blind to get bb. Multiply to go back.',
          'Rooms set a minimum and maximum buy in. The limits vary by room.',
          'Cash game chips are money. Tournament chips are not.',
        ],
      },
    ],
  },
  {
    key: 'basics/money/card-room',
    level: 'core',
    minutes: 5,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'HJ', note: 'A dealer runs the game' },
    steps: [
      {
        kind: 'intro',
        title: 'Your first time at a card room',
        body: 'A **card room** is a place that runs poker games. It may be part of a casino. The first visit can feel busy. The steps are simple, and this lesson walks through them.',
      },
      {
        kind: 'visual',
        title: 'From the door to your seat',
        art: {
          kind: 'tree',
          root: 'Your first visit',
          branches: [
            { label: '1. Get on the list', value: 'Ask for a seat in your game', tone: 'gray' },
            { label: '2. Buy chips', value: 'Swap money for chips', tone: 'brass' },
            { label: '3. Take your seat', value: 'The dealer deals you in', tone: 'green' },
            { label: '4. Cash out', value: 'Swap chips back for money', tone: 'gray' },
          ],
        },
        caption: 'Most visits follow these 4 steps. The details vary by room. Staff are there to help, so ask when unsure.',
      },
      {
        kind: 'text',
        title: 'Getting a seat',
        body: [
          'Find the poker desk or the board that lists the games. Tell the staff which game you want, like 1/3 No Limit.',
          'They add your name to a **list** for that game. When a seat opens they call your name. Some rooms also take names by phone or app.',
        ],
      },
      {
        kind: 'visual',
        title: 'Buying chips',
        art: {
          kind: 'tree',
          root: 'Where chips change hands',
          branches: [
            { label: 'The cage', value: 'The room’s cashier', tone: 'brass' },
            { label: 'Your table', value: 'Many rooms sell chips there', tone: 'brass' },
            { label: 'When you leave', value: 'Cash out at the cage', tone: 'green' },
          ],
        },
        caption: 'Your buy in must fall between the room’s minimum and maximum. Check the limits for your game before you buy.',
      },
      {
        kind: 'visual',
        title: 'The dealer runs the game',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'HJ', note: 'A dealer runs the game' },
        caption:
          'In a card room the players do not deal. A **dealer** who works for the room shuffles and deals every hand. The dealer moves bets into the pot and pushes the pot to the winner. The button still moves 1 seat each hand. It marks who acts last.',
      },
      {
        kind: 'visual',
        title: 'Say your action',
        art: {
          kind: 'tree',
          root: 'On your turn',
          branches: [
            { label: 'Check', value: 'Say “check” or tap the table', tone: 'gray' },
            { label: 'Call', value: 'Say “call” and put in the chips', tone: 'green' },
            { label: 'Raise', value: 'Say “raise to 15” and put in 15', tone: 'brass' },
            { label: 'Fold', value: 'Slide your cards face down to the dealer', tone: 'red' },
          ],
        },
        caption: 'Wait until it is your turn. Then say your action out loud. Clear words stop mix ups. In most rooms what you say on your turn is binding.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Keep your cards on the table',
        body: 'Look at your cards without lifting them off the table. Keep them in view until you fold or the hand ends. A chip or your hand on top protects them.',
      },
      {
        kind: 'visual',
        title: 'Rake is the room’s share',
        art: { kind: 'ring', value: 0.9, label: '$54 of $60', caption: 'goes to the winner' },
        caption:
          '**Rake** is the fee the room takes from a pot before the winner is paid. This example uses a rule of 10% up to $5, plus $1 for a jackpot. 10% of $60 is $6, so the cap holds it to $5. Add the $1 and the winner gets $54.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How rooms charge',
        body: [
          'Each room sets its own rake. Most take a share of the pot up to a cap.',
          'In most rooms a pot that ends before the flop pays nothing. Some rooms charge a fee each half hour instead. Online sites take rake too.',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Ask the dealer',
        body: 'House rules vary from room to room. Tell the dealer it is your first time. Rules for your first hand vary too. Some rooms ask a new player to post a big blind or wait for it.',
      },
      {
        kind: 'quiz',
        question: 'Every 1/3 seat is full when you arrive. What do you do?',
        choices: ['Put your name on the list for 1/3', 'Stand behind a player until they leave', 'Sit down at a bigger game instead'],
        answer: 0,
        explain: 'Like the lesson showed, the list is how rooms hand out seats. When a 1/3 seat opens, the staff call your name.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Who deals the cards in a card room?',
        choices: ['The player on the button', 'A dealer who works for the room', 'The players take turns'],
        answer: 1,
        explain: 'Like the table picture showed, the room’s dealer deals every hand and runs the pot. The button only marks who acts last.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'What is rake?',
        choices: ['A tip you give the dealer', 'The room’s fee, taken from the pot', 'A forced bet before the cards come'],
        answer: 1,
        explain: 'Like the rake picture showed, rake comes out of the pot before the winner is paid. A tip is separate. The forced bets before the cards are the blinds.',
        point: 3,
      },
      {
        kind: 'quiz',
        question: 'An example room takes 10% of the pot up to $5, plus $1. How much rake does a $30 pot pay?',
        choices: ['$3', '$4', '$6'],
        answer: 1,
        explain: 'Work it like the $60 pot. 10% of $30 is $3, which is under the $5 cap. Add the $1 to get $4. The $6 answer is the most any pot pays.',
        point: 3,
      },
      {
        kind: 'quiz',
        question: 'It is your turn and you want to call. What should you do?',
        choices: ['Say “call” and put in the chips', 'Lift your cards to show you are still in', 'Put in chips before the player on your right acts'],
        answer: 0,
        explain: 'Like the picture of your options showed, wait for your turn and say your action. Keep your cards on the table. Acting early can hurt the players before you.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Get on the list for your game. Then buy chips.',
          'A dealer from the room deals and runs every pot.',
          'Act in turn and say your action out loud.',
          'Rake is the room’s fee from each pot. It varies by room.',
        ],
      },
    ],
  },
  {
    key: 'basics/money/bankroll-start',
    level: 'core',
    minutes: 5,
    cover: { kind: 'ring', value: 0.05, label: 'of the roll per buy in', caption: '20 buy ins' },
    steps: [
      {
        kind: 'intro',
        title: 'Money set aside for poker',
        body: 'Playing for money means some nights you lose. Good players lose nights too. A little planning keeps those nights from hurting you.',
      },
      {
        kind: 'text',
        title: 'Your bankroll',
        body: [
          'Your **bankroll** is money set aside only for poker. It must be money you can afford to lose.',
          'Rent and bills are never part of it. Neither are your savings.',
          'Count your bankroll in buy ins at your stake. That shows how many lost buy ins it can take.',
        ],
      },
      {
        kind: 'visual',
        title: 'One roll, three games',
        art: {
          kind: 'bars',
          bars: [
            { label: '1/2, $200 buy in', value: 30, tone: 'green' },
            { label: '1/3, $300 buy in', value: 20, tone: 'brass' },
            { label: '2/5, $500 buy in', value: 12, tone: 'red' },
          ],
        },
        caption: 'Take a $6,000 bankroll. It is 30 buy ins at 1/2 and 20 at 1/3. At 2/5 it is only 12. Each buy in here is 100bb.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'One buy in is a small share',
        art: { kind: 'ring', value: 0.05, label: 'of the roll per buy in', caption: '20 buy ins' },
        caption: 'With 20 buy ins, losing one costs 5% of your roll. That hurts but it does not end your game. If one buy in is a big share of your roll, the stakes are too high.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'A rule of thumb',
        body: 'A common rule of thumb for live cash is **20 to 40 buy ins** for your stake. It is a guideline, not a law. Lean toward 40 while your results are unproven.',
      },
      {
        kind: 'visual',
        title: 'More buy ins, less risk',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '5 buy ins', value: 36.8, tone: 'red' },
            { label: '10 buy ins', value: 13.5, tone: 'brass' },
            { label: '20 buy ins', value: 1.8, tone: 'green' },
          ],
        },
        caption:
          'This is a model of a winning player. It shows the chance of ever losing the whole roll. It assumes a true win rate of 10bb per 100 hands. It also assumes swings of 100bb per 100 hands. A player who is not yet winning has no safe roll size.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Winners lose for weeks',
        art: { kind: 'ring', value: 0.159, label: 'chance to be behind', caption: 'after 10,000 hands' },
        caption:
          'Same model. A winner plays 10,000 hands, about 333 hours at 30 hands an hour. At 10 hours a week that is about 33 weeks. They still end it behind 15.9% of the time.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Pick stakes, then protect them',
        body: [
          'Choose a game where one buy in is a small share of your roll. If a loss would touch money you need, move down.',
          'Moving down after losses is part of the plan. It is not a failure.',
        ],
      },
      {
        kind: 'visual',
        title: 'Know when to stop',
        art: {
          kind: 'tree',
          root: 'Check in with yourself',
          branches: [
            { label: 'Tired', value: 'Stop for the day', tone: 'red' },
            { label: 'Upset after a loss', value: 'Take a break or stop', tone: 'red' },
            { label: 'At your loss limit', value: 'Stop for the day', tone: 'red' },
            { label: 'Calm and focused', value: 'Keep playing', tone: 'green' },
          ],
        },
        caption: 'Tired or upset players make worse decisions. Any drop from your best play is called **tilt**. Set a loss limit for the day before you sit down. Stop when you reach it.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'More in Mental game',
        body: 'The Mental game and bankroll track goes deeper. It covers swings and risk. It also covers when to move up.',
      },
      {
        kind: 'quiz',
        question: 'Which money belongs in your bankroll?',
        choices: ['Next month’s rent', 'Money set aside for poker that you can afford to lose', 'Your emergency savings'],
        answer: 1,
        explain: 'Like the lesson said, a bankroll is only money you can afford to lose. Rent and savings are money you need. They are never part of it.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Your bankroll is $4,000. You play 1/2 with $200 buy ins. How many buy ins do you have?',
        choices: ['20', '40', '2,000'],
        answer: 0,
        explain: 'Like the bars showed, divide your roll by one buy in. $4,000 ÷ $200 is 20 buy ins. The 2,000 answer is your roll in big blinds. The 40 answer uses a $100 buy in.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Say you are a winning player. Then you lose 3 buy ins in a week. What does that week tell you?',
        choices: ['Very little. Winners have losing weeks.', 'You are now a losing player', 'Move up to win it back faster'],
        answer: 0,
        explain: 'Like the model showed, a winner still ends 10,000 hands behind 15.9% of the time. A week is far shorter. Judge your decisions, not one week.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'You are tired and down for the night. What is the best move?',
        choices: ['Play on until you are even', 'Move up to get even faster', 'Stop for the day'],
        answer: 2,
        explain: 'Like the check in picture showed, tired players make worse decisions. Playing on to get even is a common form of tilt. The game will still be there tomorrow.',
        point: 3,
      },
      {
        kind: 'quiz',
        question: 'Your roll is $6,000. Which game fits the rule of thumb of 20 to 40 buy ins?',
        choices: ['1/2 with $200 buy ins', '2/5 with $500 buy ins', '5/10 with $1,000 buy ins'],
        answer: 0,
        explain: 'Like the bars showed, $6,000 is 30 buy ins of $200. That is inside 20 to 40. At 2/5 it is only 12 buy ins. At 5/10 it is only 6.',
        point: 1,
      },
      {
        kind: 'takeaway',
        points: [
          'A bankroll is money only for poker that you can afford to lose.',
          'Count it in buy ins. A common rule of thumb is 20 to 40.',
          'Even winners lose for weeks. Judge decisions, not results.',
          'Stop when you are tired or upset. Stop at your loss limit too.',
        ],
      },
    ],
  },
];

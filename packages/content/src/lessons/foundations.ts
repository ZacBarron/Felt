import type { LessonContent } from './types';

export const FOUNDATIONS_LESSONS: LessonContent[] = [
  {
    key: 'foundations/math/pot-odds',
    level: 'core',
    minutes: 5,
    cover: { kind: 'ring', value: 0.25, label: 'Equity to call', caption: 'Half pot bet' },
    steps: [
      {
        kind: 'intro',
        title: 'Every call has a price',
        body: 'Pot odds turn a bet into a number. It is the share of the final pot you must win for a call to break even.',
      },
      {
        kind: 'formula',
        title: 'The price of a call',
        formula: 'Equity needed = call ÷ final pot',
        parts: [
          ['Call', 'What you put in now'],
          ['Final pot', 'Everything in the middle after you call'],
        ],
        example: 'The pot is 100 chips and villain bets 50. You call 50 to make a final pot of 200. You need 50 ÷ 200 = **25%**.',
      },
      {
        kind: 'visual',
        title: 'The pot after you call',
        art: {
          kind: 'bars',
          bars: [
            { label: 'Pot before the bet', value: 100, tone: 'gray' },
            { label: 'Villain’s bet', value: 50, tone: 'red' },
            { label: 'Your call', value: 50, tone: 'brass' },
          ],
        },
        caption: 'The final pot is 100 + 50 + 50 = 200 chips. Your call is 50 of them. So you must win **25%** of the time to break even.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Learn these by heart',
        columns: ['Bet size', 'Equity to call'],
        rows: [
          ['1/4 pot', '16.7%'],
          ['1/3 pot', '20.0%'],
          ['1/2 pot', '25.0%'],
          ['2/3 pot', '28.6%'],
          ['3/4 pot', '30.0%'],
          ['Pot', '33.3%'],
          ['2x pot', '40.0%'],
        ],
        note: 'The equity you need rises with bet size. It never reaches 50%.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Bigger bets, worse prices',
        art: {
          kind: 'curve',
          points: [
            [0, 0],
            [0.125, 10],
            [0.25, 16.7],
            [0.375, 21.4],
            [0.5, 25],
            [0.75, 30],
            [1, 33.3],
            [1.25, 35.7],
            [1.5, 37.5],
            [1.75, 38.9],
            [2, 40],
          ],
          xLabel: 'Bet size, in pots',
          yLabel: 'Equity to call, %',
          mark: [0.5, 25],
        },
        caption: 'The price climbs fast for small bets, then flattens out. A half pot bet asks for **25%**. Even twice the pot asks for only 40%.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Put a number on your hand',
        cards: 'AhKh',
        board: 'Qh7h2c9s',
        caption: 'Count only the 9 hearts as outs. With 46 unseen cards, you hit on the river **19.6%** of the time.',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Compare against realized equity',
        body:
          'Pot odds are exact, but you only collect the equity you realize. Out of position you realize less. So does a hand that often folds to a later bet. Both need a better price than the table shows.',
      },
      {
        kind: 'quiz',
        question: 'Villain bets 75 into a pot of 100. What equity do you need to call?',
        choices: ['30.0%', '37.5%', '42.9%', '25.0%'],
        answer: 0,
        explain: 'Use the formula. You call 75 to make a final pot of 250, and 75 ÷ 250 = 30.0%. The 42.9% answer is 75 ÷ 175, which leaves out your own call.',
        point: 0,
        variants: [
          {
            question: 'Villain bets 50 into a pot of 100. What equity do you need to call?',
            choices: ['33.3%', '25.0%', '20.0%', '50.0%'],
            answer: 1,
            explain: 'Use the formula. You call 50 to make a final pot of 200, and 50 ÷ 200 = 25.0%. The 33.3% answer is 50 ÷ 150, which leaves out your own call.',
          },
          {
            question: 'Villain bets 100 into a pot of 100. What equity do you need to call?',
            choices: ['25.0%', '40.0%', '50.0%', '33.3%'],
            answer: 3,
            explain: 'Use the formula. You call 100 to make a final pot of 300, and 100 ÷ 300 = 33.3%. The 50.0% answer is 100 ÷ 200, which leaves out your own call.',
          },
          {
            question: 'Villain bets 30 into a pot of 90. What equity do you need to call?',
            choices: ['16.7%', '25.0%', '20.0%', '33.3%'],
            answer: 2,
            explain: 'Use the formula. You call 30 to make a final pot of 150, and 30 ÷ 150 = 20.0%. The 25.0% answer is 30 ÷ 120, which leaves out your own call.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Your flush draw has 19.6% equity on the turn. Villain bets half pot. Is a call profitable on pot odds alone?',
        choices: ['Yes, by about 5 points', 'It breaks even exactly', 'No, it is about 5 points short'],
        answer: 2,
        explain:
          'Like the table showed, a half pot bet needs 25.0%. You have 19.6%, so you are 5.4 points short. The call only works if you win extra later when you hit.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You are out of position with a hand that often folds to later bets. How should you use the price from the table?',
        choices: ['Ask for more equity than the table shows', 'Use the table exactly as it is', 'Ask for less equity than the table shows'],
        answer: 0,
        explain: 'Like the theory note said, you only collect the equity you realize. Out of position you realize less. So you need more raw equity than the table asks for.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Equity needed = call ÷ final pot.',
          'Half pot needs 25.0%. Pot needs 33.3%. Twice pot needs 40.0%.',
          'Out of position you realize less equity. So you need a better price than the table shows.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/ev',
    level: 'core',
    minutes: 6,
    cover: {
      kind: 'tree',
      root: 'Call 50 to win 150',
      branches: [
        { label: 'Win, 30%', value: '+150', tone: 'green' },
        { label: 'Lose, 70%', value: '−50', tone: 'red' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'The only number that matters',
        body: 'Expected value (EV) is the average result of a decision over every way the hand can go. Folding is worth zero. Every other action is measured against it.',
      },
      {
        kind: 'formula',
        title: 'EV of a call',
        formula: 'EV(call) = equity × final pot − call',
        example: 'Villain bets 50 into 100 and you have 30% equity. 0.30 × 200 − 50 = **+10**. The call profits even though you lose most of the time.',
      },
      {
        kind: 'visual',
        title: 'A call, branch by branch',
        art: {
          kind: 'tree',
          root: 'Call 50 to win 150',
          branches: [
            { label: 'You win, 30%', value: '+150', tone: 'green' },
            { label: 'You lose, 70%', value: '−50', tone: 'red' },
          ],
        },
        caption: 'When you win, you collect the 100 pot and villain’s 50. When you lose, you lose your 50. 0.3 × 150 − 0.7 × 50 = **+10**.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'EV of a bet',
        formula: 'EV(bet) = fold% × pot + call% × (equity × (pot + 2 × bet) − bet)',
        example:
          'You bet 50 into 100. Villain folds 40% of the time. When called you have 30% equity. 0.4 × 100 + 0.6 × (0.3 × 200 − 50) = 40 + 6 = **+46**. This ignores raises, which only lower it.',
      },
      {
        kind: 'visual',
        title: 'A bet, branch by branch',
        art: {
          kind: 'tree',
          root: 'Bet 50 into 100',
          branches: [
            { label: 'Villain folds, 40%', value: '+100', tone: 'green' },
            { label: 'Called and you win, 18%', value: '+150', tone: 'green' },
            { label: 'Called and you lose, 42%', value: '−50', tone: 'red' },
          ],
        },
        caption: 'Weight each result by its chance and add them up. 0.4 × 100 + 0.18 × 150 − 0.42 × 50 = **+46**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Indifference: the engine of GTO',
        body: [
          'At equilibrium, a hand that mixes earns the same EV with each action. If one action were better, the hand would always take it.',
          'The bettor bluffs just often enough to make bluff catchers indifferent. The defender calls just often enough to make bluffs break even.',
          'So a GTO strategy cannot be exploited. It also does not punish mistakes as hard as it could. Exploiting starts when an opponent breaks the indifference.',
        ],
      },
      {
        kind: 'visual',
        title: 'A bluff catcher facing a pot bet',
        art: {
          kind: 'bars',
          bars: [
            { label: '20% bluffs', value: -40, tone: 'red' },
            { label: '33.3% bluffs', value: 0, tone: 'gray' },
            { label: '50% bluffs', value: 50, tone: 'green' },
          ],
        },
        caption: 'A **bluff catcher** beats bluffs but loses to value. Each bar is its EV for calling a pot bet of 100. A call wins 200 against a bluff and loses 100 against value. At **33.3%** bluffs, calling and folding are worth the same.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You bluff 75 into 100 with no equity. Villain folds half the time. What is your EV?',
        choices: ['+50', '−12.5', '+12.5', '0'],
        answer: 2,
        explain: 'Weight each branch by its chance, like the bet tree did. You win 100 half the time and lose 75 half the time. 0.5 × 100 − 0.5 × 75 = +12.5. The +50 answer forgets the calls.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Villain bets pot on the river. You are sure they bluff only 20% of the time. What should a pure bluff catcher do?',
        choices: ['Call, since it beats every bluff', 'Fold, since bluffs are too rare', 'Call half the time to stay balanced'],
        answer: 1,
        explain:
          'Like the bars showed, calling a pot bet needs at least 33.3% bluffs. At 20%, calling loses 40 for every 100 you call. So fold. Mixing only helps when calling and folding are worth the same.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'At equilibrium a hand calls half the time and folds half the time. What does that tell you?',
        choices: ['Calling and folding earn the same EV', 'Calling earns more EV', 'Folding earns more EV'],
        answer: 0,
        explain: 'Like the indifference step said, a hand mixes only when each action earns the same. If one were better, the hand would always take it.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'EV weights each result by its chance and adds them up. Folding is worth 0.',
          'Facing a pot bet, a bluff catcher needs at least 33.3% bluffs to call.',
          'A hand that mixes earns the same EV with each action. Exploits start when opponents break that.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/outs',
    level: 'core',
    minutes: 5,
    cover: { kind: 'cards', cards: '9h8h', board: 'Kh7h2c' },
    steps: [
      {
        kind: 'intro',
        title: 'Count outs, then multiply',
        body: 'An out is a card that makes you the best hand. One multiplication turns outs into a percentage. Big draws need one small correction.',
      },
      {
        kind: 'formula',
        title: 'The rule of 2 and 4, corrected',
        formula: 'Flop: outs × 4 − (outs − 8) when outs > 8.  Turn: outs × 2',
        example: '15 outs on the flop gives 60 − 7 = 53%. The exact figure is **54.1%**. Without the correction you would say 60%.',
      },
      {
        kind: 'visual',
        title: 'A 15 out draw',
        art: { kind: 'cards', cards: 'JhTh', board: '9h8h2c' },
        caption: 'Any of the 9 hearts left makes a flush. Any queen or 7 makes a straight. 2 of those 8 cards are hearts already counted. So 6 more cards help, for **15 outs**.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: '15 outs, flop to river',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Outs × 4', value: 60, tone: 'gray' },
            { label: 'Corrected rule', value: 53 },
            { label: 'Exact', value: 54.1, tone: 'green' },
          ],
        },
        caption: 'Plain outs × 4 says 60% and overstates the draw. The corrected rule says 53%. The exact figure is **54.1%**.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Common draws, exact',
        columns: ['Draw', 'Outs', 'Flop to river', 'Turn to river'],
        rows: [
          ['Gutshot', '4', '16.5%', '8.7%'],
          ['Open ender', '8', '31.5%', '17.4%'],
          ['Flush draw', '9', '35.0%', '19.6%'],
          ['Flush and gutshot', '12', '45.0%', '26.1%'],
          ['Flush and open ender', '15', '54.1%', '32.6%'],
        ],
        note: 'A gutshot needs 1 rank to fill its straight. An open ender has 2 ranks that fill it.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Price one card at a time',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Turn only', value: 19.1, tone: 'green' },
            { label: 'Turn and river', value: 35, tone: 'gray' },
          ],
        },
        caption: 'A flush draw hits the turn **19.1%** of the time. The 35.0% assumes you see the river too. A flop bet usually buys only the turn. So price a flop call with the one card number.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Discount dirty outs',
        body: 'A card that also improves villain is not a clean out. A heart that pairs the board completes your flush. It can also give villain a full house.',
      },
      {
        kind: 'quiz',
        question: 'You have an open ended straight draw on the turn. How often do you hit on the river?',
        choices: ['31.5%', '8.7%', '17.4%'],
        answer: 2,
        explain: 'On the turn, outs × 2 gives 16%. The table shows the exact 17.4%, from 8 outs among 46 unseen cards. The 31.5% answer is the flop number, with 2 cards to come.',
        point: 1,
        variants: [
          {
            question: 'You have a flush draw on the turn. How often do you hit on the river?',
            choices: ['35.0%', '19.6%', '17.4%'],
            answer: 1,
            explain: 'On the turn, outs × 2 gives 18%. The exact chance is 19.6%, from 9 outs among 46 unseen cards. The 35.0% answer is the flop number, with 2 cards to come.',
          },
          {
            question: 'You have a gutshot on the turn. How often do you hit on the river?',
            choices: ['16.5%', '8.7%', '17.4%'],
            answer: 1,
            explain: 'On the turn, outs × 2 gives 8%. The exact chance is 8.7%, from 4 outs among 46 unseen cards. The 16.5% answer is the flop number, with 2 cards to come.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Flush draw plus gutshot on the flop gives 12 outs. How often do you hit by the river?',
        choices: ['26.1%', '45.0%', '48.0%', '36.0%'],
        answer: 1,
        explain:
          'Use the corrected rule. 12 × 4 − 4 = 44%, close to the exact 45.0% in the table. Plain outs × 4 says 48%, which overstates big draws. 26.1% is the chance with one card to come.',
        point: 0,
        variants: [
          {
            question: 'Flush draw plus an open ender on the flop gives 15 outs. How often do you hit by the river?',
            choices: ['32.6%', '54.1%', '60.0%', '45.0%'],
            explain: 'Use the corrected rule. 15 × 4 − 7 = 53%, close to the exact 54.1%. Plain outs × 4 says 60%, which overstates big draws. 32.6% is the chance with one card to come.',
          },
          {
            question: 'A flush draw on the flop gives 9 outs. How often do you hit by the river?',
            choices: ['19.6%', '35.0%', '40.0%', '36.0%'],
            explain: 'Use the corrected rule. 9 × 4 − 1 = 35%, the same as the exact 35.0%. Plain outs × 4 says 36%. 19.6% is the chance with one card to come.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You have a flush draw on the flop. Villain bets, and your call buys only the turn card. Which chance should you price the call with?',
        choices: ['19.1%', '35.0%', '36.0%'],
        answer: 0,
        explain: 'Like the bars showed, a flush draw hits the turn 19.1% of the time. The 35.0% assumes you also see the river for free. 36.0% is plain 9 × 4.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'You have a flush draw. One of your flush cards would also pair the board. Villain may hold a set. How should you count that card?',
        choices: ['As a full out', 'As less than a full out', 'As 2 outs'],
        answer: 1,
        explain: 'Like the tip said, a card that also improves villain is not a clean out. If villain holds a set, that card gives them a full house. A full house beats your flush.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'On the flop, multiply outs by 4. Above 8 outs, subtract (outs − 8).',
          'On the turn, multiply outs by 2.',
          'Price flop calls one card at a time.',
          'Count only outs that make you the best hand.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/implied-odds',
    level: 'core',
    minutes: 5,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'Final pot', value: 100, tone: 'gray' },
        { label: 'Needed', value: 115 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Money you have not won yet',
        body: 'Sometimes the price is too high for your draw. The call can still be right if you win enough extra when you hit. That extra is implied odds.',
      },
      {
        kind: 'formula',
        title: 'How much extra you need',
        formula: 'Extra needed when you hit = call ÷ equity − final pot',
        example:
          'On the turn the pot is 60 and villain bets 20. You call 20 into a final pot of 100. Your open ender hits on 8 of 46 cards. 20 ÷ (8/46) = 115, and 115 − 100 = **15**. On average you must win 15 more on the river when you hit.',
      },
      {
        kind: 'hand',
        title: 'The open ender',
        cards: '9s8d',
        board: 'Kd7c6h2s',
        caption: 'Any 10 or 5 makes your straight. That is 8 outs among 46 unseen cards, or **17.4%**.',
      },
      {
        kind: 'visual',
        title: 'The pot you need when you hit',
        art: {
          kind: 'bars',
          bars: [
            { label: 'Final pot', value: 100, tone: 'gray' },
            { label: 'Needed', value: 115, tone: 'brass' },
          ],
        },
        caption: '20 ÷ (8/46) = 115. The final pot holds only 100. You must win **15** more on the river when you hit.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'What makes implied odds real',
        art: {
          kind: 'tree',
          root: 'Your draw hits',
          branches: [
            { label: 'Deep stacks', value: 'Room to win more', tone: 'green' },
            { label: 'A disguised draw', value: 'Gets paid', tone: 'green' },
            { label: 'Position', value: 'Size the river last', tone: 'green' },
            { label: 'An obvious draw', value: 'They stop paying', tone: 'red' },
          ],
        },
        caption: 'Implied odds are only as real as the money you collect later. An obvious draw is worth much less than the formula suggests.',
      },
      {
        kind: 'text',
        title: 'Reverse implied odds',
        body: [
          'Some hands win small pots and lose big ones. Low flush draws are one example. A weak ace like A5 on an ace high board is another.',
          'When these hands hit, they are sometimes second best and pay off a bigger hand. They need a better price, not a worse one.',
        ],
      },
      {
        kind: 'hand',
        title: 'A low flush draw',
        cards: '4h3h',
        board: 'AhKh8c',
        caption: 'A heart on the turn gives you a flush. It also gives a bigger flush to anyone holding 2 hearts. Then you pay off a big pot.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Opponent dependent',
        body: 'This is a read about the player, so check it against your notes. Against someone who calls big river bets light, implied odds grow. Against a tight player who folds when the draw comes in, they shrink toward nothing.',
      },
      {
        kind: 'quiz',
        question: 'On the turn the pot is 30 and villain bets 10. You call 10 with a flush draw (9 of 46). How much extra do you need when you hit?',
        choices: ['None, it is priced in', 'About 1', 'About 5', 'About 10'],
        answer: 1,
        explain:
          'Use the formula like the open ender example. 10 ÷ (9/46) = 51.1. Subtract the final pot of 50 and you need about 1.1 more. You need 20.0% and have 19.6%.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Which draw has the best implied odds?',
        choices: ['Low flush draw on a paired board', 'Open ender against a tight player', 'Nut flush draw against a loose caller'],
        answer: 2,
        explain:
          'Like the note on opponents said, a loose caller pays you when you hit. A tight player folds when the straight comes in. The low flush can lose to a bigger flush or a full house.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You hold 4♥3♥ on A♥K♥8♣. A heart comes on the turn. Why can your flush still cost you money?',
        cards: '4h3h',
        board: 'AhKh8c',
        choices: ['Anyone with 2 hearts has a bigger flush', 'A flush loses to a straight', 'The pot is too small to matter'],
        answer: 0,
        explain: 'Like the low flush draw showed, your flush is the lowest one. Any player with 2 hearts beats it. Then you pay off a big pot. That is reverse implied odds.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Extra needed = call ÷ equity − final pot.',
          'Implied odds are only real if villain pays you later. Deep stacks and loose callers help.',
          'Second best hands carry reverse implied odds. Low flush draws are one example.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/mdf-alpha',
    level: 'core',
    minutes: 6,
    cover: { kind: 'ring', value: 2 / 3, label: 'Defend at least', caption: 'Facing a half pot bet' },
    steps: [
      {
        kind: 'intro',
        title: 'Two sides of one bet',
        body: 'Alpha is how often a bluff must work. MDF (minimum defense frequency) is how often the defender must continue so bluffs cannot profit automatically. Together they set the balance of every polarized bet.',
      },
      {
        kind: 'formula',
        title: 'Alpha: what a bluff needs',
        formula: 'Alpha = bet ÷ (pot + bet)',
        example: 'Bet 50 into 100, and alpha is 50 ÷ 150 = **33.3%**. A pure bluff profits if villain folds more than a third of the time.',
      },
      {
        kind: 'formula',
        title: 'MDF: what a defender owes',
        formula: 'MDF = pot ÷ (pot + bet) = 1 − alpha',
        example: 'Facing 50 into 100, MDF is 100 ÷ 150 = **66.7%**. Continue with at least two thirds of your range. Otherwise any two cards can bluff for profit.',
      },
      {
        kind: 'visual',
        title: 'One half pot bet, three numbers',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Alpha', value: 33.3, tone: 'red' },
            { label: 'MDF', value: 66.7, tone: 'green' },
            { label: 'Bluff share', value: 25 },
          ],
        },
        caption: 'Bet 50 into 100. A pure bluff must work **33.3%** of the time. The defender continues with **66.7%**. A balanced betting range holds **25%** bluffs.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Bigger bets, less defense',
        art: {
          kind: 'curve',
          points: [
            [0, 100],
            [0.125, 88.9],
            [0.25, 80],
            [0.375, 72.7],
            [0.5, 66.7],
            [0.75, 57.1],
            [1, 50],
            [1.25, 44.4],
            [1.5, 40],
            [1.75, 36.4],
            [2, 33.3],
          ],
          xLabel: 'Bet size, in pots',
          yLabel: 'MDF, %',
          mark: [0.5, 66.7],
        },
        caption: 'Against half pot, defend at least **66.7%** of your range. Against twice the pot, **33.3%** is enough.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Alpha, MDF and the balanced bluff share',
        columns: ['Bet size', 'Alpha', 'MDF', 'Bluffs in range'],
        rows: [
          ['1/3 pot', '25.0%', '75.0%', '20.0%'],
          ['1/2 pot', '33.3%', '66.7%', '25.0%'],
          ['3/4 pot', '42.9%', '57.1%', '30.0%'],
          ['Pot', '50.0%', '50.0%', '33.3%'],
          ['2x pot', '66.7%', '33.3%', '40.0%'],
        ],
        note: 'Bluff share = bet ÷ (pot + 2 × bet). It is the share of bluffs in a polarized river range that makes bluff catchers indifferent.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Where MDF applies, and where it does not',
        art: { kind: 'streets', active: 'river' },
        caption:
          'MDF is cleanest on the river against a polarized range. There bluffs have no equity. Earlier bets with draws are not pure bluffs. Equilibrium strategies often fold more than MDF on the flop and turn, most of all out of position. MDF also ignores what the bettor holds. Against mostly value, defending to MDF just pays it off.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'A guide, not a law',
        body: 'Many players assume big river bets at live low stakes are mostly value. If your own hands confirm that read, fold well below MDF there.',
      },
      {
        kind: 'quiz',
        question: 'You bet 3/4 pot on the river with strong hands and bluffs. What share of your bets should be bluffs?',
        choices: ['42.9%', '30.0%', '57.1%', '25.0%'],
        answer: 1,
        explain:
          'Like the table showed, bluff share = bet ÷ (pot + 2 × bet). 0.75 ÷ 2.5 = 30.0%. The 42.9% answer is alpha, which is how often a pure bluff must work.',
        point: 2,
        variants: [
          {
            question: 'You bet half pot on the river with strong hands and bluffs. What share of your bets should be bluffs?',
            choices: ['33.3%', '25.0%', '50.0%', '20.0%'],
            answer: 1,
            explain: 'Like the table showed, bluff share = bet ÷ (pot + 2 × bet). 0.5 ÷ 2 = 25.0%. The 33.3% answer is alpha, which is how often a pure bluff must work.',
          },
          {
            question: 'You bet pot on the river with strong hands and bluffs. What share of your bets should be bluffs?',
            choices: ['50.0%', '33.3%', '66.7%', '25.0%'],
            answer: 1,
            explain: 'Like the table showed, bluff share = bet ÷ (pot + 2 × bet). 1 ÷ 3 = 33.3%. The 50.0% answer is alpha, which is how often a pure bluff must work.',
          },
          {
            question: 'You bet 2 times the pot on the river with strong hands and bluffs. What share of your bets should be bluffs?',
            choices: ['40.0%', '66.7%', '33.3%', '50.0%'],
            answer: 0,
            explain: 'Like the table showed, bluff share = bet ÷ (pot + 2 × bet). 2 ÷ 5 = 40.0%. The 66.7% answer is alpha, which is how often a pure bluff must work.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You bluff 3/4 pot with nothing. How often must villain fold for you to break even?',
        choices: ['30.0%', '57.1%', '75.0%', '42.9%'],
        answer: 3,
        explain: 'Like the formula showed, alpha = bet ÷ (pot + bet). 0.75 ÷ 1.75 = 42.9%. The 57.1% answer is MDF, which is how often the defender must continue.',
        point: 0,
        variants: [
          {
            question: 'You bluff half pot with nothing. How often must villain fold for you to break even?',
            choices: ['25.0%', '33.3%', '66.7%', '50.0%'],
            answer: 1,
            explain: 'Like the formula showed, alpha = bet ÷ (pot + bet). 0.5 ÷ 1.5 = 33.3%. The 66.7% answer is MDF, which is how often the defender must continue.',
          },
          {
            question: 'You bluff 2 times the pot with nothing. How often must villain fold for you to break even?',
            choices: ['40.0%', '33.3%', '66.7%', '50.0%'],
            answer: 2,
            explain: 'Like the formula showed, alpha = bet ÷ (pot + bet). 2 ÷ 3 = 66.7%. The 33.3% answer is MDF, which is how often the defender must continue.',
          },
          {
            question: 'You bluff a third of the pot with nothing. How often must villain fold for you to break even?',
            choices: ['25.0%', '75.0%', '20.0%', '33.3%'],
            answer: 0,
            explain: 'Like the formula showed, alpha = bet ÷ (pot + bet). ⅓ ÷ 1⅓ = 25.0%. The 75.0% answer is MDF, which is how often the defender must continue.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Villain bets pot on the river. What share of your range must continue so their bluffs cannot profit automatically?',
        choices: ['33.3%', '50.0%', '66.7%'],
        answer: 1,
        explain: 'Like the table showed, MDF = pot ÷ (pot + bet). 1 ÷ 2 = 50.0%. The 66.7% answer is MDF against a half pot bet.',
        point: 1,
        variants: [
          {
            question: 'Villain bets half pot on the river. What share of your range must continue so their bluffs cannot profit automatically?',
            answer: 2,
            explain: 'Like the table showed, MDF = pot ÷ (pot + bet). 1 ÷ 1.5 = 66.7%. The 33.3% answer is alpha for a half pot bet.',
          },
          {
            question: 'Villain bets 2 times the pot on the river. What share of your range must continue so their bluffs cannot profit automatically?',
            answer: 0,
            explain: 'Like the table showed, MDF = pot ÷ (pot + bet). 1 ÷ 3 = 33.3%. The 66.7% answer is alpha for a bet of 2 times the pot.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'Alpha = bet ÷ (pot + bet). It is how often a pure bluff must work.',
          'MDF = 1 − alpha. It fits the river best. Earlier streets can fold more.',
          'Balanced bluff share = bet ÷ (pot + 2 × bet).',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/combos',
    level: 'core',
    minutes: 5,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'Pair', value: 6 },
        { label: 'Aced', value: 4 },
        { label: 'Offsuit', value: 12 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Not every hand is equally likely',
        body: 'Counting combos tells you how often villain holds each hand. The cards you can see change the count.',
      },
      {
        kind: 'visual',
        title: 'Combos per hand',
        art: {
          kind: 'bars',
          bars: [
            { label: 'QQ', value: 6, tone: 'gray' },
            { label: 'AKs', value: 4 },
            { label: 'AKo', value: 12 },
            { label: 'AK', value: 16, tone: 'green' },
          ],
        },
        caption: 'A pair has 6 combos. A suited hand has 4 and an offsuit hand has 12. So AK has 16 combos and AA has 6. AK is about 2.7 times as common as AA.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Card removal',
        art: { kind: 'cards', cards: '', board: 'Ad8c4s' },
        caption: 'Every card you see removes combos. With 1 ace on the board, AA drops from 6 combos to **3**. AK drops from 16 to **12**. Cards in your own hand do the same.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'A blocker in action',
        cards: 'AsQd',
        board: 'Ks9s4s',
        caption: 'You hold the **ace of spades** on a three spade board. Villain can never have the nut flush.',
      },
      {
        kind: 'quiz',
        question: 'The board is K72 with three suits. You hold none of those ranks. How many set combos can villain have?',
        board: 'Ks7d2c',
        choices: ['6', '9', '12', '18'],
        answer: 1,
        explain: 'Like the card removal picture showed, one board card cuts a matching pair from 6 combos to 3. KK, 77 and 22 give 3 + 3 + 3 = 9. The 18 answer forgets the cards on the board.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'The board is Q83 with three suits. You hold none of those ranks. How many set combos can villain have?',
            board: 'Qd8s3c',
            explain: 'Like the card removal picture showed, one board card cuts a matching pair from 6 combos to 3. QQ, 88 and 33 give 3 + 3 + 3 = 9. The 18 answer forgets the cards on the board.',
          },
          {
            question: 'The board is J62 with three suits. You hold none of those ranks. How many set combos can villain have?',
            board: 'Jh6c2d',
            explain: 'Like the card removal picture showed, one board card cuts a matching pair from 6 combos to 3. JJ, 66 and 22 give 3 + 3 + 3 = 9. The 18 answer forgets the cards on the board.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You hold one ace and the board shows one king. How many AK combos can villain have?',
        cards: 'As9h',
        board: 'Kd7c2h',
        choices: ['16', '12', '9', '6'],
        answer: 2,
        explain: 'Cards in your hand remove combos too. Three aces and three kings are left, so 3 × 3 = 9 combos. The 12 answer removes only one of the two cards you can see.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'You hold one king and the board shows one queen. How many KQ combos can villain have?',
            cards: 'Kc8h',
            board: 'Qd7s2h',
            explain: 'Cards in your hand remove combos too. Three kings and three queens are left, so 3 × 3 = 9 combos. The 12 answer removes only one of the two cards you can see.',
          },
          {
            question: 'You hold one jack and the board shows one ten. How many JT combos can villain have?',
            cards: 'Jd4c',
            board: 'Th8s3s',
            explain: 'Cards in your hand remove combos too. Three jacks and three tens are left, so 3 × 3 = 9 combos. The 12 answer removes only one of the two cards you can see.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'No cards are seen yet. How many combos does a suited hand like KQs have?',
        choices: ['4', '6', '12', '16'],
        answer: 0,
        explain: 'Like the bars showed, a suited hand has 1 combo per suit. That makes 4. A pair has 6 and an offsuit hand has 12.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You hold the ace of spades on a three spade board. Can villain hold the ace high flush?',
        cards: 'AsQd',
        board: 'Ks9s4s',
        choices: ['No, you hold the ace of spades', 'Yes, with any 2 spades', 'Yes, with the ace of hearts and a spade'],
        answer: 0,
        explain: 'Like the blocker picture showed, the ace of spades is in your hand. So villain cannot have it. Any flush they make is lower than ace high.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A pair has 6 combos. Suited hands have 4 and offsuit hands have 12.',
          'Every card you can see removes combos.',
          'Holding the ace of a suit blocks the nut flush in that suit.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/spr',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Pot', bb: 5.5 },
        { label: 'Behind', bb: 97.5 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'How deep is this pot, really?',
        body: 'Stack to pot ratio (SPR) tells you how many pot sized bets are left. It decides which hands can happily get all in. It also shapes which bet sizes make sense.',
      },
      {
        kind: 'formula',
        title: 'Stack to pot ratio',
        formula: 'SPR = effective stack ÷ pot on the flop',
        example: 'BTN opens 2.5bb and BB calls, 100bb deep. 97.5 ÷ 5.5 ≈ **17.7**. If BB 3bets to 11bb and BTN calls, 89 ÷ 22.5 ≈ **4.0**.',
      },
      {
        kind: 'visual',
        title: 'A single raised pot is deep',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 5.5 },
            { label: 'Behind', bb: 97.5 },
          ],
        },
        caption: 'BTN opens 2.5bb and BB calls. 97.5bb sits behind a 5.5bb pot. That is an SPR of about **17.7**.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A 3bet pot is shallow',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 22.5 },
            { label: 'Behind', bb: 89 },
          ],
        },
        caption: 'After a 3bet to 11bb, 89bb sits behind a 22.5bb pot. That is an SPR of about **4.0**, against 17.7 in a single raised pot.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Pot types at 100bb',
        columns: ['Pot', 'SPR', 'What it means'],
        rows: [
          ['Single raised', '≈ 18', 'One pair rarely wants to play for stacks'],
          ['3bet pot', '≈ 4', 'Strong top pairs often go all in by the river'],
          ['4bet pot', '≈ 1.5', 'Almost any strong pair is committed'],
        ],
        note: 'Assumes a 2.5bb open, a 3bet to 11bb and a 4bet to 25bb. The small blind folds.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Geometric sizing',
        formula: 'f = ((1 + 2 × stack ÷ pot)^(1/streets) − 1) ÷ 2',
        example:
          'This is the one pot fraction that gets stacks in evenly by the river. In a single raised pot with three streets, it is **116%** of pot each street. In a 3bet pot it is **54%**.',
      },
      {
        kind: 'visual',
        title: 'Same fraction, growing bets',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'Flop', value: 6.4 },
            { label: 'Turn', value: 21.1 },
            { label: 'River', value: 70 },
          ],
        },
        caption: 'In the single raised pot, bet **116%** of the pot on each street. The bets grow from 6.4bb to 70bb. Together they put in all 97.5bb.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why geometric matters',
        body: [
          'A polarized range wants as much money in as possible with its best hands. The same fraction each street does that.',
          'This is why equilibrium strategies bet smaller in low SPR pots. Big polarized lines in deep pots often include overbets.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'The pot is 10 with effective stacks of 35 and two streets left. What geometric bet gets it all in?',
        choices: ['50% pot', '67% pot', '91% pot', '175% pot'],
        answer: 2,
        explain:
          'Use the geometric formula with 2 streets. √(1 + 2 × 35 ÷ 10) = √8 = 2.83, and (2.83 − 1) ÷ 2 = 0.91. Bet 9.1 and the pot grows to 28.3. A 91% bet of 25.9 then puts in the rest. The 175% answer splits the chips evenly, which leaves a second bet of only 39% pot.',
        point: 2,
        variants: [
          {
            question: 'The pot is 10 with effective stacks of 20 and two streets left. What geometric bet gets it all in?',
            choices: ['50% pot', '62% pot', '100% pot', '200% pot'],
            answer: 1,
            explain: 'Use the geometric formula with 2 streets. √(1 + 2 × 20 ÷ 10) = √5 = 2.24, and (2.24 − 1) ÷ 2 = 0.62. Bet 6.2 and the pot grows to 22.4. A 62% bet of 13.8 then puts in the rest.',
          },
          {
            question: 'The pot is 20 with effective stacks of 80 and two streets left. What geometric bet gets it all in?',
            choices: ['67% pot', '100% pot', '150% pot', '200% pot'],
            answer: 1,
            explain: 'Use the geometric formula with 2 streets. √(1 + 2 × 80 ÷ 20) = √9 = 3, and (3 − 1) ÷ 2 = 1. Bet 20 and the pot grows to 60. A pot sized bet of 60 then puts in the rest.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Stacks are 100bb. BTN opens 2.5bb, BB 3bets to 11bb and BTN calls. What is the flop SPR?',
        choices: ['About 1.5', 'About 4', 'About 8', 'About 18'],
        answer: 1,
        explain: 'Like the 3bet pot picture showed, the pot is 11 + 11 + 0.5 = 22.5bb with 89bb behind. 89 ÷ 22.5 ≈ 4. About 18 is the single raised pot number.',
        point: 0,
        variants: [
          {
            question: 'Stacks are 100bb. CO opens 2.5bb, BTN 3bets to 7.5bb and CO calls. What is the flop SPR?',
            choices: ['About 2', 'About 5.6', 'About 11', 'About 18'],
            answer: 1,
            explain: 'The pot is 7.5 + 7.5 + 1.5 = 16.5bb with 92.5bb behind. 92.5 ÷ 16.5 ≈ 5.6. A smaller 3bet in position leaves a higher SPR.',
          },
          {
            question: 'Stacks are 150bb. BTN opens 2.5bb, BB 3bets to 11bb and BTN calls. What is the flop SPR?',
            choices: ['About 4', 'About 6.2', 'About 9', 'About 27'],
            answer: 1,
            explain: 'The pot is 11 + 11 + 0.5 = 22.5bb with 139bb behind. 139 ÷ 22.5 ≈ 6.2. Deeper stacks raise the SPR of the same 3bet pot.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You hold a strong top pair. In which pot are you most committed to getting all in?',
        choices: ['A single raised pot, SPR about 18', 'A 3bet pot, SPR about 4', 'A 4bet pot, SPR about 1.5'],
        answer: 2,
        explain: 'Like the table showed, lower SPR commits one pair hands sooner. At about 1.5 almost any strong pair is committed. At about 18 one pair rarely wants to play for stacks.',
        point: 1,
      },
      {
        kind: 'takeaway',
        points: [
          'SPR = stack ÷ pot. Single raised pots are about 18 and 3bet pots about 4.',
          'Lower SPR commits one pair hands sooner.',
          'Geometric sizing spreads the stack evenly over the streets left.',
        ],
      },
    ],
  },
  {
    key: 'foundations/ranges/range-vs-range',
    level: 'advanced',
    minutes: 5,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'Polar, top', value: 90 },
        { label: 'Polar, bottom', value: 10 },
        { label: 'Condensed', value: 50, tone: 'gray' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Averages hide the strategy',
        body: 'Two ranges can have the same average equity and need very different strategies. What matters is how that equity is spread.',
      },
      {
        kind: 'visual',
        title: 'Same average, different shape',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Polarized, top half', value: 90 },
            { label: 'Polarized, bottom half', value: 10 },
            { label: 'Condensed, every hand', value: 50, tone: 'gray' },
          ],
        },
        caption: 'An illustration, not a real board. Both ranges average 50%. The polarized one is strong or weak, and the condensed one sits in the middle.',
      },
      {
        kind: 'visual',
        title: 'What each shape wants',
        art: {
          kind: 'tree',
          root: 'Range shape',
          branches: [
            { label: 'Polarized', value: 'Bet big', tone: 'brass' },
            { label: 'Condensed', value: 'Check and call', tone: 'green' },
          ],
        },
        caption: 'A polarized range’s strong hands want maximum value. Its weak hands can only win by bluffing. A condensed range that bets big folds out worse hands and gets called by better ones.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Seeing the shape',
        art: {
          kind: 'curve',
          points: [
            [0, 10],
            [50, 10],
            [50, 90],
            [100, 90],
          ],
          xLabel: 'Hands, weakest first, %',
          yLabel: 'Equity, %',
        },
        caption: 'An equity graph sorts a range’s hands by equity and plots them. This is the polarized range from before. It jumps from 10% to 90%. The condensed range would be a flat line at 50%.',
      },
      {
        kind: 'quiz',
        question: 'Your river range is all medium strength hands. What is the best default?',
        choices: ['Overbet for value', 'Bluff with your weakest hands', 'Check and call some bets'],
        answer: 2,
        explain:
          'Like the shapes tree showed, a condensed range checks and calls. If it bets big, worse hands fold and better hands call. So it checks and catches bluffs.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Two ranges both have 50% equity. Range A is half nuts and half air. Range B is all medium hands. Which wants to bet big?',
        choices: ['Range A', 'Range B', 'Both equally'],
        answer: 0,
        explain: 'Like the shapes tree showed, the polarized range bets big. Its strong hands want value and its weak hands need folds. The same average does not mean the same strategy.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'A polarized range is strong hands and weak ones. It bets big.',
          'A condensed range is mostly medium hands. It checks and catches bluffs.',
        ],
      },
    ],
  },
  {
    key: 'foundations/ranges/advantages',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'KcKd', board: 'Ks7d2c' },
    steps: [
      {
        kind: 'intro',
        title: 'Two kinds of advantage',
        body: 'Range advantage means more equity overall. Nut advantage means more of the very best hands. They drive different decisions.',
      },
      {
        kind: 'visual',
        title: 'What each advantage changes',
        art: {
          kind: 'tree',
          root: 'Which advantage do you have?',
          branches: [
            { label: 'Range', value: 'Bet often, often small', tone: 'brass' },
            { label: 'Nut', value: 'Bet bigger, overbet', tone: 'red' },
            { label: 'Both', value: 'Bet often, sizes grow', tone: 'red' },
            { label: 'Neither', value: 'Check more', tone: 'green' },
          ],
        },
        caption: 'Range advantage drives how often you bet. Nut advantage drives how big.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'K72 rainbow, BTN vs BB',
        board: 'Ks7d2c',
        caption:
          'BB 3bets KK and AK before the flop. So its calling range has few of the best top pairs. **21%** of BTN hands have 80% equity or more against BB. Only **10%** of BB hands do. BTN has both advantages and bets small with most of its range.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: '765 two tone, BTN vs BB',
        board: '7h6h5c',
        caption:
          'BB defends many more low connected hands. **8.6%** of its range already has two pair or better, against **4.7%** of BTN’s. BTN keeps the overpairs, but its equity edge is gone. BTN checks far more here.',
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'The numbers behind both boards',
        columns: ['Flop', 'BTN equity', 'Strong hands', 'Two pair+'],
        rows: [
          ['K♠7♦2♣', '54%', '21 vs 10%', '3.1 vs 3.1%'],
          ['7♥6♥5♣', '49%', '3 vs 6%', '4.7 vs 8.6%'],
        ],
        note: 'BTN first, then BB. Strong hands means the share of a range with 80% or more equity against the other range. This is our estimate by Monte Carlo from Aced’s starter charts. Those charts are approximate. BTN opens 2.5bb and BB calls.',
      },
      {
        kind: 'quiz',
        question: 'The turn gives you many more of the very best hands than villain. Which bet sizes fit?',
        choices: ['Small and frequent', 'Large and polarized', 'Check most of your range'],
        answer: 1,
        explain: 'Like the tree showed, a nut advantage drives bigger bets. Your best hands want a big pot. Small frequent bets fit a range advantage without a nut edge.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'BTN opens and BB calls. The flop is K♠7♦2♣. Who has the nut advantage?',
        choices: ['BTN', 'BB', 'Neither'],
        answer: 0,
        explain:
          'Like the K72 board showed, BB 3bets KK and AK before the flop. So BTN holds more of the strongest hands. 21% of BTN’s range has 80% or more equity, against 10% of BB’s.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'You have a range advantage but no nut advantage. Which plan fits?',
        choices: ['Bet often with a small size', 'Overbet with your best hands', 'Check almost every hand'],
        answer: 0,
        explain: 'Like the tree showed, range advantage drives how often you bet. Without more nut hands, big sizes are not needed. So bet often and small.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Range advantage decides how often you bet.',
          'Nut advantage decides how big.',
          'Preflop ranges decide who has each. Who 3bets what matters most.',
        ],
      },
    ],
  },
  {
    key: 'foundations/ranges/range-shapes',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'tree',
      root: 'Range shape',
      branches: [
        { label: 'Linear', value: 'Value bets', tone: 'red' },
        { label: 'Polarized', value: 'Bets big', tone: 'red' },
        { label: 'Condensed', value: 'Checks', tone: 'green' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Three range shapes',
        body: 'Every bet or check is a range with a shape. Naming the shape tells you what the range can do. It also tells you how to attack it.',
      },
      {
        kind: 'table',
        title: 'Three shapes',
        columns: ['Shape', 'Contains', 'Used for'],
        rows: [
          ['Linear', 'Best hands down to a cutoff', 'Value betting against callers'],
          ['Polarized', 'Very strong hands and bluffs', 'Large bets, river bets'],
          ['Condensed', 'Mostly medium hands', 'Checking, calling'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Protect your checking range',
        art: {
          kind: 'tree',
          root: 'Your flop checks hold',
          branches: [
            { label: 'Only weak and medium hands', value: 'Easy to attack', tone: 'red' },
            { label: 'Some strong hands too', value: 'Can fight back', tone: 'green' },
          ],
        },
        caption: 'If you bet every strong hand, opponents can bet into your checks with anything. Equilibrium strategies check some strong hands. They do it most out of position. They also do it when they bet only a small part of their range.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A pure bluff catcher',
        cards: 'Kc8d',
        board: 'Kh9h4c2s7d',
        caption: 'You have top pair with a weak kicker. The hearts missed. Villain bets big with nuts or air. Your hand beats only the bluffs.',
      },
      {
        kind: 'visual',
        title: 'Facing a polarized bet',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '1/3 pot', value: 20 },
            { label: '1/2 pot', value: 25 },
            { label: 'Pot', value: 33.3 },
            { label: '2x pot', value: 40 },
          ],
        },
        caption: 'A bluff catcher calls only when the bettor bluffs often enough. These are the bluff shares that make a call break even. The bigger the bet, the more bluffs it needs.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You bet the flop and turn. Your river range is now near nuts or busted draws. Which bet suits it?',
        choices: ['Small block bet', 'Half pot bet', 'Large polarized bet'],
        answer: 2,
        explain: 'Like the table showed, a polarized range uses large bets. The nuts get the most value and the bluffs get the most folds. A small bet lets bluff catchers call too cheaply.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Why check back some strong hands on the flop?',
        choices: ['So villain cannot attack your checks with anything', 'To trap this opponent into bluffing', 'Because betting strong hands loses value'],
        answer: 0,
        explain:
          'Like the checking range picture showed, checks with no strong hands are easy to attack. Checking some strong hands protects the whole range. A trap can be a bonus, but the main reason is the range.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Your bets hold your best hands down to a cutoff, with no bluffs. Which shape is that?',
        choices: ['Linear', 'Polarized', 'Condensed'],
        answer: 0,
        explain: 'Like the table showed, a linear range runs from the best hands down to a cutoff. It value bets against players who call. A polarized range adds bluffs.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'A linear range is the best hands down to a cutoff. It value bets against callers.',
          'A polarized range is very strong hands and bluffs. It makes big bets.',
          'Keep some strong hands in your checks so they are hard to attack.',
        ],
      },
    ],
  },
  {
    key: 'foundations/ranges/equity-realization',
    level: 'core',
    minutes: 5,
    cover: { kind: 'table', seats: 6, button: 'BTN', hero: 'BTN', highlight: ['BB'], note: 'You act last' },
    steps: [
      {
        kind: 'intro',
        title: 'Equity you actually collect',
        body: 'Raw equity assumes every hand reaches showdown. In real hands you fold some of it away. The share you keep is equity realization.',
      },
      {
        kind: 'formula',
        title: 'Realization',
        formula: 'Realized equity = raw equity × realization factor',
        example: 'A factor above 1 means a hand wins more than its raw share. Position and good play do that. A factor below 1 means the hand gets pushed off its equity.',
      },
      {
        kind: 'visual',
        title: 'Position',
        art: { kind: 'table', seats: 6, button: 'BTN', hero: 'BTN', highlight: ['BB'], note: 'You act last' },
        caption: 'Acting last, you see what villain does first. You can take free cards and control the pot size.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'What drives it',
        art: {
          kind: 'tree',
          root: 'Equity you keep',
          branches: [
            { label: 'In position', value: 'Can top 100%', tone: 'green' },
            { label: 'Suited and connected', value: 'Keeps more', tone: 'green' },
            { label: 'Offsuit or dominated', value: 'Pushed off', tone: 'red' },
            { label: 'A capped range', value: 'Keeps less', tone: 'red' },
          ],
        },
        caption: '**Position** matters most. **Playability** comes next because strong draws and nut hands keep betting. A capped range cannot stand up to pressure.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Playability matters',
        cards: 'Ts9s',
        caption:
          'Against a random hand, T9s has about 54% equity and QTo about 57%. Yet T9s keeps its equity on far more boards. Flushes, straights and strong draws let it keep betting and calling.',
      },
      {
        kind: 'quiz',
        question: 'The big blind needs 27.3% equity to call a 2.5bb button open. Why does it fold some hands with more raw equity than that?',
        choices: [
          'Folding them keeps its range balanced',
          'Out of position they realize too little',
          'The button’s range is always ahead of them',
        ],
        answer: 1,
        explain:
          'Like the tree showed, out of position weak offsuit hands get pushed off their equity. They realize too little to cover the price. Balance is not the reason. A hand that loses money by calling should fold.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Out of position, which hand keeps the most of its equity?',
        choiceCards: ['Ts9d', 'Kc4h', 'Ts9s'],
        choices: ['T9 offsuit', 'K4 offsuit', 'T9 suited'],
        answer: 2,
        explain:
          'Like the T9s picture showed, playability keeps equity. Flushes and strong draws let T9s continue on more boards. T9o and K4o get pushed off their equity far more often.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'A hand has 40% raw equity and a realization factor of 0.75. What equity does it realize?',
        choices: ['30%', '40%', '53%'],
        answer: 0,
        explain: 'Like the formula showed, realized equity = raw equity × factor. 40% × 0.75 = 30%. The 53% answer divides by the factor instead of multiplying.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Realized equity = raw equity × realization factor.',
          'Position and playability raise it. Offsuit and dominated hands get pushed off.',
          'Price calls against the equity you will realize, not raw equity.',
        ],
      },
    ],
  },
];

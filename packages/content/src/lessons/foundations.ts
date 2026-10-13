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
        explain: 'You call 75 to make a final pot of 250. 75 ÷ 250 = 30.0%. The 42.9% answer is 75 ÷ 175, which leaves out your own call.',
      },
      {
        kind: 'quiz',
        question: 'Your flush draw has 19.6% equity on the turn. Villain bets half pot. Is a call profitable on pot odds alone?',
        choices: ['Yes, by about 5 points', 'It breaks even exactly', 'No, it is about 5 points short'],
        answer: 2,
        explain:
          'A half pot bet needs 25.0%. You have 19.6%, so you are 5.4 points short. The call only works if you win extra on the river when you hit. That extra is implied odds.',
      },
      {
        kind: 'takeaway',
        points: [
          'Equity needed = call ÷ final pot.',
          'Half pot needs 25.0%. Pot needs 33.3%. Twice pot needs 40.0%.',
          'Compare the price with the equity you will realize, not raw equity.',
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
        body: 'Expected value is the average result of a decision over every way the hand can go. Folding is worth zero. Every other action is measured against it.',
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
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'A bluff catcher facing a pot bet',
        columns: ['Villain bluffs', 'EV of calling 100 into 200'],
        rows: [
          ['20.0%', '−40'],
          ['33.3%', '0'],
          ['50.0%', '+50'],
        ],
        note: 'The pot is 100 and villain bets 100. EV = bluff share × 200 − value share × 100. At one bluff for every two value bets, calling and folding are worth the same.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You bluff 75 into 100 with no equity. Villain folds half the time. What is your EV?',
        choices: ['+50', '−12.5', '+12.5', '0'],
        answer: 2,
        explain: 'You win 100 half the time and lose 75 half the time. 0.5 × 100 − 0.5 × 75 = +12.5. The +50 answer counts the folds but forgets the calls.',
      },
      {
        kind: 'quiz',
        question: 'Villain bets pot on the river. You are sure they bluff only 20% of the time. What should a pure bluff catcher do?',
        choices: ['Call, since it beats every bluff', 'Fold, since bluffs are too rare', 'Call half the time to stay balanced'],
        answer: 1,
        explain:
          'You need villain to bluff at least 33.3%. At 20%, calling loses 40 for every 100 you call. So folding every bluff catcher is the best response. Mixing only helps when calling and folding are worth the same.',
      },
      {
        kind: 'takeaway',
        points: [
          'Folding is worth zero. Measure every action against it.',
          'Hands that mix are indifferent at equilibrium.',
          'Exploits come from opponents who break that indifference.',
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
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Price one card at a time',
        body:
          'The flop column assumes you see both the turn and the river. Facing a flop bet, you usually pay to see only the turn. You may face another bet after that. So price a flop call with the one card number.',
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
        explain: '8 outs among 46 unseen cards hit 17.4% of the time. The 31.5% answer is the flop number, which counts two cards to come.',
      },
      {
        kind: 'quiz',
        question: 'Flush draw plus gutshot on the flop gives 12 outs. How often do you hit by the river?',
        choices: ['26.1%', '45.0%', '48.0%', '36.0%'],
        answer: 1,
        explain:
          'The exact figure is 45.0%. The corrected rule gives 12 × 4 − 4 = 44%, which is close. Plain outs × 4 says 48%, which overstates big draws. 26.1% is the chance with one card to come.',
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
        kind: 'text',
        title: 'What makes implied odds real',
        body: [
          'Deep stacks give you room to win more later. A disguised draw gets paid when it hits.',
          'Position helps too. You can size the river bet after you see what villain does.',
          'An obvious draw is worth much less than the formula suggests. When it completes, a careful opponent stops paying.',
        ],
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
          '10 ÷ (9/46) = 51.1. Subtract the final pot of 50 and you need about 1.1 more. It is close to priced in but not quite. You need 20.0% and have 19.6%.',
      },
      {
        kind: 'quiz',
        question: 'Which draw has the best implied odds?',
        choices: ['Low flush draw on a paired board', 'Open ender against a tight player', 'Nut flush draw against a loose caller'],
        answer: 2,
        explain:
          'The nut draw is never second best when it hits, and a loose caller pays it off. The open ender is a fine draw, but a tight player folds when the straight comes in. The low flush can lose to a bigger flush or a full house.',
      },
      {
        kind: 'takeaway',
        points: [
          'Extra needed = call ÷ equity − final pot.',
          'Deep stacks and disguised draws make implied odds real. Position helps too.',
          'Second best hands carry reverse implied odds.',
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
        kind: 'text',
        title: 'Where MDF applies, and where it does not',
        body: [
          'MDF is cleanest on the river against a polarized range. There, bluffs have no equity.',
          'On the flop and turn, bets with draws are not pure bluffs. The defender’s range may also be too weak to defend that much. Equilibrium strategies often fold more than MDF on earlier streets. This happens most out of position.',
          'MDF also ignores what the bettor actually holds. When the betting range is mostly value, defending to MDF just pays it off.',
        ],
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
        question: 'You bet 3/4 pot on the river with a polarized range. What share of your bets should be bluffs?',
        choices: ['42.9%', '30.0%', '57.1%', '25.0%'],
        answer: 1,
        explain:
          '0.75 ÷ (1 + 2 × 0.75) = 0.75 ÷ 2.5 = 30.0%. That makes villain’s bluff catchers indifferent. The 42.9% answer is alpha, which is how often a pure bluff must work.',
      },
      {
        kind: 'quiz',
        question: 'You bluff 3/4 pot with nothing. How often must villain fold for you to break even?',
        choices: ['30.0%', '57.1%', '75.0%', '42.9%'],
        answer: 3,
        explain: 'Alpha = 0.75 ÷ 1.75 = 42.9%. The 57.1% answer is MDF, which is how often the defender must continue.',
      },
      {
        kind: 'takeaway',
        points: [
          'Alpha = bet ÷ (pot + bet).',
          'MDF = 1 − alpha.',
          'Balanced bluff share = bet ÷ (pot + 2 × bet).',
          'MDF fits the river best. Earlier streets can fold more.',
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
        { label: 'Suited', value: 4 },
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
        kind: 'table',
        title: 'Combos per hand',
        columns: ['Hand type', 'Example', 'Combos'],
        rows: [
          ['Pair', 'QQ', '6'],
          ['Suited', 'AKs', '4'],
          ['Offsuit', 'AKo', '12'],
          ['Unpaired, any suits', 'AK', '16'],
        ],
        note: 'AK has 16 combos and AA has 6. So AK is about 2.7 times as common as AA.',
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
        explain: 'Each pocket pair that matches the board has 3 combos left. KK, 77 and 22 give 3 + 3 + 3 = 9. The 18 answer forgets the cards on the board.',
      },
      {
        kind: 'quiz',
        question: 'You hold one ace and the board shows one king. How many AK combos can villain have?',
        cards: 'As9h',
        board: 'Kd7c2h',
        choices: ['16', '12', '9', '6'],
        answer: 2,
        explain: 'Three aces and three kings are left. 3 × 3 = 9 combos. The 12 answer removes only one of the two cards you can see.',
      },
      {
        kind: 'takeaway',
        points: [
          'A pair has 6 combos. Suited hands have 4 and offsuit hands have 12.',
          'Every card you can see removes combos.',
          'Count value and bluff combos before big decisions.',
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
        kind: 'text',
        title: 'Why geometric matters',
        body: [
          'A polarized range wants as much money in as possible with its best hands. Betting the same fraction each street does that. Each bet stays the same size relative to the pot.',
          'This is why equilibrium strategies bet smaller in low SPR pots. It is also why big polarized lines in deep pots often include overbets.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'The pot is 10 with effective stacks of 35 and two streets left. What geometric bet gets it all in?',
        choices: ['50% pot', '67% pot', '91% pot', '175% pot'],
        answer: 2,
        explain:
          '√(1 + 2 × 35 ÷ 10) = √8 = 2.83, and (2.83 − 1) ÷ 2 = 0.91. Bet 9.1 and the pot grows to 28.3. A 91% bet of 25.9 then puts in the rest. The 175% answer splits the chips evenly, which leaves a second bet of only 39% pot.',
      },
      {
        kind: 'quiz',
        question: 'Stacks are 100bb. BTN opens 2.5bb, BB 3bets to 11bb and BTN calls. What is the flop SPR?',
        choices: ['About 1.5', 'About 4', 'About 8', 'About 18'],
        answer: 1,
        explain: 'The pot is 11 + 11 + 0.5 = 22.5bb with 89bb behind. 89 ÷ 22.5 ≈ 4. About 18 is the single raised pot number.',
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
        evidence: 'math',
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
        kind: 'text',
        title: 'Seeing the shape',
        body: [
          'An equity graph shows the shape. Sort a range’s hands by equity against the other range and plot them.',
          'A polarized range is steep at both ends. A condensed range is flat in the middle.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Your river range is all medium strength hands. What is the best default?',
        choices: ['Overbet for value', 'Bluff with your weakest hands', 'Check and call some bets'],
        answer: 2,
        explain:
          'A condensed range gets folds from worse and calls from better when it bets big. So it checks and catches bluffs. Even its weakest hands have some showdown value, which a bluff would throw away.',
      },
      {
        kind: 'quiz',
        question: 'Two ranges both have 50% equity. Range A is half nuts and half air. Range B is all medium hands. Which wants to bet big?',
        choices: ['Range A', 'Range B', 'Both equally'],
        answer: 0,
        explain: 'The polarized range bets big. Its nuts want value and its air needs folds. The same average equity does not mean the same strategy.',
      },
      {
        kind: 'takeaway',
        points: ['Look at the shape of a range, not just its average.', 'Polarized ranges bet big.', 'Condensed ranges check and catch bluffs.'],
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
        kind: 'table',
        title: 'What each advantage changes',
        columns: ['Advantage', 'Drives', 'Typical result'],
        rows: [
          ['Range', 'How often you bet', 'Bet a wide range, often small'],
          ['Nut', 'How big you bet', 'Larger bets and overbets'],
          ['Both', 'Both', 'Bet often, sizes can grow'],
          ['Neither', 'Checking', 'Check more, defend well'],
        ],
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
        note: 'BTN first, then BB. Strong hands means the share of a range with 80% or more equity against the other range. This is our estimate by Monte Carlo from Felt’s starter charts. Those charts are approximate. BTN opens 2.5bb and BB calls.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'The turn gives you many more nut hands. Villain’s check call capped their range. Which bet sizes fit?',
        choices: ['Small and frequent', 'Large and polarized', 'Check most of your range'],
        answer: 1,
        explain: 'A nut advantage against a capped range is when big polarized bets earn the most. Small frequent bets fit a range advantage without a nut edge.',
      },
      {
        kind: 'quiz',
        question: 'BTN opens and BB calls. The flop is K♠7♦2♣. Who has the nut advantage?',
        choices: ['BTN', 'BB', 'Neither'],
        answer: 0,
        explain:
          'BB 3bets KK and AK before the flop, so BTN holds more of the strongest hands. 21% of BTN’s range has 80% or more equity, against 10% of BB’s. Both hold about 3.1% two pair or better. BB has far fewer strong top pairs.',
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
        title: 'Linear, polarized, condensed',
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
        kind: 'text',
        title: 'Protect your checking range',
        body: [
          'If you bet every strong hand, your checks hold only weak and medium hands. Opponents can then bet into your checks with anything.',
          'Checking some strong hands lets your checking range fight back. Equilibrium strategies do this often. They do it most out of position, and when they bet only a small part of their range.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Facing a polarized bet',
        body: [
          'Against nuts or air, your medium hands are pure bluff catchers. Whether they call depends only on how often the bettor bluffs. The bluff share and MDF numbers describe exactly that.',
        ],
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You bet the flop and turn. Your river range is now near nuts or busted draws. Which bet suits it?',
        choices: ['Small block bet', 'Half pot bet', 'Large polarized bet'],
        answer: 2,
        explain: 'A polarized range wants large bets. The nuts get the most value and the bluffs get the most folds. A small bet lets bluff catchers call too cheaply.',
      },
      {
        kind: 'quiz',
        question: 'Why check back some strong hands on the flop?',
        choices: ['So your checking range is not capped', 'To trap this opponent into bluffing', 'Because betting strong hands loses value'],
        answer: 0,
        explain:
          'If your checks never hold strong hands, opponents can attack them freely. Checking some strong hands protects the whole range. A trap can be a bonus. The main reason is the range, not the single hand.',
      },
      {
        kind: 'takeaway',
        points: ['Linear ranges value bet against callers.', 'Polarized ranges make big bets.', 'Keep some strong hands in your checks.'],
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
        kind: 'text',
        title: 'What drives it',
        body: [
          '**Position** matters most. In position, hands can realize more than 100% of their raw equity.',
          '**Playability** comes next. Suited and connected hands make strong draws and nut hands. Offsuit and dominated hands get pushed off their equity more often.',
          '**Range strength** matters too. A capped range realizes less because it cannot stand up to pressure.',
        ],
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
          'Raw equity assumes the hand reaches showdown. Out of position, weak offsuit hands often fold to later bets. They realize too little to cover the price. Balance is not the reason. A hand that loses money by calling should fold.',
      },
      {
        kind: 'quiz',
        question: 'Out of position, which hand keeps the most of its equity?',
        choiceCards: ['Ts9d', 'Kc4h', 'Ts9s'],
        choices: ['T9 offsuit', 'K4 offsuit', 'T9 suited'],
        answer: 2,
        explain:
          'Being suited adds only about 2.5 points of raw equity. The bigger gain is playability. Flushes and strong draws let T9s continue on more boards. T9o and K4o get pushed off their equity far more often.',
      },
      {
        kind: 'takeaway',
        points: ['Realized equity = raw equity × realization.', 'Position and playability raise it.', 'Price calls against what you will realize.'],
      },
    ],
  },
];

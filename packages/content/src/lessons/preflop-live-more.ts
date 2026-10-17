import type { LessonContent } from './types';

/**
 * More live preflop: defending the straddle, 3bets in straddled pots, the
 * limp reraise and 3bets against big live opens at real live depths. Prices,
 * SPRs and equities are exact or computed, and recomputed in
 * thin-spots.test.ts. Pool reads are labelled as reads.
 */
export const PREFLOP_LIVE_MORE_LESSONS: LessonContent[] = [
  {
    key: 'preflop/live-preflop/straddle-defense',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'UTG', highlight: ['BTN'], note: 'Straddle 2bb, BTN opens 6bb' },
    steps: [
      {
        kind: 'intro',
        title: 'You posted the straddle',
        body: 'A straddle is a live blind of 2bb. You act last before the flop. After the flop you act before everyone except the blinds.',
      },
      {
        kind: 'visual',
        title: 'The straddle closes the action',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'UTG', highlight: ['BTN'], note: 'Straddle 2bb, BTN opens 6bb' },
        caption: 'You straddled 2bb from UTG. The button opened to 6bb and the blinds folded. You close the action, but the button has position after the flop.',
      },
      {
        kind: 'table',
        title: 'Your price from the straddle',
        columns: ['Open', 'You call', 'Pot after', 'Needs'],
        rows: [
          ['6bb', '4bb', '13.5bb', '29.6%'],
          ['7bb', '5bb', '15.5bb', '32.3%'],
          ['8bb', '6bb', '17.5bb', '34.3%'],
        ],
        note: 'Straddle 2bb and the blinds folded. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Defend like a big blind',
        body: [
          'Your price is close to the big blind’s against a normal open. You close the action, so no one can raise behind you.',
          'But you are out of position against almost everyone. Hands that need position lose value.',
          'Pairs, suited aces and suited broadways defend well. Weak offsuit hands fold.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'A lower SPR than usual',
        art: {
          kind: 'bars',
          bars: [
            { label: '2.5bb open, BB calls', value: 17.7, tone: 'gray' },
            { label: '6bb open, straddle calls', value: 7, tone: 'brass' },
          ],
        },
        caption: 'With 100bb stacks, a called 2.5bb open leaves an SPR (stack to pot ratio) of **17.7**. A called 6bb open in a straddled pot leaves **7.0**. Top pair is worth more at the lower SPR.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'A defend from the straddle',
        cards: 'Ah7h',
        caption: 'A♥7♥ defends against a 6bb button open. It makes the nut flush and wins pots with top pair at the lower SPR.',
      },
      {
        kind: 'visual',
        title: 'The seat next to the straddle',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'UTG+1', highlight: ['UTG'], note: '8 players act after you' },
        caption: 'In a straddled pot the first player to act sits next to the straddle. Everyone else acts behind, the straddle too. Open your tightest range from this seat.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live straddles',
        body: 'Many live straddlers defend too wide because they already put 2bb in. That money is gone either way. Defend on price and position, not on what you posted.',
      },
      {
        kind: 'quiz',
        question: 'You straddle 2bb. The cutoff opens to 7bb and the rest fold. What raw equity does your call need?',
        choices: ['29.6%', '32.3%', '38%'],
        answer: 1,
        explain: 'The pot holds 0.5 + 1 + 2 + 7 = 10.5bb. You call 5bb, so 5 ÷ 15.5 = 32.3%.',
        point: 0,
        variants: [
          {
            question: 'You straddle 2bb. The HJ opens to 8bb and the rest fold. What raw equity does your call need?',
            choices: ['29.6%', '34.3%', '42%'],
            explain: 'The pot holds 0.5 + 1 + 2 + 8 = 11.5bb. You call 6bb, so 6 ÷ 17.5 = 34.3%.',
          },
          {
            question: 'You straddle 2bb. The button opens to 6bb and the blinds fold. What raw equity does your call need?',
            choices: ['25%', '29.6%', '35%'],
            explain: 'The pot holds 0.5 + 1 + 2 + 6 = 9.5bb. You call 4bb, so 4 ÷ 13.5 = 29.6%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'In a straddled pot the button opens to 6bb and you call from the straddle. Stacks are 100bb. What is the flop SPR?',
        choices: ['About 4', 'About 7', 'About 17'],
        answer: 1,
        explain: 'The pot is 6 + 6 + 0.5 + 1 = 13.5bb with 94bb behind. 94 ÷ 13.5 = 7.0. A called 2.5bb open without a straddle leaves 17.7.',
        point: 1,
        variants: [
          {
            question: 'In a straddled pot the button opens to 6bb and you call from the straddle. Stacks are 200bb. What is the flop SPR?',
            choices: ['About 7', 'About 14.4', 'About 30'],
            explain: 'The pot is 13.5bb with 194bb behind. 194 ÷ 13.5 = 14.4. Deep stacks put back some room to play.',
          },
          {
            question: 'In a straddled pot the button opens to 8bb and you call from the straddle. Stacks are 100bb. What is the flop SPR?',
            choices: ['About 3', 'About 5.3', 'About 9'],
            explain: 'The pot is 8 + 8 + 0.5 + 1 = 17.5bb with 92bb behind. 92 ÷ 17.5 = 5.3.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You straddled 2bb and face a 6bb open. Which hand is the clearest fold?',
        choiceCards: ['Jd4c', 'Ah7h', '8s8c'],
        choices: ['J♦4♣', 'A♥7♥', '8♠8♣'],
        answer: 0,
        explain: 'Weak offsuit hands play badly out of position. A7s and 88 defend well, since they make strong hands.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['KcJc', 'Qs3d', '5h5d'],
            choices: ['K♣J♣', 'Q♠3♦', '5♥5♦'],
            answer: 1,
            explain: 'Q3o is a weak offsuit hand that plays badly out of position. KJs and 55 defend, since they make strong hands.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'From the straddle, calling a 6bb open needs 29.6% raw equity. A 7bb open asks 32.3%.',
          'Straddled pots play shallow. A called 6bb open leaves an SPR of about 7.',
          'Defend pairs and suited hands from the straddle. Fold weak offsuit hands.',
        ],
      },
    ],
  },
  {
    key: 'preflop/live-preflop/straddle-3bets',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Pot', bb: 39.5 },
        { label: 'Behind', bb: 82 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Bigger opens, bigger 3bets',
        body: 'A straddle doubles the blinds, so opens and 3bets grow too. Stacks stay the same. So every 3bet pot is shallow.',
      },
      {
        kind: 'visual',
        title: 'A 3bet in a straddled pot',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BTN', highlight: ['CO'], note: 'Straddle 2bb, CO opens 6bb' },
        caption: 'The pot is straddled for 2bb. The cutoff opened to 6bb and you are on the button. The blinds and the straddle put 3.5bb in.',
      },
      {
        kind: 'table',
        title: 'Sizes and SPR at 100bb',
        columns: ['Line', 'Pot', 'Behind', 'SPR'],
        rows: [
          ['Open 6bb, the button calls', '15.5bb', '94bb', '6.1'],
          ['3bet to 18bb, the opener calls', '39.5bb', '82bb', '2.1'],
          ['4bet to 40bb, the 3bettor calls', '83.5bb', '60bb', '0.7'],
        ],
        note: 'Straddle 2bb and blinds 0.5bb and 1bb, all folded. Exact math.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'What a 3bet bluff needs',
        formula: '18 ÷ (9.5 + 18) = 65.5%',
        parts: [
          ['Pot before you act', '6 + 3.5 = 9.5bb'],
          ['You risk', '18bb'],
        ],
        example: 'A 3bet to 18bb with no equity needs **65.5%** folds. Many live openers call 3bets too often. So most of your 3bets should be value.',
      },
      {
        kind: 'text',
        title: 'Play it like 50bb',
        body: [
          'At 100bb a straddled pot plays like 50 straddles deep. That is a short stack in a normal game.',
          'So 3bet a linear range for value. Hands like AQ, AJs and TT gain.',
          '4bets are close to all in. Plan to shove or fold instead of 4betting small.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A value 3bet',
        cards: 'AdQc',
        caption: 'A♦Q♣ 3bets a 6bb cutoff open for value. At an SPR near 2 it happily gets all in on an ace or queen high flop.',
      },
      {
        kind: 'visual',
        title: 'After a called 3bet',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 39.5 },
            { label: 'Behind', bb: 82 },
          ],
        },
        caption: 'The cutoff calls your 3bet to 18bb. The pot is 39.5bb with 82bb behind. That SPR (stack to pot ratio) of **2.1** commits one pair hands on most flops.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Plan the 4bet before you 3bet',
        art: {
          kind: 'tree',
          root: 'Your 3bet faces a 4bet to 40bb',
          branches: [
            { label: 'Strong hands', value: 'Shove', tone: 'green' },
            { label: 'Everything else', value: 'Fold', tone: 'gray' },
          ],
        },
        caption: 'A call would leave an SPR of 0.7, so any flop commits you. Decide before the flop instead.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 3bet callers',
        body: 'Live players often call 3bets out of position with hands like KJo and A9o. Make them pay. 3bet bigger for value and bluff less.',
      },
      {
        kind: 'quiz',
        question: 'In a straddled pot, the CO opens to 6bb. You 3bet the button to 18bb as a bluff. How often must the others fold?',
        choices: ['50%', '65.5%', '80%'],
        answer: 1,
        explain: 'The pot holds 6 + 3.5 = 9.5bb. You risk 18bb, so 18 ÷ 27.5 = 65.5%. Live openers rarely fold that often.',
        point: 0,
        variants: [
          {
            question: 'In a straddled pot, the HJ opens to 7bb. You 3bet the cutoff to 21bb as a bluff. How often must the others fold?',
            choices: ['50%', '66.7%', '80%'],
            explain: 'The pot holds 7 + 3.5 = 10.5bb. You risk 21bb, so 21 ÷ 31.5 = 66.7%.',
          },
          {
            question: 'In a straddled pot, the LJ opens to 5bb. You 3bet the button to 16bb as a bluff. How often must the others fold?',
            choices: ['55%', '65.3%', '75%'],
            explain: 'The pot holds 5 + 3.5 = 8.5bb. You risk 16bb, so 16 ÷ 24.5 = 65.3%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Stacks are 100bb in a straddled pot. You 3bet to 18bb and the 6bb opener calls. What is the flop SPR?',
        choices: ['About 2', 'About 4', 'About 7'],
        answer: 0,
        explain: 'The pot is 18 + 18 + 3.5 = 39.5bb with 82bb behind. 82 ÷ 39.5 = 2.1.',
        point: 1,
        variants: [
          {
            question: 'Stacks are 200bb in a straddled pot. You 3bet to 18bb and the 6bb opener calls. What is the flop SPR?',
            choices: ['About 2', 'About 4.6', 'About 9'],
            answer: 1,
            explain: 'The pot is 39.5bb with 182bb behind. 182 ÷ 39.5 = 4.6. Deep stacks leave more room to play.',
          },
          {
            question: 'Stacks are 100bb in a straddled pot. You 3bet to 20bb and the 6bb opener calls. What is the flop SPR?',
            choices: ['About 1.8', 'About 3.5', 'About 6'],
            explain: 'The pot is 20 + 20 + 3.5 = 43.5bb with 80bb behind. 80 ÷ 43.5 = 1.8.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'In a 100bb straddled pot, your 3bet to 18bb faces a 4bet to 40bb. How should you plan?',
        choices: ['Shove or fold, since a call commits you anyway', 'Call and decide on the flop', 'Call to keep the pot small'],
        answer: 0,
        explain: 'After a call the pot is 83.5bb with 60bb behind, an SPR of 0.7. Any flop commits you, so decide now. Shove your strong hands and fold the rest.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A 3bet to 18bb over a 6bb open needs 65.5% folds as a bluff. Most live 3bets should be value.',
          'A called 3bet in a 100bb straddled pot leaves an SPR near 2. One pair often commits.',
          '4bets there are close to all in. Shove or fold instead of 4betting small.',
        ],
      },
    ],
  },
  {
    key: 'preflop/live-preflop/limp-reraise',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'ring', value: 13 / 37.5, label: 'Equity to call', caption: 'A limp reraise to 18bb over your 5bb raise' },
    steps: [
      {
        kind: 'intro',
        title: 'The limper woke up',
        body: 'You raised a limper and they reraised. In most live games that line means a very strong hand. Treat it as a read, and check it against your logs.',
      },
      {
        kind: 'visual',
        title: 'Limp, raise and reraise',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['UTG+1'], note: 'UTG+1 limps, then reraises to 18bb' },
        caption: 'UTG+1 limped. You iso raised to 5bb from the cutoff and the blinds folded. UTG+1 reraised to 18bb.',
      },
      {
        kind: 'visual',
        title: 'Your price',
        art: { kind: 'ring', value: 13 / 37.5, label: 'Equity to call', caption: 'A limp reraise to 18bb over your 5bb raise' },
        caption: 'The pot holds 18 + 5 + 1.5 = 24.5bb. You call 13bb, so you need **34.7%** raw equity. After a call the SPR (stack to pot ratio) is about 2.2.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Against QQ+ and AK',
        columns: ['Your hand', 'Equity', 'Usually'],
        rows: [
          ['K♠K♦', '57%', 'Shove or call'],
          ['J♠J♦', '36%', 'Close. Call, do not shove'],
          ['A♥Q♥', '29%', 'Fold'],
          ['A♥Q♣', '24%', 'Fold'],
        ],
        note: 'We estimate these from simulated runouts against QQ+ and AK. A JJ shove gets called by that whole range. Then it needs 47.1% and has only 36%.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why AQ folds',
        body: [
          'AQ is dominated by AK and behind every pair in the range. Even suited it has only about 29%.',
          'JJ is close. It has about 36% against the range, just above the price.',
          'Small pairs need to win a stack when they hit. At an SPR near 2 there is not enough behind to pay for the misses.',
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Set mining a limp reraise',
        formula: '0.118 × 119.5 − 13 ≈ +1bb',
        parts: [
          ['Chance of a set or better', '11.8%'],
          ['Pot after your call plus their stack', '37.5 + 82 = 119.5bb'],
          ['Your call', '13bb'],
        ],
        example: 'This assumes you win the whole stack every time you flop a set and never win otherwise. Real sets do not always get paid. So small pairs are close to a fold.',
      },
      {
        kind: 'hand',
        title: 'A clear fold',
        cards: 'AhQh',
        caption: 'A♥Q♥ looks strong. Against QQ+ and AK it has about 29%. That is below the 34.7% price.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'The range is a read',
        body: 'QQ+ and AK is a common live read, not a solver range. Some players limp reraise with hands like AJs or 99. If your logs show that, call wider. Against an unknown player, assume QQ+ and AK.',
      },
      {
        kind: 'quiz',
        question: 'UTG+1 limps and you iso raise to 5bb. The blinds fold and the limper reraises to 18bb. What raw equity does a call need?',
        choices: ['26.5%', '34.7%', '42%'],
        answer: 1,
        explain: 'The pot holds 18 + 5 + 1.5 = 24.5bb. You call 13bb, so 13 ÷ 37.5 = 34.7%.',
        point: 0,
        variants: [
          {
            question: 'A player limps and you iso raise to 6bb on the button. The blinds fold and the limper reraises to 20bb. What raw equity does a call need?',
            choices: ['25%', '33.7%', '41%'],
            explain: 'The pot holds 20 + 6 + 1.5 = 27.5bb. You call 14bb, so 14 ÷ 41.5 = 33.7%.',
          },
          {
            question: 'Two players limp and you iso raise to 7bb. The blinds fold. The first limper reraises to 25bb and the other folds. What raw equity does a call need?',
            choices: ['28%', '34.3%', '42%'],
            explain: 'The pot holds 25 + 7 + 1 + 1.5 = 34.5bb, counting the other limper’s 1bb. You call 18bb, so 18 ÷ 52.5 = 34.3%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You iso raise and face a limp reraise from an unknown live player. Which hand most clearly folds?',
        choiceCards: ['AhQh', 'KsKd', 'JsJd'],
        choices: ['A♥Q♥', 'K♠K♦', 'J♠J♦'],
        answer: 0,
        explain: 'Against QQ+ and AK, AQs has about 29% and the call needs 34.7%. JJ is close with about 36%. KK is far ahead.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'Why does 44 struggle to call a limp reraise to 18bb at 100bb?',
        cards: '4s4c',
        choices: ['Too little money is left behind to pay for missed flops', '44 is behind every hand in the range', 'Sets never get paid'],
        answer: 0,
        explain: 'At an SPR near 2, winning a whole stack with a set barely pays for the misses. Real sets do not always get paid. 44 is not behind AK, which is close to a coin flip.',
        point: 2,
        shuffleSuits: true,
      },
      {
        kind: 'takeaway',
        points: [
          'Calling a limp reraise to 18bb over your 5bb raise needs 34.7% raw equity.',
          'Read the line as QQ+ and AK. AQ folds and JJ is close.',
          'Small pairs lack the money behind to set mine at an SPR near 2.',
        ],
      },
    ],
  },
  {
    key: 'preflop/live-preflop/live-3bets',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'bars',
      bars: [
        { label: '100bb', value: 2.7, tone: 'red' },
        { label: '150bb', value: 4.3, tone: 'brass' },
        { label: '250bb', value: 7.5, tone: 'green' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'The 5bb open',
        body: 'Live players often open to 5bb or more. A 3bet over that is big too. The stacks behind decide how the hand plays.',
      },
      {
        kind: 'visual',
        title: 'A big live open',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BTN', highlight: ['HJ'], note: 'HJ opens 5bb' },
        caption: 'The HJ opened to 5bb and it folded to you on the button. A 3bet in position is about 3 times the open, so 15bb.',
      },
      {
        kind: 'visual',
        title: 'About 70% folds against big opens',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '5bb open, 3bet to 15bb', value: 69.8, tone: 'brass' },
            { label: '6bb open, 3bet to 18bb', value: 70.6, tone: 'brass' },
            { label: '8bb open, 3bet to 24bb', value: 71.6, tone: 'brass' },
          ],
        },
        caption: 'Folds a pure bluff 3bet needs, with the blinds’ 1.5bb in the pot. A 3bet to 3 times a big open needs about **70%**. Live players rarely fold that much.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'SPR after a called 3bet to 15bb',
        columns: ['Stacks', 'Pot', 'Behind', 'SPR'],
        rows: [
          ['100bb', '31.5bb', '85bb', '2.7'],
          ['150bb', '31.5bb', '135bb', '4.3'],
          ['250bb', '31.5bb', '235bb', '7.5'],
        ],
        note: 'A 5bb open gets a 3bet to 15bb and a call. The blinds folded. Exact math.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Two games in one',
        body: [
          'At 100bb a called 3bet leaves an SPR near 3. Top pair often goes all in, so 3bet hands that make strong top pairs.',
          'At 250bb the SPR is about 7.5. Big pots need stronger hands, and position matters more.',
          'Deep, cold call more pairs and suited hands in position. 3bet the hands that dominate the opener.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A value 3bet at 100bb',
        cards: 'AsJs',
        caption: 'At 100bb A♠J♠ 3bets a loose 5bb open for value. It makes top pairs that are happy to go all in at an SPR near 3.',
      },
      {
        kind: 'hand',
        title: 'Deep and in position',
        cards: '9h8h',
        caption: 'At 250bb 9♥8♥ can cold call a 5bb open on the button. Deep stacks pay off its straights and flushes.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Who opens big',
        body: 'Some live players open big only with strong hands. Others open big with everything. Against the first group, 3bet only premiums. Against the second, 3bet wider for value.',
      },
      {
        kind: 'quiz',
        question: 'The HJ opens to 5bb and you 3bet the button to 15bb as a pure bluff. How often must everyone fold?',
        choices: ['55%', '69.8%', '85%'],
        answer: 1,
        explain: 'The pot holds 5 + 0.5 + 1 = 6.5bb. You risk 15bb, so 15 ÷ 21.5 = 69.8%.',
        point: 0,
        variants: [
          {
            question: 'The CO opens to 8bb and you 3bet the button to 24bb as a pure bluff. How often must everyone fold?',
            choices: ['60%', '71.6%', '85%'],
            explain: 'The pot holds 8 + 1.5 = 9.5bb. You risk 24bb, so 24 ÷ 33.5 = 71.6%.',
          },
          {
            question: 'UTG+2 opens to 6bb and you 3bet the cutoff to 18bb as a pure bluff. How often must everyone fold?',
            choices: ['60%', '70.6%', '80%'],
            explain: 'The pot holds 6 + 1.5 = 7.5bb. You risk 18bb, so 18 ÷ 25.5 = 70.6%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Stacks are 250bb. The HJ opens to 5bb, you 3bet to 15bb and the HJ calls. What is the flop SPR?',
        choices: ['About 2.7', 'About 7.5', 'About 15'],
        answer: 1,
        explain: 'The pot is 15 + 15 + 1.5 = 31.5bb with 235bb behind. 235 ÷ 31.5 = 7.5.',
        point: 1,
        variants: [
          {
            question: 'Stacks are 100bb. The HJ opens to 5bb, you 3bet to 15bb and the HJ calls. What is the flop SPR?',
            choices: ['About 2.7', 'About 5', 'About 7.5'],
            answer: 0,
            explain: 'The pot is 31.5bb with 85bb behind. 85 ÷ 31.5 = 2.7.',
          },
          {
            question: 'Stacks are 150bb. The HJ opens to 5bb, you 3bet to 15bb and the HJ calls. What is the flop SPR?',
            choices: ['About 2.7', 'About 4.3', 'About 7.5'],
            explain: 'The pot is 31.5bb with 135bb behind. 135 ÷ 31.5 = 4.3.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Stacks are 250bb and a loose player opens to 5bb. On the button, which hand prefers to call over a 3bet?',
        choiceCards: ['9h8h', 'AdKc', 'QsQc'],
        choices: ['9♥8♥', 'A♦K♣', 'Q♠Q♣'],
        answer: 0,
        explain: 'Deep stacks pay off straights and flushes. AK and QQ 3bet for value, since they dominate a loose range.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['AhAc', '6d6s', 'KsQs'],
            choices: ['A♥A♣', '6♦6♠', 'K♠Q♠'],
            answer: 1,
            explain: 'Deep stacks pay off sets, and position helps them get paid. AA and KQs 3bet for value against a loose open.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'A 3bet to 3 times a big open needs about 70% folds as a bluff. Live 3bets should be mostly value.',
          'Depth changes the plan. A called 3bet to 15bb leaves an SPR of 2.7 at 100bb and 7.5 at 250bb.',
          'Deep, call more pairs and suited hands in position. 3bet hands that dominate.',
        ],
      },
    ],
  },
];

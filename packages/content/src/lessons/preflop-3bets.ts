import type { LessonContent } from './types';

/**
 * 3bet and 4bet pots before the flop: facing 3bets in and out of position,
 * facing 4bets, how stack depth turns a 4bet into a shove, and the two blind
 * vs blind spots after a raise or a limp. Prices, SPRs and combo counts are
 * exact and recomputed in thin-spots.test.ts.
 */
export const PREFLOP_3BET_LESSONS: LessonContent[] = [
  {
    key: 'preflop/3bet-pots/vs-3bet-oop',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'ring', value: 5 / 16.5, label: 'Equity to call', caption: 'CO against a button 3bet to 7.5bb' },
    steps: [
      {
        kind: 'intro',
        title: 'The 3bet came from behind you',
        body: 'You opened and a player behind you 3bet. Now you play the rest of the hand out of position. You get a good price, but you keep less of your equity.',
      },
      {
        kind: 'visual',
        title: 'The button 3bets the cutoff',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN'], note: 'BTN 3bets to 7.5bb' },
        caption: 'You opened the cutoff to 2.5bb. The button 3bet to 7.5bb and the blinds folded. The button acts after you on every street.',
      },
      {
        kind: 'table',
        title: 'The price out of position',
        columns: ['3bet size', 'You call', 'Pot after', 'Needs'],
        rows: [
          ['7.5bb', '5bb', '16.5bb', '30.3%'],
          ['9bb', '6.5bb', '19.5bb', '33.3%'],
        ],
        note: 'Your open is 2.5bb and the blinds folded. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why you fold more',
        body: [
          'Out of position you act first on every street. The 3bettor sees your move before it chooses.',
          'Hands that need to see cards cheaply suffer most. Small pairs and weak suited connectors lose the most value.',
          'Strong hands do not mind. AQs and KQs call, and the best hands 4bet.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Which hands lose the most',
        art: {
          kind: 'tree',
          root: 'Out of position facing a 3bet',
          branches: [
            { label: 'Small pairs', value: 'Often fold', tone: 'gray' },
            { label: 'Offsuit broadways', value: 'Mostly fold', tone: 'gray' },
            { label: 'Suited broadways', value: 'Call', tone: 'green' },
          ],
        },
        caption: 'Hands that make strong top pairs and nut draws keep their value. Hands that need a set or a free card lose it.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'SPR after the call',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 16.5 },
            { label: 'Behind', bb: 92.5 },
          ],
        },
        caption: 'You call the 3bet to 7.5bb. The pot is 16.5bb with 92.5bb behind, an SPR (stack to pot ratio) of **5.6**. At that SPR one pair needs care out of position.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'A pair that struggles',
        cards: '5c5d',
        caption: '5♣5♦ flops a set 11.8% of the time. Out of position it often cannot win enough when it hits to pay for the misses.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live button 3bets',
        body: 'Many live players 3bet the button only with big pairs and AK. Against them, fold more of your offsuit hands. Sets still get paid by big pairs. So keep pairs when stacks are deep.',
      },
      {
        kind: 'quiz',
        question: 'You open the CO to 2.5bb and the button 3bets to 7.5bb. The blinds fold. What raw equity does a call need?',
        choices: ['25%', '30.3%', '37.8%'],
        answer: 1,
        explain: 'The pot holds 7.5 + 2.5 + 1.5 = 11.5bb. You call 5bb, so 5 ÷ 16.5 = 30.3%. 37.8% is the button’s price against a big blind 3bet to 11bb.',
        point: 0,
        variants: [
          {
            question: 'You open the HJ to 2.5bb and the cutoff 3bets to 9bb. Everyone else folds. What raw equity does a call need?',
            choices: ['30.3%', '33.3%', '40%'],
            explain: 'The pot holds 9 + 2.5 + 1.5 = 13bb. You call 6.5bb, so 6.5 ÷ 19.5 = 33.3%. A bigger 3bet gives you a worse price.',
          },
          {
            question: 'You open UTG to 3bb and the LJ 3bets to 9bb. Everyone else folds. What raw equity does a call need?',
            choices: ['26.7%', '30.8%', '40%'],
            explain: 'The pot holds 9 + 3 + 1.5 = 13.5bb. You call 6bb, so 6 ÷ 19.5 = 30.8%.',
          },
          {
            question: 'You open UTG+1 to 2.5bb and the HJ 3bets to 7.5bb. Everyone else folds. What raw equity does a call need?',
            explain: 'The pot holds 7.5 + 2.5 + 1.5 = 11.5bb. You call 5bb, so 5 ÷ 16.5 = 30.3%. Out of position against the HJ, you keep less of that equity.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Facing a 3bet out of position, which hand loses the most value?',
        choiceCards: ['4s4c', 'AhQh', 'KsKd'],
        choices: ['4♠4♣', 'A♥Q♥', 'K♠K♦'],
        answer: 0,
        explain: 'Small pairs need to hit a set and get paid. Out of position that is harder. AQs plays well when called and KK 4bets.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['KcQc', '6d5d', 'AsAh'],
            choices: ['K♣Q♣', '6♦5♦', 'A♠A♥'],
            answer: 1,
            explain: 'Weak suited connectors need cheap cards and position. Out of position they lose the most. KQs calls and AA 4bets.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You call a 3bet to 7.5bb with 100bb stacks. What is the SPR on the flop?',
        choices: ['About 2', 'About 4', 'About 5.6', 'About 9'],
        answer: 2,
        explain: 'The pot is 7.5 + 7.5 + 1.5 = 16.5bb with 92.5bb behind. 92.5 ÷ 16.5 = 5.6.',
        point: 2,
        variants: [
          {
            question: 'You call a 3bet to 9bb with 100bb stacks. What is the SPR on the flop?',
            choices: ['About 2.5', 'About 4.7', 'About 7'],
            answer: 1,
            explain: 'The pot is 9 + 9 + 1.5 = 19.5bb with 91bb behind. 91 ÷ 19.5 = 4.7.',
          },
          {
            question: 'You call a 3bet to 7.5bb with 200bb stacks. What is the SPR on the flop?',
            choices: ['About 5.6', 'About 11.7', 'About 20'],
            answer: 1,
            explain: 'The pot is 16.5bb with 192.5bb behind. 192.5 ÷ 16.5 = 11.7. Deep stacks give pairs and suited hands more to win.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'Out of position against a 3bet to 7.5bb, a call needs 30.3% raw equity. The price is good.',
          'You keep less of your equity out of position. Small pairs and weak suited hands fold more.',
          'A called 3bet to 7.5bb leaves an SPR of 5.6.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/vs-3bet-ip',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'ring', value: 8.5 / 23, label: 'Equity to call', caption: 'CO against a small blind 3bet to 11bb' },
    steps: [
      {
        kind: 'intro',
        title: 'The 3bet came from the blinds',
        body: 'A player in the blinds 3bet your open. They are out of position, so they 3bet big. You pay more to call, but you keep position for the whole hand.',
      },
      {
        kind: 'visual',
        title: 'The small blind 3bets the cutoff',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['SB'], note: 'SB 3bets to 11bb' },
        caption: 'You opened the cutoff. The small blind 3bet to 11bb and the big blind folded. You act after the small blind on every street.',
      },
      {
        kind: 'table',
        title: 'The price in position',
        columns: ['Spot', 'You call', 'Pot after', 'Needs'],
        rows: [
          ['BTN vs BB 3bet to 11bb', '8.5bb', '22.5bb', '37.8%'],
          ['CO vs SB 3bet to 11bb', '8.5bb', '23bb', '37%'],
          ['HJ vs BB 3bet to 12bb', '9.5bb', '24.5bb', '38.8%'],
        ],
        note: 'Opens of 2.5bb and other players folded. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why you can call more',
        body: [
          'The price is worse than out of position. But you act last on every street, so you keep more of your equity.',
          'Suited connectors and pairs gain the most. They can float and win big pots when they hit.',
          'Weak offsuit hands still fold. Position does not fix being dominated.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Your options in position',
        art: {
          kind: 'tree',
          root: 'Facing a blind 3bet in position',
          branches: [
            { label: '4bet', value: 'QQ+, AK and A5s', tone: 'purple' },
            { label: 'Call', value: 'Pairs and suited hands', tone: 'green' },
            { label: 'Fold', value: 'Weak offsuit hands', tone: 'gray' },
          ],
        },
        caption: 'In position some QQ and AK also call. A call keeps the 3bettor’s bluffs in, and position helps you play the flop.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A call in position',
        cards: '7h6h',
        caption: '7♥6♥ calls a blind 3bet in position more often than out of position. It flops draws often and can bluff when the 3bettor checks.',
      },
      {
        kind: 'visual',
        title: 'SPR after the call',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 23 },
            { label: 'Behind', bb: 89 },
          ],
        },
        caption: 'You call the small blind’s 3bet to 11bb. The pot is 23bb with 89bb behind, an SPR (stack to pot ratio) of **3.9**. Top pair with a good kicker often plays for stacks here.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Blind 3bets live',
        body: 'Live players in the blinds often 3bet only premiums. Against them, fold hands like AJs and KQo that get dominated. Pairs and suited connectors can still call when stacks are deep. They win big pots against overpairs.',
      },
      {
        kind: 'quiz',
        question: 'You open the cutoff to 2.5bb. The small blind 3bets to 11bb and the big blind folds. What raw equity does a call need?',
        choices: ['30.3%', '37%', '43.6%'],
        answer: 1,
        explain: 'The pot holds 11 + 2.5 + 1 = 14.5bb, since the big blind’s 1bb stays in. You call 8.5bb, so 8.5 ÷ 23 = 37%.',
        point: 0,
        variants: [
          {
            question: 'You open the HJ to 2.5bb. The big blind 3bets to 12bb and everyone else folds. What raw equity does a call need?',
            choices: ['33.3%', '38.8%', '45%'],
            explain: 'The pot holds 12 + 2.5 + 0.5 = 15bb. You call 9.5bb, so 9.5 ÷ 24.5 = 38.8%. Bigger 3bets from the blinds make the call cost more.',
          },
          {
            question: 'You open the button to 2bb. The big blind 3bets to 10bb and the small blind folded. What raw equity does a call need?',
            choices: ['33.3%', '39%', '44%'],
            explain: 'The pot holds 10 + 2 + 0.5 = 12.5bb. You call 8bb, so 8 ÷ 20.5 = 39%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'In position facing a blind 3bet, which hand gains the most from position?',
        choiceCards: ['7h6h', 'KdJc', 'Ad3c'],
        choices: ['7♥6♥', 'K♦J♣', 'A♦3♣'],
        answer: 0,
        explain: 'Suited connectors flop draws and can bluff when checked to. KJo and A3o are dominated, so position does not save them.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['QhTd', '5s5c', 'Kc4c'],
            choices: ['Q♥T♦', '5♠5♣', 'K♣4♣'],
            answer: 1,
            explain: 'Small pairs make sets that win big pots, and position helps them get paid. QTo and K4s make dominated pairs, so they fold.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You open the cutoff and call a small blind 3bet to 11bb. Stacks are 100bb. What is the flop SPR?',
        choices: ['About 2', 'About 3.9', 'About 5.6'],
        answer: 1,
        explain: 'The pot is 11 + 11 + 1 = 23bb with 89bb behind. 89 ÷ 23 = 3.9.',
        point: 2,
        variants: [
          {
            question: 'You open the HJ and call a big blind 3bet to 12bb. Stacks are 100bb. What is the flop SPR?',
            choices: ['About 2.5', 'About 3.6', 'About 5.6'],
            explain: 'The pot is 12 + 12 + 0.5 = 24.5bb with 88bb behind. 88 ÷ 24.5 = 3.6.',
          },
          {
            question: 'You open the cutoff and call a small blind 3bet to 11bb. Stacks are 200bb. What is the flop SPR?',
            choices: ['About 3.9', 'About 8.2', 'About 16'],
            explain: 'The pot is 23bb with 189bb behind. 189 ÷ 23 = 8.2. Deep, more hands can call in position.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'Blind 3bets are big. Calling in position needs about 37% to 39% raw equity.',
          'Position lets pairs and suited connectors call. Weak offsuit hands still fold.',
          'A called 3bet to 11bb leaves an SPR near 4.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/facing-4bet',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'ring', value: 13 / 48.5, label: 'Equity to call', caption: 'Your 11bb 3bet faces a 4bet to 24bb' },
    steps: [
      {
        kind: 'intro',
        title: 'Your 3bet got 4bet',
        body: 'You 3bet and the opener raised again. At 100bb the 4bet alone is about a quarter of a stack. Most of your bluffs fold. Your best hands go all in.',
      },
      {
        kind: 'visual',
        title: 'The button 4bets the big blind',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['BTN'], note: 'BTN 4bets to 24bb' },
        caption: 'The button opened 2.5bb. You 3bet to 11bb from the big blind and the button 4bet to 24bb. The pot is **35.5bb** and you need 13bb more to call.',
      },
      {
        kind: 'table',
        title: 'The prices',
        columns: ['Action', 'Money in', 'Needs'],
        rows: [
          ['You call the 4bet', '13bb into 35.5bb', '26.8%'],
          ['They call your 5bet shove', '76bb into 124.5bb', '37.9%'],
        ],
        note: 'Exact math at 100bb. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'After you call',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 48.5 },
            { label: 'Behind', bb: 76 },
          ],
        },
        caption: 'After a call the pot is 48.5bb with 76bb behind. That is an SPR (stack to pot ratio) of **1.6**. Most flops commit one of you.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Equity against a 4bet range',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Q♠Q♦', value: 46, tone: 'green' },
            { label: 'A♠K♦', value: 45, tone: 'green' },
            { label: 'J♠J♦', value: 42, tone: 'brass' },
            { label: 'A♥Q♥', value: 37, tone: 'gray' },
          ],
        },
        caption: 'Each hand against QQ+ and AK plus A5s and A4s as bluffs. We estimate these from simulated runouts. All clear 26.8%, but a shove after the flop is another story.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Your options',
        columns: ['Action', 'Typical hands'],
        rows: [
          ['5bet all in', 'KK+, plus some QQ and AK'],
          ['Call', 'JJ and AQs, plus some QQ and AK'],
          ['Fold', 'Your 3bet bluffs and weaker value'],
        ],
        note: 'Directional, at 100bb against a typical 4bet range. Against a tight 4bettor, fold QQ and AK more.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A 5bet bluff fails',
        cards: 'As5s',
        caption: 'With A♠5♠ in your hand, that 4bet range holds 33 combos. If only A5s and A4s fold, that is 6 combos or about 18%. A bluff shove needs 71.5%.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 4bets',
        body: 'In many live games a 4bet means AA or KK. Against those players, fold QQ and AK more often. Never 5bet bluff a player who rarely 4bets.',
      },
      {
        kind: 'quiz',
        question: 'You 3bet to 11bb from the big blind. The button 4bets to 24bb. What raw equity does a call need?',
        choices: ['18.6%', '26.8%', '35.5%'],
        answer: 1,
        explain: 'The pot holds 24 + 11 + 0.5 = 35.5bb. You call 13bb, so 13 ÷ 48.5 = 26.8%. The price looks cheap, but the SPR after the call is only 1.6.',
        point: 0,
        variants: [
          {
            question: 'You 3bet to 7.5bb on the button. The cutoff 4bets to 22bb and the blinds fold. What raw equity does a call need?',
            choices: ['26.8%', '31.9%', '40%'],
            explain: 'The pot holds 22 + 7.5 + 1.5 = 31bb. You call 14.5bb, so 14.5 ÷ 45.5 = 31.9%. A big 4bet out of position gives you a worse price.',
          },
          {
            question: 'You 3bet to 12bb from the small blind. The HJ 4bets to 26bb and the big blind folds. What raw equity does a call need?',
            choices: ['26.4%', '35%', '42%'],
            answer: 0,
            explain: 'The pot holds 26 + 12 + 1 = 39bb. You call 14bb, so 14 ÷ 53 = 26.4%.',
          },
          {
            question: 'You 3bet to 8bb in the LJ over a UTG+1 open. UTG+1 4bets to 20bb and everyone else folds. What raw equity does a call need?',
            choices: ['22%', '28.9%', '36%'],
            explain: 'The pot holds 20 + 8 + 1.5 = 29.5bb. You call 12bb, so 12 ÷ 41.5 = 28.9%. You have position, which helps the call.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You 3bet A♠5♠ as a bluff and the opener 4bets. What do you usually do?',
        cards: 'As5s',
        choices: ['Fold', 'Call to see a flop', '5bet all in'],
        answer: 0,
        explain: 'A 5bet bluff needs about 71.5% folds. If only A5s and A4s fold, you get about 18%. A call at an SPR near 1.6 leaves you facing a shove on most flops.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'Facing a 4bet at 100bb, which hand most clearly goes all in?',
        choiceCards: ['KhKd', 'JsJc', 'AdQd'],
        choices: ['K♥K♦', 'J♠J♣', 'A♦Q♦'],
        answer: 0,
        explain: 'KK has about 57% against QQ+ and AK and never wants to fold. JJ and AQs do poorly against the hands that call a shove. They mostly call or fold.',
        point: 2,
        shuffleSuits: true,
      },
      {
        kind: 'takeaway',
        points: [
          'Calling a 4bet to 24bb after your 11bb 3bet needs 26.8% raw equity. The SPR after is about 1.6.',
          'Fold your 3bet bluffs. A 5bet bluff at 100bb needs about 71.5% folds.',
          'Shove KK+ and mix QQ and AK. Call some JJ and AQs, and fold the rest.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/4bet-depth',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'bars',
      bars: [
        { label: '40bb', value: 0.3, tone: 'red' },
        { label: '100bb', value: 1.6, tone: 'brass' },
        { label: '200bb', value: 2.8, tone: 'green' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Short stacks skip a step',
        body: 'At 100bb a 4bet leaves a little room to play. With shorter stacks it leaves none. Then the 4bet is simply all in.',
      },
      {
        kind: 'visual',
        title: 'SPR after a called 4bet',
        art: {
          kind: 'bars',
          bars: [
            { label: '40bb, 4bet to 24bb', value: 0.3, tone: 'red' },
            { label: '60bb, 4bet to 24bb', value: 0.7, tone: 'red' },
            { label: '100bb, 4bet to 24bb', value: 1.6, tone: 'brass' },
            { label: '200bb, 4bet to 30bb', value: 2.8, tone: 'green' },
          ],
        },
        caption: 'The button opened 2.5bb, the big blind 3bet to 11bb and the small blind folded. Each bar is the flop SPR (stack to pot ratio) after the 4bet is called.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why a small 4bet makes no sense short',
        body: [
          'At 40bb a 4bet to 24bb puts 60% of your stack in. You can never fold after that.',
          'So shove instead. Then the 3bettor must decide for the whole stack right now.',
          'At 200bb the 4bet can stay small. Both players still have room to play after the flop.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Calling a 40bb shove',
        formula: '29 ÷ (51.5 + 29) = 36%',
        parts: [
          ['Pot before you call', '40 + 11 + 0.5 = 51.5bb'],
          ['You call', '29bb more'],
        ],
        example: 'At 40bb you 3bet to 11bb and the button shoves. You need **36%** equity to call. A5s has about 30% against QQ+ and AK, so it folds.',
      },
      {
        kind: 'hand',
        title: 'Shove or fold at 40bb',
        cards: 'AhJh',
        caption: 'At 40bb A♥J♥ can 4bet shove over a wide late 3bet. At 100bb it would rather call or fold.',
      },
      {
        kind: 'visual',
        title: 'At 200bb, room to play',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 60.5 },
            { label: 'Behind', bb: 170 },
          ],
        },
        caption: 'At 200bb the button 4bets to 30bb and gets called. The pot is 60.5bb with 170bb behind. That SPR of **2.8** leaves room for a flop bet and more.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Depth and the 4bet',
        columns: ['Stacks', '4bet', 'Bluffs'],
        rows: [
          ['40bb', 'All in', 'Few, with blockers like A5s'],
          ['60bb', 'Mostly all in', 'Few'],
          ['100bb', 'About 2.2x the 3bet', 'Suited wheel aces'],
          ['200bb', 'Small, about 2.5x', 'More, and more calls too'],
        ],
        note: 'Directional, in line with solver outputs for late position 3bet pots.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Count your stack first',
        body: 'Before you 3bet, check how deep you are. If a 4bet would leave you committed, plan to shove or fold before you act.',
      },
      {
        kind: 'quiz',
        question: 'Stacks are 60bb. You 3bet to 11bb and the button 4bets to 24bb. If you call, what is the flop SPR?',
        choices: ['About 0.7', 'About 1.6', 'About 3'],
        answer: 0,
        explain: 'The pot is 24 + 24 + 0.5 = 48.5bb with 36bb behind. 36 ÷ 48.5 = 0.7. At that SPR you are committed, so shove or fold instead.',
        point: 0,
        variants: [
          {
            question: 'Stacks are 40bb. You 3bet to 11bb and the button 4bets to 24bb. If you call, what is the flop SPR?',
            choices: ['About 0.3', 'About 0.7', 'About 1.6'],
            explain: 'The pot is 48.5bb with 16bb behind. 16 ÷ 48.5 = 0.3. A 4bet that small at 40bb should just be a shove.',
          },
          {
            question: 'Stacks are 150bb. You 3bet to 11bb and the button 4bets to 27bb. If you call, what is the flop SPR?',
            choices: ['About 1.6', 'About 2.3', 'About 4'],
            answer: 1,
            explain: 'The pot is 27 + 27 + 0.5 = 54.5bb with 123bb behind. 123 ÷ 54.5 = 2.3. Deeper stacks leave room to play after the flop.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'At 40bb you 3bet to 11bb and the button shoves. What equity do you need to call?',
        choices: ['29%', '36%', '45%'],
        answer: 1,
        explain: 'The pot holds 40 + 11 + 0.5 = 51.5bb. You call 29bb, so 29 ÷ 80.5 = 36%.',
        point: 1,
        variants: [
          {
            question: 'At 30bb you 3bet to 9bb and the button shoves. What equity do you need to call?',
            choices: ['30%', '34.7%', '42%'],
            explain: 'The pot holds 30 + 9 + 0.5 = 39.5bb. You call 21bb, so 21 ÷ 60.5 = 34.7%.',
          },
          {
            question: 'At 50bb you 3bet to 11bb from the small blind and the cutoff shoves. The big blind folded. What equity do you need to call?',
            choices: ['31%', '38.6%', '45%'],
            explain: 'The pot holds 50 + 11 + 1 = 62bb. You call 39bb, so 39 ÷ 101 = 38.6%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'At 40bb the big blind 3bets your button open. You want to 4bet. What size do you use?',
        choices: ['2.2 times the 3bet', 'All in', 'The minimum raise'],
        answer: 1,
        explain: 'Any real 4bet commits most of a 40bb stack. A shove gets the same folds and never leaves you stuck. At 100bb a 4bet to about 2.2 times the 3bet still leaves a little room.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A called 4bet to 24bb leaves an SPR of 1.6 at 100bb and under 1 at 60bb.',
          'At 40bb a 3bet that faces a shove needs 36% to call. Most bluffs fold.',
          'Short stacks 4bet all in. Deep stacks 4bet small and keep playing.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/sb-vs-bb-3bet',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'SB', highlight: ['BB'], note: 'BB 3bets to 9bb' },
    steps: [
      {
        kind: 'intro',
        title: 'Blind vs blind, one more raise',
        body: 'The small blind raised and the big blind 3bet. Both ranges are wide. The small blind is out of position, but it cannot fold too much.',
      },
      {
        kind: 'visual',
        title: 'The big blind fights back',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'SB', highlight: ['BB'], note: 'BB 3bets to 9bb' },
        caption: 'Everyone folded to you. You raised to 3bb and the big blind 3bet to 9bb. The big blind has position for the rest of the hand.',
      },
      {
        kind: 'formula',
        title: 'What a 3bet bluff needs',
        formula: '8 ÷ (8 + 4) = 66.7%',
        parts: [
          ['The big blind adds', '9 − 1 = 8bb'],
          ['To win', '3 + 1 = 4bb'],
        ],
        example:
          'A no equity 3bet to 9bb needs **66.7%** folds. So the small blind should continue with about a third of its raises or more. Fold more and the big blind profits with any two cards.',
      },
      {
        kind: 'table',
        title: 'The price to call',
        columns: ['3bet', 'You call', 'Pot after', 'Needs'],
        rows: [
          ['8bb over 2.5bb', '5.5bb', '16bb', '34.4%'],
          ['9bb over 3bb', '6bb', '18bb', '33.3%'],
          ['10bb over 3bb', '7bb', '20bb', '35%'],
        ],
        note: 'Blind vs blind with no other money in the pot. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How the small blind continues',
        body: [
          'The big blind 3bets a wide range here. So the small blind calls with many hands that would fold to a tight 3bet.',
          'Pairs, suited aces and suited broadways call. Strong hands 4bet, and so do some blocker bluffs.',
          'The weakest offsuit hands fold. They play badly out of position.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A call blind vs blind',
        cards: 'KhTh',
        caption: 'K♥T♥ folds to a tight 3bet from an early seat. Blind vs blind it calls a wide 3bet.',
      },
      {
        kind: 'visual',
        title: 'SPR after the call',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 18 },
            { label: 'Behind', bb: 91 },
          ],
        },
        caption: 'You call the 3bet to 9bb. The pot is 18bb with 91bb behind, an SPR (stack to pot ratio) of **5.1**. You act first on every street.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live blind battles',
        body: 'Many live big blinds rarely 3bet the small blind. When they do, it is mostly value. Against them, fold more of your weak hands. Against an aggressive big blind, defend wider.',
      },
      {
        kind: 'quiz',
        question: 'The big blind 3bets your 3bb small blind raise to 9bb. How often must you fold for a no equity 3bet to break even?',
        choices: ['50%', '66.7%', '75%'],
        answer: 1,
        explain: 'The big blind adds 8bb to win the 4bb in the pot. So 8 ÷ 12 = 66.7%. Fold more than that and any two cards profit.',
        point: 0,
        variants: [
          {
            question: 'The big blind 3bets your 2.5bb small blind raise to 8bb. How often must you fold for a no equity 3bet to break even?',
            explain: 'The big blind adds 7bb to win the 3.5bb in the pot. So 7 ÷ 10.5 = 66.7%. Three times the raise gives the same share.',
          },
          {
            question: 'The big blind 3bets your 3bb small blind raise to 10bb. How often must you fold for a no equity 3bet to break even?',
            choices: ['50%', '69.2%', '75%'],
            explain: 'The big blind adds 9bb to win the 4bb in the pot. So 9 ÷ 13 = 69.2%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You raise to 3bb from the small blind. The big blind 3bets to 9bb. What raw equity does a call need?',
        choices: ['25%', '33.3%', '40%'],
        answer: 1,
        explain: 'The pot holds 9 + 3 = 12bb. You call 6bb, so 6 ÷ 18 = 33.3%.',
        point: 1,
        variants: [
          {
            question: 'You raise to 2.5bb from the small blind. The big blind 3bets to 8bb. What raw equity does a call need?',
            choices: ['30%', '34.4%', '40%'],
            explain: 'The pot holds 8 + 2.5 = 10.5bb. You call 5.5bb, so 5.5 ÷ 16 = 34.4%.',
          },
          {
            question: 'You raise to 3bb from the small blind. The big blind 3bets to 10bb. What raw equity does a call need?',
            choices: ['33.3%', '35%', '43%'],
            explain: 'The pot holds 10 + 3 = 13bb. You call 7bb, so 7 ÷ 20 = 35%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Blind vs blind, the big blind 3bets your raise. Which hand is the clearest fold?',
        choiceCards: ['Qc8d', '5h5d', 'KhTh'],
        choices: ['Q♣8♦', '5♥5♦', 'K♥T♥'],
        answer: 0,
        explain: 'Weak offsuit hands play badly out of position. Pairs and suited broadways call a wide 3bet.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['AsTs', 'Jd8c', '7s7c'],
            choices: ['A♠T♠', 'J♦8♣', '7♠7♣'],
            answer: 1,
            explain: 'J8o is a weak offsuit hand that plays badly out of position. ATs and 77 call a wide 3bet.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'A 3bet to 9bb over a 3bb raise needs 66.7% folds as a bluff. So keep about a third of your raises.',
          'Calling a 3bet to 9bb needs 33.3% raw equity, with an SPR of about 5.',
          'Against a wide 3bet, call pairs and suited hands. Fold the weakest offsuit hands.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/bb-vs-sb-limp',
    level: 'advanced',
    minutes: 5,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['SB'], note: 'SB limps' },
    steps: [
      {
        kind: 'intro',
        title: 'A limp from the small blind',
        body: 'It folded to the small blind and it limped. You are in the big blind with position. You can check to see a free flop or raise.',
      },
      {
        kind: 'visual',
        title: 'Two players, 2bb in the pot',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['SB'], note: 'SB limps, 2bb in the pot' },
        caption: 'The small blind completed to 1bb. The pot holds 2bb and you act last before the flop. You also act last after it.',
      },
      {
        kind: 'formula',
        title: 'Folds a raise needs',
        formula: '3 ÷ (3 + 2) = 60%',
        parts: [
          ['You add', '4 − 1 = 3bb'],
          ['To win', 'The 2bb in the pot'],
        ],
        example: 'A raise to 4bb with no equity needs **60%** folds. A raise to 3bb needs 50%. Your raises also have equity and position, so they need less.',
      },
      {
        kind: 'visual',
        title: 'The small blind’s price',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Raise to 3bb', value: 33.3, tone: 'green' },
            { label: 'Raise to 4bb', value: 37.5, tone: 'brass' },
            { label: 'Raise to 5bb', value: 40, tone: 'red' },
          ],
        },
        caption: 'Raw equity the small blind needs to call your raise. A raise to 4bb means it calls 3bb to win 5bb. That needs **37.5%**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What to raise and what to check',
        body: [
          'Raise your strong hands for value. Raise some weak hands that play badly, since folds win the pot now.',
          'Check hands that play well but do not want a big pot. Medium suited and connected hands often check.',
          'The limp range is not always weak. Solvers limp some strong hands too, so expect some fights.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Check and see a flop',
        cards: '9s7s',
        caption: '9♠7♠ often just checks. It flops well and needs no big pot to win.',
      },
      {
        kind: 'visual',
        title: 'Deep in a small pot',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 2 },
            { label: 'Behind', bb: 99 },
          ],
        },
        caption: 'After a limp and a check the pot is 2bb with 99bb behind. That SPR (stack to pot ratio) of **49.5** means one pair is rarely worth a stack.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live small blind limps',
        body: 'Many live players limp the small blind with weak hands and fold to raises. Raise them more often and bigger. If they limp and call everything, raise for value and bluff less.',
      },
      {
        kind: 'quiz',
        question: 'The small blind limps. You raise to 4bb as a bluff. How often must the small blind fold for it to break even?',
        choices: ['50%', '60%', '66.7%'],
        answer: 1,
        explain: 'You add 3bb to win the 2bb in the pot. So 3 ÷ 5 = 60%. A raise to 3bb needs only 50%.',
        point: 0,
        variants: [
          {
            question: 'The small blind limps. You raise to 3.5bb as a bluff. How often must the small blind fold for it to break even?',
            choices: ['50%', '55.6%', '62.5%'],
            explain: 'You add 2.5bb to win the 2bb in the pot. So 2.5 ÷ 4.5 = 55.6%.',
          },
          {
            question: 'The small blind limps. You raise to 5bb as a bluff. How often must the small blind fold for it to break even?',
            choices: ['60%', '66.7%', '75%'],
            explain: 'You add 4bb to win the 2bb in the pot. So 4 ÷ 6 = 66.7%. Bigger raises need more folds.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The small blind limps and you raise to 4bb. What raw equity does a small blind call need?',
        choices: ['25%', '37.5%', '50%'],
        answer: 1,
        explain: 'The small blind calls 3bb to win 5bb. So 3 ÷ 8 = 37.5%.',
        point: 1,
        variants: [
          {
            question: 'The small blind limps and you raise to 3bb. What raw equity does a small blind call need?',
            choices: ['25%', '33.3%', '40%'],
            explain: 'The small blind calls 2bb to win 4bb. So 2 ÷ 6 = 33.3%. A smaller raise gives it a better price.',
          },
          {
            question: 'The small blind limps and you raise to 5bb. What raw equity does a small blind call need?',
            choices: ['33.3%', '40%', '50%'],
            explain: 'The small blind calls 4bb to win 6bb. So 4 ÷ 10 = 40%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The small blind limps. Which hand usually checks behind?',
        choiceCards: ['9s7s', 'AhKd', 'Qc2d'],
        choices: ['9♠7♠', 'A♥K♦', 'Q♣2♦'],
        answer: 0,
        explain: 'AK raises for value. Q2o raises some of the time as a bluff, since it plays badly after the flop. 97s plays well and is happy to see a cheap flop.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['QsQd', 'Jc3h', '8h6h'],
            choices: ['Q♠Q♦', 'J♣3♥', '8♥6♥'],
            answer: 2,
            explain: 'QQ raises for value. J3o raises some of the time as a bluff, since it plays badly after the flop. 86s plays well in a small pot.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'A raise to 4bb over a limp needs 60% folds as a pure bluff.',
          'Bigger raises charge the small blind more. A raise to 4bb asks it for 37.5%.',
          'Raise strong hands and some weak ones. Check hands that play well in small pots.',
        ],
      },
    ],
  },
];

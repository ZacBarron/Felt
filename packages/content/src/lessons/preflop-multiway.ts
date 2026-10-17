import type { LessonContent } from './types';

/**
 * Multiway preflop: facing a squeeze, overcalling an open and a call, and
 * cold 4bets. Prices, combo counts and flop odds are exact and recomputed in
 * thin-spots.test.ts. Strategy claims are directional and labelled.
 */
export const PREFLOP_MULTIWAY_LESSONS: LessonContent[] = [
  {
    key: 'preflop/multiway-preflop/facing-squeeze',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN', 'BB'], note: 'BB squeezes to 13bb' },
    steps: [
      {
        kind: 'intro',
        title: 'Caught by a squeeze',
        body: 'You opened or called, and a player behind squeezed. A squeeze is a 3bet after an open and a call. Two players face it, and each must play tighter than against a plain 3bet.',
      },
      {
        kind: 'visual',
        title: 'Squeezed from the big blind',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN', 'BB'], note: 'BB squeezes to 13bb' },
        caption: 'You opened the cutoff and the button called. The big blind squeezed to 13bb. The button still acts after you.',
      },
      {
        kind: 'table',
        title: 'The price for each player',
        columns: ['Who', 'You call', 'Needs'],
        rows: [
          ['CO, the opener', '10.5bb into 18.5bb', '36.2%'],
          ['BTN after CO folds', '10.5bb into 18.5bb', '36.2%'],
          ['BTN after CO calls', '10.5bb into 29bb', '26.6%'],
        ],
        note: 'Opens of 2.5bb and a squeeze to 13bb, small blind folded. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why the opener plays tighter',
        body: [
          'The opener sits between 2 players. Even after a call, the caller behind can still 4bet.',
          'A call also leads to a 3 way pot out of position. Hands that need position lose the most.',
          'So the opener continues with fewer hands than against a plain 3bet. It 4bets the best ones and calls with strong pairs and suited broadways.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'The capped caller',
        art: {
          kind: 'tree',
          root: 'The caller faces a squeeze',
          branches: [
            { label: 'Most of the range', value: 'Folds', tone: 'gray' },
            { label: 'Pairs and suited broadways', value: 'Some calls', tone: 'green' },
            { label: 'Trapped AA and KK', value: '4bet', tone: 'purple' },
          ],
        },
        caption: 'A caller would usually 3bet its best hands, so its range is capped. It folds most of that range to a squeeze. Players who trap with AA and KK are the exception.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A fold from the button',
        cards: 'Ts9s',
        caption: 'T♠9♠ was a fine call against the open. Facing a squeeze to 13bb, it needs 36.2% equity and would play a big pot. It mostly folds.',
      },
      {
        kind: 'visual',
        title: 'If both players call',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 39.5 },
            { label: 'Behind', bb: 87 },
          ],
        },
        caption: 'If both players call the squeeze, the pot is 39.5bb with 87bb behind. That SPR (stack to pot ratio) of **2.2** is low for 3 players. Weak top pairs do badly there.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live squeezes',
        body: 'Live squeezes are often pure value. Against a player who rarely 3bets, fold even more of your opens and calls. Keep AA, KK and AK.',
      },
      {
        kind: 'quiz',
        question: 'You open the CO to 2.5bb and the button calls. The big blind squeezes to 13bb. What raw equity does your call need?',
        choices: ['26.6%', '36.2%', '45%'],
        answer: 1,
        explain: 'The pot holds 13 + 2.5 + 2.5 + 0.5 = 18.5bb. You call 10.5bb, so 10.5 ÷ 29 = 36.2%. The button still acts behind you.',
        point: 0,
        variants: [
          {
            question: 'You open the HJ to 2.5bb and the cutoff calls. The small blind squeezes to 12bb. What raw equity does your call need?',
            choices: ['26%', '34.5%', '42%'],
            explain: 'The pot holds 12 + 2.5 + 2.5 + 1 = 18bb. You call 9.5bb, so 9.5 ÷ 27.5 = 34.5%. The cutoff and the big blind still act behind you.',
          },
          {
            question: 'You call a 2.5bb LJ open on the button. The big blind squeezes to 14bb and the LJ folds. What raw equity does your call need?',
            choices: ['28%', '37.1%', '45%'],
            explain: 'The pot holds 14 + 2.5 + 2.5 + 0.5 = 19.5bb. You call 11.5bb, so 11.5 ÷ 31 = 37.1%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You called an open on the button with T♠9♠. The big blind squeezes. What do you usually do?',
        cards: 'Ts9s',
        choices: ['Fold most of the time', 'Call every time', '4bet as a bluff every time'],
        answer: 0,
        explain: 'Your call is capped, so most of your range folds to a squeeze. T9s needs a cheap pot and position to work. A squeeze takes away the cheap pot.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'You called an open on the button with 6♣6♦. The big blind squeezes. What do you usually do?',
            cards: '6c6d',
            explain: 'Small pairs need cheap pots to make sets pay. A squeeze makes the price too high for most of them. So they mostly fold.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You opened, a player called and a squeeze came behind both of you. Compared with a plain 3bet, how do you continue?',
        choices: ['Tighter, since the caller can still act', 'Wider, since there is more dead money', 'The same, since the price is the same'],
        answer: 0,
        explain: 'The caller still acts after you and can 4bet. A call also leads to a 3 way pot out of position. So continue tighter.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Facing a 13bb squeeze after a 2.5bb open and a call, a call needs 36.2% raw equity.',
          'The caller is capped, so it folds most of its range to a squeeze.',
          'The opener plays tighter than against a plain 3bet. The caller behind can still act.',
        ],
      },
    ],
  },
  {
    key: 'preflop/multiway-preflop/overcalls',
    level: 'advanced',
    minutes: 5,
    cover: { kind: 'cards', cards: '6h5h' },
    steps: [
      {
        kind: 'intro',
        title: 'A better price, more players',
        body: 'An open and a call are in front of you. Calling now is an overcall. The price is great, but you will play a pot with 3 or more players.',
      },
      {
        kind: 'visual',
        title: 'An open and a call',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['CO', 'BTN'], note: 'CO opens, BTN calls' },
        caption: 'The cutoff opened 2.5bb and the button called. In the big blind you close the action with 6.5bb in the pot.',
      },
      {
        kind: 'table',
        title: 'The price to overcall',
        columns: ['Your seat', 'You call', 'Pot after', 'Needs'],
        rows: [
          ['BB', '1.5bb', '8bb', '18.8%'],
          ['SB', '2bb', '8.5bb', '23.5%'],
          ['BTN after HJ opens and CO calls', '2.5bb', '9bb', '27.8%'],
        ],
        note: 'Opens of 2.5bb and one call. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Equity spreads thin',
        body: [
          'Each extra player takes a share of the pot. So your raw equity falls.',
          'What matters is how strong a hand you can make. Top pair with a weak kicker loses more often with more players.',
          'Pairs that make sets and suited hands that make flushes keep their value. Offsuit high cards lose the most.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Big hands on the flop',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'A pair flops a set or better', value: 11.8, tone: 'green' },
            { label: 'Two suited cards flop a flush draw or better', value: 11.8, tone: 'green' },
          ],
        },
        caption: 'Exact chances on the flop. A pocket pair flops a set or better **11.8%** of the time. Two suited cards flop a flush draw or a flush **11.8%** of the time too.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'A good overcall',
        cards: '6h5h',
        caption: '6♥5♥ in the big blind needs only 18.8% raw equity here. It makes straights and flushes that win big multiway pots.',
      },
      {
        kind: 'hand',
        title: 'A trap overcall',
        cards: 'KdTc',
        caption: 'K♦T♣ looks fine heads up. With 2 players in, it often makes top pair that is outkicked. It overcalls far less.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Overcall or squeeze',
        body: 'The dead money that makes overcalls cheap also pays for squeezes. Squeeze the hands that block big pairs or want the pot now. Overcall the hands that want a cheap flop.',
      },
      {
        kind: 'quiz',
        question: 'The CO opens 2.5bb and the button calls. What raw equity does a big blind overcall need?',
        choices: ['18.8%', '27.3%', '33.3%'],
        answer: 0,
        explain: 'You call 1.5bb to win 6.5bb. So 1.5 ÷ 8 = 18.8%. 27.3% is your price against an open with no caller.',
        point: 0,
        variants: [
          {
            question: 'The HJ opens 2.5bb and the CO calls. What raw equity does a button overcall need?',
            choices: ['18.8%', '27.8%', '38.5%'],
            answer: 1,
            explain: 'You call 2.5bb to win 6.5bb. So 2.5 ÷ 9 = 27.8%. A cold call with no caller would need 38.5%.',
          },
          {
            question: 'UTG opens 3bb and the LJ calls. What raw equity does a small blind overcall need?',
            choices: ['20%', '25%', '33.3%'],
            answer: 1,
            explain: 'The pot holds 3 + 3 + 0.5 + 1 = 7.5bb. You call 2.5bb more, so 2.5 ÷ 10 = 25%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Which hand gains the most in a multiway pot?',
        choiceCards: ['6h5h', 'KdTc', 'Ac9d'],
        choices: ['6♥5♥', 'K♦T♣', 'A♣9♦'],
        answer: 0,
        explain: 'Suited connectors make straights and flushes that hold up against several players. KTo and A9o often make top pair with a weak kicker.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['QhJd', '4c4d', 'Ks8c'],
            choices: ['Q♥J♦', '4♣4♦', 'K♠8♣'],
            answer: 1,
            explain: 'Small pairs make sets that win big multiway pots. QJo and K8o make top pairs that often lose to better kickers.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'How often do two suited cards flop a flush draw or a flush?',
        cards: '9s8s',
        choices: ['About 4%', 'About 12%', 'About 25%'],
        answer: 1,
        explain: 'Like the bars showed, it is 11.8%. A pocket pair flops a set or better 11.8% of the time too.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            question: 'How often does a pocket pair flop a set or better?',
            cards: '7d7c',
            explain: 'Like the bars showed, it is 11.8%. That is about 1 flop in 8.5.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'Overcalls get great prices. The big blind needs only 18.8% behind an open and a call.',
          'Multiway, value comes from big hands. Pairs and suited hands gain, and offsuit high cards lose.',
          'Pairs flop a set and suited hands flop a flush draw or better about 12% of the time each.',
        ],
      },
    ],
  },
  {
    key: 'preflop/multiway-preflop/cold-4bet',
    level: 'advanced',
    minutes: 5,
    cover: { kind: 'ring', value: 34 / 1326, label: 'QQ+ and AK', caption: 'Share of all starting hands' },
    steps: [
      {
        kind: 'intro',
        title: 'A 4bet before you have acted',
        body: 'An open and a 3bet came before you. A raise now is a cold 4bet. It tells 2 strong ranges that you are stronger still.',
      },
      {
        kind: 'visual',
        title: 'An open and a 3bet',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BTN', highlight: ['HJ', 'CO'], note: 'HJ opens, CO 3bets to 8bb' },
        caption: 'The HJ opened 2.5bb and the cutoff 3bet to 8bb. You are on the button with 12bb already in the pot.',
      },
      {
        kind: 'formula',
        title: 'What a cold 4bet bluff needs',
        formula: '20 ÷ (12 + 20) = 62.5%',
        parts: [
          ['Pot before you act', '2.5 + 8 + 1.5 = 12bb'],
          ['You risk', '20bb'],
        ],
        example:
          'A cold 4bet to 20bb with no equity needs **62.5%** folds. Both players must fold for it to win. Two strong ranges rarely fold that much, so cold 4bets are mostly value.',
      },
      {
        kind: 'visual',
        title: 'How rare the value is',
        art: { kind: 'ring', value: 34 / 1326, label: 'QQ+ and AK', caption: 'Share of all starting hands' },
        caption: 'QQ+ and AK are 34 of 1,326 starting hands, about **2.6%**. A cold 4bet range is about that tight, plus a few blocker bluffs.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why so tight',
        body: [
          'The 3bettor is strong, and the opener still acts after you. A bluff must get through both.',
          'The bluffs that work hold an ace. It makes AA and AK less likely.',
          'Calling the 3bet cold is rare too. You pay a lot and another player can still raise.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Facing an open and a 3bet',
        columns: ['Hand', 'Usually'],
        rows: [
          ['AA and KK', 'Cold 4bet'],
          ['QQ and AK', 'Mix cold 4bet, call and fold'],
          ['A5s', 'A rare cold 4bet bluff'],
          ['JJ and lower pairs', 'Mostly fold, some calls in position'],
          ['Everything else', 'Fold'],
        ],
        note: 'Directional, at 100bb in a raked game.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'The rare bluff',
        cards: 'As5s',
        caption: 'A♠5♠ halves the AA combos the others can hold. It is the kind of hand that cold 4bets as a bluff, and only rarely.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live cold 4bets',
        body: 'A live cold 4bet is almost always AA or KK. Fold QQ and AK against most players unless you have seen them bluff.',
      },
      {
        kind: 'quiz',
        question: 'The HJ opens 2.5bb and the CO 3bets to 8bb. You cold 4bet to 20bb from the button. How often must both fold for a pure bluff to break even?',
        choices: ['50%', '62.5%', '75%'],
        answer: 1,
        explain: 'The pot holds 2.5 + 8 + 1.5 = 12bb. You risk 20bb, so 20 ÷ 32 = 62.5%. Both players must fold for you to win it.',
        point: 0,
        variants: [
          {
            question: 'UTG opens 3bb and the LJ 3bets to 9bb. You cold 4bet to 22bb from the cutoff. How often must both fold for a pure bluff to break even?',
            choices: ['50%', '62%', '75%'],
            explain: 'The pot holds 3 + 9 + 1.5 = 13.5bb. You risk 22bb, so 22 ÷ 35.5 = 62%.',
          },
          {
            question: 'The CO opens 2.5bb and the button 3bets to 7.5bb. You cold 4bet to 22bb from the small blind. How often must both fold for a pure bluff to break even?',
            choices: ['55%', '65.2%', '75%'],
            explain: 'The pot holds 2.5 + 7.5 + 1.5 = 11.5bb, with your 0.5bb in it. You add 21.5bb, so 21.5 ÷ 33 = 65.2%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'About what share of starting hands are QQ+ and AK?',
        choices: ['About 1%', 'About 2.6%', 'About 6%'],
        answer: 1,
        explain: 'There are 6 + 6 + 6 + 16 = 34 combos out of 1,326. That is about 2.6%.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'An open and a 3bet come before you. Which hand most often folds?',
        choiceCards: ['JhJc', 'AdKd', 'AsAc'],
        choices: ['J♥J♣', 'A♦K♦', 'A♠A♣'],
        answer: 0,
        explain: 'JJ is behind most of the hands that continue. AA cold 4bets, and AKs mixes 4bets and calls.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['KhKc', '9s9d', 'AcKh'],
            choices: ['K♥K♣', '9♠9♦', 'A♣K♥'],
            answer: 1,
            explain: '99 is behind most of the hands that continue, so it folds. KK cold 4bets, and AKo mixes 4bets and folds.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'A cold 4bet bluff must fold out 2 ranges. To 20bb over 12bb, it needs 62.5% folds.',
          'QQ+ and AK are about 2.6% of hands. Cold 4bet ranges are about that tight.',
          'Fold most hands to an open and a 3bet, even JJ. Keep AA and KK, and mix QQ and AK.',
        ],
      },
    ],
  },
];

import type { LessonContent } from './types';

/**
 * 3bet and 4bet pots after the flop: c-betting in position as the 3bettor,
 * the 3bet caller out of position, facing a c-bet in position, turns, low
 * boards and 4bet pots. SPRs, prices, geometric sizes, combo counts and
 * equities are exact and recomputed in thin-spots.test.ts.
 */
export const POSTFLOP_3BP_LESSONS: LessonContent[] = [
  {
    key: 'postflop/3bet-postflop/3bp-ip-3bettor',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'AsKs', board: 'Kd8c3h' },
    steps: [
      {
        kind: 'intro',
        title: 'You 3bet in position and got called',
        body: 'You 3bet from the button and the cutoff called. The pot is big, the SPR is about 5.6 and you have position. Your range holds most of the big pairs.',
      },
      {
        kind: 'visual',
        title: 'The pot on the flop',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 16.5 },
            { label: 'Behind', bb: 92.5 },
          ],
        },
        caption: 'The cutoff called a 3bet to 7.5bb. The pot is **16.5bb** with **92.5bb** behind. That SPR (stack to pot ratio) is 5.6.',
        evidence: 'math',
      },
      {
        kind: 'board',
        title: 'A high board',
        board: 'Kd8c3h',
        caption: 'K♦8♣3♥ favors the 3bettor. You hold more AK, KK and AA. The caller’s biggest pairs would have 4bet, so its range is capped.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A low connected board',
        board: '7s6s5d',
        caption: '7♠6♠5♦ hits the caller. Its pairs and suited connectors make sets, straights and draws. You have overpairs, but you check more often here.',
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Why small works',
        formula: '5.5 ÷ (16.5 + 5.5) = 25%',
        parts: [
          ['Pot', '16.5bb'],
          ['A third pot bet', '5.5bb'],
        ],
        example: 'A third pot bet risks 5.5bb to win 16.5bb. As a pure bluff it needs **25%** folds. A capped range folds often to small bets on high boards.',
      },
      {
        kind: 'text',
        title: 'How often and how big',
        body: [
          'On high boards bet small with most of your range. Your range is ahead and the caller cannot raise much.',
          'On low connected boards check more. Bet your overpairs and best draws some of the time.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Three bets get it in',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Flop bet', bb: 10.7 },
            { label: 'Turn bet', bb: 24.8 },
            { label: 'River bet', bb: 57 },
          ],
        },
        caption: 'Bets of **65.1%** of the pot on the flop, turn and river get 92.5bb in from a 16.5bb pot. You never need an overbet to play for stacks.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live callers of 3bets',
        body: 'Many live players call 3bets with hands like KQo and AJo. They pay off top pair too often. Bet your strong top pairs for value on all 3 streets.',
      },
      {
        kind: 'quiz',
        question: 'You 3bet the button and the cutoff called. The flop is K♦8♣3♥. What does your strategy usually do?',
        board: 'Kd8c3h',
        choices: ['Bet small with most of the range', 'Check almost every hand', 'Overbet with sets only'],
        answer: 0,
        explain: 'You hold more strong kings and overpairs on this high board. The caller is capped. So bet small and often.',
        point: 0,
        shuffleSuits: true,
        variants: [
          {
            question: 'You 3bet the button and the cutoff called. The flop is A♣9♦4♠. What does your strategy usually do?',
            board: 'Ac9d4s',
            explain: 'You hold more AK, AQ and AA. The caller holds few strong aces, since it 4bets the best ones. So bet small and often.',
          },
          {
            question: 'You 3bet the cutoff and the HJ called. The flop is Q♥7♣2♦. What does your strategy usually do?',
            board: 'Qh7c2d',
            explain: 'You hold more QQ, KK and AA. The caller is capped. A dry high board lets you bet small with most hands.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You 3bet in position and got called. Which flop do you check most often?',
        choiceCards: ['7s6s5d', 'KdQc3h', 'As9d4c'],
        choices: ['7♠6♠5♦', 'K♦Q♣3♥', 'A♠9♦4♣'],
        answer: 0,
        explain: 'Low connected boards hit the caller’s pairs and suited connectors. High boards favor your range of big pairs and big aces.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['AcKd5s', '8h7h6c', 'KhJd2c'],
            choices: ['A♣K♦5♠', '8♥7♥6♣', 'K♥J♦2♣'],
            answer: 1,
            explain: '8♥7♥6♣ hits the caller’s sets, straights and draws. Boards with an ace or a king favor your range.',
          },
          {
            choiceCards: ['AhQs8d', 'KsTc3h', '6d5d4c'],
            choices: ['A♥Q♠8♦', 'K♠T♣3♥', '6♦5♦4♣'],
            answer: 2,
            explain: '6♦5♦4♣ hits the caller’s small pairs and suited connectors. High boards favor your big pairs and aces.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The pot is 16.5bb. You bet 5.5bb as a pure bluff. How often must the caller fold?',
        choices: ['20%', '25%', '33.3%'],
        answer: 1,
        explain: 'You risk 5.5bb to win 16.5bb. So 5.5 ÷ 22 = 25%. A third pot bet needs few folds.',
        point: 2,
        variants: [
          {
            question: 'The pot is 22.5bb. You bet 7.5bb as a pure bluff. How often must the caller fold?',
            explain: 'You risk 7.5bb to win 22.5bb. So 7.5 ÷ 30 = 25%. A third pot bet needs 25% at any pot size.',
          },
          {
            question: 'The pot is 16.5bb. You bet 8bb as a pure bluff. How often must the caller fold?',
            choices: ['25%', '32.7%', '50%'],
            explain: 'You risk 8bb to win 16.5bb. So 8 ÷ 24.5 = 32.7%. A bigger bet needs more folds.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'On high boards, bet small with most of your range. The caller is capped.',
          'On low connected boards, check more. The caller’s pairs and suited connectors hit them.',
          'A third pot bet needs only 25% folds as a bluff.',
        ],
      },
    ],
  },
  {
    key: 'postflop/3bet-postflop/3bp-oop-caller',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'JhTh', board: '9h8c4h' },
    steps: [
      {
        kind: 'intro',
        title: 'The 3bettor has position',
        body: 'You called a 3bet out of position. On the flop you check to the 3bettor almost every time. Then you choose how to defend.',
      },
      {
        kind: 'visual',
        title: 'You act first',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN'], note: '16.5bb pot, you act first' },
        caption: 'You opened the cutoff and called the button’s 3bet to 7.5bb. The pot is 16.5bb with 92.5bb behind.',
      },
      {
        kind: 'visual',
        title: 'Price against a small c-bet',
        art: { kind: 'ring', value: 5.5 / 27.5, label: 'Equity to call', caption: 'A 5.5bb bet into 16.5bb' },
        caption: 'The button bets 5.5bb into 16.5bb. You call 5.5bb to win 22bb, which needs **20%** raw equity. MDF (minimum defense frequency) is 75%.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why check first',
        body: [
          'The 3bettor has the stronger range on most flops. Betting into it rarely works.',
          'Checking lets the 3bettor bet its weak hands too. Then you defend with a clear plan.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Facing a small c-bet',
        columns: ['Hand type', 'Usually'],
        rows: [
          ['Sets and two pair', 'Check raise or call'],
          ['Strong draws', 'Mix check raise and call'],
          ['Top pair and good second pairs', 'Call'],
          ['Overcards with backdoor draws', 'Some calls, some folds'],
          ['No pair and no draw', 'Fold'],
        ],
        note: 'Directional, at an SPR near 5.6 out of position.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'A check raise commits you',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot after the raise is called', bb: 52.5 },
            { label: 'Behind', bb: 74.5 },
          ],
        },
        caption: 'Say you check raise to 18bb and the button calls. The pot is 52.5bb with 74.5bb behind. That SPR of **1.4** means one turn bet puts most of the stack in.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'A check raise draw',
        cards: 'JhTh',
        board: '9h8c4h',
        caption: 'J♥T♥ on 9♥8♣4♥ has a straight draw and a flush draw. It is happy to get the money in, so it check raises.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 3bettors give up',
        body: 'Many live 3bettors c-bet the flop and then give up on the turn. Against them, call more flops with pairs and good draws. Check raise less, since a call keeps their bluffs in.',
      },
      {
        kind: 'quiz',
        question: 'You called a 3bet from the cutoff. The button bets 5.5bb into 16.5bb. What is MDF?',
        choices: ['50%', '66.7%', '75%'],
        answer: 2,
        explain: 'MDF is 16.5 ÷ (16.5 + 5.5) = 75%. Against a small bet you must defend most of your range.',
        point: 0,
        variants: [
          {
            question: 'You called a 3bet from the cutoff. The button bets 8bb into 16.5bb. What is MDF?',
            choices: ['50%', '67.3%', '75%'],
            answer: 1,
            explain: 'MDF is 16.5 ÷ (16.5 + 8) = 67.3%. A bigger bet lets you fold a little more.',
          },
          {
            question: 'You called a 3bet from the HJ. The cutoff bets 11bb into 22bb. What is MDF?',
            choices: ['50%', '66.7%', '75%'],
            answer: 1,
            explain: 'MDF is 22 ÷ (22 + 11) = 66.7%. A half pot bet always gives 66.7%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Out of position in a 3bet pot, which hand is the best check raise on 9♥8♣4♥?',
        board: '9h8c4h',
        choiceCards: ['JhTh', 'AsKd', '8s7s'],
        choices: ['J♥T♥', 'A♠K♦', '8♠7♠'],
        answer: 0,
        explain: 'J♥T♥ has a straight draw and a flush draw, so it is happy to play for stacks. AK has no pair here. 87s has second pair and prefers to call.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'Out of position in a 3bet pot, which hand is the best check raise on T♦9♦3♣?',
            board: 'Td9d3c',
            choiceCards: ['QdJd', 'AhKc', '9s8s'],
            choices: ['Q♦J♦', 'A♥K♣', '9♠8♠'],
            explain: 'Q♦J♦ has a straight draw and a flush draw, so it is happy to play for stacks. AK has no pair here. 98s has second pair and prefers to call.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You called a 3bet out of position. The flop comes. What do you usually do first?',
        choices: ['Check to the 3bettor', 'Bet half the pot', 'Bet all in'],
        answer: 0,
        explain: 'The 3bettor has the stronger range on most flops. Checking lets it bet its weak hands, and you defend from there.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Against a third pot c-bet, MDF is 75%. Defend most of your range.',
          'Check raise sets, two pair and strong draws. A raise at this SPR commits you.',
          'Check to the 3bettor on almost every flop.',
        ],
      },
    ],
  },
  {
    key: 'postflop/3bet-postflop/vs-3bp-cbet',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '9s9h', board: 'Kc7d2s' },
    steps: [
      {
        kind: 'intro',
        title: 'The 3bettor bets first',
        body: 'You called a 3bet in position and the 3bettor bet the flop. You have position and a low SPR. Most pairs keep going.',
      },
      {
        kind: 'visual',
        title: 'The pot on the flop',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 22.5 },
            { label: 'Behind', bb: 89 },
          ],
        },
        caption: 'The button called a big blind 3bet to 11bb. The pot is **22.5bb** with **89bb** behind, an SPR of about 4.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Price against a small c-bet',
        art: { kind: 'ring', value: 7.5 / 37.5, label: 'Equity to call', caption: 'A 7.5bb bet into 22.5bb' },
        caption: 'The big blind bets 7.5bb into 22.5bb. You call 7.5bb to win 30bb, which needs **20%**. MDF (minimum defense frequency) is 75%.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why pairs keep going',
        body: [
          'At an SPR near 4 there are only 2 more streets of real betting. Your pairs face fewer big choices.',
          'Position helps too. You see each turn and river bet before you choose.',
          'Raising is rare. A raise puts most of your stack in, so raise only very strong hands and some draws.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A board to defend wide',
        board: 'Kc7d2s',
        caption: 'On K♣7♦2♠ the 3bettor bets small with most hands. You call with pairs like 88, 99 and Kx. You fold your weakest unpaired hands.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'After you call',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 37.5 },
            { label: 'Behind', bb: 81.5 },
          ],
        },
        caption: 'You call 7.5bb. The pot is now 37.5bb with 81.5bb behind, an SPR of **2.2**. Two bets of about two thirds of the pot would get it all in.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Call, do not raise',
        cards: '9s9h',
        board: 'Kc7d2s',
        caption: '9♠9♥ is a bluff catcher here. It calls the flop and often the turn. A raise would fold out the hands it beats.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 3bettors',
        body: 'Live players who rarely 3bet often c-bet only strong hands. Against them, fold more of your weak pairs. Against frequent 3bettors, defend wider.',
      },
      {
        kind: 'quiz',
        question: 'You called a 3bet on the button. The big blind bets 7.5bb into 22.5bb. What raw equity does a call need?',
        choices: ['20%', '25%', '33.3%'],
        answer: 0,
        explain: 'You call 7.5bb to win 30bb. So 7.5 ÷ 37.5 = 20%. 25% is the folds a bluff of that size needs.',
        point: 0,
        variants: [
          {
            question: 'You called a 3bet on the button. The big blind bets 11bb into 22.5bb. What raw equity does a call need?',
            choices: ['20%', '24.7%', '33.3%'],
            answer: 1,
            explain: 'You call 11bb to win 33.5bb. So 11 ÷ 44.5 = 24.7%. A bigger bet asks for more.',
          },
          {
            question: 'You called a small blind 3bet in the cutoff. It bets 6bb into 23bb. What raw equity does a call need?',
            choices: ['17.1%', '20.7%', '26%'],
            explain: 'You call 6bb to win 29bb. So 6 ÷ 35 = 17.1%. Small bets give you a great price.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You hold 9♠9♥ on K♣7♦2♠ in position. The 3bettor bets a third of the pot. What fits best?',
        cards: '9s9h',
        board: 'Kc7d2s',
        choices: ['Call', 'Raise to fold out better hands', 'Fold, since a king is out'],
        answer: 0,
        explain: '99 beats the 3bettor’s bluffs and its ace high hands. A raise folds out what you beat. At an SPR near 4, a call keeps the pot under control.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'You hold T♦T♥ on K♠6♣3♦ in position. The 3bettor bets a third of the pot. What fits best?',
            cards: 'TdTh',
            board: 'Ks6c3d',
            explain: 'TT beats the 3bettor’s bluffs and its ace high hands. A raise folds out what you beat. At an SPR near 4, a call keeps the pot under control.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You call a flop c-bet in a 3bet pot. The pot is now 37.5bb with 81.5bb behind. What is the SPR?',
        choices: ['About 1', 'About 2.2', 'About 4'],
        answer: 1,
        explain: '81.5 ÷ 37.5 = 2.2. Two bets of about two thirds of the pot would get it all in.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Against a third pot c-bet in a 3bet pot, a call needs 20% raw equity.',
          'In position at an SPR near 4, call most pairs and raise rarely.',
          'After a flop call the SPR drops to about 2.2. Plan the turn and river.',
        ],
      },
    ],
  },
  {
    key: 'postflop/3bet-postflop/3bp-turns',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'AdKd', board: 'Kc7d2sAh' },
    steps: [
      {
        kind: 'intro',
        title: 'Two streets left, little behind',
        body: 'In a 3bet pot the turn often has an SPR near 2. Two bets get the stacks in. So the turn bet decides most of the hand.',
      },
      {
        kind: 'visual',
        title: 'The turn pot',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 37.5 },
            { label: 'Behind', bb: 81.5 },
          ],
        },
        caption: 'The big blind 3bet to 11bb and the button called. A 7.5bb flop bet was called. The turn pot is **37.5bb** with **81.5bb** behind, an SPR of 2.2.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Two bets to get it in',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'Turn bet', value: 24.6, tone: 'brass' },
            { label: 'River shove', value: 56.9, tone: 'red' },
          ],
        },
        caption: 'A turn bet of **65.6%** of the pot leaves a river shove of the same share. Two equal sized bets get the whole 81.5bb in.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Bet or check the turn',
        body: [
          'Bet hands that are happy to get all in by the river. Top pair with a good kicker and better qualify.',
          'Bluff with hands that have outs, like flush draws and straight draws.',
          'Check medium hands that want a showdown. A bet would face a shove with no room to fold.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A good turn for the 3bettor',
        board: 'Kc7d2sAh',
        caption: 'The A♥ helps the 3bettor. It holds more AK and AA than the caller. Keep betting.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A bad turn for the 3bettor',
        board: 'Td7c3s9d',
        caption: 'On T♦7♣3♠ the 9♦ turn makes straights for J8 and 86. The caller holds more of those hands. Slow down with one pair.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live turn barrels',
        body: 'Live callers in 3bet pots often fold the turn to a second bet. Against them, barrel your draws and strong overcards more. Against callers who never fold a pair, bet value and check the rest.',
      },
      {
        kind: 'quiz',
        question: 'The turn pot is 37.5bb with 81.5bb behind. What pot fraction on the turn and river gets it all in?',
        choices: ['About 33%', 'About 66%', 'About 100%'],
        answer: 1,
        explain: 'With an SPR of 2.2 and 2 streets left, the geometric size is 65.6%. Bet that on the turn and shove the river for the same share.',
        point: 0,
        variants: [
          {
            question: 'The turn pot is 30bb with 60bb behind. What pot fraction on the turn and river gets it all in?',
            choices: ['About 33%', 'About 62%', 'About 100%'],
            explain: 'With an SPR of 2 and 2 streets left, the geometric size is 61.8%.',
          },
          {
            question: 'The turn pot is 45bb with 180bb behind. What pot fraction on the turn and river gets it all in?',
            choices: ['About 50%', 'About 66%', 'About 100%'],
            answer: 2,
            explain: 'With an SPR of 4 and 2 streets left, the geometric size is 100%. A pot sized bet on each street gets it in.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The 3bettor shoves 81.5bb into a 37.5bb turn pot. What raw equity does a call need?',
        choices: ['30%', '40.6%', '50%'],
        answer: 1,
        explain: 'You call 81.5bb to win 119bb. So 81.5 ÷ 200.5 = 40.6%.',
        point: 1,
        variants: [
          {
            question: 'The 3bettor shoves 60bb into a 30bb turn pot. What raw equity does a call need?',
            choices: ['33.3%', '40%', '50%'],
            explain: 'You call 60bb to win 90bb. So 60 ÷ 150 = 40%. A shove of 2 times the pot always asks for 40%.',
          },
          {
            question: 'The 3bettor bets 25bb into a 37.5bb turn pot. What raw equity does a call need?',
            choices: ['28.6%', '33.3%', '40.6%'],
            answer: 0,
            explain: 'You call 25bb to win 62.5bb. So 25 ÷ 87.5 = 28.6%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You 3bet and c-bet Q♦8♣3♠, and the caller called. Which turn is best for you to keep betting?',
        board: 'Qd8c3s',
        choiceCards: ['Ks', '7d', '9h'],
        choices: ['K♠', '7♦', '9♥'],
        answer: 0,
        explain: 'The king adds AK, KK and KQ to your range more than the caller’s. The 7 and 9 help the caller’s suited connectors like T9 and 76.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            question: 'You 3bet and c-bet J♣6♦2♥, and the caller called. Which turn is best for you to keep betting?',
            board: 'Jc6d2h',
            choiceCards: ['5s', 'Ad', '7c'],
            choices: ['5♠', 'A♦', '7♣'],
            answer: 1,
            explain: 'The ace adds AK, AQ and AA to your range more than the caller’s. The 5 and 7 help the caller’s small pairs and suited connectors.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'At an SPR near 2 on the turn, two bets of two thirds pot get it all in.',
          'Facing a turn shove of about 2 times the pot, a call needs about 40%.',
          'Overcards that hit your range are good turns. Low connecting cards help the caller.',
        ],
      },
    ],
  },
  {
    key: 'postflop/3bet-postflop/3bp-low-boards',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '9h8h', board: '7s6s5d' },
    steps: [
      {
        kind: 'intro',
        title: 'When the flop hits the caller',
        body: '3bet ranges are full of big cards. Calling ranges hold more small pairs and suited connectors. Low connected flops hit the caller.',
      },
      {
        kind: 'table',
        title: 'Two illustration ranges',
        columns: ['Player', 'Hands'],
        rows: [
          ['3bettor', 'QQ+ and AK'],
          ['3bettor', 'AQs plus A5s and A4s'],
          ['Caller', 'JJ down to 22'],
          ['Caller', 'AJs and ATs plus KQs down to JTs'],
          ['Caller', 'T9s down to 65s'],
        ],
        note: 'Simple ranges for counting, close to a big blind 3bet and a button call at 100bb. KQs down to JTs means KQs, KJs and KTs. It also means QJs, QTs and JTs.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'Low and connected',
        board: '7s6s5d',
        caption: 'In these ranges the caller holds **18** combos of two pair or better on 7♠6♠5♦. The 3bettor holds none. It has overpairs, but no nutted hands.',
        evidence: 'math',
      },
      {
        kind: 'board',
        title: 'High and dry',
        board: 'Kd8c3h',
        caption: 'On K♦8♣3♥ the 3bettor holds **21** combos of top pair or better. The caller holds **15**. Here the 3bettor bets small and often.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How the 3bettor plays low boards',
        body: [
          'Check more often. A bet into a range with more nutted hands gets raised.',
          'Bet overpairs and strong draws some of the time. Use a small size when you bet.',
          'The caller can attack. It raises its sets, straights and strong draws.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Only the caller has this',
        cards: '9h8h',
        board: '7s6s5d',
        caption: '9♥8♥ makes the nut straight on 7♠6♠5♦. Hands like this sit in the calling range, not the 3bet range.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 3bet callers',
        body: 'Many live players call 3bets with small pairs to set mine. On low boards they hold sets more often than a solver range does. Respect their raises.',
      },
      {
        kind: 'quiz',
        question: 'In the illustration ranges, who holds more two pair or better on 7♠6♠5♦?',
        board: '7s6s5d',
        choices: ['The 3bettor', 'The caller', 'About the same'],
        answer: 1,
        explain: 'The caller has sets of 77, 66 and 55. It also has 98s, 76s and 65s. That makes 18 combos. The 3bettor’s big pairs and aces make none.',
        point: 0,
        shuffleSuits: true,
        variants: [
          {
            question: 'In the illustration ranges, who holds more two pair or better on 8♥7♥6♦?',
            board: '8h7h6d',
            explain: 'The caller has sets of 88, 77 and 66. It also has T9s, 87s and 76s. That makes 18 combos. The 3bettor’s big pairs and aces make none.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You 3bet and got called. The flop is 7♠6♠5♦ and you hold A♣A♦. What does your strategy often do?',
        cards: 'AcAd',
        board: '7s6s5d',
        choices: ['Check or bet small', 'Bet big to protect', 'Shove all in'],
        answer: 0,
        explain: 'The caller holds the sets and straights on this board. Your aces are strong but not the nuts. Checking or betting small keeps the pot in line with that.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'You 3bet and got called. The flop is 8♥7♥6♦ and you hold K♣K♦. What does your strategy often do?',
            cards: 'KcKd',
            board: '8h7h6d',
            explain: 'The caller holds the sets and straights on this board. Your kings are strong but not the nuts. Checking or betting small keeps the pot in line with that.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'In the illustration ranges, which flop gives the 3bettor its biggest edge in top pair or better?',
        choiceCards: ['Kd8c3h', '7s6s5d', '9h8h7c'],
        choices: ['K♦8♣3♥', '7♠6♠5♦', '9♥8♥7♣'],
        answer: 0,
        explain: 'On K♦8♣3♥ the 3bettor holds 21 combos of top pair or better to the caller’s 15. Low connected boards flip that edge to the caller.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['6h5h4c', 'Ac9d4s', '8d7d6s'],
            choices: ['6♥5♥4♣', 'A♣9♦4♠', '8♦7♦6♠'],
            answer: 1,
            explain: 'A♣9♦4♠ hits the 3bettor’s AK, AQ and AA. The caller has few aces. Low connected boards flip that edge to the caller.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'Low connected boards hit the caller. It holds the sets and straights there.',
          'As the 3bettor on those boards, check more and bet small with overpairs.',
          'High boards favor the 3bettor. On K♦8♣3♥ it holds 21 combos of top pair or better to the caller’s 15.',
        ],
      },
    ],
  },
  {
    key: 'postflop/3bet-postflop/4bet-pots',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Pot', bb: 48.5 },
        { label: 'Behind', bb: 76 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'A pot that is almost all in',
        body: 'After a called 4bet at 100bb, the SPR is about 1.6. One pair is strong enough to go all in. Every bet is a big share of the stack.',
      },
      {
        kind: 'visual',
        title: 'The pot on the flop',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 48.5 },
            { label: 'Behind', bb: 76 },
          ],
        },
        caption: 'The button 4bet to 24bb and the big blind called. The pot is **48.5bb** with **76bb** behind, an SPR (stack to pot ratio) of 1.6.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Small bets do the job',
        body: [
          'With so little behind, a small bet already threatens the stack. Bets of about a quarter of the pot are common.',
          'The 4bettor often bets its whole range small. Folds win a big pot, and calls set up an easy shove.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'After a small bet is called',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 72.5 },
            { label: 'Behind', bb: 64 },
          ],
        },
        caption: 'A 12bb bet into 48.5bb gets called. The pot is 72.5bb with 64bb behind, an SPR of **0.9**. The turn shove is smaller than the pot.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'AK on a low board',
        cards: 'AhKd',
        board: '8c5s2d',
        caption: 'A♥K♦ has no pair on 8♣5♠2♦. Against Q♠Q♣ it still has **25.6%**, exact over every turn and river. With some folds from JJ and TT, it can keep betting.',
      },
      {
        kind: 'formula',
        title: 'Calling a check shove',
        formula: '64 ÷ (136.5 + 64) = 31.9%',
        parts: [
          ['Pot after the shove', '48.5 + 12 + 76 = 136.5bb'],
          ['You call', '64bb more'],
        ],
        example: 'You bet 12bb and the big blind shoves for 76bb. You need **31.9%** equity to call. Overpairs and top pairs call easily. Many draws call too.',
      },
      {
        kind: 'board',
        title: 'Overpairs rule',
        board: '9d6c3s',
        caption: 'On 9♦6♣3♠ both ranges hold many overpairs. QQ and JJ are happy to get all in here.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 4bet pots',
        body: 'Live 4bets are often AA or KK. If you called with QQ and an ace flops, you are often behind. Against a tight player, fold QQ to a shove on an ace high board.',
      },
      {
        kind: 'quiz',
        question: 'At 100bb a 4bet to 24bb is called. The small blind’s 0.5bb is dead. What is the flop SPR?',
        choices: ['About 0.9', 'About 1.6', 'About 3'],
        answer: 1,
        explain: 'The pot is 24 + 24 + 0.5 = 48.5bb with 76bb behind. 76 ÷ 48.5 = 1.6.',
        point: 0,
        variants: [
          {
            question: 'At 100bb a 4bet to 22bb is called. Both blinds folded, so 1.5bb is dead. What is the flop SPR?',
            choices: ['About 1', 'About 1.7', 'About 3'],
            explain: 'The pot is 22 + 22 + 1.5 = 45.5bb with 78bb behind. 78 ÷ 45.5 = 1.7.',
          },
          {
            question: 'At 150bb a 4bet to 30bb is called with 1.5bb dead. What is the flop SPR?',
            choices: ['About 1.6', 'About 2', 'About 4'],
            explain: 'The pot is 30 + 30 + 1.5 = 61.5bb with 120bb behind. 120 ÷ 61.5 = 2. Deeper stacks leave a little more room.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You 4bet and got called. On the flop you bet 12bb into 48.5bb and the big blind shoves for 76bb. What raw equity does a call need?',
        choices: ['24%', '31.9%', '40%'],
        answer: 1,
        explain: 'The pot holds 48.5 + 12 + 76 = 136.5bb. You call 64bb, so 64 ÷ 200.5 = 31.9%.',
        point: 1,
        variants: [
          {
            question: 'You 4bet and got called. On the flop you bet 16bb into 48.5bb and the big blind shoves for 76bb. What raw equity does a call need?',
            choices: ['24%', '29.9%', '40%'],
            explain: 'The pot holds 48.5 + 16 + 76 = 140.5bb. You call 60bb, so 60 ÷ 200.5 = 29.9%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'In a 4bet pot at an SPR of 1.6, which hand is strong enough to get all in?',
        choices: ['Top pair with a good kicker', 'Only sets or better', 'Only the nuts'],
        answer: 0,
        explain: 'At an SPR of 1.6 one good pair is plenty. Waiting for sets would mean folding most of your range.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A called 4bet to 24bb leaves an SPR of about 1.6.',
          'Calling a shove after a small bet costs little. You need about 32% equity.',
          'Top pair and overpairs get all in. Bet small, since every bet threatens the stack.',
        ],
      },
    ],
  },
];

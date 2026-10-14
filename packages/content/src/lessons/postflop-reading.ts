import type { LessonContent } from './types';

/** Hand reading: narrowing a range with each action, and betting draws. */
export const POSTFLOP_READING_LESSONS: LessonContent[] = [
  {
    key: 'postflop/hand-reading/narrowing',
    level: 'core',
    minutes: 7,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'Preflop', value: 144, tone: 'gray' },
        { label: 'Flop', value: 105, tone: 'gray' },
        { label: 'Turn bet', value: 44 },
        { label: 'River bet', value: 40 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Read ranges, not hands',
        body: 'You will rarely know villain’s exact hand. You can know the hands they could have. Each action keeps some of those hands and drops others. By the river, the range is often small enough to count.',
      },
      {
        kind: 'visual',
        title: 'Four steps',
        art: {
          kind: 'tree',
          root: 'Read villain’s range',
          branches: [
            { label: '1. Start wide', value: 'Hands from that seat', tone: 'gray' },
            { label: '2. Remove what you see', value: 'Your cards, the board', tone: 'gray' },
            { label: '3. Keep what fits', value: 'After each action', tone: 'brass' },
            { label: '4. Count', value: 'Value against bluffs', tone: 'green' },
          ],
        },
        caption: 'An unpaired hand like AQ has 4 × 4 = 16 combos. Each card you can see removes some. On the river, count the hands that beat you and the bluffs. Then compare with your price.',
      },
      {
        kind: 'hand',
        title: 'The hand',
        cards: 'QcJc',
        board: 'Qh9h5c2s3d',
        caption:
          'Villain opens under the gun at 100bb. You call on the button with Q♣J♣ and the blinds fold. Villain bets small on the flop and big on the turn. On the river villain bets the size of the pot.',
      },
      {
        kind: 'table',
        title: 'Villain’s range, street by street',
        columns: ['Street', 'Villain', 'Combos'],
        rows: [
          ['Preflop', 'Opens', '144'],
          ['Flop Q♥ 9♥ 5♣', 'Bets small with everything', '105'],
          ['Turn 2♠', 'Bets big with top pair or better and strong draws', '44'],
          ['River 3♦', 'Bets KQ or better, plus missed draws', '40'],
        ],
        note:
          'The ranges are an assumption for illustration. Villain opens 77+ and ATs+. It also opens KTs+ and QTs+. It adds JTs, T9s and 98s. Offsuit, it opens AJo+ and KQo. The flop drop comes only from cards you can see. On the turn, QJs and QTs bet but check the river. The draws are 6 flush draws plus J♠T♠ and J♦T♦.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You hold Q♣J♣ on Q♥ 9♥ 5♣. How many AQ combos can villain have?',
        cards: 'QcJc',
        board: 'Qh9h5c',
        choices: ['16', '12', '8', '4'],
        answer: 2,
        explain: 'Like the 4 steps showed, remove what you see. Only Q♠ and Q♦ are left. Four aces times 2 queens is 8 combos. The 12 answer removes only the board’s queen.',
        point: 0,
      },
      {
        kind: 'visual',
        title: 'Count, then compare',
        art: { kind: 'ring', value: 0.2, label: 'Your equity', caption: 'You need 33.3% to call' },
        caption:
          'Villain’s river range holds 32 value combos and 8 missed draws. Q♣J♣ beats only the draws, so it wins **20%** of the time. A pot sized bet needs **33.3%**. Fold.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Real bluffs are rarer',
        body: 'This example lets villain bluff every missed draw. Many players at low stakes bluff big rivers far less. If your own hands show that, folding here is even easier.',
      },
      {
        kind: 'quiz',
        question: 'Villain bets small on the flop with every hand they hold. What does that bet tell you?',
        choices: ['Villain has a strong hand', 'Very little, since the range did not change', 'Villain has a draw'],
        answer: 1,
        explain: 'Like the range table showed, a bet made with every hand keeps every hand. Only the cards you can see shrink the range there. The big turn bet is the one that narrows it.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Villain’s river range holds 32 hands that beat you and 8 bluffs. They bet the pot. What should you do?',
        choices: ['Call, since top pair is too strong to fold', 'Call, since you need only 20%', 'Fold, since you win 20% and need 33.3%'],
        answer: 2,
        explain: 'Like the ring showed, you win 8 times in 40. That is 20%. Calling a pot sized bet needs 33.3%. Top pair looks strong. But this line leaves mostly hands that beat it.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Start from the preflop range. Remove the cards you can see, like your own queen.',
          'A bet made with every hand tells you little. Big bets narrow the range most.',
          'On the river, count value and bluffs. Then compare your equity with your price.',
        ],
      },
    ],
  },
  {
    key: 'postflop/hand-reading/semi-bluffs',
    level: 'core',
    minutes: 7,
    cover: { kind: 'cards', cards: 'JhTh', board: '9h8c2h' },
    steps: [
      {
        kind: 'intro',
        title: 'Two ways to win',
        body: 'A semi bluff is a bet with a hand that is behind now but can improve. It wins when villain folds. It also wins when you hit. That second chance makes draws better bets than hands with nothing.',
      },
      {
        kind: 'hand',
        title: 'A flush draw on the turn',
        cards: '9h8h',
        board: 'Kh7h2c4s',
        caption:
          'The pot is 20bb and you have 20bb left. You shove. Villain calls with K♣Q♦. You make a flush on 9 of the 44 rivers. That is **20.5%**.',
      },
      {
        kind: 'formula',
        title: 'EV of a semi bluff',
        formula: 'EV = F × pot + (1 − F) × (eq × final pot − bet)',
        parts: [
          ['F', 'Chance that villain folds'],
          ['eq', 'Your equity when called'],
          ['final pot', 'Pot once you are called'],
        ],
        example:
          'The pot is 20bb and you bet 20bb. A call makes the pot 60bb. When called you lose 7.73bb on average. When villain folds you win 20bb. So you break even at 7.73 ÷ 27.73 = **27.9%** folds. A pure bluff needs **50%**.',
      },
      {
        kind: 'visual',
        title: 'Where the EV comes from',
        art: {
          kind: 'tree',
          root: 'Shove 20bb into 20bb',
          branches: [
            { label: 'Villain folds, 40%', value: '+20bb', tone: 'green' },
            { label: 'Called and you hit, 12.3%', value: '+40bb', tone: 'green' },
            { label: 'Called and you miss, 47.7%', value: '−20bb', tone: 'red' },
          ],
        },
        caption:
          'Say villain folds 40% of the time. The draw earns 8 + 4.91 − 9.55 = **+3.36bb**. A hand with no equity and the same folds loses **4bb**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Which draws to bet or raise',
        body: [
          'Strong draws make the best semi bluffs. Flush draws, open enders and combo draws have the most outs.',
          'Draws to the nuts are better than draws that can make a second best hand.',
          'Weak draws with a pair often check or call instead. They already win some showdowns.',
          'The best semi bluffs are often hands that would otherwise fold. A bet gives them a way to win now.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Big draws are favorites',
        cards: 'JhTh',
        board: '9h8c2h',
        caption:
          'J♥T♥ has a flush draw and an open ender. That is 15 outs. All in on the flop against A♠A♦, it wins **56.3%** of the time. It can raise for value and fold equity at once.',
      },
      {
        kind: 'quiz',
        question: 'The pot is 20bb. You shove 20bb on the turn with 20.5% equity when called. How often must villain fold for you to break even?',
        choices: ['50.0%', '20.5%', '27.9%', '33.3%'],
        answer: 2,
        explain:
          'When called you average 0.205 × 60 − 20 = −7.73bb. When villain folds you win 20bb. So F = 7.73 ÷ 27.73 = 27.9%. The 50% answer is the price of a pure bluff. It ignores the times you hit.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'On T♠ 9♠ 3♥, which hand makes the best semi bluff raise?',
        board: 'Ts9s3h',
        choiceCards: ['Td8d', 'QsJs', 'Qd8d'],
        choices: ['T♦ 8♦', 'Q♠ J♠', 'Q♦ 8♦'],
        answer: 1,
        explain:
          'Q♠J♠ has a flush draw and an open ender. Against A♥T♦ it wins 68.9% with 2 cards to come. T♦8♦ has top pair with a weak kicker, so it prefers to call. Q♦8♦ has only a gutshot and one overcard.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Why does a draw make a better bluff than a hand with no equity?',
        choices: ['It can still win when called', 'Villain folds more often to it', 'It never loses money'],
        answer: 0,
        explain:
          'Like the EV tree showed, the draw wins more because it can hit when called. Villain sees only your bet, so the fold rate is the same. The draw still loses when called and it misses.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'A semi bluff wins when villain folds. It also wins when you hit.',
          'Equity when called lowers the folds you need. A 20.5% draw shoving pot needs 27.9% folds, not 50%.',
          'Semi bluff strong draws like flush draws and open enders. Weak draws with a pair often call.',
        ],
      },
    ],
  },
];

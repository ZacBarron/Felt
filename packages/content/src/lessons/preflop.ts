import type { LessonContent } from './types';

export const PREFLOP_LESSONS: LessonContent[] = [
  {
    key: 'preflop/rfi/rfi-ep',
    level: 'core',
    minutes: 5,
    cover: { kind: 'chart', chartId: '9max-100-rfi-utg' },
    practice: ['9max-100-rfi-utg', '9max-100-rfi-utgp1', '9max-100-rfi-utgp2', '9max-100-rfi-lj'],
    steps: [
      {
        kind: 'intro',
        title: 'Eight players behind you',
        body: 'From the first seats, 8 players still act behind you. Any of them can wake up with a big hand. You will also often play the pot out of position. So ranges start tight and widen one seat at a time.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-utg',
        title: 'UTG opens about 11%',
        caption: 'UTG opens pairs from 66, strong aces and the best suited broadways. Split cells are mixes. 55, A5s and T9s open about half the time.',
        highlight: ['55', 'A5s', 'T9s'],
      },
      {
        kind: 'text',
        title: 'Learn the weakest hands, not 169 cells',
        body: [
          'For each family, remember the weakest hand that opens. Everything stronger in that family opens too.',
          'At UTG, pairs open from **66** and suited aces from **A9s**. Offsuit aces open from **AJo**.',
          'Suited kings open from **KTs** and suited queens from **QTs**. **JTs** and **KQo** finish the range.',
        ],
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-lj',
        title: 'By LJ, about 17%',
        caption: '3 seats later, every suited ace and almost every pair opens. More suited connectors join, some as mixes.',
      },
      {
        kind: 'table',
        title: 'How the range grows',
        columns: ['Seat', 'Opens'],
        rows: [
          ['UTG', '11.5%'],
          ['UTG+1', '12.7%'],
          ['UTG+2', '15.2%'],
          ['LJ', '17.4%'],
        ],
        note: 'Share of all hands in Felt’s starter charts, which are approximate. Solver exact charts will replace them.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why the cutoffs sit where they do',
        body: [
          'A hand opens when raising earns more than folding. Folding is worth zero.',
          'Early on, the risk is running into a strong hand behind you. With 8 players left, someone holds a premium far more often than with 2 left.',
          'Offsuit hands suffer most. AK and KQ dominate KJo, and so does AJ. Pairs from JJ up crush it.',
          'KJo also rarely makes a hand strong enough to win a big pot.',
          'Suited hands can make flushes, so they realize more of their equity. That is why A9s opens before ATo.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: '9-handed at 100bb, it folds to you UTG with KJo. What does the chart do?',
        choices: ['Raise', 'Fold', 'Mix raise and fold'],
        answer: 1,
        explain: 'UTG opens KQo but never KJo, because offsuit kings are dominated too often. A mix is tempting since UTG+1 opens KJo a quarter of the time. At UTG it always folds.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the LJ with A3s. What does the chart do?',
        choices: ['Mix raise and fold', 'Fold', 'Raise'],
        answer: 2,
        explain: 'Every suited ace opens from the LJ. A3s can make the nut flush and a wheel. The ace also makes AA and AK less likely behind you. The LJ mixes only 22 and a few suited connectors.',
      },
      {
        kind: 'takeaway',
        points: ['Early position ranges are tight and strong.', 'Memorize the weakest hand that opens in each family.', 'Each later seat adds a few hands at the bottom.'],
      },
    ],
  },
  {
    key: 'preflop/rfi/rfi-lp',
    level: 'core',
    minutes: 5,
    cover: { kind: 'chart', chartId: '9max-100-rfi-btn' },
    practice: ['9max-100-rfi-hj', '9max-100-rfi-co', '9max-100-rfi-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'The money seats',
        body: 'Late position wins the most because you act last after the flop. Fewer players are left behind you, so you can open far wider.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-co',
        title: 'Cutoff, about 28%',
        caption: 'Every pair and every suited ace opens. Suited kings open from K5s. Every offsuit broadway opens, down to JTo.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-btn',
        title: 'Button, about 43%',
        caption: 'Every suited king and every offsuit ace opens. Offsuit kings open from K8o. Offsuit queens and jacks open from the nine.',
      },
      {
        kind: 'text',
        title: 'Why so wide',
        body: [
          'Only the blinds are left. They will play the hand out of position.',
          'The blinds already put 1.5bb in the pot. Winning it often makes a steal profitable, even when you are called sometimes.',
        ],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live adjustment',
        body: 'Some blinds call too often and rarely 3bet. If your logs show that, keep opening wide but size up a little. Drop the weakest offsuit hands.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you on the button with K5s. What does the chart do?',
        choices: ['Fold', 'Raise', 'Mix raise and fold'],
        answer: 1,
        explain: 'The button opens every suited king, down to K2s. Its only mixes are 98o and 53s. K5s is a pure raise.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the cutoff with Q7s. What does the chart do?',
        choices: ['Raise', 'Mix raise and fold', 'Fold'],
        answer: 2,
        explain: 'Suited queens open from Q8s in the cutoff. Q7s always folds here and waits for the button. The cutoff mixes only 86s and 75s.',
      },
      {
        kind: 'takeaway',
        points: ['The cutoff opens about 28% and the button about 43%.', 'Suited kings and offsuit aces fill out late position ranges.', 'Steal more when the blinds play badly out of position.'],
      },
    ],
  },
  {
    key: 'preflop/rfi/rfi-sb',
    level: 'core',
    minutes: 5,
    cover: { kind: 'chart', chartId: '9max-100-rfi-sb' },
    practice: ['9max-100-rfi-sb'],
    steps: [
      {
        kind: 'intro',
        title: 'One player left, but no position',
        body: 'Only the big blind remains, so the small blind can open wide. But you will act first on every street after the flop.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-sb',
        title: 'Raise only, about 42%',
        caption: 'This chart raises or folds. It gives up a little EV against the full solver strategy. It is much easier to play well.',
      },
      {
        kind: 'text',
        title: 'Size it up',
        body: [
          'Open to about 3bb instead of 2.5bb. Out of position, you want to win more pots before the flop.',
          'A bigger raise also makes the big blind defend a narrower range.',
        ],
      },
      {
        kind: 'text',
        title: 'What solvers actually do',
        body: [
          'With rake, modern solutions limp a large part of the small blind range. Some strong hands limp too, as traps.',
          'Limping keeps the pot small when you are out of position. It also lets you play more hands cheaply.',
          'A limping range must be balanced. If you limp only weak hands, the big blind raises you off them.',
          'Raise or fold gives up a little EV. In exchange, you get a strategy you can play correctly at the table.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Against a passive big blind',
        body: 'Many live big blinds seem to raise limps too rarely. If your logs agree, limp the weaker half of your range against them. You see cheap flops with hands that do not want a raised pot out of position.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the small blind with Q4s. What does the raise only chart do?',
        choices: ['Raise', 'Fold', 'Mix raise and fold'],
        answer: 0,
        explain: 'Suited queens open down to Q4s in the small blind. Q3s and Q2s fold. This chart has no mixes at all.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the small blind with K7o. What does the raise only chart do?',
        choices: ['Mix raise and fold', 'Fold', 'Raise'],
        answer: 1,
        explain: 'Offsuit kings open from K8o in the small blind. K7o folds. Every suited king opens, so K7s would be a raise.',
      },
      {
        kind: 'takeaway',
        points: [
          'Raise or fold about 42% of hands, to about 3bb.',
          'Solvers also limp. Raise only is the simple baseline that gives up a little EV.',
          'Limp more against a big blind who never punishes it.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/bb-defense',
    level: 'core',
    minutes: 5,
    cover: { kind: 'chart', chartId: '9max-100-bb-vs-btn' },
    practice: ['9max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'You already paid',
        body: 'The big blind already has 1bb in and closes the action. So it gets the best price at the table. That makes it the widest defending seat.',
      },
      {
        kind: 'formula',
        title: 'Your price against a 2.5bb open',
        formula: '1.5 ÷ 5.5 = 27%',
        parts: [
          ['Pot before you call', '0.5 + 1 + 2.5 = 4bb'],
          ['You call', '1.5bb more'],
          ['Pot after you call', '5.5bb'],
        ],
        example: 'On raw equity alone, **27%** breaks even. Most hands have that much against a button range. Out of position you realize less of your equity, so the real bar is higher.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-bb-vs-btn',
        title: 'Defend more than half',
        caption: 'Against a button open, this chart 3bets about 10% and calls about 46%. Split cells mix 3bets and calls.',
        highlight: ['A5s', 'A4s', 'K9s'],
      },
      {
        kind: 'text',
        title: 'Why 3bet some weaker hands',
        body: [
          'Hands like A5s and K9s make good 3bets. The ace or king makes the button’s best hands less likely. They also play well when called.',
          'Your value 3bets come from the top. QQ+, AK and AQs always 3bet.',
          'Pairs like JJ and TT 3bet only part of the time, and so does AQo. The rest of the time they call. That keeps your calls strong enough to defend high card flops.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Where the defending range stops',
        body: [
          'Raw equity does not set the bottom of the calling range. How much equity a hand realizes does.',
          'T6o has about **36%** against this button range. 93o has about **32%**. Both clear the 27% price, and both fold.',
          'They flop few strong hands or good draws. Out of position, they get pushed off their equity.',
          '42s and 64o both have about **34%**. The chart calls 42s and folds 64o. Flushes and draws let the suited hand keep its equity.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Rake changes this',
        body: 'A typical live drop takes 10% of the pot up to a cap. It hits small called pots hardest. With a high drop, trim the weakest calls and keep the 3bets.',
      },
      {
        kind: 'quiz',
        question: 'Big blind against a 2.5bb button open with J6s. What does the chart do?',
        choices: ['Call', '3bet', 'Fold'],
        answer: 0,
        explain: 'Suited jacks call down to J4s. Only J9s and J8s mix in some 3bets. J6s is a pure call, well above the bottom of the range.',
      },
      {
        kind: 'quiz',
        question: 'Big blind against a 2.5bb button open with A4s. What does the chart do?',
        choices: ['Call every time', 'Call about 60%, 3bet the rest', '3bet about 60%, call the rest', '3bet every time'],
        answer: 2,
        explain: 'A5s down to A2s 3bet 60% of the time and call the rest. The ace makes AA and AK less likely, which suits a 3bet. These hands are also too good to fold, so they call when they do not 3bet.',
      },
      {
        kind: 'takeaway',
        points: [
          'You need about 27% raw equity against a 2.5bb open. You need more after realization.',
          'Defend more than half your hands against the button. The bottom of the range is mostly suited.',
          'Mix blocker hands like A5s into your 3bets.',
        ],
      },
    ],
  },
];

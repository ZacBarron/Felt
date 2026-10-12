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
        body: 'From the first seats, anyone behind can wake up with a big hand, and you will often play the pot out of position. Ranges start tight and widen one seat at a time.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-utg',
        title: 'UTG opens about 11%',
        caption: 'Pairs from 66, strong aces and the best suited broadways. The split cells are mixes: 55, A5s and T9s open about half the time.',
        highlight: ['55', 'A5s', 'T9s'],
      },
      {
        kind: 'text',
        title: 'Learn the edges, not 169 cells',
        body: [
          'For each family, remember the weakest hand that opens: the lowest pair, the lowest suited ace, the lowest offsuit ace, the lowest suited king.',
          'UTG: **66+**, **A9s+**, **KTs+**, **AJo+** and **KQo**. Everything inside those edges opens.',
        ],
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-lj',
        title: 'By LJ, about 17%',
        caption: 'Three seats later every suited ace opens, almost every pair, and more suited connectors join.',
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
        note: 'Starter charts, approximate. Solver exact charts will replace them.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why the edges sit where they do',
        body: [
          'A hand opens when raising beats folding, and folding is worth zero. Early, the risk is running into a strong hand behind: with eight players left, someone holds a premium far more often than when two are left.',
          'Offsuit hands suffer most. KJo loses to AK, AJ, KQ and every pair above it, and it rarely makes a strong enough hand to win a big pot. Suited hands keep flush equity and realize more, which is why A9s opens before ATo.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: '9-handed, 100bb, folded to you UTG with KJo.',
        choices: ['Raise', 'Fold'],
        answer: 1,
        explain: 'UTG opens KQo but not KJo. Offsuit kings are dominated too often from early position.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the LJ with A3s.',
        choices: ['Raise', 'Fold'],
        answer: 0,
        explain: 'Every suited ace opens from the LJ: nut flush potential and the ace blocks strong hands.',
      },
      {
        kind: 'takeaway',
        points: ['Early position: tight and strong.', 'Memorize the weakest hand in each family.', 'Each seat later adds a few hands at the edges.'],
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
        body: 'Late position wins the most because you act last after the flop. With fewer players left behind, you can open far wider.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-co',
        title: 'Cutoff, about 28%',
        caption: 'Every pair, every suited ace, suited kings from K5s, and offsuit broadways down to KTo, QTo and JTo.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-btn',
        title: 'Button, about 43%',
        caption: 'Any suited king, every offsuit ace, and offsuit hands down to K8o, Q9o, J9o and T9o.',
      },
      {
        kind: 'text',
        title: 'Why so wide',
        body: [
          'Only the blinds are left, and they will play the hand out of position.',
          'The 1.5bb already in the pot makes stealing profitable even when you are called sometimes.',
        ],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live adjustment',
        body: 'When the blinds call too often and rarely 3bet, keep opening wide but size up a little, and drop the weakest offsuit hands.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you on the button with K5s.',
        choices: ['Raise', 'Fold'],
        answer: 0,
        explain: 'The button opens every suited king.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the cutoff with Q7s.',
        choices: ['Raise', 'Fold'],
        answer: 1,
        explain: 'Suited queens open from Q8s in the cutoff. Q7s waits for the button.',
      },
      {
        kind: 'takeaway',
        points: ['CO about 28%, BTN about 43%.', 'Suited kings and offsuit aces carry late position ranges.', 'Steal more when the blinds play badly out of position.'],
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
        caption: 'A raise or fold strategy. It is close in EV to the full solver strategy and much easier to execute.',
      },
      {
        kind: 'text',
        title: 'Size it up',
        body: ['Open to about 3bb instead of 2.5bb. Out of position you want to win more pots preflop and play smaller ranges after.'],
      },
      {
        kind: 'text',
        title: 'What solvers actually do',
        body: [
          'With rake, modern solutions for the small blind mix limps with a large part of the range, and some trap strong hands by limping too. Limping keeps the pot small when you are out of position and lets you play more hands cheaply.',
          'A limp strategy only works if it is balanced: limp only weak hands and the big blind raises you off them. Raise or fold gives up a small amount of EV in exchange for a strategy you can play correctly at the table.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Against a passive big blind',
        body: 'Most live big blinds raise limps far too rarely. Against them, limping the weaker half of your range is a real exploit: you see cheap flops with hands that do not want to play a raised pot out of position.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the small blind with Q4s.',
        choices: ['Raise', 'Fold'],
        answer: 0,
        explain: 'Suited queens open from Q4s in the small blind.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the small blind with K7o.',
        choices: ['Raise', 'Fold'],
        answer: 1,
        explain: 'Offsuit kings open from K8o in the small blind. K7o folds.',
      },
      {
        kind: 'takeaway',
        points: ['Raise or fold about 42%, to about 3bb.', 'Solvers also limp; raise only is the simple, near equal baseline.', 'Limp more against a big blind that never punishes it.'],
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
        body: 'The big blind is half invested and closes the action, so it gets the best price at the table. That makes it the widest defending seat.',
      },
      {
        kind: 'formula',
        title: 'Your price against a 2.5bb open',
        formula: '1.5 ÷ 5.5 = 27%',
        parts: [
          ['Pot before you act', '0.5 + 1 + 2.5 = 4bb'],
          ['You call', '1.5bb more'],
        ],
        example: 'On raw equity, **27%** breaks even, and most hands have that against a button range. Out of position you realize less than your raw equity, so the real bar is higher.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-bb-vs-btn',
        title: 'Defend more than half',
        caption: 'Against a button open, 3bet about 10% and call about 46%. The split cells mix 3bets and calls.',
        highlight: ['A5s', 'A4s', 'K9s'],
      },
      {
        kind: 'text',
        title: 'Why 3bet some weaker hands',
        body: [
          'Hands like A5s and K9s make good 3bets: the ace or king blocks the button’s strongest hands, and they still play well when called.',
          'Your value 3bets come from the top: QQ+, AK, AQs, and part of JJ, TT and AQo.',
          'Mixing those hands into 3bets also keeps your calling range strong enough to defend on high card flops.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Where the defending range stops',
        body: [
          'The bottom of the calling range is set by realization, not raw equity. T6o has about **36%** against this button range and 93o about **32%**, both well above the 27% price, and both fold. They flop few strong hands or good draws and get pushed off their equity out of position.',
          '42s and 64o both have about **34%**. The chart calls 42s and folds 64o: flushes and draws let the suited hand keep its equity.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Rake changes this',
        body: 'A live drop of 10% up to a cap hits small called pots hardest. With a high drop, trim the weakest calls from the bottom of the range and keep the 3bets.',
      },
      {
        kind: 'quiz',
        question: 'Big blind against a 2.5bb button open with J6s.',
        choices: ['3bet', 'Call', 'Fold'],
        answer: 1,
        explain: 'Suited jacks call down to J4s. J6s is not strong enough to 3bet.',
      },
      {
        kind: 'quiz',
        question: 'Big blind against a button open with A4s. What does the chart do?',
        choices: ['Always 3bet', 'Mix 3bet and call', 'Always call', 'Fold'],
        answer: 1,
        explain: 'A5s to A2s 3bet about 60% of the time and call the rest.',
      },
      {
        kind: 'takeaway',
        points: ['You need about 27% raw equity against a 2.5bb open, more after realization.', 'Defend more than half your hands against the button, mostly suited at the bottom.', 'Mix blocker hands like A5s into your 3bets.'],
      },
    ],
  },
];

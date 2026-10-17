import type { LessonContent } from './types';

/**
 * Bet size follows how far ahead your value stays when called, not how wet
 * the board is. Every equity and share here is computed exactly with
 * @felt/core from Aced's BTN open and BB calling charts, and recomputed in
 * test/value.test.ts. The sizing conclusions are solver patterns.
 */

/** BB's calling range against K♥K♣, best hands first: [share of range %, BB equity %]. */
const CURVE_754: [number, number][] = [
  [0, 97.1],
  [5, 72.9],
  [10, 47.3],
  [15, 44],
  [20, 38.8],
  [25, 35.5],
  [30, 32.9],
  [35, 28.7],
  [40, 25.1],
  [45, 23.4],
  [50, 22.3],
  [55, 20.5],
  [60, 20],
  [65, 19.7],
  [70, 16.8],
  [75, 14.6],
  [80, 9.7],
  [85, 7.5],
  [90, 6.3],
  [95, 3.9],
  [100, 1.9],
];

const CURVE_732: [number, number][] = [
  [0, 91.4],
  [5, 28.7],
  [10, 25.1],
  [15, 21.8],
  [20, 21.8],
  [25, 18.6],
  [30, 18.4],
  [35, 14.3],
  [40, 14.3],
  [45, 14.3],
  [50, 10],
  [55, 8.9],
  [60, 8.4],
  [65, 6.4],
  [70, 5.9],
  [75, 4.7],
  [80, 3.1],
  [85, 3.1],
  [90, 1.5],
  [95, 0.3],
  [100, 0.3],
];

export const POSTFLOP_VALUE_LESSONS: LessonContent[] = [
  {
    key: 'postflop/cbet/thick-thin',
    level: 'advanced',
    minutes: 8,
    cover: { kind: 'cards', cards: 'KhKc', board: '7d5s4s' },
    practice: ['9max-100-rfi-btn', '9max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'Size follows your value',
        body: 'A common rule says to bet big on wet boards to charge draws. It is often wrong. Bet size follows how far ahead you stay when called. This lesson measures that on 2 low flops.',
      },
      {
        kind: 'visual',
        title: 'Thick and thin value',
        art: {
          kind: 'tree',
          root: 'You bet and get called',
          branches: [
            { label: 'Far ahead of the calls', value: 'Thick value, bet big', tone: 'green' },
            { label: 'Only a bit ahead', value: 'Thin value, bet smaller', tone: 'brass' },
          ],
        },
        caption:
          '**Thick value** means you stay far ahead of the hands that call. A set on a rainbow board is one example. **Thin value** means you are only a bit ahead. You lose to part of the calls, or the hands you beat have many outs. A big bet then folds the weak hands and keeps the strong ones.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'The driest board gets the biggest bets',
        board: '7d4c2s',
        caption:
          'Take BTN against BB on 7 high flops. Solvers bet biggest on the driest boards, like this one. They bet smallest on the wettest, like 7♦5♠4♠ with 2 spades. Charging draws cannot explain that. Thick and thin value can.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Kings on 7♦5♠4♠',
        cards: 'KhKc',
        board: '7d5s4s',
        caption:
          'BTN opens and BB calls, both from Aced’s charts. You hold K♥K♣ on a low, wet flop. BB holds some sets and straights. It also holds many draws and pairs with draws.',
      },
      {
        kind: 'visual',
        title: 'Line up BB’s hands on 754',
        art: { kind: 'curve', points: CURVE_754, xLabel: 'Share of BB’s calls, %', yLabel: 'BB equity vs KK, %', mark: [40, 25.1] },
        caption:
          'BB’s calling range is sorted from its best hands to its worst against K♥K♣. The line stays above 25% for a long way. **40.1%** of BB’s calls have more than 25% equity. KK has **73.2%** against the whole range. Equity is exact over every turn and river.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'The same line on 732',
        art: { kind: 'curve', points: CURVE_732, xLabel: 'Share of BB’s calls, %', yLabel: 'BB equity vs KK, %', mark: [10, 25.1] },
        caption:
          'Same ranges on 7♦3♣2♠. Only **10.3%** of BB’s calls have more than 25% against K♥K♣. KK has **86.5%** against the whole range. BB rarely calls with 73, 72 or 32. So it holds two pair or better only **2%** of the time.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'KK against the hands that stay',
        columns: ['Flop', 'All calls', 'Best 75%', 'Best 50%'],
        rows: [
          ['7♦5♠4♠', '73.2%', '66.7%', '59.7%'],
          ['7♦3♣2♠', '86.5%', '82.7%', '77.6%'],
        ],
        note:
          'K♥K♣ equity against part of BB’s calling range, exact over every turn and river. Aced’s charts, with BTN opening and BB calling. This is a simple model. BB keeps the hands that do best against KK. It keeps 75% against a third pot bet and 50% against a pot sized bet. Those are the MDF (minimum defense frequency) shares. Real defense depends on your whole range, not one hand.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'What a small bet keeps in on 754',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'T♥7♥', value: 20, tone: 'green' },
            { label: 'J♥5♥', value: 20, tone: 'green' },
            { label: 'A♥6♥', value: 41.8, tone: 'red' },
          ],
        },
        caption:
          'Each bar is BB’s exact equity against K♥K♣ on 7♦5♠4♠. T♥7♥ and J♥5♥ have 5 outs and **20%** each. Against them your value is thick. A♥6♥ has an open ender and **41.8%**. Against that draw your value is thin.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Why small wins on 754',
        art: {
          kind: 'tree',
          root: 'K♥K♣ on 7♦5♠4♠',
          branches: [
            { label: 'Big bet', value: 'BB folds T7 and J5, keeps its draws', tone: 'red' },
            { label: 'Small bet', value: 'T7 and J5 must call', tone: 'green' },
          ],
        },
        caption:
          'Against a big bet BB can fold its weakest pairs with no draw. It has better hands to defend with, like pairs with straight draws and combo draws. A small bet forces T7 and J5 to call. That extra thick value outweighs the thin value from draws. Charging draws looks at one part of the range only.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Weak pairs must pay on 732',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '6♥6♦', value: 10, tone: 'green' },
            { label: '8♥8♦', value: 8.4, tone: 'green' },
          ],
        },
        caption:
          'Like the 732 line showed, the hand halfway down BB’s calls has just **10%** equity. 6♥6♦ has **10%** against K♥K♣ and 8♥8♦ has **8.4%**. A pot sized bet still asks BB to defend half its range. So even pairs like these must call. Your value stays thick, and KK can bet big.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A72 bets small for another reason',
        board: 'Ad7c2s',
        caption:
          'On A72 rainbow solvers bet small, though AK has thick value. The size is built for marginal hands like 7x. They need protection from overcards like QJ and QT. They can only bet small. Strong hands and bluffs join them to stay balanced. On A♠K♦2♣ few marginal hands need protection. There strong hands go back to big bets, sometimes overbets.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'You bet and get called. When is your value thick?',
        choices: ['You stay far ahead of the hands that call', 'The board has many draws to charge', 'You beat about half the hands that call'],
        answer: 0,
        explain:
          'Like the thick and thin tree showed, thick value stays far ahead of the calls. A big bet still gets called by worse hands. Beating only half the calls is thin value. Draws on the board make value thinner, not thicker.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You hold K♥K♣ on 7♦5♠4♠. With Aced’s charts, how much of BB’s calling range has over 25% equity against you?',
        cards: 'KhKc',
        board: '7d5s4s',
        choices: ['About 10%', 'About 40%', 'About 75%'],
        answer: 1,
        explain:
          'Like the 754 line showed, 40.1% of BB’s calls have more than 25% equity. On 7♦3♣2♠ only 10.3% do. So a big bet on 754 keeps many hands that hurt you.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'You hold K♥K♣ on 7♦5♠4♠. Why can a smaller bet earn more than a big one?',
        cards: 'KhKc',
        board: '7d5s4s',
        choices: ['It keeps in weak pairs like T7 with 20% equity', 'It charges the flush draws a bigger price', 'It gets more folds from BB’s sets'],
        answer: 0,
        explain:
          'Like the bars showed, T♥7♥ and J♥5♥ have 5 outs and 20% equity. A big bet lets BB fold them. A small bet makes them call, and that value is thick. It outweighs the thin value from draws.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'You hold K♥K♣ on 7♦3♣2♠. What is your equity against BB’s whole calling range?',
        cards: 'KhKc',
        board: '7d3c2s',
        choices: ['About 60%', 'About 73%', 'About 86%'],
        answer: 2,
        explain:
          'Like the 732 line showed, KK has 86.5% against BB’s calls. On 7♦5♠4♠ it has 73.2%. On 732 BB holds two pair or better only 2% of the time. So your value stays thick against a big bet.',
        point: 2,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'BTN against BB on A♦7♣2♠. Solvers bet small with most hands. What drives that size?',
        board: 'Ad7c2s',
        choices: ['Marginal hands like 7x that need protection', 'Big draws that must be charged', 'BB’s many sets and two pair'],
        answer: 0,
        explain:
          'Like the A72 step showed, 7x needs protection from overcards like QJ and QT. It can only bet small. Strong hands and bluffs use the same size to stay balanced.',
        point: 3,
        shuffleSuits: true,
      },
      {
        kind: 'takeaway',
        points: [
          'Thick value stays far ahead of the hands that call. That is what makes a big bet pay.',
          'On 7♦5♠4♠, 40.1% of BB’s calls have over 25% against KK. So bet smaller and get called by weak pairs.',
          'On 7♦3♣2♠ few calls beat you or have many outs. So KK bets big, and weak pairs still pay.',
          'On A72 the size serves marginal hands like 7x. Strong hands join them to stay balanced.',
        ],
      },
    ],
  },
];

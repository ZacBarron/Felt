/**
 * Scenarios: full hands played street by street. The preflop decision is
 * graded against a starter chart. The river decision is solved live by Felt
 * Solver for the ranges below and graded by the EV each action loses, so the
 * grade is exact for the stated ranges. Flop and turn are told as the story
 * of the hand.
 */

export interface ScenarioStreet {
  street: 'flop' | 'turn';
  /** The board so far, e.g. 'Kc7d2s' then 'Kc7d2s9h'. */
  board: string;
  /** What happened on this street, in one or two short sentences. */
  narrative: string;
  /** Optional coaching note on why the line makes sense. */
  note?: string;
}

export interface ScenarioRiver {
  /** All 5 cards. */
  board: string;
  /** Pot at the start of the river, in big blinds. */
  pot: number;
  /** Effective stack behind at the start of the river, in big blinds. */
  stack: number;
  /** Out of position range, then in position range. Hand classes or exact combos (QhJh). */
  ranges: [string, string];
  /** Which side the hero is: 0 out of position, 1 in position. */
  hero: 0 | 1;
  /** Actions before the hero's decision, by solver action id: 'check', 'bet75', 'raise60', 'call'. Empty if the hero acts first. */
  line: string[];
  /** Bet sizes as fractions of the pot: out of position, then in position. */
  sizes: [number[], number[]];
  /** Raise sizes as fractions of the pot, for both players. Empty for no raises. */
  raises: number[];
  /** Shown after the answer: why the solver's play makes sense. No exact frequencies. */
  explain: string;
}

export interface ScenarioSpec {
  id: string;
  title: string;
  /** One sentence shown on the list. */
  summary: string;
  level: 'core' | 'advanced';
  hero: { seat: string; cards: string };
  villain: { seat: string; type?: string };
  preflop: {
    /** Starter chart that grades the preflop decision. */
    chartId: string;
    /** What happened after the hero's preflop action. */
    narrative: string;
  };
  streets: ScenarioStreet[];
  river: ScenarioRiver;
}

export const SCENARIOS: ScenarioSpec[] = [
  {
    id: 'btn-vs-bb-top-pair-value',
    title: 'Top pair on a dry river',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'BTN', cards: 'AhKc' },
    villain: { seat: 'BB' },
    preflop: { chartId: '9max-100-rfi-btn', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Kd7s3c', narrative: 'TODO' },
      { street: 'turn', board: 'Kd7s3c2h', narrative: 'TODO' },
    ],
    river: {
      board: 'Kd7s3c2h9d',
      pot: 21.1,
      stack: 89.7,
      ranges: [
        'KQo, KJo:0.6, KTo, K9o:0.7, K8o, K7o:0.5, KQs:0.6, KJs:0.5, KTs:0.5, K9s:0.5, K8s:0.6, K6s:0.6, K5s:0.6, K4s, K7s:0.5, K3s:0.5, K2s, 77:0.3, 33:0.3, 22:0.5, 99:0.4, 88:0.5, TT:0.4, A7s, A7o:0.5, 87s, 97s:0.6, 76s, 54s, 64s, A5s:0.4, A4s:0.4',
        'AK, KQs, KQo, KJs, KJo:0.6, KTs, K9s, K7s, K3s, AA, QQ:0.3, JJ:0.3, 77, 33, 22:0.5, A7s:0.5, 87s:0.5, A5s, A4s, 65s, 64s, 54s, QJs:0.5, QTs:0.5, JTs:0.5',
      ],
      hero: 1,
      line: ['check'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'bb-vs-btn-bluff-catch',
    title: 'Second pair on a paired river',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'BB', cards: '8h7h' },
    villain: { seat: 'BTN' },
    preflop: { chartId: '9max-100-bb-vs-btn', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Td7c3s', narrative: 'TODO' },
      { street: 'turn', board: 'Td7c3s2h', narrative: 'TODO' },
    ],
    river: {
      board: 'Td7c3s2h2d',
      pot: 9.1,
      stack: 95.7,
      ranges: [
        'T9s, T8s:0.6, T6s, T5s, T9o, T8o, QTs:0.6, QTo, JTs, JTo, KTo, A7s, A7o, K7s, Q7s, J7s, 97s:0.6, 87s, 76s, 87o, 97o, 75s:0.6, 74s, A3s:0.4, 43s, 53s, 63s, 44, 55, 66, 88, 99, 98s, 65s, 54s, A8o:0.5, A9o:0.5',
        'KTs:0.5, KTo:0.5, QTs:0.7, QTo:0.5, JTs:0.7, JTo:0.5, T9s, ATo:0.3, A7s, 87s, 97s, 76s, 44, 55, 66, 88, 99, JJ:0.2, QQ:0.2, KQs, KQo:0.5, KJs, KJo:0.5, QJs, QJo:0.5, AQo:0.5, AJo:0.5, A5s, A4s, K9s, Q9s, J9s, 98s, 65s, 54s, 64s',
      ],
      hero: 0,
      line: ['check', 'bet75'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'co-vs-bb-missed-draw',
    title: 'Missed flush draw on the river',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'CO', cards: 'JhTh' },
    villain: { seat: 'BB' },
    preflop: { chartId: '9max-100-rfi-co', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Qh9h4c', narrative: 'TODO' },
      { street: 'turn', board: 'Qh9h4c2s', narrative: 'TODO' },
    ],
    river: {
      board: 'Qh9h4c2s7c',
      pot: 21.1,
      stack: 89.7,
      ranges: [
        'QJo, QTs:0.6, QTo, Q8s, Q7s, Q6s, Q5s, KQo:0.5, QJs:0.5, A9s, K9s, T9s, J9s, 98s, A9o:0.5, T9o:0.5, JTs, JTo, KJo:0.4, T8s, 87s, 76s, TT:0.5, JJ:0.4, 88:0.5, 77:0.5, 22:0.4, 44:0.3, 99:0.3, AhJh, AhTh, Ah8h, Ah7h, Ah6h, Ah5h, Ah3h, Ah2h, KhJh, KhTh, Kh8h, JhTh, Th8h, 8h7h, 8h6h, 7h6h, 6h5h, 5h3h',
        'AQ, KQs, KQo, QJs, QTs, Q9s, AA, KK, JJ:0.4, TT:0.4, 99, 44, 22, JTo:0.5, KJs:0.4, JsTs, JdTd, JcTc, AhKh, AhJh, AhTh, Ah8h, Ah7h, Ah6h, Ah5h, Ah3h, Ah2h, KhJh, KhTh, JhTh, Th8h, 8h7h, 7h6h, 6h5h',
      ],
      hero: 1,
      line: ['check'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'btn-vs-co-showdown-value',
    title: 'Pocket pair after the turn checks through',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'BTN', cards: '8s8d' },
    villain: { seat: 'CO' },
    preflop: { chartId: '9max-100-btn-vs-co', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: '9h7d3c', narrative: 'TODO' },
      { street: 'turn', board: '9h7d3cKc', narrative: 'TODO' },
    ],
    river: {
      board: '9h7d3cKc2s',
      pot: 10.9,
      stack: 95.3,
      ranges: [
        '44, 55, 66, 88:0.5, TT, JJ, QQ:0.6, A9s:0.5, A9o:0.5, T9s:0.5, 98s:0.5, J9s:0.5, Q9s:0.5, AQs, AQo, AJs, AJo, ATs, A5s, A4s, KQs:0.3, KJs:0.3, KTs:0.3, 86s:0.5, T8s, JTs, QJs, 65s, 54s, 87s:0.5',
        '88, 66, 55, 44, TT:0.7, JJ:0.4, A9s, T9s, 98s, J9s, Q9s, 87s, 76s, A7s, T8s, 65s, JTs, QJs:0.5, AJo:0.5, A8s, A6s, A5s:0.3, KQs:0.3, KJs:0.3',
      ],
      hero: 1,
      line: ['check'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'bb-3bet-pot-two-pair',
    title: 'Two pair in a 3bet pot',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'BB', cards: 'AhKc' },
    villain: { seat: 'BTN' },
    preflop: { chartId: '9max-100-bb-vs-btn', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'As8c4d', narrative: 'TODO' },
      { street: 'turn', board: 'As8c4d2h', narrative: 'TODO' },
    ],
    river: {
      board: 'As8c4d2hKd',
      pot: 37.5,
      stack: 81.5,
      ranges: [
        'AK:0.5, AQs:0.5, AQo:0.3, AJs:0.5, ATs:0.3, A5s:0.4, A3s:0.4, KK:0.5, QQ:0.6, JJ:0.4, TT:0.3, KQs:0.4, KJs:0.4, KTs:0.4, K9s:0.4, QJo:0.3, Q9s:0.3, J9s:0.3, T9o:0.2, 86s:0.3, 75s:0.3, 97s:0.3, 53s:0.2',
        'AQs:0.7, AQo, AJs, ATs, A9s, A7s, A6s, AJo, ATo:0.5, AKo:0.2, 88:0.3, 44:0.3, 22:0.3, 99, TT, JJ, QQ:0.4, 77, 66, 55, KQs, KJs, KTs, K9s, QJs, JTs, T9s, 98s, 97s, 87s, 76s, 65s, 54s',
      ],
      hero: 0,
      line: [],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'sb-vs-bb-top-pair',
    title: 'Blind vs blind top pair',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'SB', cards: 'QsJd' },
    villain: { seat: 'BB' },
    preflop: { chartId: '9max-100-rfi-sb', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Jc6d2h', narrative: 'TODO' },
      { street: 'turn', board: 'Jc6d2h8s', narrative: 'TODO' },
    ],
    river: {
      board: 'Jc6d2h8s2c',
      pot: 10,
      stack: 95,
      ranges: [
        'QJ, JTs, JTo, J9s, J9o, J7s, KJo:0.5, KJs:0.5, AJ:0.4, A6s, K6s, 76s, 65s, 33, 44, 55, 77, 99, TT, AK:0.5, AQ:0.5, KQ, KT, QT, T9s, 97s, 75s, 54s',
        'J9s, J9o, J7s, J5s, J4s, J3s, JTo, JTs:0.5, QJo:0.5, A6s, A6o, K6s, 76s, 65s, 96s, 76o, 98s, A8s, A8o, 87s, 33, 44, 55, 77, 99, TT, T9s, T9o, 97s, 75s, 54s, 43s, K9s, Q9s, KTs',
      ],
      hero: 0,
      line: [],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'btn-iso-top-pair',
    title: 'Top pair against a limper',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'BTN', cards: 'AhJc' },
    villain: { seat: 'UTG+1', type: 'loose passive' },
    preflop: { chartId: '9max-100-iso-btn-vs-1limp', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Jd7s4c', narrative: 'TODO' },
      { street: 'turn', board: 'Jd7s4c9h', narrative: 'TODO' },
    ],
    river: {
      board: 'Jd7s4c9h2s',
      pot: 43.5,
      stack: 79,
      ranges: [
        'KJ, QJ, JT, J9s, J8s, A7s, A7o:0.5, 87s, 76s, 97s, T9s, T9o:0.5, 98s, 98o:0.5, 88, TT, 66:0.5, 77:0.5, 99:0.5, 44:0.5, T8s, T8o:0.5, 86s, 65s, 53s, QTs, A9s:0.5, A9o:0.3',
        'AJ, KJ:0.7, QJ:0.6, JTs, AA, KK, QQ, TT, 99, 77, 44:0.5, 88:0.5, KQs:0.5, KQo:0.5, QTs, T8s, AQs:0.3',
      ],
      hero: 1,
      line: ['check'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'utg-3bet-pot-overcard-river',
    title: 'Overpair when the king lands',
    summary: 'TODO',
    level: 'core',
    hero: { seat: 'UTG', cards: 'JcJh' },
    villain: { seat: 'BTN' },
    preflop: { chartId: '9max-100-utg-vs-3bet', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: '9c6d3s', narrative: 'TODO' },
      { street: 'turn', board: '9c6d3s2h', narrative: 'TODO' },
    ],
    river: {
      board: '9c6d3s2hKd',
      pot: 27.5,
      stack: 87,
      ranges: [
        'QQ:0.5, JJ, TT, 99:0.3, 88:0.3, AKo:0.4, AQs, AJs, ATs:0.5, KQs, KJs:0.5, QJs:0.4, JTs:0.3, AQo:0.3',
        'AQs, AKs:0.5, AKo:0.5, AJs:0.5, KQs, KJs, A5s, A4s, QQ:0.5, TT:0.5, JJ:0.5, 76s, 65s, 87s, T8s, 54s, KK:0.3, AA:0.3',
      ],
      hero: 0,
      line: ['check', 'bet75'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'bb-vs-btn-river-check-raise',
    title: 'Rivered straight out of position',
    summary: 'TODO',
    level: 'advanced',
    hero: { seat: 'BB', cards: 'JhTh' },
    villain: { seat: 'BTN' },
    preflop: { chartId: '9max-100-bb-vs-btn', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Qs9d5c', narrative: 'TODO' },
      { street: 'turn', board: 'Qs9d5c2h', narrative: 'TODO' },
    ],
    river: {
      board: 'Qs9d5c2h8s',
      pot: 21.1,
      stack: 89.7,
      ranges: [
        'JTs, JTo, KQo, QJo:0.6, QTs, QTo, Q8s, Q7s, Q6s, A9s, T9s, 98s, J9s:0.5, 97s:0.6, 96s, A9o:0.6, K9s:0.5, K9o:0.7, T9o, 98o, 76s, 87s, 43s, 64s, 22:0.5, 55:0.3, 88:0.5, KJs:0.5, KJo:0.5, KTs:0.5, KTo:0.5, T8s:0.6',
        'AQ, KQ, QJs, QJo, QTs, AA, KK, JJ:0.3, 99:0.5, 55:0.5, 22:0.5, JTs, JTo:0.5, KJs, KJo:0.5, KTs, T8s, 87s, 76s, 43s, AJs:0.5, A9s, T9s:0.5',
      ],
      hero: 0,
      line: ['check', 'bet75'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [0.6],
      explain: 'TODO',
    },
  },
  {
    id: 'btn-vs-bb-thin-value',
    title: 'Second pair, top kicker',
    summary: 'TODO',
    level: 'advanced',
    hero: { seat: 'BTN', cards: 'Ah9c' },
    villain: { seat: 'BB' },
    preflop: { chartId: '9max-100-rfi-btn', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: '9s6h2d', narrative: 'TODO' },
      { street: 'turn', board: '9s6h2dKc', narrative: 'TODO' },
    ],
    river: {
      board: '9s6h2dKc4s',
      pot: 9.1,
      stack: 95.7,
      ranges: [
        'T9s, T9o, 98s, 98o, 97s, 96s, J9s, J9o, Q9o:0.5, A6s, A6o:0.5, K6s, 76s, 76o:0.5, 65s, 86s, 64s, A2s:0.5, 32s, 42s, 52s, 33, 44, 55, 77, 88, TT:0.5, K8s, K7s, K5s, K3s, 87s, 85s, 75s, 54s, 53s, 43s, T8s, A9o:0.5, A9s:0.3',
        'A9s, A9o, T9s, 98s, 97s, J9s, Q9s, T9o:0.5, J9o:0.5, 76s, 65s, A6s, 86s, 77, 88, TT:0.5, JJ:0.5, QQ:0.3, 33, 44, 55, AQo:0.5, AJo:0.5, ATo:0.5, A8o:0.5, AQs:0.5, AJs:0.5, 87s, 85s, 75s, T8s, 54s, 53s',
      ],
      hero: 1,
      line: ['check'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'btn-3bet-pot-bluff-catch',
    title: 'Top pair facing a river shove',
    summary: 'TODO',
    level: 'advanced',
    hero: { seat: 'BTN', cards: 'KsQd' },
    villain: { seat: 'BB' },
    preflop: { chartId: '9max-100-btn-vs-3bet', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Kh7h3c', narrative: 'TODO' },
      { street: 'turn', board: 'Kh7h3c2s', narrative: 'TODO' },
    ],
    river: {
      board: 'Kh7h3c2s9d',
      pot: 87.5,
      stack: 56.5,
      ranges: [
        'AA, KK, AK, KQs:0.4, KJs:0.5, KTs:0.5, K9s:0.5, K8s:0.4, KJo:0.4, QQ:0.5, JJ:0.3, AhQh, AhJh, Ah5h, Ah4h, Ah3h:0.5, Ah2h, Qh9h, Jh9h, Th8h, 8h6h, 6h4h, 5h3h:0.5, 6s4s:0.4, 6d4d:0.4, 6c4c:0.4, As5s:0.5, Ad5d:0.5, Ac5c:0.5, As4s:0.5, Ad4d:0.5, Ac4c:0.5',
        'KQs, KJs, KTs, K9s, K8s:0.4, KQo, KJo:0.5, A7s:0.5, 87s:0.5, 77:0.5, 33:0.5, QQ:0.4, JJ:0.5, TT:0.3, 99:0.3, 88:0.3, AhQh, AhJh, AhTh, Ah9h, Ah8h, Ah6h, Ah5h, Ah4h, QhJh, QhTh, JhTh, Th9h, 9h8h, 8h6h, 6h5h, 5h4h',
      ],
      hero: 1,
      line: ['allin'],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
  {
    id: 'sb-3bet-pot-river-bluff',
    title: 'Missed nut flush draw in a 3bet pot',
    summary: 'TODO',
    level: 'advanced',
    hero: { seat: 'SB', cards: 'As5s' },
    villain: { seat: 'BTN' },
    preflop: { chartId: '9max-100-sb-vs-btn', narrative: 'TODO' },
    streets: [
      { street: 'flop', board: 'Ts7s3d', narrative: 'TODO' },
      { street: 'turn', board: 'Ts7s3d2c', narrative: 'TODO' },
    ],
    river: {
      board: 'Ts7s3d2cKh',
      pot: 88,
      stack: 56.5,
      ranges: [
        'AA, KK:0.5, QQ, JJ, ATs, ATo, KTs, TT:0.5, 77:0.4, 98s:0.5, J9s, A5s:0.5, A4s:0.5, AsQs, AsJs, As9s, As8s, As6s, As5s, As4s, KsQs, KsJs, QsJs, Js9s, 9s8s, 6s5s',
        'JJ, QQ:0.4, 99:0.6, 88:0.5, 77, 33, 22, ATs, KTs, QTs, JTs, T9s, AQs:0.3, 98s, 65s, 54s, 86s:0.5, KsQs, KsJs, QsJs, 9s8s, 6s5s, 5s4s',
      ],
      hero: 0,
      line: [],
      sizes: [[0.33, 0.75], [0.33, 0.75]],
      raises: [],
      explain: 'TODO',
    },
  },
];

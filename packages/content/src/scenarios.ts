/**
 * Scenarios: full hands played street by street. The preflop decision is
 * graded against a starter chart. The river decision is solved live by Suited
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

/**
 * 9-handed, 100bb, blinds 0.5bb and 1bb. Opens are 2.5bb (3bb from the small
 * blind), 3bets 11bb out of position and 7.5bb in position. Pots and stacks
 * follow exactly from the sizes in each story. River ranges hold only hands
 * that would take the line both players took, and every hero hand was checked
 * against Suited Solver (under 0.5% of the pot exploitable, and the river
 * decision is worth at least 3% of the pot).
 */
export const SCENARIOS: ScenarioSpec[] = [
  {
    id: 'btn-two-pair-value',
    title: 'Two pair on a dry board',
    summary: 'You flop two pair on the button and choose a river bet size.',
    level: 'core',
    hero: { seat: 'BTN', cards: 'Kh7h' },
    villain: { seat: 'BB' },
    preflop: {
      chartId: '9max-100-rfi-btn',
      narrative: 'You open to 2.5bb on the button. The small blind folds and BB calls.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Kd7s3c',
        narrative: 'BB checks. You bet 1.8bb into 5.5bb and BB calls.',
        note: 'A small c-bet works well on a dry king high board. You have more strong kings than BB.',
      },
      {
        street: 'turn',
        board: 'Kd7s3c2h',
        narrative: 'BB checks. You bet 6bb into 9.1bb and BB calls again.',
        note: 'The 2 changes very little. Keep building the pot with your strong hands.',
      },
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
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver bets big with this hand almost every time. BB has called twice with lots of one pair kings like KQ and KT. Those hands can call a big bet. They fold to a shove, which gets called mostly by sets and better two pair. A small bet is fine but leaves value behind.',
    },
  },
  {
    id: 'bb-nines-bluff-catch',
    title: 'Pocket nines facing a river bet',
    summary: 'BTN checks back the turn and then bets big on a paired river.',
    level: 'core',
    hero: { seat: 'BB', cards: '9s9h' },
    villain: { seat: 'BTN' },
    preflop: {
      chartId: '9max-100-bb-vs-btn',
      narrative: 'BTN opens to 2.5bb and the small blind folds. You call in the big blind.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Td7c3s',
        narrative: 'You check. BTN bets 1.8bb into 5.5bb and you call.',
        note: 'Your nines are below the ten but ahead of much of the BTN range. Calling a small bet is easy.',
      },
      {
        street: 'turn',
        board: 'Td7c3s2h',
        narrative: 'You check and BTN checks back.',
        note: 'BTN would bet again with most strong tens. Its check makes a big ten less likely.',
      },
    ],
    river: {
      board: 'Td7c3s2h2d',
      pot: 9.1,
      stack: 95.7,
      ranges: [
        'T9s, T8s:0.6, T6s, T5s, T9o, T8o, QTs:0.6, JTs, A7s, A7o, K7s, Q7s, 97s:0.6, 87s, 76s, 75s:0.6, 74s, A3s:0.4, 43s, 53s, 63s, 44, 55, 66, 88, 99, 98s, 65s, 54s',
        'KTs, QTs, JTs, T9s, QTo:0.5, A7s, 87s, 97s, 76s, 44, 55, 66, 88, 99, KQs, KJs, QJs, KQo:0.5, AQo:0.5, A5s, A4s, K9s, Q9s, J9s, 98s, 65s, 54s',
      ],
      hero: 0,
      line: ['check', 'bet75'],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver calls with this hand every time. BTN checked the turn, so its range is capped. Its big bets include some tens and some thin value with 88. They also include missed straight draws like 98 and J9. Your nines beat or tie everything but a ten. Folding here gives up far too much.',
    },
  },
  {
    id: 'co-missed-draw-bluff',
    title: 'Missed flush draw',
    summary: 'Your flush draw misses on the river after you bet twice.',
    level: 'core',
    hero: { seat: 'CO', cards: 'JhTh' },
    villain: { seat: 'BB' },
    preflop: {
      chartId: '9max-100-rfi-co',
      narrative: 'You open to 2.5bb from the cutoff. The button and small blind fold, and BB calls.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Qh9h4c',
        narrative: 'BB checks. You bet 1.8bb into 5.5bb with a flush draw and a gutshot. BB calls.',
        note: 'Strong draws make good c-bets. You can win the pot now or hit later.',
      },
      {
        street: 'turn',
        board: 'Qh9h4c2s',
        narrative: 'BB checks. You bet 6bb into 9.1bb and BB calls.',
        note: 'You still have lots of outs. Betting again keeps the pressure on weak queens and pairs.',
      },
    ],
    river: {
      board: 'Qh9h4c2s7c',
      pot: 21.1,
      stack: 89.7,
      ranges: [
        'QJo, QTs:0.6, QTo, Q8s, Q7s, Q6s, Q5s, KQo:0.5, QJs:0.5, A9s, K9s, T9s, J9s, 98s, JTs, JTo, T8s, 87s, 76s, TT:0.5, JJ:0.4, 88:0.5, 77:0.5, 22:0.4, 44:0.3, 99:0.3, AhJh, AhTh, Ah8h, Ah7h, Ah6h, Ah5h, Ah3h, Ah2h, KhJh, KhTh, Kh8h, JhTh, Th8h, 8h7h, 8h6h, 7h6h, 6h5h, 5h3h',
        'AQ, KQs, KQo, QJs, QTs, Q9s, AA, KK, JJ:0.4, TT:0.4, 99, 44, 22, JTo:0.5, KJs:0.4, JsTs, JdTd, JcTc, AhKh, AhJh, AhTh, Ah8h, Ah7h, Ah6h, Ah5h, Ah3h, Ah2h, KhJh, KhTh, JhTh, Th8h, 8h7h, 7h6h, 6h5h',
      ],
      hero: 1,
      line: ['check'],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver bets this hand almost every time, mostly with the big size. Jack high rarely wins at showdown. Many BB hands beat you but fold to a big bet. Pairs like TT and 88 are the main ones. Your jack and ten also block QJ and QT, which would call. A small bet is close but folds out fewer of those pairs.',
    },
  },
  {
    id: 'btn-small-pair-check-back',
    title: 'Small pair with showdown value',
    summary: 'You flat an open on the button and reach the river with a small pair.',
    level: 'core',
    hero: { seat: 'BTN', cards: '6s6c' },
    villain: { seat: 'CO' },
    preflop: {
      chartId: '9max-100-btn-vs-co',
      narrative: 'CO opens to 2.5bb. You call on the button and both blinds fold.',
    },
    streets: [
      {
        street: 'flop',
        board: '9h7d3c',
        narrative: 'CO bets 2.2bb into 6.5bb. You call with your small pair.',
        note: 'In position, a small pair can call one small bet. It has some showdown value and a little room to improve.',
      },
      {
        street: 'turn',
        board: '9h7d3cKc',
        narrative: 'CO checks. You check back.',
        note: 'The king is a good card for the CO range. A bet would fold out worse hands and get called by better ones.',
      },
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
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver checks this hand almost every time. CO checked twice, so it holds lots of ace high and small pairs. Your sixes beat those at showdown. A small bet gets called by some ace high hands. But CO can also check-raise with strong hands and bluffs. Then your sixes have to fold or pay off. A small bet is a close second, so it is not a big mistake.',
    },
  },
  {
    id: 'bb-3bet-pot-aces-shove',
    title: 'Aces in a 3bet pot',
    summary: 'You 3bet aces from the big blind and bet every street.',
    level: 'core',
    hero: { seat: 'BB', cards: 'AhAd' },
    villain: { seat: 'BTN' },
    preflop: {
      chartId: '9max-100-bb-vs-btn',
      narrative: 'BTN opens to 2.5bb and the small blind folds. You 3bet to 11bb and BTN calls.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Kc9d5h',
        narrative: 'You bet 7.5bb into 22.5bb. BTN calls.',
        note: 'A small c-bet suits a 3bet pot on a king high board. Your range has more big pairs than BTN.',
      },
      {
        street: 'turn',
        board: 'Kc9d5h2s',
        narrative: 'You bet 12.5bb into 37.5bb. BTN calls again.',
        note: 'A third of the pot keeps worse kings and pairs in. Aces want them to keep calling.',
      },
    ],
    river: {
      board: 'Kc9d5h2s3c',
      pot: 62.5,
      stack: 69,
      ranges: [
        'AK, KQs:0.4, KJs:0.5, KTs:0.5, K9s:0.5, K8s:0.4, K7s:0.4, K6s:0.4, K5s:0.4, KJo:0.4, AA, KK, QQ:0.3, JJ:0.2, A4s:0.6, A5s:0.4, QJo:0.3, J9s:0.3, Q9s:0.3, 86s:0.4, 64s:0.4',
        'KQs, KJs, KTs, K9s:0.6, KQo, KJo:0.5, A9s:0.7, 99:0.2, 55:0.2, 22:0.2, QQ:0.4, JJ, TT:0.8, T9s:0.8, J9s:0.8, Q9s:0.8, 98s:0.8, 86s, 76s, 65s, A4s:0.5, A3s:0.5, QJs:0.6, JTs:0.6, QTs:0.6',
      ],
      hero: 0,
      line: [],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver shoves this hand almost every time. BTN called two bets, so it holds lots of kings like KQ and KT. Those hands can call a shove. Aces beat all of them. The 3 makes a straight only for A4, so you are rarely beaten. A smaller bet still makes money but leaves chips behind.',
    },
  },
  {
    id: 'sb-bvb-thin-value',
    title: 'Blind vs blind underpair',
    summary: 'You open the small blind and reach the river with pocket tens.',
    level: 'core',
    hero: { seat: 'SB', cards: 'TdTh' },
    villain: { seat: 'BB' },
    preflop: {
      chartId: '9max-100-rfi-sb',
      narrative: 'It folds to you in the small blind. You raise to 3bb and BB calls.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Jc6d2h',
        narrative: 'You bet 2bb into 6bb. BB calls.',
        note: 'Blind vs blind ranges are wide. A small c-bet with much of your range works well.',
      },
      {
        street: 'turn',
        board: 'Jc6d2h8s',
        narrative: 'You check and BB checks back.',
        note: 'Your tens beat many hands but hate facing a raise. Checking keeps the pot small.',
      },
    ],
    river: {
      board: 'Jc6d2h8s2c',
      pot: 10,
      stack: 95,
      ranges: [
        'QJ, JTs, JTo, J9s, J7s, KJs:0.5, AJ:0.4, A6s, K6s, 76s, 65s, 33, 44, 55, 77, 99, TT, AKs, AKo:0.5, AQs, KQs, KQo, KTs, QTs, T9s, 97s, 75s, 54s',
        'J9s, J9o, J7s, J5s, J4s, J3s, JTo, JTs:0.5, QJo:0.5, A6s, K6s, 76s, 65s, 96s, 98s, A8s, A8o, 87s, 33, 44, 55, 77, 99, TT, T9s, 97s, 75s, 54s, 43s, K9s, Q9s, KTs',
      ],
      hero: 0,
      line: [],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver bets small with this hand almost every time. BB has some jacks but many more weaker pairs. Pairs of sixes and eights call a small bet. So do small pocket pairs. Many of them fold to a big one. A third of the pot gets value from those hands and costs little when BB has a jack. Checking gives up that value.',
    },
  },
  {
    id: 'btn-iso-top-pair-check',
    title: 'Top pair against a limper',
    summary: 'You isolate a limper and reach the river with top pair and the best kicker.',
    level: 'core',
    hero: { seat: 'BTN', cards: 'AhJc' },
    villain: { seat: 'UTG+1' },
    preflop: {
      chartId: '9max-100-iso-btn-vs-1limp',
      narrative: 'UTG+1 limps and it folds to you. You raise to 5bb on the button. The blinds fold and UTG+1 calls.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Jd7s4c',
        narrative: 'UTG+1 checks. You bet 4bb into 11.5bb and UTG+1 calls.',
        note: 'Top pair with the best kicker is well ahead of a limping range. Bet for value.',
      },
      {
        street: 'turn',
        board: 'Jd7s4c9h',
        narrative: 'UTG+1 checks. You bet 12bb into 19.5bb and UTG+1 calls again.',
        note: 'Worse jacks and draws still call. The 9 does complete T8, so take care on the river.',
      },
    ],
    river: {
      board: 'Jd7s4c9h2s',
      pot: 43.5,
      stack: 79,
      ranges: [
        'KJ, QJ, JT, J9s, J8s, A7s, A7o:0.5, 87s, 76s, 97s, T9s, 98s, 98o:0.5, 88, TT, 66:0.5, 77:0.5, 99:0.5, 44:0.5, T8s, T8o:0.5, 86s, 65s, 53s, QTs, A9s:0.5',
        'AJ, KJ:0.7, QJ:0.6, JTs, AA, KK, QQ, TT, 99, 77, 44:0.5, 88:0.5, KQs:0.5, KQo:0.5, QTs, T8s, AQs:0.3',
      ],
      hero: 1,
      line: ['check'],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver checks this hand back almost every time. A player who calls twice on this board has plenty of two pair and straights. A bet still gets calls from worse jacks like KJ. But the big hands raise, and then you must fold or pay off. Checking beats those same worse jacks at showdown with no risk.',
    },
  },
  {
    id: 'utg-3bet-pot-jacks-call',
    title: 'Jacks when the king lands',
    summary: 'You call a 3bet with jacks and face a river bet when a king arrives.',
    level: 'core',
    hero: { seat: 'UTG', cards: 'JcJh' },
    villain: { seat: 'BTN' },
    preflop: {
      chartId: '9max-100-utg-vs-3bet',
      narrative: 'You open to 2.5bb under the gun. BTN 3bets to 7.5bb and the blinds fold. You call.',
    },
    streets: [
      {
        street: 'flop',
        board: '9c6d3s',
        narrative: 'You check. BTN bets 5.5bb into 16.5bb and you call.',
        note: 'Your jacks are an overpair. Checking lets BTN keep betting its bluffs.',
      },
      {
        street: 'turn',
        board: '9c6d3s2h',
        narrative: 'You check and BTN checks back.',
        note: 'BTN would bet again with most of its strong hands. Its check makes ace king and draws more likely.',
      },
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
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver calls with this hand almost every time. The king does help BTN. Hands like AK and KQ just made top pair. But BTN also bets missed draws like 87s and A5s. You need to win a bit under a third of the time for the call to pay. Jacks beat every one of those bluffs.',
    },
  },
  {
    id: 'bb-river-check-raise',
    title: 'Rivered nut straight',
    summary: 'You call two barrels with a straight draw and hit on the river.',
    level: 'advanced',
    hero: { seat: 'BB', cards: 'JhTh' },
    villain: { seat: 'BTN' },
    preflop: {
      chartId: '9max-100-bb-vs-btn',
      narrative: 'BTN opens to 2.5bb and the small blind folds. You call in the big blind.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Qs9d5c',
        narrative: 'You check. BTN bets 1.8bb into 5.5bb. You call with an open ended straight draw.',
        note: 'Jack ten has eight outs here. It is an easy call against a small bet.',
      },
      {
        street: 'turn',
        board: 'Qs9d5c2h',
        narrative: 'You check. BTN bets 6bb into 9.1bb and you call again.',
        note: 'You still have eight outs. If you hit, you can win a big pot from BTN.',
      },
    ],
    river: {
      board: 'Qs9d5c2h8s',
      pot: 21.1,
      stack: 89.7,
      ranges: [
        'JTs, JTo, KQo, QJo:0.6, QTs, QTo, Q8s, Q7s, Q6s, A9s, T9s, 98s, J9s:0.5, 97s:0.6, 96s, A9o:0.6, K9s:0.5, 76s, 87s, 43s, 64s, 22:0.5, 55:0.3, 88:0.5, KJs:0.5, KJo:0.5, KTs:0.5, KTo:0.5, T8s:0.6',
        'AQ, KQ, QJs, QJo, QTs, AA, KK, JJ:0.3, 99:0.5, 55:0.5, 22:0.5, JTs, JTo:0.5, KJs, KJo:0.5, KTs, T8s, 87s, 76s, 64s, AJs:0.5, A9s, T9s:0.5',
      ],
      hero: 0,
      line: ['check', 'bet75'],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [0.6],
      explain:
        'Suited Solver raises with this hand every time. Sometimes it raises all in. You have the nut straight, and only another jack ten ties you. BTN bets big with overpairs and sets. So does 76, which makes a lower straight. Many of those hands call a raise. Some of its missed draws bet too, so your check let BTN bluff. Calling leaves a lot of value behind.',
    },
  },
  {
    id: 'btn-second-pair-value',
    title: 'Second pair with top kicker',
    summary: 'You check back the turn with second pair and BB checks the river.',
    level: 'advanced',
    hero: { seat: 'BTN', cards: 'Ah9c' },
    villain: { seat: 'BB' },
    preflop: {
      chartId: '9max-100-rfi-btn',
      narrative: 'You open to 2.5bb on the button. The small blind folds and BB calls.',
    },
    streets: [
      {
        street: 'flop',
        board: '9s6h2d',
        narrative: 'BB checks. You bet 1.8bb into 5.5bb and BB calls.',
        note: 'Top pair with the best kicker is a clear value bet on this dry board.',
      },
      {
        street: 'turn',
        board: '9s6h2dKc',
        narrative: 'BB checks. You check back.',
        note: 'The king turns your nines into second pair. Checking keeps the pot small.',
      },
    ],
    river: {
      board: '9s6h2dKc4s',
      pot: 9.1,
      stack: 95.7,
      ranges: [
        'T9s, T9o, 98s, 98o, 97s, 96s, J9s, J9o, A6s, A6o:0.5, K6s, 76s, 76o:0.5, 65s, 86s, 64s, A2s:0.5, 32s, 42s, 52s, 33, 44, 55, 77, 88, TT:0.5, K8s, K7s, K5s, K3s, 87s, 75s, 54s, 53s, 43s, T8s',
        'A9s, A9o, T9s, 98s, 97s, J9s, Q9s, T9o:0.5, 76s, 65s, A6s, 86s, 77, 88, TT:0.5, JJ:0.5, 33, 44, 55, AQo:0.5, AJo:0.5, AQs:0.5, AJs:0.5, 87s, 75s, T8s, 54s, 53s',
      ],
      hero: 1,
      line: ['check'],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver bets this hand every time. It mixes a small and a big size, and both do about as well. BB checked the turn and river, so it rarely has a king. Worse nines like T9 call either size. Smaller pairs and sixes call the small size. Checking back gives up all of that value.',
    },
  },
  {
    id: 'btn-3bet-pot-blocker-call',
    title: 'Top pair facing a shove',
    summary: 'You call a 3bet with KQ and face a river shove after the flush misses.',
    level: 'advanced',
    hero: { seat: 'BTN', cards: 'KsQd' },
    villain: { seat: 'BB' },
    preflop: {
      chartId: '9max-100-btn-vs-3bet',
      narrative: 'You open to 2.5bb on the button and the small blind folds. BB 3bets to 11bb and you call.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Kh7h3c',
        narrative: 'BB bets 7.5bb into 22.5bb. You call with top pair.',
        note: 'A raise would fold out the worse hands. Calling keeps BB bluffs and draws in.',
      },
      {
        street: 'turn',
        board: 'Kh7h3c2s',
        narrative: 'BB bets 25bb into 37.5bb. You call again.',
        note: 'KQ is still ahead of much of the BB betting range. The pot is now big next to the stacks.',
      },
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
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver calls with this hand every time, but it is close. BB shoves AA and AK for value. It also shoves missed draws like A5s and 64s. Your king blocks AK and KK, so BB has fewer value hands. You hold no hearts, so all of its missed flush draws are still possible. Those details tip a close spot toward a call.',
    },
  },
  {
    id: 'sb-3bet-pot-blocker-bluff',
    title: 'Missed nut flush draw in a 3bet pot',
    summary: 'Your nut flush draw misses in a 3bet pot and you act first on the river.',
    level: 'advanced',
    hero: { seat: 'SB', cards: 'AsQs' },
    villain: { seat: 'BTN' },
    preflop: {
      chartId: '9max-100-sb-vs-btn',
      narrative: 'BTN opens to 2.5bb. You 3bet to 11bb from the small blind. BB folds and BTN calls.',
    },
    streets: [
      {
        street: 'flop',
        board: 'Ts7s3d',
        narrative: 'You bet 7.5bb into 23bb with the nut flush draw. BTN calls.',
        note: 'The nut flush draw is a great hand to bet. It can win now or make the best hand later.',
      },
      {
        street: 'turn',
        board: 'Ts7s3d2c',
        narrative: 'You bet 25bb into 38bb. BTN calls.',
        note: 'You still have the nut flush draw and two overcards. Betting again keeps the pressure on BTN pairs.',
      },
    ],
    river: {
      board: 'Ts7s3d2cKh',
      pot: 88,
      stack: 56.5,
      ranges: [
        'AA, KK:0.5, QQ, JJ, ATs, ATo, KTs, TT:0.5, 77:0.4, 98s:0.5, J9s, A5s:0.5, A4s:0.5, AsKs, AsQs, AsJs, As9s, As8s, As6s, As5s, As4s, KsQs, KsJs, QsJs, Js9s, 9s8s, 6s5s',
        'JJ, QQ:0.4, 99, 88:0.8, 77, 33, 22, ATs, KTs, QTs, JTs, T9s, AQs:0.3, 98s, 65s, 54s, KsQs, KsJs, QsJs, 9s8s, 6s5s, 5s4s',
      ],
      hero: 0,
      line: [],
      sizes: [
        [0.33, 0.75],
        [0.33, 0.75],
      ],
      raises: [],
      explain:
        'Suited Solver shoves this hand almost every time. Ace high beats only the missed draws, and those fold anyway. BTN holds mostly one pair after calling twice. A shove folds out pairs like 99 and 88 that beat you. Your queen also blocks some calls, like QQ and KQ. That makes ace queen a strong bluff here.',
    },
  },
];

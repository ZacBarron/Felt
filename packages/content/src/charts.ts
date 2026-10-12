import type { ChartSpec } from '@felt/core';

/**
 * Starter preflop charts, 100bb cash.
 *
 * These are hand-written approximations of commonly published solver
 * outputs, good enough to start drilling structure. They are not solver
 * exact. Replace or extend them with solver output (see docs/SOLVER_DATA.md).
 *
 * Late position seats face the same players behind them at 6 and 9-handed,
 * so LJ through SB share ranges across table sizes; 9-handed adds the
 * tighter UTG, UTG+1 and UTG+2 seats in front.
 */

const RFI = {
  'UTG-9': '66+, 55:0.5, A9s+, A5s:0.5, KTs+, QTs+, JTs, T9s:0.5, AJo+, KQo',
  'UTG+1-9': '55+, A8s+, A5s, KTs+, QTs+, JTs, T9s, 98s:0.5, AJo+, KQo, KJo:0.25',
  'UTG+2-9': '55+, 44:0.5, A7s+, A4s-A5s, K9s+, QTs+, JTs, T9s, 98s:0.5, 87s:0.5, AJo+, ATo:0.5, KQo, KJo:0.5, QJo:0.5',
  LJ: '33+, 22:0.5, A2s+, K9s+, Q9s+, J9s+, T9s, 98s:0.5, 87s:0.5, 76s:0.5, 65s:0.5, AJo+, ATo:0.5, KQo, KJo:0.5',
  HJ: '22+, A2s+, K7s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, 54s:0.5, ATo+, KJo+, QJo, KTo:0.5',
  CO: '22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 86s:0.5, 76s, 75s:0.5, 65s, 54s, A8o+, KTo+, QTo+, JTo',
  BTN: '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, 53s:0.5, A2o+, K8o+, Q9o+, J9o+, T9o, 98o:0.5',
  SB: '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o',
};

const BB_VS_BTN = {
  threeBet:
    'QQ+, JJ:0.5, TT:0.3, AK, AQs, AQo:0.5, AJs:0.5, ATs:0.3, A2s-A5s:0.6, KQs:0.4, KTs-KJs:0.5, K9s:0.5, K5s-K8s:0.4, ' +
    'Q9s:0.5, Q8s:0.4, J9s:0.5, J8s:0.4, T8s:0.4, 97s:0.4, 86s:0.4, 75s:0.4, 64s:0.4, 53s:0.4, ' +
    'KJo:0.4, QJo:0.4, A8o-A9o:0.4, A4o-A5o:0.3, K9o:0.3, Q9o:0.3, J9o:0.3, T9o:0.3',
  call:
    '22-JJ, A2s+, A2o+, K2s+, K5o+, Q2s+, Q8o+, J4s+, J8o+, T5s+, T8o+, 95s+, 97o+, 84s+, 87o, 74s+, 76o, 63s+, 65o, 52s+, 54o:0.5, 42s+',
};

/**
 * Blind defense and in position 3bets against single opens. Approximations of
 * published 100bb solutions with 2.5bb opens: 3bets about 11bb from the blinds
 * and 7.5bb in position. Defense narrows as the opener tightens.
 */
const DEFENSE = {
  bbVsCo: {
    threeBet:
      'QQ+, JJ:0.6, TT:0.3, AK, AQs, AJs:0.7, ATs:0.5, A2s-A5s:0.7, KQs:0.7, KJs:0.6, KTs:0.5, K9s:0.4, QTs:0.4, Q9s:0.5, J9s:0.5, ' +
      'T8s:0.5, 97s:0.5, 86s:0.5, 75s:0.4, 76s:0.4, 65s:0.4, 54s:0.4, AQo:0.8, AJo:0.5, KQo:0.5, KJo:0.3',
    call:
      '22-JJ, A2s+, K2s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, A7o+, A5o:0.5, K9o+, Q9o+, J9o+, T8o+, 98o:0.5',
  },
  bbVsUtg: {
    threeBet: 'QQ+, AK, AQs:0.4, A5s:0.6, A4s:0.5, KQs:0.3, 76s:0.2, 65s:0.2',
    call: '22-JJ, A2s-AQs, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 64s+, 53s+, AQo, AJo, ATo:0.4, KQo, KJo:0.4, QJo:0.3',
  },
  sbVsBtn:
    'TT+, 99:0.7, 88:0.5, 77:0.4, A2s+, K8s+, K6s-K7s:0.3, Q9s+, Q8s:0.4, J9s+, T9s, T8s:0.4, 98s, 87s:0.5, 76s:0.4, 65s:0.3, ' +
    'ATo+, A9o:0.3, KJo+, KTo:0.3, QJo:0.4',
  btnVsCo: {
    threeBet:
      'QQ+, JJ:0.6, TT:0.3, AK, AQs, AJs:0.6, ATs:0.4, A2s-A5s:0.7, KQs:0.6, KJs:0.5, KTs:0.4, K9s:0.5, Q9s:0.5, J9s:0.4, T8s:0.5, ' +
      '97s:0.5, 86s:0.4, 76s:0.4, 65s:0.4, AQo:0.8, AJo:0.5, KQo:0.5',
    call: '22-JJ, A2s+, KTs+, K9s, QTs+, Q9s, J9s+, T8s+, 97s+, 87s, 76s, 65s, AJo, ATo:0.5, KQo, KJo:0.4',
  },
};

/** Opener facing a 3bet: 4bet about 24bb in position, 22bb out of position; call; or fold. */
const VS_THREEBET = {
  btnVsBb: {
    fourBet: 'KK+, QQ:0.6, JJ:0.2, AKs, AKo:0.8, AQs:0.3, A5s:0.5, A4s:0.5, A3s:0.3, A2s:0.2, K9s:0.3, K8s:0.3, Q9s:0.2',
    call: 'QQ, 22-JJ, A2s+, K9s+, K8s:0.4, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, AJo+, ATo:0.5, KQo, KJo:0.5',
  },
  utgVsIp: {
    fourBet: 'KK+, QQ:0.5, AKs, AKo:0.6, A5s:0.3',
    call: 'QQ, JJ, TT, 99:0.6, 88:0.3, AKo, AQs, AJs, ATs:0.5, KQs, KJs:0.5, QJs:0.4, JTs:0.3, AQo:0.3',
  },
};

function rfi(tableSize: number, hero: string, range: string): ChartSpec {
  const sb = hero === 'SB';
  return {
    id: `${tableSize}max-100-rfi-${hero.toLowerCase().replace('+', 'p')}`,
    title: sb ? 'SB open (raise only)' : `${hero} open`,
    game: 'cash',
    tableSize,
    stackBb: 100,
    hero,
    spot: 'rfi',
    basis: 'gto',
    source: 'starter-approx',
    note: sb
      ? 'Assumes a 3bb open with no limpers. Live, most players open bigger; the bigger the open, the tighter the range.'
      : 'Assumes a 2.5bb open with no limpers, as online. Live opens are usually 4 to 5bb plus 1bb per limper, and often get several callers, so tighten the earliest seats a little.',
    actions: [{ id: 'raise', label: sb ? 'Raise 3bb' : 'Raise 2.5bb', range }],
  };
}

function bbVsBtn(tableSize: number): ChartSpec {
  return {
    id: `${tableSize}max-100-bb-vs-btn`,
    title: 'BB vs BTN open',
    game: 'cash',
    tableSize,
    stackBb: 100,
    hero: 'BB',
    versus: 'BTN opens 2.5bb',
    spot: 'vs-open',
    basis: 'gto',
    source: 'starter-approx',
    note: 'Assumes a 2.5bb open. The big blind already has 1bb in, so it defends widest against the button. Against bigger live opens, defend tighter.',
    actions: [
      { id: '3bet', label: '3bet 11bb', range: BB_VS_BTN.threeBet },
      { id: 'call', label: 'Call', range: BB_VS_BTN.call },
    ],
  };
}

function defense(
  tableSize: number,
  id: string,
  title: string,
  hero: string,
  versus: string,
  threeBetLabel: string,
  ranges: { threeBet: string; call?: string },
  note: string,
): ChartSpec {
  return {
    id: `${tableSize}max-100-${id}`,
    title,
    game: 'cash',
    tableSize,
    stackBb: 100,
    hero,
    versus,
    spot: 'vs-open',
    basis: 'gto',
    source: 'starter-approx',
    note,
    actions: [
      { id: '3bet', label: threeBetLabel, range: ranges.threeBet },
      ...(ranges.call ? [{ id: 'call', label: 'Call', range: ranges.call }] : []),
    ],
  };
}

function facingThreeBet(
  tableSize: number,
  id: string,
  title: string,
  hero: string,
  versus: string,
  fourBetLabel: string,
  reach: string,
  ranges: { fourBet: string; call: string },
  note: string,
): ChartSpec {
  return {
    id: `${tableSize}max-100-${id}`,
    title,
    game: 'cash',
    tableSize,
    stackBb: 100,
    hero,
    versus,
    spot: 'vs-3bet',
    basis: 'gto',
    source: 'starter-approx',
    note,
    reach,
    actions: [
      { id: '4bet', label: fourBetLabel, range: ranges.fourBet },
      { id: 'call', label: 'Call', range: ranges.call },
    ],
  };
}

const NOTES = {
  bbVsCo: 'Assumes a 2.5bb open. Against bigger live opens, defend tighter: the price to call is worse.',
  bbVsUtg: 'A tight opener means a tight defense. Against bigger live opens, call less still.',
  sbVsBtn: 'Out of position against a wide range, the small blind mostly 3bets or folds. Calling invites the big blind in behind.',
  btnVsCo: 'In position, the button calls more than the blinds can and 3bets smaller, to about 7.5bb.',
  btnVsBb: 'Only hands the button opens can be here; the rest are greyed out. Position lets the button call a wide range.',
  utgVsIp: 'Only hands UTG opens can be here. Facing a 3bet from a player with position, UTG keeps a narrow, strong range.',
};

export const STARTER_CHARTS: ChartSpec[] = [
  // 9-handed: the live full ring game.
  rfi(9, 'UTG', RFI['UTG-9']),
  rfi(9, 'UTG+1', RFI['UTG+1-9']),
  rfi(9, 'UTG+2', RFI['UTG+2-9']),
  rfi(9, 'LJ', RFI.LJ),
  rfi(9, 'HJ', RFI.HJ),
  rfi(9, 'CO', RFI.CO),
  rfi(9, 'BTN', RFI.BTN),
  rfi(9, 'SB', RFI.SB),
  bbVsBtn(9),
  defense(9, 'bb-vs-co', 'BB vs CO open', 'BB', 'CO opens 2.5bb', '3bet 11bb', DEFENSE.bbVsCo, NOTES.bbVsCo),
  defense(9, 'bb-vs-utg', 'BB vs UTG open', 'BB', 'UTG opens 2.5bb', '3bet 12bb', DEFENSE.bbVsUtg, NOTES.bbVsUtg),
  defense(9, 'sb-vs-btn', 'SB vs BTN open', 'SB', 'BTN opens 2.5bb', '3bet 11bb', { threeBet: DEFENSE.sbVsBtn }, NOTES.sbVsBtn),
  defense(9, 'btn-vs-co', 'BTN vs CO open', 'BTN', 'CO opens 2.5bb', '3bet 7.5bb', DEFENSE.btnVsCo, NOTES.btnVsCo),
  facingThreeBet(9, 'btn-vs-3bet', 'BTN open vs BB 3bet', 'BTN', 'You open 2.5bb, BB 3bets to 11bb', '4bet 24bb', RFI.BTN, VS_THREEBET.btnVsBb, NOTES.btnVsBb),
  facingThreeBet(9, 'utg-vs-3bet', 'UTG open vs 3bet', 'UTG', 'You open 2.5bb, a later seat 3bets to 7.5bb', '4bet 22bb', RFI['UTG-9'], VS_THREEBET.utgVsIp, NOTES.utgVsIp),
  {
    id: '9max-100-iso-btn-vs-1limp',
    title: 'BTN vs one limper',
    game: 'cash',
    tableSize: 9,
    stackBb: 100,
    hero: 'BTN',
    versus: 'One early position limper, folded to you',
    spot: 'vs-limp',
    basis: 'exploit',
    source: 'starter-approx',
    note: 'An exploit for a typical live limper who calls raises too often and plays poorly after the flop. Against a tough limper, isolate tighter.',
    actions: [
      {
        id: 'raise',
        label: 'Iso raise 5bb',
        // Against a weak limper, isolate wider than a standard open with hands that play well heads up in position.
        range: '77+, 22-66:0.5, A2s+, K8s+, Q9s+, J9s+, T9s, 98s:0.5, A9o+, A8o:0.5, KTo+, QTo+, JTo:0.5',
      },
      {
        id: 'call',
        label: 'Overlimp',
        range: '22-66, K2s-K7s, Q5s-Q8s, J7s-J8s, T7s-T8s, 97s+, 86s+, 75s+, 64s+, 54s, 43s:0.5',
      },
    ],
  },

  {
    id: '9max-100-iso-btn-vs-2limp',
    title: 'BTN vs two limpers',
    game: 'cash',
    tableSize: 9,
    stackBb: 100,
    hero: 'BTN',
    versus: 'Two limpers, folded to you',
    spot: 'vs-limp',
    basis: 'exploit',
    source: 'starter-approx',
    note: 'With two limpers, isolate bigger (about 7bb) and tighter: more players can call. Overlimp hands that win big pots multiway.',
    actions: [
      { id: 'raise', label: 'Iso raise 7bb', range: '99+, 77-88:0.5, AJs+, ATs:0.5, KQs, KJs:0.5, AQo+, AJo:0.4' },
      {
        id: 'call',
        label: 'Overlimp',
        range: '22-88, A2s-ATs, KTs-KJs, K9s:0.5, QTs+, Q9s:0.5, J9s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s',
      },
    ],
  },

  // 6-handed: online 6-max and short handed live tables.
  rfi(6, 'UTG', RFI.LJ),
  rfi(6, 'HJ', RFI.HJ),
  rfi(6, 'CO', RFI.CO),
  rfi(6, 'BTN', RFI.BTN),
  rfi(6, 'SB', RFI.SB),
  bbVsBtn(6),
  defense(6, 'bb-vs-co', 'BB vs CO open', 'BB', 'CO opens 2.5bb', '3bet 11bb', DEFENSE.bbVsCo, NOTES.bbVsCo),
  defense(6, 'sb-vs-btn', 'SB vs BTN open', 'SB', 'BTN opens 2.5bb', '3bet 11bb', { threeBet: DEFENSE.sbVsBtn }, NOTES.sbVsBtn),
  defense(6, 'btn-vs-co', 'BTN vs CO open', 'BTN', 'CO opens 2.5bb', '3bet 7.5bb', DEFENSE.btnVsCo, NOTES.btnVsCo),
  facingThreeBet(6, 'btn-vs-3bet', 'BTN open vs BB 3bet', 'BTN', 'You open 2.5bb, BB 3bets to 11bb', '4bet 24bb', RFI.BTN, VS_THREEBET.btnVsBb, NOTES.btnVsBb),
];

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
    actions: [
      { id: '3bet', label: '3bet 11bb', range: BB_VS_BTN.threeBet },
      { id: 'call', label: 'Call', range: BB_VS_BTN.call },
    ],
  };
}

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

  // 6-handed: online 6-max and short handed live tables.
  rfi(6, 'UTG', RFI.LJ),
  rfi(6, 'HJ', RFI.HJ),
  rfi(6, 'CO', RFI.CO),
  rfi(6, 'BTN', RFI.BTN),
  rfi(6, 'SB', RFI.SB),
  bbVsBtn(6),
];

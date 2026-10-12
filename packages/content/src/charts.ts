import type { ChartSpec } from '@felt/core';

/**
 * Starter preflop charts, 100bb cash.
 *
 * These are hand-written approximations of commonly published solver
 * outputs (2.5bb opens, typical online rake). The mixes are graded to match
 * the shape of published solutions: hands at the bottom of a range open part
 * of the time, at frequencies that fall off hand by hand. The exact numbers
 * are still approximations, not solver output. Replace or extend them with
 * solver output (see docs/SOLVER_DATA.md).
 *
 * Late position seats face the same players behind them at 6 and 9-handed,
 * so LJ through SB share ranges across table sizes; 9-handed adds the
 * tighter UTG, UTG+1 and UTG+2 seats in front.
 *
 * Within a family, a weaker kicker never opens more often than a stronger
 * one, and a later seat never opens a hand less often than an earlier seat
 * (both checked in the content tests). Two patterns that solutions share look
 * like exceptions. Small suited aces (A5s down to A2s) can open more often
 * than A6s to A8s, and A5o can open before A6o and A7o: they make wheels and
 * keep the ace blocker. Connected hands can open more often than gapped hands
 * with a higher card (65s before 75s, T9s before J9s), since they make more
 * straights.
 */

const RFI = {
  'UTG-9':
    'AA-77, 66:0.85, 55:0.5, 44:0.2, 33:0.05, ATs+, A9s:0.85, A8s:0.5, A7s:0.25, A6s:0.15, A5s:0.6, A4s:0.35, ' +
    'A3s:0.15, A2s:0.05, KJs+, KTs:0.9, K9s:0.3, K8s:0.05, QJs, QTs:0.85, Q9s:0.1, JTs:0.85, J9s:0.05, T9s:0.5, ' +
    '98s:0.15, 87s:0.05, AQo+, AJo:0.75, ATo:0.1, KQo:0.7',
  'UTG+1-9':
    'AA-66, 55:0.6, 44:0.3, 33:0.1, ATs+, A9s:0.95, A8s:0.65, A7s:0.35, A6s:0.2, A5s:0.85, A4s:0.5, A3s:0.2, ' +
    'A2s:0.1, KJs+, KTs:0.95, K9s:0.45, K8s:0.1, QJs, QTs:0.95, Q9s:0.2, JTs:0.95, J9s:0.15, T9s:0.65, 98s:0.25, ' +
    '87s:0.1, 76s:0.05, AQo+, AJo:0.9, ATo:0.2, KQo:0.85, KJo:0.1',
  'UTG+2-9':
    'AA-66, 55:0.85, 44:0.5, 33:0.3, 22:0.15, A9s+, A8s:0.85, A7s:0.55, A6s:0.4, A5s, A4s:0.75, A3s:0.45, A2s:0.3, ' +
    'KTs+, K9s:0.7, K8s:0.3, K7s:0.1, K6s:0.05, QTs+, Q9s:0.45, Q8s:0.05, JTs, J9s:0.4, T9s:0.85, T8s:0.15, ' +
    '98s:0.5, 87s:0.3, 76s:0.2, 65s:0.15, 54s:0.05, AJo+, ATo:0.45, KQo, KJo:0.35, KTo:0.05, QJo:0.15',
  LJ:
    'AA-44, 33:0.7, 22:0.4, A8s+, A7s:0.9, A6s:0.85, A3s-A5s, A2s:0.8, K9s+, K8s:0.55, K7s:0.3, K6s:0.25, K5s:0.2, ' +
    'K4s:0.05, Q9s+, Q8s:0.2, JTs, J9s:0.85, J8s:0.1, T9s:0.95, T8s:0.45, 98s:0.65, 97s:0.05, 87s:0.45, 76s:0.3, ' +
    '65s:0.25, 54s:0.1, AJo+, ATo:0.55, KQo, KJo:0.4, KTo:0.1, QJo:0.2, QTo:0.05, JTo:0.05',
  HJ:
    'AA-33, 22:0.85, A2s+, K8s+, K7s:0.85, K6s:0.55, K5s:0.45, K4s:0.25, K3s:0.15, K2s:0.1, Q9s+, Q8s:0.7, ' +
    'Q7s:0.15, Q6s:0.05, JTs, J9s, J8s:0.45, T9s, T8s:0.85, T7s:0.1, 98s:0.95, 97s:0.3, 87s:0.75, 86s:0.1, ' +
    '76s:0.6, 65s:0.5, 54s:0.3, ATo+, A9o:0.2, A8o:0.05, A5o:0.05, KQo, KJo:0.9, KTo:0.4, QJo:0.65, QTo:0.15, ' +
    'JTo:0.15',
  CO:
    '22+, A2s+, K5s+, K4s:0.85, K3s:0.7, K2s:0.55, Q9s+, Q8s:0.9, Q7s:0.45, Q6s:0.25, Q5s:0.1, J9s+, J8s:0.85, ' +
    'J7s:0.35, J6s:0.05, T9s, T8s:0.95, T7s:0.5, T6s:0.05, 98s, 97s:0.8, 96s:0.15, 87s, 86s:0.5, 76s:0.95, ' +
    '75s:0.3, 65s:0.85, 64s:0.1, 54s:0.65, 53s:0.05, ATo+, A9o:0.85, A8o:0.55, A7o:0.15, A6o:0.05, A5o:0.3, ' +
    'A4o:0.1, KJo+, KTo:0.85, K9o:0.2, QJo, QTo:0.75, Q9o:0.05, JTo:0.7, J9o:0.05, T9o:0.05',
  BTN:
    '22+, A2s+, K2s+, Q5s+, Q4s:0.85, Q3s:0.55, Q2s:0.4, J7s+, J6s:0.85, J5s:0.5, J4s:0.25, J3s:0.1, J2s:0.05, ' +
    'T7s+, T6s:0.8, T5s:0.25, T4s:0.1, 97s+, 96s:0.8, 95s:0.15, 86s+, 85s:0.7, 84s:0.1, 76s, 75s:0.85, 74s:0.2, ' +
    '65s, 64s:0.65, 63s:0.1, 54s, 53s:0.45, 43s:0.15, A4o+, A3o:0.8, A2o:0.6, K9o+, K8o:0.75, K7o:0.4, K6o:0.2, ' +
    'K5o:0.1, QTo+, Q9o:0.85, Q8o:0.2, JTo, J9o:0.8, J8o:0.1, T9o:0.8, T8o:0.15, 98o:0.3, 87o:0.05',
  // Raise or fold only, to 3bb. The limps of a full solution are left out.
  SB:
    '22+, A2s+, K2s+, Q4s+, Q3s:0.6, Q2s:0.35, J6s+, J5s:0.6, J4s:0.3, J3s:0.1, T6s+, T5s:0.4, T4s:0.1, 96s+, ' +
    '95s:0.25, 85s+, 84s:0.2, 75s+, 74s:0.25, 64s+, 63s:0.1, 54s, 53s:0.35, 43s:0.1, A5o+, A4o:0.9, A3o:0.75, ' +
    'A2o:0.6, K9o+, K8o:0.7, K7o:0.35, K6o:0.1, K5o:0.05, QTo+, Q9o:0.7, Q8o:0.15, JTo, J9o:0.65, J8o:0.1, ' +
    'T9o:0.55, T8o:0.1, 98o:0.15',
};

const BB_VS_BTN = {
  threeBet:
    'QQ+, JJ:0.55, TT:0.3, 99:0.1, AK, AQs, AQo:0.55, AJs:0.5, ATs:0.3, A9s:0.1, A5s:0.7, A4s:0.6, A3s:0.5, A2s:0.45, ' +
    'KQs:0.4, KJs:0.5, KTs:0.5, K9s:0.5, K8s:0.45, K7s:0.4, K6s:0.35, K5s:0.35, K4s:0.15, Q9s:0.5, Q8s:0.4, Q7s:0.15, ' +
    'J9s:0.5, J8s:0.4, T8s:0.4, 97s:0.4, 86s:0.4, 75s:0.35, 64s:0.35, 53s:0.3, ' +
    'KJo:0.4, QJo:0.35, A9o:0.45, A8o:0.35, A7o:0.15, A5o:0.35, A4o:0.25, K9o:0.3, Q9o:0.25, J9o:0.3, T9o:0.3',
  call:
    '22-JJ, A2s+, A2o+, K2s+, K6o+, K5o:0.8, K4o:0.4, K3o:0.2, K2o:0.1, Q3s+, Q2s:0.9, Q9o+, Q8o:0.85, Q7o:0.4, Q6o:0.1, ' +
    'J5s+, J4s:0.8, J3s:0.5, J2s:0.3, J9o+, J8o:0.8, J7o:0.3, T6s+, T5s:0.8, T4s:0.5, T3s:0.25, T2s:0.15, T9o, T8o:0.75, T7o:0.25, ' +
    '96s+, 95s:0.8, 94s:0.4, 93s:0.15, 98o, 97o:0.7, 96o:0.1, 85s+, 84s:0.75, 83s:0.25, 87o:0.8, 86o:0.15, ' +
    '75s+, 74s:0.85, 73s:0.2, 76o:0.7, 75o:0.05, 64s+, 63s:0.85, 65o:0.6, 53s+, 52s:0.7, 54o:0.35, 42s+, 32s:0.5',
};

/**
 * Blind defense and in position 3bets against single opens. Approximations of
 * published 100bb solutions with 2.5bb opens: 3bets about 11bb from the blinds
 * and 7.5bb in position. Defense narrows as the opener tightens.
 */
const DEFENSE = {
  bbVsCo: {
    threeBet:
      'QQ+, JJ:0.6, TT:0.3, 99:0.1, AK, AQs, AJs:0.7, ATs:0.5, A9s:0.15, A5s:0.75, A4s:0.7, A3s:0.6, A2s:0.5, ' +
      'KQs:0.7, KJs:0.6, KTs:0.5, K9s:0.4, K8s:0.2, QTs:0.4, Q9s:0.5, J9s:0.5, T8s:0.5, 97s:0.5, 86s:0.5, ' +
      '75s:0.4, 76s:0.4, 65s:0.4, 54s:0.4, AQo:0.8, AJo:0.5, ATo:0.15, KQo:0.5, KJo:0.3, QJo:0.1',
    call:
      '22-JJ, A2s+, K2s+, Q5s+, Q4s:0.6, Q3s:0.35, Q2s:0.2, J6s+, J5s:0.4, J4s:0.15, T6s+, T5s:0.3, 96s+, 95s:0.25, ' +
      '85s+, 84s:0.15, 74s:0.8, 75s+, 64s:0.85, 65s, 53s:0.75, 54s, 43s:0.6, ' +
      'A8o+, A7o:0.8, A6o:0.3, A5o:0.55, A4o:0.3, A3o:0.1, K9o+, K8o:0.4, K7o:0.1, Q9o+, Q8o:0.25, J9o:0.9, J8o:0.2, ' +
      'T9o:0.9, T8o:0.6, 98o:0.4, 97o:0.1, 87o:0.2',
  },
  bbVsUtg: {
    threeBet: 'KK+, QQ:0.8, AKs, AKo:0.85, AQs:0.4, A5s:0.55, A4s:0.45, A3s:0.15, KQs:0.3, 76s:0.15, 65s:0.15, 54s:0.1',
    call:
      '22-QQ, A2s+, AKo, K9s+, K8s:0.5, K7s:0.3, K6s:0.2, K5s:0.15, Q9s+, Q8s:0.35, J9s+, J8s:0.3, T8s+, T7s:0.15, ' +
      '97s+, 96s:0.1, 86s+, 85s:0.1, 75s+, 64s:0.75, 65s, 53s:0.5, 54s, 43s:0.1, ' +
      'AQo, AJo, ATo:0.35, A9o:0.05, KQo, KJo:0.3, KTo:0.1, QJo:0.25, QTo:0.05, JTo:0.1',
  },
  sbVsBtn:
    'TT+, 99:0.7, 88:0.5, 77:0.4, 66:0.2, 55:0.1, 44:0.05, A2s+, K8s+, K7s:0.35, K6s:0.3, K5s:0.2, K4s:0.05, ' +
    'Q9s+, Q8s:0.4, Q7s:0.1, J9s+, J8s:0.25, T9s, T8s:0.4, 98s:0.9, 97s:0.2, 87s:0.45, 86s:0.05, 76s:0.35, 65s:0.3, 54s:0.15, ' +
    'AJo+, ATo:0.8, A9o:0.25, A8o:0.1, A5o:0.1, KQo, KJo:0.65, KTo:0.25, K9o:0.05, QJo:0.25, QTo:0.1, JTo:0.1',
  btnVsCo: {
    threeBet:
      'QQ+, JJ:0.6, TT:0.3, AK, AQs, AJs:0.6, ATs:0.4, A5s:0.75, A4s:0.7, A3s:0.6, A2s:0.5, KQs:0.6, KJs:0.5, KTs:0.4, ' +
      'K9s:0.5, K8s:0.2, Q9s:0.5, J9s:0.4, T8s:0.5, 97s:0.5, 86s:0.4, 76s:0.4, 65s:0.4, 54s:0.2, ' +
      'AQo:0.8, AJo:0.5, ATo:0.1, KQo:0.5, KJo:0.1',
    call:
      '55-JJ, 44:0.9, 33:0.7, 22:0.5, A2s+, KTs+, K9s, K8s:0.25, QTs+, Q9s, Q8s:0.15, J9s+, J8s:0.2, T8s+, 97s+, 87s, 86s:0.5, ' +
      '76s, 75s:0.15, 65s, 54s:0.4, AJo, ATo:0.4, KQo, KJo:0.35, KTo:0.05, QJo:0.15, JTo:0.1',
  },
};

/** Opener facing a 3bet: 4bet about 24bb in position, 22bb out of position; call; or fold. */
const VS_THREEBET = {
  btnVsBb: {
    fourBet: 'KK+, QQ:0.6, JJ:0.2, AKs, AKo:0.8, AQs:0.3, A5s:0.55, A4s:0.45, A3s:0.3, A2s:0.2, K9s:0.3, K8s:0.25, Q9s:0.2',
    call:
      '55-QQ, 44:0.85, 33:0.7, 22:0.6, A2s+, K9s+, K8s:0.4, K7s:0.1, Q9s+, Q8s:0.2, J9s+, J8s:0.15, T8s+, 97s+, 86s+, 75s+, 65s, 54s, ' +
      'AJo+, ATo:0.5, A9o:0.05, KQo, KJo:0.45, KTo:0.1, QJo:0.35, JTo:0.2',
  },
  utgVsIp: {
    fourBet: 'KK+, QQ:0.5, AKs, AKo:0.6, A5s:0.3, A4s:0.15',
    call: 'QQ, JJ, TT, 99:0.65, 88:0.35, 77:0.15, AKo, AQs, AJs, ATs:0.5, A5s:0.25, KQs, KJs:0.5, QJs:0.4, JTs:0.3, T9s:0.1, AQo:0.35, KQo:0.1',
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

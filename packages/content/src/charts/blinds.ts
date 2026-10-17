import { buildChart, type ChartSpec, continueText } from '@felt/core';
import { starter } from './common';

/**
 * Blind vs blind with a limp, 100bb. Hand written to match the shape of
 * published solver results, which play a mixed small blind strategy: raise
 * strong hands and some bluffs to 3bb, limp a wide middle, and fold the worst
 * offsuit hands. The big blind raises a polar range against the limp (about
 * 3.5bb) and checks the rest, since it never has to fold.
 *
 * The raise only small blind open (9max-100-rfi-sb), BB vs SB open, SB vs BB
 * 3bet and BB vs SB 4bet charts cover the raised pots.
 */

const SB_OPEN = {
  raise:
    '88+, 77:0.65, 66:0.5, 55:0.3, A9s+, A8s:0.7, A7s:0.5, A6s:0.4, A5s:0.8, A4s:0.7, A3s:0.55, A2s:0.45, KTs+, K9s:0.65, K8s:0.4, ' +
    'K7s:0.3, K6s:0.25, K5s:0.25, K4s:0.15, K3s:0.15, K2s:0.15, QTs+, Q9s:0.5, Q8s:0.25, Q7s:0.15, Q6s:0.15, JTs:0.7, J9s:0.4, ' +
    'J8s:0.15, T9s:0.45, T8s:0.2, 98s:0.3, 97s:0.2, 87s:0.25, 86s:0.15, 76s:0.25, 75s:0.15, 65s:0.2, 64s:0.15, 54s:0.2, ' +
    'J4s:0.15, T5s:0.15, 95s:0.15, 85s:0.15, 74s:0.15, 63s:0.15, 53s:0.15, ' +
    'ATo+, A9o:0.65, A8o:0.45, A7o:0.35, A6o:0.2, A5o:0.4, A4o:0.25, A3o:0.15, A2o:0.15, KJo+, KTo:0.65, K9o:0.4, K8o:0.2, ' +
    'QJo:0.55, QTo:0.35, Q9o:0.2, JTo:0.3, J9o:0.15, T9o:0.15, Q5o:0.1, J6o:0.1, T6o:0.1, 96o:0.1',
  call:
    '22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q3o+, Q2o:0.6, J5o+, J4o:0.6, J3o:0.2, ' +
    'T6o+, T5o:0.6, T4o:0.1, 96o+, 95o:0.6, 86o+, 85o:0.5, 75o+, 74o:0.2, 64o:0.6, 65o, 54o:0.6, 53o:0.2',
};

const BB_VS_LIMP = {
  raise:
    '99+, 88:0.7, 77:0.5, 66:0.3, A8s+, A7s:0.6, A6s:0.5, A5s:0.8, A4s:0.7, A3s:0.6, A2s:0.5, KTs+, K9s:0.6, K8s:0.4, QTs+, Q9s:0.4, ' +
    'JTs:0.7, J9s:0.3, T9s:0.4, A9o+, A8o:0.7, A7o:0.55, A6o:0.4, A5o:0.6, A4o:0.5, A3o:0.4, A2o:0.3, KTo+, K9o:0.6, K8o:0.4, ' +
    'K7o:0.3, K6o:0.25, K5o:0.2, QTo+, Q9o:0.45, Q8o:0.25, JTo:0.6, J9o:0.35, J8o:0.2, T9o:0.4, T8o:0.2, 98o:0.2',
  // The big blind never folds to a limp: everything else checks.
  call: '22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J2o+, T2o+, 92o+, 82o+, 72o+, 62o+, 52o+, 42o+, 32o',
};

const SB_VS_ISO = {
  raise:
    '77:0.4, 66:0.3, A8s:0.4, A7s:0.4, A6s:0.4, A5s:0.2, A4s:0.3, A3s:0.3, A2s:0.3, K9s:0.3, K8s:0.3, K4s:0.2, Q9s:0.25, Q6s:0.15, ' +
    'J7s:0.15, T7s:0.15, A9o:0.3, A8o:0.3, A7o:0.25, KTo:0.25',
  call:
    '22-77, A2s-A8s, K2s-K9s, Q4s-Q9s, Q3s:0.6, J6s+, J5s:0.5, T6s+, T5s:0.4, 96s+, 95s:0.3, 85s+, 84s:0.2, 74s+, 63s+, 53s+, 43s, ' +
    'A2o-A9o, K7o-KTo, K6o:0.6, K5o:0.4, Q8o+, Q7o:0.4, J8o+, J7o:0.3, T8o+, 98o, 97o:0.4, 87o, 86o:0.3, 76o:0.6, 65o:0.4',
};

/** The small blind's open when it may limp. */
export function sbOpen(tableSize: number): ChartSpec {
  return {
    id: `${tableSize}max-100-bvb-sb-open`,
    title: 'SB open (limp or raise)',
    ...starter(tableSize),
    hero: 'SB',
    versus: 'Folded to you in the small blind',
    spot: 'bvb',
    note: 'A mixed strategy close to published solutions. Raise to 3bb with strong hands and some bluffs. Limp the wide middle.',
    actions: [
      { id: 'raise', label: 'Raise 3bb', range: SB_OPEN.raise },
      { id: 'call', label: 'Limp', range: SB_OPEN.call },
    ],
  };
}

export function bbVsLimp(tableSize: number): ChartSpec {
  return {
    id: `${tableSize}max-100-bvb-bb-vs-limp`,
    title: 'BB vs SB limp',
    ...starter(tableSize),
    hero: 'BB',
    versus: 'SB limps',
    villains: ['SB'],
    limpers: 1,
    spot: 'bvb',
    note: 'The big blind never folds to a limp. Raise to 3.5bb with value and bluffs that block strong hands. Check the rest.',
    actions: [
      { id: 'raise', label: 'Raise 3.5bb', range: BB_VS_LIMP.raise },
      { id: 'call', label: 'Check', range: BB_VS_LIMP.call },
    ],
  };
}

export function sbVsIso(tableSize: number): ChartSpec {
  const limps = continueText(buildChart(sbOpen(tableSize)).mixes, ['call']);
  return {
    id: `${tableSize}max-100-bvb-sb-vs-raise`,
    title: 'SB limp vs BB raise',
    ...starter(tableSize),
    hero: 'SB',
    versus: 'You limp. BB raises to 3.5bb.',
    villains: ['BB'],
    spot: 'bvb',
    note: 'Only hands that limp can be here. The limp range is wide and capped, so call a lot and raise a few hands to 11bb.',
    reach: limps,
    actions: [
      { id: 'raise', label: 'Raise 11bb', range: SB_VS_ISO.raise },
      { id: 'call', label: 'Call', range: SB_VS_ISO.call },
    ],
  };
}

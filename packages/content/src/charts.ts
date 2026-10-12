import type { ChartSpec } from '@felt/core';

/**
 * Starter preflop charts for 6-max cash, 100bb, 2.5bb opens (SB 3bb).
 *
 * These are hand-written approximations of commonly published solver
 * outputs, good enough to start drilling. They are not solver exact.
 * Replace or extend them with solver exports (see docs/SOLVER_DATA.md).
 */
export const STARTER_CHARTS: ChartSpec[] = [
  {
    id: '6max-100-rfi-utg',
    title: 'UTG open',
    format: '6-max cash, 100bb',
    hero: 'UTG',
    source: 'starter-approx',
    actions: [
      {
        id: 'raise',
        label: 'Raise 2.5bb',
        range: '33+, 22:0.5, A2s+, K9s+, Q9s+, J9s+, T9s, 98s:0.5, 87s:0.5, 76s:0.5, 65s:0.5, AJo+, ATo:0.5, KQo, KJo:0.5',
      },
    ],
  },
  {
    id: '6max-100-rfi-hj',
    title: 'HJ open',
    format: '6-max cash, 100bb',
    hero: 'HJ',
    source: 'starter-approx',
    actions: [
      {
        id: 'raise',
        label: 'Raise 2.5bb',
        range: '22+, A2s+, K7s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, 54s:0.5, ATo+, KJo+, QJo, KTo:0.5',
      },
    ],
  },
  {
    id: '6max-100-rfi-co',
    title: 'CO open',
    format: '6-max cash, 100bb',
    hero: 'CO',
    source: 'starter-approx',
    actions: [
      {
        id: 'raise',
        label: 'Raise 2.5bb',
        range: '22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 86s:0.5, 76s, 75s:0.5, 65s, 54s, A8o+, KTo+, QTo+, JTo',
      },
    ],
  },
  {
    id: '6max-100-rfi-btn',
    title: 'BTN open',
    format: '6-max cash, 100bb',
    hero: 'BTN',
    source: 'starter-approx',
    actions: [
      {
        id: 'raise',
        label: 'Raise 2.5bb',
        range:
          '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, 53s:0.5, A2o+, K8o+, Q9o+, J9o+, T9o, 98o:0.5',
      },
    ],
  },
  {
    id: '6max-100-rfi-sb',
    title: 'SB open (raise only)',
    format: '6-max cash, 100bb',
    hero: 'SB',
    source: 'starter-approx',
    actions: [
      {
        id: 'raise',
        label: 'Raise 3bb',
        range: '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, K8o+, Q9o+, J9o+, T9o',
      },
    ],
  },
  {
    id: '6max-100-bb-vs-btn',
    title: 'BB vs BTN open',
    format: '6-max cash, 100bb',
    hero: 'BB',
    versus: 'BTN opens 2.5bb',
    source: 'starter-approx',
    actions: [
      {
        id: '3bet',
        label: '3bet 11bb',
        range:
          'QQ+, JJ:0.5, TT:0.3, AK, AQs, AQo:0.5, AJs:0.5, ATs:0.3, A2s-A5s:0.6, KQs:0.4, KTs-KJs:0.5, K9s:0.5, K5s-K8s:0.4, ' +
          'Q9s:0.5, Q8s:0.4, J9s:0.5, J8s:0.4, T8s:0.4, 97s:0.4, 86s:0.4, 75s:0.4, 64s:0.4, 53s:0.4, ' +
          'KJo:0.4, QJo:0.4, A8o-A9o:0.4, A4o-A5o:0.3, K9o:0.3, Q9o:0.3, J9o:0.3, T9o:0.3',
      },
      {
        id: 'call',
        label: 'Call',
        range:
          '22-JJ, A2s+, A2o+, K2s+, K5o+, Q2s+, Q8o+, J4s+, J8o+, T5s+, T8o+, 95s+, 97o+, 84s+, 87o, 74s+, 76o, 63s+, 65o, 52s+, 54o:0.5, 42s+',
      },
    ],
  },
];

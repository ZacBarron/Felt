import type { ChartSpec, Position } from '@felt/core';
import { slug, starter } from './common';

/**
 * Opening ranges (raise first in), 100bb cash.
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

export const RFI = {
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

/** The 9-handed opening range for a seat. 6-max seats share the late seats' ranges. */
export function rfiRange(seat9: Position): string {
  const key = seat9 === 'UTG' ? 'UTG-9' : seat9 === 'UTG+1' ? 'UTG+1-9' : seat9 === 'UTG+2' ? 'UTG+2-9' : seat9;
  return RFI[key as keyof typeof RFI];
}

export function rfi(tableSize: number, hero: string, range: string): ChartSpec {
  const sb = hero === 'SB';
  return {
    id: `${tableSize}max-100-rfi-${slug(hero)}`,
    title: sb ? 'SB open (raise only)' : `${hero} open`,
    ...starter(tableSize),
    hero,
    spot: 'rfi',
    note: sb
      ? 'Assumes a 3bb open with no limpers. Live, most players open bigger; the bigger the open, the tighter the range.'
      : 'Assumes a 2.5bb open with no limpers, as online. Live opens are usually 4 to 5bb plus 1bb per limper, and often get several callers, so tighten the earliest seats a little.',
    actions: [{ id: 'raise', label: sb ? 'Raise 3bb' : 'Raise 2.5bb', range }],
  };
}

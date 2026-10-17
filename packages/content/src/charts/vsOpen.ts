import type { ChartSpec, Position } from '@felt/core';
import { actions, isBlind, NINE, seatAt, slug, starter, type Strategy } from './common';

/**
 * Facing one open with no callers: 3bet, call or fold, for every seat behind
 * every opener. 100bb, 2.5bb opens (3bb from the small blind), typical
 * online rake. Hand written to match the shape of published solver results:
 * defense widens as the opener's range widens, the big blind defends widest
 * (it closes the action at a good price), the small blind mostly 3bets or
 * folds, and seats in position flat more the fewer players are left behind.
 *
 * Seats in position share one strategy per opener within three groups, since
 * their solutions differ by little: early seats (UTG+1 to LJ) with many
 * players behind, middle seats (HJ and CO), and the button.
 *
 * Priority order applies: the 3bet range takes its share of a hand first and
 * the call range takes what is left, so "3bet A5s:0.6" then "call A2s+"
 * gives A5s 60% 3bet and 40% call.
 */

/** Big blind against each opener. */
export const BB_DEFENSE: Record<Position, Strategy> = {
  UTG: {
    raise: 'KK+, QQ:0.8, AKs, AKo:0.85, AQs:0.4, A5s:0.55, A4s:0.45, A3s:0.15, KQs:0.3, 76s:0.15, 65s:0.15, 54s:0.1',
    call:
      '22-QQ, A2s+, AKo, K9s+, K8s:0.5, K7s:0.3, K6s:0.2, K5s:0.15, Q9s+, Q8s:0.35, J9s+, J8s:0.3, T8s+, T7s:0.15, ' +
      '97s+, 96s:0.1, 86s+, 85s:0.1, 75s+, 64s:0.75, 65s, 53s:0.5, 54s, 43s:0.1, ' +
      'AQo, AJo, ATo:0.35, A9o:0.05, KQo, KJo:0.3, KTo:0.1, QJo:0.25, QTo:0.05, JTo:0.1',
  },
  'UTG+1': {
    raise: 'KK+, QQ:0.85, JJ:0.1, AKs, AKo:0.9, AQs:0.45, AJs:0.1, A5s:0.6, A4s:0.5, A3s:0.2, KQs:0.35, KJs:0.05, 76s:0.2, 65s:0.2, 54s:0.15, AQo:0.05',
    call:
      '22-QQ, A2s+, AKo, AQo, K8s+, K7s:0.45, K6s:0.3, K5s:0.25, K4s:0.1, Q9s+, Q8s:0.5, Q7s:0.05, J9s+, J8s:0.45, T8s+, T7s:0.25, ' +
      '97s+, 96s:0.2, 86s+, 85s:0.15, 75s+, 64s:0.8, 65s, 53s:0.5, 54s, 43s:0.15, ' +
      'AJo, ATo:0.5, A9o:0.15, KQo, KJo:0.45, KTo:0.15, QJo:0.35, QTo:0.1, JTo:0.2',
  },
  'UTG+2': {
    raise:
      'KK+, QQ:0.9, JJ:0.2, AKs, AKo, AQs:0.5, AJs:0.2, A5s:0.65, A4s:0.55, A3s:0.3, A2s:0.1, KQs:0.4, KJs:0.15, QJs:0.05, ' +
      '87s:0.1, 76s:0.25, 65s:0.25, 54s:0.2, AQo:0.15, KQo:0.05',
    call:
      '22-QQ, A2s+, AQo, K6s+, K5s:0.45, K4s:0.3, K3s:0.15, K2s:0.1, Q8s+, Q7s:0.25, Q6s:0.1, J8s+, J7s:0.15, T7s+, T6s:0.05, ' +
      '97s+, 96s:0.6, 86s+, 85s:0.4, 75s+, 74s:0.2, 64s:0.8, 65s, 53s:0.55, 54s, 43s:0.3, ' +
      'AJo, ATo:0.75, A9o:0.35, A8o:0.1, A5o:0.05, KQo, KJo:0.6, KTo:0.3, QJo:0.45, QTo:0.2, JTo:0.3, T9o:0.1',
  },
  LJ: {
    raise:
      'KK+, QQ:0.9, JJ:0.3, TT:0.1, AKs, AKo, AQs:0.6, AJs:0.3, ATs:0.15, A5s:0.65, A4s:0.6, A3s:0.4, A2s:0.2, KQs:0.5, KJs:0.25, ' +
      'KTs:0.15, K9s:0.1, QJs:0.15, QTs:0.1, J9s:0.1, T8s:0.1, 87s:0.15, 76s:0.3, 65s:0.3, 54s:0.25, AQo:0.3, AJo:0.1, KQo:0.15',
    call:
      '22-QQ, A2s+, AQo, K5s+, K4s:0.6, K3s:0.4, K2s:0.25, Q8s+, Q7s:0.45, Q6s:0.3, Q5s:0.15, J8s+, J7s:0.4, J6s:0.1, T7s+, T6s:0.2, ' +
      '96s+, 95s:0.05, 86s+, 85s:0.7, 75s+, 74s:0.4, 64s:0.8, 65s, 53s:0.6, 54s, 43s:0.4, ' +
      'ATo+, A9o:0.7, A8o:0.4, A7o:0.15, A5o:0.2, KJo+, KTo:0.8, K9o:0.25, QJo, QTo:0.6, Q9o:0.15, JTo:0.7, J9o:0.15, T9o:0.3, 98o:0.05',
  },
  HJ: {
    raise:
      'KK+, QQ:0.9, JJ:0.4, TT:0.15, 99:0.05, AKs, AKo, AQs:0.7, AJs:0.45, ATs:0.25, A9s:0.05, A5s:0.7, A4s:0.65, A3s:0.5, A2s:0.35, ' +
      'KQs:0.6, KJs:0.4, KTs:0.3, K9s:0.2, K8s:0.1, QJs:0.25, QTs:0.25, Q9s:0.2, J9s:0.25, T8s:0.25, 97s:0.15, 86s:0.15, 87s:0.2, ' +
      '76s:0.3, 75s:0.1, 65s:0.3, 54s:0.3, AQo:0.5, AJo:0.25, ATo:0.05, KQo:0.3, KJo:0.1',
    call:
      '22-QQ, A2s+, K2s+, Q6s+, Q5s:0.5, Q4s:0.3, Q3s:0.1, J7s+, J6s:0.5, J5s:0.15, T7s+, T6s:0.5, T5s:0.1, 96s+, 95s:0.15, ' +
      '85s+, 84s:0.05, 75s+, 74s:0.6, 64s:0.85, 65s, 53s:0.7, 54s, 43s:0.5, ' +
      'A9o+, A8o:0.7, A7o:0.4, A6o:0.1, A5o:0.4, A4o:0.15, KTo+, K9o:0.6, K8o:0.1, QTo+, Q9o:0.5, JTo, J9o:0.5, T9o:0.6, T8o:0.2, 98o:0.15',
  },
  CO: {
    raise:
      'QQ+, JJ:0.6, TT:0.3, 99:0.1, AK, AQs, AJs:0.7, ATs:0.5, A9s:0.15, A5s:0.75, A4s:0.7, A3s:0.6, A2s:0.5, ' +
      'KQs:0.7, KJs:0.6, KTs:0.5, K9s:0.4, K8s:0.2, QTs:0.4, Q9s:0.5, J9s:0.5, T8s:0.5, 97s:0.5, 86s:0.5, ' +
      '75s:0.4, 76s:0.4, 65s:0.4, 54s:0.4, AQo:0.8, AJo:0.5, ATo:0.15, KQo:0.5, KJo:0.3, QJo:0.1',
    call:
      '22-JJ, A2s+, K2s+, Q5s+, Q4s:0.6, Q3s:0.35, Q2s:0.2, J6s+, J5s:0.4, J4s:0.15, T6s+, T5s:0.3, 96s+, 95s:0.25, ' +
      '85s+, 84s:0.15, 74s:0.8, 75s+, 64s:0.85, 65s, 53s:0.75, 54s, 43s:0.6, ' +
      'A8o+, A7o:0.8, A6o:0.3, A5o:0.55, A4o:0.3, A3o:0.1, K9o+, K8o:0.4, K7o:0.1, Q9o+, Q8o:0.25, J9o:0.9, J8o:0.2, ' +
      'T9o:0.9, T8o:0.6, 98o:0.4, 97o:0.1, 87o:0.2',
  },
  BTN: {
    raise:
      'QQ+, JJ:0.55, TT:0.3, 99:0.1, AK, AQs, AQo:0.55, AJs:0.5, ATs:0.3, A9s:0.1, A5s:0.7, A4s:0.6, A3s:0.5, A2s:0.45, ' +
      'KQs:0.4, KJs:0.5, KTs:0.5, K9s:0.5, K8s:0.45, K7s:0.4, K6s:0.35, K5s:0.35, K4s:0.15, Q9s:0.5, Q8s:0.4, Q7s:0.15, ' +
      'J9s:0.5, J8s:0.4, T8s:0.4, 97s:0.4, 86s:0.4, 75s:0.35, 64s:0.35, 53s:0.3, ' +
      'KJo:0.4, QJo:0.35, A9o:0.45, A8o:0.35, A7o:0.15, A5o:0.35, A4o:0.25, K9o:0.3, Q9o:0.25, J9o:0.3, T9o:0.3',
    call:
      '22-JJ, A2s+, A2o+, K2s+, K6o+, K5o:0.8, K4o:0.4, K3o:0.2, K2o:0.1, Q3s+, Q2s:0.9, Q9o+, Q8o:0.85, Q7o:0.4, Q6o:0.1, ' +
      'J5s+, J4s:0.8, J3s:0.5, J2s:0.3, J9o+, J8o:0.8, J7o:0.3, T6s+, T5s:0.8, T4s:0.5, T3s:0.25, T2s:0.15, T9o, T8o:0.75, T7o:0.25, ' +
      '96s+, 95s:0.8, 94s:0.4, 93s:0.15, 98o, 97o:0.7, 96o:0.1, 85s+, 84s:0.75, 83s:0.25, 87o:0.8, 86o:0.15, ' +
      '75s+, 74s:0.85, 73s:0.2, 76o:0.7, 75o:0.05, 64s+, 63s:0.85, 65o:0.6, 53s+, 52s:0.7, 54o:0.35, 42s+, 32s:0.5',
  },
  // The small blind opens 3bb from a wide range. The big blind has position, so it 3bets often (about 9bb) and calls wide.
  SB: {
    raise:
      'TT+, 99:0.6, 88:0.4, 77:0.25, AJs+, ATs:0.8, A9s:0.55, A8s:0.45, A7s:0.4, A6s:0.4, A5s:0.75, A4s:0.7, A3s:0.6, A2s:0.5, ' +
      'KTs+, K9s:0.6, K8s:0.45, K7s:0.4, K6s:0.4, K5s:0.4, K4s:0.3, K3s:0.2, K2s:0.15, QTs+, Q9s:0.5, Q8s:0.4, Q7s:0.25, Q6s:0.2, ' +
      'JTs:0.7, J9s:0.5, J8s:0.35, J7s:0.2, T9s:0.5, T8s:0.4, T7s:0.25, 98s:0.4, 97s:0.3, 87s:0.35, 86s:0.25, 76s:0.3, 75s:0.2, ' +
      '65s:0.25, 54s:0.2, AJo+, ATo:0.7, A9o:0.45, A8o:0.35, A7o:0.25, A5o:0.3, KJo+, KTo:0.5, K9o:0.35, K8o:0.15, ' +
      'QJo:0.45, QTo:0.35, Q9o:0.15, JTo:0.35, J9o:0.15, T9o:0.2',
    call:
      '22-99, A2s+, K2s+, Q2s+, J4s+, J3s:0.6, J2s:0.4, T5s+, T4s:0.6, T3s:0.3, T2s:0.2, 95s+, 94s:0.5, 93s:0.2, 84s+, 83s:0.4, 82s:0.15, ' +
      '74s+, 73s:0.5, 63s+, 62s:0.2, 52s+, 42s+, 32s:0.6, A2o+, K7o+, K6o:0.8, K5o:0.5, K4o:0.3, K3o:0.15, Q8o+, Q7o:0.6, Q6o:0.3, ' +
      'Q5o:0.1, J8o+, J7o:0.5, T8o+, T7o:0.5, 97o+, 96o:0.25, 87o, 86o:0.4, 76o:0.6, 75o:0.15, 65o:0.45, 54o:0.25',
  },
};

/** Small blind against each opener: 3bet or fold, with the big blind still to act. */
export const SB_DEFENSE: Record<Position, Strategy> = {
  UTG: { raise: 'QQ+, JJ:0.6, TT:0.25, 99:0.05, AKs, AKo, AQs:0.85, AJs:0.35, ATs:0.1, A5s:0.5, A4s:0.35, A3s:0.1, KQs:0.55, KJs:0.15, QJs:0.05, AQo:0.35' },
  'UTG+1': {
    raise:
      'QQ+, JJ:0.7, TT:0.35, 99:0.1, AKs, AKo, AQs:0.9, AJs:0.45, ATs:0.2, A5s:0.6, A4s:0.45, A3s:0.2, A2s:0.05, KQs:0.65, KJs:0.25, ' +
      'KTs:0.05, QJs:0.1, JTs:0.05, AQo:0.45, AJo:0.05',
  },
  'UTG+2': {
    raise:
      'QQ+, JJ:0.8, TT:0.45, 99:0.2, 88:0.05, AKs, AKo, AQs, AJs:0.55, ATs:0.3, A9s:0.05, A5s:0.65, A4s:0.55, A3s:0.3, A2s:0.15, ' +
      'KQs:0.75, KJs:0.35, KTs:0.15, QJs:0.2, QTs:0.05, JTs:0.1, T9s:0.05, AQo:0.6, AJo:0.15, KQo:0.1',
  },
  LJ: {
    raise:
      'JJ+, TT:0.6, 99:0.3, 88:0.15, 77:0.05, AKs, AQs, AJs:0.7, ATs:0.45, A9s:0.15, A8s:0.05, A5s:0.7, A4s:0.65, A3s:0.4, A2s:0.25, ' +
      'KQs:0.85, KJs:0.5, KTs:0.3, K9s:0.1, QJs:0.35, QTs:0.15, JTs:0.2, T9s:0.15, 98s:0.05, 76s:0.05, ' +
      'AKo, AQo:0.8, AJo:0.3, ATo:0.05, KQo:0.25, KJo:0.05',
  },
  HJ: {
    raise:
      'JJ+, TT:0.75, 99:0.45, 88:0.3, 77:0.15, 66:0.05, AKs, AQs, AJs:0.85, ATs:0.6, A9s:0.3, A8s:0.15, A7s:0.1, A6s:0.05, ' +
      'A5s:0.8, A4s:0.75, A3s:0.55, A2s:0.4, KQs, KJs:0.65, KTs:0.45, K9s:0.25, K8s:0.05, QJs:0.5, QTs:0.3, Q9s:0.1, JTs:0.35, ' +
      'J9s:0.1, T9s:0.3, 98s:0.15, 87s:0.1, 76s:0.1, 65s:0.05, AKo, AQo, AJo:0.5, ATo:0.15, KQo:0.45, KJo:0.15, QJo:0.05',
  },
  CO: {
    raise:
      'TT+, 99:0.65, 88:0.45, 77:0.3, 66:0.15, 55:0.05, AJs+, ATs:0.9, A9s:0.55, A8s:0.35, A7s:0.25, A6s:0.2, A5s:0.9, A4s:0.85, ' +
      'A3s:0.65, A2s:0.5, KTs+, K9s:0.6, K8s:0.3, K7s:0.1, QJs, QTs:0.65, Q9s:0.35, Q8s:0.1, JTs:0.7, J9s:0.3, J8s:0.05, ' +
      'T9s:0.6, T8s:0.15, 98s:0.45, 97s:0.05, 87s:0.25, 76s:0.2, 65s:0.15, 54s:0.05, ' +
      'AQo+, AJo:0.75, ATo:0.4, A9o:0.05, KQo:0.75, KJo:0.35, KTo:0.1, QJo:0.1',
  },
  BTN: {
    raise:
      'TT+, 99:0.7, 88:0.5, 77:0.4, 66:0.2, 55:0.1, 44:0.05, A2s+, K8s+, K7s:0.35, K6s:0.3, K5s:0.2, K4s:0.05, ' +
      'Q9s+, Q8s:0.4, Q7s:0.1, J9s+, J8s:0.25, T9s, T8s:0.4, 98s:0.9, 97s:0.2, 87s:0.45, 86s:0.05, 76s:0.35, 65s:0.3, 54s:0.15, ' +
      'AJo+, ATo:0.8, A9o:0.25, A8o:0.1, A5o:0.1, KQo, KJo:0.65, KTo:0.25, K9o:0.05, QJo:0.25, QTo:0.1, JTo:0.1',
  },
};

/** Early seats in position (UTG+1 to LJ), with many players still behind. */
const IP_EARLY: Record<Position, Strategy> = {
  UTG: {
    raise: 'QQ+, AKs, AKo:0.75, JJ:0.15, AQs:0.3, A5s:0.35, A4s:0.2, KQs:0.15',
    call: 'JJ, TT:0.85, 99:0.6, 88:0.35, 77:0.2, 66:0.1, AQs, AJs:0.6, ATs:0.15, KQs:0.55, KJs:0.2, QJs:0.15, JTs:0.1, AKo, AQo:0.35',
  },
  'UTG+1': {
    raise: 'QQ+, AKs, AKo:0.8, JJ:0.2, AQs:0.35, AJs:0.05, A5s:0.4, A4s:0.25, A3s:0.05, KQs:0.2, KJs:0.05',
    call: 'JJ, TT:0.9, 99:0.65, 88:0.45, 77:0.3, 66:0.15, 55:0.05, AQs, AJs:0.7, ATs:0.25, KQs:0.65, KJs:0.3, KTs:0.05, QJs:0.25, JTs:0.15, T9s:0.05, AKo, AQo:0.4',
  },
  'UTG+2': {
    raise: 'QQ+, AKs, AKo:0.85, JJ:0.25, TT:0.05, AQs:0.4, AJs:0.1, A5s:0.45, A4s:0.3, A3s:0.1, KQs:0.25, KJs:0.1',
    call: 'JJ, TT, 99:0.7, 88:0.5, 77:0.35, 66:0.2, 55:0.1, AQs, AJs:0.75, ATs:0.3, KQs:0.7, KJs:0.35, KTs:0.1, QJs:0.3, JTs:0.2, T9s:0.05, AKo, AQo:0.45, AJo:0.05',
  },
};

/** Middle seats in position (HJ and CO), with three or four players behind. */
const IP_MIDDLE: Record<Position, Strategy> = {
  UTG: {
    raise: 'QQ+, AKs, AKo:0.8, JJ:0.25, AQs:0.4, AJs:0.1, A5s:0.45, A4s:0.3, A3s:0.1, KQs:0.25, KJs:0.1',
    call: 'JJ, TT, 99:0.75, 88:0.5, 77:0.35, 66:0.2, 55:0.1, AQs, AJs:0.75, ATs:0.35, KQs:0.75, KJs:0.4, KTs:0.1, QJs:0.35, JTs:0.25, T9s:0.1, AKo, AQo:0.45, AJo:0.05',
  },
  'UTG+1': {
    raise: 'QQ+, AKs, AKo:0.85, JJ:0.3, TT:0.05, AQs:0.45, AJs:0.15, ATs:0.05, A5s:0.5, A4s:0.35, A3s:0.15, KQs:0.3, KJs:0.15, QJs:0.05, AQo:0.05',
    call:
      'JJ, TT, 99:0.8, 88:0.6, 77:0.45, 66:0.3, 55:0.15, 44:0.05, AQs, AJs:0.85, ATs:0.45, A9s:0.05, KQs:0.85, KJs:0.5, KTs:0.2, ' +
      'QJs:0.45, QTs:0.1, JTs:0.35, T9s:0.15, 98s:0.05, AKo, AQo:0.55, AJo:0.1, KQo:0.05',
  },
  'UTG+2': {
    raise:
      'QQ+, AKs, AKo:0.9, JJ:0.35, TT:0.1, AQs:0.5, AJs:0.25, ATs:0.1, A5s:0.55, A4s:0.45, A3s:0.25, A2s:0.05, KQs:0.35, KJs:0.2, ' +
      'KTs:0.05, QJs:0.1, JTs:0.05, 76s:0.05, 65s:0.05, AQo:0.15, KQo:0.05',
    call:
      'JJ, TT, 99, 88:0.7, 77:0.55, 66:0.4, 55:0.25, 44:0.1, 33:0.05, AQs, AJs, ATs:0.55, A9s:0.15, KQs, KJs:0.6, KTs:0.3, ' +
      'QJs:0.55, QTs:0.2, JTs:0.45, J9s:0.05, T9s:0.25, 98s:0.1, 87s:0.05, AKo, AQo:0.65, AJo:0.15, KQo:0.1',
  },
  LJ: {
    raise:
      'QQ+, AKs, AKo, JJ:0.5, TT:0.2, 99:0.05, AQs:0.6, AJs:0.35, ATs:0.2, A9s:0.05, A5s:0.6, A4s:0.55, A3s:0.35, A2s:0.15, ' +
      'KQs:0.45, KJs:0.3, KTs:0.15, K9s:0.05, QJs:0.2, QTs:0.1, JTs:0.15, T9s:0.1, 98s:0.05, 87s:0.05, 76s:0.1, 65s:0.1, 54s:0.05, ' +
      'AQo:0.35, AJo:0.1, KQo:0.15',
    call:
      'JJ, TT, 99, 88:0.8, 77:0.6, 66:0.45, 55:0.3, 44:0.15, 33:0.1, 22:0.05, AQs, AJs, ATs:0.6, A9s:0.2, KQs, KJs:0.6, KTs:0.35, ' +
      'QJs:0.6, QTs:0.25, JTs:0.5, J9s:0.05, T9s:0.3, 98s:0.15, 87s:0.1, AQo:0.5, AJo:0.15, KQo:0.15',
  },
  HJ: {
    raise:
      'QQ+, AKs, AKo, JJ:0.6, TT:0.3, 99:0.15, 88:0.05, AQs:0.75, AJs:0.5, ATs:0.35, A9s:0.15, A8s:0.05, A5s:0.7, A4s:0.6, A3s:0.45, ' +
      'A2s:0.25, KQs:0.6, KJs:0.45, KTs:0.3, K9s:0.15, QJs:0.35, QTs:0.25, Q9s:0.05, JTs:0.25, J9s:0.05, T9s:0.2, 98s:0.1, ' +
      '87s:0.1, 76s:0.15, 65s:0.15, 54s:0.1, AQo:0.55, AJo:0.25, ATo:0.05, KQo:0.3, KJo:0.05',
    call:
      'JJ, TT, 99, 88:0.85, 77:0.7, 66:0.55, 55:0.4, 44:0.25, 33:0.15, 22:0.1, AQs, AJs, ATs:0.85, A9s:0.4, A8s:0.1, KQs, KJs:0.8, ' +
      'KTs:0.55, K9s:0.1, QJs:0.75, QTs:0.45, Q9s:0.05, JTs:0.65, J9s:0.15, T9s:0.45, T8s:0.05, 98s:0.25, 87s:0.15, 76s:0.1, ' +
      'AQo:0.75, AJo:0.3, ATo:0.05, KQo:0.35, KJo:0.05',
  },
};

/** The button, with only the blinds behind. It flats more than any other seat. */
export const BTN_DEFENSE: Record<Position, Strategy> = {
  UTG: {
    raise: 'QQ+, AKs, AKo:0.85, JJ:0.3, AQs:0.45, AJs:0.15, A5s:0.5, A4s:0.4, A3s:0.15, KQs:0.3, KJs:0.15, QJs:0.1, 76s:0.05, 65s:0.05',
    call:
      'JJ, TT, 99, 88:0.9, 77:0.75, 66:0.55, 55:0.35, 44:0.2, 33:0.1, 22:0.1, AQs, AJs, ATs:0.7, A9s:0.15, KQs, KJs:0.75, KTs:0.35, ' +
      'QJs:0.7, QTs:0.25, JTs:0.6, T9s:0.4, 98s:0.25, 87s:0.15, 76s:0.1, AKo, AQo:0.65, AJo:0.15, KQo:0.15',
  },
  'UTG+1': {
    raise:
      'QQ+, AKs, AKo:0.9, JJ:0.35, TT:0.05, AQs:0.5, AJs:0.2, ATs:0.05, A5s:0.55, A4s:0.45, A3s:0.2, KQs:0.35, KJs:0.2, QJs:0.15, ' +
      'JTs:0.05, 76s:0.1, 65s:0.1, AQo:0.1',
    call:
      'JJ, TT, 99, 88, 77:0.85, 66:0.65, 55:0.45, 44:0.3, 33:0.15, 22:0.15, AQs, AJs, ATs:0.8, A9s:0.25, A8s:0.05, KQs, KJs:0.85, ' +
      'KTs:0.45, K9s:0.05, QJs:0.8, QTs:0.35, JTs:0.7, J9s:0.05, T9s:0.5, 98s:0.35, 87s:0.25, 76s:0.2, 65s:0.15, 54s:0.05, ' +
      'AKo, AQo:0.7, AJo:0.25, KQo:0.25',
  },
  'UTG+2': {
    raise:
      'QQ+, AKs, AKo, JJ:0.4, TT:0.1, AQs:0.55, AJs:0.25, ATs:0.1, A5s:0.6, A4s:0.5, A3s:0.25, A2s:0.05, KQs:0.4, KJs:0.25, KTs:0.05, ' +
      'QJs:0.2, JTs:0.1, T9s:0.05, 87s:0.05, 76s:0.15, 65s:0.15, 54s:0.05, AQo:0.2, AJo:0.05',
    call:
      'JJ, TT, 99, 88, 77, 66:0.8, 55:0.6, 44:0.45, 33:0.3, 22:0.25, AQs, AJs, ATs, A9s:0.45, A8s:0.15, KQs, KJs, KTs:0.6, K9s:0.1, ' +
      'QJs, QTs:0.5, Q9s:0.05, JTs:0.85, J9s:0.15, T9s:0.65, 98s:0.5, 87s:0.4, 76s:0.3, 65s:0.25, 54s:0.1, ' +
      'AQo:0.8, AJo:0.4, ATo:0.05, KQo:0.4, KJo:0.05',
  },
  LJ: {
    raise:
      'QQ+, AKs, AKo, JJ:0.5, TT:0.15, 99:0.05, AQs:0.6, AJs:0.35, ATs:0.15, A9s:0.05, A5s:0.65, A4s:0.55, A3s:0.35, A2s:0.15, ' +
      'KQs:0.45, KJs:0.3, KTs:0.15, K9s:0.05, QJs:0.25, QTs:0.1, JTs:0.15, T9s:0.1, 98s:0.05, 87s:0.1, 76s:0.2, 65s:0.2, 54s:0.1, ' +
      'AQo:0.35, AJo:0.1, KQo:0.1',
    call:
      'JJ, TT, 99, 88, 77, 66, 55:0.8, 44:0.6, 33:0.45, 22:0.35, AQs, AJs, ATs, A9s:0.65, A8s:0.3, A7s:0.1, A6s:0.05, KQs, KJs, ' +
      'KTs:0.75, K9s:0.25, QJs, QTs:0.65, Q9s:0.15, JTs, J9s:0.3, T9s:0.8, T8s:0.1, 98s:0.6, 87s:0.5, 76s:0.4, 65s:0.35, 54s:0.2, ' +
      'AQo, AJo:0.55, ATo:0.1, KQo:0.55, KJo:0.15, QJo:0.05',
  },
  HJ: {
    raise:
      'QQ+, AKs, AKo, JJ:0.55, TT:0.2, 99:0.1, AQs:0.65, AJs:0.45, ATs:0.25, A9s:0.1, A8s:0.05, A5s:0.7, A4s:0.6, A3s:0.45, A2s:0.25, ' +
      'KQs:0.5, KJs:0.4, KTs:0.25, K9s:0.15, K8s:0.05, QJs:0.35, QTs:0.2, Q9s:0.1, JTs:0.2, J9s:0.1, T9s:0.15, T8s:0.05, 98s:0.1, ' +
      '87s:0.15, 76s:0.25, 65s:0.25, 54s:0.15, AQo:0.5, AJo:0.25, ATo:0.05, KQo:0.25, KJo:0.05',
    call:
      'JJ, TT, 99, 88, 77, 66, 55, 44:0.7, 33:0.5, 22:0.4, AQs, AJs, ATs, A9s:0.85, A8s:0.55, A7s:0.3, A6s:0.15, A5s, A4s, A3s, ' +
      'A2s:0.4, KQs, KJs, KTs, K9s:0.5, K8s:0.1, QJs, QTs, Q9s:0.35, JTs, J9s:0.55, T9s, T8s:0.25, 98s:0.8, 97s:0.1, 87s:0.65, ' +
      '76s:0.55, 65s:0.45, 54s:0.3, AQo, AJo:0.65, ATo:0.25, KQo:0.65, KJo:0.3, QJo:0.15',
  },
  CO: {
    raise:
      'QQ+, JJ:0.6, TT:0.3, AK, AQs, AJs:0.6, ATs:0.4, A5s:0.75, A4s:0.7, A3s:0.6, A2s:0.5, KQs:0.6, KJs:0.5, KTs:0.4, ' +
      'K9s:0.5, K8s:0.2, Q9s:0.5, J9s:0.4, T8s:0.5, 97s:0.5, 86s:0.4, 76s:0.4, 65s:0.4, 54s:0.2, ' +
      'AQo:0.8, AJo:0.5, ATo:0.1, KQo:0.5, KJo:0.1',
    call:
      '55-JJ, 44:0.9, 33:0.7, 22:0.5, A2s+, KTs+, K9s, K8s:0.25, QTs+, Q9s, Q8s:0.15, J9s+, J8s:0.2, T8s+, 97s+, 87s, 86s:0.5, ' +
      '76s, 75s:0.15, 65s, 54s:0.4, AJo, ATo:0.4, KQo, KJo:0.35, KTo:0.05, QJo:0.15, JTo:0.1',
  },
};

/** The strategy for a 9-handed hero seat against a 9-handed opener. */
export function defenseStrategy(hero9: Position, opener9: Position): Strategy {
  if (hero9 === 'BB') return BB_DEFENSE[opener9];
  if (hero9 === 'SB') return SB_DEFENSE[opener9];
  if (hero9 === 'BTN') return BTN_DEFENSE[opener9];
  if (hero9 === 'HJ' || hero9 === 'CO') return IP_MIDDLE[opener9];
  return IP_EARLY[opener9];
}

/** Every 9-handed defense spot: hero seats after each opener. */
export function defensePairs(): [hero9: Position, opener9: Position][] {
  const out: [Position, Position][] = [];
  for (let o = 0; o < NINE.length - 1; o++) for (let h = o + 1; h < NINE.length; h++) out.push([NINE[h], NINE[o]]);
  return out;
}

/** The 3bet size this starter chart labels, in big blinds. */
export function defenseThreeBet(hero9: Position, opener9: Position): number {
  if (hero9 === 'BB' && opener9 === 'SB') return 9;
  if (isBlind(hero9)) return ['UTG', 'UTG+1', 'UTG+2', 'LJ'].includes(opener9) ? 12 : 11;
  return 7.5;
}

const NOTES = {
  bbVsBtn: 'Assumes a 2.5bb open. The big blind already has 1bb in, so it defends widest against the button. Against bigger live opens, defend tighter.',
  bbVsCo: 'Assumes a 2.5bb open. Against bigger live opens, defend tighter: the price to call is worse.',
  bbVsUtg: 'A tight opener means a tight defense. Against bigger live opens, call less still.',
  sbVsBtn: 'Out of position against a wide range, the small blind mostly 3bets or folds. Calling invites the big blind in behind.',
  btnVsCo: 'In position, the button calls more than the blinds can and 3bets smaller, to about 7.5bb.',
  bb: 'Assumes a 2.5bb open. The big blind closes the action at a good price, so it defends wide. Against bigger live opens, defend tighter.',
  bbVsSb: 'The small blind opens 3bb from a wide range. With position, the big blind 3bets often and calls a lot.',
  sb: 'Out of position with the big blind behind, the small blind 3bets or folds. Calling invites a squeeze.',
  early: 'Many players are still behind, so a cold call invites a squeeze. This seat mostly 3bets or folds.',
  middle: 'With a few players behind, this seat 3bets more than it flats. It flats hands that play well in position.',
  btn: 'Only the blinds are behind, so the button flats more than any other seat.',
};

function noteFor(hero9: Position, opener9: Position): string {
  if (hero9 === 'BB') return opener9 === 'BTN' ? NOTES.bbVsBtn : opener9 === 'CO' ? NOTES.bbVsCo : opener9 === 'UTG' ? NOTES.bbVsUtg : opener9 === 'SB' ? NOTES.bbVsSb : NOTES.bb;
  if (hero9 === 'SB') return opener9 === 'BTN' ? NOTES.sbVsBtn : NOTES.sb;
  if (hero9 === 'BTN') return opener9 === 'CO' ? NOTES.btnVsCo : NOTES.btn;
  return hero9 === 'HJ' || hero9 === 'CO' ? NOTES.middle : NOTES.early;
}

export function vsOpen(tableSize: number, hero9: Position, opener9: Position): ChartSpec | undefined {
  const hero = seatAt(hero9, tableSize);
  const opener = seatAt(opener9, tableSize);
  if (!hero || !opener) return undefined;
  const s = defenseStrategy(hero9, opener9);
  const open = opener9 === 'SB' ? '3bb' : '2.5bb';
  return {
    id: `${tableSize}max-100-${slug(hero)}-vs-${slug(opener)}`,
    title: `${hero} vs ${opener} open`,
    ...starter(tableSize),
    hero,
    versus: `${opener} opens ${open}`,
    villains: [opener],
    spot: 'vs-open',
    note: noteFor(hero9, opener9),
    actions: actions('3bet', `3bet ${defenseThreeBet(hero9, opener9)}bb`, s),
  };
}

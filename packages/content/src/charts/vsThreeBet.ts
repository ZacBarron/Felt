import type { ChartSpec, Position } from '@felt/core';
import { actions, groupSlug, isBlind, seatAt, seatGroup, slug, starter, type Strategy } from './common';
import { rfiRange } from './rfi';

/**
 * Facing a 3bet after opening: 4bet, call or fold. 100bb, 2.5bb opens.
 * Hand written to match the shape of published solver results. Only hands
 * the seat opens can be here (the chart's reach), and a large share of them
 * fold. Out of position against a 3bet from a later seat the opener keeps a
 * narrow, strong range. In position against a blind it calls more.
 *
 * 3bettors that play alike share a chart: the seats in position before the
 * button, the button, and the blinds. The button and the small blind face
 * each blind on its own.
 */

interface Group {
  /** 9-handed seats this strategy covers. */
  seats: Position[];
  s: Strategy;
}

/** For each 9-handed opener, the strategy against each group of 3bettors. */
export const VS_THREEBET: Record<Position, Group[]> = {
  UTG: [
    {
      seats: ['UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO'],
      s: {
        raise: 'KK+, QQ:0.5, AKs, AKo:0.6, A5s:0.3, A4s:0.15',
        call: 'QQ, JJ, TT, 99:0.65, 88:0.35, 77:0.15, AKo, AQs, AJs, ATs:0.5, A5s:0.25, KQs, KJs:0.5, QJs:0.4, JTs:0.3, T9s:0.1, AQo:0.35, KQo:0.1',
      },
    },
    {
      seats: ['BTN'],
      s: {
        raise: 'KK+, QQ:0.45, AKs, AKo:0.55, A5s:0.35, A4s:0.2, KQs:0.05',
        call:
          'QQ, JJ, TT, 99:0.75, 88:0.45, 77:0.25, 66:0.1, AKo, AQs, AJs, ATs:0.6, A9s:0.1, A5s:0.3, A4s:0.1, KQs, KJs:0.6, KTs:0.15, ' +
          'QJs:0.5, QTs:0.05, JTs:0.4, T9s:0.2, 98s:0.05, AQo:0.45, AJo:0.05, KQo:0.15',
      },
    },
    {
      seats: ['SB', 'BB'],
      s: {
        raise: 'KK+, QQ:0.4, AKs, AKo:0.5, A5s:0.3, A4s:0.15',
        call:
          'QQ, JJ, TT, 99:0.85, 88:0.6, 77:0.4, 66:0.2, 55:0.1, AKo, AQs, AJs, ATs:0.75, A9s:0.15, A5s:0.4, A4s:0.2, KQs, KJs:0.75, ' +
          'KTs:0.3, QJs:0.65, QTs:0.15, JTs:0.55, T9s:0.35, 98s:0.15, AQo:0.6, AJo:0.15, KQo:0.25',
      },
    },
  ],
  'UTG+1': [
    {
      seats: ['UTG+2', 'LJ', 'HJ', 'CO'],
      s: {
        raise: 'KK+, QQ:0.5, AKs, AKo:0.65, A5s:0.3, A4s:0.2, A3s:0.05',
        call:
          'QQ, JJ, TT, 99:0.7, 88:0.4, 77:0.2, 66:0.05, AKo, AQs, AJs, ATs:0.55, A9s:0.05, A5s:0.3, A4s:0.1, KQs, KJs:0.55, KTs:0.1, ' +
          'QJs:0.45, JTs:0.35, T9s:0.15, 98s:0.05, AQo:0.4, KQo:0.1',
      },
    },
    {
      seats: ['BTN'],
      s: {
        raise: 'KK+, QQ:0.45, AKs, AKo:0.6, A5s:0.35, A4s:0.2, A3s:0.05, KQs:0.05',
        call:
          'QQ, JJ, TT, 99:0.8, 88:0.5, 77:0.3, 66:0.15, 55:0.05, AKo, AQs, AJs, ATs:0.65, A9s:0.15, A5s:0.3, A4s:0.15, KQs, KJs:0.65, ' +
          'KTs:0.2, QJs:0.55, QTs:0.1, JTs:0.45, T9s:0.25, 98s:0.1, 87s:0.05, AQo:0.5, AJo:0.1, KQo:0.2',
      },
    },
    {
      seats: ['SB', 'BB'],
      s: {
        raise: 'KK+, QQ:0.4, AKs, AKo:0.5, A5s:0.3, A4s:0.2',
        call:
          'QQ, JJ, TT, 99:0.9, 88:0.65, 77:0.45, 66:0.25, 55:0.15, AKo, AQs, AJs, ATs:0.8, A9s:0.25, A8s:0.05, A5s:0.4, A4s:0.25, ' +
          'KQs, KJs:0.8, KTs:0.4, QJs:0.7, QTs:0.25, JTs:0.6, T9s:0.4, 98s:0.2, 87s:0.1, AQo:0.65, AJo:0.2, KQo:0.3',
      },
    },
  ],
  'UTG+2': [
    {
      seats: ['LJ', 'HJ', 'CO'],
      s: {
        raise: 'KK+, QQ:0.55, AKs, AKo:0.7, A5s:0.35, A4s:0.25, A3s:0.1, K9s:0.05',
        call:
          'QQ, JJ, TT, 99:0.75, 88:0.5, 77:0.3, 66:0.15, 55:0.05, AKo, AQs, AJs, ATs:0.6, A9s:0.15, A5s:0.3, A4s:0.15, KQs, KJs:0.65, ' +
          'KTs:0.25, QJs:0.55, QTs:0.15, JTs:0.45, T9s:0.25, 98s:0.1, 87s:0.05, AQo:0.45, AJo:0.05, KQo:0.15',
      },
    },
    {
      seats: ['BTN'],
      s: {
        raise: 'KK+, QQ:0.5, AKs, AKo:0.65, A5s:0.4, A4s:0.25, A3s:0.1, K9s:0.1',
        call:
          'QQ, JJ, TT, 99:0.85, 88:0.6, 77:0.4, 66:0.2, 55:0.1, AKo, AQs, AJs, ATs:0.7, A9s:0.25, A8s:0.05, A5s:0.3, A4s:0.2, KQs, ' +
          'KJs:0.75, KTs:0.35, QJs:0.65, QTs:0.25, JTs:0.55, T9s:0.35, 98s:0.2, 87s:0.1, 76s:0.05, AQo:0.55, AJo:0.15, KQo:0.25',
      },
    },
    {
      seats: ['SB', 'BB'],
      s: {
        raise: 'KK+, QQ:0.45, AKs, AKo:0.55, A5s:0.35, A4s:0.25, A3s:0.05, K9s:0.05',
        call:
          'QQ, JJ, TT, 99, 88:0.75, 77:0.55, 66:0.35, 55:0.2, 44:0.1, AKo, AQs, AJs, ATs:0.85, A9s:0.35, A8s:0.1, A5s:0.4, A4s:0.3, ' +
          'A3s:0.1, KQs, KJs:0.85, KTs:0.5, K9s:0.05, QJs:0.8, QTs:0.4, JTs:0.7, J9s:0.05, T9s:0.5, 98s:0.3, 87s:0.2, 76s:0.1, ' +
          'AQo:0.7, AJo:0.3, KQo:0.4, KJo:0.05',
      },
    },
  ],
  LJ: [
    {
      seats: ['HJ', 'CO'],
      s: {
        raise: 'KK+, QQ:0.6, JJ:0.1, AKs, AKo:0.75, AQs:0.1, A5s:0.4, A4s:0.3, A3s:0.15, K9s:0.1, K8s:0.05',
        call:
          'QQ, JJ, TT, 99:0.8, 88:0.55, 77:0.35, 66:0.2, 55:0.1, AKo, AQs, AJs, ATs:0.7, A9s:0.2, A8s:0.05, A5s:0.3, A4s:0.2, KQs, ' +
          'KJs:0.7, KTs:0.35, QJs:0.6, QTs:0.25, JTs:0.5, T9s:0.3, 98s:0.15, 87s:0.1, 76s:0.05, AQo:0.5, AJo:0.1, KQo:0.2',
      },
    },
    {
      seats: ['BTN'],
      s: {
        raise: 'KK+, QQ:0.55, JJ:0.1, AKs, AKo:0.7, AQs:0.1, A5s:0.45, A4s:0.35, A3s:0.2, K9s:0.15, K8s:0.1, Q9s:0.05',
        call:
          'QQ, JJ, TT, 99:0.9, 88:0.65, 77:0.45, 66:0.3, 55:0.15, 44:0.05, AKo, AQs, AJs, ATs:0.8, A9s:0.3, A8s:0.1, A5s:0.3, A4s:0.25, ' +
          'A3s:0.1, KQs, KJs:0.8, KTs:0.45, K9s:0.05, QJs:0.7, QTs:0.35, JTs:0.6, J9s:0.05, T9s:0.4, 98s:0.25, 87s:0.15, 76s:0.1, ' +
          '65s:0.05, AQo:0.6, AJo:0.2, KQo:0.3',
      },
    },
    {
      seats: ['SB', 'BB'],
      s: {
        raise: 'KK+, QQ:0.5, AKs, AKo:0.6, A5s:0.4, A4s:0.3, A3s:0.15, K9s:0.1, K8s:0.05',
        call:
          'QQ, JJ, TT, 99, 88:0.85, 77:0.65, 66:0.45, 55:0.3, 44:0.15, 33:0.05, AKo, AQs, AJs, ATs:0.9, A9s:0.45, A8s:0.2, A7s:0.05, ' +
          'A5s:0.4, A4s:0.35, A3s:0.2, KQs, KJs:0.9, KTs:0.6, K9s:0.15, QJs:0.85, QTs:0.5, Q9s:0.05, JTs:0.8, J9s:0.15, T9s:0.6, ' +
          '98s:0.4, 87s:0.3, 76s:0.2, 65s:0.1, AQo:0.75, AJo:0.35, ATo:0.05, KQo:0.45, KJo:0.1',
      },
    },
  ],
  HJ: [
    {
      seats: ['CO'],
      s: {
        raise: 'KK+, QQ:0.65, JJ:0.2, AKs, AKo:0.8, AQs:0.15, A5s:0.45, A4s:0.35, A3s:0.2, A2s:0.05, K9s:0.15, K8s:0.1, Q9s:0.05',
        call:
          'QQ, JJ, TT, 99:0.85, 88:0.65, 77:0.45, 66:0.3, 55:0.15, 44:0.05, AKo, AQs, AJs, ATs:0.8, A9s:0.3, A8s:0.1, A5s:0.3, ' +
          'A4s:0.25, A3s:0.1, KQs, KJs:0.8, KTs:0.45, K9s:0.05, QJs:0.7, QTs:0.35, JTs:0.6, J9s:0.05, T9s:0.4, 98s:0.25, 87s:0.15, ' +
          '76s:0.1, 65s:0.05, AQo:0.6, AJo:0.2, KQo:0.3',
      },
    },
    {
      seats: ['BTN'],
      s: {
        raise: 'KK+, QQ:0.6, JJ:0.2, AKs, AKo:0.75, AQs:0.15, A5s:0.5, A4s:0.4, A3s:0.25, A2s:0.1, K9s:0.2, K8s:0.15, Q9s:0.1, J9s:0.05',
        call:
          'QQ, JJ, TT, 99, 88:0.75, 77:0.55, 66:0.4, 55:0.25, 44:0.1, 33:0.05, AKo, AQs, AJs, ATs:0.85, A9s:0.4, A8s:0.15, A7s:0.05, ' +
          'A5s:0.3, A4s:0.3, A3s:0.15, KQs, KJs:0.85, KTs:0.55, K9s:0.1, QJs:0.8, QTs:0.45, Q9s:0.05, JTs:0.7, J9s:0.1, T9s:0.5, ' +
          '98s:0.35, 87s:0.25, 76s:0.15, 65s:0.1, AQo:0.7, AJo:0.3, ATo:0.05, KQo:0.4, KJo:0.05',
      },
    },
    {
      seats: ['SB', 'BB'],
      s: {
        raise: 'KK+, QQ:0.55, JJ:0.1, AKs, AKo:0.65, AQs:0.1, A5s:0.45, A4s:0.35, A3s:0.2, K9s:0.15, K8s:0.1, Q9s:0.05',
        call:
          'QQ, JJ, TT, 99, 88:0.9, 77:0.75, 66:0.55, 55:0.4, 44:0.25, 33:0.1, 22:0.05, AKo, AQs, AJs, ATs, A9s:0.55, A8s:0.3, A7s:0.15, ' +
          'A6s:0.05, A5s:0.4, A4s:0.4, A3s:0.25, A2s:0.1, KQs, KJs, KTs:0.7, K9s:0.25, QJs, QTs:0.65, Q9s:0.15, JTs:0.9, J9s:0.25, ' +
          'T9s:0.7, T8s:0.05, 98s:0.5, 87s:0.4, 76s:0.3, 65s:0.2, 54s:0.05, AQo:0.85, AJo:0.45, ATo:0.1, KQo:0.55, KJo:0.15',
      },
    },
  ],
  CO: [
    {
      seats: ['BTN'],
      s: {
        raise:
          'KK+, QQ:0.7, JJ:0.3, TT:0.05, AKs, AKo:0.85, AQs:0.25, AJs:0.05, A5s:0.5, A4s:0.45, A3s:0.3, A2s:0.15, K9s:0.25, K8s:0.2, ' +
          'K7s:0.1, Q9s:0.15, J9s:0.1, AJo:0.05, KJo:0.05',
        call:
          'QQ, JJ, TT, 99, 88:0.8, 77:0.65, 66:0.5, 55:0.35, 44:0.2, 33:0.1, 22:0.05, AKo, AQs, AJs, ATs, A9s:0.5, A8s:0.25, A7s:0.1, ' +
          'A6s:0.05, A5s:0.4, A4s:0.35, A3s:0.2, A2s:0.1, KQs, KJs, KTs:0.65, K9s:0.2, QJs:0.85, QTs:0.55, Q9s:0.1, JTs:0.8, J9s:0.2, ' +
          'T9s:0.6, T8s:0.05, 98s:0.45, 87s:0.35, 76s:0.25, 65s:0.15, 54s:0.05, AQo:0.75, AJo:0.35, ATo:0.05, KQo:0.5, KJo:0.1',
      },
    },
    {
      seats: ['SB', 'BB'],
      s: {
        raise:
          'KK+, QQ:0.65, JJ:0.2, AKs, AKo:0.8, AQs:0.2, A5s:0.5, A4s:0.4, A3s:0.25, A2s:0.1, K9s:0.25, K8s:0.15, Q9s:0.1, J9s:0.05, AJo:0.05',
        call:
          'QQ, JJ, TT, 99, 88, 77:0.85, 66:0.7, 55:0.55, 44:0.4, 33:0.25, 22:0.15, AKo, AQs, AJs, ATs, A9s:0.7, A8s:0.45, A7s:0.25, ' +
          'A6s:0.15, A5s:0.5, A4s:0.45, A3s:0.3, A2s:0.2, KQs, KJs, KTs:0.8, K9s:0.35, K8s:0.05, QJs, QTs:0.75, Q9s:0.25, JTs, ' +
          'J9s:0.35, J8s:0.05, T9s:0.8, T8s:0.15, 98s:0.6, 97s:0.05, 87s:0.5, 86s:0.05, 76s:0.4, 65s:0.3, 54s:0.15, ' +
          'AQo:0.9, AJo:0.5, ATo:0.15, KQo:0.65, KJo:0.25, QJo:0.05',
      },
    },
  ],
  BTN: [
    {
      seats: ['SB'],
      s: {
        raise:
          'KK+, QQ:0.7, JJ:0.3, TT:0.1, AKs, AKo:0.85, AQs:0.35, AQo:0.1, A5s:0.55, A4s:0.5, A3s:0.35, A2s:0.25, K9s:0.35, K8s:0.3, ' +
          'K7s:0.1, Q9s:0.25, J9s:0.15, AJo:0.05',
        call:
          'QQ, JJ, TT, 99, 88, 77, 66, 55, 44:0.9, 33:0.8, 22:0.7, A2s+, K9s+, K8s:0.5, K7s:0.25, K6s:0.1, Q9s+, Q8s:0.35, J9s+, ' +
          'J8s:0.3, T8s+, T7s:0.1, 97s+, 86s+, 75s+, 64s:0.2, 65s, 54s, 53s:0.1, ATo+, A9o:0.2, KQo, KJo:0.6, KTo:0.25, QJo:0.5, ' +
          'QTo:0.1, JTo:0.35',
      },
    },
    {
      seats: ['BB'],
      s: {
        raise: 'KK+, QQ:0.6, JJ:0.2, AKs, AKo:0.8, AQs:0.3, A5s:0.55, A4s:0.45, A3s:0.3, A2s:0.2, K9s:0.3, K8s:0.25, Q9s:0.2',
        call:
          '55-QQ, 44:0.85, 33:0.7, 22:0.6, A2s+, K9s+, K8s:0.4, K7s:0.1, Q9s+, Q8s:0.2, J9s+, J8s:0.15, T8s+, 97s+, 86s+, 75s+, 65s, 54s, ' +
          'AJo+, ATo:0.5, A9o:0.05, KQo, KJo:0.45, KTo:0.1, QJo:0.35, JTo:0.2',
      },
    },
  ],
  SB: [
    {
      seats: ['BB'],
      s: {
        raise:
          'KK+, QQ:0.7, JJ:0.35, TT:0.1, AKs, AKo:0.85, AQs:0.35, AQo:0.2, A5s:0.5, A4s:0.45, A3s:0.3, A2s:0.2, K9s:0.3, K8s:0.25, ' +
          'K7s:0.15, Q9s:0.2, AJo:0.1, KQo:0.05, A9o:0.1, A8o:0.05',
        call:
          'QQ, JJ, TT, 99, 88, 77, 66:0.9, 55:0.8, 44:0.65, 33:0.5, 22:0.4, A2s+, KTs+, K9s:0.9, K8s:0.6, K7s:0.35, K6s:0.2, K5s:0.1, ' +
          'QTs+, Q9s:0.75, Q8s:0.3, JTs, J9s:0.6, J8s:0.2, T9s:0.85, T8s:0.35, 98s:0.6, 97s:0.15, 87s:0.45, 76s:0.35, 65s:0.25, ' +
          '54s:0.15, AJo+, ATo:0.75, A9o:0.35, A8o:0.15, A5o:0.1, KQo:0.85, KJo:0.5, KTo:0.2, QJo:0.35, QTo:0.1, JTo:0.15',
      },
    },
  ],
};

/** 4bet sizes in big blinds: out of position against a 3bet from behind, in position against a blind. */
function fourBetSize(opener9: Position, group: Position[]): number {
  if (opener9 === 'SB') return 22;
  return group.every(isBlind) || group[0] === 'BB' || group[0] === 'SB' ? 24 : 22;
}

function threeBetLabel(opener9: Position, group: Position[]): number {
  if (opener9 === 'SB') return 9;
  if (group.every(isBlind) || group[0] === 'SB' || group[0] === 'BB') return 11;
  return 7.5;
}

/** Ids from before the library: kept so saved progress and lessons still find them. */
function legacyId(tableSize: number, opener9: Position, group: Position[]): string | undefined {
  if (opener9 === 'BTN' && group[0] === 'BB') return `${tableSize}max-100-btn-vs-3bet`;
  if (tableSize === 9 && opener9 === 'UTG' && group[0] === 'UTG+1') return '9max-100-utg-vs-3bet';
  return undefined;
}

export function vsThreeBet(tableSize: number, opener9: Position, group: Group): ChartSpec | undefined {
  const hero = seatAt(opener9, tableSize);
  const seats = group.seats.map((s) => seatAt(s, tableSize)).filter((s): s is Position => !!s);
  if (!hero || seats.length === 0) return undefined;
  const who = seatGroup(seats);
  const size = threeBetLabel(opener9, group.seats);
  const open = opener9 === 'SB' ? '3bb' : '2.5bb';
  const ip = !isBlind(opener9) && seats.every(isBlind);
  const legacy = legacyId(tableSize, opener9, group.seats);
  return {
    id: legacy ?? `${tableSize}max-100-${slug(hero)}-vs-${groupSlug(seats)}-3bet`,
    title: `${hero} open vs ${who} 3bet`,
    ...starter(tableSize),
    hero,
    versus: `You open ${open}. ${who} 3bets to ${size}bb.`,
    villains: seats,
    spot: 'vs-3bet',
    note:
      legacy === `${tableSize}max-100-btn-vs-3bet`
        ? 'Only hands the button opens can be here; the rest are greyed out. Position lets the button call a wide range.'
        : legacy
          ? 'Only hands UTG opens can be here. Facing a 3bet from a player with position, UTG keeps a narrow, strong range.'
          : ip
            ? 'Only hands you open can be here. You have position on the blind, so you call more and 4bet less.'
            : `Only hands you open can be here. Out of position against ${who}, keep a narrow, strong range.`,
    reach: rfiRange(opener9),
    actions: actions('4bet', `4bet ${fourBetSize(opener9, group.seats)}bb`, group.s),
  };
}

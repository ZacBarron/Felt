import type { ChartSpec, Position } from '@felt/core';
import { seatAt, slug, starter } from './common';

/**
 * Live limped pots: iso raise, overlimp or fold against 1, 2 and 3 limpers,
 * from the cutoff, the button and the blinds. These are exploit charts for a
 * typical live limper: someone who limps a wide, weak range, calls raises too
 * often and plays poorly after the flop. Against a tough or trapping limper,
 * isolate tighter.
 *
 * Sizes follow a live rule of thumb: 3bb plus 2bb per limper in position,
 * 1bb more from the blinds. More limpers mean a bigger, tighter raise and
 * more overlimps with hands that win big multiway pots.
 */

interface Limped {
  raise: string;
  call: string;
}

/** By 9-handed seat, then limper count. */
const LIMPED: Record<Position, Record<number, Limped>> = {
  CO: {
    1: {
      raise: '77+, 55-66:0.5, 22-44:0.3, A2s+, K9s+, K8s:0.5, QTs+, Q9s:0.5, JTs, J9s:0.4, T9s:0.6, ATo+, A9o:0.6, KJo+, KTo:0.6, QJo:0.7, QTo:0.3',
      call: '22-66, K6s-K8s, K5s:0.5, Q8s-Q9s, J8s-J9s, T8s+, 97s+, 87s, 86s:0.5, 76s, 75s:0.3, 65s, 54s:0.6',
    },
    2: {
      raise: '99+, 88:0.5, AJs+, ATs:0.5, KQs, KJs:0.4, AQo+, AJo:0.3',
      call: '22-88, A2s-ATs, KTs-KJs, K9s:0.4, QTs+, Q9s:0.3, J9s+, T8s+, 97s+, 86s+, 76s, 75s:0.3, 65s, 54s:0.6, KQo:0.3',
    },
    3: {
      raise: 'TT+, 99:0.5, AQs+, AJs:0.5, KQs:0.3, AKo, AQo:0.4',
      call: '22-99, A2s-AJs, KTs+, K9s:0.3, QTs+, J9s+, T8s+, 97s+, 86s+, 75s+, 64s:0.5, 65s, 54s, KQo:0.2',
    },
  },
  BTN: {
    1: {
      // Against a weak limper, isolate wider than a standard open with hands that play well heads up in position.
      raise: '77+, 22-66:0.5, A2s+, K8s+, Q9s+, J9s+, T9s, 98s:0.5, A9o+, A8o:0.5, KTo+, QTo+, JTo:0.5',
      call: '22-66, K2s-K7s, Q5s-Q8s, J7s-J8s, T7s-T8s, 97s+, 86s+, 75s+, 64s+, 54s, 43s:0.5',
    },
    2: {
      raise: '99+, 77-88:0.5, AJs+, ATs:0.5, KQs, KJs:0.5, AQo+, AJo:0.4',
      call: '22-88, A2s-ATs, KTs-KJs, K9s:0.5, QTs+, Q9s:0.5, J9s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s',
    },
    3: {
      raise: 'TT+, 99:0.6, AQs+, AJs:0.6, KQs:0.4, AKo, AQo:0.5',
      call: '22-99, A2s-AJs, K9s+, K8s:0.4, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, 43s:0.5, KQo:0.3, KJo:0.1',
    },
  },
  SB: {
    1: {
      raise: '99+, 88:0.6, 77:0.4, ATs+, A9s:0.5, A5s:0.6, A4s:0.4, KJs+, KTs:0.5, QJs:0.5, AJo+, ATo:0.5, KQo:0.7',
      call: '22-88, A2s-A9s, K6s-KTs, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, 43s:0.5, ATo, A9o:0.5, KJo:0.6, KTo:0.3, QJo:0.6, QTo:0.3, JTo:0.4',
    },
    2: {
      raise: 'TT+, 99:0.5, AQs+, AJs:0.6, KQs:0.5, AKo, AQo:0.6',
      call: '22-99, A2s-AJs, K5s+, Q7s+, J7s+, T7s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s:0.6, AJo, ATo:0.5, KJo+, KTo:0.4, QJo:0.7, QTo:0.4, JTo:0.6',
    },
    3: {
      raise: 'JJ+, TT:0.5, AKs, AQs:0.7, AKo, AQo:0.3',
      call: '22-TT, A2s-AQs, K2s+, Q5s+, J6s+, T6s+, 95s+, 85s+, 74s+, 63s+, 53s+, 43s, ATo+, A9o:0.4, KTo+, K9o:0.3, QTo+, JTo, T9o:0.4',
    },
  },
  BB: {
    1: {
      raise: '99+, 88:0.6, 77:0.4, ATs+, A9s:0.6, A5s:0.7, A4s:0.5, A3s:0.3, KTs+, K9s:0.4, QJs:0.7, QTs:0.4, JTs:0.4, AJo+, ATo:0.6, A9o:0.3, KJo+, KTo:0.4, QJo:0.4',
      call: 'ALL',
    },
    2: {
      raise: 'TT+, 99:0.6, AJs+, ATs:0.5, A5s:0.4, KQs, KJs:0.5, AQo+, AJo:0.5, KQo:0.4',
      call: 'ALL',
    },
    3: {
      raise: 'JJ+, TT:0.6, AQs+, AJs:0.5, KQs:0.5, AKo, AQo:0.5',
      call: 'ALL',
    },
  },
};

const ALL = '22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J2o+, T2o+, 92o+, 82o+, 72o+, 62o+, 52o+, 42o+, 32o';
const WORDS = ['', 'one limper', 'two limpers', 'three limpers'];
const COUNT = ['', 'One', 'Two', 'Three'];

/** Iso raise size: 3bb plus 2bb per limper in position, 1bb more from the blinds. */
export const isoSize = (seat9: Position, limpers: number) => 3 + 2 * limpers + (seat9 === 'SB' || seat9 === 'BB' ? 1 : 0);

export const LIMP_SEATS: Position[] = ['CO', 'BTN', 'SB', 'BB'];

export function vsLimp(tableSize: number, seat9: Position, limpers: 1 | 2 | 3): ChartSpec | undefined {
  const hero = seatAt(seat9, tableSize);
  if (!hero) return undefined;
  const r = LIMPED[seat9][limpers];
  const blind = seat9 === 'SB' || seat9 === 'BB';
  const flat = seat9 === 'BB' ? 'Check' : seat9 === 'SB' ? 'Complete' : 'Overlimp';
  const size = isoSize(seat9, limpers);
  const legacy = tableSize === 9 && seat9 === 'BTN' && limpers < 3;
  return {
    id: `${tableSize}max-100-iso-${slug(hero)}-vs-${limpers}limp`,
    title: `${hero} vs ${WORDS[limpers]}`,
    ...starter(tableSize),
    basis: 'exploit',
    hero,
    versus: legacy && limpers === 1 ? 'One early position limper, folded to you' : `${COUNT[limpers]} ${limpers === 1 ? 'limper' : 'limpers'}, folded to you`,
    limpers,
    spot: 'vs-limp',
    note:
      legacy && limpers === 1
        ? 'An exploit for a typical live limper who calls raises too often and plays poorly after the flop. Against a tough limper, isolate tighter.'
        : legacy
          ? 'With two limpers, isolate bigger (about 7bb) and tighter: more players can call. Overlimp hands that win big pots multiway.'
          : blind
            ? `An exploit for typical live limpers. Out of position, isolate bigger and tighter. ${seat9 === 'BB' ? 'Check the rest for free.' : 'Complete hands that play well multiway.'}`
            : 'An exploit for typical live limpers who call raises too often. Overlimp hands that win big pots multiway.',
    actions: [
      { id: 'raise', label: `Iso raise ${size}bb`, range: r.raise },
      { id: 'call', label: flat, range: r.call === 'ALL' ? ALL : r.call },
    ],
  };
}

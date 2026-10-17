import type { ChartSpec, Position } from '@felt/core';
import { actions, groupSlug, isBlind, seatAt, seatGroup, slug, starter, type Strategy } from './common';
import { rfiRange } from './rfi';

/**
 * Squeezes: one player opened and one called before you. 100bb, 2.5bb opens.
 * Hand written to match the shape of published solver results. The squeeze
 * is bigger than a 3bet (about 10bb in position, 13bb from the blinds), and
 * the range is tighter and more linear than a 3bet against the same opener,
 * since two players can continue. The big blind still overcalls wide: it
 * closes the action at a good price.
 *
 * Facing a squeeze: you opened, someone called, and a player behind
 * squeezed. With the caller still to act, the opener continues tighter than
 * against a plain 3bet.
 */

interface Squeeze {
  hero: Position;
  opener: Position;
  callers: Position[];
  s: Strategy;
}

export const SQUEEZES: Squeeze[] = [
  {
    hero: 'BB',
    opener: 'BTN',
    callers: ['SB'],
    s: {
      raise:
        'QQ+, JJ:0.6, TT:0.25, AKs, AKo, AQs:0.85, AQo:0.45, AJs:0.5, ATs:0.25, A5s:0.6, A4s:0.5, A3s:0.3, A2s:0.15, KQs:0.55, KJs:0.4, ' +
        'KTs:0.3, K9s:0.2, QJs:0.3, QTs:0.2, JTs:0.25, T9s:0.15, 98s:0.1, 87s:0.1, 76s:0.15, 65s:0.15, 54s:0.1, AJo:0.2, KQo:0.25, KJo:0.05',
      call:
        '22-JJ, A2s+, K2s+, Q5s+, Q4s:0.6, Q3s:0.4, Q2s:0.25, J6s+, J5s:0.45, J4s:0.2, T6s+, T5s:0.3, 96s+, 95s:0.2, 85s+, 84s:0.1, ' +
        '74s:0.7, 75s+, 63s:0.3, 64s+, 53s:0.8, 54s, 43s:0.55, A9o+, A8o:0.6, A7o:0.35, A6o:0.1, A5o:0.45, A4o:0.25, A3o:0.1, ' +
        'KTo+, K9o:0.55, K8o:0.1, QTo+, Q9o:0.35, JTo, J9o:0.4, T9o:0.55, T8o:0.15, 98o:0.3, 87o:0.15',
    },
  },
  {
    hero: 'BB',
    opener: 'CO',
    callers: ['BTN', 'SB'],
    s: {
      raise:
        'QQ+, JJ:0.65, TT:0.3, AKs, AKo, AQs:0.85, AQo:0.5, AJs:0.45, ATs:0.2, A5s:0.55, A4s:0.45, A3s:0.25, A2s:0.1, KQs:0.5, KJs:0.35, ' +
        'KTs:0.2, K9s:0.1, QJs:0.2, QTs:0.1, JTs:0.15, T9s:0.1, 76s:0.1, 65s:0.1, 54s:0.05, AJo:0.15, KQo:0.2',
      call:
        '22-JJ, A2s+, K5s+, K4s:0.6, K3s:0.4, K2s:0.25, Q7s+, Q6s:0.5, Q5s:0.3, J7s+, J6s:0.3, T7s+, T6s:0.2, 96s+, 95s:0.05, 85s+, ' +
        '75s+, 74s:0.3, 64s:0.8, 65s, 53s:0.6, 54s, 43s:0.35, ATo+, A9o:0.55, A8o:0.3, A5o:0.2, KJo+, KTo:0.7, K9o:0.15, QJo, ' +
        'QTo:0.5, JTo:0.6, J9o:0.1, T9o:0.25',
    },
  },
  {
    hero: 'SB',
    opener: 'CO',
    callers: ['BTN'],
    s: {
      raise:
        'QQ+, JJ:0.8, TT:0.5, 99:0.25, 88:0.1, AKs, AKo, AQs, AQo:0.7, AJs:0.65, ATs:0.4, A9s:0.1, A5s:0.6, A4s:0.5, A3s:0.3, A2s:0.15, ' +
        'KQs:0.75, KJs:0.5, KTs:0.3, K9s:0.1, QJs:0.4, QTs:0.2, JTs:0.3, T9s:0.15, 98s:0.05, 76s:0.05, AJo:0.3, KQo:0.35, KJo:0.05',
      call: 'JJ, TT, 99:0.5, 88:0.45, 77:0.4, 66:0.3, 55:0.2, 44:0.1, AJs, ATs:0.45, KQs, QJs:0.3, JTs:0.35, T9s:0.3, 98s:0.25, 87s:0.15, 76s:0.1',
    },
  },
  {
    hero: 'BTN',
    opener: 'HJ',
    callers: ['CO'],
    s: {
      raise:
        'QQ+, JJ:0.75, TT:0.35, 99:0.1, AKs, AKo, AQs:0.85, AQo:0.5, AJs:0.5, ATs:0.25, A5s:0.55, A4s:0.45, A3s:0.25, A2s:0.1, KQs:0.55, ' +
        'KJs:0.35, KTs:0.15, QJs:0.2, JTs:0.1, AJo:0.1, KQo:0.15',
      call:
        'JJ, TT, 99, 88, 77:0.9, 66:0.8, 55:0.65, 44:0.5, 33:0.4, 22:0.35, AQs, AJs, ATs, A9s:0.45, A8s:0.15, A5s:0.3, A4s:0.2, KQs, ' +
        'KJs, KTs:0.75, K9s:0.2, QJs, QTs:0.65, Q9s:0.15, JTs, J9s:0.35, T9s:0.8, T8s:0.15, 98s:0.65, 87s:0.55, 76s:0.45, 65s:0.4, ' +
        '54s:0.25, AQo:0.5, AJo:0.3, KQo:0.35',
    },
  },
  {
    hero: 'BB',
    opener: 'HJ',
    callers: ['CO', 'BTN', 'SB'],
    s: {
      raise:
        'QQ+, JJ:0.6, TT:0.25, AKs, AKo, AQs:0.8, AQo:0.35, AJs:0.35, ATs:0.15, A5s:0.5, A4s:0.4, A3s:0.2, KQs:0.4, KJs:0.25, KTs:0.1, ' +
        'QJs:0.1, 76s:0.1, 65s:0.1, 54s:0.05, KQo:0.1',
      call:
        '22-JJ, A2s+, K6s+, K5s:0.5, K4s:0.3, K3s:0.15, Q8s+, Q7s:0.35, Q6s:0.15, J8s+, J7s:0.2, T7s+, 96s+, 86s+, 85s:0.3, 75s+, ' +
        '64s:0.6, 65s, 53s:0.4, 54s, 43s:0.15, AJo+, ATo:0.75, A9o:0.3, A5o:0.1, KJo+, KTo:0.45, QJo:0.75, QTo:0.25, JTo:0.4, T9o:0.1',
    },
  },
  {
    hero: 'BB',
    opener: 'UTG',
    callers: ['UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
    s: {
      raise: 'KK+, QQ:0.8, JJ:0.2, AKs, AKo:0.9, AQs:0.4, A5s:0.4, A4s:0.25, KQs:0.15',
      call:
        '22-QQ, A2s+, AKo, AQo, AJo:0.6, ATo:0.1, K8s+, K7s:0.3, K6s:0.15, Q9s+, Q8s:0.25, J9s+, J8s:0.2, T8s+, 97s+, 86s+, 75s+, ' +
        '64s:0.6, 65s, 53s:0.3, 54s, KQo, KJo:0.25, QJo:0.15',
    },
  },
  {
    hero: 'BTN',
    opener: 'LJ',
    callers: ['HJ', 'CO'],
    s: {
      raise:
        'QQ+, JJ:0.6, TT:0.2, AKs, AKo, AQs:0.75, AQo:0.35, AJs:0.35, ATs:0.1, A5s:0.45, A4s:0.35, A3s:0.15, KQs:0.4, KJs:0.2, QJs:0.1, KQo:0.05',
      call:
        'JJ, TT, 99, 88:0.9, 77:0.75, 66:0.6, 55:0.5, 44:0.35, 33:0.25, 22:0.2, AQs, AJs, ATs:0.85, A9s:0.25, A5s:0.25, A4s:0.15, KQs, ' +
        'KJs:0.9, KTs:0.55, QJs:0.85, QTs:0.45, JTs:0.85, J9s:0.15, T9s:0.65, 98s:0.5, 87s:0.4, 76s:0.35, 65s:0.3, 54s:0.15, ' +
        'AQo:0.45, AJo:0.15, KQo:0.2',
    },
  },
];

interface VsSqueeze {
  hero: Position;
  callers: Position[];
  squeezers: Position[];
  s: Strategy;
}

export const VS_SQUEEZES: VsSqueeze[] = [
  {
    hero: 'CO',
    callers: ['BTN'],
    squeezers: ['SB', 'BB'],
    s: {
      raise: 'KK+, QQ:0.6, JJ:0.15, AKs, AKo:0.75, AQs:0.1, A5s:0.35, A4s:0.25, A3s:0.1, K9s:0.1',
      call:
        'QQ, JJ, TT, 99:0.75, 88:0.5, 77:0.3, 66:0.15, AKo, AQs, AJs:0.85, ATs:0.45, A9s:0.1, A5s:0.2, A4s:0.1, KQs:0.85, KJs:0.5, ' +
        'KTs:0.15, QJs:0.4, JTs:0.35, T9s:0.2, 98s:0.1, AQo:0.45, AJo:0.05, KQo:0.15',
    },
  },
  {
    hero: 'BTN',
    callers: ['SB'],
    squeezers: ['BB'],
    s: {
      raise: 'KK+, QQ:0.6, JJ:0.2, AKs, AKo:0.75, AQs:0.15, A5s:0.4, A4s:0.3, A3s:0.15, A2s:0.05, K9s:0.15, K8s:0.1',
      call:
        'QQ, JJ, TT, 99:0.85, 88:0.6, 77:0.4, 66:0.25, 55:0.1, AKo, AQs, AJs, ATs:0.6, A9s:0.2, A5s:0.25, A4s:0.15, KQs, KJs:0.65, ' +
        'KTs:0.3, QJs:0.55, QTs:0.2, JTs:0.5, T9s:0.35, 98s:0.2, 87s:0.1, 76s:0.05, AQo:0.55, AJo:0.15, KQo:0.25',
    },
  },
  {
    hero: 'HJ',
    callers: ['CO', 'BTN'],
    squeezers: ['SB', 'BB'],
    s: {
      raise: 'KK+, QQ:0.55, JJ:0.1, AKs, AKo:0.7, AQs:0.05, A5s:0.3, A4s:0.2, A3s:0.05',
      call:
        'QQ, JJ, TT, 99:0.7, 88:0.45, 77:0.25, 66:0.1, AKo, AQs, AJs:0.8, ATs:0.35, A5s:0.2, A4s:0.1, KQs:0.8, KJs:0.45, KTs:0.1, ' +
        'QJs:0.35, JTs:0.3, T9s:0.15, 98s:0.05, AQo:0.4, KQo:0.1',
    },
  },
];

const callWords = (callers: Position[]) => (callers.length === 1 ? `${callers[0]} calls` : `${seatGroup(callers)} calls`);

export function squeeze(tableSize: number, q: Squeeze): ChartSpec | undefined {
  const hero = seatAt(q.hero, tableSize);
  const opener = seatAt(q.opener, tableSize);
  const callers = q.callers.map((c) => seatAt(c, tableSize)).filter((c): c is Position => !!c);
  if (!hero || !opener || callers.length === 0) return undefined;
  const size = isBlind(q.hero) ? 13 : 10;
  const anyCaller = callers.length > 2;
  return {
    id: `${tableSize}max-100-${slug(hero)}-squeeze-vs-${slug(opener)}-${anyCaller ? 'call' : groupSlug(callers)}`,
    title: anyCaller ? `${hero} vs ${opener} open and a call` : `${hero} vs ${opener} open and ${seatGroup(callers)} call`,
    ...starter(tableSize),
    hero,
    versus: `${opener} opens 2.5bb. ${anyCaller ? 'One player calls' : callWords(callers)}.`,
    villains: [opener],
    caller: callers,
    spot: 'squeeze',
    note: isBlind(q.hero)
      ? 'With two players in, squeeze tighter than a 3bet and bigger. The big blind still calls wide at this price.'
      : 'With two players in, squeeze tighter than a 3bet and bigger. Flat hands that play well in a multiway pot.',
    actions: actions('3bet', `Squeeze ${size}bb`, q.s),
  };
}

export function vsSqueeze(tableSize: number, q: VsSqueeze): ChartSpec | undefined {
  const hero = seatAt(q.hero, tableSize);
  const callers = q.callers.map((c) => seatAt(c, tableSize)).filter((c): c is Position => !!c);
  const squeezers = q.squeezers.map((c) => seatAt(c, tableSize)).filter((c): c is Position => !!c);
  if (!hero || callers.length === 0 || squeezers.length === 0) return undefined;
  return {
    id: `${tableSize}max-100-${slug(hero)}-vs-squeeze-${groupSlug(callers)}`,
    title: `${hero} open vs squeeze`,
    ...starter(tableSize),
    hero,
    versus: `You open 2.5bb. ${callWords(callers)}. ${seatGroup(squeezers)} squeezes to 13bb.`,
    villains: squeezers,
    caller: callers,
    spot: 'vs-squeeze',
    note: 'Only hands you open can be here. The caller still acts behind you, so continue tighter than against a plain 3bet.',
    reach: rfiRange(q.hero),
    actions: actions('4bet', '4bet 30bb', q.s),
  };
}

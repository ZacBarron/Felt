import type { ChartSpec, Position } from '@felt/core';
import { actions, isBlind, seatAt, slug, starter, type Strategy } from './common';
import { defenseStrategy, defenseThreeBet } from './vsOpen';

/**
 * Facing a 4bet after 3betting: 5bet all in, call or fold. 100bb. Hand
 * written to match the shape of published solver results. Only hands that
 * 3bet in the matching defense chart can be here. The value part of the
 * range continues and the bluffs fold. With about 75bb behind, a 5bet is all
 * in, and some of the strongest hands call to keep the 4bettor's bluffs in.
 */

interface Pairing {
  hero: Position;
  opener: Position;
  s: Strategy;
}

/** The common pairings, as 9-handed seats: hero 3bet the opener, who 4bet. */
export const VS_FOURBET: Pairing[] = [
  {
    hero: 'BB',
    opener: 'BTN',
    s: {
      raise: 'AA:0.75, KK:0.85, QQ:0.35, AKs:0.6, AKo:0.45, A5s:0.15, A4s:0.1, A3s:0.05',
      call: 'AA, KK, QQ, JJ:0.9, TT:0.6, 99:0.2, AKs, AKo, AQs:0.8, AQo:0.3, AJs:0.4, ATs:0.15, KQs:0.3, KJs:0.1, A5s:0.25, A4s:0.15',
    },
  },
  {
    hero: 'SB',
    opener: 'BTN',
    s: {
      raise: 'AA:0.8, KK:0.9, QQ:0.5, JJ:0.15, AKs:0.7, AKo:0.6, A5s:0.15, A4s:0.1, A3s:0.05',
      call: 'AA, KK, QQ, JJ:0.75, TT:0.45, 99:0.15, AKs, AKo, AQs:0.7, AQo:0.25, AJs:0.35, ATs:0.1, KQs:0.3, KJs:0.1, A5s:0.2, A4s:0.1',
    },
  },
  {
    hero: 'BB',
    opener: 'CO',
    s: {
      raise: 'AA:0.75, KK:0.9, QQ:0.4, AKs:0.65, AKo:0.5, A5s:0.15, A4s:0.1',
      call: 'AA, KK, QQ, JJ:0.85, TT:0.5, 99:0.1, AKs, AKo, AQs:0.75, AQo:0.25, AJs:0.3, KQs:0.25, A5s:0.2, A4s:0.1',
    },
  },
  {
    hero: 'SB',
    opener: 'CO',
    s: {
      raise: 'AA:0.8, KK:0.9, QQ:0.45, JJ:0.1, AKs:0.7, AKo:0.55, A5s:0.15, A4s:0.1',
      call: 'AA, KK, QQ, JJ:0.75, TT:0.4, 99:0.1, AKs, AKo, AQs:0.7, AQo:0.2, AJs:0.3, KQs:0.25, A5s:0.15',
    },
  },
  {
    hero: 'BTN',
    opener: 'CO',
    s: {
      raise: 'AA:0.6, KK:0.75, QQ:0.3, AKs:0.5, AKo:0.4, A5s:0.1, A4s:0.05',
      call:
        'AA, KK, QQ, JJ, TT:0.75, AKs, AKo, AQs:0.85, AQo:0.35, AJs:0.5, ATs:0.15, KQs:0.45, KJs:0.15, A5s:0.3, A4s:0.2, A3s:0.05',
    },
  },
  {
    hero: 'CO',
    opener: 'HJ',
    s: {
      raise: 'AA:0.6, KK:0.75, QQ:0.35, AKs:0.55, AKo:0.45, A5s:0.1, A4s:0.05',
      call: 'AA, KK, QQ, JJ:0.9, TT:0.45, 99:0.1, AKs, AKo, AQs:0.7, AQo:0.15, AJs:0.3, KQs:0.25, A5s:0.2, A4s:0.1',
    },
  },
  {
    hero: 'BB',
    opener: 'SB',
    s: {
      raise: 'AA:0.6, KK:0.75, QQ:0.4, JJ:0.15, AKs:0.6, AKo:0.5, A5s:0.15, A4s:0.1, A3s:0.05',
      call:
        'AA, KK, QQ, JJ, TT:0.75, 99:0.4, 88:0.15, AKs, AKo, AQs, AQo:0.5, AJs:0.6, AJo:0.15, ATs:0.3, KQs:0.55, KJs:0.25, KTs:0.1, ' +
        'QJs:0.15, A5s:0.3, A4s:0.2, A3s:0.1',
    },
  },
  {
    hero: 'BB',
    opener: 'LJ',
    s: {
      raise: 'AA:0.8, KK:0.95, QQ:0.4, AKs:0.6, AKo:0.45, A5s:0.1, A4s:0.05',
      call: 'AA, KK, QQ, JJ:0.8, TT:0.4, AKs, AKo, AQs:0.6, AQo:0.15, AJs:0.2, KQs:0.15, A5s:0.15',
    },
  },
  {
    hero: 'BTN',
    opener: 'LJ',
    s: {
      raise: 'AA:0.6, KK:0.8, QQ:0.35, AKs:0.5, AKo:0.4, A5s:0.05',
      call: 'AA, KK, QQ, JJ:0.95, TT:0.6, 99:0.2, AKs, AKo, AQs:0.75, AQo:0.25, AJs:0.35, KQs:0.3, A5s:0.2, A4s:0.1',
    },
  },
  {
    hero: 'BB',
    opener: 'UTG',
    s: {
      raise: 'AA:0.8, KK:0.95, QQ:0.3, AKs:0.55, AKo:0.4',
      call: 'AA, KK, QQ:0.85, AKs, AKo, AQs:0.4, A5s:0.1',
    },
  },
];

/** The 4bet hero faces, in big blinds: 24bb from a player in position on a blind, 22bb otherwise. */
export function fourBetFaced(hero9: Position, opener9: Position): number {
  return isBlind(hero9) && !isBlind(opener9) ? 24 : 22;
}

export function vsFourBet(tableSize: number, p: Pairing): ChartSpec | undefined {
  const hero = seatAt(p.hero, tableSize);
  const opener = seatAt(p.opener, tableSize);
  if (!hero || !opener) return undefined;
  const threeBet = defenseThreeBet(p.hero, p.opener);
  return {
    id: `${tableSize}max-100-${slug(hero)}-vs-${slug(opener)}-4bet`,
    title: `${hero} 3bet vs ${opener} 4bet`,
    ...starter(tableSize),
    hero,
    versus: `${opener} opens. You 3bet to ${threeBet}bb. ${opener} 4bets to ${fourBetFaced(p.hero, p.opener)}bb.`,
    villains: [opener],
    spot: 'vs-4bet',
    note: 'Only hands that 3bet in the matching chart can be here. Bluffs fold. The strongest hands sometimes call to keep bluffs in.',
    reach: defenseStrategy(p.hero, p.opener).raise,
    actions: actions('allin', '5bet all in', p.s),
  };
}

import type { ChartActionSpec, ChartSpec, Position } from '@felt/core';

/**
 * Shared pieces for the chart library. Seat ranges are written once for the
 * 9-handed table. A 6-max table plays like the last six seats of a full ring
 * (the same players behind each seat), so 6-max charts reuse the 9-handed
 * ranges with UTG standing in for LJ.
 */

export const NINE: Position[] = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const SIX: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

/** The 9-handed seat a 6-max seat plays like. */
export const as9 = (seat: Position, tableSize: number): Position => (tableSize === 6 && seat === 'UTG' ? 'LJ' : seat);
/** The seat name at a table size for a 9-handed seat, or undefined when the seat does not exist there. */
export function seatAt(seat9: Position, tableSize: number): Position | undefined {
  if (tableSize === 9) return seat9;
  if (seat9 === 'LJ') return 'UTG';
  return SIX.includes(seat9) && seat9 !== 'UTG' ? seat9 : undefined;
}

/** "UTG+1" to "utgp1", for ids. */
export const slug = (seat: Position) => seat.toLowerCase().replace('+', 'p');

export const isBlind = (seat: Position) => seat === 'SB' || seat === 'BB';

/** Words for a group of seats: "BTN", "HJ or CO", "UTG+1 to CO", "the blinds". */
export function seatGroup(seats: readonly Position[]): string {
  if (seats.length === 1) return seats[0];
  if (seats.length === 2 && seats.every(isBlind)) return 'SB or BB';
  if (seats.length === 2) return `${seats[0]} or ${seats[1]}`;
  return `${seats[0]} to ${seats[seats.length - 1]}`;
}

/** Ids for a group of seats: "btn", "hj-co", "utgp1-co", "blinds". */
export function groupSlug(seats: readonly Position[]): string {
  if (seats.length === 2 && seats.every(isBlind)) return 'blinds';
  if (seats.length === 1) return slug(seats[0]);
  return `${slug(seats[0])}-${slug(seats[seats.length - 1])}`;
}

/** A 3bet or squeeze size in big blinds: 3 times the open in position, about 4.4 times from the blinds, plus the open again per caller. */
export function threeBetSize(open: number, heroInPosition: boolean, callers = 0): number {
  const raw = open * (heroInPosition ? 3 : 4.4) + open * callers;
  return Math.round(raw * 2) / 2;
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
export const bb = (n: number) => `${trim(n)}bb`;

type Common = Pick<ChartSpec, 'game' | 'tableSize' | 'stackBb' | 'basis' | 'source' | 'openBb'>;

/** The fields every 100bb starter chart shares. */
export function starter(tableSize: number): Common {
  return { game: 'cash', tableSize, stackBb: 100, basis: 'gto', source: 'starter-approx', openBb: 2.5 };
}

export interface Strategy {
  /** The raise action, listed first: it takes its share before the flat. */
  raise: string;
  /** The flat, which takes what is left of its share. */
  call?: string;
}

/** Actions for a raise or call chart, in priority order. */
export function actions(raiseId: string, raiseLabel: string, s: Strategy, callLabel = 'Call'): ChartActionSpec[] {
  return [{ id: raiseId, label: raiseLabel, range: s.raise }, ...(s.call ? [{ id: 'call', label: callLabel, range: s.call }] : [])];
}

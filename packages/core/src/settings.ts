/**
 * Game settings: format, table size, stakes and rake. Every chart, drill and
 * stat is filtered or converted through these, so one app covers a live 1/3
 * full ring game, online 6-max and tournaments.
 */

export type GameFormat = 'cash' | 'mtt';
export type Venue = 'live' | 'online';
export type Position = string;

export interface Stakes {
  sb: number;
  bb: number;
  /** Optional straddle amount in money. Live games often have one. */
  straddle?: number;
  /** Total ante per hand in money, e.g. a tournament big blind ante. */
  ante?: number;
  currency: string;
}

export interface Rake {
  /** Share of the pot taken, e.g. 0.1 for 10%. */
  percent: number;
  /** Cap in money; 0 means no cap. */
  cap: number;
  /** Extra fixed drop per pot (jackpot, promo), in money. */
  dropExtra: number;
  noFlopNoDrop: boolean;
}

export interface GameSettings {
  format: GameFormat;
  venue: Venue;
  /** Seats dealt in, 2 to 10. */
  tableSize: number;
  stakes: Stakes;
  /** Typical effective stack in big blinds. */
  stackBb: number;
  rake: Rake;
  /** How amounts are shown. Engine math always runs in big blinds. */
  units: 'bb' | 'money';
  /**
   * Your standard first raise in big blinds, before adding for limpers.
   * Missing means the size the charts assume. Live games often open to 4bb
   * or more, which is an exploit against players who call too much.
   */
  openBb?: number;
}

/** The open size Aced's preflop charts assume. */
export const CHART_OPEN_BB = 2.5;
export const MIN_OPEN_BB = 2;
export const MAX_OPEN_BB = 8;

/** Your standard open in big blinds, before adding 1bb for each limper. */
export function openSize(g: GameSettings): number {
  return g.openBb ?? CHART_OPEN_BB;
}

/** Same game, ignoring personal habits such as the open size. Presets compare by this. */
export function sameGame(a: GameSettings, b: GameSettings): boolean {
  const strip = ({ openBb: _open, ...rest }: GameSettings) => rest;
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

export const MIN_TABLE_SIZE = 2;
export const MAX_TABLE_SIZE = 10;

/**
 * Seat names in preflop action order. Late seats keep fixed names counted back
 * from the button (LJ, HJ, CO, BTN, SB, BB); extra early seats are UTG, UTG+1, ...
 * Six handed, the first seat is called UTG rather than LJ.
 */
export function positionsFor(tableSize: number): Position[] {
  if (!Number.isInteger(tableSize) || tableSize < MIN_TABLE_SIZE || tableSize > MAX_TABLE_SIZE) {
    throw new Error(`Table size must be ${MIN_TABLE_SIZE} to ${MAX_TABLE_SIZE}`);
  }
  if (tableSize === 2) return ['BTN', 'BB'];
  const late = ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  if (tableSize < 6) return late.slice(6 - tableSize);
  if (tableSize === 6) return ['UTG', ...late.slice(1)];
  const early = Array.from({ length: tableSize - 6 }, (_, i) => (i === 0 ? 'UTG' : `UTG+${i}`));
  return [...early, ...late];
}

/** Rake taken from a pot, in money. */
export function rakeFor(pot: number, rake: Rake, sawFlop = true): number {
  if (rake.noFlopNoDrop && !sawFlop) return 0;
  const percentPart = pot * rake.percent;
  const capped = rake.cap > 0 ? Math.min(percentPart, rake.cap) : percentPart;
  return capped + rake.dropExtra;
}

export function bbToMoney(bb: number, stakes: Stakes): number {
  return bb * stakes.bb;
}

export function moneyToBb(amount: number, stakes: Stakes): number {
  return amount / stakes.bb;
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, ''));

/** Formats an amount held in big blinds according to the chosen units. */
export function formatAmount(bb: number, settings: Pick<GameSettings, 'units' | 'stakes'>): string {
  const sign = bb < 0 ? '-' : '';
  if (settings.units === 'money') {
    const amount = trim(bbToMoney(Math.abs(bb), settings.stakes));
    return settings.stakes.currency === 'USD' ? `${sign}$${amount}` : `${sign}${amount} ${settings.stakes.currency}`;
  }
  return `${sign}${trim(Math.abs(bb))}bb`;
}

export function stakesLabel(stakes: Stakes): string {
  const base = `${trim(stakes.sb)}/${trim(stakes.bb)}`;
  return stakes.straddle ? `${base}/${trim(stakes.straddle)}` : base;
}

export const PRESETS: Record<string, { label: string; settings: GameSettings }> = {
  'live-1-2': {
    label: 'Live 1/2, 9-handed',
    settings: {
      format: 'cash',
      venue: 'live',
      tableSize: 9,
      stakes: { sb: 1, bb: 2, currency: 'USD' },
      stackBb: 100,
      rake: { percent: 0.1, cap: 5, dropExtra: 1, noFlopNoDrop: true },
      units: 'money',
    },
  },
  'live-1-3': {
    label: 'Live 1/3, 9-handed',
    settings: {
      format: 'cash',
      venue: 'live',
      tableSize: 9,
      stakes: { sb: 1, bb: 3, currency: 'USD' },
      stackBb: 100,
      rake: { percent: 0.1, cap: 5, dropExtra: 1, noFlopNoDrop: true },
      units: 'money',
    },
  },
  'live-2-5': {
    label: 'Live 2/5, 9-handed',
    settings: {
      format: 'cash',
      venue: 'live',
      tableSize: 9,
      stakes: { sb: 2, bb: 5, currency: 'USD' },
      stackBb: 150,
      rake: { percent: 0.1, cap: 6, dropExtra: 1, noFlopNoDrop: true },
      units: 'money',
    },
  },
  'online-6max': {
    label: 'Online 6-max, 100bb',
    settings: {
      format: 'cash',
      venue: 'online',
      tableSize: 6,
      stakes: { sb: 0.25, bb: 0.5, currency: 'USD' },
      stackBb: 100,
      rake: { percent: 0.05, cap: 1.5, dropExtra: 0, noFlopNoDrop: true },
      units: 'bb',
    },
  },
  'mtt-9max': {
    label: 'Tournament, 9-handed',
    settings: {
      format: 'mtt',
      venue: 'live',
      tableSize: 9,
      stakes: { sb: 100, bb: 200, ante: 200, currency: 'chips' },
      stackBb: 40,
      rake: { percent: 0, cap: 0, dropExtra: 0, noFlopNoDrop: true },
      units: 'bb',
    },
  },
};

export const DEFAULT_SETTINGS: GameSettings = PRESETS['live-1-2'].settings;

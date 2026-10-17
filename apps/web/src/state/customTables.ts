import { LINEUP_TYPES, lineupBots, type LineupType } from '@felt/content';
import type { Rng } from '@felt/core';
import { useSyncExternalStore } from 'react';
import type { LobbyTable } from './playTable';

/**
 * Tables the player builds in the Play lobby: seats, stakes, buy in, who
 * sits there and how big the bots open. Saved on this device only.
 */

export interface CustomTable {
  id: string;
  name: string;
  /** 2 to 9, the player included. */
  seats: number;
  /** An id in `STAKES`. */
  stakes: string;
  /** Buy in range in big blinds. */
  buyInMin: number;
  buyInMax: number;
  /** A player type per bot seat, so seats minus 1 of them. */
  lineup: LineupType[];
  /** The bots' open size in big blinds. */
  openBb: number;
  /** The player after the big blind posts 2bb. Needs 3 or more seats. */
  straddle: boolean;
}

export interface Stakes {
  id: string;
  label: string;
  /** Small blind as a share of the big blind. */
  sb: number;
  /** The big blind in dollars, when the stakes have a money value. */
  bigBlind?: number;
}

export const STAKES: Stakes[] = [
  { id: 'bb', label: '0.5/1bb', sb: 0.5 },
  { id: '1-2', label: '$1/$2', sb: 0.5, bigBlind: 2 },
  { id: '1-3', label: '$1/$3', sb: 1 / 3, bigBlind: 3 },
  { id: '2-5', label: '$2/$5', sb: 0.4, bigBlind: 5 },
  { id: '5-10', label: '$5/$10', sb: 0.5, bigBlind: 10 },
];

/** The bots' open size: online 2.5bb, live 4 or 5bb. */
export const OPEN_SIZES = [2.5, 4, 5] as const;
export const SEATS = { min: 2, max: 9 };
export const BUY_IN = { min: 20, max: 400, step: 10 };
export const NAME_MAX = 24;

export const stakesOf = (id: string) => STAKES.find((s) => s.id === id) ?? STAKES[0];

/** Dollars for an amount in big blinds at these stakes, when they have a money value. */
export function money(stakes: { bigBlind?: number }, bb: number): string | undefined {
  if (!stakes.bigBlind) return undefined;
  const v = bb * stakes.bigBlind;
  return `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

/**
 * How a live room tends to fill: more loose and passive players than
 * regulars, and the odd maniac. Weights per type for Mix.
 */
const MIX_WEIGHTS: Record<LineupType, number> = {
  'calling-station': 3,
  'loose-passive': 3,
  nit: 2,
  'weak-tight-reg': 2,
  'tag-reg': 2,
  'lag-reg': 1,
  maniac: 1,
};

/** A mixed lineup of `n` bots, sampled by how a room tends to fill. Sorted by type so the picker reads cleanly. */
export function mixLineup(n: number, rng: Rng): LineupType[] {
  const total = LINEUP_TYPES.reduce((s, t) => s + MIX_WEIGHTS[t], 0);
  const out: LineupType[] = [];
  for (let i = 0; i < n; i++) {
    let r = rng() * total;
    const pick = LINEUP_TYPES.find((t) => (r -= MIX_WEIGHTS[t]) < 0) ?? LINEUP_TYPES[0];
    out.push(pick);
  }
  return out.sort((a, b) => LINEUP_TYPES.indexOf(a) - LINEUP_TYPES.indexOf(b));
}

/** How many bots of each type a lineup has. */
export function lineupCounts(lineup: readonly LineupType[]): Record<LineupType, number> {
  const counts = Object.fromEntries(LINEUP_TYPES.map((t) => [t, 0])) as Record<LineupType, number>;
  for (const t of lineup) counts[t]++;
  return counts;
}

/** Fits a lineup to a new seat count: extra bots leave from the end, new seats are filled by Mix. */
export function fitLineup(lineup: readonly LineupType[], seats: number, rng: Rng): LineupType[] {
  const want = Math.max(0, seats - 1);
  if (lineup.length >= want) return lineup.slice(0, want);
  return [...lineup, ...mixLineup(want - lineup.length, rng)].sort((a, b) => LINEUP_TYPES.indexOf(a) - LINEUP_TYPES.indexOf(b));
}

export type TableField = 'name' | 'seats' | 'stakes' | 'buyIn' | 'lineup' | 'openBb' | 'straddle';

export interface TableProblem {
  field: TableField;
  message: string;
}

/** Every problem with a table, in the order the form shows its fields. Empty when it can be saved. */
export function validateTable(t: CustomTable): TableProblem[] {
  const out: TableProblem[] = [];
  const name = t.name.trim();
  if (!name) out.push({ field: 'name', message: 'Give the table a name.' });
  else if (name.length > NAME_MAX) out.push({ field: 'name', message: `Use ${NAME_MAX} characters or fewer for the name.` });
  if (!Number.isInteger(t.seats) || t.seats < SEATS.min || t.seats > SEATS.max) out.push({ field: 'seats', message: 'A table seats 2 to 9 players.' });
  if (!STAKES.some((s) => s.id === t.stakes)) out.push({ field: 'stakes', message: 'Pick the stakes.' });
  const inRange = (x: number) => Number.isFinite(x) && x >= BUY_IN.min && x <= BUY_IN.max;
  if (!inRange(t.buyInMin) || !inRange(t.buyInMax)) out.push({ field: 'buyIn', message: `Buy ins run from ${BUY_IN.min} to ${BUY_IN.max}bb.` });
  else if (t.buyInMin > t.buyInMax) out.push({ field: 'buyIn', message: 'The smallest buy in is bigger than the largest.' });
  const empty = t.seats - 1 - t.lineup.length;
  if (t.lineup.some((x) => !LINEUP_TYPES.includes(x))) out.push({ field: 'lineup', message: 'A bot has a player type Aced does not know.' });
  else if (empty > 0) out.push({ field: 'lineup', message: `${empty === 1 ? '1 seat is' : `${empty} seats are`} empty. Add bots or tap Mix.` });
  else if (empty < 0) out.push({ field: 'lineup', message: `There are ${-empty} more bots than seats. Remove some.` });
  if (!OPEN_SIZES.includes(t.openBb as (typeof OPEN_SIZES)[number])) out.push({ field: 'openBb', message: 'Pick an open size of 2.5, 4 or 5bb.' });
  if (t.straddle && t.seats < 3) out.push({ field: 'straddle', message: 'Heads up has no straddle.' });
  return out;
}

/** A fresh table for the create form. */
export function newTable(rng: Rng): CustomTable {
  return { id: '', name: '', seats: 6, stakes: '1-2', buyInMin: 50, buyInMax: 150, lineup: mixLineup(5, rng), openBb: 4, straddle: false };
}

const roundTo = (x: number, step: number) => Math.round(x / step) * step;

/** Short words on what the table is, for the lobby. */
export function tableBlurb(t: CustomTable): string {
  const stakes = stakesOf(t.stakes);
  return `${stakes.label}${t.straddle ? ' with a straddle' : ''}. Bots open ${t.openBb}bb.`;
}

/** The table as the lobby and the session use it. */
export function toLobbyTable(t: CustomTable): LobbyTable {
  const stakes = stakesOf(t.stakes);
  const mid = Math.min(t.buyInMax, Math.max(t.buyInMin, roundTo((t.buyInMin + t.buyInMax) / 2, 10)));
  return {
    id: t.id,
    name: t.name.trim(),
    preset: 'custom',
    seats: t.seats,
    buyIns: [t.buyInMin, mid, t.buyInMax],
    blurb: tableBlurb(t),
    bots: lineupBots(t.lineup),
    openBb: t.openBb,
    sb: stakes.sb,
    straddle: t.straddle && t.seats >= 3 ? 2 : 0,
    stakes: { label: stakes.label, bigBlind: stakes.bigBlind },
    custom: true,
  };
}

// Saved on this device ---------------------------------------------------------------

const KEY = 'felt.play.tables.v1';
/** A player keeps a handful of tables, not a library. */
export const MAX_TABLES = 20;

function read(): CustomTable[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as CustomTable[]) : [];
    // Drop anything a later version or a bad edit left broken.
    return Array.isArray(list) ? list.filter((t) => t && typeof t.id === 'string' && t.id && Array.isArray(t.lineup) && validateTable(t).length === 0) : [];
  } catch {
    return [];
  }
}

let tables: CustomTable[] | undefined;
const listeners = new Set<() => void>();

export function customTables(): CustomTable[] {
  if (!tables) tables = read();
  return tables;
}

function store(next: CustomTable[]) {
  tables = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: the tables last for this visit.
  }
  for (const l of listeners) l();
}

/** Saves a new or edited table and returns it with its id. Throws on a table that does not validate. */
export function saveCustomTable(t: CustomTable): CustomTable {
  const problems = validateTable(t);
  if (problems.length) throw new Error(problems[0].message);
  const list = customTables();
  const saved: CustomTable = { ...t, name: t.name.trim(), id: t.id || `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}` };
  const exists = list.some((x) => x.id === saved.id);
  if (!exists && list.length >= MAX_TABLES) throw new Error(`You can keep up to ${MAX_TABLES} tables. Delete one first.`);
  store(exists ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved]);
  return saved;
}

export function deleteCustomTable(id: string) {
  store(customTables().filter((t) => t.id !== id));
}

export const customTableById = (id: string) => customTables().find((t) => t.id === id);

/** Forgets the cached list, for tests and after a restore. */
export function reloadCustomTables() {
  tables = undefined;
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCustomTables(): CustomTable[] {
  return useSyncExternalStore(subscribe, customTables);
}

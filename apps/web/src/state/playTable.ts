import { BOTS, TABLE_PRESETS } from '@felt/content';
import type { HandState, PlayDecision } from '@felt/core';
import { useSyncExternalStore } from 'react';
import type { PlayGrade } from './play';

/**
 * A seat at a Play cash table, kept outside React so a session survives
 * switching tabs. Stacks, the button and the session totals are saved on this
 * device too, so a reload sits you back down. A hand in progress is not
 * saved: after a reload the next hand starts, like a reconnect.
 */

export interface LobbyTable {
  id: string;
  name: string;
  /** Table preset in content: which bots sit here. */
  preset: string;
  seats: number;
  /** Buy in choices in bb, the middle one is the default. */
  buyIns: [number, number, number];
  blurb: string;
}

export const LOBBY: LobbyTable[] = [
  { id: 'casino-9', name: 'Casino 1/2', preset: 'casino', seats: 9, buyIns: [50, 100, 150], blurb: 'Full ring with regulars and recreational players' },
  { id: 'home-9', name: 'Home game', preset: 'home', seats: 9, buyIns: [50, 100, 150], blurb: 'Loose and passive with few bluffs' },
  { id: 'online-6', name: 'Online 6 max', preset: 'tough', seats: 6, buyIns: [40, 70, 100], blurb: 'Mostly regulars who play well' },
  { id: 'deep-6', name: 'Deep 6 max', preset: 'casino', seats: 6, buyIns: [100, 150, 200], blurb: 'Big stacks behind every hand' },
  { id: 'hu', name: 'Heads up', preset: 'tough', seats: 2, buyIns: [40, 70, 100], blurb: 'Just you and Tess' },
];

export interface TableSettings {
  /** Fold hands the chart always folds and deal the next one at once. */
  skipFolds: boolean;
  /** How long bots take: Instant, Quick or Natural, which thinks like a person. */
  speed: 'instant' | 'quick' | 'natural';
  /** Show a short line of grades after each hand. Off keeps the table quiet. */
  showGrades: boolean;
}

export interface SessionStats {
  hands: number;
  skipped: number;
  /** Net result in bb. Mostly luck over a few hundred hands. */
  net: number;
  graded: number;
  good: number;
  evLost: number;
  /** Chips added in bb, buy in included. */
  bought: number;
}

/** A finished hand, kept for the Last hand sheet. In memory only. */
export interface HandRecord {
  id: string;
  number: number;
  seed: number;
  history: PlayDecision[];
  final: HandState;
  grades?: PlayGrade[];
}

export interface TableSession {
  table: LobbyTable;
  buyIn: number;
  /** Bot id per seat, seat 0 is the player. */
  bots: string[];
  stacks: number[];
  button: number;
  settings: TableSettings;
  stats: SessionStats;
  /** Paused after the current hand, until the player is back. */
  sittingOut: boolean;
  /** Chips the player asked to add, applied before the next hand. */
  pendingChips: number;
  hands: HandRecord[];
  /** The hand on the table, in memory only. */
  live?: { id: string; seed: number; state: HandState; history: PlayDecision[]; said: Record<number, string> };
}

const KEY = 'felt.play.table.v1';
const SETTINGS_KEY = 'felt.play.settings.v1';
const DEFAULT_SETTINGS: TableSettings = { skipFolds: true, speed: 'quick', showGrades: false };

/** Older saves had normal and fast. Both move up a step: waiting on bots is no fun. */
const SPEEDS: Record<string, TableSettings['speed']> = { normal: 'quick', fast: 'instant', instant: 'instant', quick: 'quick', natural: 'natural' };
const withSpeed = (t: TableSettings): TableSettings => ({ ...t, speed: SPEEDS[t.speed] ?? 'quick' });
export const NO_STATS: SessionStats = { hands: 0, skipped: 0, net: 0, graded: 0, good: 0, evLost: 0, bought: 0 };

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode: the session still works for this visit.
  }
}

export function savedSettings(): TableSettings {
  return withSpeed({ ...DEFAULT_SETTINGS, ...read<TableSettings>(SETTINGS_KEY) });
}

function load(): TableSession | undefined {
  const saved = read<Omit<TableSession, 'hands' | 'live'>>(KEY);
  if (!saved?.table || !Array.isArray(saved.stacks)) return undefined;
  const table = LOBBY.find((t) => t.id === saved.table.id) ?? saved.table;
  return { ...saved, table, settings: withSpeed({ ...DEFAULT_SETTINGS, ...saved.settings }), hands: [] };
}

let session: TableSession | undefined = load();
/** The last session's totals, shown in the lobby after leaving. */
let lastStats: SessionStats | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (!session) return write(KEY, undefined);
  const { hands: _hands, live: _live, ...rest } = session;
  write(KEY, rest);
  write(SETTINGS_KEY, session.settings);
}

export function getSession() {
  return session;
}

export function setSession(update: (s: TableSession) => TableSession) {
  if (!session) return;
  session = update(session);
  persist();
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTableSession() {
  return useSyncExternalStore(subscribe, () => session);
}

export function useLastStats() {
  return useSyncExternalStore(subscribe, () => lastStats);
}

/** Bots start with stacks around the buy in, as at a real table. */
function botStack(buyIn: number, i: number): number {
  const spread = [1, 1.4, 0.7, 1.15, 0.85, 1.9, 1, 0.6, 1.25][i % 9];
  return Math.round(buyIn * spread);
}

/** Sits the player down at a table with a buy in. */
export function sitDown(table: LobbyTable, buyIn: number) {
  const preset = TABLE_PRESETS.find((p) => p.id === table.preset) ?? TABLE_PRESETS[0];
  const ids = [...preset.bots, ...BOTS.map((b) => b.id).filter((id) => !preset.bots.includes(id))];
  const bots = ['', ...ids.slice(0, table.seats - 1)];
  session = {
    table,
    buyIn,
    bots,
    stacks: bots.map((_, i) => (i === 0 ? buyIn : botStack(table.buyIns[1], i))),
    button: Math.floor(Math.random() * table.seats),
    settings: savedSettings(),
    stats: { ...NO_STATS, bought: buyIn },
    sittingOut: false,
    pendingChips: 0,
    hands: [],
  };
  lastStats = undefined;
  write(LAST_KEY, { id: table.id, buyIn });
  persist();
  emit();
}

const LAST_KEY = 'felt.play.last.v1';

/** The table and buy in the player last sat down with, for Play now. */
export function lastSeat(): { table: LobbyTable; buyIn: number } {
  const saved = read<{ id: string; buyIn: number }>(LAST_KEY);
  const table = LOBBY.find((t) => t.id === saved?.id) ?? LOBBY[0];
  return { table, buyIn: saved && table.buyIns.includes(saved.buyIn) ? saved.buyIn : table.buyIns[1] };
}

export function leaveTable() {
  lastStats = session?.stats.hands ? session.stats : undefined;
  session = undefined;
  persist();
  emit();
}

/** Bots that are short top up and bots that bust rebuy, as online. */
export function refillBots(stacks: number[], table: LobbyTable): number[] {
  const full = table.buyIns[1];
  return stacks.map((s, i) => (i === 0 ? s : s < full * 0.3 ? full : s));
}

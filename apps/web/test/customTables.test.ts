import { botById } from '@felt/content';
import { seededRng } from '@felt/core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  type CustomTable,
  customTables,
  deleteCustomTable,
  fitLineup,
  lineupCounts,
  MAX_TABLES,
  mixLineup,
  money,
  newTable,
  reloadCustomTables,
  saveCustomTable,
  stakesOf,
  toLobbyTable,
  validateTable,
} from '../src/state/customTables';
import { dealNext, seatsOf } from '../src/state/playFlow';
import { getSession, lastSeat, lobbyTables, sitDown } from '../src/state/playTable';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: () => null,
    length: 0,
  };
  reloadCustomTables();
});

const good = (over: Partial<CustomTable> = {}): CustomTable => ({
  id: '',
  name: 'Friday game',
  seats: 6,
  stakes: '1-3',
  buyInMin: 50,
  buyInMax: 150,
  lineup: ['calling-station', 'calling-station', 'nit', 'tag-reg', 'maniac'],
  openBb: 5,
  straddle: true,
  ...over,
});

const fields = (t: CustomTable) => validateTable(t).map((p) => p.field);

describe('validateTable', () => {
  it('accepts a sound table and a fresh one once named', () => {
    expect(validateTable(good())).toEqual([]);
    expect(fields({ ...newTable(seededRng(1)), name: 'Mine' })).toEqual([]);
  });

  it('needs a name of 1 to 24 characters', () => {
    expect(fields(good({ name: '   ' }))).toEqual(['name']);
    expect(fields(good({ name: 'x'.repeat(25) }))).toEqual(['name']);
  });

  it('seats 2 to 9 players', () => {
    expect(fields(good({ seats: 1, lineup: [] }))).toContain('seats');
    expect(fields(good({ seats: 10, lineup: Array(9).fill('nit') }))).toContain('seats');
    expect(fields(good({ seats: 6.5 }))).toContain('seats');
  });

  it('checks the stakes, buy in range and open size', () => {
    expect(fields(good({ stakes: '100-200' }))).toEqual(['stakes']);
    expect(fields(good({ buyInMin: 10 }))).toEqual(['buyIn']);
    expect(fields(good({ buyInMax: 900 }))).toEqual(['buyIn']);
    expect(fields(good({ buyInMin: 200, buyInMax: 100 }))).toEqual(['buyIn']);
    expect(fields(good({ buyInMin: Number.NaN }))).toEqual(['buyIn']);
    expect(fields(good({ openBb: 3 }))).toEqual(['openBb']);
  });

  it('fills every bot seat with a known player type', () => {
    const [empty] = validateTable(good({ lineup: ['nit', 'nit', 'nit'] }));
    expect(empty).toEqual({ field: 'lineup', message: '2 seats are empty. Add bots or tap Mix.' });
    expect(fields(good({ lineup: Array(6).fill('nit') }))).toEqual(['lineup']);
    expect(fields(good({ lineup: ['nit', 'nit', 'nit', 'nit', 'grinder' as 'nit'] }))).toEqual(['lineup']);
  });

  it('has no straddle heads up', () => {
    expect(fields(good({ seats: 2, lineup: ['nit'], straddle: true }))).toEqual(['straddle']);
    expect(fields(good({ seats: 2, lineup: ['nit'], straddle: false }))).toEqual([]);
  });

  it('writes messages in the house style', () => {
    const all = [good({ name: '' }), good({ seats: 1, lineup: [] }), good({ buyInMin: 200, buyInMax: 100 }), good({ lineup: [] }), good({ seats: 2, lineup: ['nit'] })].flatMap(validateTable);
    for (const p of all) {
      expect(p.message).toMatch(/\.$/);
      expect(p.message).not.toMatch(/[—–;!]/);
      expect(p.message.split(',').length).toBeLessThanOrEqual(2);
    }
  });
});

describe('lineups', () => {
  it('mixes the requested number of bots, the same way for the same seed', () => {
    const a = mixLineup(8, seededRng(7));
    expect(a).toHaveLength(8);
    expect(mixLineup(8, seededRng(7))).toEqual(a);
    // A mix of 40 has more than one type.
    expect(Object.values(lineupCounts(mixLineup(40, seededRng(2)))).filter((n) => n > 0).length).toBeGreaterThan(3);
  });

  it('fits a lineup to a new seat count', () => {
    const l = good().lineup;
    expect(fitLineup(l, 4, seededRng(1))).toEqual(l.slice(0, 3));
    const grown = fitLineup(l, 9, seededRng(1));
    expect(grown).toHaveLength(8);
    for (const t of l) expect(grown).toContain(t);
  });
});

describe('custom tables on the device', () => {
  it('saves, edits and deletes tables under a felt key', () => {
    const saved = saveCustomTable(good({ name: '  Friday game  ' }));
    expect(saved.id).not.toBe('');
    expect(saved.name).toBe('Friday game');
    expect(JSON.parse(store.get('felt.play.tables.v1')!)).toHaveLength(1);
    saveCustomTable({ ...saved, seats: 3, lineup: ['nit', 'maniac'] });
    reloadCustomTables();
    expect(customTables()).toHaveLength(1);
    expect(customTables()[0].seats).toBe(3);
    deleteCustomTable(saved.id);
    reloadCustomTables();
    expect(customTables()).toEqual([]);
  });

  it('refuses a table that does not validate and caps how many are kept', () => {
    expect(() => saveCustomTable(good({ name: '' }))).toThrow('Give the table a name.');
    for (let i = 0; i < MAX_TABLES; i++) saveCustomTable(good({ name: `T${i}` }));
    expect(() => saveCustomTable(good())).toThrow();
  });

  it('drops broken saves when loading', () => {
    store.set('felt.play.tables.v1', JSON.stringify([good({ id: 'a' }), { ...good({ id: 'b' }), seats: 40 }, null, 'junk']));
    reloadCustomTables();
    expect(customTables().map((t) => t.id)).toEqual(['a']);
    store.set('felt.play.tables.v1', '{not json');
    reloadCustomTables();
    expect(customTables()).toEqual([]);
  });
});

describe('a custom table at the table', () => {
  it('becomes a lobby table with its bots, blinds, straddle and money', () => {
    const t = toLobbyTable(good({ id: 'x' }));
    expect(t).toMatchObject({ id: 'x', seats: 6, buyIns: [50, 100, 150], openBb: 5, straddle: 2, custom: true });
    expect(t.sb).toBeCloseTo(1 / 3);
    expect(t.bots).toHaveLength(5);
    expect(t.bots!.map((id) => botById(id)!.type)).toEqual(good().lineup);
    expect(money(stakesOf('1-3'), 100)).toBe('$300');
    expect(money(stakesOf('bb'), 100)).toBeUndefined();
    expect(toLobbyTable(good({ seats: 2, lineup: ['nit'], straddle: true })).straddle).toBe(0);
  });

  it('seats the chosen lineup, deals with its blinds and opens to its size', () => {
    const saved = saveCustomTable(good());
    const table = lobbyTables().find((t) => t.id === saved.id)!;
    sitDown(table, 100);
    const s = getSession()!;
    expect(s.bots.slice(1)).toEqual(table.bots);
    expect(seatsOf(s).slice(1).every((seat) => seat.bot?.profile.style.openTo === 5)).toBe(true);
    let k = 1;
    const dealt = dealNext({ ...s, settings: { ...s.settings, skipFolds: false } }, () => k++);
    const posts = dealt.live!.state.log.map((a) => [a.kind, Math.round(a.amount * 100) / 100]);
    expect(posts).toEqual([
      ['sb', 0.33],
      ['bb', 1],
      ['straddle', 2],
    ]);
    // Play now remembers it.
    expect(lastSeat().table.id).toBe(saved.id);
  });
});

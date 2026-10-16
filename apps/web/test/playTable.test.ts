import { beforeEach, describe, expect, it } from 'vitest';
import { getSession, LOBBY, leaveTable, refillBots, setSession, sitDown } from '../src/state/playTable';

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
});

describe('play table session', () => {
  it('sits the player down with the buy in and bots around the table', () => {
    const table = LOBBY.find((t) => t.seats === 6)!;
    sitDown(table, table.buyIns[0]);
    const s = getSession()!;
    expect(s.stacks).toHaveLength(6);
    expect(s.stacks[0]).toBe(table.buyIns[0]);
    expect(s.bots[0]).toBe('');
    expect(new Set(s.bots.slice(1)).size).toBe(5);
    expect(s.stats.bought).toBe(table.buyIns[0]);
    // Stacks are kept on the device, so a reload sits you back down.
    expect(JSON.parse(localStorage.getItem('felt.play.table.v1')!).stacks[0]).toBe(table.buyIns[0]);
    setSession((x) => ({ ...x, stacks: x.stacks.map((v, i) => (i === 0 ? 12 : v)) }));
    expect(getSession()!.stacks[0]).toBe(12);
    leaveTable();
    expect(getSession()).toBeUndefined();
    expect(localStorage.getItem('felt.play.table.v1')).toBeNull();
  });

  it('tops up short bots and rebuys busted ones but never the player', () => {
    const table = LOBBY[0];
    const full = table.buyIns[1];
    expect(refillBots([0, 0, full * 0.2, full * 0.5, full * 2], table)).toEqual([0, full, full, full * 0.5, full * 2]);
  });
});

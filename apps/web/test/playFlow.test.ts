import { type PlayDecision, potSize, seededRng, stacksAfter } from '@felt/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { HERO, isClearFold } from '../src/state/play';
import { applyAction, botAction, dealNext, fastForward, liveRng, seatsOf } from '../src/state/playFlow';
import { DEFAULT_SETTINGS, getSession, LOBBY, sitDown, type TableSession } from '../src/state/playTable';

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

/** A fresh session at a table with the given settings. */
function seated(settings: Partial<TableSession['settings']> = {}, table = LOBBY[0]): TableSession {
  sitDown(table, table.buyIns[1]);
  return { ...getSession()!, settings: { ...DEFAULT_SETTINGS, ...settings } };
}

/** Seeds in order, so a test deals the same hands every run. */
const seeds = (start = 1) => {
  let k = start;
  return () => k++;
};

const chips = (s: TableSession) => s.stacks.reduce((a, b) => a + b, 0);

/** Plays bots on the screen's rng until the player acts or the hand ends. */
function botsUntilHero(s: TableSession): TableSession {
  const rng = liveRng(s.live!.seed);
  const seats = seatsOf(s);
  while (s.live && !s.live.state.result && s.live.state.toAct !== HERO) s = applyAction(s, botAction(s.live.state, seats, rng), rng);
  return s;
}

describe('dealNext with skip folds', () => {
  it('folds clear folds for the player and stops on a hand to play', () => {
    let s = seated({ skipFolds: true });
    const next = seeds(11);
    let skipped = 0;
    for (let i = 0; i < 20; i++) {
      const before = s;
      s = dealNext({ ...s, live: undefined }, next);
      expect(s.live).toBeDefined();
      skipped += s.justSkipped ?? 0;
      // Skipped hands count, cost their blinds and keep every chip on the table.
      expect(s.stats.skipped - before.stats.skipped).toBe(s.justSkipped);
      expect(s.hands.length).toBe(before.hands.length);
      // The hand on the table is never one the player would fold for sure.
      const ahead = botsUntilHero(s);
      if (ahead.live?.state.toAct === HERO) expect(isClearFold(ahead.live.state)).toBe(false);
      s = { ...s, live: undefined };
    }
    expect(skipped).toBeGreaterThan(5);
  });

  it('deals every hand when skip folds is off', () => {
    let s = seated({ skipFolds: false });
    const next = seeds(11);
    for (let i = 0; i < 10; i++) {
      s = { ...dealNext(s, next), live: undefined };
      expect(s.justSkipped).toBe(0);
    }
    expect(s.stats.skipped).toBe(0);
  });

  it('keeps the chips on the table through skipped hands', () => {
    const s = seated({ skipFolds: true });
    const start = chips(s);
    const after = dealNext(s, seeds(3));
    // Bots that are short top up between hands, so chips only grow by refills.
    expect(chips(after)).toBeGreaterThanOrEqual(start - 1e-6);
    expect(after.stats.net).toBeLessThanOrEqual(0);
  });

  it('replays the bots before the player the same way on screen', () => {
    // The skip test plays the bots with liveRng: the screen must reach the same spot.
    const s = dealNext(seated({ skipFolds: false }), seeds(5));
    const seen: PlayDecision[] = [];
    fastForward(s.live!.state, seen, seatsOf(s), seededRng(s.live!.seed + 1));
    const screen = botsUntilHero(s);
    expect(screen.live?.history.map((d) => d.action) ?? screen.hands.at(-1)!.history.map((d) => d.action)).toEqual(seen.map((d) => d.action));
  });
});

describe('applyAction after the player folds', () => {
  /** A dealt hand where the player faces a decision that allows a fold. */
  function facingBet(settings: Partial<TableSession['settings']>): TableSession {
    const next = seeds(100);
    let s = seated({ skipFolds: false, ...settings });
    for (let i = 0; i < 50; i++) {
      s = botsUntilHero(dealNext({ ...s, live: undefined }, next));
      if (s.live?.state.toAct === HERO && s.live.state.currentBet > s.live.state.players[HERO].street) return s;
    }
    throw new Error('No spot found');
  }

  it('plays the rest out off screen and books the whole hand by default', () => {
    const s = facingBet({ afterFold: 'next' });
    const live = s.live!;
    const after = applyAction(s, { kind: 'fold' }, liveRng(live.seed));
    expect(after.live).toBeUndefined();
    const rec = after.hands.at(-1)!;
    expect(rec.id).toBe(live.id);
    expect(rec.offScreen).toBe(true);
    expect(rec.final.result).toBeDefined();
    // The history runs to the end of the hand, the player's fold included.
    expect(rec.history.some((d) => d.state.toAct === HERO && d.action.kind === 'fold')).toBe(true);
    expect(rec.history.length).toBeGreaterThan(live.history.length);
    // Stats and stacks match the finished hand, as if the player had watched.
    expect(after.stats.hands).toBe(s.stats.hands + 1);
    expect(after.stats.net).toBeCloseTo(s.stats.net + rec.final.result!.net[HERO]);
    expect(after.stacks).toEqual(stacksAfter(rec.final));
    expect(rec.final.result!.net[HERO]).toBeCloseTo(-live.state.players[HERO].total);
    expect(after.stacks.reduce((a, b) => a + b, 0)).toBeCloseTo(s.live!.state.players.reduce((a, p) => a + p.stack, 0) + potSize(s.live!.state));
  });

  it('keeps the hand on the table when the player wants to watch', () => {
    const s = facingBet({ afterFold: 'watch' });
    const after = applyAction(s, { kind: 'fold' }, liveRng(s.live!.seed));
    if (after.live?.state.result) return; // Folding ended the hand: nothing left to watch.
    expect(after.live).toBeDefined();
    expect(after.live!.state.players[HERO].folded).toBe(true);
    expect(after.hands.length).toBe(s.hands.length);
  });

  it('books a played hand when it ends on the table', () => {
    let s = facingBet({ afterFold: 'next' });
    const rng = liveRng(s.live!.seed);
    const seats = seatsOf(s);
    // Call down: the player calls or checks every decision.
    for (let i = 0; i < 200 && s.live && !s.live.state.result; i++) {
      const st = s.live.state;
      s = applyAction(s, st.toAct === HERO ? (st.currentBet > st.players[HERO].street ? { kind: 'call' } : { kind: 'check' }) : botAction(st, seats, rng), rng);
    }
    expect(s.live?.state.result).toBeDefined();
    expect(s.hands.at(-1)!.offScreen).toBeUndefined();
  });
});

describe('table settings', () => {
  it('defaults to dealing the next hand after a fold', () => {
    expect(DEFAULT_SETTINGS.afterFold).toBe('next');
    expect(DEFAULT_SETTINGS.skipFolds).toBe(true);
  });

  it('fills in the new setting for saves made before it existed', async () => {
    store.set('felt.play.settings.v1', JSON.stringify({ skipFolds: false, speed: 'fast', showGrades: true }));
    const { savedSettings } = await import('../src/state/playTable');
    expect(savedSettings()).toEqual({ skipFolds: false, afterFold: 'next', speed: 'instant', showGrades: true });
  });

  it('uses a seeded rng for live hands', () => {
    expect(liveRng(4)()).toBe(seededRng(5)());
  });
});

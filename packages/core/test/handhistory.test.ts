import { describe, expect, it } from 'vitest';
import { assignPositions, heroStats, heroView, openDeviations, parseHand, parseHandHistories, splitHands } from '../src';
import { GG_CASH, STARS_CASH, STARS_TOURNAMENT_1, STARS_TOURNAMENT_2, STARS_TOURNAMENT_3 } from './fixtures/hands';

const ALL = [STARS_TOURNAMENT_1, STARS_TOURNAMENT_2, STARS_TOURNAMENT_3, STARS_CASH, GG_CASH];
const nets = (h: ReturnType<typeof parseHand>) =>
  h.players.reduce((s, p) => s + (h.collected[p.name] ?? 0) - (h.invested[p.name] ?? 0), 0);

describe('hand history parsing', () => {
  it('splits a file into hands, tolerating Windows line endings and a byte order mark', () => {
    const file = '﻿' + ALL.join('\r\n\r\n\r\n');
    expect(splitHands(file)).toHaveLength(5);
    const { hands, errors } = parseHandHistories(file + '\n\nPokerStars Hand #1: garbage');
    expect(hands).toHaveLength(5);
    expect(errors).toHaveLength(1);
  });

  it('conserves chips in every hand: the nets add up to minus the rake', () => {
    for (const text of ALL) {
      const h = parseHand(text);
      expect(nets(h)).toBeCloseTo(-h.rake, 6);
    }
  });

  it('reads a real PokerStars tournament hand', () => {
    const h = parseHand(STARS_TOURNAMENT_1);
    expect(h).toMatchObject({ site: 'pokerstars', id: 'pokerstars:105024000105', game: 'tournament', sb: 10, bb: 20, tableMax: 9, hero: 'W2lkm2n' });
    expect(h.players.find((p) => p.name === 'W2lkm2n')?.position).toBe('UTG+1');
    expect(h.players.find((p) => p.name === 'flettl2')?.position).toBe('BTN');
    expect(h.date).toEqual(new Date(2013, 9, 4, 13, 53, 27));
    const v = heroView(h)!;
    // Raised to 60, bet 80 that came back, won 150: up 90 chips, 4.5bb.
    expect(v.net).toBe(90);
    expect(v.netBb).toBe(4.5);
    expect(v).toMatchObject({ hand: 'AJo', vpip: true, pfr: true, openChance: true, openAction: 'raise', sawFlop: true, showdown: false });
  });

  it('handles antes, all ins, side pots and a showdown', () => {
    const h = parseHand(STARS_TOURNAMENT_2);
    expect(h.board).toHaveLength(5);
    expect(Object.keys(h.shown).sort()).toEqual(['Newfie_187', 'W2lkm2n', 'costamar']);
    expect(h.collected.costamar).toBe(26310);
    const v = heroView(h)!;
    expect(v.net).toBe(-11815);
    expect(v).toMatchObject({ position: 'BTN', hand: 'JJ', vpip: true, pfr: false, showdown: true, threeBetChance: false });
  });

  it('counts a fold to a raise, and the ante, as the hero loss', () => {
    const v = heroView(parseHand(STARS_TOURNAMENT_3))!;
    expect(v.net).toBe(-50);
    expect(v).toMatchObject({ position: 'BTN', vpip: false, openChance: false, threeBetChance: true, threeBet: false });
  });

  it('reads cash games in money, with rake', () => {
    const h = parseHand(STARS_CASH);
    expect(h).toMatchObject({ game: 'cash', sb: 0.25, bb: 0.5, currency: 'USD', rake: 0.25, tableMax: 6 });
    const v = heroView(h)!;
    expect(v.net).toBeCloseTo(2.1, 10);
    expect(v.netBb).toBeCloseTo(4.2, 10);
    expect(v).toMatchObject({ position: 'CO', hand: 'KQs', openAction: 'raise' });
  });

  it('reads the GGPoker style header and hidden cards lines', () => {
    const h = parseHand(GG_CASH);
    expect(h).toMatchObject({ site: 'ggpoker', id: 'ggpoker:RC1234567890', hero: 'Hero', rake: 0.12 });
    const v = heroView(h)!;
    expect(v).toMatchObject({ position: 'BB', hand: '72o', netBb: -1, threeBetChance: true, threeBet: false, openChance: false });
  });

  it('labels seats from the button, heads up included', () => {
    expect([...assignPositions([1, 4], 4)]).toEqual([
      [4, 'BTN'],
      [1, 'BB'],
    ]);
    expect(assignPositions([2, 3, 5, 6], 6).get(2)).toBe('SB');
  });
});

describe('hero stats and leaks', () => {
  const views = ALL.map((t) => heroView(parseHand(t))!);

  it('summarizes win rate, VPIP, PFR and 3bet', () => {
    const s = heroStats(views);
    expect(s.hands).toBe(5);
    expect(s.netBb).toBeCloseTo(4.5 - 11815 / 800 - 50 / 600 + 4.2 - 1, 6);
    expect(s.vpip).toBeCloseTo(3 / 5, 10);
    expect(s.pfr).toBeCloseTo(2 / 5, 10);
    expect(s.threeBet).toBe(0);
    expect(s.byPosition.map((p) => p.position)).toEqual(['UTG+1', 'CO', 'BTN', 'BB']);
  });

  it('flags opens that fall outside the chart, never mixed hands', () => {
    const freq = (pos: string, hand: string) => (pos === 'CO' && hand === 'KQs' ? 0.1 : pos === 'UTG+1' && hand === 'AJo' ? 0.5 : undefined);
    const d = openDeviations(views, freq);
    expect(d).toEqual([{ position: 'CO', hand: 'KQs', chartRaise: 0.1, heroAction: 'raise', kind: 'too loose', count: 1 }]);
  });
});

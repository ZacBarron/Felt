import { describe, expect, it } from 'vitest';
import { assignPositions, heroStats, heroView, openDeviations, openRates, parseHand, parseHandHistories, positionsFromBlinds, splitHands } from '../src';
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
    expect(v).toMatchObject({ position: 'BTN', hand: 'JJ', vpip: true, pfr: false, showdown: true, wonAtShowdown: false });
    // Facing a raise and a reraise: two raises, so no 3bet chance.
    expect(v.threeBetChance).toBe(false);
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

  it('counts positions back from the big blind poster, with a missing small blind', () => {
    // Seats 1 to 6, big blind posted from seat 4, no small blind: seat 3 is the button.
    const m = positionsFromBlinds([1, 2, 3, 4, 5, 6], 4, false);
    expect(m.get(4)).toBe('BB');
    expect(m.get(3)).toBe('BTN');
    expect(m.get(5)).toBe('UTG');
    expect([...m.values()]).not.toContain('SB');
    expect(positionsFromBlinds([1, 2, 3, 4, 5, 6], 4, true).get(3)).toBe('SB');
  });

  it('detects walks, mucked showdowns and straddles', () => {
    const walk = parseHand(`PokerStars Hand #1: Hold'em No Limit ($1/$3 USD) - 2026/03/14 21:05:11 ET
Table 'T' 9-max Seat #1 is the button
Seat 1: a ($300 in chips)
Seat 2: b ($300 in chips)
Seat 3: Hero ($300 in chips)
b: posts small blind $1
Hero: posts big blind $3
*** HOLE CARDS ***
Dealt to Hero [7c 2d]
a: folds
b: folds
Uncalled bet ($2) returned to Hero
Hero collected $2 from pot
*** SUMMARY ***
Total pot $2 | Rake $0`);
    const w = heroView(walk)!;
    expect(w).toMatchObject({ walk: true, vpip: false, position: 'BB' });
    expect(heroStats([w]).vpip).toBe(0);

    const muck = parseHand(`PokerStars Hand #2: Hold'em No Limit ($1/$3 USD) - 2026/03/14 21:06:11 ET
Table 'T' 9-max Seat #1 is the button
Seat 1: a ($300 in chips)
Seat 2: b ($300 in chips)
Seat 3: Hero ($300 in chips)
a: posts straddle $6
b: posts small blind $1
Hero: posts big blind $3
*** HOLE CARDS ***
Dealt to Hero [Ah 9h]
b: folds
Hero: calls $3
a: checks
*** FLOP *** [Kd 7c 2s]
Hero: checks
a: checks
*** TURN *** [Kd 7c 2s] [4h]
Hero: checks
a: checks
*** RIVER *** [Kd 7c 2s 4h] [Qs]
Hero: checks
a: checks
*** SHOW DOWN ***
a: shows [Kh Td] (a pair of Kings)
Hero: mucks hand
a collected $12 from pot
*** SUMMARY ***
Total pot $13 | Rake $1`);
    expect(muck.straddled).toBe(true);
    const m = heroView(muck)!;
    expect(m).toMatchObject({ showdown: true, wonAtShowdown: false, straddled: true, openChance: false });
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
    expect(s.wtsd).toBeCloseTo(1 / 3, 10);
    expect(s.wsd).toBe(0);
    expect(s.byPosition.map((p) => p.position)).toEqual(['UTG+1', 'CO', 'BTN', 'BB']);
  });

  it('compares only deep cash hands, by players left behind, and only near pure deviations', () => {
    // The cash hand is a 6-handed CO open: three players behind, so the 9-handed CO chart.
    const cashOnly = (seat: string, hand: string) => (seat === 'CO' && hand === 'KQs' ? 0.04 : undefined);
    expect(openDeviations(views, cashOnly)).toEqual([{ seat: 'CO', hand: 'KQs', chartRaise: 0.04, heroAction: 'raise', kind: 'too loose', count: 1 }]);
    // A 10% open is a mix, not a leak.
    expect(openDeviations(views, () => 0.1)).toEqual([]);
    // The tournament hand (AJo, UTG+1) is never compared with cash charts.
    expect(openDeviations(views, (seat) => (seat === 'UTG+1' ? 0 : undefined))).toEqual([]);
    expect(openRates(views)).toEqual([{ seat: 'CO', chances: 1, opens: 1, rate: 1, low: 1, high: 1 }]);
  });
});

describe('postflop and 3bet stats', () => {
  it('counts a flop continuation bet and postflop aggression', () => {
    const v = heroView(parseHand(STARS_CASH))!;
    expect(v.cbetChance).toBe(true);
    expect(v.cbet).toBe(true);
    expect(v.postAggressive).toBe(2);
    expect(v.postCalls).toBe(0);
    expect(v.foldTo3betChance).toBe(false);
  });

  it('counts folding to a 3bet, and no c-bet chance after losing the lead', () => {
    const threeBet = STARS_CASH.replace(
      'villain_b: folds\nvillain_c: folds\nvillain_d: calls $0.75\n*** FLOP *** [Kh 7c 2s]\nvillain_d: checks\nHero: bets $0.85\nvillain_d: calls $0.85\n*** TURN *** [Kh 7c 2s] [9d]\nvillain_d: checks\nHero: bets $2.40\nvillain_d: folds\nUncalled bet ($2.40) returned to Hero\nHero collected $4.20 from pot',
      'villain_b: raises $2.50 to $3.75\nvillain_c: folds\nvillain_d: folds\nHero: folds\nUncalled bet ($2.50) returned to villain_b\nvillain_b collected $3.25 from pot',
    );
    expect(threeBet).not.toBe(STARS_CASH);
    const v = heroView(parseHand(threeBet))!;
    expect(v.foldTo3betChance).toBe(true);
    expect(v.foldTo3bet).toBe(true);
    expect(v.cbetChance).toBe(false);
  });

  it('summarizes c-bet, fold to 3bet and aggression across hands', () => {
    const v = heroView(parseHand(STARS_CASH))!;
    const s = heroStats([v, { ...v, cbet: false, postAggressive: 0, postCalls: 2 }, { ...v, foldTo3betChance: true, foldTo3bet: false }]);
    expect(s.cbetChances).toBe(3);
    expect(s.cbet).toBeCloseTo(2 / 3);
    expect(s.foldTo3betChances).toBe(1);
    expect(s.foldTo3bet).toBe(0);
    expect(s.aggression).toBeCloseTo(4 / 2);
  });
});

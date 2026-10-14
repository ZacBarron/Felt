import { actionFrequencies, actionRange, buildChart, comboCount, positionsFor, rangePercent } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, PLAYER_TYPES, STARTER_CHARTS, TELLS } from '../src';

describe('starter charts', () => {
  it('use real seat names for their table size', () => {
    for (const spec of STARTER_CHARTS) expect(positionsFor(spec.tableSize)).toContain(spec.hero);
  });

  it('all parse and have unique ids', () => {
    const ids = new Set(STARTER_CHARTS.map((c) => c.id));
    expect(ids.size).toBe(STARTER_CHARTS.length);
    for (const spec of STARTER_CHARTS) expect(() => buildChart(spec)).not.toThrow();
  });

  it('open wider in later position', () => {
    const open = (id: string) => rangePercent(actionRange(buildChart(STARTER_CHARTS.find((c) => c.id === id)!), 'raise'));
    const order = ['utg', 'utgp1', 'utgp2', 'lj', 'hj', 'co', 'btn'].map((p) => open(`9max-100-rfi-${p}`));
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(open('6max-100-rfi-utg')).toBeLessThan(open('6max-100-rfi-hj'));
  });

  const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
  const plays = (id: string) => 1 - (actionFrequencies(chart(id)).fold ?? 0);

  it('defend the big blind wider against later openers', () => {
    expect(plays('9max-100-bb-vs-btn')).toBeGreaterThan(plays('9max-100-bb-vs-co'));
    expect(plays('9max-100-bb-vs-co')).toBeGreaterThan(plays('9max-100-bb-vs-utg'));
  });

  it('keep defense and 3bet sizes near published 100bb solutions', () => {
    const f = (id: string) => actionFrequencies(chart(id));
    expect(f('9max-100-bb-vs-btn')['3bet']).toBeGreaterThan(0.08);
    expect(f('9max-100-bb-vs-co')['3bet']).toBeGreaterThan(0.06);
    expect(f('9max-100-bb-vs-utg')['3bet']).toBeLessThan(0.05);
    expect(f('9max-100-sb-vs-btn')['3bet']).toBeGreaterThan(0.12);
    expect(f('9max-100-sb-vs-btn')['3bet']).toBeLessThan(0.2);
  });

  it('facing a 3bet, act only with hands that opened, and fold some of them', () => {
    for (const spec of STARTER_CHARTS.filter((s) => s.spot === 'vs-3bet')) {
      const c = buildChart(spec);
      expect(c.reach).toBeDefined();
      for (const [hand, mix] of c.mixes) if ((mix.fold ?? 0) < 1) expect(c.reach!.has(hand)).toBe(true);
      const reached = [...c.reach!];
      const folds = reached.filter((h) => (c.mixes.get(h)!.fold ?? 0) > 0.5).length;
      expect(folds / reached.length).toBeGreaterThan(0.3);
      // The nuts never fold.
      expect(c.mixes.get('AA')!.fold).toBeUndefined();
    }
  });

  it('match the open rates and range shares quoted in lessons', () => {
    const pct = (id: string, action: string, digits = 1) => Number(((actionFrequencies(chart(id))[action] ?? 0) * 100).toFixed(digits));
    expect(['utg', 'utgp1', 'utgp2', 'lj'].map((p) => pct(`9max-100-rfi-${p}`, 'raise'))).toEqual([11.7, 12.9, 15.3, 17.9]);
    expect(['co', 'btn', 'sb'].map((p) => pct(`9max-100-rfi-${p}`, 'raise', 0))).toEqual([28, 43, 42]);
    expect([pct('9max-100-bb-vs-btn', '3bet', 0), pct('9max-100-bb-vs-btn', 'call', 0)]).toEqual([10, 47]);
    expect([pct('9max-100-btn-vs-co', '3bet', 0), pct('9max-100-btn-vs-co', 'call', 0)]).toEqual([8, 11]);
    expect(pct('9max-100-sb-vs-btn', '3bet', 0)).toBe(17);
    // QQ+ and AK as a share of an opening range.
    const premiumShare = (id: string) => {
      const range = actionRange(chart(id), 'raise');
      let all = 0;
      let premium = 0;
      for (const [hand, f] of range) {
        all += f * comboCount(hand);
        if (['AA', 'KK', 'QQ', 'AKs', 'AKo'].includes(hand)) premium += f * comboCount(hand);
      }
      return Math.round((premium / all) * 100);
    };
    expect(['9max-100-rfi-utg', '6max-100-rfi-utg', '9max-100-rfi-btn'].map(premiumShare)).toEqual([22, 14, 6]);
  });

  it('keep opening ranges in a sensible order, hand by hand', () => {
    const ranks = '23456789TJQKA';
    const seats = ['utg', 'utgp1', 'utgp2', 'lj', 'hj', 'co', 'btn'].map((p) => chart(`9max-100-rfi-${p}`));
    const raise = (c: ReturnType<typeof chart>, hand: string) => c.mixes.get(hand)?.raise ?? 0;
    // A later seat never opens a hand less often than an earlier one.
    for (let i = 1; i < seats.length; i++) for (const hand of seats[i].mixes.keys()) expect(raise(seats[i], hand), hand).toBeGreaterThanOrEqual(raise(seats[i - 1], hand));
    for (const c of [...seats, chart('9max-100-rfi-sb')]) {
      for (let r = 1; r < 13; r++) expect(raise(c, ranks[r] + ranks[r]), c.spec.id).toBeGreaterThanOrEqual(raise(c, ranks[r - 1] + ranks[r - 1]));
      // A weaker kicker never opens more often, except that A5s to A2s (and A5o) may beat A6 to A8: wheels and blockers.
      for (const suit of ['s', 'o']) {
        for (let hi = 2; hi < 13; hi++) {
          for (let lo = 1; lo < hi; lo++) {
            const better = ranks[hi] + ranks[lo] + suit;
            const worse = ranks[hi] + ranks[lo - 1] + suit;
            if (ranks[hi] === 'A' && lo === 4) continue;
            expect(raise(c, worse), `${c.spec.id} ${worse} vs ${better}`).toBeLessThanOrEqual(raise(c, better));
          }
        }
      }
      // Suited never opens less often than offsuit.
      for (const [hand, mix] of c.mixes) if (hand.endsWith('o')) expect(mix.raise ?? 0, hand).toBeLessThanOrEqual(raise(c, hand.slice(0, 2) + 's'));
    }
  });

  it('every chart says what it assumes', () => {
    for (const spec of STARTER_CHARTS) expect(spec.note, spec.id).toBeTruthy();
  });
});

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    const ids = CURRICULUM.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => `${t.id}/${m.id}/${l.id}`)));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { IDEAS, ideaForDay } from '../src';

describe('ideas', () => {
  it('have unique ids and rotate by day', () => {
    expect(new Set(IDEAS.map((i) => i.id)).size).toBe(IDEAS.length);
    expect(ideaForDay(new Date(2026, 0, 1)).id).not.toBe(ideaForDay(new Date(2026, 0, 2)).id);
  });
});

import { parseCards } from '@felt/core';
import { LESSON_CONTENT, lessonKey } from '../src';

describe('lessons', () => {
  const curriculumKeys = new Set(CURRICULUM.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => lessonKey(t.id, m.id, l.id)))));
  const chartIds = new Set(STARTER_CHARTS.map((c) => c.id));

  it('match the curriculum and reference real charts and cards', () => {
    expect(LESSON_CONTENT.size).toBeGreaterThanOrEqual(10);
    for (const lesson of LESSON_CONTENT.values()) {
      expect(curriculumKeys.has(lesson.key)).toBe(true);
      expect(lesson.steps[0].kind).toBe('intro');
      for (const id of lesson.practice ?? []) expect(chartIds.has(id)).toBe(true);
      if (lesson.cover.kind === 'chart') expect(chartIds.has(lesson.cover.chartId)).toBe(true);
      if (lesson.cover.kind === 'cards') expect(() => parseCards(lesson.cover.kind === 'cards' ? lesson.cover.cards : '')).not.toThrow();
      for (const step of lesson.steps) {
        if (step.kind === 'chart') {
          expect(chartIds.has(step.chartId)).toBe(true);
        }
        if (step.kind === 'hand' || step.kind === 'board') {
          const cards = parseCards((step.kind === 'hand' ? step.cards : '') + (step.board ?? ''));
          expect(new Set(cards).size, `${lesson.key}: repeated card`).toBe(cards.length);
          if (step.board) expect([0, 3, 4, 5]).toContain(parseCards(step.board).length);
        }
        if (step.kind === 'quiz') {
          expect(step.answer).toBeGreaterThanOrEqual(0);
          expect(step.answer).toBeLessThan(step.choices.length);
        }
        if (step.kind === 'table') for (const row of step.rows) expect(row).toHaveLength(step.columns.length);
      }
    }
  });

  it('cover the whole curriculum, each with at least two questions for test outs', () => {
    for (const key of curriculumKeys) {
      const lesson = LESSON_CONTENT.get(key);
      expect(lesson, key).toBeDefined();
      expect(lesson!.steps.filter((s) => s.kind === 'quiz').length, key).toBeGreaterThanOrEqual(2);
      expect(lesson!.steps.at(-1)?.kind, key).toBe('takeaway');
    }
  });

  it('never use em dashes', () => {
    for (const lesson of LESSON_CONTENT.values()) expect(JSON.stringify(lesson), lesson.key).not.toContain('\u2014');
  });

  it('state numbers that agree with the core math', async () => {
    const o = await import('@felt/core');
    const pct = (x: number, digits = 1) => Number((x * 100).toFixed(digits));
    // Pot odds table and quizzes.
    expect(pct(o.potOdds(1.75, 0.75))).toBe(30);
    expect(pct(o.potOdds(1.25, 0.25))).toBe(16.7);
    expect(pct(o.potOdds(1.667, 0.667))).toBe(28.6);
    expect(pct(o.potOdds(3, 2))).toBe(40);
    // MDF, alpha and bluff share.
    for (const [bet, alpha, mdf, share] of [
      [1 / 3, 25, 75, 20],
      [0.5, 33.3, 66.7, 25],
      [0.75, 42.9, 57.1, 30],
      [1, 50, 50, 33.3],
      [2, 66.7, 33.3, 40],
    ]) {
      expect(pct(o.bluffBreakeven(1, bet))).toBe(alpha);
      expect(pct(o.mdf(1, bet))).toBe(mdf);
      expect(pct(o.optimalBluffShare(1, bet))).toBe(share);
    }
    // EV lesson and node locking.
    expect(o.callEV(150, 50, 0.3)).toBeCloseTo(10);
    expect(o.betEV(100, 50, 0.4, 0.3)).toBeCloseTo(46);
    expect(o.bluffEV(100, 75, 0.5)).toBeCloseTo(12.5);
    expect(o.bluffEV(100, 100, 0.6)).toBeCloseTo(20);
    expect(o.callEV(200, 100, 0.1)).toBeCloseTo(-70);
    expect(o.callEV(200, 100, 0.2)).toBeCloseTo(-40);
    // Outs table, exact.
    for (const [outs, flop, turn] of [
      [4, 16.5, 8.7],
      [8, 31.5, 17.4],
      [9, 35, 19.6],
      [12, 45, 26.1],
      [15, 54.1, 32.6],
    ]) {
      expect(pct(o.outsToEquity(outs, 47, 2))).toBe(flop);
      expect(pct(o.outsToEquity(outs, 46, 1))).toBe(turn);
    }
    expect(pct(o.ruleOfFourCorrected(12), 0)).toBe(44);
    expect(pct(o.ruleOfFourCorrected(15), 0)).toBe(53);
    // Implied odds.
    expect(o.impliedOddsNeeded(80, 20, 8 / 46)).toBeCloseTo(15);
    expect(o.impliedOddsNeeded(40, 10, 9 / 46)).toBeCloseTo(1.1, 1);
    // SPR and geometric sizing.
    expect(o.spr(97.5, 5.5)).toBeCloseTo(17.7, 1);
    expect(o.spr(89, 22.5)).toBeCloseTo(4, 1);
    expect(pct(o.geometricBetFraction(5.5, 97.5, 3), 0)).toBe(116);
    expect(pct(o.geometricBetFraction(22.5, 89, 3), 0)).toBe(54);
    expect(pct(o.geometricBetFraction(10, 35, 2), 0)).toBe(91);
    // BB price against a 2.5bb open.
    expect(pct(o.potOdds(4, 1.5), 0)).toBe(27);
  });

  it('count combos the way the lessons do', async () => {
    const { parseCards, rankOf, suitIndex } = await import('@felt/core');
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const combosWith = (dead: string, keep: (a: number, b: number) => boolean) => {
      const gone = new Set(parseCards(dead));
      const live = deck.filter((c) => !gone.has(c));
      let n = 0;
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (keep(live[i], live[j])) n++;
      return n;
    };
    const hearts = (a: number, b: number) => suitIndex(a) === 2 && suitIndex(b) === 2;
    // Bluff selection on Kc8h5h2s2d.
    expect(combosWith('Kc8h5h2s2d7c6c', hearts)).toBe(55);
    expect(combosWith('Kc8h5h2s2d7h6h', hearts)).toBe(36);
    // Bluff catching on AhKh7c4h2s.
    expect(combosWith('AhKh7c4h2sQsQc', hearts)).toBe(45);
    expect(combosWith('AhKh7c4h2sQhQd', hearts)).toBe(36);
    // Combos lesson: sets on K72 and AK with an ace in hand and a king on board.
    const pairOf = (r: string) => (a: number, b: number) => rankOf(a) === r && rankOf(b) === r;
    expect(['K', '7', '2'].reduce((n, r) => n + combosWith('Ks7d2c', pairOf(r)), 0)).toBe(9);
    const ak = (a: number, b: number) => new Set([rankOf(a), rankOf(b)]).size === 2 && [rankOf(a), rankOf(b)].every((r) => r === 'A' || r === 'K');
    expect(combosWith('AsKd', ak)).toBe(9);
  });

  it('quiz answers agree with the charts they test', async () => {
    const { buildChart, primaryAction, scoreRecall } = await import('@felt/core');
    const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
    const mix = (id: string, hand: string) => chart(id).mixes.get(hand)!;
    expect(primaryAction(mix('9max-100-rfi-utg', 'KJo'))).toBe('fold');
    expect(primaryAction(mix('9max-100-rfi-lj', 'A3s'))).toBe('raise');
    expect(primaryAction(mix('9max-100-rfi-btn', 'K5s'))).toBe('raise');
    expect(mix('9max-100-rfi-co', 'Q7s').raise).toBeCloseTo(0.45);
    expect(mix('9max-100-rfi-co', 'Q9s')).toEqual({ raise: 1 });
    expect(mix('9max-100-rfi-co', 'Q4s')).toEqual({ fold: 1 });
    expect(mix('9max-100-rfi-sb', 'Q4s')).toEqual({ raise: 1 });
    expect(mix('9max-100-rfi-sb', 'Q3s').raise).toBeCloseTo(0.6);
    expect(mix('9max-100-rfi-sb', 'Q2s').raise).toBeCloseTo(0.35);
    expect(mix('9max-100-rfi-sb', 'K7o').raise).toBeCloseTo(0.35);
    expect(mix('9max-100-rfi-sb', 'K9o')).toEqual({ raise: 1 });
    // Early position lesson captions and quiz explanations.
    expect(mix('9max-100-rfi-utg', '77')).toEqual({ raise: 1 });
    expect(mix('9max-100-rfi-utg', '55').raise).toBeCloseTo(0.5);
    expect(mix('9max-100-rfi-utg', 'T9s').raise).toBeCloseTo(0.5);
    expect(mix('9max-100-rfi-utg', 'A5s').raise).toBeCloseTo(0.6);
    expect(mix('9max-100-rfi-utg', 'KQo').raise).toBeCloseTo(0.7);
    expect(mix('9max-100-rfi-utgp1', 'KJo').raise).toBeCloseTo(0.1);
    expect(mix('9max-100-rfi-lj', 'A2s').raise).toBeCloseTo(0.8);
    expect(mix('9max-100-rfi-lj', '44')).toEqual({ raise: 1 });
    expect(mix('9max-100-rfi-btn', 'K2s')).toEqual({ raise: 1 });
    expect(mix('9max-100-rfi-btn', 'A4o')).toEqual({ raise: 1 });
    expect(mix('9max-100-rfi-btn', 'K5o').raise).toBeCloseTo(0.1);
    expect(mix('9max-100-rfi-btn', 'K4o')).toEqual({ fold: 1 });
    expect(mix('9max-100-bb-vs-btn', 'J5s')).toEqual({ call: 1 });
    // Captions and questions added so each chart question is answerable from its lesson.
    expect(mix('9max-100-rfi-utg', '66').raise).toBeCloseTo(0.85);
    for (const hand of ['A3s', 'A4s', 'A5s']) expect(mix('9max-100-rfi-lj', hand)).toEqual({ raise: 1 });
    for (const hand of ['A2s', 'A6s', 'A7s']) expect(mix('9max-100-rfi-lj', hand).raise).toBeGreaterThanOrEqual(0.8);
    for (const hand of ['Q8s', 'Q7s', 'Q6s', 'Q5s']) expect(mix('9max-100-rfi-co', hand).fold).toBeGreaterThan(0);
    for (const hand of ['K2s', 'K8s']) expect(mix('9max-100-rfi-sb', hand)).toEqual({ raise: 1 });
    expect(mix('9max-100-rfi-sb', 'K8o').fold).toBeGreaterThan(0);
    for (const hand of ['J7s', 'J6s']) expect(mix('9max-100-bb-vs-btn', hand)).toEqual({ call: 1 });
    expect(mix('9max-100-bb-vs-btn', 'A5s')['3bet']).toBeCloseTo(0.7);
    expect(mix('9max-100-btn-vs-3bet', 'K9o')).toEqual({ fold: 1 });
    expect(mix('9max-100-iso-btn-vs-1limp', '65s')).toEqual({ call: 1 });
    expect(mix('9max-100-iso-btn-vs-2limp', 'AQo')).toEqual({ raise: 1 });
    expect(mix('9max-100-bb-vs-btn', 'A4s')['3bet']).toBeCloseTo(0.6);
    expect(mix('9max-100-bb-vs-btn', 'A5s')['3bet']).toBeGreaterThan(0.6);
    expect(mix('9max-100-bb-vs-btn', 'A3s')['3bet']).toBeLessThan(0.6);
    expect(mix('9max-100-bb-vs-btn', '42s')).toEqual({ call: 1 });
    for (const hand of ['T6o', '93o', '64o']) expect(mix('9max-100-bb-vs-btn', hand)).toEqual({ fold: 1 });
    expect(primaryAction(mix('9max-100-bb-vs-btn', 'J6s'))).toBe('call');
    expect(scoreRecall(mix('9max-100-bb-vs-btn', 'A4s'), '3bet')).toBe(1);
    expect(scoreRecall(mix('9max-100-bb-vs-btn', 'A4s'), 'call')).toBe(1);
    expect(mix('9max-100-iso-btn-vs-1limp', '44')).toEqual({ raise: 0.5, call: 0.5 });
    expect(primaryAction(mix('9max-100-iso-btn-vs-1limp', 'ATo'))).toBe('raise');
  });
});

describe('exploits', () => {
  it('keeps player type stats possible', () => {
    for (const p of PLAYER_TYPES) {
      expect(p.stats.vpip[0]).toBeLessThanOrEqual(p.stats.vpip[1]);
      expect(p.stats.pfr[0]).toBeLessThanOrEqual(p.stats.pfr[1]);
      // You cannot raise preflop more often than you put money in.
      expect(p.stats.pfr[1]).toBeLessThanOrEqual(p.stats.vpip[1]);
      expect(p.leaks.length).toBeGreaterThan(0);
      expect(p.adjust.length).toBeGreaterThan(0);
    }
  });

  it('rates few tells as strong and has unique ids', () => {
    expect(TELLS.filter((t) => t.reliability === 'strong').length).toBeLessThanOrEqual(3);
    const ids = [...PLAYER_TYPES.map((p) => p.id), ...TELLS.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses no em dashes or semicolons in exploit copy', () => {
    const text = JSON.stringify([PLAYER_TYPES, TELLS]);
    expect(text).not.toMatch(/—/);
    expect(text).not.toMatch(/;/);
  });
});

describe('poker basics', () => {
  const basics = [...LESSON_CONTENT.values()].filter((l) => l.key.startsWith('basics/'));
  const chartIds = new Set(STARTER_CHARTS.map((c) => c.id));

  it('comes first, with 16 lessons', () => {
    expect(CURRICULUM[0].id).toBe('basics');
    expect(basics).toHaveLength(16);
  });

  it('shows real, legal cards and seats in every picture and question', async () => {
    const { categoryOf, evaluate, HandCategory } = await import('@felt/core');
    const seatsOk = (art: { seats: number; button?: string; hero?: string; highlight?: string[] }) => {
      const seats = positionsFor(art.seats);
      for (const s of [art.button, art.hero, ...(art.highlight ?? [])]) if (s) expect(seats, s).toContain(s);
    };
    const handOk = (cards: string, board = '') => {
      const all = parseCards(cards + board);
      expect(new Set(all).size).toBe(all.length);
      if (board) expect([3, 4, 5]).toContain(parseCards(board).length);
    };
    const NAMES: Record<string, number> = {
      'Royal flush': HandCategory.StraightFlush,
      'Straight flush': HandCategory.StraightFlush,
      'Four of a kind': HandCategory.Quads,
      'Full house': HandCategory.FullHouse,
      Flush: HandCategory.Flush,
      Straight: HandCategory.Straight,
      'Three of a kind': HandCategory.Trips,
      'Two pair': HandCategory.TwoPair,
      'One pair': HandCategory.Pair,
      'High card': HandCategory.HighCard,
    };
    for (const lesson of basics) {
      const arts = [lesson.cover, ...lesson.steps.flatMap((s) => (s.kind === 'visual' ? [s.art] : []))];
      for (const art of arts) {
        if (art.kind === 'cards') handOk(art.cards, art.board);
        if (art.kind === 'table') seatsOk(art);
        if (art.kind === 'chart') expect(chartIds.has(art.chartId)).toBe(true);
        if (art.kind === 'ring') expect(art.value).toBeGreaterThanOrEqual(0);
        if (art.kind === 'ladder') {
          const scores = art.rungs.map((r) => evaluate(parseCards(r.cards)));
          art.rungs.forEach((r, i) => expect(categoryOf(scores[i]), r.name).toBe(NAMES[r.name]));
          for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThan(scores[i - 1]);
        }
      }
      for (const step of lesson.steps) {
        if (step.kind !== 'quiz') continue;
        if (step.cards) handOk(step.cards, step.board);
        if (step.choiceCards) {
          expect(step.choiceCards).toHaveLength(step.choices.length);
          for (const c of step.choiceCards) handOk(c);
        }
      }
    }
  });

  it('ranks the hands in its questions the way the evaluator does', async () => {
    const { categoryOf, evaluate, HandCategory } = await import('@felt/core');
    const score = (cards: string) => evaluate(parseCards(cards));
    // Which ranks highest: flush over straight, trips and two pair.
    const options = ['8c7d6s5h4c', 'QsQdQc9h3d', 'Kh9h7h4h2h', 'AsAdKcKh7s'].map(score);
    expect(options.indexOf(Math.max(...options))).toBe(2);
    expect(categoryOf(score('Kh9h7h4h2h'))).toBe(HandCategory.Flush);
    // The wheel is a straight. Q K A 2 3 is not.
    expect(categoryOf(score('Ah2c3d4s5h'))).toBe(HandCategory.Straight);
    expect(categoryOf(score('QhKcAd2s3h'))).toBe(HandCategory.HighCard);
    expect(score('Ah2c3d4s5h')).toBeGreaterThan(score('7c7d7hKs2d'));
    // Full house beats a flush.
    expect(score('KcKdKh4s4d')).toBeGreaterThan(score('AdJd8d6d3d'));
    // Best five examples.
    expect(categoryOf(score('KhQhAh9h4h2cTs'))).toBe(HandCategory.Flush);
    expect(score('As7cAdKs9h8c2d')).toBe(score('AsAdKs9h8c'));
    expect(score('Ks2dTc9d8s7h6c')).toBe(score('Tc9d8s7h6c'));
    // Kicker: AK beats AQ on As9d6c4h2s.
    expect(score('AhKdAs9d6c4h2s')).toBeGreaterThan(score('AdQcAs9d6c4h2s'));
    expect(score('AhKdAs9d6c4h2s')).toBe(score('AhAsKd9d6c'));
    // Playing the board splits.
    expect(score('As2dTc9d8s7h6c')).toBe(score('Kh4cTc9d8s7h6c'));
    // Ac7c on Kc9c7d7s2c: a flush, over three 7s.
    expect(categoryOf(score('Ac7cKc9c7d7s2c'))).toBe(HandCategory.Flush);
    // Same ranks in different suits tie.
    expect(score('AsKsQd9c4s7h2c')).toBe(score('AhKhQd9c4s7h2c'));
  });

  it('states counts and chances that are exact', async () => {
    const { ALL_HAND_CLASSES, categoryOf, evaluate, outsToEquity, potOdds } = await import('@felt/core');
    const pct = (x: number, digits = 1) => Number((x * 100).toFixed(digits));
    const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
    // 169 hands: 13 pairs, 78 suited, 78 offsuit. 1,326 combos.
    expect(ALL_HAND_CLASSES).toHaveLength(169);
    expect(ALL_HAND_CLASSES.filter((h) => h.length === 2)).toHaveLength(13);
    expect(ALL_HAND_CLASSES.filter((h) => h.endsWith('s'))).toHaveLength(78);
    expect(ALL_HAND_CLASSES.filter((h) => h.endsWith('o'))).toHaveLength(78);
    const combos = (keep: (h: string) => boolean) => ALL_HAND_CLASSES.filter(keep).reduce((n, h) => n + comboCount(h), 0);
    expect(combos(() => true)).toBe(choose(52, 2));
    expect(choose(52, 2)).toBe(1326);
    expect([comboCount('AA'), comboCount('AKs'), comboCount('AKo')]).toEqual([6, 4, 12]);
    expect(1326 / 6).toBe(221);
    expect([pct(6 / 1326, 2), pct(4 / 1326, 2), pct(12 / 1326, 2)]).toEqual([0.45, 0.3, 0.9]);
    const pairs = combos((h) => h.length === 2);
    expect(pairs).toBe(78);
    expect(pct(pairs / 1326, 2)).toBe(5.88);
    expect(1326 / pairs).toBe(17);
    expect(pairs / 1326).toBeCloseTo(3 / 51);
    const suited = combos((h) => h.endsWith('s'));
    expect(suited).toBe(312);
    expect(pct(suited / 1326)).toBe(23.5);
    // Rarer five card hands rank higher, over all 2,598,960 hands.
    const counts = new Array<number>(9).fill(0);
    const c = [0, 0, 0, 0, 0];
    for (c[0] = 0; c[0] < 52; c[0]++)
      for (c[1] = c[0] + 1; c[1] < 52; c[1]++)
        for (c[2] = c[1] + 1; c[2] < 52; c[2]++)
          for (c[3] = c[2] + 1; c[3] < 52; c[3]++) for (c[4] = c[3] + 1; c[4] < 52; c[4]++) counts[categoryOf(evaluate(c))]++;
    expect(counts.reduce((a, b) => a + b, 0)).toBe(2598960);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThan(counts[i - 1]);
    // 4 royal flushes are rarer than the 36 other straight flushes.
    expect(counts[8]).toBe(40);
    // A pocket pair flops a set or better 11.8%.
    expect(pct(1 - choose(48, 3) / choose(50, 3))).toBe(11.8);
    // Two suited cards make a flush in their suit by the river 6.4%.
    const flush = [3, 4, 5].reduce((n, k) => n + choose(11, k) * choose(39, 5 - k), 0) / choose(50, 5);
    expect(pct(flush)).toBe(6.4);
    // Flush draw on the turn: 9 of 46 unseen.
    expect(52 - 2 - 4).toBe(46);
    expect(pct(outsToEquity(9, 46, 1))).toBe(19.6);
    // Prices: 5 into 10 needs 25%, 10 into 10 needs 33.3%.
    expect(pct(potOdds(15, 5))).toBe(25);
    expect(pct(potOdds(20, 10))).toBe(33.3);
    // Odds against to percent.
    for (const [against, p] of [[1, 50], [2, 33.3], [3, 25], [4, 20]]) expect(pct(1 / (against + 1))).toBe(p);
    // Big blinds.
    expect([200 / 2, 300 / 2, 50 / 5, 50 / 2, 50 / 50]).toEqual([100, 150, 10, 25, 1]);
  });

  it('quotes the starter charts correctly', () => {
    const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
    const open = (id: string) => Math.round((actionFrequencies(chart(id)).raise ?? 0) * 100);
    expect([open('9max-100-rfi-utg'), open('9max-100-rfi-btn')]).toEqual([12, 43]);
    const utg = chart('9max-100-rfi-utg');
    const btn = chart('9max-100-rfi-btn');
    for (const hand of ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', 'AKo', 'AKs', 'KQs']) expect(utg.mixes.get(hand), hand).toEqual({ raise: 1 });
    expect(utg.mixes.get('72o')).toEqual({ fold: 1 });
    expect(utg.mixes.get('KTo')).toEqual({ fold: 1 });
    expect(btn.mixes.get('KTo')).toEqual({ raise: 1 });
    expect(btn.mixes.get('72s')).toEqual({ fold: 1 });
  });
});

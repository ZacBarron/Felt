import {
  ALL_HAND_CLASSES,
  FULL_DECK,
  HandCategory,
  actionRange,
  bluffBreakeven,
  buildChart,
  categoryOf,
  equityVsRange,
  evaluate,
  handClassCombos,
  mdf,
  parseCards,
  parseRange,
  potOdds,
  rangePercent,
  rangeToCombos,
  rankOf,
  remainingDeck,
  seededRng,
  type Card,
  type Range,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { LESSON_CONTENT, STARTER_CHARTS, type LessonArt, type LessonContent, type LessonStep } from '../src';
import { HU_ILLUSTRATION_RANGE } from '../src/lessons/formats-heads-up';

/**
 * Numbers in the heads up and blind vs blind topic, recomputed with
 * @felt/core. Sampled equities use a fixed seed and are quoted rounded, with
 * a margin well above the sampling error.
 */

const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
const text = (key: string) => JSON.stringify(lesson(key));
const step = (key: string, title: string): LessonStep => {
  const s = lesson(key).steps.find((x) => 'title' in x && x.title === title);
  if (!s) throw new Error(`${key}: no step "${title}"`);
  return s;
};
const art = (key: string, title: string): LessonArt => {
  const s = step(key, title);
  if (s.kind !== 'visual') throw new Error(`${key}: "${title}" is not a visual`);
  return s.art;
};
function pick<K extends LessonArt['kind']>(a: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(a.kind).toBe(kind);
  return a as Extract<LessonArt, { kind: K }>;
}
const bars = (a: LessonArt) => pick(a, 'bars').bars.map((b) => b.value);
const table = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind !== 'table') throw new Error(`${key}: "${title}" is not a table`);
  return s.rows;
};
const quiz = (key: string, question: string) => {
  const q = lesson(key).steps.find((s) => s.kind === 'quiz' && s.question === question);
  if (!q || q.kind !== 'quiz') throw new Error(`${key}: no quiz "${question}"`);
  return q;
};
const answer = (key: string, question: string) => {
  const q = quiz(key, question);
  return q.choices[q.answer];
};
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
const chartRange = (id: string): Range => actionRange(buildChart(STARTER_CHARTS.find((c) => c.id === id)!), 'raise');

/** Blinds 0.5bb and 1bb. A raise to `to` adds to - 0.5 for the button; the big blind calls to - 1. */
const BLINDS = 1.5;

describe('heads up preflop', () => {
  const key = 'formats/heads-up/hu-preflop';

  it('puts the button in the small blind on a 2 seat table', () => {
    const t = pick(art(key, 'The button is the small blind'), 'table');
    expect(t.seats).toBe(2);
    expect(t.button).toBe('BTN');
    expect(answer(key, 'Heads up, who acts first before the flop?')).toBe('The button');
  });

  it('charges 0.75bb a hand in blinds heads up and about 0.17bb 9-handed', () => {
    expect(bars(art(key, 'Blinds come around fast'))).toEqual([BLINDS / 2, r2(BLINDS / 9)]);
    expect(BLINDS / 2 / (BLINDS / 9)).toBe(4.5);
  });

  it('prices the min raise: 50% folds for a bluff, 25% equity to call', () => {
    expect(bluffBreakeven(BLINDS, 2 - 0.5)).toBe(0.5);
    expect(pick(art(key, 'The big blind’s price'), 'ring').value).toBe(potOdds(2 + 1, 2 - 1));
    expect(potOdds(3, 1)).toBe(0.25);
    // The 33.3% distractor leaves the big blind's own 1bb out of the pot.
    expect(pct(1 / (2 + 1))).toBe('33.3%');
    // A 2.5bb button open at a full table: call 1.5bb into 0.5 + 1 + 2.5.
    expect(pct(potOdds(4, 1.5))).toBe('27.3%');
    expect(answer(key, 'The button min raises to 2bb. What raw equity does the big blind need to call?')).toBe('25%');
  });

  it('asks the big blind to defend 50% alone, against 37.5% shared at a full table', () => {
    expect(bars(art(key, 'How often the big blind must defend'))).toEqual([
      mdf(BLINDS, 2 - 0.5) * 100,
      r1(mdf(BLINDS, 2.5 - 0.5) * 100),
      // At a full table the button adds its whole 2.5bb open.
      mdf(BLINDS, 2.5) * 100,
    ]);
    expect(
      answer(key, 'The button min raises with any 2 cards. How often must the big blind defend so the raise does not profit at once?'),
    ).toBe('50%');
  });
});

describe('heads up big blind defense', () => {
  const key = 'formats/heads-up/hu-bb-defense';
  const range = parseRange(HU_ILLUSTRATION_RANGE);
  const combos = rangeToCombos(range);
  const eq = (hand: string, iterations: number, seed = 11) =>
    equityVsRange(handClassCombos(hand)[0], combos, [], { iterations, rng: seededRng(seed) }).equity;

  it('prices 2, 2.5 and 3bb raises', () => {
    const rows = [2, 2.5, 3].map((to) => [
      `${to}bb`,
      `${to - 1}bb`,
      pct(potOdds(to + 1, to - 1)).replace('.0%', '%'),
      pct(mdf(BLINDS, to - 0.5)).replace('.0%', '%'),
    ]);
    expect(table(key, 'Your price and your target')).toEqual(rows);
    expect(answer(key, 'Heads up, the button raises to 2.5bb. What raw equity do you need to call from the big blind?')).toBe('30%');
  });

  it('uses an illustration range of about 78% that folds the weakest offsuit hands', () => {
    expect(Math.round(rangePercent(range) * 100)).toBe(78);
    for (const h of ['72o', 'T4o', '32o']) expect(range.has(h), h).toBe(false);
    // Every hand it folds is offsuit.
    for (const h of ALL_HAND_CLASSES.filter((x) => !range.has(x))) expect(h.endsWith('o'), h).toBe(true);
    expect(text(key)).toContain('about 78% of hands');
  });

  it('gives 72o about 32%, J4o about 41% and K9o about 55% against it', () => {
    const shown = bars(art(key, 'Raw equity against that range'));
    expect(shown[0]).toBe(25);
    expect(shown.slice(1)).toEqual(['72o', 'J4o', 'K9o'].map((h) => Math.round(eq(h, 200_000) * 100)));
  }, 60_000);

  it('leaves every starting hand above 30% raw equity', () => {
    const low = ALL_HAND_CLASSES.map((h) => [h, eq(h, 20_000, 1)] as const).filter(([, e]) => e <= 0.3);
    expect(low).toEqual([]);
  }, 120_000);

  it('quiz cards match the hands they name', () => {
    expect(quiz(key, 'Against the illustration range, why fold 72o at all?').cards).toBe('7h2c');
    const q = quiz(key, 'Which hand keeps more of its equity out of position?');
    expect(q.choiceCards).toEqual(['6h5h', '9c3d']);
  });
});

describe('blind vs blind in a full ring', () => {
  const key = 'formats/heads-up/bvb-full-ring';

  it('costs 0.5bb to limp and 2.5bb to raise to 3bb, which needs 62.5% folds', () => {
    expect(bars(art(key, 'What each choice costs'))).toEqual([1 - 0.5, 3 - 0.5]);
    expect(bluffBreakeven(BLINDS, 2.5)).toBe(0.625);
    expect(answer(key, 'You raise to 3bb from the small blind as a pure bluff. How often must the big blind fold for it to break even?')).toBe(
      '62.5%',
    );
  });

  it('a 4bb raise of a limp needs 60% folds, and the small blind needs 37.5% to call', () => {
    expect(bluffBreakeven(2, 3)).toBe(0.6);
    expect(potOdds(1 + 4, 3)).toBe(0.375);
    expect(answer(key, 'The small blind limps and the big blind raises to 4bb. How much equity does the small blind need to call?')).toBe('37.5%');
  });

  it('quotes the raise only small blind chart at about 42%', () => {
    expect(Math.round(rangePercent(chartRange('9max-100-rfi-sb')) * 100)).toBe(42);
    const chart = step(key, 'Aced’s chart raises or folds');
    expect(chart.kind === 'chart' && chart.chartId).toBe('9max-100-rfi-sb');
    expect(STARTER_CHARTS.find((c) => c.id === '9max-100-rfi-sb')!.source).toBe('starter-approx');
  });
});

describe('postflop heads up', () => {
  const key = 'formats/heads-up/hu-postflop';

  /** Flops from `deck` that hold no card of the given ranks, and all flops. */
  function flops(deck: Card[], ranks: string[]) {
    let all = 0;
    let miss = 0;
    for (let i = 0; i < deck.length; i++)
      for (let j = i + 1; j < deck.length; j++)
        for (let k = j + 1; k < deck.length; k++) {
          all++;
          if (![deck[i], deck[j], deck[k]].some((c) => ranks.includes(rankOf(c)))) miss++;
        }
    return { all, miss };
  }

  it('an unpaired hand pairs a hole card on 6,356 of 19,600 flops', () => {
    const hand = parseCards('Ks7d');
    const { all, miss } = flops(remainingDeck(hand), ['K', '7']);
    expect([all, all - miss]).toEqual([19600, 6356]);
    expect(pick(art(key, 'An unpaired hand on the flop'), 'ring').value).toBe((all - miss) / all);
    expect(pct((all - miss) / all)).toBe('32.4%');
    expect(Math.round((miss / all) * 3)).toBe(2);
    // Any other unpaired hand gives the same count.
    expect(flops(remainingDeck(parseCards('Ah2s')), ['A', '2']).miss).toBe(miss);
  });

  it('two unpaired hands with 4 ranks both miss 41.3% of flops', () => {
    const { all, miss } = flops(remainingDeck(parseCards('Ks7dQh5c')), ['K', '7', 'Q', '5']);
    expect([all, miss]).toEqual([17296, 7140]);
    expect(pick(art(key, 'Two unpaired hands'), 'ring').value).toBe(miss / all);
    expect(pct(miss / all)).toBe('41.3%');
  });

  it('counts top pair or better on K♠7♦2♣ for each range', () => {
    const board = parseCards('Ks7d2c');
    const share = (range: Range, made: (h: [Card, Card]) => boolean) => {
      let total = 0;
      let hit = 0;
      for (const c of rangeToCombos(range, board)) {
        total += c.weight;
        if (made(c.cards)) hit += c.weight;
      }
      return hit / total;
    };
    const category = (h: [Card, Card]) => categoryOf(evaluate([...h, ...board]));
    // On this unpaired rainbow board, two pair and better always use both hole cards.
    const topPlus = (h: [Card, Card]) => category(h) >= HandCategory.TwoPair || h.some((c) => rankOf(c) === 'K') || h.every((c) => rankOf(c) === 'A');
    const pairPlus = (h: [Card, Card]) => category(h) >= HandCategory.Pair;
    const ranges: Range[] = [chartRange('9max-100-rfi-utg'), chartRange('9max-100-rfi-btn'), parseRange(HU_ILLUSTRATION_RANGE)];
    const rows = table(key, 'Top pair or better on K♠7♦2♣');
    ranges.forEach((r, i) => expect(rows[i].slice(1)).toEqual([pct(share(r, topPlus)), pct(share(r, pairPlus))]));
    const tops = ranges.map((r) => r1(share(r, topPlus) * 100));
    expect(bars(art(key, 'Top pair or better gets rarer'))).toEqual(tops);
    expect(pick(lesson(key).cover, 'bars').bars.map((b) => b.value)).toEqual(tops);
    // About 1 hand in 6.
    expect(Math.round(100 / tops[2])).toBe(6);
  });

  it('simulates the winner holding one pair or less: about 43% with 2 hands, under 10% with 9', () => {
    const lowWinner = (players: number, deals: number, seed: number) => {
      const rng = seededRng(seed);
      const deck = [...FULL_DECK];
      const need = players * 2 + 5;
      let low = 0;
      for (let n = 0; n < deals; n++) {
        for (let i = 0; i < need; i++) {
          const j = i + Math.floor(rng() * (52 - i));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        const runout = deck.slice(players * 2, need);
        let best = 0;
        for (let p = 0; p < players; p++) best = Math.max(best, evaluate([deck[2 * p], deck[2 * p + 1], ...runout]));
        if (categoryOf(best) <= HandCategory.Pair) low++;
      }
      return low / deals;
    };
    const [two, nine] = bars(art(key, 'Who wins at showdown'));
    const headsUp = lowWinner(2, 300_000, 3);
    const fullRing = lowWinner(9, 300_000, 5);
    expect(Math.abs(headsUp * 100 - two)).toBeLessThan(0.5);
    expect(Math.abs(fullRing * 100 - nine)).toBeLessThan(0.5);
    expect(fullRing).toBeLessThan(0.1);
    expect(text(key)).toContain('300,000 deals');
  }, 60_000);

  it('99 is behind every king and ahead of hands with no pair on the flop', () => {
    const q = quiz(key, 'Heads up, you hold 9♥9♣ on K♠7♦2♣. The button bets small. What role does your hand usually play?');
    const board = parseCards(q.board!);
    const mine = evaluate([...parseCards(q.cards!), ...board]);
    expect(evaluate([...parseCards('KhQd'), ...board])).toBeGreaterThan(mine);
    expect(evaluate([...parseCards('AhQd'), ...board])).toBeLessThan(mine);
  });
});

describe('adjusting to one opponent', () => {
  const key = 'formats/heads-up/hu-one-opponent';
  const ev = (folds: number) => folds * BLINDS - (1 - folds) * (2 - 0.5);

  it('counts button against the same big blind: 50 per 100 heads up, about 11 at 9-handed', () => {
    expect(bars(art(key, 'Chances to read one player'))).toEqual([100 / 2, r1(100 / 9)]);
    expect(answer(key, 'Heads up, how many times per 100 hands do you hold the button against the same big blind?')).toBe('50');
  });

  it('a raise that gives up when called breaks even at 50% and gains 0.3bb per 10%', () => {
    expect(ev(0.5)).toBe(0);
    expect(r2(ev(0.6))).toBe(0.3);
    for (const [x, y] of pick(art(key, 'EV of any 2 cards by fold rate'), 'curve').points) expect(y).toBeCloseTo(ev(x / 100), 10);
    expect(pick(lesson(key).cover, 'ring').value).toBe(bluffBreakeven(BLINDS, 1.5));
    expect(answer(key, 'The big blind folds 60% to your min raise. What does a raise that gives up when called earn?')).toBe('+0.3bb');
  });

  it('puts a 60% fold rate within about 2 typical errors', () => {
    const rows = [20, 50, 200].map((n) => {
      const se = Math.sqrt((0.6 * 0.4) / n);
      return [`${n}`, pct(se), `${Math.round((0.6 - 2 * se) * 100)}% to ${Math.round((0.6 + 2 * se) * 100)}%`];
    });
    expect(table(key, 'You saw 60% folds. How sure is it?')).toEqual(rows);
    expect(answer(key, 'After 50 raises they folded 60%. What could their true fold rate be?')).toBe('Anywhere from about 46% to 74%');
  });
});

describe('heads up topic: shape and voice', () => {
  const KEYS = ['hu-preflop', 'hu-bb-defense', 'bvb-full-ring', 'hu-postflop', 'hu-one-opponent'].map((id) => `formats/heads-up/${id}`);
  const strings = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

  it('are advanced lessons with 3 or more pictures, 2 or more questions and no two text steps in a row', () => {
    const textOnly = new Set(['intro', 'text', 'callout']);
    for (const key of KEYS) {
      const l = lesson(key);
      expect(l.level, key).toBe('advanced');
      expect(l.steps.filter((s) => ['visual', 'hand', 'board', 'chart'].includes(s.kind)).length, key).toBeGreaterThanOrEqual(3);
      expect(l.steps.filter((s) => s.kind === 'quiz').length, key).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < l.steps.length; i++) expect(textOnly.has(l.steps[i].kind) && textOnly.has(l.steps[i - 1].kind), `${key} step ${i}`).toBe(false);
      // Factual steps say how sure they are.
      for (const s of l.steps) if (s.kind === 'text' || (s.kind === 'visual' && s !== l.steps[0])) expect('evidence' in s && s.evidence, `${key}: ${s.title}`).toBeTruthy();
    }
  });

  it('follow the voice rules: one comma per sentence, short sentences, no semicolons or dashes', () => {
    for (const key of KEYS) {
      const l = lesson(key);
      const words = l.steps.flatMap((s) => strings({ ...s, kind: undefined, cards: undefined, board: undefined, choiceCards: undefined, formula: undefined }));
      for (const s of words) {
        expect(s, key).not.toMatch(/[;–—]/);
        for (const sentence of s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/)) {
          expect((sentence.match(/,/g) ?? []).length, `${key}: ${sentence}`).toBeLessThanOrEqual(1);
          expect(sentence.split(/\s+/).length, `${key}: ${sentence}`).toBeLessThan(20);
        }
      }
      expect(text(key), key).not.toMatch(/\b(books?|videos?|websites?|www|https?|podcasts?|forums?|course)\b/i);
    }
  });

  it('labels the made up range as an illustration wherever it is used', () => {
    expect(text('formats/heads-up/hu-bb-defense')).toContain('This range is an illustration, not solver output.');
    expect(text('formats/heads-up/hu-postflop')).toContain('The heads up range is an illustration');
  });
});

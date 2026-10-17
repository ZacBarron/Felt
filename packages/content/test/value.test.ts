import {
  actionRange,
  buildChart,
  categoryOf,
  evaluate,
  exactEquity,
  handClassOf,
  HandCategory,
  mdf,
  parseCards,
  rangeToCombos,
  remainingDeck,
  type Card,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, LESSON_CONTENT, STARTER_CHARTS, type LessonArt, type LessonContent, type LessonStep } from '../src';

/**
 * Thick and thin value. Every equity and range share in the lesson is
 * recomputed here exactly, over every turn and river, from Aced's BTN open
 * and BB calling charts. The sizing conclusions are solver patterns and stay
 * qualitative.
 */

const KEY = 'postflop/cbet/thick-thin';
const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
const step = (title: string): LessonStep => {
  const s = lesson(KEY).steps.find((x) => 'title' in x && x.title === title);
  if (!s) throw new Error(`No step "${title}"`);
  return s;
};
const art = (title: string): LessonArt => {
  const s = step(title);
  if (s.kind !== 'visual') throw new Error(`"${title}" is not a visual`);
  return s.art;
};
const caption = (title: string): string => {
  const s = step(title);
  if (s.kind === 'visual' || s.kind === 'hand' || s.kind === 'board') return s.caption;
  throw new Error(`"${title}" has no caption`);
};
function pick<K extends LessonArt['kind']>(a: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(a.kind).toBe(kind);
  return a as Extract<LessonArt, { kind: K }>;
}
const quiz = (question: string) => {
  const q = lesson(KEY).steps.find((s) => s.kind === 'quiz' && s.question === question);
  if (!q || q.kind !== 'quiz') throw new Error(`No quiz "${question}"`);
  return q;
};
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number) => r1(x * 100);
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

const KK = parseCards('KhKc') as [Card, Card];
const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
const BB_CALLS = actionRange(chart('9max-100-bb-vs-btn'), 'call');

interface Entry {
  cards: [Card, Card];
  weight: number;
  /** BB's equity against K♥K♣. */
  eq: number;
}

/** BB's calling combos on a board with K♥K♣ removed, best against KK first. */
function lineUp(board: string): { list: Entry[]; total: number; board: Card[] } {
  const b = parseCards(board);
  const list = rangeToCombos(BB_CALLS, [...b, ...KK])
    .map((c) => ({ cards: c.cards as [Card, Card], weight: c.weight, eq: exactEquity(c.cards as [Card, Card], KK, b).equity }))
    .sort((x, y) => y.eq - x.eq);
  return { list, total: list.reduce((a, x) => a + x.weight, 0), board: b };
}

/** The curve: BB's equity at each 5% of its range, best hands first. */
function curve({ list, total }: ReturnType<typeof lineUp>): [number, number][] {
  const out: [number, number][] = [];
  for (let x = 0; x <= 100; x += 5) {
    let cum = 0;
    let y = list[list.length - 1].eq;
    if (x === 0) y = list[0].eq;
    else
      for (const e of list) {
        cum += e.weight;
        if (cum >= (x / 100) * total - 1e-9) {
          y = e.eq;
          break;
        }
      }
    out.push([x, pct(y)]);
  }
  return out;
}

/** Share of BB's calls that pass a test, weighted by combo. */
const share = ({ list, total }: ReturnType<typeof lineUp>, test: (e: Entry) => boolean) => list.filter(test).reduce((a, e) => a + e.weight, 0) / total;

/** K♥K♣ equity against the best `keep` share of BB's calls, taking part of the last combo when needed. */
function kkVsBest({ list, total }: ReturnType<typeof lineUp>, keep: number): number {
  let left = keep * total;
  let w = 0;
  let e = 0;
  for (const x of list) {
    const take = Math.min(x.weight, left);
    if (take <= 0) break;
    w += take;
    e += take * (1 - x.eq);
    left -= take;
  }
  return e / w;
}

const vsKK = (hand: string, board: string) => exactEquity(parseCards(hand) as [Card, Card], KK, parseCards(board)).equity;

/** Turn cards that put a hand ahead of K♥K♣. */
function outs(hand: string, board: string): number {
  const h = parseCards(hand);
  const b = parseCards(board);
  return remainingDeck([...h, ...b, ...KK]).filter((t) => evaluate([...h, ...b, t]) > evaluate([...KK, ...b, t])).length;
}

describe('thick and thin value: the numbers', () => {
  const wet = lineUp('7d5s4s');
  const dry = lineUp('7d3c2s');

  it('draws the equity curves from Aced’s charts', () => {
    const c754 = pick(art('Line up BB’s hands on 754'), 'curve');
    const c732 = pick(art('The same line on 732'), 'curve');
    expect(c754.points).toEqual(curve(wet));
    expect(c732.points).toEqual(curve(dry));
    // Each mark sits on its curve, at the last point above 25%.
    for (const c of [c754, c732]) {
      const i = c.points.findIndex(([x]) => x === c.mark![0]);
      expect(c.points[i]).toEqual(c.mark);
      expect(c.points[i][1]).toBeGreaterThan(25);
      expect(c.points[i + 1][1]).toBeLessThan(25);
    }
    // The hand halfway down the 732 line has 10% equity.
    expect(c732.points.find(([x]) => x === 50)![1]).toBe(10);
    expect(caption('Weak pairs must pay on 732')).toContain('the hand halfway down BB’s calls has just **10%**');
  }, 60_000);

  it('counts the calls with more than 25% equity against KK', () => {
    const over754 = pct(share(wet, (e) => e.eq > 0.25));
    const over732 = pct(share(dry, (e) => e.eq > 0.25));
    expect([over754, over732]).toEqual([40.1, 10.3]);
    expect(caption('Line up BB’s hands on 754')).toContain(`**${over754}%** of BB’s calls have more than 25% equity`);
    expect(caption('The same line on 732')).toContain(`Only **${over732}%** of BB’s calls have more than 25%`);
    const q = quiz('You hold K♥K♣ on 7♦5♠4♠. With Aced’s charts, how much of BB’s calling range has over 25% equity against you?');
    expect(q.choices[q.answer]).toBe(`About ${Math.round(over754 / 10) * 10}%`);
    expect(q.explain).toContain(`${over754}% of BB’s calls`);
    expect(q.explain).toContain(`only ${over732}% do`);
  });

  it('gives KK’s equity against the whole calling range', () => {
    const kk754 = pct(kkVsBest(wet, 1));
    const kk732 = pct(kkVsBest(dry, 1));
    expect([kk754, kk732]).toEqual([73.2, 86.5]);
    expect(caption('Line up BB’s hands on 754')).toContain(`KK has **${kk754}%**`);
    expect(caption('The same line on 732')).toContain(`KK has **${kk732}%**`);
    const q = quiz('You hold K♥K♣ on 7♦3♣2♠. What is your equity against BB’s whole calling range?');
    expect(q.choices[q.answer]).toBe(`About ${Math.floor(kk732)}%`);
    expect(q.choices).toContain(`About ${Math.floor(kk754)}%`);
    expect(q.explain).toContain(`KK has ${kk732}%`);
    expect(q.explain).toContain(`it has ${kk754}%`);
  });

  it('shows what KK faces from the hands that stay, with MDF shares', () => {
    expect(mdf(1, 1 / 3)).toBeCloseTo(0.75);
    expect(mdf(1, 1)).toBeCloseTo(0.5);
    const t = step('KK against the hands that stay');
    if (t.kind !== 'table') throw new Error('not a table');
    const row = (l: ReturnType<typeof lineUp>) => [1, 0.75, 0.5].map((k) => `${pct(kkVsBest(l, k)).toFixed(1)}%`);
    expect(t.rows).toEqual([
      ['7♦5♠4♠', ...row(wet)],
      ['7♦3♣2♠', ...row(dry)],
    ]);
    // A big bet thins the value more on the wet board.
    expect(kkVsBest(wet, 1) - kkVsBest(wet, 0.5)).toBeGreaterThan(kkVsBest(dry, 1) - kkVsBest(dry, 0.5));
  });

  it('prices the bluff catchers and the draw exactly', () => {
    const b754 = pick(art('What a small bet keeps in on 754'), 'bars').bars;
    expect(b754.map((b) => b.label)).toEqual(['T♥7♥', 'J♥5♥', 'A♥6♥']);
    expect(b754.map((b) => b.value)).toEqual(['Th7h', 'Jh5h', 'Ah6h'].map((h) => pct(vsKK(h, '7d5s4s'))));
    expect(b754.map((b) => b.value)).toEqual([20, 20, 41.8]);
    expect(outs('Th7h', '7d5s4s')).toBe(5);
    expect(outs('Jh5h', '7d5s4s')).toBe(5);
    const b732 = pick(art('Weak pairs must pay on 732'), 'bars').bars;
    expect(b732.map((b) => b.label)).toEqual(['6♥6♦', '8♥8♦']);
    expect(b732.map((b) => b.value)).toEqual(['6h6d', '8h8d'].map((h) => pct(vsKK(h, '7d3c2s'))));
    expect(b732.map((b) => b.value)).toEqual([10, 8.4]);
    expect(outs('6h6d', '7d3c2s')).toBe(2);
    expect(outs('8h8d', '7d3c2s')).toBe(2);
    // Every example is a hand BB calls with.
    for (const h of ['T7s', 'J5s', 'A6s', '66', '88']) expect(BB_CALLS.get(h), h).toBe(1);
  });

  it('BB rarely calls with 73, 72 or 32, so it holds little two pair on 732', () => {
    const lowTwo = share(dry, (e) => ['73s', '73o', '72s', '72o', '32s', '32o'].includes(handClassOf(e.cards[0], e.cards[1])));
    expect(lowTwo).toBeLessThan(0.01);
    const twoPair = (l: ReturnType<typeof lineUp>) => share(l, (e) => categoryOf(evaluate([...e.cards, ...l.board])) >= HandCategory.TwoPair);
    expect(Math.round(twoPair(dry) * 100)).toBe(2);
    expect(twoPair(wet)).toBeGreaterThan(twoPair(dry) * 2);
    expect(caption('The same line on 732')).toContain('two pair or better only **2%**');
  });
});

describe('thick and thin value: shape and voice', () => {
  const l = lesson(KEY);

  it('sits after sizing in the c-bet topic', () => {
    const ids = CURRICULUM.find((t) => t.id === 'postflop')!.modules.find((m) => m.id === 'cbet')!.lessons.map((x) => x.id);
    expect(ids.indexOf('thick-thin')).toBe(ids.indexOf('sizing') + 1);
  });

  it('has 3 or more questions, 3 or 4 points and labelled evidence', () => {
    expect(l.steps.filter((s) => s.kind === 'quiz').length).toBeGreaterThanOrEqual(3);
    const points = l.steps.find((s) => s.kind === 'takeaway');
    expect(points?.kind === 'takeaway' && points.points.length).toBeGreaterThanOrEqual(3);
    // Equities are exact math. Sizing conclusions are solver patterns.
    const ev = (title: string) => {
      const s = step(title);
      return 'evidence' in s ? s.evidence : undefined;
    };
    for (const t of ['Line up BB’s hands on 754', 'The same line on 732', 'KK against the hands that stay', 'What a small bet keeps in on 754']) expect(ev(t), t).toBe('math');
    for (const t of ['Thick and thin value', 'The driest board gets the biggest bets', 'Why small wins on 754', 'Weak pairs must pay on 732', 'A72 bets small for another reason'])
      expect(ev(t), t).toBe('solver');
  });

  it('follows the voice rules', () => {
    for (const s of strings(l)) {
      expect(s).not.toMatch(/[;:–—!]/);
      for (const sentence of s.split(/(?<=[.?])\s+/)) {
        expect((sentence.match(/,/g) ?? []).length, sentence).toBeLessThanOrEqual(1);
        expect(sentence.split(/\s+/).length, sentence).toBeLessThan(20);
      }
    }
    expect(JSON.stringify(l)).not.toMatch(/\b(books?|videos?|websites?|https?|podcasts?)\b/i);
  });
});

describe('textures no longer say wet means big', () => {
  it('ties size to thick value in the texture and sizing lessons', () => {
    const all = (key: string) => JSON.stringify(lesson(key));
    expect(all('postflop/textures/texture-classes')).not.toMatch(/Dynamic boards push toward bigger bets/);
    expect(all('postflop/textures/texture-classes')).toContain('Size follows thick value and the nut edge');
    expect(all('postflop/cbet/sizing')).not.toMatch(/Dynamic boards where value needs protection/);
  });
});

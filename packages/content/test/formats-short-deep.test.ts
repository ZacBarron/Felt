import {
  actionFrequencies,
  actionRange,
  bluffBreakeven,
  buildChart,
  categoryOf,
  chanceAnyoneHolds,
  equityVsRange,
  evaluate,
  firstInShares,
  geometricBetFraction,
  HandCategory,
  handClassCombos,
  handClassOf,
  impliedOddsNeeded,
  mdf,
  parseCards,
  parseComboRange,
  rangeToCombos,
  rankIndex,
  remainingDeck,
  seededRng,
  spr,
  type Card,
  type WeightedCombo,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, LESSON_CONTENT, STARTER_CHARTS, type LessonArt, type LessonContent, type LessonStep } from '../src';

/**
 * Short handed (6-max) and deep stack lessons. Every chart share, combo
 * count, SPR, price and equity they state is recomputed here with
 * @felt/core. Chart numbers come from Suited's starter charts.
 */

const KEYS = [
  'formats/short-handed/fewer-players',
  'formats/short-handed/blind-battles',
  'formats/short-handed/postflop-6max',
  'formats/deep-stacks/deep-changes',
  'formats/deep-stacks/one-pair-deep',
  'formats/deep-stacks/preflop-deep',
] as const;

const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
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
const bars = (a: LessonArt) => {
  if (a.kind !== 'bars') throw new Error('not bars');
  return a.bars.map((b) => b.value);
};
const chips = (a: LessonArt) => {
  if (a.kind !== 'chips') throw new Error('not chips');
  return a.stacks.map((s) => s.bb);
};
const rows = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind !== 'table') throw new Error(`${key}: "${title}" is not a table`);
  return s.rows;
};
const text = (key: string) => JSON.stringify(lesson(key));
const r0 = (x: number) => Math.round(x);
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number, digits = 1) => (x * 100).toFixed(digits);

const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
const freq = (id: string, action: string) => actionFrequencies(chart(id))[action] ?? 0;
const opens = (ids: string[]) => ids.map((id) => freq(id, 'raise'));
const SIX = ['utg', 'hj', 'co', 'btn', 'sb'].map((s) => `6max-100-rfi-${s}`);
const NINE = ['utg', 'utgp1', 'utgp2', 'lj', 'hj', 'co', 'btn', 'sb'].map((s) => `9max-100-rfi-${s}`);

function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => (['key', 'kind', 'cards', 'board', 'chartId', 'choiceCards', 'tone', 'evidence', 'level', 'unit'].includes(k) ? [] : strings(x)));
  return [];
}

describe('short handed and deep stack lessons: shape and voice', () => {
  it('sit in the Other formats track after heads up', () => {
    const track = CURRICULUM.find((t) => t.id === 'formats')!;
    const ids = track.modules.map((m) => m.id);
    expect(ids).toContain('short-handed');
    expect(ids).toContain('deep-stacks');
    if (ids.includes('heads-up')) expect(ids.indexOf('heads-up')).toBeLessThan(ids.indexOf('short-handed'));
    expect(ids.indexOf('short-handed')).toBeLessThan(ids.indexOf('deep-stacks'));
    for (const key of KEYS) expect(LESSON_CONTENT.has(key), key).toBe(true);
  });

  it('teach with pictures and questions, never 2 text steps in a row', () => {
    const textOnly = new Set(['intro', 'text', 'callout']);
    for (const key of KEYS) {
      const l = lesson(key);
      expect(l.level).toBe('advanced');
      expect(l.steps.filter((s) => ['visual', 'hand', 'board', 'chart'].includes(s.kind)).length, key).toBeGreaterThanOrEqual(3);
      expect(l.steps.filter((s) => s.kind === 'quiz').length, key).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < l.steps.length; i++) expect(textOnly.has(l.steps[i].kind) && textOnly.has(l.steps[i - 1].kind), `${key} step ${i}`).toBe(false);
      // Every text and table step says how sure it is.
      for (const s of l.steps) if (s.kind === 'text' || s.kind === 'table') expect(s.evidence, `${key}: ${s.title}`).toBeDefined();
      // Explanations point back at what the lesson showed.
      for (const s of l.steps) if (s.kind === 'quiz') expect(s.explain, s.question).toMatch(/^Like the /);
    }
  });

  it('follow the voice rules', () => {
    for (const key of KEYS) {
      for (const s of strings(lesson(key))) {
        expect(s, key).not.toMatch(/[;–—!]/);
        for (const sentence of s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/)) {
          expect((sentence.match(/,/g) ?? []).length, `${key}: ${sentence}`).toBeLessThanOrEqual(1);
          expect(sentence.split(/\s+/).length, `${key}: ${sentence}`).toBeLessThan(20);
        }
      }
      expect(text(key), key).not.toMatch(/\b(books?|authors?|videos?|websites?|www|https?|podcasts?|forums?|courses?)\b/i);
    }
  });
});

/* Fewer players, wider ranges ---------------------------------------------- */

describe('fewer players, wider ranges', () => {
  const key = 'formats/short-handed/fewer-players';
  const premium = ['AA', 'KK', 'QQ', 'AKs', 'AKo'].flatMap((h) => handClassCombos(h));
  const behind = (players: number) => chanceAnyoneHolds(premium, parseCards('JsTs'), players);

  it('quotes the open rate for each count of players behind', () => {
    const nine = opens(NINE);
    const six = opens(SIX);
    expect(rows(key, 'Opens by players behind')).toEqual(
      nine.map((o, i) => [String(8 - i), ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'][i], i < 3 ? 'None' : ['UTG', 'HJ', 'CO', 'BTN', 'SB'][i - 3], `${pct(o)}%`]),
    );
    // A 6-max seat opens exactly what the 9-handed seat with the same players behind opens.
    six.forEach((o, i) => expect(o).toBe(nine[i + 3]));
    expect(bars(art(key, 'The first seat at two tables'))).toEqual([r1(nine[0] * 100), r1(six[0] * 100)]);
    // The small blind opens a little less than the button.
    expect(six[4]).toBeLessThan(six[3]);
  });

  it('counts the chance a player behind holds QQ+ or AK, exactly', () => {
    expect(premium).toHaveLength(34);
    expect(behind(1)).toBeCloseTo(34 / 1225, 12);
    expect(bars(art(key, 'QQ+ or AK somewhere behind you'))).toEqual([1, 5, 8].map((n) => r1(behind(n) * 100)));
    expect([1, 5, 8].map((n) => pct(behind(n)))).toEqual(['2.8', '13.3', '20.7']);
    const s = step(key, 'How often someone behind is strong');
    expect(s.kind === 'formula' && s.example).toContain('**13.3%**');
  });

  it('describes the 6-max UTG chart', () => {
    const utg = chart('6max-100-rfi-utg');
    const lj = chart('9max-100-rfi-lj');
    for (const [hand, mix] of utg.mixes) expect(lj.mixes.get(hand), hand).toEqual(mix);
    for (const hand of ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AJo', 'KQo']) expect(utg.mixes.get(hand), hand).toEqual({ raise: 1 });
    expect(utg.mixes.get('33')!.raise).toBeLessThan(1);
    // Weaker offsuit hands are close calls or folds.
    for (const hand of ['ATo', 'KJo', 'KTo', 'QJo', 'QTo', 'JTo', 'A9o', 'K9o']) expect(utg.mixes.get(hand)!.raise ?? 0, hand).toBeLessThan(1);
  });
});

/* More 3bets and blind battles ---------------------------------------------- */

describe('more 3bets and blind battles', () => {
  const key = 'formats/short-handed/blind-battles';
  const six = firstInShares(opens(SIX));
  const nine = firstInShares(opens(NINE));

  it('prices the blinds per 100 hands', () => {
    const cost = (seats: number) => (100 / seats) * 1.5;
    expect(bars(art(key, 'What the blinds cost'))).toEqual([r1(cost(9)), cost(6)]);
    expect(bars(lesson(key).cover)).toEqual([r1(cost(9)), cost(6)]);
  });

  it('estimates how often it folds to the button and the small blind', () => {
    expect(rows(key, 'How often it folds to you')).toEqual([
      ['Button', `${pct(six.reached[3])}%`, `${pct(nine.reached[6])}%`],
      ['Small blind', `${pct(six.reached[4])}%`, `${pct(nine.reached[7])}%`],
    ]);
    expect(pct(six.reached[3])).toBe('46.0');
    expect(pct(freq('6max-100-rfi-btn', 'raise'))).toBe('42.7');
  });

  it('quotes 3bet shares from the defense charts', () => {
    const ids = ['9max-100-bb-vs-utg', '6max-100-btn-vs-co', '6max-100-bb-vs-co', '6max-100-bb-vs-btn', '6max-100-sb-vs-btn'];
    const shares = ids.map((id) => freq(id, '3bet'));
    expect(bars(art(key, '3bets by spot'))).toEqual(shares.map((x) => r1(x * 100)));
    // Later openers face more 3bets.
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan(shares[i - 1]);
    // At 6-max more of the opens come from the last 3 seats.
    const late = (f: typeof six, n: number) => (f.opens[n - 3] + f.opens[n - 2] + f.opens[n - 1]) / (1 - f.nobody);
    expect(late(six, 5)).toBeGreaterThan(late(nine, 8));
  });

  it('agrees with the small blind and big blind charts', () => {
    const sb = chart('6max-100-sb-vs-btn');
    expect(freq('6max-100-sb-vs-btn', 'call')).toBe(0);
    expect(pct(freq('6max-100-sb-vs-btn', '3bet'))).toBe('17.4');
    expect(sb.mixes.get('KQo')).toEqual({ '3bet': 1 });
    // KJo and A9o 3bet part of the time from both blinds.
    for (const id of ['6max-100-sb-vs-btn', '6max-100-bb-vs-btn']) {
      for (const hand of ['KJo', 'A9o']) {
        const t = chart(id).mixes.get(hand)!['3bet'] ?? 0;
        expect(t, `${id} ${hand}`).toBeGreaterThan(0);
        expect(t, `${id} ${hand}`).toBeLessThan(1);
      }
    }
    expect(pct(freq('9max-100-bb-vs-utg', '3bet'))).toBe('3.0');
    expect(pct(freq('6max-100-bb-vs-btn', '3bet'))).toBe('10.2');
  });

  it('counts how much of the button range continues against a 3bet', () => {
    const c = chart('6max-100-btn-vs-3bet');
    const keep = (freq(c.spec.id, '4bet') + freq(c.spec.id, 'call')) / freq('6max-100-rfi-btn', 'raise');
    // Only hands the button opened reach the spot.
    expect(c.spec.reach).toBe(STARTER_CHARTS.find((x) => x.id === '6max-100-rfi-btn')!.actions[0].range);
    const ring = art(key, 'The button folds half its opens');
    expect(ring.kind === 'ring' && ring.value).toBe(Math.round(keep * 1000) / 1000);
    expect(pct(keep)).toBe('47.5');
  });
});

/* Postflop at 6-max ---------------------------------------------------------- */

/** Weighted share of a range in each strength group on a flop. Pairs count as top pair when they pair the top card or beat it. */
function hits(range: Map<string, number>, board: Card[]) {
  const top = Math.max(...board.map(rankIndex));
  let all = 0;
  let topPairPlus = 0;
  let twoPairPlus = 0;
  let noPair = 0;
  for (const c of rangeToCombos(range, board)) {
    const cat = categoryOf(evaluate([...c.cards, ...board]));
    const [a, b] = c.cards.map(rankIndex);
    all += c.weight;
    if (cat >= HandCategory.TwoPair) twoPairPlus += c.weight;
    if (cat >= HandCategory.TwoPair || (cat === HandCategory.Pair && (a === top || b === top || (a === b && a > top)))) topPairPlus += c.weight;
    if (cat === HandCategory.HighCard) noPair += c.weight;
  }
  return { topPairPlus: topPairPlus / all, twoPairPlus: twoPairPlus / all, noPair: noPair / all };
}

describe('postflop at 6-max', () => {
  const key = 'formats/short-handed/postflop-6max';
  const range = (id: string, action: string) => actionRange(chart(id), action);
  const ace = parseCards('Ah8d3c');
  const low = parseCards('7s6d5c');

  it('estimates the share of opens from the cutoff or button', () => {
    const share = (f: ReturnType<typeof firstInShares>, n: number) => (f.opens[n - 3] + f.opens[n - 2]) / (1 - f.nobody);
    const six = share(firstInShares(opens(SIX)), 5);
    const nine = share(firstInShares(opens(NINE)), 8);
    expect(bars(art(key, 'Opens from the cutoff or button'))).toEqual([r1(nine * 100), r1(six * 100)]);
  });

  it('measures top pair or better on the ace high flop', () => {
    const shares = [
      range('9max-100-rfi-utg', 'raise'),
      range('6max-100-rfi-utg', 'raise'),
      range('6max-100-rfi-btn', 'raise'),
      range('6max-100-bb-vs-btn', 'call'),
    ].map((r) => hits(r, ace).topPairPlus);
    expect(bars(art(key, 'Top pair or better on A♥8♦3♣'))).toEqual(shares.map((x) => r1(x * 100)));
    expect(bars(lesson(key).cover)).toEqual(shares.slice(2).map((x) => r1(x * 100)));
    // Wider ranges hit less often.
    for (let i = 1; i < 3; i++) expect(shares[i]).toBeLessThan(shares[i - 1]);
    // The big blind 3bets AK and AQ suited, so those never reach this flop in its calls.
    for (const hand of ['AKs', 'AKo', 'AQs']) expect(chart('6max-100-bb-vs-btn').mixes.get(hand)!.call ?? 0, hand).toBe(0);
  });

  it('measures two pair or better on the low connected flop', () => {
    const btn = hits(range('6max-100-rfi-btn', 'raise'), low).twoPairPlus;
    const bb = hits(range('6max-100-bb-vs-btn', 'call'), low).twoPairPlus;
    expect(bars(art(key, 'Two pair or better on 7♠6♦5♣'))).toEqual([r1(btn * 100), r1(bb * 100)]);
    // Nearly twice the share.
    expect(bb / btn).toBeGreaterThan(1.8);
    expect(bb / btn).toBeLessThan(2);
  });

  it('prices defense against a 1/3 pot bet', () => {
    const ring = art(key, 'Small bets need wide defense');
    expect(ring.kind === 'ring' && ring.value).toBe(mdf(1, 1 / 3));
    expect(1 - mdf(1, 1 / 3)).toBeCloseTo(bluffBreakeven(1, 1 / 3), 12);
    expect(pct(hits(range('6max-100-bb-vs-btn', 'call'), ace).noPair)).toBe('57.1');
    // A♥8♦3♣ is rainbow and 7♠6♦5♣ has no two of a suit either.
    for (const b of [ace, low]) expect(new Set(b.map((c) => c & 3)).size).toBe(3);
  });
});

/* What changes deep --------------------------------------------------------- */

describe('what changes deep', () => {
  const key = 'formats/deep-stacks/deep-changes';
  // BTN opens 2.5bb with the small blind's 0.5bb in. A call makes 5.5bb. A 3bet to 11bb called makes 22.5bb.
  const srp = 2.5 + 2.5 + 0.5;
  const tbp = 11 + 11 + 0.5;
  const set = 1 - (48 * 47 * 46) / (50 * 49 * 48);

  it('computes SPR at both depths', () => {
    expect([srp, tbp]).toEqual([5.5, 22.5]);
    expect(rows(key, 'SPR at 100bb and 200bb')).toEqual([
      ['Single raised pot', '5.5bb', spr(97.5, srp).toFixed(1), spr(197.5, srp).toFixed(1)],
      ['3bet pot', '22.5bb', spr(89, tbp).toFixed(1), spr(189, tbp).toFixed(1)],
    ]);
    expect(chips(art(key, 'A 3bet pot at 200bb'))).toEqual([tbp, 200 - 11]);
    expect(chips(lesson(key).cover)).toEqual([tbp, 100 - 11, 200 - 11]);
  });

  it('computes geometric sizes to get stacks in', () => {
    expect(bars(art(key, 'Geometric sizing in a 3bet pot'))).toEqual([89, 189].map((s) => r0(geometricBetFraction(tbp, s, 3) * 100)));
    expect([97.5, 197.5].map((s) => r0(geometricBetFraction(srp, s, 3) * 100))).toEqual([116, 159]);
    // "About half pot 3 times" gets a 100bb 3bet pot all in.
    expect(geometricBetFraction(tbp, 89, 3)).toBeCloseTo(0.54, 2);
  });

  it('prices set mining a 3bet exactly', () => {
    expect(pct(set)).toBe('11.8');
    // Called 8.5bb more into 2.5 + 11 + 0.5 = 14bb.
    const extra = impliedOddsNeeded(14, 8.5, set);
    expect(extra.toFixed(1)).toBe('49.8');
    expect(bars(art(key, 'Share of the stack you must win'))).toEqual([89, 189].map((s) => r0((extra / s) * 100)));
    expect(text(key)).toContain('**49.8bb**');
  });
});

/* One pair hands deep ------------------------------------------------------- */

/** Exact equity of a hand against weighted combos on a flop, over every turn and river. */
function flopEquity(hero: Card[], combos: WeightedCombo[], board: Card[]): number {
  let total = 0;
  let weight = 0;
  for (const c of combos) {
    const dead = new Set([...hero, ...board, ...c.cards]);
    const deck = Array.from({ length: 52 }, (_, i) => i).filter((x) => !dead.has(x));
    let share = 0;
    let n = 0;
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        const full = [...board, deck[i], deck[j]];
        const h = evaluate([...hero, ...full]);
        const v = evaluate([...c.cards, ...full]);
        share += h > v ? 1 : h === v ? 0.5 : 0;
        n++;
      }
    }
    total += (c.weight * share) / n;
    weight += c.weight;
  }
  return total / weight;
}

describe('one pair hands deep', () => {
  const key = 'formats/deep-stacks/one-pair-deep';
  const calls = actionRange(chart('6max-100-bb-vs-btn'), 'call');

  function split(heroText: string, boardText: string) {
    const hero = parseCards(heroText);
    const board = parseCards(boardText);
    const mine = evaluate([...hero, ...board]);
    const top = Math.max(...board.map(rankIndex));
    const combos = rangeToCombos(calls, [...hero, ...board]);
    const sum = (cs: WeightedCombo[]) => cs.reduce((s, c) => s + c.weight, 0);
    const cat = (c: WeightedCombo) => categoryOf(evaluate([...c.cards, ...board]));
    const twoPairPlus = combos.filter((c) => cat(c) >= HandCategory.TwoPair);
    const topPairPlus = combos.filter((c) => {
      const [a, b] = c.cards.map(rankIndex);
      return cat(c) >= HandCategory.TwoPair || (cat(c) === HandCategory.Pair && (a === top || b === top || (a === b && a > top)));
    });
    const beats = combos.filter((c) => evaluate([...c.cards, ...board]) > mine);
    return { hero, board, combos, sum, twoPairPlus, topPairPlus, beats };
  }

  it('counts what the big blind holds on K♦8♣4♠', () => {
    const { combos, sum, twoPairPlus, topPairPlus, board } = split('Kh9d', 'Kd8c4s');
    const cls = (c: WeightedCombo) => handClassOf(c.cards[0], c.cards[1]);
    const of = (test: (h: string) => boolean) => sum(topPairPlus.filter((c) => categoryOf(evaluate([...c.cards, ...board])) === HandCategory.Pair && test(cls(c))));
    const kicker = (h: string) => h[1];
    const better = of((h) => h[0] === 'K' && ['Q', 'J', 'T'].includes(kicker(h)));
    const same = of((h) => h[0] === 'K' && kicker(h) === '9');
    const worse = of((h) => h[0] === 'K' && '765432'.includes(kicker(h)));
    const rest = sum(combos) - sum(topPairPlus);
    // Every top pair or better is one of these groups.
    expect(sum(twoPairPlus) + better + same + worse).toBeCloseTo(sum(topPairPlus), 9);
    expect(rows(key, 'What the big blind can hold').map((r) => r[1])).toEqual([sum(twoPairPlus), better, same, worse, rest].map((x) => x.toFixed(1)));
    // The two pair or better are exactly 88, 44, K8, K4 and 84s. The big blind 3bets KK.
    expect([...new Set(twoPairPlus.map(cls))].sort()).toEqual(['44', '84s', '88', 'K4o', 'K4s', 'K8o', 'K8s']);
    expect(chart('6max-100-bb-vs-btn').mixes.get('KK')!.call ?? 0).toBe(0);
  });

  it('computes K9 and QQ equity against each part, exactly', () => {
    const k9 = split('Kh9d', 'Kd8c4s');
    const qq = split('QsQd', 'Jh8c3d');
    const eq = (s: typeof k9) => [s.combos, s.topPairPlus, s.twoPairPlus].map((cs) => flopEquity(s.hero, cs, s.board));
    const k9eq = eq(k9);
    const qqeq = eq(qq);
    expect(bars(art(key, 'K9 against each part'))).toEqual(k9eq.map((x) => r1(x * 100)));
    expect(bars(art(key, 'Q♠Q♦ against each part'))).toEqual(qqeq.map((x) => r1(x * 100)));
    expect(k9eq.map((x) => pct(x))).toEqual(['82.0', '43.3', '12.8']);
    expect(pct(qqeq[2])).toBe('19.3');
    expect(qqeq[1]).toBeGreaterThan(k9eq[1]);
    // Only sets and two pair beat the overpair, 3.1% of the calls.
    expect(pct(qq.sum(qq.beats) / qq.sum(qq.combos))).toBe('3.1');
    expect(qq.beats.every((c) => categoryOf(evaluate([...c.cards, ...qq.board])) >= HandCategory.TwoPair)).toBe(true);
  }, 60_000);
});

/* Preflop deep -------------------------------------------------------------- */

describe('preflop deep', () => {
  const key = 'formats/deep-stacks/preflop-deep';

  it('computes SPR after each raise', () => {
    const after = (raise: number, stack: number) => spr(stack - raise, 2 * raise + 0.5).toFixed(1);
    expect(rows(key, 'SPR after each raise')).toEqual([
      ['3bet to 11bb, called', after(11, 100), after(11, 200)],
      ['3bet to 13bb, called', after(13, 100), after(13, 200)],
      ['4bet to 24bb, called', after(24, 100), after(24, 200)],
    ]);
    expect(chips(art(key, 'A called 4bet at 200bb'))).toEqual([48.5, 176]);
    expect(chips(lesson(key).cover)).toEqual([48.5, 176]);
  });

  it('prices a 5bet bluff shove', () => {
    // The pot before the shove: the 4bet, the 3bet and the small blind.
    const pot = 24 + 11 + 0.5;
    expect(bars(art(key, '5bet bluffs need more folds'))).toEqual([100, 200].map((s) => r1(bluffBreakeven(pot, s - 11) * 100)));
  });

  it('checks equity against QQ+ and AK by sampling', () => {
    // Exact over every board, averaged over the combos left (computed once by enumeration with exactEquity; checked here by sampling).
    const EXACT = { KsQd: 20.751, AsQd: 24.42, AsQs: 28.607, '8s7s': 30.781 };
    for (const [hand, exact] of Object.entries(EXACT)) {
      const hero = parseCards(hand) as [Card, Card];
      const e = equityVsRange(hero, parseComboRange('QQ+, AK', hero), [], { iterations: 60_000, rng: seededRng(11) }).equity * 100;
      expect(Math.abs(e - exact), hand).toBeLessThan(0.5);
    }
    expect(bars(art(key, 'Equity against QQ+ and AK'))).toEqual(Object.values(EXACT).map(Math.round));
  }, 30_000);

  it('counts straights or better that use your cards by the river, exactly', () => {
    const bigHands = (hand: string) => {
      const hero = parseCards(hand);
      const deck = remainingDeck(hero);
      const L = deck.length;
      const b = [0, 0, 0, 0, 0];
      let n = 0;
      let made = 0;
      for (let i = 0; i < L; i++)
        for (let j = i + 1; j < L; j++)
          for (let k = j + 1; k < L; k++)
            for (let l = k + 1; l < L; l++)
              for (let m = l + 1; m < L; m++) {
                b[0] = deck[i];
                b[1] = deck[j];
                b[2] = deck[k];
                b[3] = deck[l];
                b[4] = deck[m];
                const v = evaluate([hero[0], hero[1], ...b]);
                n++;
                if (categoryOf(v) >= HandCategory.Straight && v > evaluate(b)) made++;
              }
      return made / n;
    };
    const shares = ['AsQd', 'AsQs', '8s7d', '8s7s'].map(bigHands);
    expect(bars(art(key, 'Big hands by the river'))).toEqual(shares.map((x) => r1(x * 100)));
    // Being suited adds about 4 points.
    expect(r0((shares[1] - shares[0]) * 100)).toBe(4);
    expect(r0((shares[3] - shares[2]) * 100)).toBe(4);
  }, 120_000);
});

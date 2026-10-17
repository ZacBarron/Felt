import {
  buildChart,
  categoryOf,
  chanceAnyoneHolds,
  equityVsRange,
  evaluate,
  exactEquity,
  geometricBetFraction,
  handClassCombos,
  HandCategory,
  mdf,
  parseCards,
  parseComboRange,
  potOdds,
  primaryAction,
  rankIndex,
  seededRng,
  spr,
  type Card,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, LESSON_CONTENT, quizVersions, STARTER_CHARTS, type LessonArt, type LessonContent, type LessonStep, type QuizStep } from '../src';

/**
 * The thin spots pass: 27 lessons on defending opens from every seat, 3bet
 * and 4bet pots before and after the flop, squeezes, overcalls, cold 4bets,
 * blind vs blind, straddled and limped pots, multiway 3bet pots and 6-max
 * defense. Every price, SPR, fold share, combo count and equity is
 * recomputed here, for every version of every question.
 */

const NEW: Record<string, string[]> = {
  'preflop/vs-open': ['bb-vs-early', 'vs-early-open', 'cold-call-ip', 'defend-by-size'],
  'preflop/3bet-pots': ['vs-3bet-oop', 'vs-3bet-ip', 'facing-4bet', '4bet-depth', 'sb-vs-bb-3bet', 'bb-vs-sb-limp'],
  'preflop/multiway-preflop': ['facing-squeeze', 'overcalls', 'cold-4bet'],
  'preflop/live-preflop': ['straddle-defense', 'straddle-3bets', 'limp-reraise', 'live-3bets'],
  'postflop/3bet-postflop': ['3bp-ip-3bettor', '3bp-oop-caller', 'vs-3bp-cbet', '3bp-turns', '3bp-low-boards', '4bet-pots'],
  'postflop/multiway': ['limped-postflop', 'straddled-postflop', 'multiway-3bp'],
  'formats/short-handed': ['6max-defense'],
};
const KEYS = Object.entries(NEW).flatMap(([m, ids]) => ids.map((id) => `${m}/${id}`));

const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
const quizzes = (key: string) => lesson(key).steps.filter((s): s is QuizStep => s.kind === 'quiz');
/** The version of a question, base or variant, with exactly this wording. */
const version = (key: string, question: string): QuizStep => {
  const v = quizzes(key)
    .flatMap((q) => quizVersions(q))
    .find((x) => x.question === question);
  if (!v) throw new Error(`${key}: no question "${question}"`);
  return v;
};
const answer = (key: string, question: string) => {
  const v = version(key, question);
  return v.choices[v.answer];
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
const rows = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind !== 'table') throw new Error(`${key}: "${title}" is not a table`);
  return s.rows;
};
const caption = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind === 'visual' || s.kind === 'hand' || s.kind === 'board') return s.caption;
  if (s.kind === 'formula') return s.example;
  throw new Error(`${key}: "${title}" has no caption`);
};
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number) => `${r1(x * 100)}%`;
const bars = (a: LessonArt) => {
  if (a.kind !== 'bars') throw new Error('not bars');
  return a.bars.map((b) => b.value);
};
const chips = (a: LessonArt) => {
  if (a.kind !== 'chips') throw new Error('not chips');
  return a.stacks.map((s) => s.bb);
};
/** Price to call: `call` more into a pot that already holds `pot`. */
const price = (pot: number, call: number) => potOdds(pot, call);
/** Folds a bet of `risk` needs to win `pot`. */
const folds = (pot: number, risk: number) => risk / (pot + risk);
const strings = (v: unknown, skip = new Set(['key', 'kind', 'cards', 'board', 'chartId', 'choiceCards', 'tone', 'evidence', 'level', 'unit'])): string[] =>
  typeof v === 'string' ? [v]
  : Array.isArray(v) ? v.flatMap((x) => strings(x, skip))
  : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => (skip.has(k) ? [] : strings(x, skip)))
  : [];

/* Shape and voice ----------------------------------------------------------- */

describe('thin spots: shape and voice', () => {
  it('adds 27 lessons at the end of the right topics, after the lessons already there', () => {
    expect(KEYS).toHaveLength(27);
    for (const [mod, ids] of Object.entries(NEW)) {
      const [t, m] = mod.split('/');
      const lessons = CURRICULUM.find((x) => x.id === t)!.modules.find((x) => x.id === m)!.lessons.map((l) => l.id);
      if (mod === 'preflop/multiway-preflop') expect(lessons).toEqual(ids);
      else expect(lessons.slice(-ids.length), mod).toEqual(ids);
    }
    // The new topic sits right after 3bet and 4bet pots, so the first topic of each track stays free.
    const preflop = CURRICULUM.find((t) => t.id === 'preflop')!.modules.map((m) => m.id);
    expect(preflop.indexOf('multiway-preflop')).toBe(preflop.indexOf('3bet-pots') + 1);
    expect(preflop[0]).toBe('rfi');
  });

  it('teach with pictures, ask at least 3 questions and say how sure each claim is', () => {
    const textOnly = new Set(['intro', 'text', 'callout']);
    for (const key of KEYS) {
      const l = lesson(key);
      expect(l.level, key).toBe('advanced');
      expect(l.steps.filter((s) => ['visual', 'hand', 'board', 'chart'].includes(s.kind)).length, key).toBeGreaterThanOrEqual(3);
      expect(quizzes(key).length, key).toBeGreaterThanOrEqual(3);
      expect(l.steps[0].kind, key).toBe('intro');
      expect(l.steps.at(-1)?.kind, key).toBe('takeaway');
      for (let i = 1; i < l.steps.length; i++) expect(textOnly.has(l.steps[i].kind) && textOnly.has(l.steps[i - 1].kind), `${key} step ${i}`).toBe(false);
      for (const s of l.steps) if (s.kind === 'text' || s.kind === 'table') expect(s.evidence, `${key}: ${s.title}`).toBeDefined();
    }
  });

  it('follow the voice rules in every version of every question', () => {
    const bad: string[] = [];
    for (const key of KEYS) {
      for (const s of strings(lesson(key))) {
        if (/[;–—!]/.test(s)) bad.push(`${key}: punctuation in "${s}"`);
        for (const sentence of s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/)) {
          if ((sentence.match(/,/g) ?? []).length > 1) bad.push(`${key}: commas in "${sentence}"`);
          if (sentence.split(/\s+/).length >= 20) bad.push(`${key}: long "${sentence}"`);
        }
      }
      expect(JSON.stringify(lesson(key)), key).not.toMatch(/\b(books?|authors?|videos?|websites?|www|https?|podcasts?|forums?|courses?)\b/i);
    }
    expect(bad).toEqual([]);
  });

  it('vary the seats, stack depths and table sizes they ask about', () => {
    const asked = KEYS.flatMap((k) => quizzes(k).flatMap((q) => quizVersions(q).map((v) => v.question))).join(' ');
    for (const seat of ['UTG ', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'cutoff', 'button', 'small blind', 'big blind', 'straddle']) expect(asked, seat).toContain(seat);
    for (const depth of ['30bb', '40bb', '50bb', '60bb', '100bb', '150bb', '200bb', '250bb']) expect(asked, depth).toContain(depth);
    expect(asked).toContain('6-max');
  });
});

/* Defending opens ----------------------------------------------------------- */

describe('defending opens from every seat', () => {
  it('prices the big blind against opens of every size', () => {
    const key = 'preflop/vs-open/bb-vs-early';
    expect(bars(art(key, 'The price does not change'))).toEqual([r1(price(4, 1.5) * 100), r1(price(4, 1.5) * 100), r1(price(4.5, 2) * 100)]);
    expect(answer(key, 'UTG opens 3bb and the small blind folds. What raw equity does a big blind call need?')).toBe(`About ${Math.round(price(4.5, 2) * 100)}%`);
    expect(answer(key, 'The LJ opens 2.5bb and the small blind folds. What raw equity does a big blind call need?')).toBe(`About ${Math.round(price(4, 1.5) * 100)}%`);
    expect(answer(key, 'UTG+1 opens 2bb and the small blind folds. What raw equity does a big blind call need?')).toBe(`About ${Math.round(price(3.5, 1) * 100)}%`);
    expect(answer(key, 'UTG+2 opens 3bb and the small blind folds. What raw equity does a big blind call need?')).toBe(`About ${Math.round(price(4.5, 2) * 100)}%`);
  });

  it('estimates equity against a tight early range and a wide late range', () => {
    const TIGHT = '77+, ATs+, KJs+, QJs, AJo+, KQo';
    const WIDE = '22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A8o+, KTo+, QTo+, JTo';
    const size = (r: string) => parseComboRange(r).length / 1326;
    expect(Math.round(size(TIGHT) * 100)).toBe(9);
    expect(Math.round(size(WIDE) * 100)).toBe(26);
    const eq = (hand: string, range: string) => {
      const h = parseCards(hand) as [Card, Card];
      return equityVsRange(h, parseComboRange(range, h), [], { iterations: 60000, rng: seededRng(3) }).equity * 100;
    };
    const table = rows('preflop/vs-open/bb-vs-early', 'Raw equity clears the price');
    const cards: Record<string, string> = { 'K♠J♦': 'KsJd', 'A♦9♣': 'Ad9c', '7♥6♥': '7h6h', 'J♣6♣': 'Jc6c' };
    for (const [hand, tight, wide] of table) {
      expect(Math.abs(eq(cards[hand], TIGHT) - Number.parseInt(tight)), `${hand} tight`).toBeLessThan(1.2);
      expect(Math.abs(eq(cards[hand], WIDE) - Number.parseInt(wide)), `${hand} wide`).toBeLessThan(1.2);
      // Every hand clears the 27.3% price, which is the lesson's point.
      expect(Number.parseInt(tight)).toBeGreaterThan(27.3);
    }
  });

  it('agrees with the charts on which hands fold against UTG', () => {
    const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
    const utg = chart('9max-100-bb-vs-utg');
    const btn = chart('9max-100-bb-vs-btn');
    const q = quizzes('preflop/vs-open/bb-vs-early')[1];
    for (const v of quizVersions(q)) {
      const hands = v.choiceCards!.map((c) => {
        const [a, b] = parseCards(c);
        const hi = Math.max(rankIndex(a), rankIndex(b));
        const lo = Math.min(rankIndex(a), rankIndex(b));
        const r = '23456789TJQKA';
        return hi === lo ? r[hi] + r[lo] : r[hi] + r[lo] + (c[1] === c[3] ? 's' : 'o');
      });
      hands.forEach((h, i) => {
        const mix = utg.mixes.get(h)!;
        if (i === v.answer) expect(mix, h).toEqual({ fold: 1 });
        else expect(mix.fold ?? 0, h).toBeLessThan(0.5);
      });
      // The folded suited hands still call against the button.
      const folded = hands[v.answer];
      if (folded.endsWith('s')) expect(primaryAction(btn.mixes.get(folded)!)).toBe('call');
    }
    expect(utg.mixes.get('KJo')!.fold).toBeGreaterThan(0.5);
    // Offsuit hands below KQo and AJo mostly fold.
    for (const h of ['KJo', 'KTo', 'QJo', 'ATo', 'A9o', 'QTo', 'JTo']) expect(utg.mixes.get(h)!.fold ?? 0, h).toBeGreaterThan(0.5);
    for (const h of ['KQo', 'AJo']) expect(utg.mixes.get(h)!.fold ?? 0, h).toBeLessThan(0.5);
  });

  it('counts players behind holding QQ+ or AK, exactly', () => {
    const premium = ['AA', 'KK', 'QQ', 'AKs', 'AKo'].flatMap((h) => handClassCombos(h));
    const behind = (n: number) => chanceAnyoneHolds(premium, parseCards('8h7h'), n);
    expect(bars(art('preflop/vs-open/vs-early-open', 'Someone behind holds QQ+ or AK'))).toEqual([2, 4, 6].map((n) => r1(behind(n) * 100)));
    const key = 'preflop/vs-open/vs-early-open';
    expect(answer(key, 'You hold 8♥7♥ in the HJ after a UTG open. How often does at least one of the 4 players behind hold QQ+ or AK?')).toBe(`About ${Math.round(behind(4) * 100)}%`);
    expect(answer(key, 'You hold 8♥7♥ in the CO after a UTG open. How often does at least one of the 3 players behind hold QQ+ or AK?')).toBe(`About ${Math.round(behind(3) * 100)}%`);
    expect(answer(key, 'You hold 8♥7♥ in the UTG+2 seat after a UTG open. How often does at least one of the 6 players behind hold QQ+ or AK?')).toBe(`About ${Math.round(behind(6) * 100)}%`);
    expect(bars(art('formats/short-handed/6max-defense', 'Someone behind holds QQ+ or AK'))).toEqual([5, 8].map((n) => r1(behind(n) * 100)));
    // 3bet about 3 times the open.
    expect(answer(key, 'UTG opens 2.5bb and you 3bet from the cutoff. What size fits?')).toBe('About 8bb');
    expect(answer(key, 'UTG+1 opens 3bb and you 3bet from the HJ. What size fits?')).toBe(`About ${3 * 3}bb`);
    expect(answer(key, 'UTG+2 opens 2.5bb and you 3bet from the LJ. What size fits?')).toBe(`About ${Math.round(3 * 2.5)}bb`);
  });

  it('prices cold calls and overcalls', () => {
    const key = 'preflop/vs-open/cold-call-ip';
    expect((lesson(key).cover as { value: number }).value).toBeCloseTo(price(4, 2.5), 12);
    expect(answer(key, 'The CO opens 2.5bb. How much raw equity does a cold call on the button need?')).toBe(pct(price(4, 2.5)));
    expect(answer(key, 'The HJ opens 3bb. How much raw equity does a cold call in the cutoff need?')).toBe(pct(price(4.5, 3)));
    expect(answer(key, 'A live player in the LJ opens 5bb. How much raw equity does a cold call on the button need?')).toBe(pct(price(6.5, 5)));
    expect(answer(key, 'UTG+1 opens 2.5bb. How much raw equity does a cold call in the LJ need?')).toBe(pct(price(4, 2.5)));
    const o = 'preflop/multiway-preflop/overcalls';
    expect(rows(o, 'The price to overcall').map((r) => r[3])).toEqual([price(6.5, 1.5), price(6.5, 2), price(6.5, 2.5)].map(pct));
    expect(answer(o, 'The CO opens 2.5bb and the button calls. What raw equity does a big blind overcall need?')).toBe(pct(price(6.5, 1.5)));
    expect(answer(o, 'The HJ opens 2.5bb and the CO calls. What raw equity does a button overcall need?')).toBe(pct(price(6.5, 2.5)));
    expect(answer(o, 'UTG opens 3bb and the LJ calls. What raw equity does a small blind overcall need?')).toBe(pct(price(7.5, 2.5)));
    // A pair flops a set or better, and two suited cards flop a flush draw or better: both 11.8%.
    const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
    const set = 1 - choose(48, 3) / choose(50, 3);
    const flushDraw = (choose(11, 2) * choose(39, 1) + choose(11, 3)) / choose(50, 3);
    expect(bars(art(o, 'Big hands on the flop'))).toEqual([r1(set * 100), r1(flushDraw * 100)]);
  });

  it('prices steals by open size', () => {
    const key = 'preflop/vs-open/defend-by-size';
    const curve = art(key, 'Bigger opens need more folds');
    if (curve.kind !== 'curve') throw new Error('curve');
    for (const [o, y] of curve.points) expect(y).toBe(r1(folds(1.5, o) * 100));
    expect(lesson(key).cover).toEqual(curve);
    expect(rows(key, 'Open size and the big blind')).toEqual(
      [2, 2.5, 3, 4].map((o) => [`${o}bb`, pct(1 - folds(1.5, o)), pct(price(1.5 + o, o - 1))]),
    );
    expect(answer(key, 'The button opens 3bb and the blinds have 1.5bb in. How often must the blinds fold for a no equity steal to break even?')).toBe(pct(folds(1.5, 3)));
    expect(answer(key, 'The cutoff opens 2bb. How often must the players behind fold for a no equity steal to break even?')).toBe(pct(folds(1.5, 2)));
    expect(answer(key, 'A live HJ opens 5bb. How often must everyone behind fold for a no equity steal to break even?')).toBe(pct(folds(1.5, 5)));
    expect(answer(key, 'UTG+2 opens 2.5bb. How often must everyone behind fold for a no equity steal to break even?')).toBe(pct(folds(1.5, 2.5)));
    for (const [q, o] of [
      ['The button opens 2bb and the small blind folds. What raw equity does a big blind call need?', 2],
      ['The button opens 4bb and the small blind folds. What raw equity does a big blind call need?', 4],
      ['The cutoff opens 3bb and the small blind folds. What raw equity does a big blind call need?', 3],
    ] as const)
      expect(answer(key, q)).toBe(pct(price(1.5 + o, o - 1)));
  });

  it('defends 6-max with the same prices and the charts', () => {
    const key = 'formats/short-handed/6max-defense';
    expect(rows(key, 'The price does not change').map((r) => r[2])).toEqual([price(4, 1.5), price(4, 2), price(4, 2.5), price(3.5, 1)].map(pct));
    expect(answer(key, 'At 6-max the cutoff opens 2.5bb and the small blind folds. What raw equity does a big blind call need?')).toBe(pct(price(4, 1.5)));
    expect(answer(key, 'At 6-max UTG opens 2bb and the small blind folds. What raw equity does a big blind call need?')).toBe(pct(price(3.5, 1)));
    expect(answer(key, 'At 6-max the button opens 3bb and the small blind folds. What raw equity does a big blind call need?')).toBe(pct(price(4.5, 2)));
    const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
    for (const hand of ['Q9o', 'K8o']) {
      expect(chart('6max-100-bb-vs-btn').mixes.get(hand)!.fold ?? 0, hand).toBe(0);
      expect(chart('9max-100-bb-vs-utg').mixes.get(hand), hand).toEqual({ fold: 1 });
    }
  });
});

/* 3bet and 4bet pots before the flop ---------------------------------------- */

describe('3bet and 4bet pots before the flop', () => {
  it('prices calls against 3bets in and out of position', () => {
    const oop = 'preflop/3bet-pots/vs-3bet-oop';
    expect(rows(oop, 'The price out of position')).toEqual([
      ['7.5bb', '5bb', '16.5bb', pct(price(11.5, 5))],
      ['9bb', '6.5bb', '19.5bb', pct(price(13, 6.5))],
    ]);
    expect(answer(oop, 'You open the CO to 2.5bb and the button 3bets to 7.5bb. The blinds fold. What raw equity does a call need?')).toBe(pct(price(11.5, 5)));
    expect(answer(oop, 'You open the HJ to 2.5bb and the cutoff 3bets to 9bb. Everyone else folds. What raw equity does a call need?')).toBe(pct(price(13, 6.5)));
    expect(answer(oop, 'You open UTG to 3bb and the LJ 3bets to 9bb. Everyone else folds. What raw equity does a call need?')).toBe(pct(price(13.5, 6)));
    expect(answer(oop, 'You open UTG+1 to 2.5bb and the HJ 3bets to 7.5bb. Everyone else folds. What raw equity does a call need?')).toBe(pct(price(11.5, 5)));
    expect(chips(art(oop, 'SPR after the call'))).toEqual([16.5, 92.5]);
    expect(r1(spr(92.5, 16.5))).toBe(5.6);
    expect(answer(oop, 'You call a 3bet to 9bb with 100bb stacks. What is the SPR on the flop?')).toBe(`About ${r1(spr(91, 19.5))}`);
    expect(answer(oop, 'You call a 3bet to 7.5bb with 200bb stacks. What is the SPR on the flop?')).toBe(`About ${r1(spr(192.5, 16.5))}`);

    const ip = 'preflop/3bet-pots/vs-3bet-ip';
    expect(rows(ip, 'The price in position').map((r) => r[3])).toEqual([pct(price(14, 8.5)), pct(price(14.5, 8.5)), pct(price(15, 9.5))]);
    expect(answer(ip, 'You open the cutoff to 2.5bb. The small blind 3bets to 11bb and the big blind folds. What raw equity does a call need?')).toBe(pct(price(14.5, 8.5)));
    expect(answer(ip, 'You open the HJ to 2.5bb. The big blind 3bets to 12bb and everyone else folds. What raw equity does a call need?')).toBe(pct(price(15, 9.5)));
    expect(answer(ip, 'You open the button to 2bb. The big blind 3bets to 10bb and the small blind folded. What raw equity does a call need?')).toBe(pct(price(12.5, 8)));
    expect(answer(ip, 'You open the cutoff and call a small blind 3bet to 11bb. Stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(89, 23))}`);
    expect(answer(ip, 'You open the HJ and call a big blind 3bet to 12bb. Stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(88, 24.5))}`);
    expect(answer(ip, 'You open the cutoff and call a small blind 3bet to 11bb. Stacks are 200bb. What is the flop SPR?')).toBe(`About ${r1(spr(189, 23))}`);
  });

  it('prices a 4bet, counts the 5bet bluff and estimates equity against a 4bet range', () => {
    const key = 'preflop/3bet-pots/facing-4bet';
    expect(rows(key, 'The prices').map((r) => r[2])).toEqual([pct(price(35.5, 13)), pct(price(35.5 + 89, 76))]);
    expect(chips(art(key, 'After you call'))).toEqual([48.5, 76]);
    expect(r1(spr(76, 48.5))).toBe(1.6);
    expect(answer(key, 'You 3bet to 11bb from the big blind. The button 4bets to 24bb. What raw equity does a call need?')).toBe(pct(price(35.5, 13)));
    expect(answer(key, 'You 3bet to 7.5bb on the button. The cutoff 4bets to 22bb and the blinds fold. What raw equity does a call need?')).toBe(pct(price(31, 14.5)));
    expect(answer(key, 'You 3bet to 12bb from the small blind. The HJ 4bets to 26bb and the big blind folds. What raw equity does a call need?')).toBe(pct(price(39, 14)));
    expect(answer(key, 'You 3bet to 8bb in the LJ over a UTG+1 open. UTG+1 4bets to 20bb and everyone else folds. What raw equity does a call need?')).toBe(pct(price(29.5, 12)));
    // With A5s: 33 combos of the 4bet range left, 6 of them bluffs. A shove risks 89 to win 35.5.
    for (const hand of ['As5s', 'Ad4d']) {
      const range = parseComboRange('QQ+, AKs, AKo, A5s, A4s', parseCards(hand));
      const bluffs = parseComboRange('A5s, A4s', parseCards(hand));
      expect(range.length).toBe(33);
      expect(bluffs.length).toBe(6);
    }
    expect(caption(key, 'A 5bet bluff fails')).toContain(`${pct(folds(35.5, 89))}`);
    expect(Math.round((6 / 33) * 100)).toBe(18);
    const eq = (hand: string, range: string) => {
      const h = parseCards(hand) as [Card, Card];
      return equityVsRange(h, parseComboRange(range, h), [], { iterations: 60000, rng: seededRng(11) }).equity * 100;
    };
    const values = bars(art(key, 'Equity against a 4bet range'));
    ['QsQd', 'AsKd', 'JsJd', 'AhQh'].forEach((h, i) => expect(Math.abs(eq(h, 'QQ+, AKs, AKo, A5s, A4s') - values[i]), h).toBeLessThan(1.2));
    expect(Math.abs(eq('KhKd', 'QQ+, AKs, AKo') - 57)).toBeLessThan(1.2);
  });

  it('shows how depth turns the 4bet into a shove', () => {
    const key = 'preflop/3bet-pots/4bet-depth';
    const pot = (four: number) => 2 * four + 0.5;
    expect(bars(art(key, 'SPR after a called 4bet'))).toEqual([
      r1(spr(40 - 24, pot(24))),
      r1(spr(60 - 24, pot(24))),
      r1(spr(100 - 24, pot(24))),
      r1(spr(200 - 30, pot(30))),
    ]);
    expect(chips(art(key, 'At 200bb, room to play'))).toEqual([pot(30), 170]);
    expect(caption(key, 'Calling a 40bb shove')).toContain(`**${Math.round(price(51.5, 29) * 100)}%**`);
    expect(answer(key, 'Stacks are 60bb. You 3bet to 11bb and the button 4bets to 24bb. If you call, what is the flop SPR?')).toBe(`About ${r1(spr(36, 48.5))}`);
    expect(answer(key, 'Stacks are 40bb. You 3bet to 11bb and the button 4bets to 24bb. If you call, what is the flop SPR?')).toBe(`About ${r1(spr(16, 48.5))}`);
    expect(answer(key, 'Stacks are 150bb. You 3bet to 11bb and the button 4bets to 27bb. If you call, what is the flop SPR?')).toBe(`About ${r1(spr(123, 54.5))}`);
    expect(answer(key, 'At 40bb you 3bet to 11bb and the button shoves. What equity do you need to call?')).toBe(`${Math.round(price(51.5, 29) * 100)}%`);
    expect(answer(key, 'At 30bb you 3bet to 9bb and the button shoves. What equity do you need to call?')).toBe(pct(price(39.5, 21)));
    expect(answer(key, 'At 50bb you 3bet to 11bb from the small blind and the cutoff shoves. The big blind folded. What equity do you need to call?')).toBe(pct(price(62, 39)));
    // A5s has about 30% against QQ+ and AK, below the 36% it needs.
    const h = parseCards('As5s') as [Card, Card];
    const a5 = equityVsRange(h, parseComboRange('QQ+, AKs, AKo', h), [], { iterations: 60000, rng: seededRng(5) }).equity;
    expect(Math.abs(a5 * 100 - 30)).toBeLessThan(1.2);
  });

  it('prices blind vs blind 3bets and limps', () => {
    const key = 'preflop/3bet-pots/sb-vs-bb-3bet';
    expect(rows(key, 'The price to call').map((r) => r[3])).toEqual([price(10.5, 5.5), price(12, 6), price(13, 7)].map(pct));
    expect(caption(key, 'What a 3bet bluff needs')).toContain(`**${pct(folds(4, 8))}**`);
    expect(answer(key, 'The big blind 3bets your 3bb small blind raise to 9bb. How often must you fold for a no equity 3bet to break even?')).toBe(pct(folds(4, 8)));
    expect(answer(key, 'The big blind 3bets your 2.5bb small blind raise to 8bb. How often must you fold for a no equity 3bet to break even?')).toBe(pct(folds(3.5, 7)));
    expect(answer(key, 'The big blind 3bets your 3bb small blind raise to 10bb. How often must you fold for a no equity 3bet to break even?')).toBe(pct(folds(4, 9)));
    expect(answer(key, 'You raise to 3bb from the small blind. The big blind 3bets to 9bb. What raw equity does a call need?')).toBe(pct(price(12, 6)));
    expect(answer(key, 'You raise to 2.5bb from the small blind. The big blind 3bets to 8bb. What raw equity does a call need?')).toBe(pct(price(10.5, 5.5)));
    expect(answer(key, 'You raise to 3bb from the small blind. The big blind 3bets to 10bb. What raw equity does a call need?')).toBe(pct(price(13, 7)));
    expect(r1(spr(91, 18))).toBe(5.1);

    const limp = 'preflop/3bet-pots/bb-vs-sb-limp';
    expect(caption(limp, 'Folds a raise needs')).toContain(`**${Math.round(folds(2, 3) * 100)}%**`);
    expect(bars(art(limp, 'The small blind’s price'))).toEqual([3, 4, 5].map((r) => r1(price(2 + (r - 1), r - 1) * 100)));
    for (const [q, to] of [
      ['The small blind limps. You raise to 4bb as a bluff. How often must the small blind fold for it to break even?', 4],
      ['The small blind limps. You raise to 3.5bb as a bluff. How often must the small blind fold for it to break even?', 3.5],
      ['The small blind limps. You raise to 5bb as a bluff. How often must the small blind fold for it to break even?', 5],
    ] as const)
      expect(answer(limp, q).replace('.0%', '%')).toBe(pct(folds(2, to - 1)).replace('.0%', '%'));
    for (const [q, to] of [
      ['The small blind limps and you raise to 4bb. What raw equity does a small blind call need?', 4],
      ['The small blind limps and you raise to 3bb. What raw equity does a small blind call need?', 3],
      ['The small blind limps and you raise to 5bb. What raw equity does a small blind call need?', 5],
    ] as const)
      expect(answer(limp, q)).toBe(pct(price(to + 1, to - 1)));
    expect(r1(spr(99, 2))).toBe(49.5);
  });
});

/* Multiway preflop ---------------------------------------------------------- */

describe('squeezes, overcalls and cold 4bets', () => {
  it('prices a squeeze for the opener and the caller', () => {
    const key = 'preflop/multiway-preflop/facing-squeeze';
    expect(rows(key, 'The price for each player').map((r) => r[2])).toEqual([price(18.5, 10.5), price(18.5, 10.5), price(29, 10.5)].map(pct));
    expect(answer(key, 'You open the CO to 2.5bb and the button calls. The big blind squeezes to 13bb. What raw equity does your call need?')).toBe(pct(price(18.5, 10.5)));
    expect(answer(key, 'You open the HJ to 2.5bb and the cutoff calls. The small blind squeezes to 12bb. What raw equity does your call need?')).toBe(pct(price(18, 9.5)));
    expect(answer(key, 'You call a 2.5bb LJ open on the button. The big blind squeezes to 14bb and the LJ folds. What raw equity does your call need?')).toBe(pct(price(19.5, 11.5)));
    expect(chips(art(key, 'If both players call'))).toEqual([3 * 13 + 0.5, 87]);
    expect(r1(spr(87, 39.5))).toBe(2.2);
  });

  it('prices cold 4bets and counts QQ+ and AK', () => {
    const key = 'preflop/multiway-preflop/cold-4bet';
    expect(answer(key, 'The HJ opens 2.5bb and the CO 3bets to 8bb. You cold 4bet to 20bb from the button. How often must both fold for a pure bluff to break even?')).toBe(pct(folds(12, 20)));
    expect(answer(key, 'UTG opens 3bb and the LJ 3bets to 9bb. You cold 4bet to 22bb from the cutoff. How often must both fold for a pure bluff to break even?')).toBe(`${Math.round(folds(13.5, 22) * 100)}%`);
    expect(answer(key, 'The CO opens 2.5bb and the button 3bets to 7.5bb. You cold 4bet to 22bb from the small blind. How often must both fold for a pure bluff to break even?')).toBe(pct(folds(11.5, 21.5)));
    const combos = ['AA', 'KK', 'QQ', 'AKs', 'AKo'].flatMap((h) => handClassCombos(h)).length;
    expect(combos).toBe(34);
    expect((lesson(key).cover as { value: number }).value).toBeCloseTo(34 / 1326, 12);
    expect(answer(key, 'About what share of starting hands are QQ+ and AK?')).toBe(`About ${r1((34 / 1326) * 100)}%`);
  });
});

/* Live preflop -------------------------------------------------------------- */

describe('straddles, limp reraises and big live opens', () => {
  it('prices the straddle and its SPRs', () => {
    const key = 'preflop/live-preflop/straddle-defense';
    expect(rows(key, 'Your price from the straddle').map((r) => r[3])).toEqual([6, 7, 8].map((o) => pct(price(3.5 + o, o - 2))));
    expect(bars(art(key, 'A lower SPR than usual'))).toEqual([r1(spr(97.5, 5.5)), r1(spr(94, 13.5))]);
    expect(answer(key, 'You straddle 2bb. The cutoff opens to 7bb and the rest fold. What raw equity does your call need?')).toBe(pct(price(10.5, 5)));
    expect(answer(key, 'You straddle 2bb. The HJ opens to 8bb and the rest fold. What raw equity does your call need?')).toBe(pct(price(11.5, 6)));
    expect(answer(key, 'You straddle 2bb. The button opens to 6bb and the blinds fold. What raw equity does your call need?')).toBe(pct(price(9.5, 4)));
    expect(answer(key, 'In a straddled pot the button opens to 6bb and you call from the straddle. Stacks are 100bb. What is the flop SPR?')).toBe(`About ${Math.round(spr(94, 13.5))}`);
    expect(answer(key, 'In a straddled pot the button opens to 6bb and you call from the straddle. Stacks are 200bb. What is the flop SPR?')).toBe(`About ${r1(spr(194, 13.5))}`);
    expect(answer(key, 'In a straddled pot the button opens to 8bb and you call from the straddle. Stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(92, 17.5))}`);
  });

  it('prices 3bets in straddled pots', () => {
    const key = 'preflop/live-preflop/straddle-3bets';
    expect(rows(key, 'Sizes and SPR at 100bb').map((r) => [r[1], r[2], r[3]])).toEqual([
      ['15.5bb', '94bb', String(r1(spr(94, 15.5)))],
      ['39.5bb', '82bb', String(r1(spr(82, 39.5)))],
      ['83.5bb', '60bb', String(r1(spr(60, 83.5)))],
    ]);
    expect(caption(key, 'What a 3bet bluff needs')).toContain(`**${pct(folds(9.5, 18))}**`);
    expect(answer(key, 'In a straddled pot, the CO opens to 6bb. You 3bet the button to 18bb as a bluff. How often must the others fold?')).toBe(pct(folds(9.5, 18)));
    expect(answer(key, 'In a straddled pot, the HJ opens to 7bb. You 3bet the cutoff to 21bb as a bluff. How often must the others fold?')).toBe(pct(folds(10.5, 21)));
    expect(answer(key, 'In a straddled pot, the LJ opens to 5bb. You 3bet the button to 16bb as a bluff. How often must the others fold?')).toBe(pct(folds(8.5, 16)));
    expect(answer(key, 'Stacks are 100bb in a straddled pot. You 3bet to 18bb and the 6bb opener calls. What is the flop SPR?')).toBe(`About ${Math.round(spr(82, 39.5))}`);
    expect(answer(key, 'Stacks are 200bb in a straddled pot. You 3bet to 18bb and the 6bb opener calls. What is the flop SPR?')).toBe(`About ${r1(spr(182, 39.5))}`);
    expect(answer(key, 'Stacks are 100bb in a straddled pot. You 3bet to 20bb and the 6bb opener calls. What is the flop SPR?')).toBe(`About ${r1(spr(80, 43.5))}`);
  });

  it('prices the limp reraise and the set mining sum, with equity against QQ+ and AK', () => {
    const key = 'preflop/live-preflop/limp-reraise';
    expect((lesson(key).cover as { value: number }).value).toBeCloseTo(price(24.5, 13), 12);
    expect(caption(key, 'Your price')).toContain(`**${pct(price(24.5, 13))}**`);
    expect(r1(spr(82, 37.5))).toBe(2.2);
    expect(answer(key, 'UTG+1 limps and you iso raise to 5bb. The blinds fold and the limper reraises to 18bb. What raw equity does a call need?')).toBe(pct(price(24.5, 13)));
    expect(answer(key, 'A player limps and you iso raise to 6bb on the button. The blinds fold and the limper reraises to 20bb. What raw equity does a call need?')).toBe(pct(price(27.5, 14)));
    expect(answer(key, 'Two players limp and you iso raise to 7bb. The blinds fold. The first limper reraises to 25bb and the other folds. What raw equity does a call need?')).toBe(pct(price(34.5, 18)));
    const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
    const set = 1 - choose(48, 3) / choose(50, 3);
    expect(Math.round(set * 119.5 - 13)).toBe(1);
    // A JJ shove called by the whole range needs 95 ÷ 201.5.
    expect(pct(95 / 201.5)).toBe('47.1%');
    const eq = (hand: string) => {
      const h = parseCards(hand) as [Card, Card];
      return equityVsRange(h, parseComboRange('QQ+, AKs, AKo', h), [], { iterations: 60000, rng: seededRng(13) }).equity * 100;
    };
    const cards: Record<string, string> = { 'K♠K♦': 'KsKd', 'J♠J♦': 'JsJd', 'A♥Q♥': 'AhQh', 'A♥Q♣': 'AhQc' };
    for (const [hand, e] of rows(key, 'Against QQ+ and AK')) expect(Math.abs(eq(cards[hand]) - Number.parseInt(e)), hand).toBeLessThan(1.2);
  });

  it('prices 3bets against big live opens at live depths', () => {
    const key = 'preflop/live-preflop/live-3bets';
    expect(bars(art(key, 'About 70% folds against big opens'))).toEqual([5, 6, 8].map((o) => r1(folds(o + 1.5, 3 * o) * 100)));
    expect(rows(key, 'SPR after a called 3bet to 15bb').map((r) => r[3])).toEqual([100, 150, 250].map((s) => String(r1(spr(s - 15, 31.5)))));
    expect(bars(lesson(key).cover)).toEqual([100, 150, 250].map((s) => r1(spr(s - 15, 31.5))));
    expect(answer(key, 'The HJ opens to 5bb and you 3bet the button to 15bb as a pure bluff. How often must everyone fold?')).toBe(pct(folds(6.5, 15)));
    expect(answer(key, 'The CO opens to 8bb and you 3bet the button to 24bb as a pure bluff. How often must everyone fold?')).toBe(pct(folds(9.5, 24)));
    expect(answer(key, 'UTG+2 opens to 6bb and you 3bet the cutoff to 18bb as a pure bluff. How often must everyone fold?')).toBe(pct(folds(7.5, 18)));
    for (const s of [100, 150, 250])
      expect(answer(key, `Stacks are ${s}bb. The HJ opens to 5bb, you 3bet to 15bb and the HJ calls. What is the flop SPR?`)).toBe(`About ${r1(spr(s - 15, 31.5))}`);
  });
});

/* 3bet and 4bet pots after the flop ----------------------------------------- */

/** Every two card hand in a range that fits with the board, with its best five card score. */
function made(range: string, board: string) {
  const b = parseCards(board);
  return parseComboRange(range, b).map((c) => ({ cards: c.cards, score: evaluate([...c.cards, ...b]) }));
}
const THREE_BETTOR = 'QQ+, AKs, AKo, AQs, A5s, A4s';
const CALLER = 'JJ-22, AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs, T9s, 98s, 87s, 76s, 65s';
const twoPairPlus = (range: string, board: string) => made(range, board).filter((h) => categoryOf(h.score) >= HandCategory.TwoPair).length;
/** Top pair or better: two pair or better, or a pair at least as high as the top board card. */
function topPairPlus(range: string, board: string) {
  const top = Math.max(...parseCards(board).map(rankIndex));
  return made(range, board).filter((h) => {
    const cat = categoryOf(h.score);
    if (cat >= HandCategory.TwoPair) return true;
    if (cat !== HandCategory.Pair) return false;
    const [a, b] = h.cards;
    const ranks = [...parseCards(board), a, b].map(rankIndex);
    const pair = ranks.find((r, i) => ranks.indexOf(r) !== i)!;
    return pair >= top;
  }).length;
}

describe('3bet and 4bet pots after the flop', () => {
  it('prices small c-bets, MDF and check raises', () => {
    const ip = 'postflop/3bet-postflop/3bp-ip-3bettor';
    expect(chips(art(ip, 'The pot on the flop'))).toEqual([16.5, 92.5]);
    expect(caption(ip, 'Why small works')).toContain(`**${Math.round(folds(16.5, 5.5) * 100)}%**`);
    const f = geometricBetFraction(16.5, 92.5, 3);
    expect(caption(ip, 'Three bets get it in')).toContain(`**${pct(f)}**`);
    const flop = r1(16.5 * f);
    const turn = r1((16.5 + 2 * 16.5 * f) * f);
    expect(chips(art(ip, 'Three bets get it in'))).toEqual([flop, turn, r1(92.5 - 16.5 * f - (16.5 + 2 * 16.5 * f) * f)]);
    expect(answer(ip, 'The pot is 16.5bb. You bet 5.5bb as a pure bluff. How often must the caller fold?')).toBe('25%');
    expect(answer(ip, 'The pot is 22.5bb. You bet 7.5bb as a pure bluff. How often must the caller fold?')).toBe(`${folds(22.5, 7.5) * 100}%`);
    expect(answer(ip, 'The pot is 16.5bb. You bet 8bb as a pure bluff. How often must the caller fold?')).toBe(pct(folds(16.5, 8)));

    const oop = 'postflop/3bet-postflop/3bp-oop-caller';
    expect(art(oop, 'Price against a small c-bet')).toMatchObject({ value: price(22, 5.5) });
    expect(caption(oop, 'Price against a small c-bet')).toContain(`MDF (minimum defense frequency) is ${mdf(16.5, 5.5) * 100}%`);
    expect(chips(art(oop, 'A check raise commits you'))).toEqual([16.5 + 18 + 18, 92.5 - 18]);
    expect(r1(spr(74.5, 52.5))).toBe(1.4);
    expect(answer(oop, 'You called a 3bet from the cutoff. The button bets 5.5bb into 16.5bb. What is MDF?')).toBe(`${mdf(16.5, 5.5) * 100}%`);
    expect(answer(oop, 'You called a 3bet from the cutoff. The button bets 8bb into 16.5bb. What is MDF?')).toBe(pct(mdf(16.5, 8)));
    expect(answer(oop, 'You called a 3bet from the HJ. The cutoff bets 11bb into 22bb. What is MDF?')).toBe(pct(mdf(22, 11)));

    const vs = 'postflop/3bet-postflop/vs-3bp-cbet';
    expect(chips(art(vs, 'The pot on the flop'))).toEqual([22.5, 89]);
    expect(art(vs, 'Price against a small c-bet')).toMatchObject({ value: price(30, 7.5) });
    expect(chips(art(vs, 'After you call'))).toEqual([37.5, 81.5]);
    expect(r1(geometricBetFraction(37.5, 81.5, 2) * 100)).toBeGreaterThan(60);
    expect(answer(vs, 'You called a 3bet on the button. The big blind bets 7.5bb into 22.5bb. What raw equity does a call need?')).toBe(pct(price(30, 7.5)).replace('.0', ''));
    expect(answer(vs, 'You called a 3bet on the button. The big blind bets 11bb into 22.5bb. What raw equity does a call need?')).toBe(pct(price(33.5, 11)));
    expect(answer(vs, 'You called a small blind 3bet in the cutoff. It bets 6bb into 23bb. What raw equity does a call need?')).toBe(pct(price(29, 6)));
    expect(answer(vs, 'You call a flop c-bet in a 3bet pot. The pot is now 37.5bb with 81.5bb behind. What is the SPR?')).toBe(`About ${r1(spr(81.5, 37.5))}`);
  });

  it('sizes turns geometrically and prices turn shoves', () => {
    const key = 'postflop/3bet-postflop/3bp-turns';
    const f = geometricBetFraction(37.5, 81.5, 2);
    expect(caption(key, 'Two bets to get it in')).toContain(`**${pct(f)}**`);
    expect(bars(art(key, 'Two bets to get it in'))).toEqual([r1(37.5 * f), r1(81.5 - 37.5 * f)]);
    expect((81.5 - 37.5 * f) / (37.5 + 2 * 37.5 * f)).toBeCloseTo(f, 10);
    expect(answer(key, 'The turn pot is 37.5bb with 81.5bb behind. What pot fraction on the turn and river gets it all in?')).toBe(`About ${Math.round(f * 100)}%`);
    expect(answer(key, 'The turn pot is 30bb with 60bb behind. What pot fraction on the turn and river gets it all in?')).toBe(`About ${Math.round(geometricBetFraction(30, 60, 2) * 100)}%`);
    expect(answer(key, 'The turn pot is 45bb with 180bb behind. What pot fraction on the turn and river gets it all in?')).toBe(`About ${Math.round(geometricBetFraction(45, 180, 2) * 100)}%`);
    expect(answer(key, 'The 3bettor shoves 81.5bb into a 37.5bb turn pot. What raw equity does a call need?')).toBe(pct(price(119, 81.5)));
    expect(answer(key, 'The 3bettor shoves 60bb into a 30bb turn pot. What raw equity does a call need?')).toBe(`${price(90, 60) * 100}%`);
    expect(answer(key, 'The 3bettor bets 25bb into a 37.5bb turn pot. What raw equity does a call need?')).toBe(pct(price(62.5, 25)));
    // The 9 on T73 makes straights for J8 and 86.
    for (const hand of ['Js8h', '8s6h']) expect(categoryOf(evaluate(parseCards(hand + 'Td7c3s9d')))).toBe(HandCategory.Straight);
  });

  it('counts strong hands in the illustration ranges on low and high boards', () => {
    const key = 'postflop/3bet-postflop/3bp-low-boards';
    for (const board of ['7s6s5d', '8h7h6d']) {
      expect(twoPairPlus(CALLER, board), board).toBe(18);
      expect(twoPairPlus(THREE_BETTOR, board), board).toBe(0);
    }
    expect(caption(key, 'Low and connected')).toContain('**18**');
    expect(topPairPlus(THREE_BETTOR, 'Kd8c3h')).toBe(21);
    expect(topPairPlus(CALLER, 'Kd8c3h')).toBe(15);
    expect(caption(key, 'High and dry')).toContain('**21**');
    expect(caption(key, 'High and dry')).toContain('**15**');
    expect(categoryOf(evaluate(parseCards('9h8h7s6s5d')))).toBe(HandCategory.Straight);
    // The board where the 3bettor's edge in top pair or better is biggest is the answer, in every version.
    const q = quizzes(key)[2];
    for (const v of quizVersions(q)) {
      const edge = v.choiceCards!.map((b) => topPairPlus(THREE_BETTOR, b) - topPairPlus(CALLER, b));
      expect(edge.indexOf(Math.max(...edge)), v.choiceCards!.join()).toBe(v.answer);
      expect(edge[v.answer]).toBeGreaterThan(0);
    }
  });

  it('plays 4bet pots at an SPR of 1.6', () => {
    const key = 'postflop/3bet-postflop/4bet-pots';
    expect(chips(art(key, 'The pot on the flop'))).toEqual([48.5, 76]);
    expect(chips(art(key, 'After a small bet is called'))).toEqual([48.5 + 24, 76 - 12]);
    expect(r1(spr(64, 72.5))).toBe(0.9);
    const ak = exactEquity(parseCards('AhKd') as [Card, Card], parseCards('QsQc') as [Card, Card], parseCards('8c5s2d'));
    expect(caption(key, 'AK on a low board')).toContain(`**${pct(ak.equity)}**`);
    expect(caption(key, 'Calling a check shove')).toContain(`**${pct(price(136.5, 64))}**`);
    expect(answer(key, 'At 100bb a 4bet to 24bb is called. The small blind’s 0.5bb is dead. What is the flop SPR?')).toBe(`About ${r1(spr(76, 48.5))}`);
    expect(answer(key, 'At 100bb a 4bet to 22bb is called. Both blinds folded, so 1.5bb is dead. What is the flop SPR?')).toBe(`About ${r1(spr(78, 45.5))}`);
    expect(answer(key, 'At 150bb a 4bet to 30bb is called with 1.5bb dead. What is the flop SPR?')).toBe(`About ${Math.round(spr(120, 61.5))}`);
    expect(answer(key, 'You 4bet and got called. On the flop you bet 12bb into 48.5bb and the big blind shoves for 76bb. What raw equity does a call need?')).toBe(pct(price(136.5, 64)));
    expect(answer(key, 'You 4bet and got called. On the flop you bet 16bb into 48.5bb and the big blind shoves for 76bb. What raw equity does a call need?')).toBe(pct(price(140.5, 60)));
  });
});

/* Multiway postflop --------------------------------------------------------- */

describe('limped, straddled and multiway 3bet pots after the flop', () => {
  it('counts folds from several players and limped pot SPRs', () => {
    const key = 'postflop/multiway/limped-postflop';
    expect(bars(art(key, 'A half pot bluff into 4 players'))).toEqual([r1(folds(1, 0.5) * 100), Math.round(0.7 ** 4 * 100), Math.round(0.8 ** 4 * 100)]);
    expect(answer(key, 'You bet half the pot into 4 players in a limped pot. Each folds 70% of the time, independently. How often do all 4 fold?')).toBe(`${Math.round(0.7 ** 4 * 100)}%`);
    expect(answer(key, 'You bet half the pot into 3 players in a limped pot. Each folds 70% of the time, independently. How often do all 3 fold?')).toBe(pct(0.7 ** 3));
    expect(answer(key, 'You bet half the pot into 2 players in a limped pot. Each folds 60% of the time, independently. How often do both fold?')).toBe(`${Math.round(0.6 ** 2 * 100)}%`);
    expect(0.7 ** 3).toBeGreaterThan(folds(1, 0.5));
    expect(0.7 ** 4).toBeLessThan(folds(1, 0.5));
    expect(r1(spr(99, 5))).toBe(19.8);
    expect(answer(key, 'Five players limp to the flop with 100bb stacks. The pot is 5bb. What is the SPR?')).toBe(`About ${Math.round(spr(99, 5))}`);
    expect(answer(key, 'Four players limp to the flop with 100bb stacks. The pot is 4bb. What is the SPR?')).toBe(`About ${Math.round(spr(99, 4))}`);
    expect(answer(key, 'Three players limp to the flop with 200bb stacks. The pot is 3bb. What is the SPR?')).toBe(`About ${Math.round(spr(199, 3))}`);
  });

  it('measures straddled pots and their geometric sizes', () => {
    const key = 'postflop/multiway/straddled-postflop';
    expect(bars(art(key, 'Flop SPR at 100bb'))).toEqual([r1(spr(97.5, 5.5)), r1(spr(94, 3 * 6 + 1.5)), r1(spr(94, 4 * 6 + 1.5))]);
    expect(Math.round(geometricBetFraction(19.5, 94, 3) * 100)).toBe(60);
    expect(answer(key, 'In a straddled pot you open 6bb. Two players call, including the straddle. Stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(94, 19.5))}`);
    expect(answer(key, 'In a straddled pot you open 6bb. Three players call, including the straddle. Stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(94, 25.5))}`);
    expect(answer(key, 'In a straddled pot you open 8bb. Two players call, including the straddle. Stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(92, 25.5))}`);
    expect(answer(key, 'The flop pot is 19.5bb with 94bb behind. About what pot fraction on 3 streets gets it all in?')).toBe(`About ${Math.round(geometricBetFraction(19.5, 94, 3) * 100)}%`);
    expect(answer(key, 'The flop pot is 25.5bb with 94bb behind. About what pot fraction on 3 streets gets it all in?')).toBe(`About ${Math.round(geometricBetFraction(25.5, 94, 3) * 100)}%`);
  });

  it('prices multiway 3bet pots and bluffs into 2 players', () => {
    const key = 'postflop/multiway/multiway-3bp';
    expect(chips(art(key, 'The pot on the flop'))).toEqual([39.5, 87]);
    expect(bars(art(key, 'A third pot bluff into 2 players'))).toEqual([r1(folds(39.5, 13) * 100), 0.5 ** 2 * 100, Math.round(0.4 ** 2 * 100)]);
    expect(answer(key, 'A squeeze to 13bb gets 2 callers. The small blind’s 0.5bb is dead and stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(87, 39.5))}`);
    expect(answer(key, 'A small blind squeeze to 12bb gets 2 callers. The big blind’s 1bb is dead and stacks are 100bb. What is the flop SPR?')).toBe(`About ${r1(spr(88, 37))}`);
    expect(answer(key, 'A squeeze to 13bb gets 2 callers. The small blind’s 0.5bb is dead and stacks are 200bb. What is the flop SPR?')).toBe(`About ${r1(spr(187, 39.5))}`);
    expect(answer(key, 'You bet 13bb into 39.5bb against 2 players. Each folds 40% of the time, independently. Does a pure bluff profit?')).toContain(`${Math.round(0.4 ** 2 * 100)}%`);
    expect(answer(key, 'You bet 13bb into 39.5bb against 2 players. Each folds 60% of the time, independently. Does a pure bluff profit?')).toContain(`${Math.round(0.6 ** 2 * 100)}%`);
    expect(0.6 ** 2).toBeGreaterThan(folds(39.5, 13));
    expect(0.4 ** 2).toBeLessThan(folds(39.5, 13));
  });
});

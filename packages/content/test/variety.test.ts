import {
  buildChart,
  categoryOf,
  equityVsRange,
  evaluate,
  exactEquity,
  geometricBetFraction,
  HandCategory,
  outsToEquity,
  parseCards,
  potOdds,
  rankIndex,
  rankOf,
  remainingDeck,
  seededRng,
  spr,
  suitIndex,
  type Card,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { LESSON_CONTENT, quizVersions, STARTER_CHARTS, type QuizStep } from '../src';

/**
 * The variety pass gave older questions more versions: other seats, hands,
 * boards, sizes and stack depths. This file checks the answer of every one
 * of those versions against the charts, the evaluator and the core math.
 */

const quiz = (key: string, question: string): QuizStep => {
  const q = LESSON_CONTENT.get(key)!.steps.find((s): s is QuizStep => s.kind === 'quiz' && s.question === question);
  if (!q) throw new Error(`${key}: no question "${question}"`);
  return q;
};
const versions = (key: string, question: string) => quizVersions(quiz(key, question));
const picked = (v: QuizStep) => v.choices[v.answer];
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number) => `${r1(x * 100)}%`;
/** Price to call: `call` more into a pot that already holds `pot`. */
const price = (pot: number, call: number) => potOdds(pot, call);
const folds = (pot: number, risk: number) => risk / (pot + risk);
const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
/** "KdTs" -> "KTo". */
function handClass(cards: string): string {
  const [a, b] = parseCards(cards);
  const [hi, lo] = rankIndex(a) >= rankIndex(b) ? [a, b] : [b, a];
  if (rankIndex(hi) === rankIndex(lo)) return rankOf(hi) + rankOf(lo);
  return rankOf(hi) + rankOf(lo) + (suitIndex(hi) === suitIndex(lo) ? 's' : 'o');
}
const num = (re: RegExp, s: string) => Number(s.match(re)![1]);

describe('chart questions, in every seat and hand', () => {
  const cases: [key: string, question: string, chartFor: (q: string) => string, check: (mix: Record<string, number>, v: QuizStep) => void][] = [
    ['preflop/rfi/rfi-ep', '9-handed at 100bb, it folds to you UTG with KJo. What does the chart do?', (q) => (q.includes('UTG+1') ? '9max-100-rfi-utgp1' : '9max-100-rfi-utg'), (m) => expect(m).toEqual({ fold: 1 })],
    ['preflop/rfi/rfi-ep', 'Folded to you in the LJ with A3s. What does the chart do?', () => '9max-100-rfi-lj', (m) => expect(m).toEqual({ raise: 1 })],
    ['preflop/rfi/rfi-lp', 'Folded to you on the button with K5s. What does the chart do?', () => '9max-100-rfi-btn', (m) => expect(m).toEqual({ raise: 1 })],
    ['preflop/rfi/rfi-lp', 'Folded to you in the cutoff with Q7s. What does the chart do?', () => '9max-100-rfi-co', (m, v) => {
      expect(m.raise).toBeGreaterThan(0);
      expect(m.fold).toBeGreaterThan(0);
      expect(v.explain).toContain(`raises ${Math.round(m.raise * 100)}% of the time`);
    }],
    ['preflop/rfi/rfi-sb', 'Folded to you in the small blind with Q4s. What does the raise only chart do?', () => '9max-100-rfi-sb', (m) => expect(m).toEqual({ raise: 1 })],
    ['preflop/rfi/rfi-sb', 'Folded to you in the small blind with K7o. What does the raise only chart do?', () => '9max-100-rfi-sb', (m, v) => {
      expect(m.raise).toBeGreaterThan(0);
      expect(m.fold).toBeGreaterThan(0);
      expect(v.explain).toContain(`raises ${Math.round(m.raise * 100)}% of the time`);
    }],
    ['preflop/vs-open/bb-defense', 'Big blind against a 2.5bb button open with J6s. What does the chart do?', () => '9max-100-bb-vs-btn', (m) => expect(m).toEqual({ call: 1 })],
    ['preflop/3bet-pots/vs-3bet', 'You open K♣9♦ on the button and the big blind 3bets to 11bb. What does Aced’s chart do?', () => '9max-100-btn-vs-3bet', (m) => expect(m).toEqual({ fold: 1 })],
    ['preflop/live-preflop/limped-pots', 'One early player limps and you hold 6♠5♠ on the button. What does the starter chart do?', () => '9max-100-iso-btn-vs-1limp', (m) => expect(m).toEqual({ call: 1 })],
    ['preflop/live-preflop/limped-pots', 'Two players limp and you are on the button with AQo. What size does the starter chart iso raise to?', () => '9max-100-iso-btn-vs-2limp', (m) => expect(m).toEqual({ raise: 1 })],
    ['exploit/adjustments/live-limpers', 'Button against one early limper with 44. What does the starter chart do?', () => '9max-100-iso-btn-vs-1limp', (m) => expect(m).toEqual({ raise: 0.5, call: 0.5 })],
    ['exploit/adjustments/live-limpers', 'Button against one early limper with ATo. What does the starter chart do?', () => '9max-100-iso-btn-vs-1limp', (m) => expect(m).toEqual({ raise: 1 })],
    ['formats/short-handed/blind-battles', 'The button opens 2.5bb. You hold K♠Q♦ in the small blind. What does Aced’s chart do?', () => '6max-100-sb-vs-btn', (m) => expect(m).toEqual({ '3bet': 1 })],
  ];
  for (const [key, question, chartFor, check] of cases) {
    it(`${key}: ${question}`, () => {
      const all = versions(key, question);
      expect(all.length).toBeGreaterThanOrEqual(2);
      const base = picked(all[0]);
      for (const v of all) {
        expect(picked(v), v.question).toBe(base);
        const hand = handClass(v.cards!);
        // The hand named in the words is the hand on show.
        const named = v.question.match(/\b([AKQJT2-9]{2}[so]?)\b/)?.[1];
        if (named && /[so]$|^(.)\1$/.test(named)) expect(named, v.question).toBe(hand);
        const mix = chart(chartFor(v.question)).mixes.get(hand)!;
        check(mix as Record<string, number>, v);
      }
    });
  }
});

describe('math questions, in every size, seat and depth', () => {
  it('pot odds, bluff shares, alpha and MDF', () => {
    for (const v of versions('foundations/math/pot-odds', 'Villain bets 75 into a pot of 100. What equity do you need to call?')) {
      const bet = num(/bets (\d+)/, v.question);
      const pot = num(/pot of (\d+)/, v.question);
      expect(picked(v), v.question).toBe(pct1(potOdds(pot + bet, bet)));
    }
    const size: Record<string, number> = { '3/4 pot': 0.75, 'half pot': 0.5, pot: 1, '2 times the pot': 2, 'a third of the pot': 1 / 3 };
    const sizeOf = (q: string) => size[Object.keys(size).sort((x, y) => y.length - x.length).find((k) => q.includes(` ${k} `))!];
    for (const v of versions('foundations/math/mdf-alpha', 'You bet 3/4 pot on the river with strong hands and bluffs. What share of your bets should be bluffs?')) {
      const b = sizeOf(v.question);
      expect(picked(v), v.question).toBe(pct1(b / (1 + 2 * b)));
    }
    for (const v of versions('foundations/math/mdf-alpha', 'You bluff 3/4 pot with nothing. How often must villain fold for you to break even?')) {
      const b = sizeOf(v.question);
      expect(picked(v), v.question).toBe(pct1(b / (1 + b)));
    }
    for (const v of versions('foundations/math/mdf-alpha', 'Villain bets pot on the river. What share of your range must continue so their bluffs cannot profit automatically?')) {
      const b = sizeOf(v.question);
      expect(picked(v), v.question).toBe(pct1(1 / (1 + b)));
    }
  });

  it('geometric sizes and SPRs', () => {
    for (const v of versions('foundations/math/spr', 'The pot is 10 with effective stacks of 35 and two streets left. What geometric bet gets it all in?')) {
      const f = geometricBetFraction(num(/pot is (\d+)/, v.question), num(/stacks of (\d+)/, v.question), 2);
      expect(picked(v), v.question).toBe(`${Math.round(f * 100)}% pot`);
    }
    for (const v of versions('postflop/3bet-postflop/low-spr', 'SPR 2 on the turn. What pot fraction on the turn and river gets the stacks in?')) {
      const s = num(/SPR (\d+)/, v.question);
      expect(picked(v), v.question).toBe(pct1(geometricBetFraction(1, s, 2)));
    }
    const sprs: [string, string, number][] = [
      ['foundations/math/spr', 'Stacks are 100bb. BTN opens 2.5bb, BB 3bets to 11bb and BTN calls. What is the flop SPR?', 0],
      ['preflop/stack-depth/depth', 'The button opens 2.5bb and the big blind 3bets to 11bb. The button calls with 60bb stacks. What is the flop SPR?', 0],
      ['preflop/3bet-pots/4bet', 'At 100bb, a 4bet to 25bb is called with 1bb dead. What is the SPR?', 0],
      ['postflop/3bet-postflop/cbet-3bp', 'The pot is 22.5bb on the flop with 89bb behind. What is the SPR?', 0],
    ];
    for (const [key, question] of sprs) {
      for (const v of versions(key, question)) {
        const q = v.question;
        let value: number;
        if (q.startsWith('The pot is')) value = spr(num(/behind/.test(q) ? /with ([\d.]+)bb behind/ : /x/, q), num(/pot is ([\d.]+)bb/, q));
        else if (q.includes('4bet to')) {
          const four = num(/4bet to (\d+)bb/, q);
          const stack = num(/At (\d+)bb/, q);
          value = spr(stack - four, 2 * four + num(/with ([\d.]+)bb dead/, q));
        } else {
          const stack = num(/(\d+)bb stacks|Stacks are (\d+)bb/, q) || num(/Stacks are (\d+)bb/, q);
          const three = num(/3bets to ([\d.]+)bb/, q);
          const dead = q.includes('CO opens') ? 1.5 : 0.5;
          value = spr(stack - three, 2 * three + dead);
        }
        const shown = Number(picked(v).replace('About ', ''));
        // Each answer is the SPR rounded as the choices show it, and the nearest choice to it.
        const options = v.choices.map((c) => Number(c.replace('About ', '')));
        const nearest = options.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
        expect(shown, q).toBe(nearest);
        expect(Math.abs(shown - value), q).toBeLessThan(0.35);
      }
    }
  });

  it('preflop prices against opens, 3bets, straddles and limps', () => {
    const check = (key: string, question: string, priceOf: (q: string) => number, format = pct) => {
      for (const v of versions(key, question)) expect(picked(v), v.question).toBe(format(priceOf(v.question)));
    };
    const about = (x: number) => `About ${Math.round(x * 100)}%`;
    check('preflop/vs-open/bb-defense', 'The button opens 2.5bb and the small blind folds. What raw equity does a big blind call need?', (q) => {
      const open = num(/opens ([\d.]+)bb/, q);
      return price(open + 1.5, open - 1);
    }, about);
    check('preflop/3bet-pots/vs-3bet', 'You open the button to 2.5bb and the big blind 3bets to 11bb. What raw equity does a call need?', (q) => {
      const three = num(/3bets to ([\d.]+)bb/, q);
      const dead = q.includes('button 3bets') ? 1.5 : q.includes('small blind 3bets') ? 1 : 0.5;
      return price(three + 2.5 + dead, three - 2.5);
    }, (x) => (Number.isInteger(r1(x * 100)) ? `${Math.round(x * 100)}%` : pct(x)));
    check('preflop/3bet-pots/bvb', 'The small blind raises to 3bb. What raw equity does the big blind need to call?', (q) => {
      const r = num(/raises to ([\d.]+)bb/, q);
      return price(r + 1, r - 1);
    }, (x) => (Number.isInteger(r1(x * 100)) ? `${Math.round(x * 100)}%` : pct(x)));
    for (const v of versions('preflop/3bet-pots/bvb', 'The small blind raises to 3bb. What is a common big blind 3bet size?')) {
      expect(picked(v), v.question).toBe(`${3 * num(/raises to ([\d.]+)bb/, v.question)}bb`);
    }
    for (const v of versions('preflop/live-preflop/straddles', 'You have 120bb and the pot is straddled. How deep are you, measured in straddles?')) {
      expect(picked(v), v.question).toBe(String(num(/have (\d+)bb/, v.question) / 2));
    }
    check('preflop/live-preflop/straddles', 'The button opens to 6bb in a straddled pot and the blinds fold. How much equity does the straddler need to call?', (q) => {
      const open = num(/opens to (\d+)bb/, q);
      return price(open + 3.5, open - 2);
    });
    check('preflop/live-preflop/big-opens', 'A player opens to 8bb and it folds to you in the big blind. How much equity do you need to call?', (q) => {
      const open = num(/opens to (\d+)bb/, q);
      return price(open + 1.5, open - 1);
    }, (x) => (Number.isInteger(r1(x * 100)) ? `${Math.round(x * 100)}%` : pct(x)));
    for (const v of versions('preflop/vs-open/squeeze', 'The CO opens 2.5bb and the button calls. How much is in the pot when the big blind acts?')) {
      const open = num(/opens ([\d.]+)bb/, v.question);
      const callers = v.question.includes('both') ? 2 : 1;
      expect(picked(v), v.question).toBe(`${open * (1 + callers) + 1.5}bb`);
    }
    for (const v of versions('preflop/vs-open/squeeze', 'The HJ opens 2.5bb and the CO calls. Using 3x plus one open per caller, what is the button’s squeeze size?')) {
      const open = num(/opens ([\d.]+)bb/, v.question);
      const callers = v.question.includes('2 players call') ? 2 : 1;
      expect(picked(v), v.question).toBe(`${3 * open + callers * open}bb`);
    }
    check('formats/heads-up/bvb-full-ring', 'You raise to 3bb from the small blind as a pure bluff. How often must the big blind fold for it to break even?', (q) => {
      const r = num(/raise to ([\d.]+)bb/, q);
      return folds(1.5, r - 0.5);
    }, (x) => (Number.isInteger(r1(x * 100)) ? `${Math.round(x * 100)}%` : pct(x)));
    check('formats/heads-up/bvb-full-ring', 'The small blind limps and the big blind raises to 4bb. How much equity does the small blind need to call?', (q) => {
      const r = num(/raises to (\d+)bb/, q);
      return price(r + 1, r - 1);
    }, (x) => (Number.isInteger(r1(x * 100)) ? `${Math.round(x * 100)}%` : pct(x)));
  });

  it('shove prices and folds from several players', () => {
    for (const v of versions('postflop/3bet-postflop/low-spr', 'Villain shoves 3 times the pot, and you have not bet. What equity do you need to call?')) {
      const s = v.question.includes('3 times') ? 3 : v.question.includes('2 times') ? 2 : 1;
      expect(picked(v), v.question).toBe(pct1(price(1 + s, s)));
    }
    const words: Record<string, number> = { Two: 2, Three: 3, Four: 4, '2': 2, '3': 3 };
    for (const v of versions('postflop/multiway/multiway', 'Three opponents each fold 60% of the time, independently. How often do all 3 fold?')) {
      const n = words[v.question.split(' ')[0]];
      const f = num(/fold (\d+)%/, v.question) / 100;
      expect(picked(v), v.question).toBe(pct1(f ** n));
    }
    for (const v of versions('postflop/multiway/multiway', 'You bluff half pot into 2 opponents. Each folds 50% of the time, independently. How often does the bluff win?')) {
      const f = num(/folds (\d+)%/, v.question) / 100;
      const win = f ** 2;
      expect(picked(v), v.question).toBe(`${Math.round(win * 100)}%, so it ${win > 1 / 3 ? 'profits' : 'loses'}`);
    }
    for (const v of versions('preflop/live-preflop/limped-pots', 'You bluff into 2 players who each fold 60% of the time. How often do both fold?')) {
      const n = num(/into (\d) players/, v.question);
      const f = num(/fold (\d+)%/, v.question) / 100;
      expect(picked(v), v.question).toBe(`${r1(f ** n * 100)}%`);
    }
  });

  it('outs on the turn and the flop', () => {
    const outs: Record<string, number> = { 'open ended straight draw': 8, 'flush draw': 9, gutshot: 4 };
    for (const v of versions('foundations/math/outs', 'You have an open ended straight draw on the turn. How often do you hit on the river?')) {
      const n = outs[Object.keys(outs).find((k) => v.question.includes(k))!];
      expect(picked(v), v.question).toBe(pct1(outsToEquity(n, 46, 1)));
    }
    for (const v of versions('foundations/math/outs', 'Flush draw plus gutshot on the flop gives 12 outs. How often do you hit by the river?')) {
      expect(picked(v), v.question).toBe(pct1(outsToEquity(num(/gives (\d+) outs/, v.question), 47, 2)));
    }
  });
});

/* Cards and boards ------------------------------------------------------------ */

const cards = (s: string) => parseCards(s);
const score = (s: string) => evaluate(cards(s));
function holdings(dead: string): [Card, Card][] {
  const live = remainingDeck(cards(dead));
  const out: [Card, Card][] = [];
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) out.push([live[i], live[j]]);
  return out;
}
/** How many unseen cards turn this hand into a straight or better that it is not yet. */
function straightOuts(hand: string, board: string): number {
  const now = categoryOf(score(hand + board));
  return remainingDeck(cards(hand + board)).filter((c) => {
    const ranks = new Set([...cards(hand + board), c].map(rankIndex));
    const has = (lo: number) => [0, 1, 2, 3, 4].every((k) => ranks.has((lo + k + 13) % 13) || (lo + k === 12 && ranks.has(12)));
    const straight = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].some((lo) => (lo === -1 ? [12, 0, 1, 2, 3].every((r) => ranks.has(r)) : has(lo)));
    return straight && now < HandCategory.Straight;
  }).length;
}
const suitedCount = (hand: string, board: string) => Math.max(...[0, 1, 2, 3].map((s) => cards(hand + board).filter((c) => suitIndex(c) === s).length));
const pairs = (hand: string, board: string) => {
  const b = new Set(cards(board).map(rankIndex));
  const h = cards(hand).map(rankIndex);
  return h[0] === h[1] || h.some((r) => b.has(r));
};

describe('board and hand questions, on every board', () => {
  it('names the street from the board', () => {
    for (const v of versions('basics/rules/hand-flow', 'Which street is this?')) {
      expect(picked(v), v.board).toBe(['The flop', 'The turn', 'The river'][cards(v.board!).length - 3]);
    }
  });

  it('reads 4 of a suit, a paired river and the nuts', () => {
    for (const v of versions('basics/first-strategy/the-nuts', 'The board has 4 hearts. You hold top pair with an ace kicker. How strong is it?')) {
      const suit = { hearts: 'h', spades: 's', diamonds: 'd', clubs: 'c' }[v.question.match(/4 (\w+)\./)![1]]!;
      const letter = (c: Card) => 'cdhs'[suitIndex(c)];
      expect(cards(v.board!).every((c) => letter(c) === suit), v.question).toBe(true);
      expect(cards(v.cards!).some((c) => letter(c) === suit), v.question).toBe(false);
      expect(categoryOf(score(v.cards! + v.board!)), v.question).toBe(HandCategory.Pair);
      expect(picked(v)).toMatch(/^Weak/);
    }
    for (const v of versions('basics/first-strategy/the-nuts', 'The river pairs the board. What becomes possible?')) {
      const ranks = cards(v.board!).map(rankIndex);
      expect(new Set(ranks.slice(0, 4)).size).toBe(4);
      expect(new Set(ranks).size).toBe(4);
      expect(holdings(v.board!).some((h) => categoryOf(evaluate([...h, ...cards(v.board!)])) === HandCategory.Quads)).toBe(true);
    }
    for (const v of versions('basics/first-strategy/the-nuts', 'Which hand is the nuts on this board?')) {
      const b = cards(v.board!);
      const best = Math.max(...holdings(v.board!).map((h) => evaluate([...h, ...b])));
      v.choiceCards!.forEach((c, i) => expect(evaluate([...cards(c), ...b]) === best, `${v.board} ${c}`).toBe(i === v.answer));
    }
  });

  it('counts sets and combos after card removal', () => {
    for (const v of versions('foundations/math/combos', 'The board is K72 with three suits. You hold none of those ranks. How many set combos can villain have?')) {
      const ranks = new Set(cards(v.board!).map(rankIndex));
      expect(new Set(cards(v.board!).map(suitIndex)).size).toBe(3);
      expect(v.question).toContain(cards(v.board!).map(rankOf).join(''));
      const sets = holdings(v.board!).filter(([a, b]) => rankIndex(a) === rankIndex(b) && ranks.has(rankIndex(a))).length;
      expect(picked(v)).toBe(String(sets));
    }
    const ranksNamed = (q: string) => q.match(/many ([AKQJT2-9])([AKQJT2-9]) combos/)!.slice(1);
    for (const v of versions('foundations/math/combos', 'You hold one ace and the board shows one king. How many AK combos can villain have?')) {
      const [x, y] = ranksNamed(v.question);
      const n = holdings(v.cards! + v.board!).filter(([a, b]) => new Set([rankOf(a), rankOf(b)]).size === 2 && [rankOf(a), rankOf(b)].every((r) => r === x || r === y)).length;
      expect(picked(v), v.question).toBe(String(n));
    }
    for (const v of versions('postflop/hand-reading/narrowing', 'You hold Q♣J♣ on Q♥ 9♥ 5♣. How many AQ combos can villain have?')) {
      const [x, y] = ranksNamed(v.question);
      const n = holdings(v.cards! + v.board!).filter(([a, b]) => new Set([rankOf(a), rankOf(b)]).size === 2 && [rankOf(a), rankOf(b)].every((r) => r === x || r === y)).length;
      expect(picked(v), v.question).toBe(String(n));
    }
  });

  it('gives exact flop equities and sampled preflop equities', () => {
    for (const v of versions('foundations/theory/equity-benchmarks', 'The flop is J♥T♥4♣. 9♥8♥ gets all in against A♠A♦. Who is the favorite?')) {
      const villain = v.question.match(/against (\S\S?\S?\S)\./)![1];
      const code = villain.replace(/♠/g, 's').replace(/♥/g, 'h').replace(/♦/g, 'd').replace(/♣/g, 'c');
      const e = exactEquity(cards(v.cards!) as [Card, Card], cards(code) as [Card, Card], cards(v.board!)).equity;
      expect(e, v.question).toBeGreaterThan(0.5);
      expect(v.explain).toContain(pct(e));
    }
    for (const v of versions('foundations/theory/equity-benchmarks', 'You hold K♠Q♦ on K♥7♥2♣ and get all in against T♥9♥. What is your equity closest to?')) {
      const code = v.question.match(/against (\S+)\./)![1].replace(/♠/g, 's').replace(/♥/g, 'h').replace(/♦/g, 'd').replace(/♣/g, 'c');
      const e = exactEquity(cards(v.cards!) as [Card, Card], cards(code) as [Card, Card], cards(v.board!)).equity;
      expect(picked(v)).toBe(`${Math.round(e * 10) * 10}%`);
      expect(v.explain).toContain(pct(e));
    }
    for (const v of versions('foundations/theory/equity-benchmarks', 'You get all in before the flop with A♠K♦ against A♥Q♣. What is your equity closest to?')) {
      const code = v.question.match(/against (\S+)\./)![1].replace(/♠/g, 's').replace(/♥/g, 'h').replace(/♦/g, 'd').replace(/♣/g, 'c');
      const e = equityVsRange(cards(v.cards!) as [Card, Card], [{ cards: cards(code) as [Card, Card], weight: 1 }], [], { iterations: 80000, rng: seededRng(21) }).equity;
      const options = v.choices.map((c) => Number.parseInt(c));
      const nearest = options.reduce((a, b) => (Math.abs(b - e * 100) < Math.abs(a - e * 100) ? b : a));
      expect(picked(v)).toBe(`${nearest}%`);
      expect(Math.abs(e * 100 - 73.8)).toBeLessThan(1.5);
    }
  });

  it('keeps board families true: high and dry, low and connected, dynamic', () => {
    const ranks = (b: string) => cards(b).map(rankIndex).sort((x, y) => y - x);
    const rainbow = (b: string) => new Set(cards(b).map(suitIndex)).size === cards(b).length;
    const lowConnected = (b: string) => ranks(b)[0] <= rankIndex(cards('8c')[0]) && ranks(b)[0] - ranks(b)[2] <= 3;
    for (const v of versions('postflop/textures/texture-classes', 'On a dry K72 rainbow flop, which c-bet size does the raiser tend to use?')) {
      const r = ranks(v.board!);
      expect(rainbow(v.board!) && r[0] >= rankIndex(cards('Qc')[0]) && new Set(r).size === 3, v.board).toBe(true);
      expect(r[0] - r[1] >= 4 && r[1] - r[2] >= 4, v.board).toBe(true);
      expect(picked(v)).toBe('About 33% pot');
    }
    for (const v of versions('postflop/cbet/cbet-ip', 'BTN vs BB, flop A♠ 8♦ 3♣. What is the usual BTN strategy?')) {
      expect(rainbow(v.board!) && ranks(v.board!)[0] >= rankIndex(cards('Kc')[0]), v.board).toBe(true);
    }
    for (const v of versions('postflop/textures/texture-classes', 'BTN opens and BB calls. Which flop is worst for BTN?')) {
      v.choiceCards!.forEach((b, i) => expect(lowConnected(b), b).toBe(i === v.answer));
    }
    for (const v of versions('postflop/textures/texture-classes', 'Which flop is dynamic, with equities that swing on many turns?')) {
      v.choiceCards!.forEach((b, i) => expect(ranks(b)[0] - ranks(b)[2] <= 2 && !rainbow(b), b).toBe(i === v.answer));
    }
    for (const v of versions('postflop/3bet-postflop/cbet-3bp', 'BB 3bet and BTN called. Which flop does BB c-bet most often?')) {
      v.choiceCards!.forEach((b, i) => expect(ranks(b)[0] >= rankIndex(cards('Kc')[0]), b).toBe(i === v.answer));
    }
  });

  it('picks overcard turns, clear folds and combo draws', () => {
    for (const [key, question] of [
      ['postflop/later-streets/turn-cards', 'BTN c-bets K♠7♦2♣ and BB calls. Which turn usually helps BTN most?'],
      ['postflop/later-streets/barreling', 'You bet 8♣ 6♦ 2♠ and got called. Which turn is the best card to keep betting?'],
    ] as const) {
      for (const v of versions(key, question)) {
        const top = Math.max(...cards(v.board!).map(rankIndex));
        v.choiceCards!.forEach((c, i) => expect(rankIndex(cards(c)[0]) > top, c).toBe(i === v.answer));
      }
    }
    for (const v of versions('postflop/defense/vs-cbet', 'BB on T♠ 6♦ 2♥ faces a third pot bet. Which hand is the clearest fold?')) {
      v.choiceCards!.forEach((h, i) => {
        const nothing = !pairs(h, v.board!) && suitedCount(h, v.board!) < 3 && straightOuts(h, v.board!) === 0;
        expect(nothing, `${v.board} ${h}`).toBe(i === v.answer);
      });
    }
    for (const [key, question] of [
      ['postflop/defense/check-raise', 'BB on 9♥ 8♥ 6♣ faces a small c-bet. Which hand is the best check raise semi bluff?'],
      ['postflop/hand-reading/semi-bluffs', 'On T♠ 9♠ 3♥, which hand makes the best semi bluff raise?'],
    ] as const) {
      for (const v of versions(key, question)) {
        v.choiceCards!.forEach((h, i) => {
          const comboDraw = suitedCount(h, v.board!) === 4 && straightOuts(h, v.board!) >= 8;
          expect(comboDraw, `${v.board} ${h}`).toBe(i === v.answer);
        });
      }
    }
  });
});

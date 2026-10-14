import {
  actionFrequencies,
  actionRange,
  equityVsRange,
  exactEquity,
  rangeToCombos,
  seededRng,
  bluffBreakeven,
  buildChart,
  callEV,
  categoryOf,
  comboCount,
  evaluate,
  geometricBetFraction,
  HandCategory,
  mdf,
  outsToEquity,
  parseCards,
  parseComboRange,
  potOdds,
  rankOf,
  remainingDeck,
  suitIndex,
  type Card,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { LESSON_CONTENT, STARTER_CHARTS, type LessonArt, type LessonContent, type LessonStep } from '../src';

/**
 * The pictures added so beginners can see each idea: the hand walked from the
 * deal to the showdown, and the bars, rings, chips and curves in later
 * lessons. Every card is checked with the evaluator and every number is
 * recomputed with @felt/core.
 */

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
function pick<K extends LessonArt['kind']>(a: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(a.kind).toBe(kind);
  return a as Extract<LessonArt, { kind: K }>;
}
const bars = (a: LessonArt) => pick(a, 'bars').bars.map((b) => b.value);
const chips = (a: LessonArt) => pick(a, 'chips').stacks.map((s) => s.bb);
const r1 = (x: number) => Math.round(x * 10) / 10;
const score = (cards: string) => evaluate(parseCards(cards));
const category = (cards: string) => categoryOf(score(cards));
const quiz = (key: string, question: string) => {
  const q = lesson(key).steps.find((s) => s.kind === 'quiz' && s.question === question);
  if (!q || q.kind !== 'quiz') throw new Error(`${key}: no quiz "${question}"`);
  return q;
};

describe('a hand from the deal to the showdown', () => {
  const key = 'basics/rules/hand-flow';
  const hole = 'KhQh';
  const deal = pick(art(key, 'Preflop: the deal'), 'cards');
  const flop = pick(art(key, 'The flop: 3 cards'), 'cards');
  const turn = pick(art(key, 'The turn: a 4th card'), 'cards');
  const river = pick(art(key, 'The river: the 5th card'), 'cards');

  it('deals the same hole cards and grows the board 3, 4, 5', () => {
    expect(deal.cards).toBe(hole);
    expect(deal.board).toBeUndefined();
    for (const s of [flop, turn, river]) expect(s.cards).toBe(hole);
    expect([flop, turn, river].map((s) => parseCards(s.board!).length)).toEqual([3, 4, 5]);
    // Each street keeps the earlier cards and adds to them.
    expect(turn.board!.startsWith(flop.board!)).toBe(true);
    expect(river.board!.startsWith(turn.board!)).toBe(true);
  });

  it('names the hand right on each street', () => {
    expect(category(hole + flop.board)).toBe(HandCategory.Pair);
    expect(category(hole + turn.board)).toBe(HandCategory.Pair);
    expect(category(hole + river.board)).toBe(HandCategory.TwoPair);
    // The pair is kings, from the K on the flop.
    expect(parseCards(flop.board!).some((c) => rankOf(c) === 'K')).toBe(true);
  });

  it('shows down two pair against a pair of jacks, and two pair wins', () => {
    const ladder = pick(art(key, 'Showdown'), 'ladder');
    const [mine, theirs] = ladder.rungs;
    const villain = 'JsJc';
    // The ladder shows each player's best 5 of 7.
    expect(score(mine.cards)).toBe(score(hole + river.board));
    expect(score(theirs.cards)).toBe(score(villain + river.board));
    expect(category(villain + river.board)).toBe(HandCategory.Pair);
    expect(score(hole + river.board)).toBeGreaterThan(score(villain + river.board));
    const all = parseCards(hole + villain + river.board);
    expect(new Set(all).size).toBe(9);
  });

  it('asks which street it is with 4 board cards, and who acts first', () => {
    const q = quiz(key, 'Which street is this?');
    expect(parseCards(q.board!)).toHaveLength(4);
    expect(q.choices[q.answer]).toBe('The turn');
    const first = quiz(key, 'You are on the button. Only the big blind is left. Who acts first on the flop?');
    expect(parseCards(first.board!)).toHaveLength(3);
    expect(first.choices[first.answer]).toBe('The big blind');
  });
});

describe('basics pictures', () => {
  it('shows the top ranks in order and one rank in 4 suits', () => {
    const ranks = pick(art('basics/rules/goal', 'The ranks'), 'cards');
    expect(parseCards(ranks.board!).map(rankOf).join('')).toBe('TJQKA');
    const suits = pick(art('basics/rules/goal', 'The suits'), 'cards');
    const kings = parseCards(suits.board!);
    expect(kings.map(rankOf).join('')).toBe('KKKK');
    expect(new Set(kings.map(suitIndex)).size).toBe(4);
  });

  it('ties AK of spades and AK of hearts when neither makes a flush', () => {
    const q = quiz('basics/rules/goal', 'You hold the ace and king of spades. Another player holds the ace and king of hearts. Who wins on this board?');
    expect(score(q.cards! + q.board)).toBe(score('AhKh' + q.board));
    expect(category(q.cards! + q.board)).toBe(HandCategory.HighCard);
    expect(category('AhKh' + q.board)).toBe(HandCategory.HighCard);
    expect(q.choices[q.answer]).toBe('Neither. You tie.');
  });

  it('draws the highest and lowest straights', () => {
    const [top, low] = pick(art('basics/rules/rankings', 'Two rules for straights'), 'ladder').rungs;
    expect(category(top.cards)).toBe(HandCategory.Straight);
    expect(category(low.cards)).toBe(HandCategory.Straight);
    // No straight beats A K Q J T, and none is lower than 5 4 3 2 A.
    expect(score(top.cards)).toBe(score('AsKsQdJcTd'));
    expect(score(low.cards)).toBeLessThan(score('6c5d4h3s2c'));
  });

  it('counts raises: a bet of 10, then raises to 20, 30 and 50', () => {
    const [bet, min, raise, next] = bars(art('basics/rules/actions', 'The smallest raise'));
    expect(min).toBe(bet + bet);
    expect(next).toBe(raise + (raise - bet));
  });

  it('turns money into big blinds', () => {
    expect(chips(art('basics/first-strategy/big-blinds', 'Same money, different stacks'))).toEqual([200 / 2, 200 / 5]);
    expect(bars(art('basics/first-strategy/big-blinds', 'Why big blinds'))).toEqual([50 / 2, 50 / 50]);
    expect(pick(art('basics/first-strategy/odds', 'Three ways to say it'), 'ring').value).toBe(1 / (3 + 1));
  });

  it('writes suited and offsuit hands with the right suits', () => {
    const suited = step('basics/first-strategy/starting-hands', 'Suited: AKs');
    const offsuit = step('basics/first-strategy/starting-hands', 'Offsuit: AKo');
    if (suited.kind !== 'hand' || offsuit.kind !== 'hand') throw new Error('expected hand steps');
    const [a, b] = parseCards(suited.cards);
    const [c, d] = parseCards(offsuit.cards);
    expect(suitIndex(a)).toBe(suitIndex(b));
    expect(suitIndex(c)).not.toBe(suitIndex(d));
    expect([rankOf(a), rankOf(b), rankOf(c), rankOf(d)].join('')).toBe('AKAK');
  });
});

describe('foundations pictures', () => {
  it('pot odds and EV, branch by branch', () => {
    const [pot, bet, call] = bars(art('foundations/math/pot-odds', 'The pot after you call'));
    expect(call / (pot + bet + call)).toBe(potOdds(pot + bet, call));
    expect(potOdds(pot + bet, call)).toBe(0.25);
    const tree = pick(art('foundations/math/ev', 'A call, branch by branch'), 'tree');
    expect(tree.branches.map((b) => b.value)).toEqual(['+150', '−50']);
    expect(0.3 * 150 - 0.7 * 50).toBeCloseTo(callEV(150, 50, 0.3), 12);
  });

  const outs = (hole: string, board: string, made: (c: HandCategory) => boolean) =>
    remainingDeck(parseCards(hole + board)).filter((c) => made(categoryOf(evaluate([...parseCards(hole + board), c])))).length;

  it('counts 15 outs for J♥T♥ on 9♥8♥2♣', () => {
    const c = pick(art('foundations/math/outs', 'A 15 out draw'), 'cards');
    expect(outs(c.cards, c.board!, (k) => k >= HandCategory.Straight)).toBe(15);
  });

  it('counts 8 outs for the open ender and prices implied odds exactly', () => {
    const s = step('foundations/math/implied-odds', 'The open ender');
    if (s.kind !== 'hand') throw new Error('expected a hand');
    expect(outs(s.cards, s.board!, (k) => k === HandCategory.Straight)).toBe(8);
    expect(remainingDeck(parseCards(s.cards + s.board)).length).toBe(46);
    expect(r1(outsToEquity(8, 46, 1) * 100)).toBe(17.4);
    expect(bars(art('foundations/math/implied-odds', 'The pot you need when you hit'))).toEqual([100, 20 / (8 / 46)]);
    expect(20 / (8 / 46)).toBe(115);
  });

  it('a low flush draw loses to every hand with 2 hearts when a heart comes', () => {
    const s = step('foundations/math/implied-odds', 'A low flush draw');
    if (s.kind !== 'hand') throw new Error('expected a hand');
    const seen = parseCards(s.cards + s.board);
    const hearts = remainingDeck(seen).filter((c) => suitIndex(c) === suitIndex(parseCards('2h')[0]));
    expect(hearts).toHaveLength(9);
    for (const turn of hearts) {
      const hero = evaluate([...seen, turn]);
      expect(categoryOf(hero)).toBe(HandCategory.Flush);
      const rest = hearts.filter((c) => c !== turn);
      for (let i = 0; i < rest.length; i++)
        for (let j = i + 1; j < rest.length; j++) expect(evaluate([rest[i], rest[j], ...parseCards(s.board!), turn])).toBeGreaterThan(hero);
    }
  });

  it('card removal, sets and AK in the combos lesson', () => {
    const board = parseCards(pick(art('foundations/math/combos', 'Card removal'), 'cards').board!);
    const live = (range: string, dead: Card[]) => parseComboRange(range, dead).length;
    expect([live('AA', board), live('AK', board)]).toEqual([3, 12]);
    const ak = quiz('foundations/math/combos', 'You hold one ace and the board shows one king. How many AK combos can villain have?');
    expect(live('AK', parseCards(ak.cards! + ak.board))).toBe(Number(ak.choices[ak.answer]));
    const sets = quiz('foundations/math/combos', 'The board is K72 with three suits. You hold none of those ranks. How many set combos can villain have?');
    expect(live('KK, 77, 22', parseCards(sets.board!))).toBe(Number(sets.choices[sets.answer]));
  });

  it('a single raised pot and a 3bet pot', () => {
    expect(chips(art('foundations/math/spr', 'A single raised pot is deep'))).toEqual([2.5 + 2.5 + 0.5, 100 - 2.5]);
    expect(r1(97.5 / 5.5)).toBe(17.7);
  });

  it('balanced bets and regret matching', () => {
    const tree = pick(art('foundations/theory/what-is-gto', 'Every choice earns the same'), 'tree');
    expect(tree.branches.map((b) => b.value)).toEqual(['+10bb', '+10bb', '+10bb']);
    const regrets = [6, 2, -3];
    const positive = regrets.map((r) => Math.max(0, r));
    const total = positive.reduce((a, b) => a + b);
    expect(bars(art('foundations/theory/solvers', 'Regret becomes a mix'))).toEqual(positive.map((r) => (r / total) * 100));
  });
});

describe('preflop pictures', () => {
  const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);

  it('prices the big blind against small blind opens', () => {
    // SB opens to 2.5bb or 3bb, so the pot before the BB acts is the open plus 1bb.
    expect(bars(art('preflop/rfi/rfi-sb', 'A bigger open, a worse price'))).toEqual([2.5, 3].map((o) => r1(potOdds(o + 1, o - 1) * 100)));
  });

  it('cold 3bet SPRs and the set mining flop', () => {
    expect(bars(art('preflop/vs-open/cold-3bet', 'What the size does to SPR'))).toEqual([r1((100 - 7.5) / (7.5 + 7.5 + 1.5)), r1((100 - 10) / (10 + 10 + 1))]);
    const flop = pick(art('preflop/vs-open/flatting', 'The flop you are hoping for'), 'cards');
    expect(category(flop.cards + flop.board)).toBe(HandCategory.Trips);
  });

  it('quotes the small blind chart against a button open', () => {
    const f = actionFrequencies(chart('9max-100-sb-vs-btn'));
    expect(f.call ?? 0).toBe(0);
    expect(Math.round((f['3bet'] ?? 0) * 100)).toBe(17);
  });

  it('3bet and 4bet pots, and how strong each opening range is', () => {
    expect(chips(art('preflop/3bet-pots/vs-3bet', 'Lower SPR after a call'))).toEqual([11 + 11 + 0.5, 100 - 11]);
    expect([r1(89 / 22.5), r1((100 - 7.5) / 16.5)]).toEqual([4, 5.6]);
    const premiumShare = (id: string) => {
      let all = 0;
      let premium = 0;
      for (const [hand, mix] of chart(id).mixes) {
        const n = (mix.raise ?? 0) * comboCount(hand);
        all += n;
        if (['AA', 'KK', 'QQ', 'AKs', 'AKo'].includes(hand)) premium += n;
      }
      return Math.round((premium / all) * 100);
    };
    expect(bars(art('preflop/3bet-pots/vs-3bet', 'Early opens fold less'))).toEqual(['9max-100-rfi-utg', '6max-100-rfi-utg', '9max-100-rfi-btn'].map(premiumShare));
    // SB 3bets to 11bb, the button 4bets to 25bb and the SB calls. The BB's 1bb is dead.
    expect(chips(art('preflop/3bet-pots/4bet', 'After a called 4bet'))).toEqual([25 + 25 + 1, 100 - 25]);
    expect(r1(75 / 51)).toBe(1.5);
  });

  it('open sizes, steals and 3bet prices', () => {
    // A steal must win the 1.5bb of blinds.
    expect(bars(art('preflop/stack-depth/open-sizing', 'What the open risks'))).toEqual([2, 3].map((o) => r1(bluffBreakeven(1.5, o) * 100)));
    const curve = pick(art('preflop/stack-depth/open-sizing', 'Bigger opens, worse prices'), 'curve');
    for (const [o, y] of curve.points) expect(y).toBeCloseTo(r1(potOdds(1.5 + o, o - 1) * 100), 9);
    // Opener calls a 3bet to 7.5bb or 11bb after opening 2.5bb, with the blinds' money in the pot.
    expect(bars(art('preflop/stack-depth/open-sizing', '3bet bigger out of position'))).toEqual([
      r1(potOdds(7.5 + 2.5 + 1.5, 5) * 100),
      r1(potOdds(11 + 2.5 + 0.5, 8.5) * 100),
    ]);
    expect(bars(art('preflop/live-preflop/big-opens', 'A worse price means fewer defends'))).toEqual([2.5, 5, 8].map((o) => r1(potOdds(1.5 + o, o - 1) * 100)));
  });

  it('multiway folds behind a limper and rake on a called pot', () => {
    expect(bars(art('preflop/live-preflop/limped-pots', 'A bluff must get through everyone'))).toEqual([1, 2, 3].map((n) => r1(0.6 ** n * 100)));
    const rake = Math.min(0.1 * 31, 5) + 1;
    expect(rake).toBeCloseTo(4.1, 12);
    expect(bars(art('preflop/stack-depth/rake', 'The same call, with rake'))).toEqual([r1((12 / 31) * 100), r1((12 / (31 - rake)) * 100)]);
  });
});

describe('postflop pictures', () => {
  it('defense against a third pot bet and the geometric curve', () => {
    expect(pick(art('postflop/cbet/cbet-ip', 'The big blind must defend 75%'), 'ring').value).toBeCloseTo(mdf(1, 1 / 3), 12);
    const curve = pick(art('postflop/cbet/sizing', 'Lower SPR, smaller bets'), 'curve');
    for (const [s, y] of curve.points) expect(y).toBeCloseTo(r1(geometricBetFraction(1, s, 3) * 100), 9);
    // The geometric size reaches the pot at SPR 13.
    expect(geometricBetFraction(1, 13, 3)).toBeCloseTo(1, 12);
  });

  it('turn cards on 8♣6♦2♠: the 5 makes straights for 74 and 43', () => {
    const slow = step('postflop/later-streets/barreling', 'Slow down on turns that help them');
    if (slow.kind !== 'board') throw new Error('expected a board');
    expect(category('7h4c' + slow.board)).toBe(HandCategory.Straight);
    expect(category('4h3c' + slow.board)).toBe(HandCategory.Straight);
  });

  it('multiway bluffs and shared defense', () => {
    expect(bars(art('postflop/multiway/multiway', 'Bluffs work far less'))).toEqual([r1(bluffBreakeven(1, 0.5) * 100), 50, r1(0.6 ** 3 * 100)]);
    const each = (n: number) => r1((1 - 0.5 ** (1 / n)) * 100);
    expect(bars(art('postflop/multiway/multiway', 'Each player defends less'))).toEqual([each(1), each(2), each(3)]);
    expect(bars(art('postflop/multiway/multiway-cbet', 'Share the defense'))).toEqual([each(1), each(2)]);
  });

  it('small river bets and river raises', () => {
    const [pot, lead, raise] = bars(art('postflop/river/block-bets', 'The risk is the raise'));
    expect(r1(bluffBreakeven(pot + lead, raise) * 100)).toBe(44.4);
    expect(pick(art('postflop/river/block-bets', 'Facing a small bet'), 'ring').value).toBeCloseTo(mdf(1, 0.25), 12);
    expect(r1(potOdds(1.25, 0.25) * 100)).toBe(16.7);
    // Villain bets 50 into 100. A raise to r risks r to win 150. Villain then calls r − 50 into 150 + r.
    const sizes = [100, 200].flatMap((r) => [r1(bluffBreakeven(150, r) * 100), r1(potOdds(150 + r, r - 50) * 100)]);
    expect(bars(art('postflop/river/river-raises', 'Size choices'))).toEqual(sizes);
  });
});

describe('exploit, mindset and tournament pictures', () => {
  it('shows real top pairs and second pairs', () => {
    const top = quiz('exploit/profiling/population', 'A passive regular raises your river bet big. You hold top pair. What is your default?');
    expect(category(top.cards! + top.board)).toBe(HandCategory.Pair);
    expect(rankOf(parseCards(top.cards!)[0])).toBe(rankOf(parseCards(top.board!)[0]));
    const shove = quiz(
      'exploit/tells/bet-patterns',
      'A recreational player who has been passive all night shoves the river for 1.5x pot. You hold top pair, good kicker. What is your default?',
    );
    expect(category(shove.cards! + shove.board)).toBe(HandCategory.Pair);
    const second = step('exploit/adjustments/vs-station', 'Second pair, against a station');
    if (second.kind !== 'hand') throw new Error('expected a hand');
    expect(category(second.cards + second.board)).toBe(HandCategory.Pair);
    // The board's second highest rank is the one paired.
    expect(rankOf(parseCards(second.board!)[1])).toBe('9');
  });

  it('bankroll in buy ins and risk of ruin', () => {
    expect(bars(art('mindset/mental/bankroll', 'The same $3,000 in buy ins'))).toEqual([3000 / 300, 3000 / 100]);
    for (const [b, y] of pick(art('mindset/mental/bankroll', 'More buy ins, less risk'), 'curve').points) {
      const ror = Math.exp((-2 * 10 * b * 100) / 100 ** 2) * 100;
      expect(y).toBeCloseTo(ror < 1 ? Math.round(ror * 100) / 100 : r1(ror), 9);
    }
  });

  it('push or fold prices and heads up money', () => {
    // SB shoves 10bb or 20bb into a 2.5bb pot. The BB has 1bb in, so it calls the shove minus 1bb.
    const [ten, twenty, eq] = bars(art('tournaments/mtt-basics/push-fold', 'The gap: callers need more'));
    expect([ten, twenty]).toEqual([r1(potOdds(2.5 + 9.5, 9) * 100), r1(potOdds(2.5 + 19.5, 19) * 100)]);
    expect(eq).toBe(30.7);
    for (const [x, y] of pick(art('tournaments/mtt-basics/final-table', 'Heads up, chips are money again'), 'curve').points) expect(y).toBeCloseTo(250 + (x / 100) * 150, 9);
  });
});

/**
 * The picture pass: text steps turned into bars, rings, chips, curves, trees,
 * hands and boards. Every number is recomputed here, and every hand claim is
 * checked with the evaluator.
 */
describe('picture pass: foundations', () => {
  it('EV, outs, MDF and combos', () => {
    // Calling 100 into 200: win 200 against a bluff, lose 100 against value.
    const call = (b: number) => b * 200 - (1 - b) * 100;
    bars(art('foundations/math/ev', 'A bluff catcher facing a pot bet')).forEach((v, i) => expect(v).toBeCloseTo(call([0.2, 1 / 3, 0.5][i]), 9));
    expect(bars(art('foundations/math/outs', 'Price one card at a time'))).toEqual([r1((9 / 47) * 100), r1(outsToEquity(9, 47, 2) * 100)]);
    expect(bars(art('foundations/math/mdf-alpha', 'One half pot bet, three numbers'))).toEqual([
      r1(bluffBreakeven(1, 0.5) * 100),
      r1(mdf(1, 0.5) * 100),
      r1(potOdds(1.5, 0.5) * 100),
    ]);
    expect(bars(art('foundations/math/combos', 'Combos per hand'))).toEqual([comboCount('QQ'), comboCount('AKs'), comboCount('AKo'), comboCount('AKs') + comboCount('AKo')]);
    expect(r1(16 / 6)).toBe(2.7);
  });

  it('geometric bets in a single raised pot', () => {
    const f = geometricBetFraction(5.5, 97.5, 3);
    expect(Math.round(f * 100)).toBe(116);
    let pot = 5.5;
    const sizes: number[] = [];
    for (let i = 0; i < 3; i++) {
      sizes.push(f * pot);
      pot += 2 * f * pot;
    }
    expect(sizes.reduce((a, b) => a + b)).toBeCloseTo(97.5, 9);
    expect(bars(art('foundations/math/spr', 'Same fraction, growing bets'))).toEqual(sizes.map(r1));
  });

  it('bluff catchers, a missed board and the shared ace', () => {
    expect(bars(art('foundations/ranges/range-shapes', 'Facing a polarized bet'))).toEqual([1 / 3, 1 / 2, 1, 2].map((b) => r1(potOdds(1 + b, b) * 100)));
    const s = step('foundations/ranges/range-shapes', 'A pure bluff catcher');
    if (s.kind !== 'hand') throw new Error('expected a hand');
    expect(category(s.cards + s.board)).toBe(HandCategory.Pair);
    // Top pair: the king is the highest board card.
    expect(rankOf(parseCards(s.board!)[0])).toBe('K');
    // The hearts missed and no straight is possible: no 2 cards make a straight or flush.
    const left = remainingDeck(parseCards(s.cards + s.board));
    for (let i = 0; i < left.length; i++)
      for (let j = i + 1; j < left.length; j++) {
        const c = categoryOf(evaluate([left[i], left[j], ...parseCards(s.board!)]));
        expect([HandCategory.Straight, HandCategory.Flush, HandCategory.StraightFlush]).not.toContain(c);
      }
    const dom = step('foundations/theory/equity-benchmarks', 'Why domination hurts');
    if (dom.kind !== 'hand') throw new Error('expected a hand');
    expect(new Set(parseCards(dom.cards + 'AsKd')).size).toBe(4);
    expect(rankOf(parseCards(dom.cards)[0])).toBe('A');
  });

  it('pairs against overcards, exact over every board', () => {
    const eq = (a: string, b: string) => r1(exactEquity(parseCards(a) as [Card, Card], parseCards(b) as [Card, Card], []).equity * 100);
    expect(bars(art('foundations/theory/equity-benchmarks', 'Not all flips are equal'))).toEqual([eq('8s8h', 'AdKc'), eq('8s8h', 'AdKd'), eq('AsKd', '2c2h')]);
  }, 60_000);
});

describe('picture pass: preflop', () => {
  const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
  const vsRange = (hand: string, combos: (dead: Card[]) => ReturnType<typeof rangeToCombos>) => {
    const hero = parseCards(hand) as [Card, Card];
    return equityVsRange(hero, combos(hero), [], { iterations: 200_000, rng: seededRng(7) }).equity * 100;
  };

  it('big blind hands that clear the price but fold', () => {
    const btn = actionRange(chart('9max-100-rfi-btn'), 'raise');
    const [price, ...rest] = bars(art('preflop/vs-open/bb-defense', 'Where the defending range stops'));
    expect(price).toBe(r1(potOdds(4, 1.5) * 100));
    const eqs = ['Th6c', '9h3c', '6h4c', '4c2c'].map((h) => Math.round(vsRange(h, (dead) => rangeToCombos(btn, dead))));
    expect(rest).toEqual(eqs);
    for (const e of eqs) expect(e).toBeGreaterThan(price);
  }, 30_000);

  it('4bet bluffs against QQ+ and AK', () => {
    // Exact over every board, averaged over the combos left (computed once by enumeration, about 50s each; checked here by sampling).
    const EXACT = { As5s: 30.153, Ks5s: 24.449, AsQd: 24.42 };
    for (const [hand, exact] of Object.entries(EXACT)) expect(Math.abs(vsRange(hand, (dead) => parseComboRange('QQ+, AK', dead)) - exact)).toBeLessThan(0.4);
    expect(bars(art('preflop/3bet-pots/4bet', 'Why the ace, not the king'))).toEqual(Object.values(EXACT).map(Math.round));
  }, 30_000);

  it('button flats, squeezes, rake and depth', () => {
    const f = actionFrequencies(chart('9max-100-btn-vs-co'));
    expect([Math.round(f.call * 100), Math.round(f['3bet'] * 100)]).toEqual([11, 8]);
    expect(bars(art('preflop/vs-open/squeeze', 'Folds a pure bluff needs'))).toEqual([r1(bluffBreakeven(4, 10) * 100), r1(bluffBreakeven(6.5, 12) * 100)]);
    // 5% rake on a 5.5bb pot is under the 3bb cap.
    const raked = 5.5 - 0.05 * 5.5;
    expect(raked).toBeCloseTo(5.225, 12);
    expect(bars(art('preflop/stack-depth/rake', 'Close calls flip first'))).toEqual([0.28 * 5.5 - 1.5, 0.28 * raked - 1.5].map((x) => Math.round(x * 100) / 100));
    expect(r1((1.5 / raked) * 100)).toBe(28.7);
    expect(chips(art('preflop/stack-depth/depth', 'What depth changes'))).toEqual([22.5, 40 - 11, 200 - 11]);
    // 40bb: BB 3bets to 9bb, the button jams, the SB's 0.5bb is in.
    expect(pick(art('preflop/stack-depth/depth', 'Shallow 3bets get called by jams'), 'ring').value).toBeCloseTo(potOdds(40 + 9 + 0.5, 31), 12);
    expect(r1(potOdds(49.5, 31) * 100)).toBe(38.5);
    expect(pick(art('preflop/stack-depth/open-sizing', 'The small blind opens bigger'), 'ring').value).toBeCloseTo(potOdds(4, 2), 12);
  });

  it('big opens, straddles and limped pots', () => {
    const spr = (open: number, players: number) => r1((100 - open) / (players * open + 1.5));
    expect(bars(art('preflop/live-preflop/big-opens', 'SPR after the call'))).toEqual([spr(2.5, 2), spr(5, 2), spr(8, 2), spr(8, 4)]);
    expect(bars(art('preflop/live-preflop/big-opens', '3bet linear, for value'))).toEqual([r1(bluffBreakeven(4, 7.5) * 100), r1(bluffBreakeven(9.5, 24) * 100)]);
    expect(chips(art('preflop/live-preflop/straddles', 'The straddle is the new big blind')).reduce((a, b) => a + b)).toBe(3.5);
    // A 6bb open into 3.5bb of blinds: SB, BB and straddle call the open minus what they posted.
    expect(bars(art('preflop/live-preflop/straddles', 'Prices against a 6bb button open'))).toEqual([5.5, 5, 4].map((c) => r1(potOdds(9.5, c) * 100)));
    const [pot, behind] = chips(art('preflop/live-preflop/limped-pots', 'Multiway limped pots after the flop'));
    expect([pot, behind]).toEqual([3 + 1 + 0.5, 100 - 1]);
    expect(Math.round(behind / pot)).toBe(22);
  });
});

describe('picture pass: postflop', () => {
  const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);

  it('bet sizes and boards', () => {
    expect(bars(art('postflop/cbet/sizing', 'Why small works with a wide range'))).toEqual([r1(bluffBreakeven(1, 1 / 3) * 100), r1(bluffBreakeven(1, 0.75) * 100)]);
    const low = step('postflop/later-streets/turn-cards', 'A low turn on K72');
    if (low.kind !== 'board') throw new Error('expected a board');
    expect(category('7c6s' + low.board)).toBe(HandCategory.TwoPair);
    expect(category('5s6s' + low.board)).toBe(HandCategory.Pair);
    const flushes = (hole: string) => {
      const hearts = remainingDeck(parseCards(hole + 'AhKh7c4h2s')).filter((c) => suitIndex(c) === suitIndex(parseCards('2h')[0])).length;
      return (hearts * (hearts - 1)) / 2;
    };
    expect(bars(art('postflop/later-streets/bluff-catching', 'Villain’s flush combos'))).toEqual([flushes('QsQc'), flushes('QhQd')]);
  });

  it('who holds overpairs and trips on 8♠8♦3♣', () => {
    const board = parseCards('8s8d3c');
    const share = (id: string, action: string, test: (c: Card[]) => boolean) => {
      let all = 0;
      let hit = 0;
      for (const c of rangeToCombos(actionRange(chart(id), action), board)) {
        all += c.weight;
        if (test(c.cards)) hit += c.weight;
      }
      return r1((hit / all) * 100);
    };
    const over = (c: Card[]) => rankOf(c[0]) === rankOf(c[1]) && '9TJQKA'.includes(rankOf(c[0]));
    const trips = (c: Card[]) => categoryOf(evaluate([...c, ...board])) >= HandCategory.Trips;
    expect(bars(art('postflop/textures/who-it-favors', 'Reading the numbers'))).toEqual([
      share('9max-100-rfi-btn', 'raise', over),
      share('9max-100-bb-vs-btn', 'call', over),
      share('9max-100-rfi-btn', 'raise', trips),
      share('9max-100-bb-vs-btn', 'call', trips),
    ]);
  });

  it('top pair against one random hand, exact', () => {
    const hero = parseCards('KsQd') as [Card, Card];
    const board = parseCards('Kh8c4d');
    const left = remainingDeck([...hero, ...board]);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < left.length; i++)
      for (let j = i + 1; j < left.length; j++) {
        sum += exactEquity(hero, [left[i], left[j]], board).equity;
        n++;
      }
    expect(bars(art('postflop/multiway/multiway', 'Top pair, good kicker vs more hands'))[0]).toBe(r1((sum / n) * 100));
  }, 60_000);

  it('river sizes, raises and low SPR pots', () => {
    expect(bars(art('postflop/river/overbets', 'What villain needs'))).toEqual([1, 1.5, 2].map((b) => r1(potOdds(1 + b, b) * 100)));
    const raise = step('postflop/river/river-raises', 'Why the bar is so high');
    if (raise.kind !== 'hand') throw new Error('expected a hand');
    const mine = score(raise.cards + raise.board);
    expect(category(raise.cards + raise.board)).toBe(HandCategory.TwoPair);
    // Flushes, straights and sets all beat top two pair here.
    for (const villain of ['Ah3h', 'QcJc', 'Jd7c', '7s6c', '8h8c', '4d4s', '2c2d']) expect(score(villain + raise.board)).toBeGreaterThan(mine);
    expect(bars(art('postflop/3bet-postflop/cbet-3bp', 'Stack to pot ratio on the flop'))).toEqual([r1(97.5 / 5.5), r1(89 / 22.5), r1(92.5 / 16.5)]);
    // Pot 1 with 4 behind: shoved on at once, or after a third pot bet.
    expect(bars(art('postflop/3bet-postflop/low-spr', 'Bet, then shoved on'))).toEqual([r1(potOdds(1 + 4, 4) * 100), r1(potOdds(1 + 1 / 3 + 4, 4 - 1 / 3) * 100)]);
  });
});

describe('picture pass: exploit, mindset and tournaments', () => {
  it('exploit numbers', () => {
    const [one, two, blinds] = bars(art('exploit/adjustments/live-limpers', 'How big to raise'));
    expect([two, blinds]).toEqual([one + 2, one + 1]);
    expect(bars(art('exploit/adjustments/node-lock', 'River, pot 100, bet 100')).map(Math.round)).toEqual([Math.round(0.6 * 100 - 0.4 * 100), Math.round(0.1 * 200 - 0.9 * 100)]);
    expect((0.75 * 1.5) / 0.25).toBeCloseTo(4.5, 12);
    const nit = step('exploit/adjustments/vs-nit', 'Do not pay off');
    if (nit.kind !== 'hand') throw new Error('expected a hand');
    expect(category(nit.cards + nit.board)).toBe(HandCategory.Pair);
    expect(rankOf(parseCards(nit.board!)[0])).toBe(rankOf(parseCards(nit.cards)[1]));
    expect(pick(art('exploit/profiling/archetypes', 'Why the counters point opposite ways'), 'ring').value).toBe(bluffBreakeven(1, 1));
    for (const [n, y] of pick(art('exploit/profiling/hud-stats', 'The error shrinks slowly'), 'curve').points) expect(y).toBe(r1(Math.sqrt((0.25 * 0.75) / n) * 100));
    // 7 or more folds in 10 chances at a true 50%.
    const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n, k - 1) * (n - k + 1)) / k);
    const p = [7, 8, 9, 10].reduce((s, k) => s + choose(10, k), 0) / 2 ** 10;
    expect(pick(art('exploit/profiling/hud-stats', 'Chances, not hands'), 'ring').value).toBe(p);
    expect(r1(p * 100)).toBe(17.2);
    expect(bars(art('exploit/tells/physical', 'Close calls only'))).toEqual([0.1, 0.3, 0.36].map((b) => Math.round(b * 300 - 100)));
  });

  it('variance, drawdowns and a reviewed river call', () => {
    for (const [n, y] of pick(art('mindset/mental/variance', 'What the table says'), 'curve').points) expect(y).toBe(r1((1.96 * 100) / Math.sqrt((n * 1000) / 100)));
    expect(bars(art('mindset/mental/variance', 'Chance of ever falling this far'))).toEqual([5, 10, 15, 20].map((b) => r1(Math.exp((-2 * 10 * b * 100) / 100 ** 2) * 100)));
    expect(bars(art('mindset/study/hand-review', 'River: call 75 into 100'))).toEqual([0.4, 0.3, 0.2].map((b) => Math.round(b * 250 - 75)));
    expect(bars(art('mindset/mental/tilt', 'Illustration: a fifth of hands on tilt'))).toEqual([10, -20, 0.8 * 10 + 0.2 * -20]);
  });

  it('antes, push or fold and fold equity behind', () => {
    expect(chips(art('tournaments/mtt-basics/antes', 'The pot before anyone acts'))).toEqual([0.5 + 1, 0.5 + 1 + 1]);
    expect(0.5 + 1 + 9 * 0.125).toBe(2.625);
    expect(bars(art('tournaments/mtt-basics/antes', 'Prices with and without the ante'))).toEqual([
      r1(bluffBreakeven(1.5, 2.2) * 100),
      r1(bluffBreakeven(2.5, 2.2) * 100),
      r1(potOdds(3.7, 1.2) * 100),
      r1(potOdds(4.7, 1.2) * 100),
    ]);
    expect(pick(art('tournaments/mtt-basics/push-fold', 'Why short stacks shove'), 'ring').value).toBeCloseTo(2.2 / 10, 12);
    expect(bars(art('tournaments/mtt-basics/push-fold', 'Fold equity compounds with players behind'))).toEqual([1, 2, 5, 8].map((n) => Math.round(0.85 ** n * 1000 + 1e-9) / 10));
  });
});


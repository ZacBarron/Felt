import {
  actionFrequencies,
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

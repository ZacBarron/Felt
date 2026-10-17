import { buildChart, handClassOf, parseCards, potOdds } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { cardsFor, GENERATED_QUESTIONS, LESSON_CONTENT, quizVersions, STARTER_CHARTS, verdictFor, type QuizStep } from '../src';

/**
 * Generated question versions, checked again from the charts and the math,
 * independently of how they were made.
 */

const quiz = (key: string, question: string) => LESSON_CONTENT.get(key)!.steps.find((s): s is QuizStep => s.kind === 'quiz' && s.question === question)!;
const chart = (id: string) => buildChart(STARTER_CHARTS.find((c) => c.id === id)!);
const handOf = (cards: string) => {
  const [a, b] = parseCards(cards);
  return handClassOf(a, b);
};
const picked = (v: QuizStep) => v.choices[v.answer];
const num = (re: RegExp, s: string) => Number(s.match(re)![1].replace(/,/g, ''));
const pct1 = (x: number) => {
  const r = Math.round(x * 1000) / 10;
  return Number.isInteger(r) ? `${r}%` : `${r.toFixed(1)}%`;
};

describe('generated versions', () => {
  it('adds versions to every question it names', () => {
    for (const g of GENERATED_QUESTIONS) expect(quizVersions(quiz(g.key, g.question)).length, g.question).toBeGreaterThanOrEqual(4);
  });

  it('deals cards that match the hand, in fixed suits', () => {
    for (const h of ['AA', 'AKs', 'AKo', '72o', '22', 'T9s']) {
      const c = cardsFor(h, 'salt');
      expect(handOf(c)).toBe(h);
      expect(cardsFor(h, 'salt')).toBe(c);
    }
  });

  it('reads charts plainly: every time, a raise or fold mix, or never', () => {
    expect(verdictFor({ raise: 1 }, 'raise')).toBe('pure');
    expect(verdictFor({ fold: 1 }, 'raise')).toBe('fold');
    expect(verdictFor({ raise: 0.4, fold: 0.6 }, 'raise')).toBe('mix');
    expect(verdictFor({ raise: 0.9, fold: 0.1 }, 'raise')).toBeUndefined();
    expect(verdictFor({ raise: 0.5, call: 0.5 }, 'raise')).toBeUndefined();
  });

  it('gives chart questions the answer the chart gives, for the hand on show', () => {
    for (const g of GENERATED_QUESTIONS) {
      if (!g.verdict || !g.chartId || !g.action) continue;
      const all = quizVersions(quiz(g.key, g.question));
      const base = picked(all[0]);
      const c = chart(g.chartId);
      for (const v of all) {
        const hand = handOf(v.cards!);
        expect(picked(v), v.question).toBe(base);
        if (!v.generated) continue;
        expect(verdictFor(c.mixes.get(hand)!, g.action!), `${g.chartId} ${hand}`).toBe(g.verdict);
        // The hand in the words is the hand on show.
        const named = v.question.match(/\b([AKQJT2-9]{2}[so]?)\b/)?.[1];
        if (named && /[so]$|^(.)\1$/.test(named)) expect(named).toBe(hand);
      }
      // A generated version never repeats a hand another version asks about.
      const made = all.filter((v) => v.generated);
      expect(made.length).toBeGreaterThan(0);
      for (const v of made) expect(all.filter((x) => handOf(x.cards!) === handOf(v.cards!)), v.question).toHaveLength(1);
    }
  });

  it('gives the pair ladder question its true answer for each hand', () => {
    const c = chart('9max-100-rfi-utg');
    const all = quizVersions(quiz('preflop/rfi/rfi-ep', 'Folded to you UTG with 66. What does the chart do?'));
    const answers = new Set<number>();
    for (const v of all) {
      const raise = c.mixes.get(handOf(v.cards!))!.raise ?? 0;
      const want = raise >= 1 - 1e-9 ? 'Raise every time' : raise >= 0.5 ? 'Raise most of the time and fold the rest' : raise <= 1e-9 ? 'Fold every time' : 'none';
      expect(picked(v), v.question).toBe(want);
      answers.add(v.answer);
    }
    // The versions land on more than one answer.
    expect(answers.size).toBeGreaterThan(1);
  });

  it('works out every price and count from the numbers in the question', () => {
    const check = (key: string, question: string, answer: (q: string) => string) => {
      for (const v of quizVersions(quiz(key, question))) expect(picked(v), v.question).toBe(answer(v.question));
    };
    check('basics/rules/actions', 'Someone bets 6 chips. What is the smallest raise you can make?', (q) => `To ${2 * num(/bets (\d+)/, q)}`);
    check('basics/first-strategy/big-blinds', 'You sit down at $1/$2 with $300. How deep are you?', (q) => `${num(/with \$([\d,]+)/, q) / num(/\/\$(\d+)/, q)}bb`);
    check('basics/first-strategy/big-blinds', 'At $2/$5 someone bets $50. How big is that in big blinds?', (q) => `${num(/bets \$(\d+)/, q) / num(/\/\$(\d+)/, q)}bb`);
    check('basics/first-strategy/odds', 'A draw is 4 to 1 against. What percentage is that?', (q) => `${Math.round((100 / (num(/is (\d+) to 1/, q) + 1)) * 10) / 10}%`);
    check('basics/money/card-room', 'An example room takes 10% of the pot up to $5, plus $1. How much rake does a $30 pot pay?', (q) => `$${Math.min(num(/a \$(\d+) pot/, q) * 0.1, 5) + 1}`);
    check('basics/money/bankroll-start', 'Your bankroll is $4,000. You play 1/2 with $200 buy ins. How many buy ins do you have?', (q) => String(num(/bankroll is \$([\d,]+)/, q) / num(/with \$([\d,]+) buy ins/, q)));
    check('preflop/rfi/rfi-sb', 'You open to 3bb from the small blind. What raw equity does the big blind need to call?', (q) => {
      const r = num(/open to ([\d.]+)bb/, q);
      return pct1(potOdds(r + 1, r - 1));
    });
    check('preflop/vs-open/sb-vs-open', 'The button opens to 2.5bb. In the small blind, what raw equity does a call need?', (q) => {
      const o = num(/opens to ([\d.]+)bb/, q);
      return pct1(potOdds(o + 1.5, o - 0.5));
    });
  });
});

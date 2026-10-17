import { parseCards } from '@felt/core';
import { describe, expect, it } from 'vitest';
import {
  LESSON_CONTENT,
  quizVersion,
  quizVersions,
  relabelCards,
  relabelSymbols,
  stepVersion,
  SUIT_ORDERS,
  variantSeed,
  versionCount,
  withSuits,
  type QuizStep,
} from '../src';

/**
 * Question versions: a quiz can deal another seat, hand, board or size
 * (`variants`), or the same cards in other suits (`shuffleSuits`). Every
 * version of every question must be as sound as the question itself.
 */

const all = [...LESSON_CONTENT.values()].flatMap((l) =>
  l.steps.flatMap((s, i) => (s.kind === 'quiz' ? [{ key: l.key, index: i, quiz: s as QuizStep }] : [])),
);
const versions = all.flatMap(({ key, quiz }) => quizVersions(quiz).map((v, n) => ({ key, v, n })));
const SUIT_WORDS = /\b(spades?|hearts?|diamonds?|clubs?)\b/i;

describe('picking a version', () => {
  const sample = all.find((x) => x.quiz.variants && x.quiz.shuffleSuits)!.quiz;

  it('deals the question as written at seed 0', () => {
    for (const { quiz } of all) {
      const { variants: _, ...base } = quiz;
      expect(quizVersion(quiz, 0)).toEqual(base);
    }
  });

  it('reaches every version and every suit order from some seed', () => {
    const n = quizVersions(sample).length;
    expect(versionCount(sample)).toBe(n * 24);
    const seen = new Set<string>();
    for (let seed = 0; seed < versionCount(sample); seed++) seen.add(JSON.stringify(quizVersion(sample, seed)));
    expect(seen.size).toBe(versionCount(sample));
    // Negative and fractional seeds still pick a version.
    expect(quizVersion(sample, -3).question).toBeTypeOf('string');
    expect(quizVersion(sample, 2.7).question).toBe(quizVersion(sample, 2).question);
  });

  it('leaves other steps alone', () => {
    const l = LESSON_CONTENT.get('foundations/math/pot-odds')!;
    for (const s of l.steps) if (s.kind !== 'quiz') expect(stepVersion(s, 12345)).toBe(s);
  });

  it('has 24 suit orders, starting with the identity, and relabels both ways', () => {
    expect(new Set(SUIT_ORDERS).size).toBe(24);
    expect(SUIT_ORDERS[0]).toBe('shdc');
    for (const order of SUIT_ORDERS) {
      const inverse = 'shdc'
        .split('')
        .map((s) => 'shdc'[order.indexOf(s)])
        .join('');
      expect(relabelCards(relabelCards('AsKdQhJc2s', order), inverse)).toBe('AsKdQhJc2s');
      expect(relabelSymbols(relabelSymbols('A♠ K♦ Q♥ J♣', order), inverse)).toBe('A♠ K♦ Q♥ J♣');
      // Cards and their symbols move together.
      expect(relabelSymbols('A♠', order)).toBe(`A${'♠♥♦♣'['shdc'.indexOf(relabelCards('As', order)[1])]}`);
    }
    expect(withSuits(sample, 'shdc')).toBe(sample);
  });

  it('turns lesson, step and day into a stable seed', () => {
    expect(variantSeed('a', 1, '2026-10-17')).toBe(variantSeed('a', 1, '2026-10-17'));
    expect(variantSeed('a', 1, '2026-10-17')).not.toBe(variantSeed('a', 1, '2026-10-18'));
    expect(variantSeed('a', 1)).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(variantSeed('x'))).toBe(true);
  });
});

describe('every version of every question', () => {
  it('has a real answer and distinct choices', () => {
    for (const { key, v } of versions) {
      const where = `${key}: ${v.question}`;
      expect(Number.isInteger(v.answer), where).toBe(true);
      expect(v.answer, where).toBeGreaterThanOrEqual(0);
      expect(v.answer, where).toBeLessThan(v.choices.length);
      expect(v.choices.length, where).toBeGreaterThanOrEqual(2);
      expect(new Set(v.choices).size, where).toBe(v.choices.length);
      if (v.choiceCards) expect(v.choiceCards, where).toHaveLength(v.choices.length);
    }
  });

  it('shows real, distinct cards in every suit order', () => {
    for (const { key, quiz } of all) {
      const orders = quiz.shuffleSuits ? SUIT_ORDERS : ['shdc'];
      for (const base of quizVersions(quiz)) {
        for (const order of orders) {
          const v = withSuits(base, order);
          const where = `${key}: ${v.question} (${order})`;
          const shown = [...parseCards(v.cards ?? ''), ...parseCards(v.board ?? '')];
          expect(new Set(shown).size, where).toBe(shown.length);
          if (v.board) expect([3, 4, 5], where).toContain(parseCards(v.board).length);
          for (const c of v.choiceCards ?? []) {
            const cards = [...parseCards(v.board ?? ''), ...parseCards(c)];
            expect(new Set(cards).size, `${where} ${c}`).toBe(cards.length);
          }
        }
      }
    }
  });

  it('changes something real in each variant', () => {
    for (const { key, quiz } of all) {
      const [base, ...rest] = quizVersions(quiz);
      for (const v of rest) {
        const differs = v.question !== base.question || v.cards !== base.cards || v.board !== base.board || JSON.stringify(v.choiceCards) !== JSON.stringify(base.choiceCards);
        expect(differs, `${key}: ${v.question}`).toBe(true);
      }
      // No two versions are the same question.
      const keys = quizVersions(quiz).map((v) => JSON.stringify([v.question, v.cards, v.board, v.choiceCards]));
      expect(new Set(keys).size, key).toBe(keys.length);
    }
  });

  it('never names a suit in words when the suits get shuffled', () => {
    const named: string[] = [];
    for (const { key, quiz } of all) {
      if (!quiz.shuffleSuits) continue;
      for (const v of quizVersions(quiz)) for (const s of [v.question, v.explain, ...v.choices]) if (SUIT_WORDS.test(s)) named.push(`${key}: ${s}`);
      // Shuffling only makes sense with cards on show.
      expect(quizVersions(quiz).some((v) => v.cards || v.board || v.choiceCards || /[♠♥♦♣]/.test(v.question)), key).toBe(true);
    }
    expect(named).toEqual([]);
  });

  it('follows the voice rules in every variant', () => {
    const bad: string[] = [];
    for (const { key, quiz } of all) {
      for (const v of quiz.variants ?? []) {
        for (const s of [v.question, v.explain, ...(v.choices ?? [])]) {
          if (!s) continue;
          if (/[;–—!]/.test(s)) bad.push(`${key}: ${s}`);
          for (const sentence of s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/)) {
            if ((sentence.match(/,/g) ?? []).length > 1) bad.push(`${key}: commas in "${sentence}"`);
            if (sentence.split(/\s+/).length >= 20) bad.push(`${key}: long "${sentence}"`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('gives a fresh question to most replays', () => {
    const varied = all.filter(({ quiz }) => versionCount(quiz) > 1).length;
    // At least 175 lesson questions can be dealt more than one way.
    expect(varied).toBeGreaterThanOrEqual(175);
    expect(all.filter(({ quiz }) => quiz.variants?.length).length).toBeGreaterThanOrEqual(120);
  });
});

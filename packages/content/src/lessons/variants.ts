import type { LessonStep } from './types';

/**
 * Question versions. A quiz can carry `variants` (another seat, hand, board
 * or size with its own answer) and `shuffleSuits` (the same cards in other
 * suits). A seed picks one version, so a replay or a review card is not the
 * same question twice. Seed 0 is always the question as written.
 */

export type QuizStep = Extract<LessonStep, { kind: 'quiz' }>;

const SUITS = 'shdc';
const SYMBOLS = '♠♥♦♣';

/** All 24 orderings of the 4 suits. The first is the identity. */
export const SUIT_ORDERS: readonly string[] = (() => {
  const out: string[] = [];
  const walk = (left: string, acc: string) => {
    if (!left) out.push(acc);
    for (let i = 0; i < left.length; i++) walk(left.slice(0, i) + left.slice(i + 1), acc + left[i]);
  };
  walk(SUITS, '');
  return out;
})();

/** Card text like "AsKd" with each suit swapped: suit `SUITS[i]` becomes `order[i]`. */
export function relabelCards(cards: string, order: string): string {
  return cards.replace(/([2-9TJQKA])([shdc])/g, (_, rank: string, suit: string) => rank + order[SUITS.indexOf(suit)]);
}

/** Words with suit symbols like "K♠" swapped the same way. */
export function relabelSymbols(text: string, order: string): string {
  return text.replace(/[♠♥♦♣]/g, (s) => SYMBOLS[SUITS.indexOf(order[SYMBOLS.indexOf(s)])]);
}

/** Every version a question can show: the base first, then each variant. */
export function quizVersions(step: QuizStep): QuizStep[] {
  const { variants, ...base } = step;
  return [base, ...(variants ?? []).map((v) => ({ ...base, ...v }))];
}

/** How many distinct questions a seed can pick from. */
export function versionCount(step: QuizStep): number {
  return quizVersions(step).length * (step.shuffleSuits ? SUIT_ORDERS.length : 1);
}

/** The version a seed picks, with its suits relabelled when the question allows it. */
export function quizVersion(step: QuizStep, seed: number): QuizStep {
  const versions = quizVersions(step);
  const n = Math.abs(Math.trunc(seed)) || 0;
  const picked = versions[n % versions.length];
  if (!step.shuffleSuits) return picked;
  const order = SUIT_ORDERS[Math.floor(n / versions.length) % SUIT_ORDERS.length];
  return withSuits(picked, order);
}

/** A question dealt in other suits: cards, board, choice cards and suit symbols in its words. */
export function withSuits(step: QuizStep, order: string): QuizStep {
  if (order === SUITS) return step;
  const t = (s: string) => relabelSymbols(s, order);
  return {
    ...step,
    question: t(step.question),
    choices: step.choices.map(t),
    explain: t(step.explain),
    cards: step.cards && relabelCards(step.cards, order),
    board: step.board && relabelCards(step.board, order),
    choiceCards: step.choiceCards?.map((c) => relabelCards(c, order)),
  };
}

/** Any lesson step at a seed: quizzes pick a version, other steps stay as they are. */
export function stepVersion(step: LessonStep, seed: number): LessonStep {
  return step.kind === 'quiz' ? quizVersion(step, seed) : step;
}

/** A stable 32 bit seed from a few parts, like a lesson key, a step and a date (FNV-1a). */
export function variantSeed(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join('|')) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

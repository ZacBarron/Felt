import type { Card } from './cards';
import { categoryOf, evaluate, HandCategory } from './evaluator';

const NAMES = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
const PLURAL = ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The tiebreak ranks packed into an evaluator score, highest first. */
function kickers(score: number): number[] {
  return [4, 3, 2, 1, 0].map((i) => Math.floor(score / 16 ** i) % 16);
}

/** The best five card hand in words, such as "Pair of kings" or "Sevens full of aces". */
export function describeHand(cards: readonly Card[]): string {
  const s = evaluate(cards);
  const [a, b] = kickers(s);
  switch (categoryOf(s)) {
    case HandCategory.HighCard:
      return `${cap(NAMES[a])} high`;
    case HandCategory.Pair:
      return `Pair of ${PLURAL[a]}`;
    case HandCategory.TwoPair:
      return `${cap(PLURAL[a])} and ${PLURAL[b]}`;
    case HandCategory.Trips:
      return `Three ${PLURAL[a]}`;
    case HandCategory.Straight:
      return `Straight to the ${NAMES[a]}`;
    case HandCategory.Flush:
      return `Flush, ${NAMES[a]} high`;
    case HandCategory.FullHouse:
      return `${cap(PLURAL[a])} full of ${PLURAL[b]}`;
    case HandCategory.Quads:
      return `Four ${PLURAL[a]}`;
    case HandCategory.StraightFlush:
      return a === 12 ? 'Royal flush' : `Straight flush to the ${NAMES[a]}`;
  }
}

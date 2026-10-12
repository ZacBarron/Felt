/**
 * Card primitives.
 *
 * A card is an integer 0..51 encoded as `rankIndex * 4 + suitIndex`, where
 * rankIndex 0 = deuce and 12 = ace. Integers keep the hot loops in the
 * evaluator and equity calculator allocation free.
 */

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['c', 'd', 'h', 's'] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type Card = number;

export const SUIT_SYMBOLS: Record<Suit, string> = { c: '♣', d: '♦', h: '♥', s: '♠' };

export function makeCard(rank: Rank, suit: Suit): Card {
  return RANKS.indexOf(rank) * 4 + SUITS.indexOf(suit);
}

export function rankIndex(card: Card): number {
  return card >> 2;
}

export function suitIndex(card: Card): number {
  return card & 3;
}

export function rankOf(card: Card): Rank {
  return RANKS[rankIndex(card)];
}

export function suitOf(card: Card): Suit {
  return SUITS[suitIndex(card)];
}

export function parseCard(text: string): Card {
  if (text.length !== 2) throw new Error(`Invalid card "${text}"`);
  const rank = text[0].toUpperCase() as Rank;
  const suit = text[1].toLowerCase() as Suit;
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) throw new Error(`Invalid card "${text}"`);
  return makeCard(rank, suit);
}

/** Parses "AsKd", "As Kd" or "As,Kd" into cards. Throws on duplicates. */
export function parseCards(text: string): Card[] {
  const compact = text.replace(/[\s,]+/g, '');
  if (compact.length % 2 !== 0) throw new Error(`Invalid card list "${text}"`);
  const cards: Card[] = [];
  for (let i = 0; i < compact.length; i += 2) cards.push(parseCard(compact.slice(i, i + 2)));
  if (new Set(cards).size !== cards.length) throw new Error(`Duplicate card in "${text}"`);
  return cards;
}

export function cardToString(card: Card): string {
  return rankOf(card) + suitOf(card);
}

export function cardsToString(cards: readonly Card[]): string {
  return cards.map(cardToString).join('');
}

export const FULL_DECK: readonly Card[] = Array.from({ length: 52 }, (_, i) => i);

/** Returns the deck minus the given cards. */
export function remainingDeck(dead: readonly Card[]): Card[] {
  const used = new Set(dead);
  return FULL_DECK.filter((c) => !used.has(c));
}

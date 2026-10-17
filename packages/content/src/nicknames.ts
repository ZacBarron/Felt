import type { HandClass } from '@felt/core';

/**
 * Table talk: the names players give some starting hands. Shown as a small
 * aside where a single hand is in focus. Decoration only, never a reason to
 * play a hand, and never on a question where it could give the answer away.
 */
export const HAND_NICKNAMES: ReadonlyMap<HandClass, string> = new Map([
  ['AA', 'Pocket rockets'],
  ['KK', 'Cowboys'],
  ['QQ', 'Ladies'],
  ['JJ', 'Fishhooks'],
  ['TT', 'Dimes'],
  ['88', 'Snowmen'],
  ['77', 'Walking sticks'],
  ['55', 'Speed limit'],
  ['44', 'Sailboats'],
  ['33', 'Crabs'],
  ['22', 'Ducks'],
  ['AKs', 'Big slick'],
  ['AKo', 'Big slick'],
  ['A8s', "Dead man's hand"],
  ['A8o', "Dead man's hand"],
  ['KQs', 'Royal couple'],
  ['KQo', 'Royal couple'],
  ['KJs', 'Kojak'],
  ['KJo', 'Kojak'],
  ['K9s', 'Canine'],
  ['K9o', 'Canine'],
  ['J5s', 'Motown'],
  ['J5o', 'Motown'],
  ['72o', 'The hammer'],
]);

export function handNickname(hand: HandClass): string | undefined {
  return HAND_NICKNAMES.get(hand);
}

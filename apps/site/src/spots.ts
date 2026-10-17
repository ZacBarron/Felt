import type { HandClass } from '@felt/core';
import { openRange } from './charts';

/**
 * "Your move": one live 1/2 spot from the app's own chart, button vs one
 * limper. It is an exploit chart for a typical live limper, so the page says
 * so. Amounts are dollars at 1/2.
 */
export const SPOT = {
  chartId: '9max-100-iso-btn-vs-1limp',
  table: 'Live 1/2. 9 handed. $200 stacks.',
  story: 'UTG limps for $2. It folds to you on the button.',
  source: 'Exploit chart for a typical live limper. Approximate.',
};

export type Choice = 'fold' | 'call' | 'raise';

export const CHOICES: { id: Choice; label: string }[] = [
  { id: 'fold', label: 'Fold' },
  { id: 'call', label: 'Call $2' },
  { id: 'raise', label: 'Raise to $10' },
];

export interface SpotHand {
  hand: HandClass;
  cards: [string, string];
  /** The read: what changes the answer against a real player. */
  read: string;
}

export const HANDS: SpotHand[] = [
  { hand: '55', cards: ['5h', '5c'], read: 'Against a limper who folds to raises, raise more often.' },
  { hand: 'K9o', cards: ['Kd', '9s'], read: 'A limper who calls your raise often has you dominated with KJ or KQ.' },
  { hand: 'A5s', cards: ['As', '5s'], read: 'Against a limper who calls too much, this hand plays well in a raised pot.' },
];

export type Mix = Record<Choice, number>;

/** The chart's mix for one hand: raise to $10, limp behind for $2 or fold. */
export function spotMix(hand: HandClass): Mix {
  const raise = openRange(SPOT.chartId, 'raise').get(hand) ?? 0;
  const call = openRange(SPOT.chartId, 'call').get(hand) ?? 0;
  return { raise, call, fold: Math.max(0, 1 - raise - call) };
}

/** Same wording as the app: the chart's frequency for the choice decides it. */
export function verdict(mix: Mix, choice: Choice): 'Correct' | 'Part of the mix' | 'Not quite' {
  const f = mix[choice];
  const best = Math.max(mix.raise, mix.call, mix.fold);
  if (f >= best - 1e-9 && f >= 0.75) return 'Correct';
  return f > 0 ? 'Part of the mix' : 'Not quite';
}

const WORD: Record<Choice, string> = { raise: 'raises to $10', call: 'limps behind', fold: 'folds' };

/** One plain sentence with the whole mix, so a mixed answer is never collapsed to one action. */
export function mixLine(mix: Mix): string {
  const parts = (['raise', 'call', 'fold'] as Choice[]).filter((c) => mix[c] > 0.001).sort((a, b) => mix[b] - mix[a]);
  if (parts.length === 1) return `The chart always ${WORD[parts[0]]}.`;
  const share = (c: Choice) => (Math.abs(mix[c] - 0.5) < 0.001 ? 'half the time' : `${Math.round(mix[c] * 100)}% of the time`);
  return `The chart ${WORD[parts[0]]} ${share(parts[0])} and ${WORD[parts[1]]} ${share(parts[1])}.`;
}

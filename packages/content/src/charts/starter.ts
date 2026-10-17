import type { ChartSpec, Position } from '@felt/core';
import { bbVsLimp, sbOpen, sbVsIso } from './blinds';
import { NINE, SIX, as9 } from './common';
import { LIMP_SEATS, vsLimp } from './limpers';
import { rfi, rfiRange } from './rfi';
import { SQUEEZES, squeeze, VS_SQUEEZES, vsSqueeze } from './squeeze';
import { VS_FOURBET, vsFourBet } from './vsFourBet';
import { defensePairs, vsOpen } from './vsOpen';
import { VS_THREEBET, vsThreeBet } from './vsThreeBet';

/**
 * The hand written (starter) charts, 100bb cash with 2.5bb opens. Charts that
 * existed before the library come first in each format, in their old order,
 * so the review deck keeps introducing cards in the order it always did.
 */

const LEGACY: Record<number, string[]> = {
  9: [
    'rfi-utg', 'rfi-utgp1', 'rfi-utgp2', 'rfi-lj', 'rfi-hj', 'rfi-co', 'rfi-btn', 'rfi-sb', 'bb-vs-btn', 'bb-vs-co', 'bb-vs-utg',
    'sb-vs-btn', 'btn-vs-co', 'btn-vs-3bet', 'utg-vs-3bet', 'iso-btn-vs-1limp', 'iso-btn-vs-2limp',
  ],
  6: ['rfi-utg', 'rfi-hj', 'rfi-co', 'rfi-btn', 'rfi-sb', 'bb-vs-btn', 'bb-vs-co', 'sb-vs-btn', 'btn-vs-co', 'btn-vs-3bet'],
};

/**
 * Charts that join the review deck, besides the ones above: the big blind
 * against every opener, the most common small blind and button defenses,
 * each opener against a blind 3bet, and one chart for each new spot type.
 * The rest of the library is for viewing, practice and Play grading, so the
 * deck grows by a few dozen charts, not hundreds.
 */
const REVIEW: Record<number, string[]> = {
  9: [
    'bb-vs-utgp1', 'bb-vs-utgp2', 'bb-vs-lj', 'bb-vs-hj', 'bb-vs-sb', 'sb-vs-lj', 'sb-vs-hj', 'sb-vs-co', 'btn-vs-lj', 'btn-vs-hj',
    'utg-vs-blinds-3bet', 'lj-vs-blinds-3bet', 'hj-vs-blinds-3bet', 'co-vs-btn-3bet', 'co-vs-blinds-3bet', 'sb-vs-bb-3bet',
    'bb-vs-btn-4bet', 'bb-squeeze-vs-btn-sb', 'bvb-sb-open',
  ],
  6: [
    'bb-vs-utg', 'bb-vs-hj', 'bb-vs-sb', 'sb-vs-utg', 'sb-vs-hj', 'sb-vs-co', 'btn-vs-utg', 'btn-vs-hj',
    'utg-vs-blinds-3bet', 'hj-vs-blinds-3bet', 'co-vs-btn-3bet', 'co-vs-blinds-3bet', 'sb-vs-bb-3bet',
    'bb-vs-btn-4bet', 'bb-squeeze-vs-btn-sb', 'bvb-sb-open',
  ],
};

function formatCharts(tableSize: 6 | 9): ChartSpec[] {
  const seats = tableSize === 9 ? NINE : SIX;
  const all: (ChartSpec | undefined)[] = [];
  for (const seat of seats.slice(0, -1)) all.push(rfi(tableSize, seat, rfiRange(as9(seat, tableSize))));
  for (const [hero, opener] of defensePairs()) all.push(vsOpen(tableSize, hero, opener));
  for (const [opener, groups] of Object.entries(VS_THREEBET) as [Position, (typeof VS_THREEBET)[string]][]) for (const g of groups) all.push(vsThreeBet(tableSize, opener, g));
  for (const p of VS_FOURBET) all.push(vsFourBet(tableSize, p));
  for (const q of SQUEEZES) all.push(squeeze(tableSize, q));
  for (const q of VS_SQUEEZES) all.push(vsSqueeze(tableSize, q));
  all.push(sbOpen(tableSize), bbVsLimp(tableSize), sbVsIso(tableSize));
  for (const n of [1, 2, 3] as const) for (const seat of LIMP_SEATS) all.push(vsLimp(tableSize, seat, n));

  const charts = all.filter((c): c is ChartSpec => !!c);
  const byId = new Map(charts.map((c) => [c.id, c]));
  const legacy = LEGACY[tableSize].map((id) => byId.get(`${tableSize}max-100-${id}`)!);
  const first = new Set(legacy.map((c) => c.id));
  const review = new Set([...LEGACY[tableSize], ...REVIEW[tableSize]].map((id) => `${tableSize}max-100-${id}`));
  for (const id of review) if (!byId.has(id)) throw new Error(`Review chart ${id} is missing`);
  return [...legacy, ...charts.filter((c) => !first.has(c.id))].map((c) => ({ ...c, core: review.has(c.id) }));
}

/** Every hand written chart: 9-handed first (the live full ring game), then 6-max. */
export const STARTER_CHARTS: ChartSpec[] = [...formatCharts(9), ...formatCharts(6)];

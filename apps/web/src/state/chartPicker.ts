import { chartOpenBb, type ChartMeta, closestVariant, nearestOf, type Position, positionsFor, spotKey } from '@felt/core';

/**
 * The Ranges picker's model: spot types, the seats in each, and the stack
 * and open size variants of a spot. Pure functions over the library's chart
 * list, so the sheet stays simple and the logic is tested.
 */

export type Family = 'open' | 'vs-open' | 'vs-3bet' | 'vs-4bet' | 'squeeze' | 'bvb' | 'limpers' | 'straddle';

export const FAMILIES: { id: Family; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'vs-open', label: 'Vs open' },
  { id: 'vs-3bet', label: 'Vs 3bet' },
  { id: 'vs-4bet', label: 'Vs 4bet' },
  { id: 'squeeze', label: 'Squeeze' },
  { id: 'bvb', label: 'Blind vs blind' },
  { id: 'limpers', label: 'Limpers' },
  { id: 'straddle', label: 'Straddle' },
];

export const familyLabel = (f: Family) => FAMILIES.find((x) => x.id === f)!.label;

const blind = (p: Position) => p === 'SB' || p === 'BB';

/** A heads up fight between the blinds after the rest fold. */
export function isBlindBattle(m: Pick<ChartMeta, 'spot' | 'hero' | 'villains'>): boolean {
  if (m.spot === 'bvb') return true;
  if (m.spot !== 'vs-open' && m.spot !== 'vs-3bet' && m.spot !== 'vs-4bet') return false;
  return blind(m.hero) && !!m.villains?.length && m.villains.every(blind);
}

/** The spot type a chart is listed under. Blind battles show under their own spot type too. */
export function familiesOf(m: ChartMeta): Family[] {
  const own: Family =
    m.spot === 'rfi'
      ? 'open'
      : m.spot === 'vs-limp'
        ? 'limpers'
        : m.spot === 'squeeze' || m.spot === 'vs-squeeze'
          ? 'squeeze'
          : m.spot === 'push-fold'
            ? 'open'
            : (m.spot as Family);
  return isBlindBattle(m) && own !== 'bvb' ? [own, 'bvb'] : [own];
}

/** One choice in the picker: a spot, and the villain seat it is chosen for. */
export interface SpotOption {
  key: string;
  /** First choice: your seat, or the spot itself for squeezes and blind battles. */
  first: string;
  /** Second choice: the villain seat or the number of limpers. */
  second?: string;
  /** A short label for the whole spot, like "BB vs BTN". */
  label: string;
}

const LIMPERS = ['', '1 limper', '2 limpers', '3 limpers'];

/** Short label for a chart: "BB vs BTN", "UTG vs BTN 3bet", "BB squeeze". */
export function shortLabel(m: ChartMeta, villain?: Position): string {
  const v = villain ?? m.villains?.[0];
  switch (m.spot) {
    case 'rfi':
      return m.hero === 'SB' ? 'SB raise only' : m.hero;
    case 'straddle':
      return m.hero;
    case 'vs-open':
      return `${m.hero} vs ${v}`;
    case 'vs-3bet':
      return `${m.hero} vs ${v} 3bet`;
    case 'vs-4bet':
      return `${m.hero} vs ${v} 4bet`;
    case 'squeeze':
      return m.caller && m.caller.length > 2 ? `${m.hero} vs ${v} and a call` : `${m.hero} vs ${v} + ${m.caller?.join(' or ')}`;
    case 'vs-squeeze':
      return `${m.hero} open vs squeeze`;
    case 'vs-limp':
      return `${m.hero} vs ${LIMPERS[m.limpers ?? 1]}`;
    case 'bvb':
      return m.title.replace(/ \(.*\)$/, '');
    default:
      return m.title;
  }
}

/** Every spot in a family, one option per villain seat a chart covers. */
export function spotOptions(library: readonly ChartMeta[], family: Family): SpotOption[] {
  const seen = new Set<string>();
  const out: SpotOption[] = [];
  for (const m of library) {
    if (!familiesOf(m).includes(family)) continue;
    const key = spotKey(m);
    const listed = family === 'squeeze' || family === 'bvb';
    const villains = m.spot === 'vs-3bet' || m.spot === 'vs-open' || m.spot === 'vs-4bet' ? (m.villains ?? []) : [undefined];
    for (const v of villains) {
      const id = `${key}#${v ?? ''}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const label = shortLabel(m, v);
      if (listed) out.push({ key, first: label, label });
      else if (family === 'limpers') out.push({ key, first: m.hero, second: LIMPERS[m.limpers ?? 1], label });
      else out.push({ key, first: m.hero, second: v, label });
    }
  }
  // Seats in table order, then villains in table order.
  const size = library[0]?.tableSize ?? 9;
  const order = positionsFor(size);
  const rank = (s: string) => (order.includes(s) ? order.indexOf(s) : 100);
  if (family === 'squeeze' || family === 'bvb') return out;
  return out.sort((a, b) => rank(a.first) - rank(b.first) || rank(a.second ?? '') - rank(b.second ?? '') || (a.second ?? '').localeCompare(b.second ?? ''));
}

/** The option a chart stands for, given the villain seat chosen, if any. */
export function optionFor(options: readonly SpotOption[], m: ChartMeta, villain?: string): SpotOption | undefined {
  const key = spotKey(m);
  return options.find((o) => o.key === key && (villain === undefined || o.second === villain)) ?? options.find((o) => o.key === key);
}

/** Every variant of a spot. */
export const variantsOf = (library: readonly ChartMeta[], key: string) => library.filter((m) => spotKey(m) === key);

/** Stacks and open sizes a spot has, smallest first. */
export function variantAxes(variants: readonly ChartMeta[]): { stacks: number[]; opens: number[] } {
  const stacks = [...new Set(variants.map((m) => m.stackBb))].sort((a, b) => a - b);
  const opens = [...new Set(variants.map((m) => chartOpenBb(m)))].sort((a, b) => a - b);
  return { stacks, opens };
}

/**
 * The chart for a spot at a stack and open size: exact when the library has
 * it, else the nearest. A straddled pot's sizes are in straddles, so an open
 * size there is matched by its share of the nearest sizes on offer.
 */
export function resolveVariant(library: readonly ChartMeta[], key: string, stackBb: number, openBb: number): ChartMeta | undefined {
  const variants = variantsOf(library, key);
  const { stacks, opens } = variantAxes(variants);
  const stack = nearestOf(stacks, stackBb) ?? stackBb;
  const open = nearestOf(opens, openBb) ?? openBb;
  return variants.find((m) => m.stackBb === stack && chartOpenBb(m) === open) ?? closestVariant(variants, { stackBb, openBb });
}

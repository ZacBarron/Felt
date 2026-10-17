import {
  actionsFromMixes,
  buildChart,
  type Chart,
  CHART_OPENS,
  CHART_STACKS,
  type ChartMeta,
  type ChartSpec,
  combineRules,
  continueText,
  deriveMixes,
  deriveVariant,
  type HeroRole,
  openSizeRule,
  type Position,
  type RuleFamily,
  stackRule,
} from '@felt/core';
import { bb, isBlind, NINE, SIX, slug } from './common';
import { STARTER_CHARTS } from './starter';

/**
 * The full chart library: every starter chart, plus variants for other stack
 * depths and open sizes derived from them by the rule in core's chartModel.ts.
 * Derived charts carry the source 'model-approx', name the chart they come
 * from and say what changed. They are built only when asked for, so the
 * library can list hundreds of charts without building them all.
 *
 * Coverage of derived charts:
 * - Opens, defense against an open and answers to a 3bet: every stack in
 *   CHART_STACKS and every open size in CHART_OPENS.
 * - Squeezes and answers to a squeeze: every stack, 2.5bb opens.
 * - Answers to a 4bet: 150bb and 200bb. At 60bb and less a 4bet is all in,
 *   so the 3bet answer charts cover it.
 * - Straddled pots: opens at 100bb to 200bb with 2.5 and 3 straddle opens,
 *   from the opening chart of the seat with the same players behind.
 * - Limped pots and blind vs blind limps: 100bb only.
 */

interface Entry {
  meta: ChartMeta;
  build: () => ChartSpec;
}

const STARTERS = new Map(STARTER_CHARTS.map((s) => [s.id, s]));
const builtBase = new Map<string, Chart>();
function base(id: string): Chart {
  let c = builtBase.get(id);
  if (!c) {
    c = buildChart(STARTERS.get(id)!);
    builtBase.set(id, c);
  }
  return c;
}

const metaOf = ({ actions: _a, reach: _r, ...meta }: ChartSpec): ChartMeta => meta;

/** "9max-100-bb-vs-btn" at 40bb and a 4bb open: "9max-40-o4-bb-vs-btn". */
export function variantId(baseId: string, stackBb: number, openBb: number): string {
  const [, table, rest] = /^(\d+max)-100-(.*)$/.exec(baseId)!;
  return `${table}-${stackBb}${openBb === 2.5 ? '' : `-o${openBb}`}-${rest}`;
}

const roleOf = (spec: Pick<ChartSpec, 'spot' | 'hero'>): HeroRole => {
  if (spec.spot === 'rfi' || spec.spot === 'vs-3bet' || spec.spot === 'vs-squeeze' || spec.spot === 'straddle') return 'opener';
  if (spec.hero === 'BB') return 'bb';
  if (spec.hero === 'SB') return 'sb';
  return 'ip';
};

/** The small blind opens at least 3bb. */
const sbOpen = (open: number) => Math.max(3, open);

/** The open a chart's hero or villain makes at a game's standard size. */
const openerSize = (opener: Position, open: number) => (opener === 'SB' ? sbOpen(open) : open);

const allIn = (size: number, stack: number) => size >= stack * 0.4;

function threeBetFaced(opener: Position, threeBettors: readonly Position[], open: number): number {
  if (opener === 'SB') return Math.round(sbOpen(open) * 3 * 2) / 2;
  const blind = threeBettors.every(isBlind);
  return Math.round(open * (blind ? 4.4 : 3) * 2) / 2;
}

function howWords(family: RuleFamily, role: HeroRole, stack: number, open: number): string {
  const parts: string[] = [];
  if (stack < 100) parts.push(`At ${stack}bb, speculative hands lose value and more hands raise instead of calling.`);
  if (stack > 100) parts.push(`At ${stack}bb, pairs and suited hands gain and offsuit hands lose.${role !== 'opener' || family === 'vs-3bet' ? ' Fewer hands raise.' : ''}`);
  if (open !== 2.5) {
    if (family === 'rfi') parts.push(`A ${bb(open)} open risks more, so the range is tighter.`);
    else if (family === 'vs-open') parts.push(`Facing a ${bb(open)} open, the price is worse. Defense is tighter, with fewer flats.`);
    else if (family === 'vs-3bet') parts.push(`Only hands that open to ${bb(open)} can be here.`);
  }
  return parts.join(' ');
}

const DERIVED_NOTE = 'Aced derived this chart by rule from its 100bb chart. It is an estimate, not a solve.';

function deriveSpec(baseSpec: ChartSpec, family: RuleFamily, stack: number, open: number, extras: { reach?: Set<string>; versus?: string; labels: string[] }): ChartSpec {
  const chart = base(baseSpec.id);
  const raise = baseSpec.actions[0].id;
  const call = baseSpec.actions.some((a) => a.id === 'call') ? 'call' : undefined;
  const role = roleOf(baseSpec);
  const baseOpen = baseSpec.spot === 'rfi' && baseSpec.hero === 'SB' ? 3 : baseSpec.spot === 'vs-open' && baseSpec.villains?.[0] === 'SB' ? 3 : 2.5;
  const size = baseOpen === 3 ? sbOpen(open) : open;
  const mixes = deriveVariant(chart, { family, role, stackBb: stack, openBb: size, baseOpenBb: baseOpen }, { raise, call, reach: extras.reach });
  const how = howWords(family, role, stack, open);
  return {
    ...baseSpec,
    id: variantId(baseSpec.id, stack, open),
    stackBb: stack,
    openBb: open,
    source: 'model-approx',
    core: false,
    versus: extras.versus ?? baseSpec.versus,
    note: `${DERIVED_NOTE} ${how}`.trim(),
    derived: { from: baseSpec.id, how },
    reach: extras.reach ? [...extras.reach].join(', ') : baseSpec.reach,
    actions: actionsFromMixes(
      mixes,
      baseSpec.actions.map((a, i) => ({ id: a.id, label: extras.labels[i] ?? a.label })),
    ),
  };
}

const entries: Entry[] = [];
const byId = new Map<string, Entry>();
function add(e: Entry) {
  entries.push(e);
  byId.set(e.meta.id, e);
}

for (const spec of STARTER_CHARTS) add({ meta: metaOf(spec), build: () => spec });

/** Cache of built variant specs. */
const built = new Map<string, ChartSpec>();
function lazy(meta: ChartMeta, make: () => ChartSpec): Entry {
  return {
    meta,
    build: () => {
      let s = built.get(meta.id);
      if (!s) {
        s = make();
        built.set(meta.id, s);
      }
      return s;
    },
  };
}

/** Hands that take any of these actions in a chart, as a set: the reach of the next spot. */
function handsTaking(spec: ChartSpec, ids: readonly string[]): Set<string> {
  const c = buildChart(spec);
  return new Set(
    continueText(c.mixes, ids)
      .split(', ')
      .filter(Boolean)
      .map((t) => t.split(':')[0]),
  );
}

const rfiIdFor = (tableSize: number, seat: Position) => `${tableSize}max-100-rfi-${slug(seat)}`;

/** The opening chart for a seat at a stack and size, curated or derived. */
function rfiSpec(tableSize: number, seat: Position, stack: number, open: number): ChartSpec {
  const id = stack === 100 && open === 2.5 ? rfiIdFor(tableSize, seat) : variantId(rfiIdFor(tableSize, seat), stack, open);
  return chartSpec(id)!;
}

function variantsOf(spec: ChartSpec) {
  if (spec.basis !== 'gto' || spec.source !== 'starter-approx') return;
  const t = spec.tableSize;
  const family: RuleFamily = spec.spot === 'squeeze' ? 'vs-open' : spec.spot === 'vs-squeeze' ? 'vs-3bet' : (spec.spot as RuleFamily);
  const metaFor = (stack: number, open: number, versus?: string): ChartMeta => {
    const how = howWords(family, roleOf(spec), stack, open);
    return {
      ...metaOf(spec),
      id: variantId(spec.id, stack, open),
      stackBb: stack,
      openBb: open,
      source: 'model-approx',
      core: false,
      versus: versus ?? spec.versus,
      note: `${DERIVED_NOTE} ${how}`.trim(),
      derived: { from: spec.id, how },
    };
  };
  const grid = (stacks: readonly number[], opens: readonly number[]) =>
    stacks.flatMap((stack) => opens.map((open) => [stack, open] as const)).filter(([s, o]) => !(s === 100 && o === 2.5));

  switch (spec.spot) {
    case 'rfi': {
      for (const [stack, open] of grid(CHART_STACKS, CHART_OPENS)) {
        const size = spec.hero === 'SB' ? sbOpen(open) : open;
        add(lazy(metaFor(stack, open), () => deriveSpec(spec, 'rfi', stack, open, { labels: [`Raise ${bb(size)}`] })));
      }
      break;
    }
    case 'vs-open': {
      const opener = spec.villains![0];
      for (const [stack, open] of grid(CHART_STACKS, CHART_OPENS)) {
        const faced = openerSize(opener, open);
        const size = opener === 'SB' ? faced * 3 : Math.round(faced * (isBlind(spec.hero) ? 4.4 : 3) * 2) / 2;
        const label = allIn(size, stack) ? '3bet all in' : `3bet ${bb(size)}`;
        const versus = `${opener} opens ${bb(faced)}`;
        add(lazy(metaFor(stack, open, versus), () => deriveSpec(spec, 'vs-open', stack, open, { versus, labels: [label] })));
      }
      break;
    }
    case 'vs-3bet': {
      const hero = spec.hero;
      const who = spec.villains!;
      for (const [stack, open] of grid(CHART_STACKS, CHART_OPENS)) {
        const mine = openerSize(hero, open);
        const faced = threeBetFaced(hero, who, open);
        const four = Math.round(faced * (who.every(isBlind) && !isBlind(hero) ? 2.2 : 2.9));
        const label = allIn(four, stack) ? '4bet all in' : `4bet ${bb(four)}`;
        const whoWords = spec.versus!.split('. ')[1].split(' 3bets')[0];
        const versus = `You open ${bb(mine)}. ${whoWords} 3bets to ${bb(faced)}.`;
        add(
          lazy(metaFor(stack, open, versus), () => {
            const reach = handsTaking(rfiSpec(t, hero, stack, open), ['raise']);
            return deriveSpec(spec, 'vs-3bet', stack, open, { reach, versus, labels: [label] });
          }),
        );
      }
      break;
    }
    case 'vs-4bet': {
      const opener = spec.villains![0];
      for (const stack of [150, 200]) {
        add(
          lazy(metaFor(stack, 2.5), () => {
            const defense = chartSpec(variantId(`${t}max-100-${slug(spec.hero)}-vs-${slug(opener)}`, stack, 2.5))!;
            const reach = handsTaking(defense, ['3bet']);
            return deriveSpec(spec, 'vs-4bet', stack, 2.5, { reach, labels: ['5bet all in'] });
          }),
        );
      }
      break;
    }
    case 'squeeze': {
      for (const stack of CHART_STACKS.filter((s) => s !== 100)) {
        add(lazy(metaFor(stack, 2.5), () => deriveSpec(spec, 'vs-open', stack, 2.5, { labels: [] })));
      }
      break;
    }
    case 'vs-squeeze': {
      for (const stack of CHART_STACKS.filter((s) => s !== 100)) {
        add(
          lazy(metaFor(stack, 2.5), () => {
            const reach = handsTaking(rfiSpec(t, spec.hero, stack, 2.5), ['raise']);
            return deriveSpec(spec, 'vs-3bet', stack, 2.5, { reach, labels: [allIn(30, stack) ? '4bet all in' : '4bet 30bb'] });
          }),
        );
      }
      break;
    }
    default:
      break;
  }
}

for (const spec of STARTER_CHARTS) variantsOf(spec);

// Straddled pots ----------------------------------------------------------------------

/**
 * A straddle is a third blind of 2bb that acts last before the flop, so it
 * plays as the new big blind. Every seat then has the same players behind
 * as one seat later in an unstraddled game: UTG+1 opens like UTG, the button
 * like the cutoff, the big blind like the small blind. Stacks are half as
 * deep counted in straddles, and the blinds add dead money, so the range
 * opens a little wider (5%) than that seat's chart.
 */
const STRADDLE_WIDEN = 1.05;
const STRADDLE_STACKS = [100, 150, 200] as const;
/** Opens of 2.5 and 3 straddles, in big blinds. */
const STRADDLE_OPENS = [5, 6] as const;

function straddleOrder(tableSize: 6 | 9): Position[] {
  const seats = tableSize === 9 ? NINE : SIX;
  return [...seats.slice(1), seats[0]];
}

for (const tableSize of [9, 6] as const) {
  const order = straddleOrder(tableSize);
  const normal = tableSize === 9 ? NINE : SIX;
  // Not the straddler, and not the big blind: folded to it, the big blind can complete for 1bb, and
  // the raise only chart it would borrow has no complete option. That spot falls back to the approximate range.
  order.slice(0, -1).forEach((hero, i) => {
    if (hero === 'BB') return;
    const like = normal[i];
    const baseId = rfiIdFor(tableSize, like);
    for (const stack of STRADDLE_STACKS) {
      for (const open of STRADDLE_OPENS) {
        const id = `${tableSize}max-${stack}-o${open}-straddle-${slug(hero)}`;
        const versus = `${normal[0]} straddles to 2bb. Folded to you.`;
        const meta: ChartMeta = {
          id,
          title: `${hero} open, straddled pot`,
          game: 'cash',
          tableSize,
          stackBb: stack,
          openBb: open,
          hero,
          versus,
          spot: 'straddle',
          basis: 'gto',
          source: 'model-approx',
          derived: { from: baseId, how: `Plays like the ${like} open in a game without a straddle, ${stack / 2} straddles deep, a little wider for the dead money.` },
          note: `Aced derived this chart by rule from the ${like} open chart. It is an estimate, not a solve.`,
        };
        add(
          lazy(meta, () => {
            // Depth and size in straddles: half the big blinds.
            const straddles = stack / 2;
            const sizeInStraddles = open / 2;
            const baseOpen = like === 'SB' ? 3 : 2.5;
            const rule = combineRules(stackRule('rfi', 'opener', straddles), openSizeRule('rfi', 'opener', sizeInStraddles * (baseOpen / 2.5), baseOpen));
            const widened = deriveMixes(base(baseId), { rule: { ...rule, width: rule.width * STRADDLE_WIDEN }, raise: 'raise' });
            return {
              ...meta,
              note: `${meta.note} ${meta.derived!.how}`,
              actions: actionsFromMixes(widened, [{ id: 'raise', label: `Raise ${bb(open)}` }]),
            };
          }),
        );
      }
    }
  });
}

// Lookups -----------------------------------------------------------------------------

/** Every chart the app knows, curated and derived, without ranges. */
export const CHART_LIBRARY: ChartMeta[] = entries.map((e) => e.meta);

/** A chart's full spec. Derived charts are built on first use and cached. */
export function chartSpec(id: string): ChartSpec | undefined {
  return byId.get(id)?.build();
}

/** The library's charts for one table size. */
export function libraryFor(tableSize: number): ChartMeta[] {
  return CHART_LIBRARY.filter((m) => m.tableSize === tableSize);
}

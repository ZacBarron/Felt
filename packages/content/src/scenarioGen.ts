import {
  actionRange,
  buildChart,
  type Card,
  cardsToString,
  type Chart,
  CHART_STACKS,
  comboRangeText,
  describeHand,
  evaluate,
  type GenSpot,
  generateSpot,
  parseCards,
  type Position,
  RIVER_SIZES,
  seededRandom,
  TEXTURE_WORDS,
} from '@felt/core';
import { CHART_LIBRARY, chartSpec, variantId } from './charts/library';
import { STARTER_CHARTS } from './charts/starter';
import { slug } from './charts/common';
import { SCENARIO_BANK } from './scenarioBank';
import type { ScenarioSpec } from './scenarios';

/**
 * Generated scenarios. A template is a heads up preflop line read from the
 * chart library: who opened, who called or 3bet, the stacks and the pot. A
 * seed then deals a board of some texture, plays a line on the flop and
 * turn with core's generateSpot, and Aced Solver solves the river on the
 * device. Templates at 100bb use hand written charts, so their river
 * decision counts toward the Aced Rating. Other stacks use derived charts,
 * are labelled as estimates and never count.
 */

export interface ScenarioTemplate {
  id: string;
  potType: 'srp' | '3bp';
  tableSize: number;
  stackBb: number;
  /** Seats out of position, then in position. */
  seats: [Position, Position];
  /** Who raised last before the flop. */
  aggressor: 0 | 1;
  /** Which side the hero is. */
  hero: 0 | 1;
  /** The chart that grades the hero's preflop decision, and the action the story takes. */
  heroChart: string;
  heroAction: string;
  /** Where each side's range comes from: out of position, then in position. */
  rangeCharts: [{ chart: string; action: string }, { chart: string; action: string }];
  /** Pot at the flop and the stack behind, in big blinds. */
  pot: number;
  stack: number;
  open: number;
  threeBet?: number;
  /** Hand written charts only, so the river decision can count toward the Aced Rating. */
  rated: boolean;
}

/** Postflop order: the blinds act first, the button last. */
const POSTFLOP: Position[] = ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'];
const outOfPosition = (a: Position, b: Position) => POSTFLOP.indexOf(a) < POSTFLOP.indexOf(b);

const at = (id: string, stack: number) => (stack === 100 ? id : variantId(id, stack, 2.5));
/**
 * Whether a chart exists and its hand written source takes the action. Read
 * from metadata only: building every derived chart up front would take
 * seconds on a phone. A derived chart keeps its source's actions.
 */
const META = new Map(CHART_LIBRARY.map((m) => [m.id, m]));
const STARTER = new Map(STARTER_CHARTS.map((s) => [s.id, s]));
const has = (id: string, action: string) => {
  const m = META.get(id);
  const source = m && STARTER.get(m.derived?.from ?? m.id);
  return !!source?.actions.some((a) => a.id === action && a.range.trim() !== '');
};
const sizeIn = (text: string | undefined, re: RegExp) => Number(text?.match(re)?.[1] ?? NaN);

function deadMoney(a: Position, b: Position): number {
  const inHand = new Set([a, b]);
  return (inHand.has('SB') ? 0 : 0.5) + (inHand.has('BB') ? 0 : 1);
}

function buildTemplates(): ScenarioTemplate[] {
  const out: ScenarioTemplate[] = [];
  const push = (base: Omit<ScenarioTemplate, 'id' | 'hero' | 'heroChart' | 'heroAction'>, sides: [{ chart: string; action: string }, { chart: string; action: string }], name: string) => {
    for (const hero of [0, 1] as const) {
      out.push({ ...base, id: `${name}-h${hero}`, hero, heroChart: sides[hero].chart, heroAction: sides[hero].action });
    }
  };
  for (const stack of [100, ...CHART_STACKS.filter((s) => s !== 100)]) {
    for (const spec of STARTER_CHARTS) {
      if (spec.basis !== 'gto') continue;
      const t = spec.tableSize;
      // Single raised pots: an open and one call.
      if (spec.spot === 'vs-open' && spec.villains?.length === 1) {
        const opener = spec.villains[0];
        const caller = spec.hero;
        const defense = at(spec.id, stack);
        const opens = at(`${t}max-100-rfi-${slug(opener)}`, stack);
        if (!has(defense, 'call') || !has(opens, 'raise')) continue;
        const open = opener === 'SB' ? 3 : 2.5;
        const oop = outOfPosition(caller, opener);
        const seats: [Position, Position] = oop ? [caller, opener] : [opener, caller];
        const sides: [{ chart: string; action: string }, { chart: string; action: string }] = oop
          ? [{ chart: defense, action: 'call' }, { chart: opens, action: 'raise' }]
          : [{ chart: opens, action: 'raise' }, { chart: defense, action: 'call' }];
        push(
          {
            potType: 'srp',
            tableSize: t,
            stackBb: stack,
            seats,
            aggressor: oop ? 1 : 0,
            rangeCharts: sides,
            pot: 2 * open + deadMoney(opener, caller),
            stack: stack - open,
            open,
            rated: stack === 100,
          },
          sides,
          `srp-${t}-${slug(opener)}-${slug(caller)}-${stack}`,
        );
      }
      // 3bet pots: an open, a 3bet and a call.
      if (spec.spot === 'vs-3bet') {
        const opener = spec.hero;
        const answer = at(spec.id, stack);
        if (!has(answer, 'call')) continue;
        const threeBet = sizeIn(META.get(answer)?.versus, /3bets to ([\d.]+)bb/);
        if (!Number.isFinite(threeBet) || threeBet >= stack * 0.4) continue;
        for (const bettor of spec.villains ?? []) {
          const threeBets = at(`${t}max-100-${slug(bettor)}-vs-${slug(opener)}`, stack);
          if (!has(threeBets, '3bet')) continue;
          const oop = outOfPosition(bettor, opener);
          const seats: [Position, Position] = oop ? [bettor, opener] : [opener, bettor];
          const sides: [{ chart: string; action: string }, { chart: string; action: string }] = oop
            ? [{ chart: threeBets, action: '3bet' }, { chart: answer, action: 'call' }]
            : [{ chart: answer, action: 'call' }, { chart: threeBets, action: '3bet' }];
          push(
            {
              potType: '3bp',
              tableSize: t,
              stackBb: stack,
              seats,
              aggressor: oop ? 0 : 1,
              rangeCharts: sides,
              pot: 2 * threeBet + deadMoney(opener, bettor),
              stack: stack - threeBet,
              open: opener === 'SB' ? 3 : 2.5,
              threeBet,
              rated: stack === 100,
            },
            sides,
            `3bp-${t}-${slug(opener)}-${slug(bettor)}-${stack}`,
          );
        }
      }
    }
  }
  return out;
}

let templates: ScenarioTemplate[] | undefined;
let byId: Map<string, ScenarioTemplate> | undefined;

/** Every scenario template, at every stack the library covers. */
export function scenarioTemplates(): ScenarioTemplate[] {
  templates ??= buildTemplates();
  return templates;
}

export function scenarioTemplate(id: string): ScenarioTemplate | undefined {
  byId ??= new Map(scenarioTemplates().map((t) => [t.id, t]));
  return byId.get(id);
}

const charts = new Map<string, Chart>();
function chartOf(id: string): Chart {
  let c = charts.get(id);
  if (!c) {
    c = buildChart(chartSpec(id)!);
    charts.set(id, c);
  }
  return c;
}

const spots = new Map<string, GenSpot>();

/** The hand a template and seed deal, up to the river. The same everywhere. */
export function templateSpot(t: ScenarioTemplate, seed: number): GenSpot {
  const key = `${t.id}|${seed}`;
  let s = spots.get(key);
  if (!s) {
    const ranges = t.rangeCharts.map((r) => actionRange(chartOf(r.chart), r.action)) as [Map<string, number>, Map<string, number>];
    s = generateSpot({ ranges, aggressor: t.aggressor, pot: t.pot, stack: t.stack }, seed, seededRandom(seed));
    spots.set(key, s);
    if (spots.size > 64) spots.delete(spots.keys().next().value!);
  }
  return s;
}

/** A generated scenario's id: template, seed, the river line and the hero's cards. */
export function scenarioCode(template: string, seed: number, line: readonly string[], heroCards: string): string {
  return `g.${template}.${seed}.${line.length ? line.join('-') : 'first'}.${heroCards}`;
}

export function parseScenarioCode(code: string): { template: string; seed: number; line: string[]; heroCards: string } | undefined {
  const m = /^g\.([a-z0-9-]+)\.(\d+)\.([a-z0-9-]+)\.([2-9TJQKA][cdhs][2-9TJQKA][cdhs])$/.exec(code);
  if (!m) return undefined;
  return { template: m[1], seed: Number(m[2]), line: m[3] === 'first' ? [] : m[3].split('-'), heroCards: m[4] };
}

const r1 = (x: number) => String(Math.round(x * 10) / 10);

/** "Pair of kings" as "a pair of kings", for a sentence. */
function handPhrase(desc: string): string {
  const d = desc[0].toLowerCase() + desc.slice(1);
  const flush = /^flush, (\w+) high$/.exec(d);
  if (flush) return `${/^[aeiou]/.test(flush[1]) ? 'an' : 'a'} ${flush[1]} high flush`;
  if (/^(pair|straight|royal)/.test(d)) return `a ${d}`;
  return d;
}

/** "Flush, ace high" as "Ace high flush", for a title. */
function handTitle(desc: string): string {
  const flush = /^Flush, (\w+) high$/.exec(desc);
  return flush ? `${flush[1][0].toUpperCase()}${flush[1].slice(1)} high flush` : desc;
}
const POT_WORDS = { srp: 'single raised pot', '3bp': '3bet pot' } as const;

/** "BB checks." or "You check." */
const act = (who: string, you: boolean, verb: string) => `${who} ${you ? verb : `${verb}s`}`;

function preflopStory(t: ScenarioTemplate): string {
  const heroSeat = t.seats[t.hero];
  const villain = t.seats[1 - t.hero];
  // In a single raised pot the opener raised last. In a 3bet pot the opener is the one who called the 3bet.
  const opener = t.potType === 'srp' ? t.seats[t.aggressor] : t.seats[1 - t.aggressor];
  const heroOpened = opener === heroSeat;
  if (t.potType === 'srp') return heroOpened ? `You open to ${r1(t.open)}bb and ${villain} calls. Everyone else folds.` : `You call. Everyone else folds.`;
  return heroOpened ? `${villain} 3bets to ${r1(t.threeBet!)}bb and you call. Everyone else folds.` : `You 3bet to ${r1(t.threeBet!)}bb and ${villain} calls. Everyone else folds.`;
}

function streetStory(t: ScenarioTemplate, s: GenSpot['streets'][number]): string {
  const name = (side: 0 | 1) => (side === t.hero ? 'You' : t.seats[side]);
  const you = (side: 0 | 1) => side === t.hero;
  if (s.action.kind === 'check') return 'Both players check.';
  const { by, amount } = s.action;
  const other = (1 - by) as 0 | 1;
  const bet = `${act(name(by), you(by), 'bet')} ${r1(amount)}bb into ${r1(s.pot)}bb and ${you(other) ? 'you call' : `${name(other)} calls`}.`;
  // The in position player bets after a check from the player out of position.
  return by === 1 ? `${act(name(0), you(0), 'check')}. ${bet}` : bet;
}

/** Share of the villain's river range the hero's hand beats at showdown, ties counting half. */
export function showdownShare(heroCards: readonly Card[], board: readonly Card[], villain: GenSpot['river']['ranges'][number]): number {
  const mine = evaluate([...heroCards, ...board]);
  let won = 0;
  let total = 0;
  for (const c of villain) {
    if (c.cards.some((x) => heroCards.includes(x))) continue;
    const theirs = evaluate([...c.cards, ...board]);
    won += c.weight * (mine > theirs ? 1 : mine === theirs ? 0.5 : 0);
    total += c.weight;
  }
  return total > 0 ? won / total : 0;
}

/**
 * The full scenario for a code, with words, ranges and the river spot. The
 * hero's cards must be in the hero's river range, or nothing comes back.
 */
export function generatedScenario(code: string): ScenarioSpec | undefined {
  const p = parseScenarioCode(code);
  const t = p && scenarioTemplate(p.template);
  if (!p || !t) return undefined;
  const spot = templateSpot(t, p.seed);
  let heroCards: Card[];
  try {
    heroCards = parseCards(p.heroCards);
  } catch {
    return undefined;
  }
  const inRange = spot.river.ranges[t.hero].some((c) => heroCards.includes(c.cards[0]) && heroCards.includes(c.cards[1]));
  if (!inRange) return undefined;
  const board = spot.board;
  const hand = describeHand([...heroCards, ...board]);
  const villain = t.seats[1 - t.hero];
  const share = showdownShare(heroCards, board, spot.river.ranges[1 - t.hero]);
  const estimate = t.rated ? '' : ' The preflop ranges are estimates for this stack depth.';
  return {
    id: code,
    title: `${handTitle(hand)} on ${TEXTURE_WORDS[spot.texture]}`,
    summary: `${t.seats[t.hero]} vs ${villain} in a ${POT_WORDS[t.potType]} at ${t.stackBb}bb.`,
    level: t.potType === '3bp' || !t.rated ? 'advanced' : 'core',
    hero: { seat: t.seats[t.hero], cards: p.heroCards },
    villain: { seat: villain },
    preflop: { chartId: t.heroChart, narrative: preflopStory(t) },
    streets: spot.streets.map((s) => ({ street: s.street, board: cardsToString(s.board), narrative: streetStory(t, s) })),
    river: {
      board: cardsToString(board),
      pot: spot.river.pot,
      stack: spot.river.stack,
      ranges: [comboRangeText(spot.river.ranges[0]), comboRangeText(spot.river.ranges[1])],
      hero: t.hero,
      line: p.line,
      sizes: RIVER_SIZES,
      raises: [],
      explain: `Your best hand is ${handPhrase(hand)}. Against the hands ${villain} can have here, it wins ${Math.round(share * 100)}% at showdown. The flop and turn are our estimate of how each range plays them. The river is solved exactly for those ranges.${estimate}`,
    },
    generated: { template: t.id, seed: p.seed, rated: t.rated, tableSize: t.tableSize, stackBb: t.stackBb, potType: t.potType },
  };
}

/** Every banked scenario code: seeds checked at build time to give a river decision that matters. */
export const BANKED_SCENARIOS: string[] = SCENARIO_BANK.map(([template, seed, line, hero]) => scenarioCode(template, seed, line ? line.split('-') : [], hero));

/** A curated or generated scenario by id. */
export function findScenario(id: string, curated: readonly ScenarioSpec[]): ScenarioSpec | undefined {
  return curated.find((s) => s.id === id) ?? (id.startsWith('g.') ? generatedScenario(id) : undefined);
}

import { boundaryHands, buildChart, type Chart, type HandMix, hashString, potOdds, reaches } from '@felt/core';
import { STARTER_CHARTS } from '../charts/starter';
import type { LessonContent, QuizVariant } from './types';
import type { QuizStep } from './variants';

/**
 * Generated question versions. Some lesson questions can be asked about
 * many hands, seats or sizes with the same reasoning: what a chart does
 * with a hand, or a price worked out from the sizes. These versions are
 * made from the charts and the core math, so their answers are right by
 * construction, and test/generated.test.ts checks every one again.
 *
 * Each generator adds versions to one question, found by its key and its
 * text, after the versions written by hand.
 */

const SUITS = 'shdc';
const SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

/** Cards for a hand class in suits picked from a hash, so the same hand always shows the same cards. */
export function cardsFor(hand: string, salt: string): string {
  const h = hashString(`${salt}|${hand}`);
  const a = SUITS[h % 4];
  const b = SUITS[((h % 4) + 1 + ((h >>> 2) % 3)) % 4];
  if (hand.length === 2) return `${hand[0]}${a}${hand[1]}${b}`;
  return hand[2] === 's' ? `${hand[0]}${a}${hand[1]}${a}` : `${hand[0]}${a}${hand[1]}${b}`;
}

/** "Kc9d" as "K♣9♦". */
export const symbols = (cards: string) => cards.replace(/([2-9TJQKA])([shdc])/g, (_, r: string, s: string) => r + SYMBOL[s]);

const charts = new Map<string, Chart>();
function chart(id: string): Chart {
  let c = charts.get(id);
  if (!c) {
    const spec = STARTER_CHARTS.find((s) => s.id === id);
    if (!spec) throw new Error(`No chart ${id}`);
    c = buildChart(spec);
    charts.set(id, c);
  }
  return c;
}

/** What a hand does in one word group, when the chart is clear about it. */
export type ChartVerdict = 'pure' | 'mix' | 'fold';

/** The chart's verdict for a hand: one action every time, a raise and fold mix, or fold. Other mixes return undefined. */
export function verdictFor(mix: HandMix, action: string): ChartVerdict | undefined {
  const plays = Object.entries(mix).filter(([a, f]) => a !== 'fold' && f > 1e-9);
  if (plays.length === 0) return 'fold';
  if (plays.length === 1 && plays[0][0] === action && Math.abs(plays[0][1] - 1) < 1e-9) return 'pure';
  if (plays.length === 1 && plays[0][0] === action && plays[0][1] >= 0.25 && plays[0][1] <= 0.75) return 'mix';
  return undefined;
}

interface ChartGen {
  key: string;
  /** The base question, exactly. */
  question: string;
  chartId: string;
  /** The action the chart's answer is about, like raise or call. */
  action: string;
  /** Which hands to ask about: the base answer's kind. */
  verdict: ChartVerdict;
  /** The question for a hand, given its cards. */
  ask: (hand: string, cards: string) => string;
  /** The explanation for a hand. */
  explain: (hand: string, mix: HandMix) => string;
  /** At most this many generated versions. */
  limit?: number;
}

const pct = (x: number) => Math.round(x * 100);

/** Clear lines for the reveal. One idea each, one comma at most. */
const said = {
  pure: (name: string, verb: string) => (hand: string) => `The ${name} ${verb} ${hand} every time. It sits near the edge of the range, so it is worth knowing.`,
  fold: (name: string) => (hand: string) => `The ${name} folds ${hand} every time. It sits just outside the range.`,
  mix: (name: string, verb: string) => (hand: string, mix: HandMix) => `With ${hand} the ${name} ${verb} ${pct(Object.entries(mix).find(([a]) => a !== 'fold')![1])}% of the time and folds the rest. It is a close call.`,
};

const CHART_GENS: ChartGen[] = [
  {
    key: 'preflop/rfi/rfi-ep',
    question: '9-handed at 100bb, it folds to you UTG with KJo. What does the chart do?',
    chartId: '9max-100-rfi-utg',
    action: 'raise',
    verdict: 'fold',
    ask: (h) => `9-handed at 100bb, it folds to you UTG with ${h}. What does the chart do?`,
    explain: said.fold('UTG chart'),
  },
  {
    key: 'preflop/rfi/rfi-ep',
    question: 'Folded to you in the LJ with A3s. What does the chart do?',
    chartId: '9max-100-rfi-lj',
    action: 'raise',
    verdict: 'pure',
    ask: (h) => `Folded to you in the LJ with ${h}. What does the chart do?`,
    explain: said.pure('LJ chart', 'raises'),
  },
  {
    key: 'preflop/rfi/rfi-lp',
    question: 'Folded to you on the button with K5s. What does the chart do?',
    chartId: '9max-100-rfi-btn',
    action: 'raise',
    verdict: 'pure',
    ask: (h) => `Folded to you on the button with ${h}. What does the chart do?`,
    explain: said.pure('button chart', 'raises'),
  },
  {
    key: 'preflop/rfi/rfi-lp',
    question: 'Folded to you in the cutoff with Q7s. What does the chart do?',
    chartId: '9max-100-rfi-co',
    action: 'raise',
    verdict: 'mix',
    ask: (h) => `Folded to you in the cutoff with ${h}. What does the chart do?`,
    explain: said.mix('cutoff chart', 'raises'),
  },
  {
    key: 'preflop/rfi/rfi-sb',
    question: 'Folded to you in the small blind with Q4s. What does the raise only chart do?',
    chartId: '9max-100-rfi-sb',
    action: 'raise',
    verdict: 'pure',
    ask: (h) => `Folded to you in the small blind with ${h}. What does the raise only chart do?`,
    explain: said.pure('small blind chart', 'raises'),
  },
  {
    key: 'preflop/rfi/rfi-sb',
    question: 'Folded to you in the small blind with K7o. What does the raise only chart do?',
    chartId: '9max-100-rfi-sb',
    action: 'raise',
    verdict: 'mix',
    ask: (h) => `Folded to you in the small blind with ${h}. What does the raise only chart do?`,
    explain: said.mix('small blind chart', 'raises'),
  },
  {
    key: 'preflop/vs-open/bb-defense',
    question: 'Big blind against a 2.5bb button open with J6s. What does the chart do?',
    chartId: '9max-100-bb-vs-btn',
    action: 'call',
    verdict: 'pure',
    ask: (h) => `Big blind against a 2.5bb button open with ${h}. What does the chart do?`,
    explain: said.pure('big blind chart', 'calls'),
  },
  {
    key: 'preflop/3bet-pots/vs-3bet',
    question: 'You open K♣9♦ on the button and the big blind 3bets to 11bb. What does Aced’s chart do?',
    chartId: '9max-100-btn-vs-3bet',
    action: 'call',
    verdict: 'fold',
    ask: (_h, cards) => `You open ${symbols(cards)} on the button and the big blind 3bets to 11bb. What does Aced’s chart do?`,
    explain: (h) => `Aced’s chart folds ${h} to the 3bet every time. It opens the button but is too weak to continue.`,
  },
  {
    key: 'exploit/adjustments/live-limpers',
    question: 'Button against one early limper with ATo. What does the starter chart do?',
    chartId: '9max-100-iso-btn-vs-1limp',
    action: 'raise',
    verdict: 'pure',
    ask: (h) => `Button against one early limper with ${h}. What does the starter chart do?`,
    explain: (h) => `The starter chart iso raises ${h} every time. It plays well heads up in position.`,
  },
  {
    key: 'formats/short-handed/blind-battles',
    question: 'The button opens 2.5bb. You hold K♠Q♦ in the small blind. What does Aced’s chart do?',
    chartId: '6max-100-sb-vs-btn',
    action: '3bet',
    verdict: 'pure',
    ask: (_h, cards) => `The button opens 2.5bb. You hold ${symbols(cards)} in the small blind. What does Aced’s chart do?`,
    explain: (h) => `The small blind chart 3bets ${h} every time against the button. It 3bets or folds, and this hand is strong enough.`,
  },
];

/** Hand classes named by a question's existing versions, so a generated one never repeats them. */
const namedHands = (step: QuizStep) => {
  const out = new Set<string>();
  for (const v of [step, ...(step.variants ?? [])]) {
    const m = v.question?.match(/\b([AKQJT2-9]{2}[so]?)\b/);
    if (m) out.add(m[1]);
    if (v.cards) {
      const [a, b] = [v.cards.slice(0, 2), v.cards.slice(2, 4)];
      const order = '23456789TJQKA';
      const [hi, lo] = order.indexOf(a[0]) >= order.indexOf(b[0]) ? [a, b] : [b, a];
      out.add(hi[0] === lo[0] ? hi[0] + lo[0] : hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o'));
    }
  }
  return out;
};

function chartVariants(g: ChartGen, step: QuizStep): QuizVariant[] {
  const c = chart(g.chartId);
  const used = namedHands(step);
  const near = new Set(boundaryHands(c));
  const hands = [...c.mixes.keys()]
    .filter((h) => reaches(c, h) && near.has(h) && !used.has(h) && verdictFor(c.mixes.get(h)!, g.action) === g.verdict)
    .sort((a, b) => hashString(`${g.key}|${a}`) - hashString(`${g.key}|${b}`))
    .slice(0, g.limit ?? 6);
  return hands.map((h) => {
    const cards = cardsFor(h, g.key);
    return { question: g.ask(h, cards), cards, explain: g.explain(h, c.mixes.get(h)!), generated: true };
  });
}

/** A generated question about numbers: its own text, choices, answer and explanation. */
interface MathGen {
  key: string;
  question: string;
  variants: () => QuizVariant[];
}

const one = (x: number) => {
  const r = Math.round(x * 1000) / 10;
  return Number.isInteger(r) ? `${r}%` : `${r.toFixed(1)}%`;
};
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Puts the right answer among distractors, in an order picked from a hash, and drops duplicates. */
function choicesWith(right: string, wrong: string[], salt: string): { choices: string[]; answer: number } | undefined {
  const all = [right, ...wrong.filter((w, i) => w !== right && wrong.indexOf(w) === i)];
  if (all.length < 3) return undefined;
  const picked = all.slice(0, 3).sort((a, b) => hashString(`${salt}|${a}`) - hashString(`${salt}|${b}`));
  return { choices: picked, answer: picked.indexOf(right) };
}

const MATH_GENS: MathGen[] = [
  {
    key: 'basics/rules/actions',
    question: 'Someone bets 6 chips. What is the smallest raise you can make?',
    variants: () =>
      [4, 8, 10, 20].flatMap((bet) => {
        const c = choicesWith(`To ${2 * bet}`, [`To ${bet + 1}`, `To ${1.5 * bet}`], `raise${bet}`);
        return c ? [{ question: `Someone bets ${bet} chips. What is the smallest raise you can make?`, ...c, explain: `A raise must add at least the last bet. So the smallest raise is to ${bet} + ${bet} = ${2 * bet}. Anything less adds too little.` }] : [];
      }),
  },
  {
    key: 'basics/first-strategy/big-blinds',
    question: 'You sit down at $1/$2 with $300. How deep are you?',
    variants: () =>
      (
        [
          [1, 3, 300],
          [2, 5, 500],
          [1, 2, 200],
          [1, 3, 450],
          [2, 5, 1000],
          [5, 10, 1500],
        ] as const
      ).flatMap(([sb, bigBlind, buyIn]) => {
        const right = buyIn / bigBlind;
        const c = choicesWith(`${right}bb`, [`${buyIn / sb}bb`, `${right * 2}bb`, `${right / 2}bb`], `deep${sb}${bigBlind}${buyIn}`);
        return c
          ? [{ question: `You sit down at ${money(sb)}/${money(bigBlind)} with ${money(buyIn)}. How deep are you?`, ...c, explain: `Divide money by the big blind. ${money(buyIn)} ÷ ${money(bigBlind)} is ${right}bb. Dividing by the ${money(sb)} small blind gives the wrong answer.` }]
          : [];
      }),
  },
  {
    key: 'basics/first-strategy/big-blinds',
    question: 'At $2/$5 someone bets $50. How big is that in big blinds?',
    variants: () =>
      (
        [
          [1, 3, 30],
          [1, 2, 24],
          [5, 10, 150],
          [2, 5, 35],
        ] as const
      ).flatMap(([sb, bigBlind, bet]) => {
        const right = bet / bigBlind;
        const c = choicesWith(`${right}bb`, [`${bet / sb}bb`, `${bigBlind}bb`, `${right * 2}bb`], `bet${sb}${bigBlind}${bet}`);
        return c
          ? [{ question: `At ${money(sb)}/${money(bigBlind)} someone bets ${money(bet)}. How big is that in big blinds?`, ...c, explain: `In ${money(sb)}/${money(bigBlind)} the second number is the big blind. So divide ${money(bet)} by ${money(bigBlind)} to get ${right}bb.` }]
          : [];
      }),
  },
  {
    key: 'basics/first-strategy/odds',
    question: 'A draw is 4 to 1 against. What percentage is that?',
    variants: () =>
      [2, 3, 9, 19].flatMap((n) => {
        const right = `${Math.round((100 / (n + 1)) * 10) / 10}%`;
        const c = choicesWith(right, [`${Math.round((100 / n) * 10) / 10}%`, `${Math.round((100 * n) / (n + 1) * 10) / 10}%`], `odds${n}`);
        return c ? [{ question: `A draw is ${n} to 1 against. What percentage is that?`, ...c, explain: `${n} to 1 against means ${n} misses for every hit. That is 1 hit in ${n + 1} tries, or ${right}.` }] : [];
      }),
  },
  {
    key: 'basics/money/card-room',
    question: 'An example room takes 10% of the pot up to $5, plus $1. How much rake does a $30 pot pay?',
    variants: () =>
      [20, 40, 70, 90].flatMap((pot) => {
        const rake = Math.min(pot * 0.1, 5);
        const right = money(rake + 1);
        // Wrong answers: forgetting the $1, forgetting the cap, and the most any pot pays.
        const c = choicesWith(right, [money(rake), money(pot * 0.1 + 1), '$6', money(rake + 2)], `rake${pot}`);
        const capped = pot * 0.1 > 5;
        return c
          ? [{ question: `An example room takes 10% of the pot up to $5, plus $1. How much rake does a ${money(pot)} pot pay?`, ...c, explain: `10% of ${money(pot)} is ${money(pot * 0.1)}.${capped ? ' The cap holds it to $5.' : ' That is under the $5 cap.'} Add the $1 to get ${right}.` }]
          : [];
      }),
  },
  {
    key: 'basics/money/bankroll-start',
    question: 'Your bankroll is $4,000. You play 1/2 with $200 buy ins. How many buy ins do you have?',
    variants: () =>
      (
        [
          [3000, '1/3', 300],
          [10000, '2/5', 500],
          [6000, '1/2', 200],
          [2500, '1/2', 100],
        ] as const
      ).flatMap(([roll, game, buyIn]) => {
        const right = roll / buyIn;
        const bb = Number(game.split('/')[1]);
        const c = choicesWith(right.toLocaleString('en-US'), [(roll / bb).toLocaleString('en-US'), (right * 2).toLocaleString('en-US')], `roll${roll}`);
        return c
          ? [{ question: `Your bankroll is ${money(roll)}. You play ${game} with ${money(buyIn)} buy ins. How many buy ins do you have?`, ...c, explain: `Divide your roll by one buy in. ${money(roll)} ÷ ${money(buyIn)} is ${right} buy ins. The ${(roll / bb).toLocaleString('en-US')} answer is your roll in big blinds.` }]
          : [];
      }),
  },
  {
    key: 'preflop/rfi/rfi-sb',
    question: 'You open to 3bb from the small blind. What raw equity does the big blind need to call?',
    variants: () =>
      [2.5, 3.5, 4].flatMap((r) => {
        // The big blind calls r - 1 more into a pot of 2r once it calls.
        const right = one(potOdds(r + 1, r - 1));
        const c = choicesWith(right, [one(potOdds(r, r - 1)), one((r - 1) / r)], `sbopen${r}`);
        return c
          ? [{ question: `You open to ${r}bb from the small blind. What raw equity does the big blind need to call?`, ...c, explain: `The big blind calls ${r - 1}bb to make a ${2 * r}bb pot. ${r - 1} ÷ ${2 * r} is ${right}. Leaving out the big blind’s own 1bb gives too high a price.` }]
          : [];
      }),
  },
  {
    key: 'preflop/vs-open/sb-vs-open',
    question: 'The button opens to 2.5bb. In the small blind, what raw equity does a call need?',
    variants: () =>
      [3, 3.5, 4].flatMap((o) => {
        // The small blind adds o - 0.5 to a pot of o + 1.5.
        const right = one(potOdds(o + 1.5, o - 0.5));
        const c = choicesWith(right, [one(potOdds(o + 1, o)), one(potOdds(o + 1.5, o - 1))], `sbcall${o}`);
        return c
          ? [{ question: `The button opens to ${o}bb. In the small blind, what raw equity does a call need?`, ...c, explain: `You add ${o - 0.5}bb to a ${o + 1.5}bb pot. So ${o - 0.5} ÷ ${2 * o + 1} = ${right}. Your 0.5bb is already in the pot.` }]
          : [];
      }),
  },
];

/** The UTG pair ladder question has three answers, so its versions can land on any of them. */
const LADDER = {
  key: 'preflop/rfi/rfi-ep',
  question: 'Folded to you UTG with 66. What does the chart do?',
  chartId: '9max-100-rfi-utg',
};

function ladderVariants(step: QuizStep): QuizVariant[] {
  const c = chart(LADDER.chartId);
  const used = namedHands(step);
  const near = new Set(boundaryHands(c));
  const out: QuizVariant[] = [];
  const hands = [...c.mixes.keys()].filter((h) => near.has(h) && !used.has(h)).sort((a, b) => hashString(`${LADDER.key}|${a}`) - hashString(`${LADDER.key}|${b}`));
  for (const h of hands) {
    const raise = c.mixes.get(h)!.raise ?? 0;
    // Each answer must be plainly true: every time, most of the time (half or more), or never.
    const answer = raise >= 1 - 1e-9 ? 0 : raise >= 0.5 ? 1 : raise <= 1e-9 ? 2 : -1;
    if (answer < 0) continue;
    const explain =
      answer === 0 ? `At UTG the chart raises ${h} every time. It sits at the edge of the range.` : answer === 1 ? `At UTG the chart raises ${h} ${pct(raise)}% of the time and folds the rest. So it is a mix.` : `At UTG the chart folds ${h} every time. It sits just outside the range.`;
    out.push({ question: `Folded to you UTG with ${h}. What does the chart do?`, cards: cardsFor(h, LADDER.key), answer, explain, generated: true });
    if (out.length >= 8) break;
  }
  return out;
}

/** Lessons with the generated versions added. Throws if a base question has moved, so a rename is caught at once. */
export function withGenerated(lessons: readonly LessonContent[]): LessonContent[] {
  const extra = new Map<string, Map<string, (step: QuizStep) => QuizVariant[]>>();
  const plan = (key: string, question: string, make: (step: QuizStep) => QuizVariant[]) => {
    const forKey = extra.get(key) ?? new Map();
    forKey.set(question, make);
    extra.set(key, forKey);
  };
  for (const g of CHART_GENS) plan(g.key, g.question, (step) => chartVariants(g, step));
  for (const g of MATH_GENS) plan(g.key, g.question, () => g.variants().map((v) => ({ ...v, generated: true })));
  plan(LADDER.key, LADDER.question, ladderVariants);
  const out = lessons.map((lesson) => {
    const forKey = extra.get(lesson.key);
    if (!forKey) return lesson;
    return {
      ...lesson,
      steps: lesson.steps.map((s) => {
        const make = s.kind === 'quiz' ? forKey.get(s.question) : undefined;
        if (!make || s.kind !== 'quiz') return s;
        forKey.delete(s.question);
        return { ...s, variants: [...(s.variants ?? []), ...make(s)] };
      }),
    };
  });
  const missing = [...extra].flatMap(([key, m]) => [...m.keys()].map((q) => `${key}: ${q}`));
  if (missing.length) throw new Error(`Generated versions: no question for ${missing.join(' | ')}`);
  return out;
}

/** A question that carries generated versions. Chart questions name their chart, action and verdict. */
export interface GeneratedQuestion {
  key: string;
  question: string;
  chartId?: string;
  action?: string;
  verdict?: ChartVerdict;
}

/** The questions that carry generated versions, for tests. */
export const GENERATED_QUESTIONS: GeneratedQuestion[] = [...CHART_GENS.map((g) => ({ key: g.key, question: g.question, chartId: g.chartId, action: g.action, verdict: g.verdict })), ...MATH_GENS.map((g) => ({ key: g.key, question: g.question })), LADDER];

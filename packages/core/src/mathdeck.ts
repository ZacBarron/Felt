import { bluffBreakeven, mdf, outsToEquity, potOdds } from './odds';
import { comboCount } from './ranges';

/**
 * Math facts worth knowing by heart, as review cards with four choices.
 * Every answer is computed from the formulas in odds.ts, so the deck is
 * exact by construction. Distractors are the values a player gets from a
 * common mistake or a neighbouring size, never random numbers.
 */

export type MathFamily = 'pot-odds' | 'mdf' | 'alpha' | 'outs-flop' | 'outs-turn' | 'combos';

export interface MathFact {
  id: string;
  family: MathFamily;
  prompt: string;
  answer: number;
  /** Four choices including the answer, sorted ascending. */
  choices: number[];
  unit: '%' | 'combos';
  explain: string;
}

const SIZES: { label: string; f: number }[] = [
  { label: 'a quarter pot', f: 1 / 4 },
  { label: 'a third of the pot', f: 1 / 3 },
  { label: 'half pot', f: 1 / 2 },
  { label: 'two thirds pot', f: 2 / 3 },
  { label: 'three quarters pot', f: 3 / 4 },
  { label: 'pot', f: 1 },
  { label: '1.5 times pot', f: 1.5 },
  { label: 'twice the pot', f: 2 },
];

const DRAWS: { label: string; outs: number }[] = [
  { label: 'a gutshot (4 outs)', outs: 4 },
  { label: 'an open ended straight draw (8 outs)', outs: 8 },
  { label: 'a flush draw (9 outs)', outs: 9 },
  { label: 'a flush draw plus a gutshot (12 outs)', outs: 12 },
  { label: 'a flush draw plus an open ender (15 outs)', outs: 15 },
];

/** Percent to one decimal, as the lessons write it. */
export const pct = (x: number) => Math.round(x * 1000) / 10;

/** The answer plus the three nearest distinct wrong values, preferring the named mistakes. */
function pick(answer: number, mistakes: number[], pool: number[]): number[] {
  const wrong: number[] = [];
  const add = (v: number) => {
    if (v > 0 && Math.abs(v - answer) > 0.05 && !wrong.some((w) => Math.abs(w - v) < 0.05)) wrong.push(v);
  };
  for (const m of mistakes) add(m);
  for (const v of [...pool].sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer))) add(v);
  return [answer, ...wrong.slice(0, 3)].sort((a, b) => a - b);
}

function build(): MathFact[] {
  const facts: MathFact[] = [];
  const potPool = SIZES.map((s) => pct(potOdds(1 + s.f, s.f)));
  const mdfPool = SIZES.map((s) => pct(mdf(1, s.f)));
  const alphaPool = SIZES.map((s) => pct(bluffBreakeven(1, s.f)));

  for (const s of SIZES) {
    const need = pct(potOdds(1 + s.f, s.f));
    facts.push({
      id: `math:pot-odds:${s.f.toFixed(3)}`,
      family: 'pot-odds',
      prompt: `They bet ${s.label}. How much equity do you need to call?`,
      answer: need,
      // Forgetting your own call in the final pot gives bet / (pot + bet).
      choices: pick(need, [pct(s.f / (1 + s.f))], potPool),
      unit: '%',
      explain: `Divide your call by the final pot, which holds the pot, their bet and your call. That is ${need}%.`,
    });
    const defend = pct(mdf(1, s.f));
    facts.push({
      id: `math:mdf:${s.f.toFixed(3)}`,
      family: 'mdf',
      prompt: `They bet ${s.label}. How often must you continue so a pure bluff cannot profit?`,
      answer: defend,
      // Confusing MDF with the bluffer's break even gives alpha.
      choices: pick(defend, [pct(bluffBreakeven(1, s.f))], mdfPool),
      unit: '%',
      explain: `Minimum defense is pot divided by pot plus bet: ${defend}%. It ignores what you hold, so treat it as a guide.`,
    });
    const alpha = pct(bluffBreakeven(1, s.f));
    facts.push({
      id: `math:alpha:${s.f.toFixed(3)}`,
      family: 'alpha',
      prompt: `You bluff ${s.label}. How often must they fold for the bluff to break even?`,
      answer: alpha,
      choices: pick(alpha, [pct(mdf(1, s.f)), pct(potOdds(1 + s.f, s.f))], alphaPool),
      unit: '%',
      explain: `A bluff risks the bet to win the pot. Bet divided by pot plus bet is ${alpha}%.`,
    });
  }

  const flopPool = DRAWS.map((d) => pct(outsToEquity(d.outs, 47, 2)));
  const turnPool = DRAWS.map((d) => pct(outsToEquity(d.outs, 46, 1)));
  for (const d of DRAWS) {
    const flop = pct(outsToEquity(d.outs, 47, 2));
    facts.push({
      id: `math:outs-flop:${d.outs}`,
      family: 'outs-flop',
      prompt: `On the flop you have ${d.label}. How often do you hit by the river?`,
      answer: flop,
      // The rule of 4 shortcut and the one card chance are the usual slips.
      choices: pick(flop, [d.outs * 4, pct(outsToEquity(d.outs, 46, 1))], flopPool),
      unit: '%',
      explain: `With ${d.outs} outs and 47 unseen cards, you miss twice with chance ${47 - d.outs}/47 × ${46 - d.outs}/46. One minus that is ${flop}%. The rule of 4 says ${d.outs * 4}%.`,
    });
    const turn = pct(outsToEquity(d.outs, 46, 1));
    facts.push({
      id: `math:outs-turn:${d.outs}`,
      family: 'outs-turn',
      prompt: `On the turn you have ${d.label}. How often do you hit on the river?`,
      answer: turn,
      choices: pick(turn, [d.outs * 2, flop], turnPool),
      unit: '%',
      explain: `${d.outs} outs among 46 unseen cards is ${turn}%. The rule of 2 says ${d.outs * 2}%.`,
    });
  }

  const combos: { id: string; prompt: string; answer: number; mistakes: number[]; explain: string }[] = [
    { id: 'pair', prompt: 'How many ways can you be dealt a specific pocket pair, like AA?', answer: comboCount('AA'), mistakes: [4, 12, 16], explain: 'Choose 2 of the 4 aces: 6 combos.' },
    { id: 'suited', prompt: 'How many combos of a specific suited hand, like AKs?', answer: comboCount('AKs'), mistakes: [6, 12, 16], explain: 'One per suit: 4 combos.' },
    { id: 'offsuit', prompt: 'How many combos of a specific offsuit hand, like AKo?', answer: comboCount('AKo'), mistakes: [4, 6, 16], explain: '4 × 4 = 16 ways, minus 4 suited ones: 12 combos.' },
    { id: 'unpaired', prompt: 'How many combos of AK in total, suited and offsuit?', answer: comboCount('AKs') + comboCount('AKo'), mistakes: [12, 6, 4], explain: '4 aces × 4 kings = 16 combos.' },
    { id: 'pair-one-out', prompt: 'One ace is on the board. How many combos of AA are left?', answer: 3, mistakes: [6, 1, 4], explain: 'Choose 2 of the 3 aces left: 3 combos.' },
    { id: 'ak-one-out', prompt: 'One ace is on the board. How many AK combos are left?', answer: 12, mistakes: [16, 9, 8], explain: '3 aces × 4 kings = 12 combos.' },
  ];
  for (const c of combos) {
    facts.push({
      id: `math:combos:${c.id}`,
      family: 'combos',
      prompt: c.prompt,
      answer: c.answer,
      choices: [c.answer, ...c.mistakes].sort((a, b) => a - b),
      unit: 'combos',
      explain: c.explain,
    });
  }
  return facts;
}

/** Every math fact, in teaching order. */
export const MATH_FACTS: readonly MathFact[] = build();

export const mathFact = (id: string) => MATH_FACTS.find((f) => f.id === id);

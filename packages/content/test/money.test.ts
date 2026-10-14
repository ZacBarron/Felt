import { bbToMoney, moneyToBb, PRESETS, rakeFor, type Rake, type Stakes } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, LESSON_CONTENT, type LessonArt, type LessonContent, type LessonStep } from '../src';

/**
 * Numbers in the Playing for money topic of Poker basics, recomputed here.
 * Conversions use @felt/core. Risk numbers use the same formulas as
 * mindset/mental/bankroll and mindset/mental/variance, with the same
 * assumptions, so the beginner lessons cannot drift from the full ones.
 */

const lesson = (key: string): LessonContent => {
  const l = LESSON_CONTENT.get(key);
  if (!l) throw new Error(`No lesson ${key}`);
  return l;
};
const step = (key: string, title: string): LessonStep => {
  const s = lesson(key).steps.find((x) => 'title' in x && x.title === title);
  if (!s) throw new Error(`${key}: no step "${title}"`);
  return s;
};
const art = (key: string, title: string): LessonArt => {
  const s = step(key, title);
  if (s.kind !== 'visual') throw new Error(`${key}: "${title}" is not a visual`);
  return s.art;
};
function pick<K extends LessonArt['kind']>(a: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(a.kind).toBe(kind);
  return a as Extract<LessonArt, { kind: K }>;
}
const bars = (a: LessonArt) => pick(a, 'bars').bars.map((b) => b.value);
const quiz = (key: string, question: string) => {
  const q = lesson(key).steps.find((s) => s.kind === 'quiz' && s.question === question);
  if (!q || q.kind !== 'quiz') throw new Error(`${key}: no quiz "${question}"`);
  return q;
};
const answer = (key: string, question: string) => {
  const q = quiz(key, question);
  return q.choices[q.answer];
};
const text = (key: string) => JSON.stringify(lesson(key));
const r1 = (x: number) => Math.round(x * 10) / 10;
const stakes = (sb: number, bb: number): Stakes => ({ sb, bb, currency: 'USD' });
const S12 = stakes(1, 2);
const S13 = stakes(1, 3);
const S25 = stakes(2, 5);
const S510 = stakes(5, 10);

/** Risk of ruin, as in mindset/mental/bankroll: exp(−2 × WR × B ÷ SD²), B in bb. */
const ror = (wr: number, sd: number, bankrollBb: number) => Math.exp((-2 * wr * bankrollBb) / sd ** 2);
/** Standard normal CDF from the erf series, exact to far more digits than the lessons show. */
function phi(z: number): number {
  const x = z / Math.SQRT2;
  let term = x;
  let sum = x;
  for (let n = 1; n < 60; n++) {
    term *= (-x * x) / n;
    sum += term / (2 * n + 1);
  }
  return 0.5 * (1 + (2 / Math.sqrt(Math.PI)) * sum);
}
/** Chance a true winner shows a loss after n hands, as in mindset/mental/variance. */
const behind = (wr: number, sd: number, hands: number) => phi(-wr / (sd / Math.sqrt(hands / 100)));

// The model both mindset lessons use.
const WR = 10;
const SD = 100;
const HANDS_PER_HOUR = 30;

describe('playing for money: the topic', () => {
  it('sits third in Poker basics with 3 lessons, after the first strategy', () => {
    const basics = CURRICULUM.find((t) => t.id === 'basics')!;
    expect(basics.modules.map((m) => m.id)).toEqual(['rules', 'first-strategy', 'money']);
    const money = basics.modules[2];
    expect(money.lessons.map((l) => l.id)).toEqual(['stakes', 'card-room', 'bankroll-start']);
    for (const l of money.lessons) {
      const content = lesson(`basics/money/${l.id}`);
      expect(content.steps.filter((s) => s.kind === 'quiz').length).toBeGreaterThanOrEqual(3);
      expect(content.steps.filter((s) => s.kind === 'visual').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('follows the voice rules: one comma per sentence, no semicolons or dashes', () => {
    const strings = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
    for (const id of ['stakes', 'card-room', 'bankroll-start']) {
      const key = `basics/money/${id}`;
      for (const s of strings(lesson(key))) {
        expect(s, key).not.toMatch(/[;–—]/);
        // Thousands separators are not commas in the sentence.
        for (const sentence of s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/)) {
          expect((sentence.match(/,/g) ?? []).length, `${key}: ${sentence}`).toBeLessThanOrEqual(1);
          expect(sentence.split(/\s+/).length, `${key}: ${sentence}`).toBeLessThan(20);
        }
      }
    }
  });
});

describe('how stakes work', () => {
  const key = 'basics/money/stakes';

  it('reads 1/3 as a $1 small blind and a $3 big blind', () => {
    for (const a of [lesson(key).cover, art(key, 'What 1/3 means')]) {
      expect(pick(a, 'tree').branches.map((b) => b.value)).toEqual([`$${S13.sb}`, `$${S13.bb}`]);
    }
    expect(answer(key, 'In a 1/3 game, how big is the big blind?')).toBe('$3');
    // The wrong answer adds the 2 blinds.
    expect(quiz(key, 'In a 1/3 game, how big is the big blind?').choices).toContain(`$${S13.sb + S13.bb}`);
  });

  it('converts $300 into big blinds at 1/2, 1/3 and 2/5', () => {
    expect(bars(art(key, 'One stack, three games'))).toEqual([S12, S13, S25].map((s) => moneyToBb(300, s)));
    expect([S12, S13, S25].map((s) => moneyToBb(300, s))).toEqual([150, 100, 60]);
  });

  it('converts big blinds back into money', () => {
    expect([bbToMoney(12, S13), bbToMoney(12, S12)]).toEqual([36, 24]);
    const formula = step(key, 'From bb back to money');
    expect(formula.kind === 'formula' && formula.example).toContain('**$36**');
    expect(formula.kind === 'formula' && formula.example).toContain('**$24**');
    // 12bb at 2/5 is $60; the $24 distractor multiplies by the small blind.
    expect(answer(key, 'At 2/5 someone bets 12bb. How much money is that?')).toBe(`$${bbToMoney(12, S25)}`);
    expect(12 * S25.sb).toBe(24);
  });

  it('labels the example buy in limits and converts them', () => {
    const [min, max] = pick(art(key, 'An example buy in'), 'tree').branches;
    expect(min.value).toBe(`$100, about ${Math.round(moneyToBb(100, S13))}bb`);
    expect(max.value).toBe(`$300, which is ${moneyToBb(300, S13)}bb`);
    const s = step(key, 'An example buy in');
    expect(s.kind === 'visual' && s.caption).toContain('This is an example, not a rule.');
    expect(text(key)).toContain('The limits vary by room.');
  });

  it('asks how deep $300 is at 1/3, with distractors from the wrong blind', () => {
    const q = quiz(key, 'You buy in for $300 at 1/3. How deep are you?');
    expect(q.choices[q.answer]).toBe(`${moneyToBb(300, S13)}bb`);
    expect(q.choices).toContain(`${300 / S13.sb}bb`);
    expect(q.choices).toContain(`${moneyToBb(300, S12)}bb`);
  });
});

describe('your first time at a card room', () => {
  const key = 'basics/money/card-room';
  // The example rule, the same as the rake lesson and the live 1/3 preset.
  const example: Rake = { percent: 0.1, cap: 5, dropExtra: 1, noFlopNoDrop: true };

  it('uses the same example rake rule as the rake lesson and the live preset', () => {
    expect(PRESETS['live-1-3'].settings.rake).toEqual(example);
    expect(JSON.stringify(LESSON_CONTENT.get('preflop/stack-depth/rake'))).toContain('10% up to $5, plus $1 for a jackpot');
    expect(text(key)).toContain('10% up to $5, plus $1 for a jackpot');
  });

  it('takes $6 from a $60 pot and pays the winner $54', () => {
    expect(rakeFor(60, example)).toBe(6);
    const ring = pick(art(key, 'Rake is the room’s share'), 'ring');
    expect(ring.value).toBeCloseTo((60 - rakeFor(60, example)) / 60, 12);
    expect(ring.label).toBe(`$${60 - rakeFor(60, example)} of $60`);
    // A pot that ends before the flop pays nothing in this rule.
    expect(rakeFor(60, example, false)).toBe(0);
  });

  it('prices the rake on a $30 pot', () => {
    expect(rakeFor(30, example)).toBeCloseTo(4, 12);
    expect(30 * example.percent).toBeCloseTo(3, 12);
    expect(example.cap + example.dropExtra).toBe(6);
    expect(answer(key, 'An example room takes 10% of the pot up to $5, plus $1. How much rake does a $30 pot pay?')).toBe('$4');
  });
});

describe('money set aside for poker', () => {
  const key = 'basics/money/bankroll-start';

  it('counts a $6,000 roll in 100bb buy ins at 1/2, 1/3 and 2/5', () => {
    const buyIns = [S12, S13, S25].map((s) => bbToMoney(100, s));
    expect(buyIns).toEqual([200, 300, 500]);
    expect(bars(art(key, 'One roll, three games'))).toEqual(buyIns.map((b) => 6000 / b));
    expect(buyIns.map((b) => 6000 / b)).toEqual([30, 20, 12]);
  });

  it('makes one buy in 5% of a 20 buy in roll', () => {
    expect(pick(art(key, 'One buy in is a small share'), 'ring').value).toBe(300 / 6000);
    expect(pick(lesson(key).cover, 'ring').value).toBe(1 / 20);
  });

  it('computes risk of ruin with the bankroll lesson formula and model', () => {
    const counts = [5, 10, 20];
    expect(bars(art(key, 'More buy ins, less risk'))).toEqual(counts.map((b) => r1(ror(WR, SD, b * 100) * 100)));
    expect(counts.map((b) => r1(ror(WR, SD, b * 100) * 100))).toEqual([36.8, 13.5, 1.8]);
    // The same numbers the full bankroll and variance lessons show.
    const curve = LESSON_CONTENT.get('mindset/mental/bankroll')!.steps.find((s) => s.kind === 'visual' && s.title === 'More buy ins, less risk');
    const points = new Map(curve?.kind === 'visual' && curve.art.kind === 'curve' ? curve.art.points : []);
    expect(counts.map((b) => points.get(b))).toEqual([36.8, 13.5, 1.8]);
    // The caption states the model's assumptions.
    const s = step(key, 'More buy ins, less risk');
    expect(s.kind === 'visual' && s.caption).toContain('This is a model');
    expect(s.kind === 'visual' && s.caption).toContain(`${WR}bb per 100 hands`);
    expect(s.kind === 'visual' && s.caption).toContain(`${SD}bb per 100 hands`);
  });

  it('shows a winner behind after 10,000 hands, in hours and weeks', () => {
    const p = behind(WR, SD, 10_000);
    expect(r1(p * 100)).toBe(15.9);
    expect(pick(art(key, 'Winners lose for weeks'), 'ring').value).toBe(Number(p.toFixed(3)));
    const hours = 10_000 / HANDS_PER_HOUR;
    expect(Math.round(hours)).toBe(333);
    expect(Math.round(hours / 10)).toBe(33);
    const s = step(key, 'Winners lose for weeks');
    expect(s.kind === 'visual' && s.caption).toContain('about 333 hours at 30 hands an hour');
    expect(s.kind === 'visual' && s.caption).toContain('about 33 weeks');
    expect(s.kind === 'visual' && s.caption).toContain('15.9%');
    // The variance lesson states the same chance and hours.
    const variance = JSON.stringify(LESSON_CONTENT.get('mindset/mental/variance'));
    expect(variance).toContain('15.9%');
    expect(variance).toContain('about 30 hands an hour');
  });

  it('keeps the rule of thumb the bankroll lesson uses', () => {
    expect(JSON.stringify(LESSON_CONTENT.get('mindset/mental/bankroll'))).toContain('20 to 40 buy ins');
    expect(text(key)).toContain('rule of thumb for live cash is **20 to 40 buy ins**');
  });

  it('answers its buy in questions with exact division', () => {
    const q = quiz(key, 'Your bankroll is $4,000. You play 1/2 with $200 buy ins. How many buy ins do you have?');
    expect(q.choices[q.answer]).toBe(String(4000 / 200));
    // Distractors: the roll in big blinds, and a $100 buy in.
    expect(moneyToBb(4000, S12)).toBe(2000);
    expect(q.choices).toContain('2,000');
    expect(q.choices).toContain(String(4000 / 100));
    // Only 1/2 lands inside 20 to 40 buy ins of a $6,000 roll.
    const fits = (buyIn: number) => 6000 / buyIn >= 20 && 6000 / buyIn <= 40;
    const options: [string, number][] = [
      ['1/2 with $200 buy ins', bbToMoney(100, S12)],
      ['2/5 with $500 buy ins', bbToMoney(100, S25)],
      ['5/10 with $1,000 buy ins', bbToMoney(100, S510)],
    ];
    expect(options.filter(([, b]) => fits(b)).map(([label]) => label)).toEqual([answer(key, 'Your roll is $6,000. Which game fits the rule of thumb of 20 to 40 buy ins?')]);
    expect(options.map(([, b]) => 6000 / b)).toEqual([30, 12, 6]);
  });
});

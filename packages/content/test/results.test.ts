import {
  averageDepthBelowPeak,
  averageRake,
  bbPer100ForHourly,
  bbPerHour,
  chanceResultsBelow,
  deepestDrop,
  defaultAssumptions,
  exactEquity,
  handsForPrecision,
  handsToRecover,
  moneyPerHour,
  moneyToBb,
  normalCdf,
  parseCards,
  PRESETS,
  rakeFor,
  resultsHalfWidth,
  resultsSpreadBb,
  riskOfRuin,
  shareOfTimeBelowPeak,
  simulatedDownswingChance,
  simulateResults,
  skillEdge,
  tableCosts,
  type Card,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, LESSON_CONTENT, STARTER_CHARTS, type LessonArt, type LessonContent, type LessonStep } from '../src';

/**
 * Win rate, rake and variance. Every number in the track is recomputed here
 * with @felt/core, from the same presets and default assumptions the You page
 * uses, so the lessons cannot drift from the app's model. Simulated pictures
 * are regenerated from their seeds and their captions checked against them.
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
const caption = (key: string, title: string): string => {
  const s = step(key, title);
  if (s.kind !== 'visual' && s.kind !== 'hand' && s.kind !== 'chart') throw new Error(`${key}: "${title}" has no caption`);
  return s.caption;
};
function pick<K extends LessonArt['kind']>(a: LessonArt, kind: K): Extract<LessonArt, { kind: K }> {
  expect(a.kind).toBe(kind);
  return a as Extract<LessonArt, { kind: K }>;
}
const bars = (a: LessonArt) => pick(a, 'bars').bars.map((b) => b.value);
const branch = (a: LessonArt, label: string) => {
  const b = pick(a, 'tree').branches.find((x) => x.label === label);
  if (!b) throw new Error(`No branch ${label}`);
  return b.value ?? '';
};
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
const tableRows = (key: string, title: string) => {
  const s = step(key, title);
  if (s.kind !== 'table') throw new Error(`${key}: "${title}" is not a table`);
  return s.rows;
};
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const pct1 = (x: number) => r1(x * 100);
const MINUS = '−';
const signed1 = (x: number) => `${x < 0 ? MINUS : '+'}${Math.abs(r1(x)).toFixed(1)}`;
const money = (x: number) => `$${x.toFixed(2)}`;
const thousands = (n: number) => n.toLocaleString('en-US');

// The app's presets and default assumptions: the model every lesson uses.
const LIVE13 = PRESETS['live-1-3'].settings;
const LIVE25 = PRESETS['live-2-5'].settings;
const ONLINE = PRESETS['online-6max'].settings;
const A13 = defaultAssumptions(LIVE13);
const A25 = defaultAssumptions(LIVE25);
const AON = defaultAssumptions(ONLINE);
const C13 = tableCosts(LIVE13, A13);
const C25 = tableCosts(LIVE25, A25);
const CON = tableCosts(ONLINE, AON);
const COST13 = C13.rakePer100 + C13.tipsPer100;
const COST25 = C25.rakePer100 + C25.tipsPer100;
const COSTON = CON.rakePer100 + CON.tipsPer100;
const LIVE_HPH = A13.handsPerHour;
const ONLINE_HPH = AON.handsPerHour;
const SD_LIVE = A13.sd100;
const SD_ONLINE = AON.sd100;
// The example true win rate the variance lessons use, as the mindset lessons do.
const WR = 10;

const TRACK = CURRICULUM.find((t) => t.id === 'results')!;
const KEYS = TRACK ? TRACK.modules.flatMap((m) => m.lessons.map((l) => `results/${m.id}/${l.id}`)) : [];

describe('the results track', () => {
  it('sits right after the mental game track with 12 lessons, win rates first', () => {
    expect(TRACK).toBeDefined();
    const ids = CURRICULUM.map((t) => t.id);
    expect(ids.indexOf('results')).toBe(ids.indexOf('mindset') + 1);
    // The first module of a track is the free one.
    expect(TRACK.modules.map((m) => m.id)).toEqual(['win-rate', 'rake', 'variance']);
    expect(TRACK.modules.map((m) => m.lessons.map((l) => l.id))).toEqual([
      ['bb-per-100', 'per-hour', 'true-cost', 'table-selection'],
      ['how-rake-works', 'rake-cost', 'rake-strategy'],
      ['standard-deviation', 'sample-size', 'downswings', 'risk-of-ruin', 'luck-vs-skill'],
    ]);
    for (const key of KEYS) expect(LESSON_CONTENT.has(key), key).toBe(true);
    expect([...LESSON_CONTENT.keys()].filter((k) => k.startsWith('results/'))).toHaveLength(12);
  });

  it('teaches with pictures: 3 or more each, never 2 text steps in a row, and at least 3 questions', () => {
    const pictures = new Set(['visual', 'hand', 'board', 'chart']);
    const textOnly = new Set(['intro', 'text', 'callout']);
    for (const key of KEYS) {
      const steps = lesson(key).steps;
      expect(steps.filter((s) => pictures.has(s.kind)).length, `${key}: pictures`).toBeGreaterThanOrEqual(3);
      expect(steps.filter((s) => s.kind === 'quiz').length, `${key}: questions`).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < steps.length; i++) {
        expect(textOnly.has(steps[i].kind) && textOnly.has(steps[i - 1].kind), `${key}: text steps ${i - 1} and ${i}`).toBe(false);
      }
      expect(steps[0].kind).toBe('intro');
      expect(steps.at(-1)?.kind).toBe('takeaway');
    }
  });

  it('follows the voice rules: short sentences, one comma, no semicolons, dashes or outside sources', () => {
    const strings = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
    for (const key of KEYS) {
      for (const s of strings(lesson(key))) {
        expect(s, key).not.toMatch(/[;–—]/);
        expect(s, key).not.toMatch(/https?:|www\.|\bbook\b|\bsolver site\b/i);
        // Thousands separators are not commas in the sentence.
        for (const sentence of s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/)) {
          expect((sentence.match(/,/g) ?? []).length, `${key}: ${sentence}`).toBeLessThanOrEqual(1);
          expect(sentence.split(/\s+/).length, `${key}: ${sentence}`).toBeLessThan(20);
        }
      }
    }
  });

  it('draws only valid simulated paths, labelled as simulated or model', () => {
    for (const key of KEYS) {
      const l = lesson(key);
      const all = [{ art: l.cover, caption: '' }, ...l.steps.flatMap((s) => (s.kind === 'visual' ? [{ art: s.art, caption: s.caption }] : []))];
      for (const { art: a, caption: c } of all) {
        if (a.kind !== 'paths') continue;
        expect(a.hands).toBeGreaterThan(0);
        expect(a.paths).toBeGreaterThanOrEqual(1);
        expect(a.paths).toBeLessThanOrEqual(10);
        expect(a.sd100).toBeGreaterThan(0);
        if (c) expect(c, key).toMatch(/simulated/);
      }
    }
  });
});

describe('what bb/100 means', () => {
  const key = 'results/win-rate/bb-per-100';

  it('turns 300bb over 2,000 hands into 15 bb/100', () => {
    const perHand = 300 / 2000;
    for (const a of [lesson(key).cover, art(key, 'From a result to a win rate')]) {
      expect(branch(a, 'Per hand')).toBe(`${perHand}bb`);
      expect(branch(a, 'Per 100 hands')).toBe(`${perHand * 100} bb/100`);
    }
    const f = step(key, 'Win rate in bb/100');
    expect(f.kind === 'formula' && f.example).toContain(`**${perHand * 100} bb/100**`);
  });

  it('shows 15 bb/100 in money at 1/3 and 2/5', () => {
    const stakes13 = LIVE13.stakes;
    const stakes25 = LIVE25.stakes;
    expect(bars(art(key, 'One win rate, two stakes'))).toEqual([15 * stakes13.bb, 15 * stakes25.bb]);
    expect(text(key)).toContain(`$${15 * stakes13.bb} per 100 hands at 1/3. At 2/5 it is $${15 * stakes25.bb}.`);
  });

  it('estimates a live session’s hands at the model’s pace', () => {
    expect(LIVE_HPH).toBe(27);
    const bb = moneyToBb(90, LIVE13.stakes);
    const hands = 5 * LIVE_HPH;
    const a = art(key, 'A live session in bb/100');
    expect(branch(a, 'Result in bb')).toBe(`$90 ÷ $3 = ${bb}bb`);
    expect(branch(a, 'Hands, estimated')).toBe(`5 hours × ${LIVE_HPH} = ${hands} hands`);
    expect(branch(a, 'Win rate')).toBe(`${bb} ÷ ${hands} × 100 = ${r1((bb / hands) * 100)} bb/100`);
    expect(text(key)).toContain(`Its model uses ${LIVE_HPH} hands an hour`);
    const q = quiz(key, 'You play 10 hours live and do not count hands. How many hands does Suited’s model estimate?');
    expect(q.choices[q.answer]).toBe(`${10 * LIVE_HPH}`);
    expect(q.choices).toContain(`${10 * ONLINE_HPH}`);
  });

  it('answers its questions with exact division', () => {
    expect(answer(key, 'You win 450bb over 3,000 hands. What is your win rate?')).toBe(`${(450 / 3000) * 100} bb/100`);
    const q = quiz(key, 'You win 450bb over 3,000 hands. What is your win rate?');
    expect(q.choices).toContain(`${450 / 3000} bb/100`);
    expect(q.choices).toContain(`${r1(3000 / 450)} bb/100`);
    const q2 = quiz(key, 'You are up $600 at 2/5 over 4,000 hands. What is your win rate?');
    expect(q2.choices[q2.answer]).toBe(`${(moneyToBb(600, LIVE25.stakes) / 4000) * 100} bb/100`);
    expect(q2.choices).toContain(`${(600 / 4000) * 100} bb/100`);
    expect(q2.choices).toContain(`${(600 / LIVE25.stakes.sb / 4000) * 100} bb/100`);
  });
});

describe('win rate per hour', () => {
  const key = 'results/win-rate/per-hour';

  it('uses the model’s hands per hour', () => {
    expect([LIVE_HPH, ONLINE_HPH]).toEqual([27, 75]);
    expect(bars(art(key, 'Hands per hour'))).toEqual([LIVE_HPH, ONLINE_HPH]);
    expect(caption(key, 'Hands per hour')).toContain('model values');
  });

  it('compares live 10 bb/100 with online 5 bb/100 per hour', () => {
    const live = bbPerHour(10, LIVE_HPH);
    const online = bbPerHour(5, ONLINE_HPH);
    expect([r2(live), r2(online)]).toEqual([2.7, 3.75]);
    for (const a of [lesson(key).cover, art(key, 'Not the same per hour')]) expect(bars(a)).toEqual([r2(live), r2(online)]);
    // "Almost 3 times as many hands".
    expect(ONLINE_HPH / LIVE_HPH).toBeGreaterThan(2.7);
    expect(ONLINE_HPH / LIVE_HPH).toBeLessThan(3);
    const f = step(key, 'Big blinds per hour');
    expect(f.kind === 'formula' && f.example).toContain(`10 × ${LIVE_HPH} ÷ 100 = **${r2(live)}bb an hour**`);
    expect(answer(key, 'Live 10 bb/100 at 27 hands an hour, or online 5 bb/100 at 75. Which wins more big blinds per hour?')).toBe('The online player');
    expect(answer(key, 'You win 10 bb/100 live at 27 hands an hour. How many big blinds is that per hour?')).toBe(`${r2(live)}bb`);
  });

  it('turns bb per hour into money', () => {
    expect(moneyPerHour(10, LIVE_HPH, 3)).toBeCloseTo(8.1, 10);
    expect(moneyPerHour(10, LIVE_HPH, 5)).toBeCloseTo(13.5, 10);
    expect(moneyPerHour(5, ONLINE_HPH, 1)).toBeCloseTo(3.75, 10);
    expect(tableRows(key, 'An hour at 3 games')).toEqual([
      ['Live $1/$3', '10 bb/100', `${r2(bbPerHour(10, LIVE_HPH))}bb`, money(moneyPerHour(10, LIVE_HPH, 3))],
      ['Live $2/$5', '10 bb/100', `${r2(bbPerHour(10, LIVE_HPH))}bb`, money(moneyPerHour(10, LIVE_HPH, 5))],
      ['Online $0.50/$1', '5 bb/100', `${r2(bbPerHour(5, ONLINE_HPH))}bb`, money(moneyPerHour(5, ONLINE_HPH, 1))],
    ]);
    const f = step(key, 'Money per hour');
    expect(f.kind === 'formula' && f.example).toContain(`**${money(moneyPerHour(10, LIVE_HPH, 3))} an hour**`);
    const q = quiz(key, 'You win 2.7bb an hour at 2/5. How much money is that per hour?');
    expect(q.choices[q.answer]).toBe(money(2.7 * LIVE25.stakes.bb));
    expect(q.choices).toContain(money(2.7 * LIVE25.stakes.sb));
    expect(q.choices).toContain(money(2.7 * LIVE13.stakes.bb));
  });

  it('scales with tables only if the win rate holds', () => {
    expect(bars(art(key, 'More tables, more hands'))).toEqual([1, 2, 4].map((t) => bbPerHour(5, ONLINE_HPH * t)));
    expect(caption(key, 'More tables, more hands')).toContain('may drop');
  });
});

describe('what the game costs you', () => {
  const key = 'results/win-rate/true-cost';

  it('prices rake and tips from the live 1/3 preset and default assumptions', () => {
    expect([r1(C13.rakePer100), r1(C13.tipsPer100), r1(COST13)]).toEqual([12.9, 3.0, 15.9]);
    for (const a of [lesson(key).cover, art(key, 'What the average player pays')]) expect(bars(a)).toEqual([r1(C13.rakePer100), r1(C13.tipsPer100)]);
    const c = caption(key, 'What the average player pays');
    expect(c).toContain(`about ${r1(COST13)} bb/100`);
    expect(c).toContain(`about ${r1(bbPerHour(COST13, LIVE_HPH))}bb`);
    expect(r1(moneyPerHour(COST13, LIVE_HPH, 3))).toBe(12.9);
    expect(c).toContain('about $12.90 an hour');
  });

  it('lists the inputs as settings or assumptions, matching the model', () => {
    const rows = tableRows(key, 'What is arithmetic and what is assumed');
    const value = (input: string) => rows.find((r) => r[0] === input)![1];
    expect(LIVE13.rake).toEqual({ percent: 0.1, cap: 5, dropExtra: 1, noFlopNoDrop: true });
    expect(value('Players')).toBe(String(LIVE13.tableSize));
    expect(value('Hands that see a flop')).toBe(`${A13.flopShare * 100}%`);
    expect(value('Average pot with a flop')).toBe(`${A13.flopPotBb}bb`);
    expect(value('Tip per pot with a flop')).toBe(`$${A13.tipPerPot}`);
    for (const r of rows) expect(['Your setting', 'Assumption']).toContain(r[2]);
  });

  it('shows a 12 bb/100 edge losing after costs', () => {
    const a = art(key, 'A winner who still loses');
    expect(branch(a, 'Rake')).toBe(`${MINUS}${r1(C13.rakePer100)} bb/100`);
    expect(branch(a, 'Tips')).toBe(`${MINUS}${r1(C13.tipsPer100).toFixed(1)} bb/100`);
    expect(branch(a, 'Win rate after costs')).toBe(`${signed1(12 - COST13)} bb/100`);
    expect(answer(key, 'You beat the other players by 10 bb/100 at live 1/3. What do you win after costs in Suited’s model?')).toBe(`About ${signed1(10 - COST13)} bb/100`);
    // The distractor forgets the tips.
    expect(quiz(key, 'You beat the other players by 10 bb/100 at live 1/3. What do you win after costs in Suited’s model?').choices).toContain(`About ${signed1(10 - C13.rakePer100)} bb/100`);
    expect(answer(key, 'In Suited’s live 1/3 model, what is the win rate of an average player?')).toBe(`About ${MINUS}${r1(COST13)} bb/100`);
  });

  it('compares costs by game, per 100 hands and per hour', () => {
    expect(bars(art(key, 'Costs by game'))).toEqual([r1(COST13), r1(COST25), r1(COSTON)]);
    expect(CON.tipsPer100).toBe(0);
    expect(r1(bbPerHour(COSTON, ONLINE_HPH))).toBe(4.1);
    expect(r1(bbPerHour(COST13, LIVE_HPH))).toBe(4.3);
    expect(text(key)).toContain(`So ${r1(COSTON)} bb/100 costs about 4.1bb an hour. Live 1/3 costs about 4.3bb an hour.`);
    // The 2/5 cap is smaller in big blinds.
    expect((LIVE25.rake.cap + LIVE25.rake.dropExtra) / LIVE25.stakes.bb).toBeLessThan((LIVE13.rake.cap + LIVE13.rake.dropExtra) / LIVE13.stakes.bb);
  });
});

describe('choosing a good table', () => {
  const key = 'results/win-rate/table-selection';

  it('shows the model edge of a 1400 player against three table averages', () => {
    const edges = [1200, 1350, 1500].map((pool) => r1(skillEdge(1400, { ...A13, poolRating: pool })));
    expect(bars(art(key, 'One player, three tables'))).toEqual(edges);
    expect(caption(key, 'One player, three tables')).toContain('Suited’s model');
  });

  it('compares a soft 1/3 game with a tougher 2/5 game after costs', () => {
    expect([A13.poolRating, A25.poolRating]).toEqual([1200, 1350]);
    const after13 = skillEdge(1400, A13) - COST13;
    const after25 = skillEdge(1400, A25) - COST25;
    const a = art(key, 'Moving up is not always a raise');
    expect(branch(a, 'Live 1/3, table average 1200')).toBe(`${signed1(after13)} bb/100 after costs`);
    expect(branch(a, 'Live 2/5, table average 1350')).toBe(`${signed1(after25)} bb/100 after costs`);
    const perHour = moneyPerHour(after13, LIVE_HPH, LIVE13.stakes.bb);
    expect(Math.floor(perHour)).toBe(8);
    expect(caption(key, 'Moving up is not always a raise')).toContain('about $8 an hour');
  });

  it('uses real seats', () => {
    for (const a of [lesson(key).cover, art(key, 'Choose your seat')]) {
      const t = pick(a, 'table');
      expect(t.hero).toBe('CO');
      // The highlighted player acts just before you: on your right.
      expect(t.highlight).toEqual(['HJ']);
    }
  });
});

describe('how rooms take rake', () => {
  const key = 'results/rake/how-rake-works';
  const rule = LIVE13.rake;

  it('draws the share of the pot the live 1/3 rule takes', () => {
    for (const a of [lesson(key).cover, art(key, 'Small pots pay the biggest share')]) {
      for (const [pot, share] of pick(a, 'curve').points) expect(share, `$${pot}`).toBe(pct1(rakeFor(pot, rule) / pot));
    }
    expect([rakeFor(20, rule), rakeFor(200, rule)]).toEqual([3, 6]);
  });

  it('takes $6 from a $60 pot, cap and drop included', () => {
    const a = art(key, 'Pot rake');
    expect(60 * rule.percent).toBeCloseTo(6, 10);
    expect(branch(a, '10% of the pot')).toBe(`$${60 * rule.percent}, cut to the $${rule.cap} cap`);
    expect(branch(a, 'Jackpot drop')).toBe(`$${rule.dropExtra}`);
    expect(branch(a, 'Rake taken')).toBe(`$${rakeFor(60, rule)}`);
  });

  it('lists the presets with the most a pot can pay', () => {
    const most = (g: typeof LIVE13) => g.rake.cap + g.rake.dropExtra;
    expect(tableRows(key, 'Suited’s presets').map((r) => r[2])).toEqual([
      `$${most(LIVE13)}, which is ${most(LIVE13) / LIVE13.stakes.bb}bb`,
      `$${most(LIVE25)}, which is ${most(LIVE25) / LIVE25.stakes.bb}bb`,
      `$${most(ONLINE).toFixed(2)}, which is ${most(ONLINE) / ONLINE.stakes.bb}bb`,
    ]);
    expect(bars(art(key, 'The most a pot pays'))).toEqual([LIVE13, LIVE25, ONLINE].map((g) => most(g) / g.stakes.bb));
    expect(ONLINE.rake.percent).toBe(LIVE13.rake.percent / 2);
    for (const g of [LIVE13, LIVE25, ONLINE]) expect(g.rake.noFlopNoDrop).toBe(true);
  });

  it('converts an example time fee into bb/100', () => {
    const perHour = 6 * 2;
    const a = art(key, 'Time collection in bb/100');
    expect(branch(a, 'Per hour')).toBe(`$${perHour}, which is ${moneyToBb(perHour, LIVE13.stakes)}bb`);
    expect(branch(a, 'At 27 hands an hour')).toBe(`${r1(bbPer100ForHourly(moneyToBb(perHour, LIVE13.stakes), LIVE_HPH))} bb/100`);
    expect(caption(key, 'Time collection in bb/100')).toContain('made up for the example');
  });

  it('answers its rake questions with the rules', () => {
    expect(answer(key, 'The rule is 10% up to $5, plus $1. How much rake does a $40 pot pay?')).toBe(`$${rakeFor(40, rule)}`);
    expect(rakeFor(60, rule, false)).toBe(0);
    expect(answer(key, 'The room uses no flop, no drop. You raise and everyone folds. How much rake is taken?')).toBe('Nothing');
    const potBb = 40;
    const rakeMoney = rakeFor(potBb * ONLINE.stakes.bb, ONLINE.rake);
    expect(rakeMoney).toBeCloseTo(1, 10);
    expect(answer(key, 'Online the rule is 5% up to $1.50 at $0.25/$0.50. A 40bb pot sees a flop. How much is the rake?')).toBe(
      `$${rakeMoney}, which is ${moneyToBb(rakeMoney, ONLINE.stakes)}bb`,
    );
    const shares = [20, 60, 200].map((p) => rakeFor(p, rule) / p);
    expect(shares.indexOf(Math.max(...shares))).toBe(0);
  });
});

describe('what rake costs you', () => {
  const key = 'results/rake/rake-cost';

  it('builds 12.9 bb/100 from the rake per hand', () => {
    expect(r2(C13.rakePerHand)).toBe(1.16);
    expect(r1((r2(C13.rakePerHand) * 100) / 9)).toBe(r1(C13.rakePer100));
    const f = step(key, 'Your share of the rake');
    expect(f.kind === 'formula' && f.example).toContain(`about ${r2(C13.rakePerHand)}bb a hand`);
    expect(f.kind === 'formula' && f.example).toContain(`**${r1(C13.rakePer100)} bb/100**`);
  });

  it('averages the rake over pot sizes instead of charging the average pot', () => {
    const flat = rakeFor(A13.flopPotBb * LIVE13.stakes.bb, LIVE13.rake, true);
    const avg = averageRake(A13.flopPotBb * LIVE13.stakes.bb, LIVE13.rake, true);
    expect(flat).toBe(6);
    expect(r2(avg)).toBe(4.37);
    const a = art(key, 'Where 1.16bb a hand comes from');
    expect(branch(a, '80% see a flop')).toBe(`Rake about $${r2(avg)} on average`);
    expect(branch(a, 'Per hand, whole table')).toBe(`About ${r2(C13.rakePerHand)}bb`);
    expect(A13.flopShare).toBe(0.8);
    // Pots with no flop pay nothing under this rule.
    expect(rakeFor(A13.noFlopPotBb * 3, LIVE13.rake, false)).toBe(0);
    expect(C13.rakePerHand).toBeCloseTo((A13.flopShare * avg) / LIVE13.stakes.bb, 10);
  });

  it('compares rake per 100 hands across presets', () => {
    const values = [C13, C25, CON].map((c) => r1(c.rakePer100));
    expect(values).toEqual([12.9, 9.2, 5.5]);
    for (const a of [lesson(key).cover, art(key, 'Rake per 100 hands by game')]) expect(bars(a)).toEqual(values);
    expect(answer(key, 'In Suited’s model, which game costs the most rake per 100 hands?')).toBe('Live $1/$3');
  });

  it('prices 4 pots at live 1/3', () => {
    const rows = tableRows(key, 'Rake on 4 pots at live $1/$3');
    [10, 20, 50, 100].forEach((bb, i) => {
      const pot = bb * 3;
      const rake = rakeFor(pot, LIVE13.rake);
      const inBb = Number((rake / 3).toFixed(2));
      expect(rows[i]).toEqual([`${bb}bb, $${pot}`, `$${rake}`, `${inBb}bb`, `${pct1(rake / pot)}%`]);
    });
    expect(text(key)).toContain(`Pots with a flop average ${A13.flopPotBb}bb there and ${A25.flopPotBb}bb at 2/5.`);
  });

  it('prices an hour of rake for the table and each player', () => {
    const tableBb = C13.rakePerHand * LIVE_HPH;
    expect(r1(tableBb)).toBe(31.4);
    expect(Math.round(tableBb * 3)).toBe(94);
    const each = moneyPerHour(C13.rakePer100, LIVE_HPH, 3);
    expect(Math.round(each * 10) / 10).toBe(10.5);
    const a = art(key, 'An hour of rake at live 1/3');
    expect(branch(a, 'The whole table pays')).toBe('About $94');
    expect(branch(a, 'Your share')).toBe('About $10.50');
  });

  it('answers its questions with the same arithmetic', () => {
    expect(answer(key, 'A 6-handed table pays 1.2bb of rake a hand. What does each player pay per 100 hands?')).toBe(`${(1.2 * 100) / 6} bb/100`);
    const q = quiz(key, 'A room charges $6 each half hour at $1/$3. You play 27 hands an hour. What is that in bb/100?');
    expect(q.choices[q.answer]).toBe(`About ${r1(bbPer100ForHourly(12 / 3, LIVE_HPH))} bb/100`);
    expect(q.choices).toContain(`About ${r1(bbPer100ForHourly(6 / 3, LIVE_HPH))} bb/100`);
    const most = (g: typeof LIVE13) => (g.rake.cap + g.rake.dropExtra) / g.stakes.bb;
    expect([most(LIVE13), most(LIVE25)]).toEqual([2, 1.4]);
    expect(LIVE13.rake.percent).toBe(LIVE25.rake.percent);
  });
});

describe('playing a raked game', () => {
  const key = 'results/rake/rake-strategy';
  const rule = LIVE13.rake;
  const share = (pot: number, sawFlop = true) => pct1(rakeFor(pot, rule, sawFlop) / pot);

  it('compares rake shares by pot type at live 1/3', () => {
    const limped = 5 * 3;
    const raised = 15 + 15 + 1 + 3;
    const threeBet = 45 + 45 + 1 + 3;
    const steal = 15 + 1 + 3;
    const values = [share(limped), share(raised), share(threeBet), share(steal, false)];
    expect(values).toEqual([16.7, 12.9, 6.4, 0]);
    for (const a of [lesson(key).cover, art(key, 'Rake as a share of the pot')]) {
      expect(bars(a)).toEqual(values);
      expect(pick(a, 'bars').bars.map((b) => b.label)).toEqual([`Limped 5 ways, $${limped}`, `Raised and called, $${raised}`, `3bet pot, $${threeBet}`, 'Raise wins before the flop']);
    }
    const q = quiz(key, 'At live $1/$3, 5 players each put in $3 and see a flop. What share of the $15 pot is rake?');
    expect(q.choices[q.answer]).toBe(`${share(limped)}%`);
    expect(q.choices).toContain(`${pct1(rule.dropExtra / limped)}%`);
  });

  it('points to a real chart and labels the strategy claims as solver directions', () => {
    const chart = lesson(key).steps.find((s) => s.kind === 'chart');
    expect(chart && chart.kind === 'chart' && STARTER_CHARTS.some((c) => c.id === chart.chartId)).toBe(true);
    const s = step(key, 'What raked strategies do');
    expect(s.kind === 'text' && s.evidence).toBe('solver');
    expect(LESSON_CONTENT.has('preflop/stack-depth/rake')).toBe(true);
  });
});

describe('how much results swing', () => {
  const key = 'results/variance/standard-deviation';

  it('uses the model’s SD for each preset', () => {
    expect([SD_ONLINE, SD_LIVE, A25.sd100]).toEqual([90, 120, 140]);
    expect(defaultAssumptions({ ...LIVE13, stakes: { ...LIVE13.stakes, bb: 10 } }).sd100).toBe(140);
    expect(bars(art(key, 'SD in Suited’s model'))).toEqual([SD_ONLINE, SD_LIVE, A25.sd100]);
  });

  it('states the 68% within 1 SD', () => {
    expect(Math.round((normalCdf(1) - normalCdf(-1)) * 100)).toBe(68);
    expect(answer(key, 'Your SD is 120 bb/100. About what share of 100 hand stretches land within 120bb of your win rate?')).toBe('About 68%');
  });

  it('compares the expected win with 1 SD of luck', () => {
    expect(resultsSpreadBb(10_000, SD_LIVE)).toBeCloseTo(1200, 10);
    expect(bars(art(key, 'Skill catches up slowly'))).toEqual([
      (WR * 10_000) / 100,
      Math.round(resultsSpreadBb(10_000, SD_LIVE)),
      (WR * 100_000) / 100,
      Math.round(resultsSpreadBb(100_000, SD_LIVE)),
    ]);
    const f = step(key, 'Swings grow slower than hands');
    expect(f.kind === 'formula' && f.example).toContain(`**${thousands(resultsSpreadBb(10_000, SD_LIVE))}bb**`);
    expect(answer(key, 'Your SD is 120 bb/100 over 10,000 hands. What is 1 SD of your total result?')).toBe('1,200bb');
    expect(resultsSpreadBb(40_000, SD_LIVE) / resultsSpreadBb(10_000, SD_LIVE)).toBeCloseTo(2, 10);
  });

  it('prices one live session of 5 hours', () => {
    const hands = 5 * LIVE_HPH;
    expect(hands).toBe(135);
    expect(Math.round(resultsSpreadBb(hands, SD_LIVE))).toBe(139);
    expect(text(key)).toContain('about 139bb');
  });

  it('draws 8 simulated players and says how many end behind', () => {
    const a = pick(lesson(key).cover, 'paths');
    expect(art(key, 'Eight players, one win rate')).toEqual(a);
    expect([a.winRate, a.sd100, a.hands, a.paths]).toEqual([WR, SD_LIVE, 10_000, 8]);
    const sim = simulateResults(a);
    const behind = sim.paths.filter((p) => p.at(-1)! < 0).length;
    expect(behind).toBe(2);
    const c = caption(key, 'Eight players, one win rate');
    expect(c).toContain(`${behind} of these 8 end behind`);
    expect(c).toContain(`about ${Math.round(10_000 / LIVE_HPH)} hours live`);
    // The band is the model's 95% range.
    expect(sim.high.at(-1)! - sim.expected.at(-1)!).toBeCloseTo(1.96 * resultsSpreadBb(10_000, SD_LIVE), 10);
  });
});

describe('how many hands you need', () => {
  const key = 'results/variance/sample-size';

  it('draws the 95% range with the app’s formula at live SD', () => {
    for (const a of [lesson(key).cover, art(key, 'The range shrinks slowly')]) {
      for (const [k, y] of pick(a, 'curve').points) expect(y, `${k}k`).toBe(r1(resultsHalfWidth(k * 1000, SD_LIVE)));
    }
    const f = step(key, 'The 95% range of your win rate');
    expect(f.kind === 'formula' && f.example).toContain(`**${r1(resultsHalfWidth(10_000, SD_LIVE))} bb/100**`);
    expect(answer(key, 'SD 120 bb/100 over 10,000 hands. How wide is the 95% range either side of your win rate?')).toBe(`${r1(resultsHalfWidth(10_000, SD_LIVE))} bb/100`);
  });

  it('puts a measured 15 bb/100 over 10,000 hands in its range', () => {
    const hw = resultsHalfWidth(10_000, SD_LIVE);
    const a = art(key, 'A winner, or not?');
    expect(branch(a, 'Low end of the range')).toBe(`${signed1(15 - hw)} bb/100`);
    expect(branch(a, 'High end of the range')).toBe(`${signed1(15 + hw)} bb/100`);
    expect(Math.round(10_000 / LIVE_HPH)).toBe(370);
  });

  it('counts the hands and hours to pin a win rate down', () => {
    const sig3 = (x: number) => Number(x.toPrecision(3));
    const row = (sd: number, hph: number, within: number) => {
      const hands = handsForPrecision(within, sd);
      return [thousands(Math.round(hands / 100) * 100), thousands(sig3(hands / hph))];
    };
    expect(tableRows(key, 'Hands to pin down a win rate').map((r) => r.slice(1))).toEqual([
      row(SD_LIVE, LIVE_HPH, 10),
      row(SD_LIVE, LIVE_HPH, 5),
      row(SD_ONLINE, ONLINE_HPH, 10),
      row(SD_ONLINE, ONLINE_HPH, 5),
    ]);
    // Suited treats results as mostly luck until the range is within 10 bb/100.
    expect(Math.round(handsForPrecision(10, SD_LIVE) / 1000)).toBe(55);
    expect(answer(key, 'About how many live hands at SD 120 pin your win rate within 10 bb/100?')).toBe('About 55,000');
  });

  it('gives the chance a real winner is behind, and the mindset lesson’s figure', () => {
    const p = chanceResultsBelow(WR, SD_LIVE, 10_000);
    expect(pick(art(key, 'A real winner, behind'), 'ring').value).toBe(Number(p.toFixed(3)));
    expect(caption(key, 'A real winner, behind')).toContain(`${pct1(p)}%`);
    expect(pct1(chanceResultsBelow(WR, 100, 10_000))).toBe(15.9);
    expect(JSON.stringify(LESSON_CONTENT.get('mindset/mental/variance'))).toContain('15.9%');
  });
});

describe('downswings', () => {
  const key = 'results/variance/downswings';

  it('draws five winners and checks the caption against the paths', () => {
    const a = pick(lesson(key).cover, 'paths');
    expect(art(key, 'Five winners, 50,000 hands')).toEqual(a);
    expect([a.winRate, a.sd100, a.hands, a.paths]).toEqual([WR, SD_LIVE, 50_000, 5]);
    const sim = simulateResults(a);
    expect(sim.paths.every((p) => p.at(-1)! > 0)).toBe(true);
    expect(sim.paths.filter((p) => deepestDrop(p) >= 1500).length).toBe(4);
    const c = caption(key, 'Five winners, 50,000 hands');
    expect(c).toContain('All 5 end ahead. 4 of them still fell 15 buy ins below a peak');
    expect(c).toContain(`about ${thousands(Math.round(50_000 / LIVE_HPH / 50) * 50)} hours live`);
  });

  it('simulates the chance of a downswing within 10,000 hands', () => {
    const chance = (buyIns: number, seed = 3) =>
      simulatedDownswingChance({ winRate: WR, sd100: SD_LIVE, depthBb: buyIns * 100, hands: 10_000, trials: 4000, seed });
    const values = [5, 10, 15].map((b) => Math.round(chance(b) * 100));
    expect(bars(art(key, 'Downswings in 10,000 hands'))).toEqual(values);
    // Another seed lands within 2 points, so the bars are not a lucky draw.
    for (const b of [5, 10, 15]) expect(Math.abs(chance(b, 99) * 100 - values[[5, 10, 15].indexOf(b)])).toBeLessThan(2.5);
    expect(caption(key, 'Downswings in 10,000 hands')).toContain('4,000 simulated winners');
    expect(quiz(key, 'You lose 10 buy ins over 8,000 hands. What does that prove?').explain).toContain(`${values[1]}% of 10 bb/100 winners`);
  }, 30_000);

  it('counts the hands and hours to climb back', () => {
    expect(handsToRecover(1000, WR)).toBe(10_000);
    expect(bars(art(key, 'Hours to climb back'))).toEqual([5, 10, 15].map((b) => Math.round(handsToRecover(b * 100, WR) / LIVE_HPH)));
    expect(handsToRecover(500, 5)).toBe(2 * handsToRecover(500, 10));
    expect(answer(key, 'At a true 10 bb/100, how many hands does it take on average to win back 1,000bb?')).toBe(thousands(handsToRecover(1000, WR)));
  });

  it('says how far below the peak a winner sits over a long run', () => {
    const share = shareOfTimeBelowPeak(WR, SD_LIVE, 1000);
    expect(pick(art(key, 'How far below your best'), 'ring').value).toBe(Number(share.toFixed(3)));
    expect(caption(key, 'How far below your best')).toContain(`${pct1(share)}% of the time`);
    expect(caption(key, 'How far below your best')).toContain(`${averageDepthBelowPeak(WR, SD_LIVE) / 100} buy ins below it`);
    expect(Math.round(share * 100)).toBe(25);
  });
});

describe('risk of ruin', () => {
  const key = 'results/variance/risk-of-ruin';
  const ror = (wr: number, buyIns: number, sd = SD_LIVE) => riskOfRuin(wr, sd, buyIns * 100);

  it('draws risk of ruin at live SD', () => {
    for (const a of [lesson(key).cover, art(key, 'More buy ins, less risk')]) {
      for (const [b, y] of pick(a, 'curve').points) expect(y, `${b} buy ins`).toBe(pct1(ror(WR, b)));
    }
    const f = step(key, 'Risk of ruin');
    expect(r2((2 * WR * 2000) / SD_LIVE ** 2)).toBe(2.78);
    expect(f.kind === 'formula' && f.example).toContain(`**${pct1(ror(WR, 20))}%**`);
    // The bankroll lesson's SD 100 figure.
    expect(pct1(ror(WR, 20, 100))).toBe(1.8);
    expect(JSON.stringify(LESSON_CONTENT.get('mindset/mental/bankroll'))).toContain('1.8%');
  });

  it('shows what each input does', () => {
    expect(ror(2 * WR, 10)).toBeCloseTo(ror(WR, 20), 12);
    expect(ror(WR, 20)).toBeCloseTo(ror(WR, 10) ** 2, 12);
    expect(riskOfRuin(WR, 240, 4 * 2000)).toBeCloseTo(riskOfRuin(WR, 120, 2000), 12);
    expect(ror(0, 1000)).toBe(1);
    expect(bars(art(key, 'Win rate matters as much as the roll'))).toEqual([10, 5, 2.5].map((wr) => pct1(ror(wr, 20))));
    expect(pct1(ror(WR, 10) ** 2)).toBe(pct1(ror(WR, 20)));
  });

  it('draws losing players and checks the caption', () => {
    const a = pick(art(key, 'A losing player over time'), 'paths');
    expect(a.winRate).toBeLessThan(0);
    const sim = simulateResults(a);
    expect(sim.paths.every((p) => p.at(-1)! < 0)).toBe(true);
    expect(sim.paths.filter((p) => Math.max(...p) >= 1300).length).toBe(3);
    expect(caption(key, 'A losing player over time')).toContain('3 of them were up 13 buy ins or more at some point. All 5 end behind.');
  });

  it('answers its questions with the formula', () => {
    expect(answer(key, 'Your true win rate is 0 bb/100. What is your risk of ruin in the long run?')).toBe(`${ror(0, 20) * 100}%`);
    const q = quiz(key, 'WR 10 bb/100, SD 120 and 20 buy ins of 100bb. What is the risk of ruin?');
    expect(q.choices[q.answer]).toBe(`${pct1(ror(WR, 20))}%`);
    expect(q.choices).toContain(`${pct1(ror(WR, 20, 100))}%`);
    expect(q.choices).toContain(`${pct1(ror(WR, 10))}%`);
    expect(riskOfRuin(WR, 120, 4 * 1000)).toBeCloseTo(riskOfRuin(WR, 60, 1000), 12);
  });
});

describe('luck and skill', () => {
  const key = 'results/variance/luck-vs-skill';

  it('computes the all in equity exactly and its EV', () => {
    const hand = step(key, 'You get it all in');
    expect(hand.kind).toBe('hand');
    if (hand.kind !== 'hand') return;
    const eq = exactEquity(parseCards(hand.cards) as [Card, Card], parseCards('AhKh') as [Card, Card], parseCards(hand.board!));
    expect(eq.exact).toBe(true);
    expect(pct1(eq.equity)).toBe(75.4);
    expect(hand.caption).toContain(`${pct1(eq.equity)}% to win`);
    const ev = eq.equity * 200 - 100;
    expect(r1(ev)).toBe(50.7);
    expect(Number(eq.equity.toFixed(4)) * 200 - 100).toBeCloseTo(50.7, 10);
    for (const a of [lesson(key).cover, art(key, 'Two results, one decision')]) expect(bars(a)).toEqual([100, -100, r1(ev)]);
    const f = step(key, 'All in EV');
    expect(f.kind === 'formula' && f.example).toContain(`${eq.equity.toFixed(4)} × 200 − 100 = **+${r1(ev)}bb**`);
  });

  it('answers the EV question exactly', () => {
    expect(answer(key, 'You put in 50bb with 60% equity. The final pot is 100bb. What is your all in EV?')).toBe(`+${0.6 * 100 - 50}bb`);
  });

  it('draws players with no edge, two of them up about 20 buy ins', () => {
    const a = pick(art(key, 'No edge, big winners'), 'paths');
    expect(a.winRate).toBe(0);
    const ends = simulateResults(a).paths.map((p) => p.at(-1)! / 100);
    const big = ends.filter((e) => Math.abs(e - 20) < 1);
    expect(big).toHaveLength(2);
    expect(Math.max(...ends)).toBeLessThan(21);
    expect(caption(key, 'No edge, big winners')).toContain('2 of them are up about 20 buy ins');
  });
});

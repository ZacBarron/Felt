import {
  ALL_HAND_CLASSES,
  bbToMoney,
  betEV,
  callEV,
  categoryOf,
  equityVsRange,
  evaluate,
  HandCategory,
  optimalBluffShare,
  parseCards,
  potOdds,
  rankIndex,
  rangeToCombos,
  remainingDeck,
  seededRng,
  suitIndex,
  type Card,
} from '@felt/core';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, LESSON_CONTENT, type LessonArt, type LessonContent, type LessonStep } from '../src';

/**
 * The second round of curriculum gaps: side pots, the nuts, pot control,
 * poker face, trusting tells, bounties, satellites and stop rules. Every
 * pot, price and ICM value is recomputed with @felt/core, and every hand
 * claim is checked with the evaluator by enumerating the possible hands.
 */

const NEW = {
  'basics/rules/side-pots': 'All in and side pots',
  'basics/first-strategy/the-nuts': 'Reading the board: the nuts',
  'postflop/later-streets/pot-control': 'Showdown value and pot control',
  'exploit/tells/poker-face': 'Your poker face',
  'exploit/tells/using-tells': 'How much to trust a tell',
  'mindset/mental/stop-rules': 'Knowing when to stop',
  'tournaments/mtt-basics/bounties': 'Bounty tournaments',
  'tournaments/mtt-basics/satellites': 'Satellites',
};
const KEYS = Object.keys(NEW) as (keyof typeof NEW)[];

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
  if (s.kind === 'visual' || s.kind === 'hand' || s.kind === 'board') return s.caption;
  throw new Error(`${key}: "${title}" has no caption`);
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
const pct = (x: number) => r1(x * 100);
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

/* Cards ------------------------------------------------------------------- */

const cards = (s: string) => parseCards(s);
const score = (s: string) => evaluate(cards(s));
const category = (s: string) => categoryOf(score(s));
/** Every two card hand that fits with the board and any other dead cards. */
function holdings(board: string, dead = ''): [Card, Card][] {
  const live = remainingDeck(cards(board + dead));
  const out: [Card, Card][] = [];
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) out.push([live[i], live[j]]);
  return out;
}
/** The nut hands on a board: every holding that ties the best possible score. */
function nuts(board: string): { holdings: [Card, Card][]; score: number } {
  const b = cards(board);
  let best = -1;
  let top: [Card, Card][] = [];
  for (const h of holdings(board)) {
    const s = evaluate([...h, ...b]);
    if (s > best) {
      best = s;
      top = [h];
    } else if (s === best) top.push(h);
  }
  return { holdings: top, score: best };
}
const rankChars = (h: readonly Card[]) => h.map((c) => '23456789TJQKA'[rankIndex(c)]).sort().join('');

/* ICM --------------------------------------------------------------------- */

/** Malmuth-Harville ICM, as in gaps.test.ts: each finishing order weighted by stack shares. */
function icm(stacks: number[], payouts: number[]): number[] {
  const money = stacks.map(() => 0);
  const walk = (left: number[], place: number, p: number) => {
    if (place >= payouts.length) return;
    const total = left.reduce((s, i) => s + stacks[i], 0);
    for (const i of left) {
      const q = (p * stacks[i]) / total;
      money[i] += q * payouts[place];
      walk(
        left.filter((j) => j !== i),
        place + 1,
        q,
      );
    }
  };
  walk(
    stacks.flatMap((s, i) => (s > 0 ? [i] : [])),
    0,
    1,
  );
  return money;
}

/** Caller's $EV after folding, winning and losing an all in against the shover, blinds ignored. */
function allIn(stacks: number[], payouts: number[], shover: number, caller: number) {
  const risk = Math.min(stacks[shover], stacks[caller]);
  const after = (delta: number) => stacks.map((s, i) => (i === caller ? s + delta : i === shover ? s - delta : s));
  const value = (st: number[]) => {
    const alive = st.filter((s) => s > 0).length;
    if (st[caller] === 0) return payouts[alive] ?? 0;
    return icm(st, payouts.slice(0, alive))[caller];
  };
  const fold = icm(stacks, payouts)[caller];
  const win = value(after(risk));
  const lose = value(after(-risk));
  return { fold, win, lose, need: (fold - lose) / (win - lose) };
}

/* Shape and voice --------------------------------------------------------- */

describe('gap lessons: shape', () => {
  it('sit at the end of their topics with the right titles', () => {
    for (const key of KEYS) {
      const [t, m, id] = key.split('/');
      const mod = CURRICULUM.find((x) => x.id === t)!.modules.find((x) => x.id === m)!;
      const entry = mod.lessons.find((l) => l.id === id);
      expect(entry?.title, key).toBe(NEW[key]);
    }
    // Appended after the lessons that were already there.
    const ids = (t: string, m: string) => CURRICULUM.find((x) => x.id === t)!.modules.find((x) => x.id === m)!.lessons.map((l) => l.id);
    expect(ids('basics', 'rules').indexOf('side-pots')).toBeGreaterThan(ids('basics', 'rules').indexOf('table-rules'));
    expect(ids('exploit', 'tells').slice(0, 3)).toEqual(['bet-patterns', 'physical', 'own-image']);
    expect(ids('tournaments', 'mtt-basics').slice(0, 6)).toEqual(['antes', 'push-fold', 'reshoves', 'icm', 'bubble', 'final-table']);
  });

  it('teach with at least 3 pictures, ask at least 2 questions and end on a takeaway', () => {
    for (const key of KEYS) {
      const l = lesson(key);
      const pictures = l.steps.filter((s) => ['visual', 'hand', 'board', 'chart'].includes(s.kind)).length;
      expect(pictures, key).toBeGreaterThanOrEqual(3);
      expect(l.steps.filter((s) => s.kind === 'quiz').length, key).toBeGreaterThanOrEqual(2);
      expect(l.steps[0].kind, key).toBe('intro');
      expect(l.steps.at(-1)?.kind, key).toBe('takeaway');
    }
  });

  it('never put two text steps in a row', () => {
    const textOnly = new Set(['intro', 'text', 'callout']);
    for (const key of KEYS) {
      const steps = lesson(key).steps;
      for (let i = 1; i < steps.length; i++) expect(textOnly.has(steps[i].kind) && textOnly.has(steps[i - 1].kind), `${key} step ${i}`).toBe(false);
    }
  });

  it('follow the voice rules: one comma per sentence, short sentences, no semicolons or dashes', () => {
    for (const key of KEYS) {
      for (const s of strings(lesson(key))) {
        expect(s, key).not.toMatch(/[;–—]/);
        for (const sentence of s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/)) {
          expect((sentence.match(/,/g) ?? []).length, `${key}: ${sentence}`).toBeLessThanOrEqual(1);
          expect(sentence.split(/\s+/).length, `${key}: ${sentence}`).toBeLessThan(20);
        }
      }
    }
  });

  it('never send the player to outside material', () => {
    for (const key of KEYS) expect(text(key), key).not.toMatch(/\b(books?|websites?|www|https?|podcasts?|forums?|hotlines?|helplines?|apps? store)\b/i);
  });

  it('show only real cards, never repeated within a picture or question', () => {
    for (const key of KEYS) {
      const l = lesson(key);
      for (const a of [l.cover, ...l.steps.flatMap((s) => (s.kind === 'visual' ? [s.art] : []))]) {
        if (a.kind !== 'cards') continue;
        const all = cards(a.cards + (a.board ?? ''));
        expect(new Set(all).size, key).toBe(all.length);
      }
      for (const s of l.steps) {
        if (s.kind === 'hand') expect(new Set(cards(s.cards + (s.board ?? ''))).size).toBe(cards(s.cards + (s.board ?? '')).length);
        if (s.kind === 'quiz' && s.choiceCards) for (const c of s.choiceCards) expect(new Set(cards(c + (s.board ?? ''))).size).toBe(cards(c + (s.board ?? '')).length);
      }
    }
  });
});

/* Side pots ---------------------------------------------------------------- */

/** Pots from all in stacks: each layer up to the next stack, with who can win it, and the uncalled rest. */
function pots(stacks: number[]) {
  const levels = [...new Set(stacks)].sort((a, b) => a - b);
  const out: { amount: number; eligible: number[] }[] = [];
  let prev = 0;
  for (const level of levels) {
    const eligible = stacks.flatMap((s, i) => (s >= level ? [i] : []));
    if (eligible.length < 2) break;
    out.push({ amount: (level - prev) * eligible.length, eligible });
    prev = level;
  }
  const returned = Math.max(...stacks) - prev;
  return { pots: out, returned };
}

describe('all in and side pots', () => {
  const key = 'basics/rules/side-pots';
  const stacks = [20, 50, 100];

  it('splits 20, 50 and 100bb into a 60bb main pot, a 60bb side pot and 50bb back', () => {
    expect(pick(lesson(key).cover, 'chips').stacks.map((s) => s.bb)).toEqual(stacks);
    expect(pick(art(key, 'Three stacks, all in'), 'chips').stacks.map((s) => s.bb)).toEqual(stacks);
    const p = pots(stacks);
    expect(p.pots).toEqual([
      { amount: 60, eligible: [0, 1, 2] },
      { amount: 60, eligible: [1, 2] },
    ]);
    expect(p.returned).toBe(50);
    expect(bars(art(key, 'Main pot and side pot'))).toEqual([p.pots[0].amount, p.pots[1].amount, p.returned]);
    // A can win only the main pot. B and C can win both.
    expect(p.pots[0].amount).toBe(60);
    expect(p.pots[0].amount + p.pots[1].amount).toBe(120);
  });

  it('shows down aces over kings over queens, so A takes the main pot and B the side pot', () => {
    const s = step(key, 'The showdown');
    if (s.kind !== 'hand') throw new Error('expected a hand');
    const board = s.board!;
    const [a, b, c] = [s.cards, 'KsKh', 'QdQc'].map((h) => score(h + board));
    const all = cards(s.cards + 'KsKhQdQc' + board);
    expect(new Set(all).size).toBe(11);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    for (const h of [s.cards, 'KsKh', 'QdQc']) expect(category(h + board)).toBe(HandCategory.Pair);
  });

  it('answers its pot questions with the same layering', () => {
    // C best and A beats B: C wins both pots.
    expect(answer(key, 'A is all in for 20bb. At showdown C has the best hand and A beats B. Who wins the side pot?')).toBe('C');
    const p = pots([25, 80, 80]);
    expect(p.pots.map((x) => x.amount)).toEqual([75, 110]);
    expect(p.returned).toBe(0);
    const q = quiz(key, 'A is all in for 25bb. B and C have 80bb each and get all in too. How big is the side pot?');
    expect(q.choices[q.answer]).toBe(`${p.pots[1].amount}bb`);
    expect(q.choices).toContain(`${p.pots[0].amount + p.pots[1].amount}bb`);
    expect(pots([30, 60, 90]).pots[0].amount).toBe(90);
    expect(answer(key, 'You are all in for 30bb. Two players with bigger stacks call. What is the most you can win?')).toBe('90bb');
  });
});

/* The nuts ------------------------------------------------------------------ */

describe('reading the board: the nuts', () => {
  const key = 'basics/first-strategy/the-nuts';

  it('finds three kings as the nuts on K♠9♦4♣', () => {
    const board = pick(art(key, 'A dry flop'), 'cards').board!;
    const n = nuts(board);
    expect(categoryOf(n.score)).toBe(HandCategory.Trips);
    expect(n.holdings.length).toBe(3);
    for (const h of n.holdings) expect(rankChars(h)).toBe('KK');
    // No flush or straight is possible: no hand at all makes one.
    for (const h of holdings(board)) expect(categoryOf(evaluate([...h, ...cards(board)]))).not.toBe(HandCategory.Straight);
  });

  it('makes QJ the nuts once the T♠ lands', () => {
    const board = pick(art(key, 'The turn adds a straight'), 'cards').board!;
    const n = nuts(board);
    expect(categoryOf(n.score)).toBe(HandCategory.Straight);
    expect(n.holdings.length).toBe(16);
    for (const h of n.holdings) expect(rankChars(h)).toBe('JQ');
    expect(score('KhKd' + board)).toBeLessThan(n.score);
  });

  it('makes 9♣9♠ the only nut hand once the board pairs', () => {
    const a = pick(art(key, 'A paired river'), 'cards');
    const n = nuts(a.board!);
    expect(categoryOf(n.score)).toBe(HandCategory.Quads);
    expect(n.holdings.map((h) => h.slice().sort((x, y) => x - y))).toEqual([cards('9c9s').sort((x, y) => x - y)]);
    expect(score(a.cards + a.board)).toBe(n.score);
    expect(pick(lesson(key).cover, 'cards')).toEqual(a);
  });

  it('two pair with A♥K♦ loses to any 9, any QJ and K9', () => {
    const s = step(key, 'Strong hand, weak spot');
    if (s.kind !== 'hand') throw new Error('expected a hand');
    const board = s.board!;
    const hero = score(s.cards + board);
    expect(categoryOf(hero)).toBe(HandCategory.TwoPair);
    const villain = holdings(board, s.cards);
    const beats = (h: [Card, Card]) => evaluate([...h, ...cards(board)]) > hero;
    const nines = villain.filter((h) => h.some((c) => rankChars([c]) === '9'));
    expect(nines.length).toBeGreaterThan(0);
    expect(nines.every(beats)).toBe(true);
    const qj = villain.filter((h) => rankChars(h) === 'JQ');
    expect(qj).toHaveLength(16);
    expect(qj.every(beats)).toBe(true);
    const k9 = villain.filter((h) => rankChars(h) === '9K');
    expect(k9.length).toBeGreaterThan(0);
    for (const h of k9) expect(categoryOf(evaluate([...h, ...cards(board)]))).toBe(HandCategory.FullHouse);
  });

  it('top pair loses to every heart on a 4 heart board', () => {
    const q = quiz(key, 'The board has 4 hearts. You hold top pair with an ace kicker. How strong is it?');
    const hero = score(q.cards! + q.board);
    expect(categoryOf(hero)).toBe(HandCategory.Pair);
    expect(cards(q.board!).filter((c) => suitIndex(c) === suitIndex(cards('2h')[0]))).toHaveLength(4);
    const hearts = holdings(q.board!, q.cards).filter((h) => h.some((c) => suitIndex(c) === suitIndex(cards('2h')[0])));
    for (const h of hearts) {
      const v = evaluate([...h, ...cards(q.board!)]);
      expect(categoryOf(v)).toBeGreaterThanOrEqual(HandCategory.Flush);
      expect(v).toBeGreaterThan(hero);
    }
    expect(q.choices[q.answer]).toBe('Weak, since any heart makes a flush');
  });

  it('a paired board allows full houses and four of a kind', () => {
    const q = quiz(key, 'The river pairs the board. What becomes possible?');
    const made = new Set(holdings(q.board!).map((h) => categoryOf(evaluate([...h, ...cards(q.board!)]))));
    expect(made.has(HandCategory.FullHouse)).toBe(true);
    expect(made.has(HandCategory.Quads)).toBe(true);
    expect(made.has(HandCategory.Flush)).toBe(false);
    expect(q.choices[q.answer]).toBe('Full houses and four of a kind');
  });

  it('T9 is the nuts on Q♥J♦8♣4♠2♥ and the other choices are not', () => {
    const q = quiz(key, 'Which hand is the nuts on this board?');
    const n = nuts(q.board!);
    expect(categoryOf(n.score)).toBe(HandCategory.Straight);
    expect(n.holdings.every((h) => rankChars(h) === '9T')).toBe(true);
    expect(n.holdings).toHaveLength(16);
    q.choiceCards!.forEach((c, i) => expect(score(c + q.board) === n.score, c).toBe(i === q.answer));
    expect(category(q.choiceCards![0] + q.board)).toBe(HandCategory.Trips);
  });
});

/* Pot control --------------------------------------------------------------- */

describe('showdown value and pot control', () => {
  const key = 'postflop/later-streets/pot-control';

  it('holds second pair on K♣9♦5♠2♥', () => {
    const s = step(key, 'Second pair on the turn');
    if (s.kind !== 'hand') throw new Error('expected a hand');
    expect(category(s.cards + s.board)).toBe(HandCategory.Pair);
    const board = cards(s.board!).map(rankIndex).sort((a, b) => b - a);
    expect(cards(s.cards).map(rankIndex)).toContain(board[1]);
  });

  it('checking earns 12bb and betting 8bb in the model', () => {
    const check = 0.6 * 20;
    const bet = betEV(20, 10, 0.6, 0);
    expect([check, bet]).toEqual([12, 8]);
    expect(bars(art(key, 'Check or bet, in a simple model'))).toEqual([check, bet]);
    expect(check - bet).toBe(4);
    expect(caption(key, 'Check or bet, in a simple model')).toContain('This is a simple model');
    expect(answer(key, 'The river pot is 20bb. You bet 10bb with a medium hand. Worse hands fold and better hands call. You are behind 40% of the time. How does betting compare with checking?')).toBe(
      `It earns ${check - bet}bb less`,
    );
  });

  it('two called 75% bets grow a 10bb pot to 62.5bb, one to 25bb', () => {
    const grow = (pot: number, bets: number): number => (bets === 0 ? pot : grow(pot + 2 * 0.75 * pot, bets - 1));
    expect(bars(art(key, 'One check keeps the pot small'))).toEqual([grow(10, 2), grow(10, 1)]);
    expect([grow(10, 2), grow(10, 1)]).toEqual([62.5, 25]);
  });

  it('sorts the river hands into value, showdown value and nothing', () => {
    const q = quiz(key, 'On this river, which hand has showdown value but gains little by betting?');
    const [top, second, air] = q.choiceCards!.map((c) => c + q.board);
    expect([category(top), category(second), category(air)]).toEqual([HandCategory.Pair, HandCategory.Pair, HandCategory.HighCard]);
    // K♠Q♠ pairs the top card. 9♥8♥ pairs the second card.
    expect(score(top)).toBeGreaterThan(score(second));
    expect(q.answer).toBe(1);
  });
});

/* Poker face and tells -------------------------------------------------------- */

describe('your poker face', () => {
  const key = 'exploit/tells/poker-face';

  it('a 75% pot river bet with 30% bluffs leaves a bluff catcher indifferent', () => {
    expect(optimalBluffShare(1, 0.75)).toBeCloseTo(0.3, 12);
    expect(pick(art(key, 'What balance looks like'), 'ring').value).toBeCloseTo(optimalBluffShare(1, 0.75), 12);
    expect(callEV(1.75, 0.75, 0.3)).toBeCloseTo(0, 12);
    const [v, b] = bars(art(key, 'Size by the spot, not by your hand'));
    expect(v).toBe(b);
  });
});

describe('how much to trust a tell', () => {
  const key = 'exploit/tells/using-tells';
  const need = potOdds(30 + 15, 15);

  it('prices a 15bb river bet into 30bb at 25%', () => {
    expect(need).toBe(0.25);
    const f = step(key, 'Start with the price');
    expect(f.kind === 'formula' && f.example).toContain('**25%**');
  });

  it('a 5 point shift flips 23% to 28% but not 10% to 15%', () => {
    const close = bars(art(key, 'A close call can flip'));
    expect(close).toEqual([pct(need), 23, 28]);
    expect(bars(lesson(key).cover)).toEqual(close);
    expect(callEV(45, 15, 0.23)).toBeCloseTo(-1.2, 12);
    expect(callEV(45, 15, 0.28)).toBeCloseTo(1.8, 12);
    expect(caption(key, 'A close call can flip')).toContain('**1.2bb**');
    expect(caption(key, 'A close call can flip')).toContain('**1.8bb**');
    expect(caption(key, 'A close call can flip')).toContain('only an example');
    const clear = bars(art(key, 'A clear fold stays a fold'));
    expect(clear).toEqual([pct(need), 10, 15]);
    expect(callEV(45, 15, 0.1)).toBeCloseTo(-9, 12);
    expect(callEV(45, 15, 0.15)).toBeCloseTo(-6, 12);
    expect(caption(key, 'A clear fold stays a fold')).toContain('**9bb**');
    expect(caption(key, 'A clear fold stays a fold')).toContain('**6bb**');
    expect(pct(need) - 10).toBe(15);
    expect(answer(key, 'You need 25% equity to call. You estimate 10%. Villain shows a weak tell. What is the play?')).toContain('15 point gap');
  });
});

/* Tournaments ---------------------------------------------------------------- */

describe('bounty tournaments', () => {
  const key = 'tournaments/mtt-basics/bounties';
  // Button shoves 20bb. SB 0.5bb, BB 1bb and a 1bb ante are in. The BB calls 19bb more.
  const pot = 20 + 0.5 + 1 + 1;
  const call = 19;
  const need = (bounty: number) => pct(potOdds(pot + bounty, call));

  it('prices the call at 45.8% with no bounty and 36.9% with a 10bb bounty', () => {
    expect(pot).toBe(22.5);
    expect(pot + call).toBe(41.5);
    expect([need(0), need(10)]).toEqual([45.8, 36.9]);
    expect(bars(lesson(key).cover)).toEqual([need(0), need(10)]);
    expect(bars(art(key, 'The bounty lowers the price'))).toEqual([need(0), need(10)]);
    expect(r1((potOdds(pot, call) - potOdds(pot + 10, call)) * 100)).toBe(8.9);
    const f = step(key, 'Add the bounty to what you win');
    expect(f.kind === 'formula' && f.example).toContain('19 ÷ 41.5 = **45.8%**');
    expect(f.kind === 'formula' && f.example).toContain('19 ÷ 51.5 = **36.9%**');
  });

  it('draws the price for bounties from 0 to 20bb', () => {
    const c = pick(art(key, 'Bigger bounty, cheaper call'), 'curve');
    expect(c.points).toEqual([0, 5, 10, 15, 20].map((b) => [b, need(b)]));
    expect(c.mark).toEqual([10, need(10)]);
  });

  it('values a $50 bounty at 20,000 chips, or 10bb at a 2,000 big blind', () => {
    const chipsPerDollar = 20_000 / 50;
    expect((50 * chipsPerDollar) / 2_000).toBe(10);
    // The same bounty after the big blind doubles.
    expect((50 * chipsPerDollar) / 4_000).toBe(5);
    expect(answer(key, 'A bounty is worth 20,000 chips. That was 10bb at a 2,000 big blind. The big blind rises to 4,000. What is it worth now?')).toBe('5bb');
    expect(text(key)).toContain('Treat this as a model');
  });

  it('answers with the bounty added to the pot, and only when you cover', () => {
    const q = quiz(key, 'You cover a shove. You call 19bb into a final pot of 41.5bb. The bounty is worth 10bb. What equity do you need?');
    expect(q.choices[q.answer]).toBe(`${need(10)}%`);
    expect(q.choices).toContain(`${need(0)}%`);
    expect(q.choices).toContain(`${pct((call - 10) / (pot + call))}%`);
    // With 15bb against 25bb, villain keeps 10bb after losing all you can win.
    expect(25 - 15).toBe(10);
    expect(pick(art(key, 'You cover this shove'), 'chips').stacks.map((s) => s.bb)).toEqual([40, 20]);
  });
});

describe('satellites', () => {
  const key = 'tournaments/mtt-basics/satellites';
  const stacks = [40, 30, 20, 7, 3];
  const pay = [1000, 1000, 1000, 1000];
  const money = icm(stacks, pay);
  const dollars = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

  it('pays 4 equal seats and nothing for 5th', () => {
    const curve = pick(lesson(key).cover, 'curve');
    expect(curve.points).toEqual([...pay, 0].map((p, i) => [i + 1, p]));
    expect(pick(art(key, 'A flat payout'), 'curve').points).toEqual(curve.points);
  });

  it('values each stack with ICM against its share of the chips', () => {
    expect(money.reduce((a, b) => a + b)).toBeCloseTo(4000, 9);
    const t = step(key, 'Five stacks, four seats');
    if (t.kind !== 'table') throw new Error('expected a table');
    expect(t.rows).toEqual(stacks.map((s, i) => [`${s}bb`, dollars((s / 100) * 4000), dollars(money[i])]));
    expect(bars(art(key, 'Chips against seats'))).toEqual([1600, Math.round(money[0]), 120, Math.round(money[4])]);
    expect(Math.round(money[0])).toBe(989);
    expect(Math.round(money[4])).toBe(343);
    // No stack is worth more than one seat.
    for (const m of money) expect(m).toBeLessThan(1000);
    expect(caption(key, 'Chips against seats')).toContain('about $989');
  });

  it('prices the calls: 95.8% for 20bb against 30bb, 52.9% for the leader against 3bb', () => {
    const mid = allIn(stacks, pay, 1, 2);
    const leader = allIn(stacks, pay, 4, 0);
    expect(mid.lose).toBe(0);
    expect(mid.win).toBeLessThan(1000);
    expect([pct(mid.need), pct(leader.need)]).toEqual([95.8, 52.9]);
    expect(bars(art(key, 'What it takes to call'))).toEqual([50, pct(mid.need), pct(leader.need)]);
    // Chip math with no dead money: risk x to win x.
    expect(potOdds(20, 20)).toBe(0.5);
    expect(pct(money[2] / 1000)).toBe(95.1);
    expect(text(key)).toContain('95.1% chance');
    expect(caption(key, 'Folding aces')).toContain('**95.8%**');
    expect(answer(key, 'You have 20bb and a seat is close. The 30bb stack shoves. What does the model say about aces?')).toContain('95.8%');
  });

  it('aces win about 85% against a random hand', () => {
    const hero = cards('AsAd') as [Card, Card];
    const random = rangeToCombos(new Map(ALL_HAND_CLASSES.map((h) => [h, 1])), hero);
    const eq = equityVsRange(hero, random, [], { iterations: 200_000, rng: seededRng(11) }).equity;
    expect(Math.abs(eq - 0.852)).toBeLessThan(0.005);
    expect(Math.round(eq * 100)).toBe(85);
    expect(caption(key, 'Folding aces')).toContain('**85%**');
  }, 60_000);
});

/* Stop rules ----------------------------------------------------------------- */

describe('knowing when to stop', () => {
  const key = 'mindset/mental/stop-rules';

  it('prices a 100bb buy in at 1/3 and 2/5', () => {
    const buyIns = [bbToMoney(100, { sb: 1, bb: 3, currency: 'USD' }), bbToMoney(100, { sb: 2, bb: 5, currency: 'USD' })];
    expect(buyIns).toEqual([300, 500]);
    expect(bars(art(key, 'Chasing raises the stakes'))).toEqual(buyIns);
    expect(caption(key, 'Chasing raises the stakes')).toContain('$300 at 1/3');
    expect(caption(key, 'Chasing raises the stakes')).toContain('it is $500');
  });

  it('labels its limits as examples and points to people, not outside material', () => {
    expect(caption(key, 'Set 3 stop rules before you play')).toContain('These are examples, not rules.');
    // The same example loss limit as the tilt lesson.
    expect(JSON.stringify(LESSON_CONTENT.get('mindset/mental/tilt'))).toContain('3 buy ins');
    expect(text(key)).toContain('someone you trust');
    expect(text(key)).toContain('professional');
  });
});

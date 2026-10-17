import { act, type HandState, legalActions, type PlayAction, seededRng, startHand } from '@felt/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { coachAdvice, gradeHand, HERO, type PlayGrade, withoutHinted } from '../src/state/play';
import { simpleSize, situationLine, sizeOptions } from '../src/state/playActions';
import { applyAction, botAction, dealNext, liveRng, markHinted, seatsOf } from '../src/state/playFlow';
import {
  DEFAULT_SETTINGS,
  getSession,
  handInProgress,
  lastSeat,
  leaveResult,
  leaveTable,
  LOBBY,
  sitDown,
  tableLayout,
  type TableSession,
} from '../src/state/playTable';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: () => null,
    length: 0,
  };
});

const NAMES = ['You', 'Sam', 'Rita', 'Lou', 'Nora', 'Ike', 'Wes', 'Tess', 'Otto'];
const name = (seat: number) => NAMES[seat];
/** 9 handed with 100bb each. The button decides where the player sits. */
const deal = (button: number) => startHand({ stacks: Array(9).fill(100), button }, seededRng(7));
/** Plays actions in order, whoever is to act. */
const play = (state: HandState, actions: PlayAction[]) => actions.reduce((s, a) => act(s, a), state);
const fold: PlayAction = { kind: 'fold' };
const call: PlayAction = { kind: 'call' };
const check: PlayAction = { kind: 'check' };

describe('table layout', () => {
  it('starts new and casual players on Simple and regulars on Full', () => {
    expect(tableLayout(undefined, 'new')).toBe('simple');
    expect(tableLayout(undefined, 'casual')).toBe('simple');
    expect(tableLayout(undefined, 'winning')).toBe('full');
    expect(tableLayout(undefined, 'pro')).toBe('full');
    expect(tableLayout(undefined, undefined)).toBe('full');
  });

  it('keeps the player choice whatever their experience', () => {
    expect(tableLayout('full', 'new')).toBe('full');
    expect(tableLayout('simple', 'pro')).toBe('simple');
  });

  it('is a table setting that carries over to the next table', () => {
    const table = LOBBY[0];
    sitDown(table, table.buyIns[1]);
    expect(getSession()!.settings.layout).toBeUndefined();
    leaveTable();
    store.set('felt.play.settings.v1', JSON.stringify({ ...DEFAULT_SETTINGS, layout: 'full' }));
    sitDown(table, table.buyIns[1]);
    expect(getSession()!.settings.layout).toBe('full');
  });
});

describe('the one raise size in Simple', () => {
  it('is your open unopened, three times a raise, half the pot after the flop', () => {
    // Under the gun with no one in: the open from Settings.
    const utg = deal(6);
    expect(utg.toAct).toBe(HERO);
    expect(simpleSize(sizeOptions(utg, 2.5))).toBe(2.5);
    expect(simpleSize(sizeOptions(utg, 4))).toBe(4);
    // Facing a raise: three times it.
    const bb = play(deal(7), [{ kind: 'raise', to: 3 }, fold, fold, fold, fold, fold, fold, fold]);
    expect(bb.toAct).toBe(HERO);
    expect(simpleSize(sizeOptions(bb, 2.5))).toBe(9);
    // After the flop: half the pot.
    const flop = play(bb, [call]);
    const first = flop.toAct === HERO ? flop : play(flop, [check]);
    expect(first.street).toBe('flop');
    const opts = sizeOptions(first, 2.5);
    expect(simpleSize(opts)).toBe(opts.find((o) => o.label === '½ pot')!.to);
  });

  it('is always a legal size', () => {
    for (let b = 0; b < 9; b++) {
      const s = deal(b);
      let state = s;
      while (state.toAct !== HERO && state.toAct !== null) state = act(state, call);
      if (state.toAct !== HERO) continue;
      const r = legalActions(state).raise;
      const to = simpleSize(sizeOptions(state, 3));
      if (!r) expect(to).toBeUndefined();
      else {
        expect(to).toBeGreaterThanOrEqual(r.min);
        expect(to).toBeLessThanOrEqual(r.max);
      }
    }
  });
});

describe('what is happening, in one line', () => {
  it('says who raised and what it costs to call', () => {
    // The player is in the big blind. Sam raises to 6 under the gun and the rest fold.
    const s = play(deal(7), [{ kind: 'raise', to: 6 }, fold, fold, fold, fold, fold, fold, fold]);
    expect(s.toAct).toBe(HERO);
    expect(situationLine(s, name)).toBe("Sam raised to 6. It's 5 more to call.");
  });

  it('covers first in, limpers and the big blind option', () => {
    expect(situationLine(deal(6), name)).toBe("You act first. It's 1 to call.");
    // The player on the button after folds.
    const btn = play(deal(HERO), [fold, fold, fold, fold, fold, fold]);
    expect(btn.toAct).toBe(HERO);
    expect(situationLine(btn, name)).toBe("Everyone folded to you. It's 1 to call.");
    // One limper, then the big blind's option.
    const limp = play(deal(7), [call, fold, fold, fold, fold, fold, fold, fold]);
    expect(situationLine(limp, name)).toBe('Sam called. You can check or raise.');
  });

  it('covers checks after the flop and waiting on a bot', () => {
    const pre = play(deal(7), [call, fold, fold, fold, fold, fold, fold, fold, check]);
    expect(pre.street).toBe('flop');
    expect(situationLine(pre, name)).toBe('You act first. You can check or bet.');
    const checked = play(pre, [check]);
    expect(situationLine(checked, name)).toBe('Waiting for Sam.');
    const back = play(checked, [{ kind: 'bet', to: 2 }]);
    expect(situationLine(back, name)).toBe("Sam bet 2. It's 2 to call.");
  });

  it('says so when the player has folded, and nothing once the hand is over', () => {
    const folded = play(deal(6), [fold]);
    expect(situationLine(folded, name)).toBe('You folded. The hand plays on without you.');
    let over = folded;
    while (over.toAct !== null) over = act(over, fold);
    expect(situationLine(over, name)).toBe('');
  });

  it('follows the voice rules: short, at most one comma, no dashes', () => {
    const lines = [
      situationLine(deal(6), name),
      situationLine(play(deal(7), [{ kind: 'raise', to: 6 }, fold, fold, fold, fold, fold, fold, fold]), name),
      situationLine(play(deal(HERO), [fold, fold, fold, fold, fold, fold]), name),
    ];
    for (const line of lines) {
      for (const sentence of line.split('. ')) {
        expect(sentence.split(' ').length).toBeLessThan(15);
        expect(sentence.split(',').length).toBeLessThanOrEqual(2);
      }
      expect(line).not.toMatch(/[\u2014\u2013]/);
    }
  });
});

describe('the coach hint', () => {
  it('answers preflop decisions with the whole mix and never after the flop', () => {
    const s = deal(6);
    const advice = coachAdvice(s)!;
    expect(advice).toBeDefined();
    const total = Object.values(advice.mix).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBeCloseTo(1, 5);
    for (const id of Object.keys(advice.mix)) expect(advice.labels[id]).toBeTruthy();
    expect(advice.source.length).toBeGreaterThan(0);
    const flop = play(deal(7), [call, fold, fold, fold, fold, fold, fold, fold, check]);
    expect(coachAdvice(flop)).toBeUndefined();
    // Not the player's turn: no advice.
    expect(coachAdvice(play(deal(7), [call]))).toBeUndefined();
  });

  it('keeps the grade of a hinted decision but takes it out of the rating', () => {
    const grades: PlayGrade[] = [
      { tier: 'chart', index: 2, street: 'preflop', did: 'Fold', grade: 'best', detail: '', rated: true },
      { tier: 'bot', index: 5, street: 'river', did: 'Call 4', grade: 'mistake', detail: '', rated: true },
    ];
    const out = withoutHinted(grades, [2]);
    expect(out[0]).toEqual({ ...grades[0], rated: false });
    expect(out[1]).toBe(grades[1]);
    expect(withoutHinted(grades, undefined)).toBe(grades);
  });

  it('marks the decision the player asked about and books it with the hand', () => {
    const table = LOBBY[0];
    sitDown(table, table.buyIns[1]);
    let s: TableSession = { ...getSession()!, settings: { ...DEFAULT_SETTINGS, skipFolds: false, afterFold: 'watch' } };
    let k = 3;
    s = dealNext(s, () => k++);
    const rng = liveRng(s.live!.seed);
    const seats = seatsOf(s);
    while (s.live && s.live.state.toAct !== HERO && !s.live.state.result) s = applyAction(s, botAction(s.live.state, seats, rng), rng);
    expect(s.live!.state.toAct).toBe(HERO);
    const index = s.live!.history.length;
    s = markHinted(markHinted(s));
    expect(s.live!.hinted).toEqual([index]);
    s = applyAction(s, { kind: 'fold' }, rng);
    while (s.live && !s.live.state.result) s = applyAction(s, botAction(s.live.state, seats, rng), rng);
    const rec = s.hands.at(-1)!;
    expect(rec.hinted).toEqual([index]);
    // Grading itself is the same with or without the hint.
    const grades = gradeHand(rec.history, seats, rec.seed);
    const hinted = withoutHinted(grades, rec.hinted);
    expect(hinted.map((g) => g.grade)).toEqual(grades.map((g) => g.grade));
    expect(hinted.find((g) => g.index === index)?.rated).toBe(false);
  });
});

describe('leaving the table', () => {
  it('folds a hand in progress, counts what was in the pot and saves the stack', () => {
    const table = LOBBY[0];
    sitDown(table, table.buyIns[1]);
    let s: TableSession = { ...getSession()!, settings: { ...DEFAULT_SETTINGS, skipFolds: false } };
    let k = 21;
    // Deal until the player has a blind in, so leaving costs something.
    for (let i = 0; i < 12; i++) {
      s = dealNext({ ...s, live: undefined }, () => k++);
      if (s.live!.state.players[HERO].total > 0) break;
    }
    const me = s.live!.state.players[HERO];
    expect(me.total).toBeGreaterThan(0);
    expect(handInProgress(s)).toBe(true);
    const { stack, stats } = leaveResult(s);
    expect(stack).toBe(me.stack);
    expect(stats.net).toBeCloseTo(s.stats.net - me.total, 9);
    expect(handInProgress({ ...s, live: undefined })).toBe(false);
  });

  it('offers the saved stack at the same table next time', () => {
    const table = LOBBY[1];
    sitDown(table, table.buyIns[0]);
    leaveTable();
    expect(lastSeat()).toEqual({ table, buyIn: table.buyIns[0], stack: table.buyIns[0] });
    sitDown(table, table.buyIns[0], 137.5);
    expect(getSession()!.stacks[HERO]).toBe(137.5);
    expect(getSession()!.stats.bought).toBe(137.5);
  });
});

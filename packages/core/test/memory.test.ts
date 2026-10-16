import { describe, expect, it } from 'vitest';
import { cardStrength, comebackGroups, createScheduler, dueForecast, type MemoryReview, solidHistory } from '../src';

const at = (day: number, hour = 12) => new Date(2026, 5, day, hour);

describe('due forecast', () => {
  it('counts cards per day with overdue cards in today', () => {
    const now = at(10, 9);
    const dues = [at(2), at(10, 8), at(10, 23), at(11, 1), at(13), at(16, 23), at(17, 0), at(30)];
    expect(dueForecast(dues, now)).toEqual([3, 1, 0, 1, 0, 0, 1]);
  });

  it('can look further ahead', () => {
    expect(dueForecast([at(30)], at(10), 21)).toHaveLength(21);
    expect(dueForecast([at(30)], at(10), 21)[20]).toBe(1);
    expect(dueForecast([], at(10))).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('comeback groups', () => {
  it('sorts cards into later today, tomorrow, this week and later', () => {
    const now = at(10, 20);
    const dues = [at(10, 20), at(10, 23), at(11, 6), at(12), at(16, 23), at(17, 1), at(40)];
    expect(comebackGroups(dues, now)).toEqual({ today: 2, tomorrow: 1, week: 2, later: 2 });
  });
});

describe('solid history', () => {
  /** Reviews a card at each due date with one outcome, the way the app does, and logs the grades. */
  function study(cardId: string, start: Date, until: Date, accuracy = 1) {
    const s = createScheduler();
    let card = s.newCard(start);
    let when = start;
    const log: MemoryReview[] = [];
    while (when < until) {
      const r = s.review(card, { accuracy, responseMs: 1000, targetMs: 2000 }, when);
      card = r.card;
      log.push({ cardId, at: when, grade: r.log.rating });
      when = new Date(Math.max(card.due.getTime(), when.getTime() + 60_000));
    }
    return { card, log };
  }

  it('replays to the same strength the scheduler stored', () => {
    const now = at(30, 22);
    const a = study('a', at(1), now);
    const b = study('b', at(20), now);
    const c = study('c', at(25), now, 0);
    const today = solidHistory([...a.log, ...b.log, ...c.log], now, 30).at(-1);
    const stored = [a.card, b.card, c.card].filter((card) => cardStrength(card) === 'solid').length;
    expect(today).toBe(stored);
  });

  it('shows a card turning solid on the day it does and never before its first review', () => {
    const now = at(30, 22);
    const { log } = study('a', at(5), now);
    const history = solidHistory(log, now, 30);
    expect(history).toHaveLength(30);
    expect(history[0]).toBe(0);
    expect(history.at(-1)).toBe(1);
    const first = history.indexOf(1);
    expect(first).toBeGreaterThanOrEqual(4);
    expect(history[3]).toBe(0);
    expect(history.slice(first).every((n) => n === 1)).toBe(true);
  });

  it('drops a card after a lapse', () => {
    const now = at(30, 22);
    const { log } = study('a', at(1), at(25));
    const lapse = createScheduler();
    let card = lapse.newCard(at(1));
    for (const r of log) card = lapse.review(card, { accuracy: 1, responseMs: 1000, targetMs: 2000 }, r.at).card;
    const missed = lapse.review(card, { accuracy: 0, responseMs: 1000, targetMs: 2000 }, at(28));
    const history = solidHistory([...log, { cardId: 'a', at: at(28), grade: missed.log.rating }], now, 30);
    expect(history[26]).toBe(1);
    expect(history[27]).toBe(0);
  });

  it('is empty with no reviews', () => {
    expect(solidHistory([], at(10), 7)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

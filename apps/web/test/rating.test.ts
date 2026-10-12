import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { dailyItems, shareText } from '../src/pages/DailyPage';
import { db } from '../src/state/db';
import { domainForLesson, ratingSnapshot, recordLessonQuiz, recordRated, streakNow } from '../src/state/rating';
import { chartItemDifficulty } from '@felt/core';
import { chartChoices } from '../src/drills/DecisionItem';
import { getChart } from '../src/state/charts';
import { addHandsToReview, buildQueue, recordAnswer } from '../src/state/review';
import { saveLessonStep } from '../src/state/saved';

beforeEach(async () => {
  await Promise.all([db.answers.clear(), db.saved.clear(), db.cards.clear(), db.reviews.clear(), db.lessons.clear(), db.daily.clear()]);
});

describe('rated answers', () => {
  it('map lessons to skill areas', () => {
    expect(domainForLesson('foundations/math/pot-odds')).toBe('math');
    expect(domainForLesson('foundations/theory/solvers')).toBe('theory');
    expect(domainForLesson('postflop/river/overbets')).toBe('postflop');
    expect(domainForLesson('mindset/mental/tilt')).toBe('theory');
  });

  it('count a repeat of the same item only after ten minutes', async () => {
    const t = new Date(2026, 9, 12, 10);
    await recordRated({ itemId: 'x', domain: 'math', difficulty: 1300, score: 1, source: 'lesson' }, t);
    await recordRated({ itemId: 'x', domain: 'math', difficulty: 1300, score: 1, source: 'lesson' }, new Date(t.getTime() + 60_000));
    await recordRated({ itemId: 'x', domain: 'math', difficulty: 1300, score: 1, source: 'lesson' }, new Date(t.getTime() + 11 * 60_000));
    expect(await db.answers.count()).toBe(2);
  });

  it('raise the rating for right answers, by area', async () => {
    await recordLessonQuiz('foundations/math/pot-odds', 5, true, 'lesson');
    const snap = await ratingSnapshot();
    expect(snap.overall.rating).toBeGreaterThan(1200);
    expect(snap.domains.math.games).toBe(1);
    expect(snap.domains.preflop.games).toBe(0);
  });

  it('never rate self graded flashcards', async () => {
    await saveLessonStep('foundations/math/pot-odds', 2); // a table, so a flashcard
    const [item] = (await buildQueue([], 0)).fresh;
    await recordAnswer(item, { accuracy: 1, responseMs: 1000, targetMs: 12000 });
    expect(await db.answers.count()).toBe(0);
  });

  it('count any study toward the streak', async () => {
    await recordLessonQuiz('foundations/math/pot-odds', 5, false, 'lesson');
    expect((await streakNow()).activeToday).toBe(true);
  });
});

describe('daily challenge', () => {
  it('is the same five items all day and mixes charts with lesson questions', () => {
    const a = dailyItems(new Date(2026, 9, 12, 7));
    expect(dailyItems(new Date(2026, 9, 12, 23))).toEqual(a);
    expect(a.map((i) => i.kind)).toEqual(['chart', 'quiz', 'chart', 'quiz', 'chart']);
  });

  it('orders the range decisions from easier to harder, every one rated', () => {
    for (let d = 1; d <= 20; d++) {
      const levels = dailyItems(new Date(2026, 9, d)).flatMap((i) => {
        if (i.kind !== 'chart') return [];
        const chart = getChart(i.chartId)!;
        return [chartItemDifficulty(chart.mixes.get(i.hand) ?? { fold: 1 }, chartChoices(chart))];
      });
      expect(levels.every((x) => x !== undefined)).toBe(true);
      expect([...levels].sort((x, y) => x! - y!)).toEqual(levels);
    }
  });

  it('adds missed hands to the front of review without duplicates', async () => {
    const now = new Date(2026, 9, 12, 9);
    await addHandsToReview([{ chartId: 'rfi-9-btn', hand: 'K9o' }], now);
    await addHandsToReview([{ chartId: 'rfi-9-btn', hand: 'K9o' }], new Date(now.getTime() + 1000));
    const cards = await db.cards.toArray();
    expect(cards).toHaveLength(1);
    expect(cards[0].due.getTime()).toBe(now.getTime() + 1000);
  });

  it('shares a spoiler free result', () => {
    expect(shareText(285, [1, 1, 0.5, 0, 1], { rating: 1432, rd: 80, games: 120 })).toBe('Felt Daily #285 · 3/5\n🟩🟩🟨🟥🟩\nFelt Rating 1432 (Sharp)');
    expect(shareText(285, [1], { rating: 1250, rd: 250, games: 4 })).toContain('Felt Rating ~1250 (Unrated)');
  });
});

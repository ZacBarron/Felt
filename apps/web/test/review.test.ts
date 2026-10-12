import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { chartsForGame } from '../src/state/charts';
import { db } from '../src/state/db';
import { buildQueue, recordAnswer, todayStats } from '../src/state/review';
import { PRESETS } from '@felt/core';

const { charts } = chartsForGame(PRESETS['live-1-3'].settings);

beforeEach(async () => {
  await db.cards.clear();
  await db.reviews.clear();
});

describe('review queue', () => {
  it('serves the 9-handed deck for a live 1/3 game', () => {
    expect(charts.every((c) => c.spec.tableSize === 9)).toBe(true);
  });

  it('introduces new cards up to the daily limit and schedules answers', async () => {
    const now = new Date('2026-10-12T10:00:00');
    const first = await buildQueue(charts, 5, now);
    expect(first.due).toHaveLength(0);
    expect(first.fresh).toHaveLength(5);

    // A miss comes back within minutes; a fast correct answer goes out at least a day.
    const missDue = await recordAnswer(first.fresh[0], { accuracy: 0, responseMs: 2000, targetMs: 3000 }, now);
    const hitDue = await recordAnswer(first.fresh[1], { accuracy: 1, responseMs: 1500, targetMs: 3000 }, now);
    expect(missDue.getTime() - now.getTime()).toBeLessThan(15 * 60 * 1000);
    expect(hitDue.getTime() - now.getTime()).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1);

    // Two of today's five new cards are used up.
    const second = await buildQueue(charts, 5, now);
    expect(second.fresh).toHaveLength(3);
    expect(second.fresh.map((f) => f.id)).not.toContain(first.fresh[0].id);

    // An hour later the missed card is due.
    const later = await buildQueue(charts, 5, new Date(now.getTime() + 60 * 60 * 1000));
    expect(later.due.map((d) => d.id)).toEqual([first.fresh[0].id]);

    const stats = await todayStats(charts, 5, now);
    expect(stats.reviewedToday).toBe(2);
    expect(stats.accuracyToday).toBe(0.5);
    expect(stats.streak).toBe(1);
  });
});

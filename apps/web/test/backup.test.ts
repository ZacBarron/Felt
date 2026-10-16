import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, importBackup } from '../src/state/backup';
import { db } from '../src/state/db';

const store = new Map<string, string>();
beforeEach(async () => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('backup', () => {
  it('round trips study data with real dates, and settings', async () => {
    const at = new Date('2026-10-01T09:30:00Z');
    await db.lessons.put({ key: 'foundations/math/pot-odds', status: 'done', step: 5, correct: 2, answered: 2, updatedAt: at });
    await db.daily.put({ number: 284, at, scores: [1, 0, 1, 1, 0.5], finished: true, ratingBefore: 1200, ratingAfter: 1231 });
    store.set('felt.settings.v1', JSON.stringify({ study: { newPerDay: 20 } }));

    const file = await exportBackup();
    await Promise.all(db.tables.map((t) => t.clear()));
    store.clear();

    const result = await importBackup(file);
    expect(result).toEqual({ rows: 2, settings: true });
    const lesson = await db.lessons.get('foundations/math/pot-odds');
    expect(lesson?.updatedAt).toBeInstanceOf(Date);
    expect(lesson?.updatedAt.getTime()).toBe(at.getTime());
    expect((await db.daily.get(284))?.scores).toEqual([1, 0, 1, 1, 0.5]);
    expect(JSON.parse(store.get('felt.settings.v1')!)).toEqual({ study: { newPerDay: 20 } });
  });

  it('refuses a file that is not a Suited backup without touching data', async () => {
    await db.daily.put({ number: 1, at: new Date(), scores: [1], ratingBefore: 1200, ratingAfter: 1210 });
    await expect(importBackup('{"hello":"world"}')).rejects.toThrow('not a Suited backup');
    expect(await db.daily.count()).toBe(1);
  });
});

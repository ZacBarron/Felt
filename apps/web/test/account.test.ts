import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CARD_RULES, shouldShowCard } from '../src/state/accountPrompt';
import { clearDeviceData, exportBackup, importBackup, parseBackup, TABLES } from '../src/state/backup';
import { db } from '../src/state/db';
import { loadSettings } from '../src/state/settings';
import { summarizeBackup } from '../src/state/summary';

const store = new Map<string, string>();
const fakeStorage = () => ({
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
});

beforeEach(async () => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = fakeStorage();
  await Promise.all(db.tables.map((t) => t.clear()));
});

const NOW = new Date('2026-10-14T18:00:00Z');
const daysAgo = (n: number, hour = 12) => new Date(Date.UTC(2026, 9, 14 - n, hour));

/** A signed in player's whole state: every table and the settings, as a second device must get it back. */
async function seedPlayer() {
  const settings = {
    game: { tableSize: 6, stackBb: 100, format: 'cash' },
    study: { newPerDay: 20, untimed: true },
    ui: { haptics: false, appearance: 'dark', palette: 'ink' },
    profile: { onboarded: true, goals: ['win-live'], focus: ['preflop'], dailyMinutes: 15, experience: 'winning', target: 'Expert', cue: 'coffee', name: 'Ana', committedAt: daysAgo(5).toISOString() },
    access: { pro: false },
    results: { hands: 12000, profit: 840 },
    assumptions: { poolRating: 1350 },
  };
  store.set('felt.settings.v1', JSON.stringify(settings));
  const fsrs = { due: daysAgo(-1), stability: 3, difficulty: 5, elapsed_days: 1, scheduled_days: 3, reps: 2, lapses: 0, state: 2, last_review: daysAgo(1) };
  await db.cards.put({ id: 'c1', chartId: 'utg-open', mode: 'quick', hand: 'AJo', targetMs: 6000, fsrs: fsrs as never, due: daysAgo(-1), createdAt: daysAgo(4) });
  await db.reviews.add({ cardId: 'c1', chartId: 'utg-open', at: daysAgo(1), accuracy: 1, responseMs: 2400, grade: 3 });
  for (const [i, key] of ['foundations/math/pot-odds', 'foundations/math/equity', 'preflop/opens/utg'].entries())
    await db.lessons.put({ key, status: i === 2 ? 'tested' : 'done', step: 6, correct: 3, answered: 3, updatedAt: daysAgo(2 - i) });
  await db.saved.put({ id: 's1', kind: 'lesson-step', title: 'Pot odds', source: 'Pot odds lesson', createdAt: daysAgo(2), lessonKey: 'foundations/math/pot-odds', step: 2 });
  for (let i = 0; i < 4; i++) await db.answers.add({ at: daysAgo(i), itemId: `quiz:${i}`, domain: 'math', difficulty: 1300, score: 1, source: 'lesson' });
  await db.daily.put({ number: 284, at: daysAgo(0), scores: [1, 1, 0, 1, 0.5], finished: true, ratingBefore: 1200, ratingAfter: 1231 });
  await db.weekly.put({ id: '2026-W42', number: 12, at: daysAgo(1), items: [{ kind: 'math', factId: 'f1' }], scores: [1], finished: false, ratingBefore: 1231, ratingAfter: 1240 });
  await db.hands.put({ id: 'h1', at: daysAgo(3), site: 'PokerStars', game: 'cash', bb: 2, tableMax: 6, players: 6, net: 10, netBb: 5, vpip: true, pfr: true, threeBetChance: false, threeBet: false, openChance: true, sawFlop: true, showdown: false, raw: 'PokerStars Hand #1' });
  await db.sessions.add({ date: daysAgo(3), hours: 4, profit: 220, importedAt: daysAgo(3), source: 'log' });
  await db.scenarios.put({ id: 'sc1', at: daysAgo(2), grade: 'good', preflopRight: true, lossBb: 0.2 });
  await db.logged.add({ at: daysAgo(3), action: 'Called a river overbet', flagged: true });
  await db.events.add({ at: daysAgo(5), name: 'plan_committed' });
  return settings;
}

const snapshotOf = async () => Object.fromEntries(await Promise.all(TABLES.map(async (t) => [t, await db.table(t).toArray()] as const)));

describe('backup coverage', () => {
  it('includes every table in the database', () => {
    expect([...TABLES].sort()).toEqual(db.tables.map((t) => t.name).sort());
  });

  it('restores a signed in player’s full state on a fresh device', async () => {
    const settings = await seedPlayer();
    const before = await snapshotOf();
    const snapshot = await exportBackup(NOW);

    // A second device: nothing on it yet.
    await clearDeviceData();
    expect(store.size).toBe(0);
    for (const t of TABLES) expect(await db.table(t).count()).toBe(0);

    const result = await importBackup(snapshot);
    expect(result.settings).toBe(true);
    expect(await snapshotOf()).toEqual(before);
    // Dates come back as Dates, so schedules and streaks still work.
    expect((await db.cards.get('c1'))?.due).toBeInstanceOf(Date);
    expect((await db.cards.get('c1'))?.fsrs.last_review).toBeInstanceOf(Date);

    // Settings, profile, onboarding state and the player's own numbers all come back.
    const loaded = loadSettings();
    expect(loaded.profile).toMatchObject(settings.profile);
    expect(loaded.profile.onboarded).toBe(true);
    expect(loaded.study).toMatchObject(settings.study);
    expect(loaded.ui).toEqual(settings.ui);
    expect(loaded.results).toEqual(settings.results);
    expect(loaded.assumptions).toEqual(settings.assumptions);
  });

  it('clears only Aced’s own keys from shared storage', async () => {
    await seedPlayer();
    store.set('felt.session.v1', '{}');
    store.set('other-app.token', 'keep me');
    await clearDeviceData();
    expect([...store.keys()]).toEqual(['other-app.token']);
    expect(await db.lessons.count()).toBe(0);
  });

  it('refuses anything that is not a backup', () => {
    expect(() => parseBackup('not json')).toThrow('not a Aced backup');
    expect(() => parseBackup('{"format":"felt-backup","version":1,"tables":null}')).toThrow('not a Aced backup');
  });
});

describe('progress summary', () => {
  it('reads rating, lessons, streak and name from a snapshot', async () => {
    await seedPlayer();
    const s = summarizeBackup(await exportBackup(NOW), { now: NOW });
    expect(s.lessonsDone).toBe(3);
    expect(s.answers).toBe(4);
    expect(s.rating).toBeGreaterThan(1200);
    // Four answers is not enough to settle a rating.
    expect(s.settled).toBe(false);
    expect(s.tier).toBe('Still settling');
    expect(s.streak).toBe(4);
    expect(s.lastStudied?.toISOString()).toBe(daysAgo(0).toISOString());
    expect(s).toMatchObject({ onboarded: true, name: 'Ana' });
  });

  it('describes an empty copy honestly', async () => {
    const s = summarizeBackup(await exportBackup(NOW), { now: NOW });
    expect(s).toMatchObject({ rating: undefined, lessonsDone: 0, streak: 0, answers: 0, onboarded: false, lastStudied: undefined });
  });
});

describe('save your progress card', () => {
  const t = (iso: string) => new Date(iso);
  const progress = { lessonsDone: 3, streak: 0 };

  it('waits for progress worth protecting', () => {
    expect(shouldShowCard({ dismissals: 0 }, { lessonsDone: 2, streak: 2 }, NOW)).toBe(false);
    expect(shouldShowCard({ dismissals: 0 }, { lessonsDone: 3, streak: 0 }, NOW)).toBe(true);
    expect(shouldShowCard({ dismissals: 0 }, { lessonsDone: 0, streak: 3 }, NOW)).toBe(true);
  });

  it('does not follow the onboarding ask too closely', () => {
    expect(shouldShowCard({ dismissals: 0, onboardingAt: t('2026-10-13T18:00:00Z').toISOString() }, progress, NOW)).toBe(false);
    expect(shouldShowCard({ dismissals: 0, onboardingAt: t('2026-10-10T18:00:00Z').toISOString() }, progress, NOW)).toBe(true);
  });

  it('shows for a day, then rests for a week', () => {
    const shown = t('2026-10-14T09:00:00Z').toISOString();
    expect(shouldShowCard({ dismissals: 0, cardShownAt: shown }, progress, NOW)).toBe(true);
    expect(shouldShowCard({ dismissals: 0, cardShownAt: shown }, progress, t('2026-10-16T09:00:00Z'))).toBe(false);
    expect(shouldShowCard({ dismissals: 0, cardShownAt: shown }, progress, new Date(Date.parse(shown) + CARD_RULES.weekMs))).toBe(true);
  });

  it('rests a week after a dismissal and stops after two', () => {
    const dismissed = t('2026-10-12T09:00:00Z').toISOString();
    expect(shouldShowCard({ dismissals: 1, lastDismissedAt: dismissed }, progress, NOW)).toBe(false);
    expect(shouldShowCard({ dismissals: 1, lastDismissedAt: dismissed }, progress, t('2026-10-20T09:00:00Z'))).toBe(true);
    expect(shouldShowCard({ dismissals: 2, lastDismissedAt: dismissed }, progress, t('2027-01-20T09:00:00Z'))).toBe(false);
  });
});

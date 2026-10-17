import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { annualSavings, canOpenLesson, isLessonFree, isPro, PLANS } from '../src/state/access';
import { db } from '../src/state/db';
import { isComplete, LESSON_ENTRIES, lessonProgress, markTested, recommendedLessons, saveLesson } from '../src/state/lessons';

beforeEach(async () => {
  await db.lessons.clear();
});

describe('the path', () => {
  it('orders in progress, then placement module, then focus, then curriculum', async () => {
    await saveLesson('postflop/cbet/sizing', { step: 2 });
    const path = recommendedLessons(await lessonProgress(), { placedAt: 'preflop/rfi', focus: ['exploit/adjustments'] });
    expect(path[0].key).toBe('postflop/cbet/sizing');
    expect(path[1].key).toBe('preflop/rfi/rfi-ep');
    const firstFocus = path.findIndex((e) => e.key.startsWith('exploit/adjustments/'));
    const firstOther = path.findIndex((e) => e.key.startsWith('foundations/'));
    expect(firstFocus).toBeLessThan(firstOther);
    expect(new Set(path.map((e) => e.key)).size).toBe(path.length);
  });

  it('skips tested lessons, and reading a tested lesson upgrades it to done', async () => {
    // Basics come first in the path; pass them so the next lesson is in Foundations.
    await markTested(LESSON_ENTRIES.filter((e) => e.key.startsWith('basics/')).map((e) => e.key));
    await markTested(['foundations/math/pot-odds']);
    let progress = await lessonProgress();
    expect(isComplete(progress.get('foundations/math/pot-odds'))).toBe(true);
    expect(recommendedLessons(progress)[0].key).toBe('foundations/math/ev');
    await saveLesson('foundations/math/pot-odds', { step: 1 });
    expect((await lessonProgress()).get('foundations/math/pot-odds')?.status).toBe('tested');
    await saveLesson('foundations/math/pot-odds', { status: 'done' });
    progress = await lessonProgress();
    expect(progress.get('foundations/math/pot-odds')?.status).toBe('done');
    await markTested(['foundations/math/pot-odds']);
    expect((await lessonProgress()).get('foundations/math/pot-odds')?.status).toBe('done');
  });
});

describe('Aced Pro access', () => {
  it('frees the first module of every track and locks the rest', () => {
    expect(isLessonFree('foundations/math/pot-odds')).toBe(true);
    expect(isLessonFree('preflop/rfi/rfi-ep')).toBe(true);
    expect(isLessonFree('postflop/cbet/cbet-ip')).toBe(false);
    expect(canOpenLesson('postflop/cbet/cbet-ip', { pro: false })).toBe(false);
    expect(canOpenLesson('postflop/cbet/cbet-ip', { pro: true })).toBe(true);
  });

  it('lets the developer switch override purchases, and honors trials', () => {
    expect(isPro({ pro: true, devMode: true, devPro: false })).toBe(false);
    expect(isPro({ pro: false, devMode: true, devPro: true })).toBe(true);
    // The override on is also Settings' "Unlock Aced Pro for testing", which needs no developer mode.
    expect(isPro({ pro: false, devMode: false, devPro: true })).toBe(true);
    // Forcing Pro off still needs developer mode.
    expect(isPro({ pro: true, devMode: false, devPro: false })).toBe(true);
    expect(isPro({ pro: false, trialEndsAt: new Date(Date.now() + 86_400_000).toISOString() })).toBe(true);
  });

  it('computes the yearly saving from the real prices', () => {
    const y = PLANS.find((p) => p.id === 'annual')!.price;
    const m = PLANS.find((p) => p.id === 'monthly')!.price;
    expect(annualSavings()).toBe(Math.floor((1 - y / (m * 12)) * 100));
  });
});

describe('several goals', () => {
  it('brings forward every chosen goal, in the order picked, without duplicates', async () => {
    const { pathPrefs, goalsLine } = await import('../src/state/goals');
    const prefs = pathPrefs({ onboarded: true, goals: ['tournaments', 'win-live'], focus: ['preflop'], dailyMinutes: 10 });
    expect(prefs.focus).toEqual(['preflop/rfi', 'tournaments/mtt-basics', 'preflop/live-preflop', 'exploit/adjustments']);
    expect(goalsLine(['win-live', 'move-up'])).toBe('To win more at live cash and move up in stakes');
    expect(goalsLine(['win-live', 'move-up', 'master-gto'])).toBe('Built for your 3 goals');
  });

  it('starts someone new with the basics, whatever their goals', async () => {
    const { pathPrefs } = await import('../src/state/goals');
    const progress = await lessonProgress();
    for (const experience of ['new', 'casual'] as const) {
      const prefs = pathPrefs({ onboarded: true, experience, goals: ['move-up'], focus: [], dailyMinutes: 10 });
      expect(recommendedLessons(progress, prefs)[0].key, experience).toBe('basics/rules/goal');
    }
    // A casual player placed past the basics follows their placement and goals instead.
    const placed = pathPrefs({ onboarded: true, experience: 'casual', placedAt: 'preflop/rfi', goals: ['move-up'], focus: [], dailyMinutes: 10 });
    expect(placed.focus[0]).toBe('preflop/3bet-pots');
    const regular = pathPrefs({ onboarded: true, experience: 'winning', goals: ['move-up'], focus: [], dailyMinutes: 10 });
    expect(regular.focus[0]).toBe('preflop/3bet-pots');
  });

  it('brings lessons forward for who a player faces, after their own focus picks', async () => {
    const { pathPrefs } = await import('../src/state/goals');
    const base = { onboarded: true, experience: 'winning' as const, goals: [], dailyMinutes: 10 };
    expect(pathPrefs({ ...base, focus: ['math'], opponents: 'soft' }).focus).toEqual(['foundations/math', 'exploit/adjustments']);
    expect(pathPrefs({ ...base, focus: [], opponents: 'tough' }).focus).toEqual(['foundations/theory']);
    expect(pathPrefs({ ...base, focus: [], opponents: 'mixed' }).focus).toEqual([]);
  });

  it('puts the rules last for regular players who skip placement', async () => {
    const { pathPrefs } = await import('../src/state/goals');
    const progress = await lessonProgress();
    const prefs = pathPrefs({ onboarded: true, experience: 'winning', goals: [], focus: [], dailyMinutes: 10 });
    const path = recommendedLessons(progress, prefs);
    expect(path[0].key.startsWith('basics/')).toBe(false);
    expect(path.findIndex((e) => e.key.startsWith('basics/'))).toBeGreaterThan(path.findIndex((e) => e.key.startsWith('foundations/')));
  });

  it('reads saves from before goals were a list', async () => {
    const { pathPrefs } = await import('../src/state/goals');
    const old = { onboarded: true, goal: 'master-gto', focus: [], dailyMinutes: 10 } as unknown as Parameters<typeof pathPrefs>[0];
    expect(pathPrefs(old).focus).toEqual(['foundations/theory', 'foundations/ranges']);
  });
});

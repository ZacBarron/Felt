import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { annualSavings, canOpenLesson, isLessonFree, isPro, PLANS } from '../src/state/access';
import { db } from '../src/state/db';
import { isComplete, lessonProgress, markTested, recommendedLessons, saveLesson } from '../src/state/lessons';

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

describe('Felt Pro access', () => {
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
    expect(isPro({ pro: false, devMode: false, devPro: true })).toBe(false);
    expect(isPro({ pro: false, trialEndsAt: new Date(Date.now() + 86_400_000).toISOString() })).toBe(true);
  });

  it('computes the yearly saving from the real prices', () => {
    const y = PLANS.find((p) => p.id === 'annual')!.price;
    const m = PLANS.find((p) => p.id === 'monthly')!.price;
    expect(annualSavings()).toBe(Math.floor((1 - y / (m * 12)) * 100));
  });
});

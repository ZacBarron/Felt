import { describe, expect, it } from 'vitest';
import { entitlementFromSubscription, fitDifficulty, localTime, ratingBand, shouldRemind, stripeForm, weekKey } from '../src/services.ts';

describe('stripe form encoding', () => {
  it('nests objects and arrays the way Stripe reads them', () => {
    expect(stripeForm({ mode: 'subscription', line_items: [{ price: 'p_1', quantity: 1 }], metadata: { user_id: 'u 1' } })).toBe(
      'mode=subscription&line_items%5B0%5D%5Bprice%5D=p_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Buser_id%5D=u%201',
    );
  });
});

describe('entitlement', () => {
  it('reads the period end from the subscription or its item', () => {
    const now = 1_800_000_000;
    const item = { price: { id: 'm' }, current_period_end: now + 100 };
    expect(entitlementFromSubscription({ status: 'active', items: { data: [item] } }, { monthly: 'm' }, now)).toEqual({
      proUntil: new Date((now + 100) * 1000).toISOString(),
      plan: 'monthly',
      trialing: false,
    });
    expect(entitlementFromSubscription({ status: 'canceled', ended_at: now - 5, items: { data: [item] } }, { monthly: 'm' }, now).proUntil).toBe(
      new Date((now - 5) * 1000).toISOString(),
    );
  });
});

describe('reminder timing', () => {
  const base = { tz: 'Europe/London', cueMinutes: 8 * 60, lastStudyDay: null, sentSinceStudy: [] as string[] };
  // 07:10 UTC on 2026-10-14 is 08:10 in London (summer time).
  const at = new Date('2026-10-14T07:10:00Z');

  it('uses the player time zone', () => {
    expect(localTime(at, 'Europe/London')).toEqual({ day: '2026-10-14', minutes: 490 });
    expect(shouldRemind(base, at).send).toBe(true);
    expect(shouldRemind(base, new Date('2026-10-14T06:50:00Z')).send).toBe(false);
  });

  it('skips players who already studied today or were already reminded', () => {
    expect(shouldRemind({ ...base, lastStudyDay: '2026-10-14' }, at).send).toBe(false);
    expect(shouldRemind({ ...base, sentSinceStudy: ['2026-10-14'] }, at).send).toBe(false);
  });

  it('backs off when reminders are ignored', () => {
    const three = ['2026-10-13', '2026-10-12', '2026-10-11'];
    expect(shouldRemind({ ...base, sentSinceStudy: three }, at).send).toBe(false);
    expect(shouldRemind({ ...base, sentSinceStudy: ['2026-10-11', '2026-10-10', '2026-10-09'] }, at).send).toBe(true);
    const seven = ['2026-10-11', '2026-10-08', '2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01'];
    expect(shouldRemind({ ...base, sentSinceStudy: seven }, at).send).toBe(false);
  });
});

describe('leagues and calibration helpers', () => {
  it('starts weeks on Monday UTC', () => {
    expect(weekKey(new Date('2026-10-14T12:00:00Z'))).toBe('2026-10-12');
    expect(weekKey(new Date('2026-10-12T00:00:00Z'))).toBe('2026-10-12');
    expect(weekKey(new Date('2026-10-18T23:59:00Z'))).toBe('2026-10-12');
  });

  it('bands ratings by tier', () => {
    expect(ratingBand(850)).toBe(0);
    expect(ratingBand(1200)).toBe(3);
    expect(ratingBand(1349)).toBe(3);
    expect(ratingBand(3000)).toBe(8);
  });

  it('fits difficulty from expected scores', () => {
    // Everyone at 1500 gets it right half the time: difficulty 1500.
    const half = Array.from({ length: 50 }, (_, i) => ({ score: i % 2, rating: 1500 }));
    expect(fitDifficulty(half)).toBeCloseTo(1500, 0);
    // All right never runs off to infinity.
    expect(fitDifficulty([{ score: 1, rating: 1500 }])).toBeGreaterThanOrEqual(600);
  });
});

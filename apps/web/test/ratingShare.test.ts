import { describe, expect, it } from 'vitest';
import { type RatingCardData, shareText } from '../src/components/RatingShare';

const base: RatingCardData = { rating: 1622.4, settling: false, tier: 'Regular', answers: 160, streak: 0, best: 1650, history: [] };

describe('rating share text', () => {
  it('states the rounded rating and the tier, nothing more', () => {
    expect(shareText(base)).toBe('My Suited Rating is 1622. My tier is Regular.');
  });

  it('says a settling rating is still settling and names no tier', () => {
    expect(shareText({ ...base, rating: 1264, settling: true, tier: undefined })).toBe('My Suited Rating is 1264 and still settling.');
  });

  it('mentions a streak only when there is one worth naming', () => {
    expect(shareText({ ...base, streak: 1 })).not.toContain('streak');
    expect(shareText({ ...base, streak: 9 })).toBe("My Suited Rating is 1622. My tier is Regular. I'm on a 9 day streak.");
  });
});

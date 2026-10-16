import { describe, expect, it } from 'vitest';
import { bestSettled, type RatingCardData, ratingFigure, ratingShareText } from '../src/state/share';

const base: RatingCardData = { rating: 1622.4, settling: false, tier: 'Regular', answers: 160, streak: 0, best: 1650, history: [] };

describe('rating share text', () => {
  it('states the rounded rating and the tier, nothing more', () => {
    expect(ratingShareText(base)).toBe('My Suited Rating is 1622. My tier is Regular.');
  });

  it('says a settling rating is rough and names no tier', () => {
    expect(ratingShareText({ ...base, rating: 1264, settling: true, tier: undefined })).toBe('My Suited Rating is about 1260. It is still settling.');
    expect(ratingShareText({ ...base, rating: 1264, settling: true, tier: 'Regular' })).not.toContain('Regular');
  });

  it('mentions a streak only when there is one worth naming', () => {
    expect(ratingShareText({ ...base, streak: 1 })).not.toContain('streak');
    expect(ratingShareText({ ...base, streak: 9 })).toBe("My Suited Rating is 1622. My tier is Regular. I'm on a 9 day streak.");
  });
});

describe('rating figure on the card', () => {
  it('shows a settled rating as the whole number', () => {
    expect(ratingFigure(1622.4, false)).toEqual({ about: false, value: '1622' });
    expect(ratingFigure(1622.6, false)).toEqual({ about: false, value: '1623' });
  });

  it('rounds a settling rating to the nearest 10 and says about', () => {
    expect(ratingFigure(1184, true)).toEqual({ about: true, value: '1180' });
    expect(ratingFigure(1185, true)).toEqual({ about: true, value: '1190' });
    expect(ratingFigure(1176, true)).toEqual({ about: true, value: '1180' });
  });
});

describe('best ever', () => {
  it('counts settled points only', () => {
    expect(bestSettled([])).toBe(0);
    expect(bestSettled([{ rating: 1700, rd: 250 }])).toBe(0);
    expect(
      bestSettled([
        { rating: 1700, rd: 250 },
        { rating: 1500, rd: 100 },
        { rating: 1540, rd: 110 },
        { rating: 1480, rd: 90 },
      ]),
    ).toBe(1540);
  });
});

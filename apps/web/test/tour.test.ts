import { beforeEach, describe, expect, it } from 'vitest';
import {
  APP_TOUR,
  endTour,
  getTour,
  nextStep,
  parseTour,
  PLAY_TIPS,
  RANGES_TIPS,
  resetTour,
  seeTip,
  setTour,
  shouldStartAppTour,
  tipPending,
  type TourProgress,
} from '../src/state/tour';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: () => null,
    length: 0,
  };
});

const fresh: TourProgress = { tips: {} };

describe('the first run tour', () => {
  it('starts once, after onboarding', () => {
    expect(shouldStartAppTour(fresh, { onboarded: false })).toBe(false);
    expect(shouldStartAppTour(fresh, { onboarded: true })).toBe(true);
    expect(shouldStartAppTour(endTour(fresh, 'done'), { onboarded: true })).toBe(false);
    expect(shouldStartAppTour(endTour(fresh, 'skipped'), { onboarded: true })).toBe(false);
  });

  it('walks the steps in order and ends after the last', () => {
    expect(nextStep(0, APP_TOUR.length)).toBe(1);
    expect(nextStep(APP_TOUR.length - 1, APP_TOUR.length)).toBeUndefined();
    expect(nextStep(0, 1)).toBeUndefined();
    // Never more than five steps, whatever is passed in.
    expect(nextStep(4, 9)).toBeUndefined();
  });

  it('points at the main card on Today and every tab', () => {
    expect(APP_TOUR[0].target).toBe('[data-tour="today-main"]');
    expect(APP_TOUR.slice(1).map((s) => s.target)).toEqual(['learn', 'train', 'play', 'you'].map((t) => `[data-tour="tab-${t}"]`));
  });

  it('remembers tips one by one', () => {
    expect(tipPending(fresh, 'play')).toBe(true);
    const seen = seeTip(fresh, 'play');
    expect(tipPending(seen, 'play')).toBe(false);
    expect(tipPending(seen, 'ranges')).toBe(true);
  });
});

describe('saved progress', () => {
  it('is stored under a felt key and survives a reload', () => {
    setTour(seeTip(endTour(fresh, 'done'), 'ranges'));
    expect(JSON.parse(store.get('felt.tour.v1')!)).toEqual({ app: 'done', tips: { ranges: true } });
    expect(parseTour(store.get('felt.tour.v1'))).toEqual({ app: 'done', tips: { ranges: true } });
  });

  it('reads bad data as a fresh start', () => {
    expect(parseTour(null)).toEqual(fresh);
    expect(parseTour('not json')).toEqual(fresh);
    expect(parseTour(JSON.stringify({ app: 'maybe', tips: { play: 1, other: true } }))).toEqual({ tips: { play: true } });
  });

  it('starts over from Show the tour again', () => {
    setTour(seeTip(seeTip(endTour(fresh, 'skipped'), 'play'), 'ranges'));
    resetTour();
    expect(getTour()).toEqual(fresh);
    expect(shouldStartAppTour(getTour(), { onboarded: true })).toBe(true);
  });

  it('still holds for this visit when storage is blocked', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    setTour(endTour(fresh, 'done'));
    expect(getTour().app).toBe('done');
  });
});

describe('tour copy', () => {
  const VERBS = ['See', 'Start', 'Explore'];
  const all = [...APP_TOUR, ...PLAY_TIPS, ...RANGES_TIPS];

  it('keeps tours short', () => {
    for (const steps of [APP_TOUR, PLAY_TIPS, RANGES_TIPS]) {
      expect(steps.length).toBeGreaterThanOrEqual(1);
      expect(steps.length).toBeLessThanOrEqual(5);
    }
  });

  it('follows the voice guide', () => {
    for (const s of all) {
      expect(VERBS.some((v) => s.action.startsWith(`${v} `)), s.action).toBe(true);
      for (const text of [s.title, s.body, s.action]) {
        expect(text).not.toMatch(/[\u2014\u2013;!]/);
      }
      for (const sentence of s.body.split(/(?<=\.) /)) {
        expect(sentence.endsWith('.'), sentence).toBe(true);
        expect(sentence.split(' ').length, sentence).toBeLessThan(15);
        expect(sentence.split(',').length, sentence).toBeLessThanOrEqual(2);
      }
    }
    // The app tour is one sentence a step.
    for (const s of APP_TOUR) expect(s.body.split('. ').length).toBe(1);
  });
});

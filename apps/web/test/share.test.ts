import { describe, expect, it } from 'vitest';
import {
  dailyAlt,
  dailyGrid,
  dailyMark,
  dailyResultText,
  shareDeck,
  shareFileName,
  shareMessage,
  shareMode,
  type StreakCardData,
  streakAlt,
  streakShareText,
} from '../src/state/share';

describe('daily text result', () => {
  it('marks right, close and wrong like the result screen', () => {
    expect(dailyMark(1)).toBe('right');
    expect(dailyMark(1.2)).toBe('right');
    expect(dailyMark(0.5)).toBe('close');
    expect(dailyMark(0.01)).toBe('close');
    expect(dailyMark(0)).toBe('wrong');
  });

  it('draws one square per decision in order', () => {
    expect(dailyGrid([1, 0.5, 0, 1, 1])).toBe('🟩🟨⬛🟩🟩');
    expect(dailyGrid([])).toBe('');
  });

  it('builds a short Wordle style result with the link last', () => {
    const link = 'https://example.com/Felt/?ref=ABCD&daily=312';
    expect(dailyResultText(312, [1, 1, 0.5, 1, 1], link)).toBe(`Suited Daily #312 4/5\n🟩🟩🟨🟩🟩\n${link}`);
  });

  it('counts only full credit as right', () => {
    expect(dailyResultText(9, [0.5, 0.5, 0, 0, 0])).toBe('Suited Daily #9 0/5\n🟨🟨⬛⬛⬛');
    expect(dailyResultText(10, [1, 1, 1, 1, 1])).toBe('Suited Daily #10 5/5\n🟩🟩🟩🟩🟩');
  });

  it('never gives away a hand or an answer', () => {
    const text = dailyResultText(312, [1, 0, 0.5, 1, 0], 'https://example.com/');
    expect(text).not.toMatch(/[AKQJT2-9][shdc]|fold|call|raise|3bet/i);
    expect(text.split('\n')).toHaveLength(3);
  });

  it('reads the card aloud in words, not colors', () => {
    expect(dailyAlt(312, [1, 0.5, 0, 1, 1])).toBe('Daily challenge #312. 3 of 5 right. 1 right. 2 close. 3 not quite. 4 right. 5 right.');
  });
});

const week = (done: boolean[], frozen: number[] = []): StreakCardData['days'] =>
  done.map((d, i) => ({ label: 'MTWTFSS'[i], done: d, frozen: frozen.includes(i), today: i === done.length - 1 }));

describe('streak share', () => {
  it('says how many days in a row', () => {
    expect(streakShareText({ streak: 12, best: 20, days: week([true, true, true, true, true, true, true]) })).toBe("I've studied poker on Suited 12 days in a row.");
    expect(streakShareText({ streak: 1, best: 4, days: week([false, false, false, false, false, false, true]) })).toBe('I started a poker study streak on Suited.');
  });

  it('describes the card in words', () => {
    expect(streakAlt({ streak: 5, best: 9, days: week([false, true, true, false, true, true, true], [3]) })).toBe(
      '5 day streak. Longest streak 9 days. Studied on 5 of the last 7 days.',
    );
  });
});

describe('share mode', () => {
  const file = new File(['x'], 'card.png', { type: 'image/png' });
  const share = async () => {};

  it('shares the image when the browser can share files', () => {
    expect(shareMode({ share, canShare: () => true }, [file])).toBe('image');
  });

  it('falls back to text when files are not supported', () => {
    expect(shareMode({ share, canShare: () => false }, [file])).toBe('text');
    expect(shareMode({ share }, [file])).toBe('text');
    expect(shareMode({ share, canShare: () => true })).toBe('text');
    expect(
      shareMode(
        {
          share,
          canShare: () => {
            throw new Error('nope');
          },
        },
        [file],
      ),
    ).toBe('text');
  });

  it('copies when there is no share sheet at all', () => {
    expect(shareMode({}, [file])).toBe('copy');
    expect(shareMode(undefined)).toBe('copy');
  });

  it('puts the link on its own last line', () => {
    expect(shareMessage('Suited Daily #3 2/5\n🟩🟩⬛⬛⬛', 'https://x.test/')).toBe('Suited Daily #3 2/5\n🟩🟩⬛⬛⬛\nhttps://x.test/');
  });

  it('names files for what is on them', () => {
    expect(shareFileName('daily', 312)).toBe('suited-daily-312.png');
    expect(shareFileName('rating')).toBe('suited-rating.png');
    expect(shareFileName('streak')).toBe('suited-streak.png');
  });
});

describe('share deck', () => {
  const all = { rating: true, streak: true, daily: true };

  it('opens on the card asked for, in every design', () => {
    expect(shareDeck('daily', all)).toEqual([
      { kind: 'daily', design: 'felt' },
      { kind: 'daily', design: 'cobalt' },
      { kind: 'daily', design: 'paper' },
      { kind: 'rating', design: 'felt' },
      { kind: 'streak', design: 'felt' },
    ]);
    expect(shareDeck('streak', all).map((c) => c.kind)).toEqual(['streak', 'streak', 'streak', 'daily', 'rating']);
  });

  it('leaves out cards with nothing true to show', () => {
    expect(shareDeck('rating', { rating: true, streak: false, daily: false })).toEqual([
      { kind: 'rating', design: 'felt' },
      { kind: 'rating', design: 'cobalt' },
      { kind: 'rating', design: 'paper' },
    ]);
    expect(shareDeck('rating', { rating: false, streak: true, daily: false })[0]).toEqual({ kind: 'streak', design: 'felt' });
    expect(shareDeck('daily', { rating: false, streak: false, daily: false })).toEqual([]);
  });
});

/**
 * What goes on a share card and in a shared message. Pure functions only:
 * the canvas drawing lives in components/shareCards.ts and the sheet in
 * components/ShareSheet.tsx. Every number comes from the player's own
 * answers, and nothing here gives away a daily challenge answer.
 */

/** The Suited Rating card. */
export interface RatingCardData {
  name?: string;
  rating: number;
  /** Still settling: no tier yet, and the card says the number is rough. */
  settling: boolean;
  tier?: string;
  thinks?: string;
  answers: number;
  streak: number;
  /** Best settled rating, or 0 when there is none yet. */
  best: number;
  /** The rating after each answer, oldest first. */
  history: number[];
}

/** The streak card. Days run oldest first and end today. */
export interface StreakCardData {
  streak: number;
  best: number;
  days: { label: string; done: boolean; frozen: boolean; today: boolean }[];
}

/** The daily challenge card. Scores only: never the hands or the answers. */
export interface DailyCardData {
  number: number;
  scores: number[];
  /** A short date such as "Oct 16". */
  date?: string;
}

export type ShareKind = 'rating' | 'streak' | 'daily';

/** Rated decisions per daily challenge. */
export const DAILY_LENGTH = 5;

export type DailyMark = 'right' | 'close' | 'wrong';

/** Same thresholds as the result screen: full credit is right, part of the mix is close. */
export function dailyMark(score: number): DailyMark {
  return score >= 1 ? 'right' : score > 0 ? 'close' : 'wrong';
}

export const DAILY_SQUARES: Record<DailyMark, string> = { right: '🟩', close: '🟨', wrong: '⬛' };

/** The colored squares, one per decision, in order. */
export function dailyGrid(scores: readonly number[]): string {
  return scores.map((s) => DAILY_SQUARES[dailyMark(s)]).join('');
}

export const dailyRight = (scores: readonly number[]) => scores.filter((s) => dailyMark(s) === 'right').length;

/**
 * The Wordle style result: a title line, the squares and the link. Short
 * and spoiler free, so it can go anywhere.
 */
export function dailyResultText(number: number, scores: readonly number[], link?: string): string {
  const lines = [`Suited Daily #${number} ${dailyRight(scores)}/${scores.length}`, dailyGrid(scores)];
  if (link) lines.push(link);
  return lines.join('\n');
}

/** The daily card read aloud: the count first, then each decision in words. */
export function dailyAlt(number: number, scores: readonly number[]): string {
  const words: Record<DailyMark, string> = { right: 'right', close: 'close', wrong: 'not quite' };
  const each = scores.map((s, i) => `${i + 1} ${words[dailyMark(s)]}`).join('. ');
  return `Daily challenge #${number}. ${dailyRight(scores)} of ${scores.length} right. ${each}.`;
}

/**
 * The rating as the card shows it. A settled rating is the whole number. A
 * rating still settling is rounded to the nearest 10 and says "about", so a
 * rough number never looks exact.
 */
export function ratingFigure(rating: number, settling: boolean): { about: boolean; value: string } {
  return settling ? { about: true, value: String(Math.round(rating / 10) * 10) } : { about: false, value: String(Math.round(rating)) };
}

export function ratingShareText(d: RatingCardData): string {
  const { about, value } = ratingFigure(d.rating, d.settling);
  const first = about ? `My Suited Rating is about ${value}. It is still settling.` : `My Suited Rating is ${value}.`;
  const tier = !d.settling && d.tier ? ` My tier is ${d.tier}.` : '';
  const streak = d.streak > 1 ? ` I'm on a ${d.streak} day streak.` : '';
  return `${first}${tier}${streak}`;
}

export function streakShareText(d: StreakCardData): string {
  if (d.streak <= 0) return 'I study poker with Suited.';
  if (d.streak === 1) return 'I started a poker study streak on Suited.';
  return `I've studied poker on Suited ${d.streak} days in a row.`;
}

/** Days studied in the week strip. */
export const daysStudied = (d: StreakCardData) => d.days.filter((x) => x.done).length;

export function streakAlt(d: StreakCardData): string {
  return `${d.streak} day streak. Longest streak ${d.best} ${d.best === 1 ? 'day' : 'days'}. Studied on ${daysStudied(d)} of the last ${d.days.length} days.`;
}

/** Personal best counts settled points only, so early swings do not set a record. */
export const SETTLED_RD = 110;
export function bestSettled(history: readonly { rating: number; rd: number }[]): number {
  return Math.max(0, ...history.filter((p) => p.rd <= SETTLED_RD).map((p) => p.rating));
}

export type ShareMode = 'image' | 'text' | 'copy';

/** The parts of `navigator` that sharing needs, so the choice can be tested. */
export interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
}

/**
 * How the Share button sends a card: the image with its text when the
 * browser can share files, the text alone when it can share, and otherwise
 * a copy to the clipboard.
 */
export function shareMode(nav: ShareNavigator | undefined, files?: File[]): ShareMode {
  if (!nav || typeof nav.share !== 'function') return 'copy';
  if (files?.length && typeof nav.canShare === 'function') {
    try {
      if (nav.canShare({ files })) return 'image';
    } catch {
      // Some browsers throw on file data they do not support.
    }
  }
  return 'text';
}

/** The message that goes with a card. The link sits on its own last line, as in Wordle. */
export const shareMessage = (text: string, link: string) => `${text}\n${link}`;

export function shareFileName(kind: ShareKind, daily?: number): string {
  return kind === 'daily' && daily !== undefined ? `suited-daily-${daily}.png` : `suited-${kind}.png`;
}

/** Felt and paper are Card room. Cobalt is the chip set color for social posts (BRAND.md). */
export type CardDesign = 'felt' | 'paper' | 'cobalt';

/**
 * The cards in the carousel. The one the player asked for comes first in
 * every design, then the other cards they have, on the felt. A card only
 * shows up when there is something true to put on it.
 */
export function shareDeck(first: ShareKind, has: Record<ShareKind, boolean>): { kind: ShareKind; design: CardDesign }[] {
  const kinds = ([first, 'daily', 'rating', 'streak'] as ShareKind[]).filter((k, i, all) => has[k] && all.indexOf(k) === i);
  return kinds.flatMap((kind, i) =>
    i === 0
      ? [
          { kind, design: 'felt' as const },
          { kind, design: 'cobalt' as const },
          { kind, design: 'paper' as const },
        ]
      : [{ kind, design: 'felt' as const }],
  );
}

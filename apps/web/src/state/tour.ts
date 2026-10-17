import { useSyncExternalStore } from 'react';

/**
 * The first run tour and the one time tips, kept on this device. The tour
 * shows once on Today after onboarding: five coach marks on the main card and
 * the tabs. Tips show the first time a player opens a screen that needs one.
 * "Show the tour again" in Settings clears both.
 */

export type TipId = 'play' | 'ranges';

export interface TourProgress {
  /** How the app tour ended. Unset until it has been shown. */
  app?: 'done' | 'skipped';
  /** Tips already seen. */
  tips: Partial<Record<TipId, true>>;
}

export interface TourStep {
  /** CSS selector for what the mark points at. The first visible match wins. */
  target: string;
  title: string;
  /** One short sentence. */
  body: string;
  /** The main button. It starts with a verb. */
  action: string;
}

/** The app tour: the main card on Today, then each tab. */
export const APP_TOUR: TourStep[] = [
  { target: '[data-tour="today-main"]', title: 'Today', body: 'This card always shows your next step.', action: 'See Learn' },
  { target: '[data-tour="tab-learn"]', title: 'Learn', body: 'Short lessons teach one idea at a time.', action: 'See Train' },
  { target: '[data-tour="tab-train"]', title: 'Train', body: 'Review and challenges make each idea stick.', action: 'See Play' },
  { target: '[data-tour="tab-play"]', title: 'Play', body: 'Play full hands against bots and see your grades.', action: 'See You' },
  { target: '[data-tour="tab-you"]', title: 'You', body: 'Your Aced Rating and your settings live here.', action: 'Start learning' },
];

/** The first time at a Play table. */
export const PLAY_TIPS: TourStep[] = [
  { target: '.play-seat.me .play-plate', title: 'Your seat', body: 'You sit at the bottom with your cards and chips.', action: 'See the buttons' },
  { target: '.play-dock', title: 'Your turn', body: 'Your buttons show up here when it is your turn.', action: 'See Last hand' },
  { target: '.play-last-btn', title: 'Last hand', body: 'Open it after a hand to see how you played.', action: 'Start playing' },
];

/** The first time on the Ranges chart. */
export const RANGES_TIPS: TourStep[] = [
  { target: '.range-grid', title: 'Read the colors', body: 'Each square is a hand. Its color shows how often you play it. Gray means fold.', action: 'Explore the chart' },
];

const KEY = 'felt.tour.v1';
const EMPTY: TourProgress = { tips: {} };

/** Whether the app tour should start: after onboarding, once. */
export function shouldStartAppTour(p: TourProgress, profile: { onboarded: boolean }): boolean {
  return profile.onboarded && !p.app;
}

/** Whether a tip still has to be shown. */
export const tipPending = (p: TourProgress, id: TipId) => !p.tips[id];

/** The progress after the app tour ends, finished or skipped. */
export const endTour = (p: TourProgress, how: 'done' | 'skipped'): TourProgress => ({ ...p, app: how });

/** The progress after a tip has been seen. */
export const seeTip = (p: TourProgress, id: TipId): TourProgress => ({ ...p, tips: { ...p.tips, [id]: true } });

/**
 * The step after `step` in a tour of `count` steps, or undefined when the
 * tour is over. A tour never runs past five steps.
 */
export function nextStep(step: number, count: number): number | undefined {
  const last = Math.min(count, 5) - 1;
  return step < last ? step + 1 : undefined;
}

/** Reads saved progress. Bad or blocked storage reads as a fresh start. */
export function parseTour(raw: string | null | undefined): TourProgress {
  if (!raw) return EMPTY;
  try {
    const v = JSON.parse(raw) as Partial<TourProgress>;
    const app = v.app === 'done' || v.app === 'skipped' ? v.app : undefined;
    const tips: TourProgress['tips'] = {};
    for (const id of ['play', 'ranges'] as const) if (v.tips?.[id]) tips[id] = true;
    return { ...(app ? { app } : {}), tips };
  } catch {
    return EMPTY;
  }
}

function load(): TourProgress {
  try {
    return parseTour(localStorage.getItem(KEY));
  } catch {
    return EMPTY;
  }
}

let progress: TourProgress | undefined;
const listeners = new Set<() => void>();

export function getTour(): TourProgress {
  return (progress ??= load());
}

/** Saves progress. When storage is blocked it still holds for this visit, so a tour never loops. */
export function setTour(next: TourProgress) {
  progress = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: kept in memory for this visit.
  }
  for (const l of listeners) l();
}

/** Clears the tour and the tips, for "Show the tour again". */
export function resetTour() {
  setTour({ tips: {} });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTour(): TourProgress {
  return useSyncExternalStore(subscribe, getTour);
}

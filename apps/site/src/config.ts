/** Where the app lives. On acedpoker.app it is /app/; the Pages preview sets its own. */
export const APP_URL: string = import.meta.env.VITE_APP_URL ?? '/app/';
/** The Aced server, for the waitlist. Empty means same origin. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

/** Prices shown on the site. Keep in step with PLANS in apps/web/src/state/access.ts. */
export const PRICES = {
  yearly: 79.99,
  monthly: 14.99,
  trialDays: 7,
};

/**
 * Founding members: lifetime Pro for early players who give feedback. The cap
 * is real and enforced at checkout. `taken` stays null until checkout can
 * report a true count, and the page shows no count until then.
 */
export const FOUNDING = {
  price: 99,
  seats: 500,
  taken: null as number | null,
};

/** Real counts from the app's content. Update them when content ships. */
export const CONTENT = {
  lessons: 127,
  questions: 448,
  charts: 27,
  playerTypes: 8,
};

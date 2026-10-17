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
 * Founding members: Pro for as long as Aced runs, for early players who give
 * feedback. The price is the same as one year of Pro. The cap is real and
 * enforced at checkout by the server. `taken` stays null until the server
 * reports a true count (GET /api/billing/founding), and the page shows no
 * count until then. Keep in step with apps/web/src/state/access.ts.
 */
export const FOUNDING = {
  price: 79.99,
  seats: 500,
  taken: null as number | null,
};

/** Real counts from the app's content. Update them when content ships. */
export const CONTENT = {
  lessons: 154,
  questions: 529,
  charts: 163,
  playerTypes: 8,
};

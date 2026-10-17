/**
 * Social proof for the site. Quotes come from real players only.
 *
 * Every entry starts as a draft: copy written to show the layout and the kind
 * of quote we hope to earn. Drafts render in development with a "Sample"
 * label and never in a production build. When a beta tester gives a real
 * quote (with permission to use their name or initials and city), replace the
 * draft text and set `draft: false`.
 */
export interface Quote {
  text: string;
  name: string;
  detail: string;
  draft: boolean;
}

export const QUOTES: Quote[] = [
  {
    text: 'I play 1/2 twice a week. A month in, my preflop mistakes are mostly gone. The practice table is the part I did not know I needed.',
    name: 'Marcus T.',
    detail: 'Live 1/2, Houston',
    draft: true,
  },
  {
    text: 'It finally teaches the why. I used to memorize charts and forget them by Friday.',
    name: 'Priya S.',
    detail: 'Online micro stakes, Toronto',
    draft: true,
  },
  {
    text: 'The daily challenge is my coffee routine now. Our group chat compares scores every morning.',
    name: 'Dan K.',
    detail: 'Home game host, Leeds',
    draft: true,
  },
  {
    text: 'I came back after eight years away. Placement skipped what I knew and showed me how much had changed.',
    name: 'Rob M.',
    detail: 'Back at the tables, Melbourne',
    draft: true,
  },
  {
    text: 'Grading every decision is humbling and great. It found leaks in my 3bet pots I never noticed.',
    name: 'Jess L.',
    detail: 'Live 2/5, Las Vegas',
    draft: true,
  },
  {
    text: 'Five minutes on a break between sessions. It adds up faster than I expected.',
    name: 'Chris O.',
    detail: 'Live 1/2, Dublin',
    draft: true,
  },
];

/** The quotes a build may show: real ones always, drafts only outside production. */
export function visibleQuotes(quotes: readonly Quote[], production: boolean): Quote[] {
  return quotes.filter((q) => !q.draft || !production);
}

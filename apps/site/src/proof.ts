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

/**
 * A short note from the founder. The founder stays anonymous on the site: no
 * name, no initial and no photo. Every sentence must be true, so it starts as a
 * draft that only shows outside production. The founder confirms the words,
 * then sets `draft: false`.
 */
export interface FounderNote {
  lines: string[];
  signoff: string;
  draft: boolean;
}

export const FOUNDER_NOTE: FounderNote = {
  lines: [
    'I play live cash in Canada.',
    "The hands that bugged me most came down to one decision I wasn't sure about.",
    'I built Aced so I could check those decisions on a break, in plain words.',
    "It's the coach I wanted at the table. I hope it helps your game too.",
  ],
  signoff: 'The founder of Aced',
  draft: true,
};

/** The founder note a build may show: a confirmed note always, a draft only outside production. */
export function visibleFounderNote(note: FounderNote, production: boolean): FounderNote | undefined {
  return note.draft && production ? undefined : note;
}

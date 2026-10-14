/**
 * Poker terms in plain words. Every abbreviation and piece of jargon a
 * lesson uses is here (the content tests enforce it), so the app can explain
 * any term wherever it appears: tap an underlined term for its meaning, or
 * browse them all on the Glossary page.
 */
export interface GlossaryTerm {
  id: string;
  /** How the term is written, like "TAG" or "pot odds". */
  term: string;
  /** Other ways a lesson writes it, like "TAGs" or "tight aggressive". */
  aliases?: string[];
  /** One or two short plain sentences. */
  short: string;
  /** The lesson that teaches it, when one does. */
  lesson?: string;
  /**
   * False for everyday words a reader meets in the first lesson (pot, fold).
   * They stay on the Glossary page but are not underlined in lessons.
   */
  link?: boolean;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'tag',
    term: 'TAG',
    aliases: ['TAGs', 'tight aggressive'],
    short: 'Tight aggressive. A player who plays few hands and usually enters by raising.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'lag',
    term: 'LAG',
    aliases: ['LAGs', 'loose aggressive'],
    short: 'Loose aggressive. A player who plays many hands and raises and bets a lot.',
    lesson: 'exploit/profiling/archetypes',
  },
];

const byId = new Map(GLOSSARY.map((t) => [t.id, t]));
export const glossaryTerm = (id: string) => byId.get(id);

/** Abbreviations match only in capitals ("TAG", not "tag"); words match in any case. */
const isAbbreviation = (s: string) => /^[A-Z0-9+/]+s?$/.test(s) && /[A-Z]/.test(s);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

interface Spelling {
  text: string;
  id: string;
}

function spellings(linkedOnly: boolean): Spelling[] {
  return GLOSSARY.filter((t) => !linkedOnly || t.link !== false)
    .flatMap((t) => [t.term, ...(t.aliases ?? [])].map((text) => ({ text, id: t.id })))
    .sort((a, b) => b.text.length - a.text.length);
}

let cached: { linked: boolean; re: RegExp; lookup: Map<string, string>; exact: Map<string, string> } | undefined;

function matcher(linkedOnly: boolean) {
  if (cached && cached.linked === linkedOnly) return cached;
  const all = spellings(linkedOnly);
  // Longest first, so "pot odds" wins over "pot". Word edges keep "TAG" out of "TAGGED" and "bet" out of "better".
  const re = new RegExp(`(?<![A-Za-z0-9])(${all.map((s) => escape(s.text)).join('|')})(?![A-Za-z0-9])`, 'gi');
  const exact = new Map(all.filter((s) => isAbbreviation(s.text)).map((s) => [s.text, s.id]));
  const lookup = new Map(all.filter((s) => !isAbbreviation(s.text)).map((s) => [s.text.toLowerCase(), s.id]));
  cached = { linked: linkedOnly, re, lookup, exact };
  return cached;
}

export interface TermMatch {
  start: number;
  end: number;
  id: string;
}

/**
 * Glossary terms in a piece of text, in order and without overlaps.
 * `linkedOnly` skips everyday words that are not underlined in lessons.
 */
export function findTerms(text: string, { linkedOnly = true }: { linkedOnly?: boolean } = {}): TermMatch[] {
  if (GLOSSARY.length === 0) return [];
  const { re, lookup, exact } = matcher(linkedOnly);
  const out: TermMatch[] = [];
  for (const m of text.matchAll(re)) {
    const found = m[1];
    const id = exact.get(found) ?? (isAbbreviation(found) ? undefined : lookup.get(found.toLowerCase()));
    if (id) out.push({ start: m.index!, end: m.index! + found.length, id });
  }
  return out;
}

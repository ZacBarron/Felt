import { parseCards } from '@felt/core';
import { CURRICULUM, LESSON_CONTENT, lessonKey, type LessonStep } from '../src';

/**
 * Tags every lesson question by the spot it asks about, so docs/research/lesson-audit.md
 * can count what the lessons cover. Tags come from the question's own words and
 * cards, not its explanation, which often names other seats for contrast.
 * Keyword tagging is rough by design: it counts what a player reads.
 */

type Quiz = Extract<LessonStep, { kind: 'quiz' }>;

export const POSITIONS = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'Straddle'] as const;
export const POT_TYPES = ['Single raised', '3bet', '4bet', 'Limped', 'Multiway', 'Straddled', 'No pot (math or concept)'] as const;
export const STREETS = ['Preflop', 'Flop', 'Turn', 'River', 'No street'] as const;
export const DEPTHS = ['Under 50bb', '50 to 99bb', '100bb', 'Over 100bb', 'Not stated'] as const;
export const TABLES = ['Heads up', '6-max', 'Full ring', 'Not stated'] as const;

export interface QuestionTags {
  key: string;
  track: string;
  module: string;
  positions: string[];
  pot: string[];
  street: string;
  depth: string;
  table: string;
}

const has = (text: string, re: RegExp) => re.test(text);

export function tagQuestion(key: string, q: Pick<Quiz, 'question' | 'board' | 'cards'>): QuestionTags {
  const text = q.question;
  const [track, module] = key.split('/');
  const positions: string[] = [];
  if (has(text, /\bUTG\+1\b/)) positions.push('UTG+1');
  if (has(text, /\bUTG\+2\b/)) positions.push('UTG+2');
  if (has(text, /\bUTG(?!\+)\b|under the gun/i)) positions.push('UTG');
  if (has(text, /\bLJ\b|lojack/i)) positions.push('LJ');
  if (has(text, /\bHJ\b|hijack/i)) positions.push('HJ');
  if (has(text, /\bCO\b|cutoff/i)) positions.push('CO');
  if (has(text, /\bBTN\b|button/i)) positions.push('BTN');
  if (has(text, /\bSB\b|small blind/i)) positions.push('SB');
  if (has(text, /\bBB\b|big blind/i)) positions.push('BB');
  if (has(text, /straddl/i)) positions.push('Straddle');

  const pot: string[] = [];
  if (has(text, /\b[45]bet|cold 4bet/i)) pot.push('4bet');
  else if (has(text, /\b3bet|squeez/i)) pot.push('3bet');
  if (has(text, /\blimp/i)) pot.push('Limped');
  if (has(text, /multiway|three way|four way|\b[34] way|\b[2-9] (?:players|opponents|callers)|two (?:players|opponents|callers)|three (?:players|opponents)|\bboth\b.*\bcall|calls? (?:and|then) .* calls?/i)) pot.push('Multiway');
  if (has(text, /straddl/i)) pot.push('Straddled');
  if (pot.length === 0 && has(text, /\bopens?\b|raises?\b|c-bet|\bbets?\b|calls?\b|\bpot\b|\bflop\b|\bturn\b|\briver\b/i) && positions.length > 0) pot.push('Single raised');
  if (pot.length === 0) pot.push('No pot (math or concept)');

  const boardCards = q.board ? parseCards(q.board).length : 0;
  const street =
    boardCards === 5 || has(text, /\briver\b/i) ? 'River'
    : boardCards === 4 || has(text, /\bturn\b(?! card)/i) ? 'Turn'
    : boardCards === 3 || has(text, /\bflop\b|c-bet/i) ? 'Flop'
    : has(text, /preflop|\bopens?\b|3bet|4bet|limp|squeez|folds? to you|iso raise|straddl|steal/i) ? 'Preflop'
    : 'No street';

  // "100bb deep", "60bb stacks", "Stacks are 40bb", "with 150bb", "At 200bb", "You have 120bb".
  const bb = [...text.matchAll(/(\d+)\s?bb (?:deep|stacks?|effective)|(?:stacks? (?:are|of)|with|\bat|you have) (\d+)bb\b/gi)].map((m) => Number(m[1] ?? m[2]));
  const d = bb.length ? Math.max(...bb) : undefined;
  const depth = d === undefined ? 'Not stated' : d < 50 ? 'Under 50bb' : d < 100 ? '50 to 99bb' : d === 100 ? '100bb' : 'Over 100bb';

  const table = has(text, /heads up/i) ? 'Heads up' : has(text, /6-max|six max/i) ? '6-max' : has(text, /full ring|9-handed|10-handed|8-handed/i) ? 'Full ring' : 'Not stated';
  return { key, track, module, positions, pot, street, depth, table };
}

type QuizWithVariants = Quiz & { variants?: Partial<Quiz>[] };

/** Every question in curriculum order, plus each extra variant it can show. */
export function auditQuestions(): { base: QuestionTags[]; variants: QuestionTags[] } {
  const base: QuestionTags[] = [];
  const variants: QuestionTags[] = [];
  for (const t of CURRICULUM)
    for (const m of t.modules)
      for (const l of m.lessons) {
        const key = lessonKey(t.id, m.id, l.id);
        for (const s of LESSON_CONTENT.get(key)?.steps ?? []) {
          if (s.kind !== 'quiz') continue;
          const q = s as QuizWithVariants;
          base.push(tagQuestion(key, q));
          for (const v of q.variants ?? []) variants.push(tagQuestion(key, { ...q, ...v }));
        }
      }
  return { base, variants };
}

export function countBy<T extends string>(rows: QuestionTags[], pick: (r: QuestionTags) => string[], labels: readonly T[]): Record<T, number> {
  const out = Object.fromEntries(labels.map((l) => [l, 0])) as Record<T, number>;
  for (const r of rows) for (const v of pick(r)) if (v in out) out[v as T]++;
  return out;
}

/** The whole audit as markdown tables, for docs/research/lesson-audit.md. */
export function auditMarkdown(): string {
  const { base, variants } = auditQuestions();
  const all = [...base, ...variants];
  const lessons = [...LESSON_CONTENT.values()];
  const lines: string[] = [];
  const table = (title: string, labels: readonly string[], a: Record<string, number>, b: Record<string, number>) => {
    lines.push(`### ${title}`, '', '| | Questions | With variants |', '| --- | ---: | ---: |');
    for (const l of labels) lines.push(`| ${l} | ${a[l]} | ${b[l]} |`);
    lines.push('');
  };
  lines.push(`Lessons: ${lessons.length}. Questions: ${base.length}. Extra variants: ${variants.length}.`, '');
  lines.push('### By track and topic', '', '| Topic | Lessons | Questions |', '| --- | ---: | ---: |');
  for (const t of CURRICULUM)
    for (const m of t.modules) {
      const n = base.filter((r) => r.track === t.id && r.module === m.id).length;
      lines.push(`| ${t.id}/${m.id} | ${m.lessons.length} | ${n} |`);
    }
  lines.push('');
  lines.push('### Lessons by the spot they focus on', '', '| Focus | Lessons |', '| --- | ---: |');
  for (const [label, n] of Object.entries(lessonFocus())) lines.push(`| ${label} | ${n} |`);
  lines.push('');
  table('By position named in the question', POSITIONS, countBy(base, (r) => r.positions, POSITIONS), countBy(all, (r) => r.positions, POSITIONS));
  table('By pot type', POT_TYPES, countBy(base, (r) => r.pot, POT_TYPES), countBy(all, (r) => r.pot, POT_TYPES));
  table('By street', STREETS, countBy(base, (r) => [r.street], STREETS), countBy(all, (r) => [r.street], STREETS));
  table('By stack depth stated', DEPTHS, countBy(base, (r) => [r.depth], DEPTHS), countBy(all, (r) => [r.depth], DEPTHS));
  table('By table size stated', TABLES, countBy(base, (r) => [r.table], TABLES), countBy(all, (r) => [r.table], TABLES));
  return lines.join('\n');
}

/** Lessons whose title names a spot, by keyword. A lesson can count twice. */
export function lessonFocus(): Record<string, number> {
  const titles = CURRICULUM.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => `${t.id}/${m.id} ${l.title}`)));
  const count = (re: RegExp) => titles.filter((t) => re.test(t)).length;
  return {
    '3bet pots (title says 3bet or squeeze)': count(/3bet|squeez/i),
    '4bet pots (title says 4bet)': count(/4bet/i),
    'Defending an open (BB, SB, cold calls, overcalls)': count(/defen|big blind against|small blind facing|cold call|overcall|flatting|against an early open|against early/i),
    'Blind vs blind': count(/blind vs blind|small blind against|big blind against a small/i),
    'Limped pots': count(/limp/i),
    'Straddled pots': count(/straddl/i),
    'Multiway': count(/multiway|overcall|squeez/i),
  };
}

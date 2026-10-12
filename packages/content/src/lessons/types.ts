/**
 * Lesson content types. Each lesson is a short sequence of steps: one idea per
 * screen, a visual wherever it helps, and quick checks that grade instantly.
 * Keys match the curriculum: `${trackId}/${moduleId}/${lessonId}`.
 *
 * Accuracy is the product. Steps that state facts can carry `evidence`:
 * - `math`: exact, derived from the rules or arithmetic.
 * - `solver`: how equilibrium strategies tend to play; directional, and
 *   approximate until Felt's own solver packs back each claim with numbers.
 * - `exploit`: an assumption about a player pool, to verify with your logs.
 * Text supports **bold** for emphasis.
 */

export type Evidence = 'math' | 'solver' | 'exploit';

export interface Reading {
  author: string;
  title: string;
  year: number;
}

export type LessonCover = { kind: 'figure'; text: string } | { kind: 'chart'; chartId: string } | { kind: 'cards'; cards: string };

export type LessonStep =
  | { kind: 'intro'; title: string; body: string }
  | { kind: 'text'; title: string; body: string[]; evidence?: Evidence }
  | { kind: 'formula'; title: string; formula: string; parts?: [string, string][]; example: string }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][]; note?: string; evidence?: Evidence }
  | { kind: 'chart'; chartId: string; title: string; caption: string; highlight?: string[] }
  | { kind: 'hand'; title: string; cards: string; board?: string; caption: string }
  | { kind: 'board'; title: string; board: string; caption: string; evidence?: Evidence }
  | { kind: 'callout'; tone: 'tip' | 'exploit' | 'theory'; title: string; body: string }
  | { kind: 'quiz'; question: string; choices: string[]; answer: number; explain: string }
  | { kind: 'takeaway'; points: string[] };

export interface LessonContent {
  key: string;
  minutes: number;
  cover: LessonCover;
  steps: LessonStep[];
  /** Charts to drill after the lesson. */
  practice?: string[];
  level: 'core' | 'advanced';
  /** Books that cover the same ground in more depth. */
  reading?: Reading[];
}


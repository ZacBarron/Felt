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

export type ArtTone = 'brass' | 'green' | 'red' | 'gray' | 'purple';

/**
 * Illustrations for lesson covers and `visual` steps, drawn by the app in the
 * brand style. Every number in one must be exact or come from a chart.
 */
export type LessonArt =
  /** A key number, set large. Use only when no picture says it better. */
  | { kind: 'figure'; text: string; caption?: string }
  /** A chart's 13x13 grid. */
  | { kind: 'chart'; chartId: string }
  /** Hole cards, optionally with a board on the felt. */
  | { kind: 'cards'; cards: string; board?: string }
  /** A share of a whole, like 25% to call: `value` from 0 to 1. */
  | { kind: 'ring'; value: number; label: string; caption?: string }
  /** Amounts side by side, like pot vs bet, in big blinds or percent. */
  | { kind: 'bars'; bars: { label: string; value: number; tone?: ArtTone }[]; unit?: 'bb' | '%' }
  /** A table seen from above: seats by name, the button, a hero seat and highlights. */
  | { kind: 'table'; seats: number; button?: string; hero?: string; highlight?: string[]; note?: string }
  /** The order of a hand: preflop, flop, turn, river, showdown, with one active. */
  | { kind: 'streets'; active?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' }
  /** Hand rankings from best to worst, each with example cards. */
  | { kind: 'ladder'; rungs: { name: string; cards: string; tone?: ArtTone }[] }
  /** Chip stacks with labels, like stack sizes in big blinds. */
  | { kind: 'chips'; stacks: { label: string; bb: number }[] }
  /** One decision branching into outcomes, like the parts of an EV sum. */
  | { kind: 'tree'; root: string; branches: { label: string; value?: string; tone?: ArtTone }[] }
  /** A simple line, like required equity as the bet grows. Points are [x, y]. */
  | { kind: 'curve'; points: [number, number][]; xLabel: string; yLabel: string; mark?: [number, number] };

export type LessonCover = LessonArt;

export type LessonStep =
  | { kind: 'intro'; title: string; body: string }
  | { kind: 'text'; title: string; body: string[]; evidence?: Evidence }
  | { kind: 'formula'; title: string; formula: string; parts?: [string, string][]; example: string }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][]; note?: string; evidence?: Evidence }
  | { kind: 'chart'; chartId: string; title: string; caption: string; highlight?: string[] }
  | { kind: 'hand'; title: string; cards: string; board?: string; caption: string }
  | { kind: 'board'; title: string; board: string; caption: string; evidence?: Evidence }
  | { kind: 'callout'; tone: 'tip' | 'exploit' | 'theory'; title: string; body: string }
  | { kind: 'visual'; title: string; art: LessonArt; caption: string; evidence?: Evidence }
  | {
      kind: 'quiz';
      question: string;
      choices: string[];
      answer: number;
      explain: string;
      /** Cards to show above the question, like your hand. */
      cards?: string;
      board?: string;
      /** Cards for each choice, shown as card faces, in the same order as `choices`. */
      choiceCards?: string[];
    }
  | { kind: 'takeaway'; points: string[] };

export interface LessonContent {
  key: string;
  minutes: number;
  cover: LessonCover;
  steps: LessonStep[];
  /** Charts to drill after the lesson. */
  practice?: string[];
  level: 'core' | 'advanced';
}


/**
 * Lesson content types. Each lesson is a short sequence of steps: one idea per
 * screen, a visual wherever it helps, and quick checks that grade instantly.
 * Keys match the curriculum: `${trackId}/${moduleId}/${lessonId}`.
 *
 * Accuracy is the product. Steps that state facts can carry `evidence`:
 * - `math`: exact, derived from the rules or arithmetic.
 * - `solver`: how equilibrium strategies tend to play; directional, and
 *   approximate until Aced's own solver packs back each claim with numbers.
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
  | { kind: 'curve'; points: [number, number][]; xLabel: string; yLabel: string; mark?: [number, number] }
  /**
   * Running results of `paths` simulated players who share one true win rate
   * (bb/100) and SD per 100 hands, over `hands` hands, with the band where 95%
   * of results land. Drawn from `seed` by simulateResults in @felt/core with
   * its default 100 steps, so tests see the same paths. The picture always
   * says it is simulated from the model.
   */
  | { kind: 'paths'; winRate: number; sd100: number; hands: number; paths: number; seed: number; unit?: 'bb' | 'buy ins' };

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
      /**
       * Which point of the lesson's takeaway this question reinforces (index
       * into its points). Shown after the answer as "Remember", so every
       * question ties back to something the lesson taught.
       */
      point?: number;
      /**
       * Other versions of the same question: another seat, hand, board, size
       * or stack depth, each with its own correct answer. A seeded pick shows
       * one (see `quizVersion`), so a replay or a review card is not the same
       * question twice. Tests check every version like the question itself.
       */
      variants?: QuizVariant[];
      /**
       * Deal the cards in a seeded set of suits. Suits are symmetric, so the
       * answer never changes. Only for questions whose words name no suit.
       */
      shuffleSuits?: boolean;
    }
  | { kind: 'takeaway'; points: string[] };

/** What one version of a question changes. Fields left out keep the base question's. */
export interface QuizVariant {
  question?: string;
  choices?: string[];
  answer?: number;
  explain?: string;
  cards?: string;
  board?: string;
  choiceCards?: string[];
}

/** The points a lesson asks the player to remember: its takeaway. */
export function lessonPoints(lesson: Pick<LessonContent, 'steps'>): string[] {
  const t = lesson.steps.find((s): s is Extract<LessonStep, { kind: 'takeaway' }> => s.kind === 'takeaway');
  return t?.points ?? [];
}

export interface LessonContent {
  key: string;
  minutes: number;
  cover: LessonCover;
  steps: LessonStep[];
  /** Charts to drill after the lesson. */
  practice?: string[];
  level: 'core' | 'advanced';
}


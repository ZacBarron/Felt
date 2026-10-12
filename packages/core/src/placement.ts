/**
 * Placement and test outs.
 *
 * A player can skip material they already know by answering questions drawn
 * from the lessons themselves. A lesson is skipped only when every one of its
 * questions is answered correctly; any miss sends that lesson back to the
 * path in full. Placement walks modules in teaching order and stops at the
 * first module the player does not clear, the way a level test finds where
 * to start.
 */

export interface CheckQuestion {
  /** Lesson the question comes from. */
  lessonKey: string;
  /** Index of the quiz step inside that lesson, so it can be looked up again. */
  step: number;
}

export interface CheckLesson {
  key: string;
  /** Step indices of the lesson's quizzes, in order. */
  quizSteps: number[];
}

/**
 * Questions for a test out. Takes up to `perLesson` quizzes from each lesson,
 * starting with the last one (it usually checks the lesson's main idea) and
 * then the first.
 */
export function checkpointQuestions(lessons: readonly CheckLesson[], perLesson = 2): CheckQuestion[] {
  const out: CheckQuestion[] = [];
  for (const lesson of lessons) {
    const q = lesson.quizSteps;
    if (q.length === 0) continue;
    const picks = [q[q.length - 1], q[0], ...q.slice(1, -1)];
    const unique = [...new Set(picks)].slice(0, perLesson);
    for (const step of unique.sort((a, b) => a - b)) out.push({ lessonKey: lesson.key, step });
  }
  return out;
}

export interface CheckResult {
  /** Lessons where every question was right: safe to skip. */
  passed: string[];
  /** Lessons with at least one miss: learn these in full. */
  failed: string[];
  correct: number;
  total: number;
}

export function scoreCheckpoint(questions: readonly CheckQuestion[], correct: readonly boolean[]): CheckResult {
  if (correct.length !== questions.length) throw new Error('One answer per question');
  const byLesson = new Map<string, boolean>();
  questions.forEach((q, i) => byLesson.set(q.lessonKey, (byLesson.get(q.lessonKey) ?? true) && correct[i]));
  const passed = [...byLesson].filter(([, ok]) => ok).map(([k]) => k);
  const failed = [...byLesson].filter(([, ok]) => !ok).map(([k]) => k);
  return { passed, failed, correct: correct.filter(Boolean).length, total: questions.length };
}

/** Share of questions right needed to clear a module during placement. */
export const PLACEMENT_PASS = 0.75;

export interface PlacementModule {
  id: string;
  lessons: CheckLesson[];
}

export interface PlacementState {
  modules: PlacementModule[];
  /** Module being tested. */
  index: number;
  questions: CheckQuestion[];
  answers: boolean[];
  /** Lessons cleared so far. */
  passed: string[];
  /** Modules cleared so far. */
  cleared: string[];
  done: boolean;
  /** Module where the player should start, once done. Undefined when everything was cleared. */
  placedAt?: string;
}

export function startPlacement(modules: readonly PlacementModule[], perLesson = 1): PlacementState {
  const usable = modules.filter((m) => checkpointQuestions(m.lessons, perLesson).length > 0);
  return advance({ modules: usable, index: -1, questions: [], answers: [], passed: [], cleared: [], done: false }, perLesson);
}

function advance(state: PlacementState, perLesson: number): PlacementState {
  const index = state.index + 1;
  if (index >= state.modules.length) return { ...state, index, questions: [], answers: [], done: true, placedAt: undefined };
  return { ...state, index, questions: checkpointQuestions(state.modules[index].lessons, perLesson), answers: [] };
}

/** Records one answer. When a module's questions are all answered, it is scored and placement moves on or stops. */
export function answerPlacement(state: PlacementState, correct: boolean, perLesson = 1): PlacementState {
  if (state.done) return state;
  const answers = [...state.answers, correct];
  const next = { ...state, answers };
  if (answers.length < state.questions.length) return next;
  const result = scoreCheckpoint(state.questions, answers);
  const module = state.modules[state.index];
  const share = result.correct / result.total;
  if (share < PLACEMENT_PASS) {
    // Keep the lessons proven inside the failed module too: they are known.
    return { ...next, passed: [...state.passed, ...result.passed], done: true, placedAt: module.id };
  }
  return advance({ ...next, passed: [...state.passed, ...result.passed], cleared: [...state.cleared, module.id] }, perLesson);
}

/** Questions answered so far and the most placement could still ask, for a progress bar. */
export function placementProgress(state: PlacementState): { answered: number; remainingMax: number } {
  const answeredBefore = state.modules
    .slice(0, Math.max(0, state.index))
    .reduce((n, m) => n + checkpointQuestions(m.lessons, 1).length, 0);
  const remaining = state.modules.slice(state.index).reduce((n, m) => n + checkpointQuestions(m.lessons, 1).length, 0);
  return { answered: answeredBefore + state.answers.length, remainingMax: remaining - state.answers.length };
}

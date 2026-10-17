import { CURRICULUM, type LessonStep } from '@felt/content';
import {
  answerPlacement,
  type CheckQuestion,
  type CheckResult,
  checkpointQuestions,
  type PlacementModule,
  type PlacementState,
  placementProgress,
  scoreCheckpoint,
  startPlacement,
} from '@felt/core';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { StepView } from '../lesson/StepView';
import { canOpenLesson } from '../state/access';
import { track, track as logEvent } from '../state/events';
import { clearPlacement, loadPlacement, savePlacement } from '../state/placementProgress';
import { recordLessonQuiz } from '../state/rating';
import { entryFor, freshSeed, LESSON_ENTRIES, lessonPath, markTested, moduleEntries, quizAt, quizSteps } from '../state/lessons';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, CloseIcon, LockIcon } from '../ui/icons';
import { plural } from '../ui/format';
import { ProgressRing } from '../ui/ProgressRing';
import { Toggle } from '../ui/Toggle';
import { useBodyClass } from '../ui/useBodyClass';

type Quiz = Extract<LessonStep, { kind: 'quiz' }>;

function quizFor(q: CheckQuestion, seed: number): Quiz {
  const step = quizAt(q.lessonKey, q.step, seed);
  if (!step) throw new Error(`No quiz at ${q.lessonKey} step ${q.step}`);
  return step;
}

/** One question at a time with instant feedback, the same look as a lesson. */
function QuestionScreen({
  question,
  progress,
  onClose,
  onDone,
  closeLabel = 'Stop the quiz',
}: {
  question: CheckQuestion;
  progress: number;
  onClose: () => void;
  onDone: (correct: boolean) => void;
  /** Shown on the close button, e.g. that the place is saved. */
  closeLabel?: string;
}) {
  const [choice, setChoice] = useState<number>();
  const [seed] = useState(freshSeed);
  const quiz = quizFor(question, seed);
  const entry = entryFor(question.lessonKey);
  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label={closeLabel} onClick={onClose}>
          <CloseIcon size={18} />
        </button>
        <div className="check-bar lesson-progress" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      </div>
      <div key={`${question.lessonKey}:${question.step}`} className="lesson-stage from-right">
        <div className="lesson-kicker check-source">
          {entry?.moduleTitle}, {entry?.title}
        </div>
        <StepView step={quiz} answered={choice} onAnswer={setChoice} />
      </div>
      <BottomBar>
        <button
          className="btn btn-primary btn-lg btn-block"
          disabled={choice === undefined}
          onClick={() => {
            void recordLessonQuiz(question.lessonKey, question.step, choice === quiz.answer, 'check');
            onDone(choice === quiz.answer);
          }}
        >
          {choice === undefined ? 'Choose an answer' : 'Next question'}
        </button>
        {choice === undefined && (
          // Guessing among three answers adds noise to a test that decides what to skip. An honest "not sure" keeps the lesson in the plan.
          <button className="btn btn-plain btn-block" onClick={() => onDone(false)}>
            Not sure, keep this lesson
          </button>
        )}
      </BottomBar>
    </div>
  );
}

function moduleTitle(id: string) {
  const [t, m] = id.split('/');
  return CURRICULUM.find((x) => x.id === t)?.modules.find((x) => x.id === m)?.title;
}

function minutesOf(keys: readonly string[]) {
  return keys.reduce((m, k) => m + (entryFor(k)?.content?.minutes ?? 0), 0);
}

/** What the quiz found: lessons passed and lessons to learn, with the next step. */
function Results({ title, result, back }: { title: string; result: CheckResult; back: string }) {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const toLearn = result.failed.map((k) => entryFor(k)!).filter(Boolean);
  const first = toLearn[0];
  const locked = first && !canOpenLesson(first.key, settings.access);
  const saved = minutesOf(result.passed);
  return (
    <div className="stack focus-column lesson-done">
      <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.25rem', gap: '0.9rem' }}>
        <ProgressRing value={result.correct / Math.max(1, result.total)} size={116} stroke={11} label={`${result.correct} of ${result.total} right`}>
          <span className="display num" style={{ fontSize: '2rem' }} aria-hidden="true">
            {result.correct}/{result.total}
          </span>
        </ProgressRing>
        <div>
          <div className="done-kicker">{title}</div>
          <h1 className="display" style={{ fontSize: '2.2rem', fontWeight: 400, lineHeight: 1.05 }}>
            {toLearn.length === 0 ? 'You know this' : `${plural(toLearn.length, 'lesson')} to learn`}
          </h1>
        </div>
        {result.passed.length > 0 && (
          <div className="pill pill-good num">
            {plural(result.passed.length, 'lesson')} passed, {saved} min saved
          </div>
        )}
      </div>
      {toLearn.length > 0 && (
        <section>
          <h2 className="section-title">Learn these</h2>
          <div className="list">
            {toLearn.map((e) => (
              <Link key={e.key} to={lessonPath(e.key)} className="list-row">
                <span className="grow">
                  <span className="row-title">{e.title}</span>
                  <span className="row-sub">
                    {e.moduleTitle}, {e.content?.minutes} min
                  </span>
                </span>
                {!canOpenLesson(e.key, settings.access) && <LockIcon size={17} className="muted" />}
              </Link>
            ))}
          </div>
        </section>
      )}
      {result.passed.length > 0 && (
        <section>
          <h2 className="section-title">Passed</h2>
          <div className="list">
            {result.passed.map((k) => (
              <div key={k} className="list-row">
                <CheckIcon size={17} style={{ color: 'var(--green)' }} />
                <span className="grow">{entryFor(k)?.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <BottomBar>
        {first ? (
          <button className="btn btn-primary btn-lg btn-block swap-in" onClick={() => navigate(locked ? `/pro?from=check` : lessonPath(first.key))}>
            {locked ? `Unlock ${toLearn.length === 1 ? 'this lesson' : `these ${toLearn.length} lessons`}` : toLearn.length === 1 ? 'Start this lesson' : 'Start the first lesson'}
          </button>
        ) : (
          <Link to={back} className="btn btn-primary btn-lg btn-block swap-in">
            Continue
          </Link>
        )}
        {locked && (
          // The free path stays open: lessons you passed are marked, and Learn has the free lessons.
          <Link to={back} className="btn btn-plain btn-block">
            Back to Learn
          </Link>
        )}
      </BottomBar>
    </div>
  );
}

/** Skip ahead past one lesson (all its questions) or a whole module (two per lesson) by passing a quiz. */
export function CheckPage() {
  useBodyClass('focus-mode');
  const { track = '', module = '', lesson } = useParams();
  const navigate = useNavigate();
  const trackDef = CURRICULUM.find((t) => t.id === track);
  const moduleDef = trackDef?.modules.find((m) => m.id === module);
  const entries = moduleEntries(track, module).filter((e) => e.content && (!lesson || e.key.endsWith(`/${lesson}`)));
  const questions = useMemo(
    () => checkpointQuestions(entries.map((e) => ({ key: e.key, quizSteps: quizSteps(e) })), lesson ? 99 : 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [track, module, lesson],
  );
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [result, setResult] = useState<CheckResult>();
  useEffect(() => {
    if (moduleDef && questions.length) logEvent('check_started', { module: `${track}/${module}`, lesson });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, module, lesson]);

  if (!moduleDef || questions.length === 0) {
    return (
      <div className="stack focus-column" style={{ paddingTop: '3rem' }}>
        <p className="muted">There is no quiz here yet.</p>
        <Link to="/learn" className="btn">
          Back to Learn
        </Link>
      </div>
    );
  }

  const title = lesson ? (entries[0]?.title ?? moduleDef.title) : moduleDef.title;
  if (result) return <Results title={title} result={result} back="/learn" />;

  const onDone = (correct: boolean) => {
    const next = [...answers, correct];
    setAnswers(next);
    window.scrollTo({ top: 0 });
    if (next.length < questions.length) return;
    const scored = scoreCheckpoint(questions, next);
    void markTested(scored.passed);
    logEvent('check_finished', { module: `${track}/${module}`, right: next.filter(Boolean).length, asked: next.length, passed: scored.passed.length });
    haptic(scored.failed.length === 0 ? 'success' : 'warning');
    setResult(scored);
  };

  return (
    <QuestionScreen
      key={answers.length}
      question={questions[answers.length]}
      progress={answers.length / questions.length}
      onClose={() => navigate('/learn')}
      onDone={onDone}
    />
  );
}

/**
 * The order placement walks the curriculum: the rules first, then the core
 * path a winning cash player needs, from math and preflop to river play.
 */
const PLACEMENT_ORDER = [
  'basics/rules',
  'basics/first-strategy',
  'foundations/math',
  'preflop/rfi',
  'preflop/vs-open',
  'foundations/ranges',
  'postflop/textures',
  'postflop/cbet',
  'postflop/defense',
  'postflop/hand-reading',
  'postflop/later-streets',
  'postflop/river',
  'exploit/adjustments',
];

/** Up to three lessons per module keep placement to a few minutes; core lessons first. */
const PER_MODULE = 3;

function placementModules(): PlacementModule[] {
  return PLACEMENT_ORDER.map((id) => {
    const [t, m] = id.split('/');
    const entries = moduleEntries(t, m).filter((e) => e.content && quizSteps(e).length > 0);
    const sample = [...entries.filter((e) => e.content!.level === 'core'), ...entries.filter((e) => e.content!.level !== 'core')].slice(0, PER_MODULE);
    return { id, lessons: sample.map((e) => ({ key: e.key, quizSteps: quizSteps(e) })) };
  });
}

/** Lessons to mark: every lesson of a cleared module, plus lessons proven in the module where placement stopped. */
function placementSkips(state: PlacementState): string[] {
  const cleared = state.cleared.flatMap((id) => LESSON_ENTRIES.filter((e) => e.content && e.key.startsWith(`${id}/`)).map((e) => e.key));
  return [...new Set([...cleared, ...state.passed])];
}

export function PlacementPage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromOnboarding = params.get('from') === 'onboarding';
  const { settings, update } = useSettings();
  // A test left halfway resumes where it stopped.
  const [resumed] = useState(loadPlacement);
  const [state, setState] = useState(() => resumed?.state ?? startPlacement(placementModules()));
  const [kept, setKept] = useState<Set<string>>(new Set());
  // Placement state keeps only the current topic's answers, so count the whole test here.
  const [tally, setTally] = useState(() => resumed?.tally ?? { right: 0, asked: 0 });
  useEffect(() => {
    if (state.done) clearPlacement();
    else if (tally.asked > 0) savePlacement({ state, tally });
  }, [state, tally]);
  const exit = () => navigate(fromOnboarding ? '/welcome?step=plan' : '/learn');

  if (state.done) {
    const proven = placementSkips(state);
    const skipped = proven.filter((k) => !kept.has(k.split('/').slice(0, 2).join('/')));
    const { right, asked } = tally;
    const placedTitle = state.placedAt ? moduleTitle(state.placedAt) : undefined;
    const byModule = [...new Set(proven.map((k) => k.split('/').slice(0, 2).join('/')))].map((id) => ({
      id,
      title: moduleTitle(id) ?? id,
      count: proven.filter((k) => k.startsWith(`${id}/`)).length,
    }));
    return (
      <div className="stack focus-column lesson-done">
        <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.25rem', gap: '0.9rem' }}>
          <ProgressRing value={right / Math.max(1, asked)} size={116} stroke={11} label={`${right} of ${asked} right`}>
            <span className="display num" style={{ fontSize: '2.2rem' }} aria-hidden="true">
              {right}/{asked}
            </span>
          </ProgressRing>
          <div>
            <div className="done-kicker">Your starting point</div>
            <h1 className="display" style={{ fontSize: '2.2rem', fontWeight: 400, lineHeight: 1.05 }}>
              {placedTitle ? `Start at ${placedTitle}` : 'You know the core lessons'}
            </h1>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {skipped.length > 0
              ? `You passed ${plural(skipped.length, 'lesson')} and saved about ${minutesOf(skipped)} minutes. You can still open any of them.`
              : 'Start with the first lesson. Everything stays in your plan.'}
          </p>
        </div>
        {byModule.length > 0 && (
          <section>
            <h2 className="section-title">Passed</h2>
            <div className="list">
              {byModule.map((m) => (
                <div key={m.id} className="list-row">
                  <span className="grow">
                    <span className="row-title">{m.title}</span>
                    <span className="row-sub">{kept.has(m.id) ? 'Stays in your plan' : plural(m.count, 'lesson')}</span>
                  </span>
                  <Toggle
                    label={`Skip ${m.title}`}
                    checked={!kept.has(m.id)}
                    onChange={(skip) =>
                      setKept((k) => {
                        const next = new Set(k);
                        if (skip) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="section-footer">Turn a topic off to keep its lessons in your plan.</div>
          </section>
        )}
        <BottomBar>
          <button
            className="btn btn-primary btn-lg btn-block swap-in"
            onClick={async () => {
              await markTested(skipped);
              update({ ...settings, profile: { ...settings.profile, placedAt: state.placedAt ?? 'all' } });
              track('placement_completed', { right, asked, skipped: skipped.length, placedAt: state.placedAt ?? 'all' });
              exit();
            }}
          >
            {fromOnboarding ? 'See my plan' : 'Go to Learn'}
          </button>
        </BottomBar>
      </div>
    );
  }

  const q = state.questions[state.answers.length];
  const { answered, remainingMax } = placementProgress(state);
  return (
    <QuestionScreen
      key={`${state.index}:${state.answers.length}`}
      question={q}
      progress={answered / (answered + remainingMax)}
      onClose={exit}
      closeLabel="Stop the quiz. Your place is saved."
      onDone={(correct) => {
        window.scrollTo({ top: 0 });
        setTally((t) => ({ right: t.right + (correct ? 1 : 0), asked: t.asked + 1 }));
        setState((s) => answerPlacement(s, correct));
      }}
    />
  );
}

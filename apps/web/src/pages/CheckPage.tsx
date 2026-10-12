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
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { StepView } from '../lesson/StepView';
import { canOpenLesson } from '../state/access';
import { entryFor, LESSON_ENTRIES, lessonPath, markTested, moduleEntries, quizSteps } from '../state/lessons';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, CloseIcon, LockIcon, SkipIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';

type Quiz = Extract<LessonStep, { kind: 'quiz' }>;

function quizFor(q: CheckQuestion): Quiz {
  const step = entryFor(q.lessonKey)?.content?.steps[q.step];
  if (step?.kind !== 'quiz') throw new Error(`No quiz at ${q.lessonKey} step ${q.step}`);
  return step;
}

/** One question at a time with instant feedback, the same look as a lesson. */
function QuestionScreen({
  question,
  progress,
  onClose,
  onDone,
}: {
  question: CheckQuestion;
  progress: number;
  onClose: () => void;
  onDone: (correct: boolean) => void;
}) {
  const [choice, setChoice] = useState<number>();
  const quiz = quizFor(question);
  const entry = entryFor(question.lessonKey);
  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Stop the test" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
        <div className="check-bar" aria-label={`${Math.round(progress * 100)}% done`}>
          <span style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      </div>
      <div key={`${question.lessonKey}:${question.step}`} className="lesson-stage from-right">
        <div className="footnote" style={{ marginBottom: '0.4rem' }}>
          {entry?.moduleTitle}, {entry?.title}
        </div>
        <StepView step={quiz} answered={choice} onAnswer={setChoice} />
      </div>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={choice === undefined} onClick={() => onDone(choice === quiz.answer)}>
          {choice === undefined ? 'Choose an answer' : 'Continue'}
        </button>
      </BottomBar>
    </div>
  );
}

function minutesOf(keys: readonly string[]) {
  return keys.reduce((m, k) => m + (entryFor(k)?.content?.minutes ?? 0), 0);
}

/** What the test found: lessons skipped and lessons to learn, with the next step. */
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
        <ProgressRing value={result.correct / Math.max(1, result.total)} size={116} stroke={11}>
          <span className="display num" style={{ fontSize: '2rem' }}>
            {result.correct}/{result.total}
          </span>
        </ProgressRing>
        <div>
          <div className="footnote">{title}</div>
          <h1 className="display" style={{ fontSize: '2.2rem', fontWeight: 400, lineHeight: 1.05 }}>
            {toLearn.length === 0 ? 'You know this' : result.passed.length ? 'Nearly there' : 'Worth learning'}
          </h1>
        </div>
        {result.passed.length > 0 && (
          <div className="pill pill-good num">
            {result.passed.length} {result.passed.length === 1 ? 'lesson' : 'lessons'} skipped, {saved} min saved
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
                  <span style={{ display: 'block', fontWeight: 600 }}>{e.title}</span>
                  <span className="footnote">
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
          <h2 className="section-title">Skipped</h2>
          <div className="list">
            {result.passed.map((k) => (
              <div key={k} className="list-row">
                <SkipIcon size={17} style={{ color: 'var(--green)' }} />
                <span className="grow">{entryFor(k)?.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <BottomBar>
        {first ? (
          <button className="btn btn-primary btn-lg btn-block swap-in" onClick={() => navigate(locked ? `/pro?from=check` : lessonPath(first.key))}>
            {locked ? `Unlock ${toLearn.length === 1 ? 'this lesson' : `these ${toLearn.length} lessons`}` : `Start: ${first.title}`}
          </button>
        ) : (
          <Link to={back} className="btn btn-primary btn-lg btn-block swap-in">
            Continue
          </Link>
        )}
      </BottomBar>
    </div>
  );
}

/** Test out of one lesson (all its questions) or a whole module (two per lesson). */
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

  if (!moduleDef || questions.length === 0) {
    return (
      <div className="stack focus-column" style={{ paddingTop: '3rem' }}>
        <p className="muted">There is nothing to test here yet.</p>
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
 * The order placement walks the curriculum: the core path a winning cash
 * player needs, from math and preflop to river play and exploits.
 */
const PLACEMENT_ORDER = [
  'foundations/math',
  'preflop/rfi',
  'preflop/vs-open',
  'foundations/ranges',
  'postflop/textures',
  'postflop/cbet',
  'postflop/defense',
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
  const [state, setState] = useState(() => startPlacement(placementModules()));
  const exit = () => navigate(fromOnboarding ? '/welcome?step=plan' : '/learn');

  if (state.done) {
    const skipped = placementSkips(state);
    const placedTitle = state.placedAt
      ? CURRICULUM.flatMap((t) => t.modules.map((m) => ({ id: `${t.id}/${m.id}`, title: m.title }))).find((m) => m.id === state.placedAt)?.title
      : undefined;
    return (
      <div className="stack focus-column lesson-done">
        <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.25rem', gap: '0.9rem' }}>
          <ProgressRing value={state.cleared.length / Math.max(1, state.modules.length)} size={116} stroke={11}>
            <CheckIcon size={42} style={{ color: 'var(--tint)' }} />
          </ProgressRing>
          <div>
            <div className="footnote">Your level</div>
            <h1 className="display" style={{ fontSize: '2.2rem', fontWeight: 400, lineHeight: 1.05 }}>
              {placedTitle ? `Start at ${placedTitle}` : 'You cleared the core path'}
            </h1>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {skipped.length > 0
              ? `${skipped.length} lessons marked as known, about ${minutesOf(skipped)} minutes you will not have to spend.`
              : 'Starting from the first lesson is the fastest way up from here.'}
          </p>
        </div>
        <BottomBar>
          <button
            className="btn btn-primary btn-lg btn-block swap-in"
            onClick={async () => {
              await markTested(skipped);
              update({ ...settings, profile: { ...settings.profile, placedAt: state.placedAt ?? 'all' } });
              exit();
            }}
          >
            Continue
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
      onDone={(correct) => {
        window.scrollTo({ top: 0 });
        setState((s) => answerPlacement(s, correct));
      }}
    />
  );
}

import { type LessonStep, lessonPoints, stepVersion } from '@felt/content';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { LessonCover } from '../lesson/LessonCover';
import { Rich, termsForStep, TermScope } from '../lesson/rich';
import { FirstWin } from './FirstWin';
import { StepView } from '../lesson/StepView';
import { canOpenLesson } from '../state/access';
import { getChart } from '../state/charts';
import { recordLessonQuiz } from '../state/rating';
import { track } from '../state/events';
import { lessonStepId, saveLessonStep, unsave } from '../state/saved';
import { useSettings } from '../state/settings';
import { db, type StoredLesson } from '../state/db';
import { dealQuizSeed, entryFor, isComplete, type LessonEntry, lessonPath, lessonProgress, moduleEntries, nextLesson, saveLesson } from '../state/lessons';
import { BottomBar } from '../ui/BottomBar';
import { BookmarkIcon, CheckIcon, ChevronRightIcon, CloseIcon, LockIcon, ReviewIcon, UndoIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';
import './learn.css';

type QuizStep = Extract<LessonStep, { kind: 'quiz' }>;

/** Keyed by lesson, so moving to the next lesson starts it fresh. */
export function LessonPage() {
  const key = useParams()['*'] ?? '';
  return <Lesson key={key} lessonKey={key} />;
}

/**
 * The verdict, pinned above the button in the thumb zone the moment a
 * question is answered, so it never sits below the fold. The reason stays in
 * the card on the page. Screen readers hear the verdict from the question
 * itself, so this copy is hidden from them.
 */
function AnswerBanner({ right, answer }: { right: boolean; answer: string }) {
  return (
    <div className={`answer-banner ${right ? 'good' : 'bad'}`} aria-hidden="true">
      <span className="answer-banner-icon">{right ? <CheckIcon size={16} /> : <CloseIcon size={14} />}</span>
      <span className="answer-banner-text">
        <strong>{right ? 'Correct' : 'Not quite'}</strong>
        {!right && (
          <span>
            The answer is <Rich text={answer.replace(/\.$/, '')} terms={false} />.
          </span>
        )}
      </span>
    </div>
  );
}

function Lesson({ lessonKey: key }: { lessonKey: string }) {
  const entry = entryFor(key);
  const content = entry?.content;
  const points = content ? lessonPoints(content) : undefined;
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [search] = useSearchParams();
  const jumpTo = search.get('step');
  const saved = useLiveQuery(() => db.lessons.get(key), [key], null);
  const progress = useLiveQuery(lessonProgress, []);
  const [toast, setToast] = useState<string>();
  const [index, setIndex] = useState<number>();
  const [dir, setDir] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  /** Where a half finished lesson picked up, so the player can see it and start over. */
  const [resumedAt, setResumedAt] = useState<number>();
  /** A second try at the questions missed, after the lesson. It never touches the rating. */
  const [retry, setRetry] = useState<{ steps: number[]; pos: number; answers: Record<number, number> }>();
  const [fixed, setFixed] = useState<ReadonlySet<number>>(new Set());
  const touch = useRef<{ x: number; y: number }>();
  useBodyClass('focus-mode');

  // Resume where you left off, once the saved progress has loaded.
  useEffect(() => {
    if (index !== undefined || saved === null || !content) return;
    const resume =
      jumpTo !== null ? Math.min(Math.max(0, Number(jumpTo) || 0), content.steps.length - 1)
      : saved && saved.status === 'started' ? Math.min(saved.step, content.steps.length - 1)
      : 0;
    setIndex(resume);
    if (jumpTo === null && resume > 0) setResumedAt(resume);
    track('lesson_started', { lesson: key, track: key.split('/')[0], resumed: resume > 0 });
    if (!saved) void saveLesson(key, { step: 0 });
  }, [saved, content, index, key, jumpTo]);

  // Each visit deals another version of a question than last time: another seat, hand, board or size.
  const steps = useMemo(() => (content?.steps ?? []).map((s, n) => (s.kind === 'quiz' ? stepVersion(s, dealQuizSeed(key, n)) : s)), [content, key]);
  const quizIdx = steps.flatMap((s, n) => (s.kind === 'quiz' ? [n] : []));
  const missed = quizIdx.filter((n) => answers[n] !== (steps[n] as QuizStep).answer);
  const missedIds = missed.map((n) => lessonStepId(key, n));
  const missedSaved = useLiveQuery(async () => (await db.saved.bulkGet(missedIds)).every(Boolean), [finished, missedIds.join()]);
  const i = index ?? 0;
  const stepSaved = useLiveQuery(() => db.saved.get(lessonStepId(key, i)), [key, i]);
  const toggleSave = async () => {
    if (stepSaved) {
      await unsave(stepSaved.id);
      setToast('Removed from saved');
    } else {
      await saveLessonStep(key, i);
      haptic('success');
      setToast('Saved. You will see it again in review.');
    }
    window.setTimeout(() => setToast(undefined), 2200);
  };
  const step = steps[i];
  const isQuiz = step?.kind === 'quiz';
  const canContinue = !isQuiz || answers[i] !== undefined;
  const last = i === steps.length - 1;

  const finish = () => {
    const correct = quizIdx.filter((n) => answers[n] === (steps[n] as QuizStep).answer).length;
    void saveLesson(key, { status: 'done', step: steps.length, correct, answered: quizIdx.length });
    track('lesson_finished', { lesson: key, track: key.split('/')[0], correct, total: quizIdx.length });
    haptic('success');
    setFinished(true);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (!canContinue) return;
    if (last) return finish();
    setDir(1);
    setIndex(i + 1);
    void saveLesson(key, { step: i + 1 });
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    if (i === 0) return;
    setDir(-1);
    setIndex(i - 1);
    window.scrollTo({ top: 0 });
  };

  const startOver = () => {
    setResumedAt(undefined);
    setDir(-1);
    setIndex(0);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || settings.study.shortcuts === false || e.metaKey || e.ctrlKey || e.altKey) return;
      // Leave keys alone when a control has focus: Enter belongs to that button, arrows to text and groups.
      if (e.target instanceof Element && e.target.closest('input, textarea, select, button, a, [role="radiogroup"], [role="grid"]')) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Each new step is read from the top by screen readers.
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (i > 0) stage.current?.focus({ preventScroll: true });
  }, [i]);

  if (!entry || !content) {
    return (
      <div className="stack focus-column" style={{ paddingTop: '3rem' }}>
        <p className="muted">This lesson is not ready yet.</p>
        <Link to="/learn" className="btn">
          Back to Learn
        </Link>
      </div>
    );
  }

  if (!canOpenLesson(key, settings.access)) return <Navigate to="/pro?from=lesson" replace />;

  const following = nextLesson(key);

  if (finished && search.get('first') === '1') {
    return (
      <FirstWin
        correct={quizIdx.length - missed.length}
        total={quizIdx.length}
        minutes={content.minutes}
        next={following && canOpenLesson(following.key, settings.access) ? following : undefined}
      />
    );
  }

  if (finished && retry) {
    const n = retry.steps[retry.pos];
    const q = steps[n] as QuizStep;
    const answered = retry.answers[n];
    const lastRetry = retry.pos === retry.steps.length - 1;
    const advance = () => {
      if (answered === undefined) return;
      if (lastRetry) {
        setRetry(undefined);
        window.scrollTo({ top: 0 });
        return;
      }
      setRetry({ ...retry, pos: retry.pos + 1 });
      window.scrollTo({ top: 0 });
    };
    return (
      <div className="stack focus-column">
        <div className="focus-top">
          <button className="icon-btn glass" aria-label="Back to your results" onClick={() => setRetry(undefined)}>
            <CloseIcon size={18} />
          </button>
          <div
            className="segments"
            role="progressbar"
            aria-label="Second try"
            aria-valuemin={1}
            aria-valuemax={retry.steps.length}
            aria-valuenow={retry.pos + 1}
            aria-valuetext={`Question ${retry.pos + 1} of ${retry.steps.length}`}
          >
            {retry.steps.map((s, p) => (
              <span key={s} className={p < retry.pos ? 'done' : p === retry.pos ? 'current' : undefined} />
            ))}
          </div>
          <span className="focus-top-spacer" aria-hidden="true" />
        </div>
        <div key={`retry:${n}`} className="lesson-stage from-right">
          <div className="lesson-kicker check-source retry-kicker">
            <UndoIcon size={15} />
            Second try, {retry.pos + 1} of {retry.steps.length}
          </div>
          <TermScope.Provider value={termsForStep(steps, n)}>
            <StepView
              step={q}
              points={points}
              answered={answered}
              verdictInBar
              onAnswer={(choice) => {
                setRetry((r) => r && { ...r, answers: { ...r.answers, [n]: choice } });
                if (choice === q.answer) setFixed((f) => new Set(f).add(n));
              }}
            />
          </TermScope.Provider>
        </div>
        <BottomBar>
          {answered !== undefined && <AnswerBanner key={n} right={answered === q.answer} answer={q.choices[q.answer]} />}
          <button className="btn btn-primary btn-lg btn-block" onClick={advance} disabled={answered === undefined}>
            {answered === undefined ? 'Choose an answer' : lastRetry ? 'See your results' : 'Continue'}
          </button>
        </BottomBar>
      </div>
    );
  }

  if (finished) {
    const quizCount = quizIdx.length;
    const correct = quizCount - missed.length;
    const practice = content.practice?.[0];
    const nextOpen = following && canOpenLesson(following.key, settings.access);
    const toFix = missed.filter((n) => !fixed.has(n));
    const addToReview = async () => {
      for (const n of missed) await saveLessonStep(key, n);
      haptic('success');
    };
    return (
      <div className="stack focus-column lesson-done">
        <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2.2rem 1.25rem', gap: '1rem' }}>
          <ProgressRing value={1} size={120} stroke={11}>
            <CheckIcon size={44} style={{ color: 'var(--tint)' }} />
          </ProgressRing>
          <div>
            <div className="done-kicker">Lesson done</div>
            <h1 className="display" style={{ fontSize: '2.4rem', fontWeight: 400, lineHeight: 1.05 }}>
              {entry.title}
            </h1>
          </div>
          {quizCount > 0 && (
            <div className={`pill num ${missed.length === 0 ? 'pill-good' : 'pill-tint'}`}>
              {missed.length === 0 ? `All ${quizCount} questions right` : `${correct} of ${quizCount} questions right`}
            </div>
          )}
        </div>

        {progress && <TopicProgress entry={entry} progress={progress} />}

        {missed.length > 0 && (
          <section className="section missed reveal">
            <div className="section-head">
              <h2 className="section-title">{missed.length === 1 ? 'The one you missed' : `The ${missed.length} you missed`}</h2>
            </div>
            <div className="list">
              {missed.map((n) => {
                const q = steps[n] as QuizStep;
                return (
                  <div key={n} className="list-row missed-row">
                    <span className="grow">
                      <span className="row-title">
                        <Rich text={q.question} terms={false} />
                      </span>
                      <span className="row-sub">
                        Answer: <Rich text={q.choices[q.answer]} terms={false} />
                      </span>
                    </span>
                    {fixed.has(n) && (
                      <span className="pill pill-good">
                        <CheckIcon size={12} /> Got it
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="missed-actions">
              {toFix.length > 0 && (
                <button
                  className="btn btn-tinted"
                  data-haptic="select"
                  onClick={() => {
                    setRetry({ steps: toFix, pos: 0, answers: {} });
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <UndoIcon size={17} />
                  {toFix.length === 1 ? 'Try it again' : 'Try them again'}
                </button>
              )}
              <button className="btn btn-tinted" data-haptic="off" disabled={missedSaved} onClick={() => void addToReview()}>
                {missedSaved ? <CheckIcon size={17} /> : <ReviewIcon size={17} />}
                {missedSaved ? 'Added to review' : 'Add to review'}
              </button>
            </div>
            <div className="section-footer">Questions you add come back in your review.</div>
          </section>
        )}

        {practice && (
          <div className="list">
            <Link to={`/ranges?chart=${practice}&mode=quick`} className="list-row">
              <span className="grow">
                <span className="row-title">Practice this chart</span>
                <span className="row-sub">Drill {getChart(practice)?.spec.title} one hand at a time</span>
              </span>
              <ChevronRightIcon size={16} className="chev" />
            </Link>
          </div>
        )}

        {following?.content && !nextOpen && (
          <Link to="/pro?from=lesson" className="card next-locked">
            <LessonCover cover={following.content.cover} size="sm" />
            <span className="grow">
              <span className="next-locked-kicker">
                <LockIcon size={12} /> Next in Aced Pro
              </span>
              <span className="next-locked-title">{following.title}</span>
              <span className="footnote">
                {following.moduleTitle}, {following.content.minutes} min
              </span>
            </span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
        )}

        <BottomBar>
          {following && nextOpen ? (
            <>
              <Link to={lessonPath(following.key)} className="btn btn-primary btn-lg btn-block swap-in next-lesson-btn">
                <span className="next-lesson-label">
                  <span>Next lesson</span>
                  <span className="next-lesson-title">{following.title}</span>
                </span>
                <ChevronRightIcon size={18} />
              </Link>
              <Link to="/learn" className="btn btn-plain btn-block">
                Back to Learn
              </Link>
            </>
          ) : (
            <Link to="/learn" className="btn btn-primary btn-lg btn-block swap-in">
              Back to Learn
            </Link>
          )}
        </BottomBar>
      </div>
    );
  }

  const answered = answers[i];

  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Close lesson" onClick={() => navigate('/learn')}>
          <CloseIcon size={18} />
        </button>
        <div className="segments" role="progressbar" aria-label="Lesson" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-valuetext={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((_, n) => (
            <span key={n} className={n < i ? 'done' : n === i ? 'current' : undefined} />
          ))}
        </div>
        <button
          className={`icon-btn glass save-btn${stepSaved ? ' on' : ''}`}
          aria-label={stepSaved ? 'Remove from saved' : 'Save this screen'}
          aria-pressed={!!stepSaved}
          data-haptic="off"
          onClick={() => void toggleSave()}
        >
          <BookmarkIcon size={18} filled={!!stepSaved} />
        </button>
      </div>
      {toast && (
        <div className="toast reveal" role="status">
          {toast}
        </div>
      )}
      {resumedAt !== undefined && resumedAt === i && (
        <div className="resume-note reveal" role="status">
          <span>
            Picked up at step {i + 1} of {steps.length}.
          </span>
          <button className="resume-restart" data-haptic="select" onClick={startOver}>
            <UndoIcon size={15} />
            Start over
          </button>
        </div>
      )}

      <div
        key={`${key}:${i}`}
        ref={stage}
        tabIndex={-1}
        className={`lesson-stage ${dir === 1 ? 'from-right' : 'from-left'}`}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 60 && Math.abs(dy) < 50) (dx < 0 ? next : back)();
        }}
      >
        {i === 0 && (
          <div className="lesson-kicker">
            {entry.moduleTitle}, {content.minutes} min{content.level === 'advanced' && <span className="pill">Advanced</span>}
          </div>
        )}
        {step && (
          <TermScope.Provider value={termsForStep(steps, i)}>
            <StepView
              step={step}
              points={points}
              answered={answered}
              verdictInBar
              onAnswer={(choice) => {
                setAnswers((a) => ({ ...a, [i]: choice }));
                if (step.kind === 'quiz') void recordLessonQuiz(key, i, choice === step.answer, 'lesson');
              }}
            />
          </TermScope.Provider>
        )}
        {i === 0 && (
          <div className="intro-cover reveal">
            <LessonCover cover={content.cover} size="intro" />
          </div>
        )}
      </div>

      <BottomBar>
        {step?.kind === 'quiz' && answered !== undefined && <AnswerBanner key={i} right={answered === step.answer} answer={step.choices[step.answer]} />}
        <div style={{ display: 'grid', gridTemplateColumns: i > 0 ? 'auto 1fr' : '1fr', gap: 10 }}>
          {i > 0 && (
            <button className="btn btn-lg glass" onClick={back} aria-label="Previous step" style={{ minWidth: 56 }}>
              <ChevronRightIcon size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
          <button className="btn btn-primary btn-lg" onClick={next} disabled={!canContinue}>
            {isQuiz && !canContinue ? 'Choose an answer' : last ? 'Finish lesson' : i === 0 ? 'Start lesson' : 'Continue'}
          </button>
        </div>
      </BottomBar>
    </div>
  );
}

/** Where this lesson leaves its topic: one segment per lesson, this one just filled. */
function TopicProgress({ entry, progress }: { entry: LessonEntry; progress: ReadonlyMap<string, StoredLesson> }) {
  const [trackId, moduleId] = entry.key.split('/');
  const lessons = moduleEntries(trackId, moduleId).filter((e) => e.content);
  const isDone = (e: LessonEntry) => e.key === entry.key || isComplete(progress.get(e.key));
  const done = lessons.filter(isDone).length;
  const all = done === lessons.length;
  return (
    <div className="card topic-progress-card reveal">
      <div className="topic-progress-head">
        <span className="topic-progress-title">{entry.moduleTitle}</span>
        <span className="footnote num">{all ? 'Topic done' : `${done} of ${lessons.length} lessons`}</span>
      </div>
      <div className="topic-steps" role="img" aria-label={`${done} of ${lessons.length} lessons done in ${entry.moduleTitle}`}>
        {lessons.map((e) => (
          <span key={e.key} className={e.key === entry.key ? 'done now' : isDone(e) ? 'done' : undefined} />
        ))}
      </div>
    </div>
  );
}

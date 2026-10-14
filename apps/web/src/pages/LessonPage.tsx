import { lessonPoints } from '@felt/content';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { LessonCover } from '../lesson/LessonCover';
import { StepView } from '../lesson/StepView';
import { canOpenLesson } from '../state/access';
import { getChart } from '../state/charts';
import { recordLessonQuiz } from '../state/rating';
import { lessonStepId, saveLessonStep, unsave } from '../state/saved';
import { useSettings } from '../state/settings';
import { db } from '../state/db';
import { entryFor, lessonPath, nextLesson, saveLesson } from '../state/lessons';
import { BottomBar } from '../ui/BottomBar';
import { BookmarkIcon, CheckIcon, ChevronRightIcon, CloseIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';

/** Keyed by lesson, so moving to the next lesson starts it fresh. */
export function LessonPage() {
  const key = useParams()['*'] ?? '';
  return <Lesson key={key} lessonKey={key} />;
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
  const [toast, setToast] = useState<string>();
  const [index, setIndex] = useState<number>();
  const [dir, setDir] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
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
    if (!saved) void saveLesson(key, { step: 0 });
  }, [saved, content, index, key, jumpTo]);

  const steps = content?.steps ?? [];
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
    const quizzes = steps.map((s, n) => [s, n] as const).filter(([s]) => s.kind === 'quiz');
    const correct = quizzes.filter(([s, n]) => s.kind === 'quiz' && answers[n] === s.answer).length;
    void saveLesson(key, { status: 'done', step: steps.length, correct, answered: quizzes.length });
    haptic('success');
    setFinished(true);
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

  if (finished) {
    const quizCount = steps.filter((s) => s.kind === 'quiz').length;
    const correct = steps.filter((s, n) => s.kind === 'quiz' && answers[n] === s.answer).length;
    const following = nextLesson(key);
    const practice = content.practice?.[0];
    return (
      <div className="stack focus-column lesson-done">
        <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2.2rem 1.25rem', gap: '1rem' }}>
          <ProgressRing value={1} size={120} stroke={11}>
            <CheckIcon size={44} style={{ color: 'var(--tint)' }} />
          </ProgressRing>
          <div>
            <div className="done-kicker">{entry.moduleTitle}</div>
            <h1 className="display" style={{ fontSize: '2.4rem', fontWeight: 400, lineHeight: 1.05 }}>
              {entry.title}
            </h1>
          </div>
          {quizCount > 0 && (
            <div className="pill pill-good num">
              {correct} of {quizCount} questions right
            </div>
          )}
        </div>
        <div className="list with-icons">
          {practice && (
            <Link to={`/ranges?chart=${practice}&mode=quick`} className="list-row">
              <span className="grow">
                <span className="row-title">Practice this chart</span>
                <span className="row-sub">Drill {getChart(practice)?.spec.title} one hand at a time</span>
              </span>
              <ChevronRightIcon size={16} className="chev" />
            </Link>
          )}
        </div>
        <BottomBar>
          {following && canOpenLesson(following.key, settings.access) ? (
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
        {step && <StepView step={step} points={points} answered={answers[i]} onAnswer={(choice) => {
              setAnswers((a) => ({ ...a, [i]: choice }));
              if (step.kind === 'quiz') void recordLessonQuiz(key, i, choice === step.answer, 'lesson');
            }} />}
        {i === 0 && (
          <div className="intro-cover reveal">
            <LessonCover cover={content.cover} size="intro" />
          </div>
        )}
      </div>

      <BottomBar>
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

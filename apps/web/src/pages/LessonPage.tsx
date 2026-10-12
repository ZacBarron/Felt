import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { LessonCover } from '../lesson/LessonCover';
import { StepView } from '../lesson/StepView';
import { getChart } from '../state/charts';
import { db } from '../state/db';
import { entryFor, lessonPath, nextLesson, saveLesson } from '../state/lessons';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronRightIcon, CloseIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';

export function LessonPage() {
  const key = useParams()['*'] ?? '';
  const entry = entryFor(key);
  const content = entry?.content;
  const navigate = useNavigate();
  const saved = useLiveQuery(() => db.lessons.get(key), [key], null);
  const [index, setIndex] = useState<number>();
  const [dir, setDir] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const touch = useRef<{ x: number; y: number }>();
  useBodyClass('focus-mode');

  // Resume where you left off, once the saved progress has loaded.
  useEffect(() => {
    if (index !== undefined || saved === null || !content) return;
    const resume = saved && saved.status === 'started' ? Math.min(saved.step, content.steps.length - 1) : 0;
    setIndex(resume);
    if (!saved) void saveLesson(key, { step: 0 });
  }, [saved, content, index, key]);

  const steps = content?.steps ?? [];
  const i = index ?? 0;
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
      if (finished) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!entry || !content) {
    return (
      <div className="stack focus-column" style={{ paddingTop: '3rem' }}>
        <p className="muted">This lesson is not written yet.</p>
        <Link to="/learn" className="btn">
          Back to Learn
        </Link>
      </div>
    );
  }

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
            <div className="footnote">{entry.moduleTitle}</div>
            <h1 className="display" style={{ fontSize: '2.4rem', fontWeight: 400, lineHeight: 1.05 }}>
              {entry.title}
            </h1>
          </div>
          {quizCount > 0 && (
            <div className="pill pill-good num">
              {correct} of {quizCount} checks right
            </div>
          )}
        </div>
        <div className="list with-icons">
          {practice && (
            <Link to={`/drills?chart=${practice}`} className="list-row">
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 600 }}>Practice this chart</span>
                <span className="footnote">{getChart(practice)?.spec.title}, as quick recall drills</span>
              </span>
              <ChevronRightIcon size={16} className="chev" />
            </Link>
          )}
          {following && (
            <Link to={lessonPath(following.key)} className="list-row" onClick={() => setFinished(false)}>
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 600 }}>Next lesson</span>
                <span className="footnote">{following.title}</span>
              </span>
              <ChevronRightIcon size={16} className="chev" />
            </Link>
          )}
        </div>
        <BottomBar>
          <Link to="/learn" className="btn btn-primary btn-lg btn-block swap-in">
            Back to Learn
          </Link>
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
        <div className="segments" aria-label={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((_, n) => (
            <span key={n} className={n < i ? 'done' : n === i ? 'current' : undefined} />
          ))}
        </div>
      </div>

      <div
        key={`${key}:${i}`}
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
          <div className="footnote" style={{ marginBottom: '0.4rem' }}>
            {entry.trackTitle}, {entry.moduleTitle} · {content.minutes} min
          </div>
        )}
        {step && <StepView step={step} answered={answers[i]} onAnswer={(choice) => setAnswers((a) => ({ ...a, [i]: choice }))} />}
        {i === 0 && (
          <div className="intro-cover reveal">
            <LessonCover cover={content.cover} />
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
            {isQuiz && !canContinue ? 'Choose an answer' : last ? 'Finish' : i === 0 ? 'Start' : 'Continue'}
          </button>
        </div>
      </BottomBar>
    </div>
  );
}

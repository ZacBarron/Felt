import { useEffect, useRef } from 'react';
import { entryFor } from '../state/lessons';
import { StepView } from './StepView';

/**
 * A lesson read in a sheet over the current screen, so a review or quiz
 * session is never left half way. Quizzes are skipped: this is for reading.
 */
export function LessonSheet({ lessonKey, focusStep, onClose }: { lessonKey: string; focusStep?: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const entry = entryFor(lessonKey);
  useEffect(() => {
    ref.current?.showModal();
    focusRef.current?.scrollIntoView({ block: 'start' });
  }, []);
  if (!entry?.content) return null;
  const steps = entry.content.steps.map((step, i) => ({ step, i })).filter(({ step }) => step.kind !== 'quiz');
  return (
    <dialog
      ref={ref}
      className="sheet lesson-sheet"
      aria-label={entry.title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1.4rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between" style={{ alignItems: 'flex-start', gap: '0.8rem' }}>
          <div style={{ minWidth: 0 }}>
            <div className="footnote">{entry.moduleTitle}</div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{entry.title}</h2>
          </div>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>
        {steps.map(({ step, i }) => (
          <div key={i} ref={i === focusStep ? focusRef : undefined} className="lesson-sheet-step">
            <StepView step={step} />
          </div>
        ))}
      </div>
    </dialog>
  );
}

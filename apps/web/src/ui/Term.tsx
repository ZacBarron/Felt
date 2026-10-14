import { glossaryTerm } from '@felt/content';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LessonSheet } from '../lesson/LessonSheet';
import { entryFor, lessonPath } from '../state/lessons';

/**
 * A glossary term inside lesson copy: a quiet dotted underline that opens a
 * short definition, so every term is explained wherever it appears.
 */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = glossaryTerm(id);
  if (!t) return <>{children}</>;
  return (
    <>
      <button
        type="button"
        className="term"
        data-haptic="select"
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && <TermSheet id={id} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The definition, with the lesson that teaches the term when it is not the one on screen. */
export function TermSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const [reading, setReading] = useState(false);
  const t = glossaryTerm(id);
  const entry = t?.lesson ? entryFor(t.lesson) : undefined;
  const here = entry && location.pathname === lessonPath(entry.key);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  if (!t) return null;
  if (reading && entry) return <LessonSheet lessonKey={entry.key} onClose={onClose} />;
  return (
    <dialog
      ref={ref}
      className="sheet term-sheet"
      aria-label={t.term}
      onClose={onClose}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '0.9rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <h2 className="term-title">{t.term}</h2>
        <p className="term-def">{t.short}</p>
        {entry?.content && !here && (
          <button className="btn btn-tinted btn-block" onClick={() => setReading(true)}>
            Read the lesson: {entry.title}
          </button>
        )}
        <button className="btn btn-plain btn-block" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  );
}

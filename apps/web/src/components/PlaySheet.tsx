import { type ReactNode, useEffect, useRef } from 'react';
import type { SessionStats } from '../state/playTable';

/** A bottom sheet for Play: a native dialog, closed by Escape, a tap outside or its own button. */
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet play-sheet" aria-label={label} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="sheet-body stack" style={{ gap: '1.1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        {children}
      </div>
    </dialog>
  );
}

/** A sheet's title row: the title and one plain button that closes it. */
export function SheetHead({ title, action = 'Done', onClose }: { title: ReactNode; action?: string; onClose: () => void }) {
  return (
    <div className="row between" style={{ flexWrap: 'nowrap', gap: '0.75rem' }}>
      <h2 className="play-sheet-title">{title}</h2>
      <button className="btn btn-plain" onClick={onClose}>
        {action}
      </button>
    </div>
  );
}

/** A small grouped list label, as in iOS Settings. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return <h3 className="play-group-label">{children}</h3>;
}

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;

export function SessionSummary({ stats, title = 'Last session' }: { stats: SessionStats; title?: string }) {
  const share = stats.graded ? Math.round((stats.good / stats.graded) * 100) : undefined;
  return (
    <section className="card play-summary">
      <span className="play-summary-label">{title}</span>
      <div className="play-summary-grid">
        <div>
          <span className="play-summary-value num">{share === undefined ? 'None' : `${share}%`}</span>
          <span className="footnote">Good decisions, of {stats.graded} graded</span>
        </div>
        <div>
          <span className="play-summary-value num">{stats.evLost.toFixed(1)}bb</span>
          <span className="footnote">Given up on graded calls and folds</span>
        </div>
      </div>
      <span className="footnote">
        {stats.hands} hands played and {stats.skipped} clear folds skipped. Your result is {signed(stats.net)}bb. Over this few hands that is mostly luck.
      </span>
    </section>
  );
}

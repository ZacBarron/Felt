import { type ReactNode, useId, useState } from 'react';
import { InfoIcon } from './icons';

/**
 * A grouped section with a prominent header. Explanations that used to sit
 * in grey under a card go in `info`: they open on tap, so the screen shows
 * only what the player needs to act.
 */
export function Section({ title, info, trailing, children, footer }: { title?: ReactNode; info?: ReactNode; trailing?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="section">
      {(title || info || trailing) && (
        <div className="section-head">
          {title && <h2 className="section-title">{title}</h2>}
          {info && (
            <button type="button" className="info-btn" aria-expanded={open} aria-controls={id} aria-label="About this" data-haptic="select" onClick={() => setOpen((o) => !o)}>
              <InfoIcon size={18} />
            </button>
          )}
          {trailing && <span className="section-trailing">{trailing}</span>}
        </div>
      )}
      {info && open && (
        <div id={id} className="info-panel reveal">
          {info}
        </div>
      )}
      {children}
      {footer && <div className="section-footer">{footer}</div>}
    </section>
  );
}

/** A calm empty screen: a picture, one line and one action. */
export function EmptyState({ art, title, body, action }: { art: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state reveal">
      <div className="empty-art" aria-hidden="true">
        {art}
      </div>
      <h2 className="empty-title">{title}</h2>
      {body && <p className="empty-body">{body}</p>}
      {action}
    </div>
  );
}

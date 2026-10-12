import type { ActionOption } from '@felt/core';
import { actionColor } from './actionColors';

interface Props {
  actions: ActionOption[];
  /** Hide frequencies and EVs until the learner has answered. */
  reveal?: boolean;
  onChoose?: (id: string) => void;
  chosen?: string;
}

/**
 * GTO frequency bar plus one row per action with its EV. Before reveal it is
 * just a set of action buttons, so the same component drives the quiz.
 */
export function ActionMixBar({ actions, reveal = true, onChoose, chosen }: Props) {
  const bestEv = Math.max(...actions.map((a) => a.ev));
  return (
    <div className="stack" style={{ gap: '0.6rem' }}>
      {reveal && (
        <div className="reveal" style={{ display: 'flex', height: 28, borderRadius: 999, overflow: 'hidden', gap: 2 }} aria-hidden="true">
          {actions.map((a) => (
            <div
              key={a.id}
              className="mix-seg"
              data-act={a.id}
              title={`${a.label} ${Math.round(a.frequency * 100)}%`}
              style={{
                width: `${a.frequency * 100}%`,
                backgroundColor: actionColor(a.id),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {a.frequency >= 0.12 ? `${Math.round(a.frequency * 100)}%` : ''}
            </div>
          ))}
        </div>
      )}
      <div className="stack" style={{ gap: '0.45rem' }}>
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => onChoose?.(a.id)}
            disabled={!onChoose || reveal}
            aria-pressed={chosen === a.id}
            data-haptic="off"
            style={{
              display: 'grid',
              gridTemplateColumns: '12px 1fr auto auto',
              gap: '0.7rem',
              alignItems: 'center',
              textAlign: 'left',
              justifyContent: 'stretch',
              minHeight: 50,
              background: 'var(--surface)',
              boxShadow: chosen === a.id ? 'inset 0 0 0 2px var(--tint)' : undefined,
              borderRadius: 16,
              opacity: reveal && chosen !== a.id ? 0.85 : 1,
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 3, background: actionColor(a.id) }} />
            <span>{a.label}</span>
            {reveal ? (
              <>
                <span className="muted num">{Math.round(a.frequency * 100)}%</span>
                <span className="num" style={{ fontWeight: 700, minWidth: 96, textAlign: 'right' }}>
                  {a.ev.toFixed(2)}bb
                  {a.ev < bestEv && <span className="muted" style={{ fontWeight: 500 }}> {(a.ev - bestEv).toFixed(2)}</span>}
                </span>
              </>
            ) : (
              <>
                <span />
                <span />
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

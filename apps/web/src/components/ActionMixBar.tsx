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
        <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden' }}>
          {actions.map((a) => (
            <div
              key={a.id}
              title={`${a.label} ${Math.round(a.frequency * 100)}%`}
              style={{
                width: `${a.frequency * 100}%`,
                background: actionColor(a.id),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
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
      <div className="stack" style={{ gap: '0.35rem' }}>
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => onChoose?.(a.id)}
            disabled={!onChoose}
            style={{
              display: 'grid',
              gridTemplateColumns: '14px 1fr auto auto',
              gap: '0.6rem',
              alignItems: 'center',
              textAlign: 'left',
              borderColor: chosen === a.id ? 'var(--text)' : undefined,
              cursor: onChoose ? 'pointer' : 'default',
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 3, background: actionColor(a.id) }} />
            <span>{a.label}</span>
            {reveal ? (
              <>
                <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(a.frequency * 100)}%
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, minWidth: 92, textAlign: 'right' }}>
                  {a.ev.toFixed(2)}bb
                  {a.ev < bestEv && <span className="muted"> ({(a.ev - bestEv).toFixed(2)})</span>}
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

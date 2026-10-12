import type { HandMix } from '@felt/core';
import { actionColor, sortActions } from './actionColors';

/** One hand's action frequencies as a labelled bar. */
export function MixBar({ mix, labels }: { mix: HandMix; labels: Record<string, string> }) {
  const actions = sortActions(Object.keys(mix));
  return (
    <div className="stack" style={{ gap: '0.35rem' }}>
      <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden' }}>
        {actions.map((a) => (
          <div key={a} style={{ width: `${mix[a] * 100}%`, background: actionColor(a), opacity: a === 'fold' ? 0.6 : 1 }} />
        ))}
      </div>
      <div className="row" style={{ gap: '0.9rem', fontSize: '0.85rem' }}>
        {actions.map((a) => (
          <span key={a}>
            <span
              style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: actionColor(a), marginRight: 5 }}
            />
            {labels[a] ?? a} <strong>{Math.round(mix[a] * 100)}%</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

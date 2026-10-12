import { gridHandClass, type HandClass, type HandMix } from '@felt/core';
import { actionColor, sortActions } from './actionColors';

interface Props {
  mixes: Map<HandClass, HandMix>;
  selected?: HandClass;
  onSelect?: (hand: HandClass) => void;
}

/**
 * The 13x13 chart. Each cell is split left to right by action frequency,
 * so mixed strategies show at a glance instead of hiding behind one color.
 */
export function RangeGrid({ mixes, selected, onSelect }: Props) {
  return (
    <div
      role="grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(13, 1fr)',
        gap: 2,
        width: '100%',
        maxWidth: 620,
        aspectRatio: '1',
        userSelect: 'none',
      }}
    >
      {Array.from({ length: 169 }, (_, i) => {
        const hand = gridHandClass(Math.floor(i / 13), i % 13);
        const mix = mixes.get(hand) ?? { fold: 1 };
        const segments = sortActions(Object.keys(mix));
        const playsAtAll = segments.some((a) => a !== 'fold');
        return (
          <button
            key={hand}
            role="gridcell"
            title={describeMix(hand, mix)}
            onClick={() => onSelect?.(hand)}
            style={{
              position: 'relative',
              padding: 0,
              border: selected === hand ? '2px solid var(--text)' : '1px solid transparent',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              background: '#0e1713',
              minWidth: 0,
            }}
          >
            {segments.map((a) => (
              <span
                key={a}
                style={{
                  width: `${mix[a] * 100}%`,
                  background: actionColor(a),
                  opacity: a === 'fold' ? 0.25 : 0.9,
                }}
              />
            ))}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(8px, 1.5vw, 12px)',
                fontWeight: 600,
                color: playsAtAll ? '#fff' : 'var(--muted)',
                textShadow: '0 1px 2px rgba(0,0,0,.6)',
              }}
            >
              {hand}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function describeMix(hand: HandClass, mix: HandMix): string {
  const parts = sortActions(Object.keys(mix)).map((a) => `${a} ${Math.round(mix[a] * 100)}%`);
  return `${hand}: ${parts.join(', ')}`;
}

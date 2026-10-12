import { gridHandClass, type HandClass, type HandMix } from '@felt/core';
import { useRef } from 'react';
import { actionColor, sortActions } from './actionColors';

interface Props {
  mixes: ReadonlyMap<HandClass, HandMix>;
  selected?: HandClass;
  onSelect?: (hand: HandClass) => void;
  /** Paint mode: called for every cell the pointer touches while pressed (drag works on touch). */
  onPaint?: (hand: HandClass) => void;
  /** Cells to flag, e.g. misses after a painting drill. */
  marked?: ReadonlySet<HandClass>;
}

/**
 * The 13x13 chart. Each cell is split left to right by action frequency,
 * so mixed strategies show at a glance instead of hiding behind one color.
 */
export function RangeGrid({ mixes, selected, onSelect, onPaint, marked }: Props) {
  const painting = useRef(false);

  const handAt = (x: number, y: number): HandClass | undefined =>
    (document.elementFromPoint(x, y)?.closest('[data-hand]') as HTMLElement | null)?.dataset.hand;

  const paintHandlers = onPaint
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          painting.current = true;
          const hand = handAt(e.clientX, e.clientY);
          if (hand) onPaint(hand);
        },
        onPointerMove: (e: React.PointerEvent) => {
          if (!painting.current) return;
          const hand = handAt(e.clientX, e.clientY);
          if (hand) onPaint(hand);
        },
        onPointerUp: () => (painting.current = false),
        onPointerCancel: () => (painting.current = false),
        onPointerLeave: () => (painting.current = false),
      }
    : {};

  return (
    <div
      role="grid"
      {...paintHandlers}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(13, 1fr)',
        gap: 2,
        width: '100%',
        maxWidth: 620,
        aspectRatio: '1',
        userSelect: 'none',
        touchAction: onPaint ? 'none' : undefined,
      }}
    >
      {Array.from({ length: 169 }, (_, i) => {
        const hand = gridHandClass(Math.floor(i / 13), i % 13);
        const mix = mixes.get(hand) ?? { fold: 1 };
        const segments = sortActions(Object.keys(mix));
        const playsAtAll = segments.some((a) => a !== 'fold');
        const isMarked = marked?.has(hand);
        return (
          <button
            key={hand}
            role="gridcell"
            data-hand={hand}
            title={describeMix(hand, mix)}
            onClick={onPaint ? undefined : () => onSelect?.(hand)}
            style={{
              position: 'relative',
              padding: 0,
              border: isMarked
                ? '2px solid #ffd60a'
                : selected === hand
                  ? '2px solid var(--text)'
                  : '1px solid transparent',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              background: '#0e1713',
              minWidth: 0,
              cursor: onPaint ? 'crosshair' : 'pointer',
            }}
          >
            {segments.map((a) => (
              <span
                key={a}
                style={{
                  width: `${mix[a] * 100}%`,
                  background: actionColor(a),
                  opacity: a === 'fold' ? 0.25 : 0.9,
                  pointerEvents: 'none',
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
                fontSize: 'clamp(7px, 2.2vw, 12px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: playsAtAll ? '#fff' : 'var(--muted)',
                textShadow: '0 1px 2px rgba(0,0,0,.6)',
                pointerEvents: 'none',
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

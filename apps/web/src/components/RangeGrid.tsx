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
    <div role="grid" className={`range-grid${onPaint ? ' painting' : ''}`} {...paintHandlers}>
      {Array.from({ length: 169 }, (_, i) => {
        const hand = gridHandClass(Math.floor(i / 13), i % 13);
        const mix = mixes.get(hand) ?? { fold: 1 };
        const segments = sortActions(Object.keys(mix));
        const playsAtAll = segments.some((a) => a !== 'fold');
        const classes = ['range-cell', selected === hand && 'selected', marked?.has(hand) && 'marked', playsAtAll && 'plays']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={hand}
            role="gridcell"
            className={classes}
            data-hand={hand}
            data-haptic={onPaint ? 'off' : 'select'}
            style={{ '--wave': Math.floor(i / 13) + (i % 13) } as React.CSSProperties}
            title={describeMix(hand, mix)}
            onClick={onPaint ? undefined : () => onSelect?.(hand)}
          >
            {segments.map((a) => (
              <span key={a} className="seg" style={{ width: `${mix[a] * 100}%`, background: actionColor(a), opacity: a === 'fold' ? 0.22 : 0.95 }} />
            ))}
            <span className="label">{hand}</span>
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

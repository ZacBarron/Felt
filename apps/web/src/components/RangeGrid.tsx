import { gridHandClass, type HandClass, type HandMix } from '@felt/core';
import { useRef, useState } from 'react';
import { actionColor, sortActions } from './actionColors';

interface Props {
  mixes: ReadonlyMap<HandClass, HandMix>;
  selected?: HandClass;
  onSelect?: (hand: HandClass) => void;
  /** Paint mode: called for every cell the pointer touches while pressed (drag works on touch). */
  onPaint?: (hand: HandClass) => void;
  /** Cells to flag, e.g. misses after a painting drill. */
  marked?: ReadonlySet<HandClass>;
  /** Hands that can reach the spot; others are greyed out. */
  reach?: ReadonlySet<HandClass>;
}

/**
 * The 13x13 chart. Each cell is split left to right by action frequency,
 * so mixed strategies show at a glance instead of hiding behind one color.
 */
const HANDS: HandClass[] = Array.from({ length: 169 }, (_, i) => gridHandClass(Math.floor(i / 13), i % 13));

export function RangeGrid({ mixes, selected, onSelect, onPaint, marked, reach }: Props) {
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

  // One tab stop for the whole grid; arrow keys move between cells.
  const [active, setActive] = useState(() => selected ?? 'AA');
  const moveFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = HANDS.indexOf(active);
    const r = Math.floor(i / 13);
    const c = i % 13;
    const next = {
      ArrowRight: [r, Math.min(12, c + 1)],
      ArrowLeft: [r, Math.max(0, c - 1)],
      ArrowDown: [Math.min(12, r + 1), c],
      ArrowUp: [Math.max(0, r - 1), c],
      Home: [r, 0],
      End: [r, 12],
    }[e.key];
    if (!next) return;
    e.preventDefault();
    const hand = HANDS[next[0] * 13 + next[1]];
    setActive(hand);
    (e.currentTarget.querySelector(`[data-hand="${hand}"]`) as HTMLElement | null)?.focus();
  };

  return (
    <div
      role="grid"
      aria-label="Hand chart, 13 by 13. Use the arrow keys to move."
      aria-rowcount={13}
      aria-colcount={13}
      className={`range-grid${onPaint ? ' painting' : ''}`}
      onKeyDown={moveFocus}
      {...paintHandlers}
    >
      {Array.from({ length: 13 }, (_, r) => (
        <div role="row" key={r} style={{ display: 'contents' }}>
          {Array.from({ length: 13 }, (_, c) => {
            const i = r * 13 + c;
            const hand = HANDS[i];
            const mix = mixes.get(hand) ?? { fold: 1 };
            const segments = sortActions(Object.keys(mix));
            const playsAtAll = segments.some((a) => a !== 'fold');
            const isMarked = marked?.has(hand);
            const unreached = reach && !reach.has(hand);
            const classes = ['range-cell', selected === hand && 'selected', isMarked && 'marked', playsAtAll && 'plays', unreached && 'unreached']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={hand}
                role="gridcell"
                className={classes}
                data-hand={hand}
                data-haptic={onPaint ? 'off' : 'select'}
                tabIndex={hand === active ? 0 : -1}
                aria-selected={selected === hand}
                aria-label={unreached ? `${hand}: never in this spot` : describeMix(hand, mix) + (isMarked ? ', missed' : '')}
                style={{ '--wave': r + c } as React.CSSProperties}
                title={describeMix(hand, mix)}
                onFocus={() => setActive(hand)}
                onClick={(e) => {
                  // Pointer painting happens on pointer down; a click without a pointer (keyboard, switch, VoiceOver) paints here.
                  if (onPaint) {
                    if (e.detail === 0) onPaint(hand);
                  } else onSelect?.(hand);
                }}
              >
                {segments.map((a) => (
                  <span
                    key={a}
                    className="seg"
                    data-act={a}
                    aria-hidden="true"
                    style={{ width: `${mix[a] * 100}%`, backgroundColor: actionColor(a), opacity: a === 'fold' ? 0.22 : 0.95 }}
                  />
                ))}
                <span className="label" aria-hidden="true">
                  {hand}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function describeMix(hand: HandClass, mix: HandMix): string {
  const parts = sortActions(Object.keys(mix)).map((a) => `${actionName(a)} ${Math.round(mix[a] * 100)}%`);
  return `${hand}: ${parts.join(', ')}`;
}

/** Spoken action names: "3bet" reads better as "three bet". */
function actionName(a: string) {
  return a.replace(/^3bet/, 'three bet').replace(/^4bet/, 'four bet').replace(/_/g, ' ');
}

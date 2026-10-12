import { interpolateColors, useCurrentFrame } from 'remotion';
import { appear, touch } from '../anim';
import { C, isFCell, MARK_GRID } from '../brand';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '../wordmark';

/**
 * The Felt mark drawn straight onto the felt: same proportions as the app
 * icon tile (apps/web/src/ui/Brand.tsx), with the screen's felt standing in
 * for the tile. Cells pop in along the diagonal, then the F lights in brass
 * in a diagonal sweep. Which cells are lit never changes.
 *
 * `pop` and `light` are local frames. Pass negative values to show it settled.
 */
export function Mark({ size, pop = -100, light = -100 }: { size: number; pop?: number; light?: number }) {
  const frame = useCurrentFrame();
  const n = MARK_GRID;
  // Tile geometry with the tile padding removed: gap 3.2 and cell 8.33 of 100.
  const cell = 8.333;
  const gap = 3.2;
  const span = n * cell + (n - 1) * gap;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${span} ${span}`} style={{ display: 'block', overflow: 'visible' }}>
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        const lit = isFCell(r, c);
        const d = r + c;
        const p = touch(frame, pop + d * 2.2, 190, 13);
        const l = lit ? appear(frame, light + d * 2.4, 9) : 0;
        const fill = lit ? interpolateColors(l, [0, 1], ['rgba(255,255,255,0.08)', C.brassText]) : 'rgba(255,255,255,0.08)';
        const x = c * (cell + gap);
        const y = r * (cell + gap);
        const s = 0.35 + 0.65 * Math.min(p, 1.2);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell}
            height={cell}
            rx={cell * 0.26}
            fill={fill}
            opacity={Math.min(1, p * 1.4)}
            transform={`translate(${x + cell / 2} ${y + cell / 2}) scale(${s}) translate(${-x - cell / 2} ${-y - cell / 2})`}
          />
        );
      })}
    </svg>
  );
}

export const WORDMARK_RATIO = (() => {
  const [, , w, h] = WORDMARK_VIEWBOX.split(' ').map(Number);
  return w / h;
})();

/** The wordmark, from outlines. Never redrawn in a live font. */
export function Wordmark({ height, color = C.label }: { height: number; color?: string }) {
  return (
    <svg height={height} width={height * WORDMARK_RATIO} viewBox={WORDMARK_VIEWBOX} style={{ display: 'block' }}>
      <path d={WORDMARK_PATH} fill={color} />
    </svg>
  );
}

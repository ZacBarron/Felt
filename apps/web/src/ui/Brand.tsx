import { gridHandClass as handAt } from '@felt/core';
import { type CSSProperties, useId } from 'react';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from './wordmark';

/**
 * The mark is a real 13x13 range chart with an S painted into it. "#" cells
 * are fully in the range (brass), "+" cells are mixed hands drawn as split
 * cells, the way a range chart shows them, and they round the curves of the S.
 */
const S_ROWS = [
  '.............',
  '....+####+...',
  '..+#######+..',
  '..##.....##..',
  '..##.........',
  '..+####+.....',
  '...+######+..',
  '.......+###..',
  '..##.....##..',
  '..+#######+..',
  '....+####+...',
  '.............',
  '.............',
];

export const MARK_GRID = 13;

export type MarkCell = 'full' | 'mix' | 'off';
export function markCell(r: number, c: number): MarkCell {
  const ch = S_ROWS[r]?.[c];
  return ch === '#' ? 'full' : ch === '+' ? 'mix' : 'off';
}

/**
 * The Suited mark: an S painted into a real range chart, the way a solver
 * paints a range. Lit cells are brass, mixed cells are split, and the rest
 * of the chart stays faintly visible.
 *
 * - `tile`: the app icon form, brass on the spruce felt gradient.
 * - `glyph`: the grid alone in the current color, for use on other surfaces.
 */
export function BrandMark({
  size = 32,
  variant = 'tile',
  themed = true,
  animate = false,
}: {
  size?: number;
  variant?: 'tile' | 'glyph';
  /** Assemble along the diagonal, then light the S, like a solver painting a range. */
  animate?: boolean;
  /** Follow the active theme. Off for places that must show the master brand. */
  themed?: boolean;
}) {
  const id = useId();
  const n = MARK_GRID;
  const tile = variant === 'tile';
  const pad = tile ? 14 : 2;
  const gap = tile ? 1.3 : 1.6;
  const cell = (100 - 2 * pad - (n - 1) * gap) / n;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={animate ? `mark-anim mark-anim-${variant}` : undefined}
      style={{ flex: 'none', display: 'block' }}
    >
      {tile && (
        <>
          <defs>
            <radialGradient id={id} cx="0" cy="0" r="1.45" gradientUnits="objectBoundingBox">
              <stop offset="0" style={{ stopColor: themed ? 'var(--felt-1)' : '#2a7461' }} />
              <stop offset="0.45" style={{ stopColor: themed ? 'var(--felt-2)' : '#165244' }} />
              <stop offset="1" style={{ stopColor: themed ? 'var(--felt-3)' : '#0b2421' }} />
            </radialGradient>
          </defs>
          <rect width="100" height="100" rx="23" fill={`url(#${id})`} />
        </>
      )}
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        const kind = markCell(r, c);
        const x = pad + c * (cell + gap);
        const y = pad + r * (cell + gap);
        const rx = cell * 0.22;
        const brass = tile ? (themed ? 'var(--accent)' : '#e9b866') : 'currentColor';
        const dim = tile ? 'rgba(255,255,255,.07)' : 'currentColor';
        const anim = animate ? { className: kind === 'off' ? 'cell' : 'cell lit', style: { '--d': (r + c) / 2 } as CSSProperties } : {};
        if (kind === 'mix') {
          // A mixed hand: part of the cell in the range, like a split cell in a chart.
          const clip = `${id}-c${i}`;
          return (
            <g key={i} {...anim}>
              <clipPath id={clip}>
                <rect x={x} y={y} width={cell} height={cell} rx={rx} />
              </clipPath>
              <rect x={x} y={y} width={cell} height={cell} rx={rx} style={{ fill: tile ? 'rgba(255,255,255,.1)' : 'currentColor', fillOpacity: tile ? 1 : 0.14 }} />
              <rect x={x} y={y} width={cell * 0.55} height={cell} clipPath={`url(#${clip})`} style={{ fill: brass }} />
            </g>
          );
        }
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell}
            height={cell}
            rx={rx}
            {...anim}
            style={{ ...anim.style, fill: kind === 'full' ? brass : dim, fillOpacity: tile ? 1 : kind === 'full' ? 1 : 0.12 }}
          />
        );
      })}
    </svg>
  );
}

/** The wordmark, drawn from outlines so it never depends on a font load. */
export function Wordmark({ height = 22, color = 'currentColor' }: { height?: number; color?: string }) {
  const [, , w, h] = WORDMARK_VIEWBOX.split(' ').map(Number);
  return (
    <svg height={height} width={(height * w) / h} viewBox={WORDMARK_VIEWBOX} role="img" aria-label="Suited" style={{ display: 'block' }}>
      <path d={WORDMARK_PATH} fill={color} />
    </svg>
  );
}

export function Lockup({ size = 30 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.38 }}>
      <BrandMark size={size} />
      <Wordmark height={size * 0.78} />
    </span>
  );
}

export const TAGLINE = 'Poker, suited to you.';

/** Quiet sign off at the bottom of More and Settings. */
export function BrandFooter() {
  return (
    <footer className="brand-footer">
      <BrandMark size={36} />
      <Wordmark height={22} />
      <div className="tagline">{TAGLINE}</div>
      <div className="caption">Version {__APP_VERSION__}</div>
    </footer>
  );
}

/**
 * Hero texture: a full 13x13 range grid, fading out toward the text. Given
 * a set of hands it paints that range in brass, so the hero shows the very
 * chart you are learning.
 */
export function HeroPattern({ mixes }: { mixes?: ReadonlySet<string> }) {
  const n = 13;
  const cell = 14;
  const gap = 5;
  return (
    <svg className="hero-pattern" viewBox={`0 0 ${n * (cell + gap)} ${n * (cell + gap)}`} aria-hidden="true">
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        return (
          <rect
            key={i}
            x={c * (cell + gap)}
            y={r * (cell + gap)}
            width={cell}
            height={cell}
            rx={3.5}
            style={{
              fill: mixes?.has(handAt(r, c)) ? 'var(--accent)' : '#fff',
              fillOpacity: mixes ? (mixes.has(handAt(r, c)) ? 0.5 : 0.06) : r === c ? 0.5 : 0.06,
            }}
          />
        );
      })}
    </svg>
  );
}

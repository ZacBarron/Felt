import { gridHandClass as handAt } from '@felt/core';
import { type CSSProperties, useId } from 'react';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from './wordmark';

/** The cells of the F, on a 6x6 grid: the stem, a long top arm, a shorter middle arm. */
export function isFCell(r: number, c: number): boolean {
  return c === 0 || (r === 0 && c <= 4) || (r === 2 && c <= 3);
}

export const MARK_GRID = 6;

/**
 * The Felt mark: an F painted into a 6x6 grid, the way a solver paints a
 * range. Lit cells are brass; the rest of the grid stays faintly visible.
 *
 * - `tile`: the app icon form, brass F on the spruce felt gradient.
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
  /** Assemble along the diagonal, then light the F, like a solver painting a range. */
  animate?: boolean;
  /** Follow the active theme. Off for places that must show the master brand. */
  themed?: boolean;
}) {
  const id = useId();
  const n = MARK_GRID;
  const tile = variant === 'tile';
  const pad = tile ? 17 : 3;
  const gap = tile ? 3.2 : 4;
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
        const lit = isFCell(r, c);
        return (
          <rect
            key={i}
            x={pad + c * (cell + gap)}
            y={pad + r * (cell + gap)}
            width={cell}
            height={cell}
            rx={cell * 0.26}
            className={animate ? (lit ? 'cell lit' : 'cell') : undefined}
            style={{
              ...(animate ? ({ '--d': r + c } as CSSProperties) : null),
              fill: tile ? (lit ? (themed ? 'var(--accent)' : '#e9b866') : 'rgba(255,255,255,.08)') : 'currentColor',
              fillOpacity: tile ? 1 : lit ? 1 : 0.14,
            }}
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
    <svg height={height} width={(height * w) / h} viewBox={WORDMARK_VIEWBOX} role="img" aria-label="Felt" style={{ display: 'block' }}>
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

export const TAGLINE = 'Instinct, trained.';

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

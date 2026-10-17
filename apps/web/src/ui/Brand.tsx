import { gridHandClass as handAt } from '@felt/core';
import { type CSSProperties, useId, useState } from 'react';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from './wordmark';

/**
 * The mark is a 7x7 range chart drawn as an arrow to the top left corner,
 * where the strongest hands live. The top row is the suited aces, the left
 * column the offsuit aces, the diagonal the pairs and the filled corner the
 * premium hands. It is mirror symmetric across the diagonal, so it reads as
 * one clean shape at favicon size.
 *
 * L is a lit hand, P is a pair on the diagonal, M is a softer mixed cell.
 */
export const MARK = ['PLLLLLL', 'LPL....', 'LLP....', 'L..P...', 'L...P..', 'L....P.', 'L.....P'] as const;
export const MARK_GRID = 7;

export type MarkCell = 'pair' | 'lit' | 'mixed' | 'off';
const CELL_KIND = { P: 'pair', L: 'lit', M: 'mixed', '.': 'off' } as const;
export function markCell(r: number, c: number): MarkCell {
  return CELL_KIND[MARK[r][c] as keyof typeof CELL_KIND];
}

/** Master colors of the mark. The tile is night felt, the cells are brass. */
export const MARK_COLORS = {
  tileHi: '#18332c',
  tileLo: '#0c1614',
  rim: 'rgba(241,237,227,0.1)',
  pair: '#f1cd86',
  lit: '#e3b261',
  mixed: '#9c7438',
  off: '#1e2a27',
} as const;

/** Glyph opacity per cell kind, for the one color form. */
const GLYPH_OPACITY: Record<MarkCell, number> = { pair: 1, lit: 1, mixed: 0.5, off: 0.12 };

/**
 * The Aced mark: the UTG range on a night felt tile.
 *
 * - `tile`: the app icon form, brass cells on night felt with a faint rim.
 * - `glyph`: the grid alone in the current color, for use on other surfaces.
 */
export function BrandMark({
  size = 32,
  variant = 'tile',
  animate = false,
}: {
  size?: number;
  variant?: 'tile' | 'glyph';
  /** Assemble along the diagonal, then light the range, like a solver painting a chart. */
  animate?: boolean;
}) {
  const id = useId();
  const n = MARK_GRID;
  const tile = variant === 'tile';
  // Master geometry on a 120 unit tile: grid starts at 19, cells of 10 with gaps of 2.
  const pad = tile ? 19 : 4;
  const gap = tile ? 2 : 2.4;
  const cell = (120 - 2 * pad - (n - 1) * gap) / n;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={animate ? `mark-anim mark-anim-${variant}` : undefined}
      style={{ flex: 'none', display: 'block' }}
    >
      {tile && (
        <>
          <defs>
            <radialGradient id={id} cx="0" cy="0" r="1.3" gradientUnits="objectBoundingBox">
              <stop offset="0" stopColor={MARK_COLORS.tileHi} />
              <stop offset="1" stopColor={MARK_COLORS.tileLo} />
            </radialGradient>
          </defs>
          <rect width="120" height="120" rx="27" fill={`url(#${id})`} />
          <rect x=".5" y=".5" width="119" height="119" rx="26.5" fill="none" stroke={MARK_COLORS.rim} />
        </>
      )}
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        const kind = markCell(r, c);
        const lit = kind !== 'off';
        return (
          <rect
            key={i}
            x={pad + c * (cell + gap)}
            y={pad + r * (cell + gap)}
            width={cell}
            height={cell}
            rx={cell * 0.24}
            className={animate ? (lit ? 'cell lit' : 'cell') : undefined}
            style={{
              ...(animate ? ({ '--d': r + c } as CSSProperties) : null),
              fill: tile ? MARK_COLORS[kind] : 'currentColor',
              fillOpacity: tile ? 1 : GLYPH_OPACITY[kind],
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
    <svg height={height} width={(height * w) / h} viewBox={WORDMARK_VIEWBOX} role="img" aria-label="Aced" style={{ display: 'block' }}>
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

export const TAGLINE = 'Ace every spot.';

/**
 * Quiet sign off at the bottom of You and Settings. Tapping the mark paints
 * it again and says what it is: a small reward for the curious.
 */
export function BrandFooter() {
  const [plays, setPlays] = useState(0);
  return (
    <footer className="brand-footer">
      <button
        className="brand-footer-mark"
        aria-label="Paint the Aced mark"
        data-haptic="select"
        onClick={() => setPlays((n) => n + 1)}
      >
        <BrandMark key={plays} size={36} animate={plays > 0} />
      </button>
      <Wordmark height={22} />
      {plays > 0 ? (
        <div className="tagline" role="status" key="secret">
          The mark is a range chart. It points to the best hands.
        </div>
      ) : (
        <div className="tagline">{TAGLINE}</div>
      )}
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

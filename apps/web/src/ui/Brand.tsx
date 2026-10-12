import { useId } from 'react';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from './wordmark';

/**
 * The Felt mark: a 4x4 range grid with the pairs diagonal lit. It is the
 * one shape every solver chart shares, reduced to its essentials.
 *
 * - `tile`: the app icon form, glyph on the brand gradient.
 * - `glyph`: the grid alone, for use on top of other surfaces.
 */
export function BrandMark({ size = 32, variant = 'tile' }: { size?: number; variant?: 'tile' | 'glyph' }) {
  const id = useId();
  const n = 4;
  const pad = variant === 'tile' ? 22 : 4;
  const gap = variant === 'tile' ? 5 : 6;
  const cell = (100 - 2 * pad - (n - 1) * gap) / n;
  const tile = variant === 'tile';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      {tile && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4573FF" />
              <stop offset="1" stopColor="#0A1A4A" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="23" fill={`url(#${id})`} />
        </>
      )}
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        const lit = r === c;
        return (
          <rect
            key={i}
            x={pad + c * (cell + gap)}
            y={pad + r * (cell + gap)}
            width={cell}
            height={cell}
            rx={cell * 0.24}
            fill={tile ? (lit ? '#fff' : 'rgba(255,255,255,.17)') : 'currentColor'}
            fillOpacity={tile ? 1 : lit ? 1 : 0.18}
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
 * Hero texture: a full 13x13 range grid with the pairs diagonal brighter,
 * fading out toward the text. The mark, at chart resolution.
 */
export function HeroPattern() {
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
            fill="#fff"
            fillOpacity={r === c ? 0.55 : 0.07}
          />
        );
      })}
    </svg>
  );
}

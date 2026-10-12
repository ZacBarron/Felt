import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../brand';

/**
 * The felt: the brand's radial spruce gradient, the one hero surface in
 * every frame. A fine static noise makes it read as cloth, and the light
 * drifts slowly so the whole film has a little depth.
 */
export function Felt() {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / durationInFrames;
  const lx = interpolate(t, [0, 1], [8, 26]);
  const ly = interpolate(t, [0, 1], [-6, 4]);
  return (
    <AbsoluteFill style={{ background: C.felt3 }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(130% 95% at ${lx}% ${ly}%, ${C.felt1} 0%, ${C.felt2} 40%, ${C.felt3} 100%)`,
        }}
      />
      {/* Cloth noise. Static on purpose: felt does not shimmer. */}
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, mixBlendMode: 'soft-light', opacity: 0.55 }}>
        <filter id="felt-noise" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#felt-noise)" />
      </svg>
      {/* Vignette: keeps edges calm and pulls the eye to the center. */}
      <AbsoluteFill
        style={{ background:
            'radial-gradient(farthest-corner at 50% 42%, rgba(4,12,10,0) 0%, rgba(4,12,10,0.06) 35%, rgba(4,12,10,0.18) 60%, rgba(4,12,10,0.34) 82%, rgba(4,12,10,0.5) 100%)' }}
      />
    </AbsoluteFill>
  );
}

import { C, SANS } from '../brand';

const SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;

/**
 * A playing card that can flip: white face with a four color deck, and the
 * brand back (spruce with a fine brass lattice). `flip` runs 0 (face down)
 * to 1 (face up).
 */
export function PlayingCard({ rank, suit, w, flip }: { rank: string; suit: keyof typeof SYMBOL; w: number; flip: number }) {
  const h = w * 1.4;
  const radius = w * 0.13;
  const angle = 180 - flip * 180;
  const face: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: radius,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };
  return (
    <div style={{ width: w, height: h, perspective: w * 6 }}>
      <div style={{ position: 'relative', width: w, height: h, transformStyle: 'preserve-3d', transform: `rotateY(${angle}deg)` }}>
        <div
          style={{
            ...face,
            background: 'linear-gradient(180deg, #ffffff, #f4f4f6)',
            boxShadow: '0 30px 60px rgba(0,0,0,.32), 0 4px 10px rgba(0,0,0,.18), inset 0 0 0 1px rgba(0,0,0,.08)',
            color: C.suit[suit],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SANS,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: w * 0.5, letterSpacing: '-0.04em' }}>{rank}</span>
          <span style={{ fontSize: w * 0.36, marginTop: w * 0.05 }}>{SYMBOL[suit]}</span>
        </div>
        <div
          style={{
            ...face,
            transform: 'rotateY(180deg)',
            border: `${w * 0.045}px solid #fff`,
            background: `repeating-linear-gradient(45deg, rgba(227,178,97,.34) 0 2px, transparent 2px 13px), repeating-linear-gradient(-45deg, rgba(227,178,97,.34) 0 2px, transparent 2px 13px), radial-gradient(circle at 30% 20%, ${C.felt1}, ${C.felt3})`,
            boxShadow: '0 30px 60px rgba(0,0,0,.32), 0 4px 10px rgba(0,0,0,.18)',
          }}
        />
      </div>
    </div>
  );
}

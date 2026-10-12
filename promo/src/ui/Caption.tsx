import { useCurrentFrame } from 'remotion';
import { appear } from '../anim';
import { C, SANS } from '../brand';
import { useLayout } from './Stage';

/**
 * Scene caption: one short title and an optional second line. Copy follows
 * docs/VOICE.md: one idea per sentence, at most one comma, no em dashes.
 */
export function Caption({ title, sub, start = 8 }: { title: string; sub?: string; start?: number }) {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const a = appear(frame, start, 18);
  const b = appear(frame, start + 7, 18);
  const line = (t: number) => ({
    opacity: t,
    transform: `translateY(${(1 - t) * 22}px)`,
    filter: `blur(${(1 - t) * 6}px)`,
  });
  return (
    <div style={{ fontFamily: SANS }}>
      <div
        style={{
          ...line(a),
          fontSize: portrait ? 70 : 64,
          fontWeight: 650,
          letterSpacing: '-0.025em',
          lineHeight: 1.12,
          color: C.label,
          textWrap: 'balance',
        }}
      >
        {title}
      </div>
      {sub && (
        <div
          style={{
            ...line(b),
            marginTop: portrait ? 20 : 18,
            fontSize: portrait ? 46 : 42,
            fontWeight: 450,
            letterSpacing: '-0.012em',
            lineHeight: 1.2,
            color: C.label2,
            textWrap: 'balance',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/** Small capsule tag, used to label approximate data honestly. */
export function Tag({ children }: { children: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: SANS,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: C.label2,
        padding: '7px 16px',
        borderRadius: 999,
        boxShadow: `inset 0 0 0 1.5px ${C.label3}`,
      }}
    >
      {children}
    </span>
  );
}

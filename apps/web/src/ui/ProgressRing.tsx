interface Props {
  /** 0 to 1. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

/** Circular progress with an animated fill and centered content. */
export function ProgressRing({ value, size = 96, stroke = 9, color = 'var(--tint)', track = 'var(--fill-2)', children }: Props) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - clamped)}
          style={
            {
              '--circ': circ,
              animation: 'ring-fill 900ms var(--ease) both',
              transition: 'stroke-dashoffset 600ms var(--ease)',
            } as React.CSSProperties
          }
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

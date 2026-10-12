import { useCurrentFrame } from 'remotion';
import { appear, range, touch } from '../anim';
import { C, SANS } from '../brand';
import { CO_OPEN, handAt } from '../range';
import { BEATS } from '../timeline';
import { Caption, Tag } from '../ui/Caption';
import { Stage } from '../ui/Stage';

const N = 13;
const GRID = 960;
const GAP = 6;
const CELL = (GRID - (N - 1) * GAP) / N;
const HEADER = 128;

/** The hand the camera looks at once the chart is painted: a 75% open. */
const FOCUS = { r: 4, c: 2 }; // QTo

/** Scene 2: a 13x13 chart draws in along the diagonal, then gets painted like ink. */
export function Chart() {
  const frame = useCurrentFrame();
  const b = BEATS.chart;
  const head = appear(frame, b.header, 16);
  const focus = appear(frame, b.callout, 14);

  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const hand = handAt(r, c);
      const freq = CO_OPEN.get(hand) ?? 0;
      const drawn = appear(frame, b.draw + (r + c) * 1.05, 12);
      // Ink: a brush stroke that travels left to right, a little behind on lower rows.
      const ink = range(frame, [b.paint + c * 1.7 + r * 0.55, b.paint + c * 1.7 + r * 0.55 + 11], [0, freq]);
      const isFocus = r === FOCUS.r && c === FOCUS.c;
      const lift = isFocus ? touch(frame, b.callout, 220, 15) : 0;
      const dim = isFocus ? 1 : 1 - 0.5 * focus;
      const x = c * (CELL + GAP);
      const y = HEADER + r * (CELL + GAP);
      const label = (color: string) => (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: CELL,
            height: CELL,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color,
          }}
        >
          {hand}
        </span>
      );
      cells.push(
        <div
          key={hand}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: CELL,
            height: CELL,
            borderRadius: CELL * 0.2,
            overflow: 'hidden',
            background: r === c ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.07)',
            opacity: drawn,
            filter: dim < 1 ? `brightness(${dim}) saturate(${0.6 + 0.4 * dim})` : undefined,
            transform: `scale(${(0.6 + 0.4 * drawn) * (1 + 0.32 * lift)})`,
            zIndex: isFocus ? 2 : 1,
            boxShadow: isFocus
              ? `0 0 0 ${3 * lift}px ${C.brass}, 0 ${18 * lift}px ${40 * lift}px rgba(0,0,0,${0.45 * lift})`
              : undefined,
          }}
        >
          {label(freq > 0 ? C.label2 : C.label3)}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: CELL * ink, overflow: 'hidden', background: C.raise }}>
            {label(C.onAction)}
          </div>
        </div>,
      );
    }
  }

  const fx = FOCUS.c * (CELL + GAP) + CELL + 34;
  const fy = HEADER + FOCUS.r * (CELL + GAP) + CELL / 2;
  const pop = touch(frame, b.callout + 4, 200, 17);

  const visual = (
    <div style={{ position: 'relative', width: GRID, height: HEADER + GRID, margin: '0 auto', fontFamily: SANS }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: head,
          transform: `translateY(${(1 - head) * 16}px)`,
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.brassText }}>
            Chart
          </div>
          <div style={{ fontSize: 46, fontWeight: 650, letterSpacing: '-0.02em', color: C.label, marginTop: 4 }}>CO open, 100bb</div>
        </div>
        <Tag>Approximate</Tag>
      </div>
      {cells}
      {/* Callout for the focused hand: what a mixed cell means. */}
      <div
        style={{
          position: 'absolute',
          left: fx,
          top: fy,
          width: 380,
          padding: '26px 28px 24px',
          borderRadius: 30,
          background: C.surface,
          boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.08)',
          opacity: Math.min(1, pop * 1.3),
          transform: `translateY(-50%) translateX(${(1 - pop) * -24}px) scale(${0.9 + 0.1 * pop})`,
          transformOrigin: '0% 50%',
          zIndex: 3,
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', color: C.label }}>QTo</div>
        <div style={{ display: 'flex', height: 22, borderRadius: 11, overflow: 'hidden', marginTop: 18, background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ width: `${75 * appear(frame, b.callout + 10, 16)}%`, background: C.raise }} />
          <div style={{ flex: 1, background: C.fold, opacity: appear(frame, b.callout + 18, 10) }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 30, fontWeight: 600 }}>
          <span style={{ color: C.raise }}>Raise 75%</span>
          <span style={{ color: C.label2 }}>Fold 25%</span>
        </div>
      </div>
    </div>
  );

  return <Stage visual={visual} boxHeight={HEADER + GRID} caption={<Caption title="Learn the charts." sub="Mixes included." start={b.caption} />} />;
}

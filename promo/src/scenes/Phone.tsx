import { useCurrentFrame } from 'remotion';
import { appear, lerp, settle, touch } from '../anim';
import { C, SANS, SERIF } from '../brand';
import { CO_OPEN, handAt } from '../range';
import { BEATS } from '../timeline';
import { Caption } from '../ui/Caption';
import { Stage } from '../ui/Stage';

/** Copy matches the Today screen (apps/web/src/pages/DashboardPage.tsx). */
const TASKS = [
  { label: 'Finish a lesson', detail: '5 min' },
  { label: 'Clear your review', detail: '12 cards' },
  { label: 'Play the daily challenge', detail: '5 decisions' },
];
const PW = 560;
const PH = 1140;

/** Scene 5: a phone with the Today screen, drawn from simple shapes. */
export function Phone() {
  const frame = useCurrentFrame();
  const b = BEATS.phone;
  const enter = settle(frame, b.enter);
  const inner = (i: number) => appear(frame, 8 + i * 4, 16);

  const visual = (
    <div style={{ width: 1000, height: PH + 10, display: 'flex', justifyContent: 'center', perspective: 2400 }}>
      <div
        style={{
          position: 'relative',
          width: PW,
          height: PH,
          borderRadius: 92,
          background: '#0d1210',
          boxShadow:
            'inset 0 0 0 2px rgba(255,255,255,0.14), inset 0 0 0 9px #050807, 0 70px 140px rgba(0,0,0,0.55), 0 16px 40px rgba(0,0,0,0.35)',
          transform: `translateY(${lerp(enter, 420, 0)}px) rotateX(${lerp(enter, 22, 0)}deg) scale(${lerp(enter, 0.9, 1)})`,
          transformOrigin: '50% 100%',
          opacity: Math.min(1, enter * 2),
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 14,
            borderRadius: 80,
            background: C.night,
            overflow: 'hidden',
            fontFamily: SANS,
            color: C.label,
          }}
        >
          {/* Status bar and island */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 22, display: 'flex', justifyContent: 'space-between', padding: '0 48px', fontSize: 22, fontWeight: 600 }}>
            <span>9:41</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 26, height: 13, borderRadius: 4, boxShadow: 'inset 0 0 0 2px rgba(243,239,230,.6)', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 3, top: 3, bottom: 3, width: 16, borderRadius: 2, background: C.label }} />
              </span>
            </span>
          </div>
          <div style={{ position: 'absolute', left: '50%', top: 18, width: 150, height: 40, marginLeft: -75, borderRadius: 20, background: '#000' }} />

          <div style={{ padding: '108px 30px 0' }}>
            <div style={{ fontFamily: SERIF, fontSize: 68, lineHeight: 1, letterSpacing: '-0.01em', opacity: inner(0), transform: `translateY(${(1 - inner(0)) * 16}px)` }}>
              Today
            </div>

            {/* Hero: next lesson. Flat spruce here, since the felt gradient already fills the frame. */}
            <div
              style={{
                marginTop: 26,
                borderRadius: 30,
                padding: '26px 26px 24px',
                background: `linear-gradient(160deg, ${C.base700}, ${C.base900})`,
                boxShadow: '0 14px 30px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,0.06)',
                opacity: inner(1),
                transform: `translateY(${(1 - inner(1)) * 20}px)`,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.brassText }}>Next in your plan</div>
              <div style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1.05, marginTop: 10 }}>Open from the cutoff</div>
              <div style={{ fontSize: 20, color: C.label2, marginTop: 8 }}>Preflop · 5 min</div>
              <div
                style={{
                  marginTop: 20,
                  display: 'inline-flex',
                  padding: '14px 28px',
                  borderRadius: 999,
                  background: C.brass,
                  color: C.base950,
                  fontSize: 22,
                  fontWeight: 650,
                }}
              >
                Start lesson
              </div>
            </div>

            {/* Today's plan */}
            <div
              style={{
                marginTop: 22,
                borderRadius: 30,
                background: C.surface,
                padding: '22px 24px 8px',
                opacity: inner(2),
                transform: `translateY(${(1 - inner(2)) * 24}px)`,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 650 }}>Today's plan</div>
              {TASKS.map((task, i) => {
                const done = touch(frame, b.checks[i], 300, 15);
                const on = frame >= b.checks[i];
                return (
                  <div
                    key={task.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '18px 0',
                      borderTop: i === 0 ? undefined : '1px solid rgba(255,255,255,0.07)',
                      marginTop: i === 0 ? 10 : 0,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        flex: 'none',
                        boxShadow: on ? undefined : 'inset 0 0 0 2.5px rgba(243,239,230,.28)',
                        background: on ? C.green : 'transparent',
                        transform: `scale(${on ? 0.6 + 0.4 * done : 1})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on && (
                        <svg width={24} height={24} viewBox="0 0 24 24">
                          <path d="M5.5 12.5l4 4 9-9.5" fill="none" stroke={C.onAction} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, fontSize: 22, fontWeight: 500, whiteSpace: 'nowrap', color: on ? C.label2 : C.label }}>{task.label}</div>
                    <div style={{ fontSize: 18, whiteSpace: 'nowrap', color: C.label2 }}>{task.detail}</div>
                  </div>
                );
              })}
            </div>
            {/* Now learning: the chart in progress, as a small brass grid. */}
            <div
              style={{
                marginTop: 22,
                borderRadius: 30,
                background: C.surface,
                padding: '22px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                opacity: inner(3),
                transform: `translateY(${(1 - inner(3)) * 24}px)`,
              }}
            >
              <MiniChart />
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.label2 }}>Now learning</div>
                <div style={{ fontSize: 24, fontWeight: 650, marginTop: 6 }}>CO open</div>
                <div style={{ fontSize: 19, color: C.label2, marginTop: 4 }}>Close calls first</div>
              </div>
            </div>
          </div>

          {/* Tab bar: the one floating glass surface. */}
          <div
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              bottom: 30,
              height: 96,
              borderRadius: 48,
              background: 'rgba(26, 33, 30, 0.72)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 18px',
              opacity: inner(3),
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: i === 0 ? 96 : 34,
                  height: i === 0 ? 70 : 34,
                  borderRadius: i === 0 ? 35 : 10,
                  background: i === 0 ? 'rgba(233,184,102,0.16)' : 'transparent',
                  boxShadow: i === 0 ? undefined : 'inset 0 0 0 2.5px rgba(243,239,230,.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i === 0 && <div style={{ width: 30, height: 30, borderRadius: 9, background: C.brassText }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return <Stage visual={visual} boxHeight={PH + 10} caption={<Caption title="Practice a few minutes a day." start={b.caption} />} />;
}

/** A tiny 13x13 grid: hands you have solid in brass, the rest faint. */
function MiniChart() {
  const n = 13;
  const cell = 7;
  const gap = 2;
  return (
    <svg width={n * (cell + gap)} height={n * (cell + gap)} style={{ flex: 'none' }}>
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        const hand = handAt(r, c);
        const f = CO_OPEN.get(hand) ?? 0;
        return (
          <rect
            key={i}
            x={c * (cell + gap)}
            y={r * (cell + gap)}
            width={cell}
            height={cell}
            rx={1.8}
            fill={f >= 0.95 ? C.brass : '#fff'}
            fillOpacity={f >= 0.95 ? 0.85 : f > 0 ? 0.22 : 0.07}
          />
        );
      })}
    </svg>
  );
}

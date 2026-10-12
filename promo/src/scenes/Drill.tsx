import { useCurrentFrame } from 'remotion';
import { appear, lerp, range, settle, touch } from '../anim';
import { C, SANS } from '../brand';
import { BEATS } from '../timeline';
import { Caption, Tag } from '../ui/Caption';
import { PlayingCard } from '../ui/PlayingCard';
import { Stage } from '../ui/Stage';

/**
 * The spot and its answer come from packages/content/src/charts.ts: in
 * "BB vs BTN open", A5s 3bets 70% of the time and calls the rest.
 */
const MIX = [
  { id: '3bet', label: '3bet', pct: 70, color: C.threeBet, text: C.threeBet },
  { id: 'call', label: 'Call', pct: 30, color: C.call, text: C.green },
];
const BUTTONS = [
  { id: 'fold', label: 'Fold', color: C.fold },
  { id: 'call', label: 'Call', color: C.call },
  { id: '3bet', label: '3bet', color: C.threeBet },
];
const PICK = '3bet';
const H = 990;

/** Scene 3: deal, flip, tap an answer, see the full mix. */
export function Drill() {
  const frame = useCurrentFrame();
  const b = BEATS.drill;
  const head = appear(frame, 0, 16);

  const cards = (['A', '5'] as const).map((rank, i) => {
    const land = settle(frame, b.deal + i * 6);
    const flip = range(frame, [b.flip + i * 5, b.flip + i * 5 + 14], [0, 1]);
    const tilt = i === 0 ? -5 : 5;
    return (
      <div
        key={rank}
        style={{
          // Dealt across the table from the right, staying inside the card band.
          transform: `translateX(${lerp(land, 820 - i * 140, 0)}px) translateY(${lerp(land, -60, 0)}px) rotate(${lerp(land, 28, tilt)}deg)`,
          opacity: Math.min(1, land * 3),
        }}
      >
        <PlayingCard rank={rank} suit="d" w={236} flip={flip} />
      </div>
    );
  });

  const tapped = frame >= b.tap;
  const press = touch(frame, b.tap, 420, 20) - touch(frame, b.tap + 5, 260, 14);
  const ripple = range(frame, [b.tap, b.tap + 18], [0, 1]);
  const verdict = touch(frame, b.verdict, 240, 15);
  const check = range(frame, [b.verdict + 2, b.verdict + 14], [0, 1]);

  const visual = (
    <div style={{ position: 'relative', width: 1000, height: H, fontFamily: SANS }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: head,
          transform: `translateY(${(1 - head) * 16}px)`,
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.brassText }}>
            Drill
          </div>
          <div style={{ fontSize: 46, fontWeight: 650, letterSpacing: '-0.02em', color: C.label, marginTop: 4 }}>BB vs BTN open</div>
          <div style={{ fontSize: 32, color: C.label2, marginTop: 6 }}>BTN opens 2.5bb.</div>
        </div>
        <Tag>Approximate</Tag>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginTop: 56 }}>{cards}</div>

      <div style={{ display: 'flex', gap: 24, marginTop: 70 }}>
        {BUTTONS.map((btn, i) => {
          const a = appear(frame, b.buttons + i * 3, 14);
          const picked = btn.id === PICK;
          const scale = picked ? 1 - 0.07 * press : 1;
          const fade = tapped && !picked ? appear(frame, b.tap, 10) : 0;
          return (
            <div
              key={btn.id}
              style={{
                position: 'relative',
                flex: 1,
                height: 128,
                borderRadius: 64,
                background: btn.color,
                color: C.onAction,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 46,
                fontWeight: 650,
                letterSpacing: '-0.015em',
                overflow: 'hidden',
                opacity: a * (1 - 0.3 * fade),
                filter: fade ? `saturate(${1 - 0.7 * fade}) brightness(${1 - 0.35 * fade})` : undefined,
                transform: `translateY(${(1 - a) * 30}px) scale(${scale})`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,.2), 0 10px 26px rgba(0,0,0,.28)${
                  picked && tapped ? `, 0 0 0 ${5 * appear(frame, b.tap, 8)}px rgba(243,239,230,.9)` : ''
                }`,
              }}
            >
              {btn.label}
              {picked && tapped && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 420,
                    height: 420,
                    marginLeft: -210,
                    marginTop: -210,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.35)',
                    transform: `scale(${0.1 + ripple})`,
                    opacity: 1 - ripple,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginTop: 64,
          opacity: Math.min(1, verdict * 1.5),
          transform: `translateY(${(1 - verdict) * 14}px)`,
        }}
      >
        <svg width={64} height={64} viewBox="0 0 24 24" style={{ transform: `scale(${0.7 + 0.3 * verdict})` }}>
          <circle cx="12" cy="12" r="12" fill={C.green} />
          <path
            d="M6.8 12.4l3.4 3.3 7-7.4"
            fill="none"
            stroke={C.onAction}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - check}
          />
        </svg>
        <span style={{ fontSize: 50, fontWeight: 650, color: C.green, letterSpacing: '-0.015em' }}>Correct</span>
      </div>

      <MixBar frame={frame} start={b.mix} />
    </div>
  );

  return (
    <Stage
      visual={visual}
      boxHeight={H}
      caption={<Caption title="Answer in seconds." sub="See the full mix." start={b.caption} />}
    />
  );
}

/** The strategy for this hand, painted from the left like ink. */
function MixBar({ frame, start }: { frame: number; start: number }) {
  const show = appear(frame, start, 12);
  let offset = 0;
  return (
    <div style={{ marginTop: 34, opacity: show }}>
      <div style={{ display: 'flex', height: 40, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
        {MIX.map((m) => {
          const s = start + 2 + (offset / 100) * 22;
          offset += m.pct;
          const fill = range(frame, [s, s + 16], [0, 1]);
          return <div key={m.id} style={{ width: `${m.pct * fill}%`, background: m.color }} />;
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 36, fontWeight: 600 }}>
        {MIX.map((m, i) => (
          <span key={m.id} style={{ color: m.text, opacity: appear(frame, start + 10 + i * 8, 12) }}>
            {m.label} {m.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

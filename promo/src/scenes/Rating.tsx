import { useCurrentFrame } from 'remotion';
import { appear, easeOut, range } from '../anim';
import { C, SANS, SERIF } from '../brand';
import { BEATS } from '../timeline';
import { Caption } from '../ui/Caption';
import { Stage } from '../ui/Stage';

/**
 * Example numbers, checked against the tier table in packages/core/src/rating.ts:
 * 1438 is Sharp (1350 and up), and Regular starts at 1500, 62 points away.
 * The ring shows progress through the current tier, like nextTier() in the app.
 */
const FROM = 1180;
const TO = 1438;
const TIER = 'Sharp';
const TIER_MIN = 1350;
const NEXT = { name: 'Regular', min: 1500 };
const H = 860;

/** Scene 4: the Felt Rating counts up inside a brass ring; the tier wipes in like ink. */
export function Rating() {
  const frame = useCurrentFrame();
  const b = BEATS.rating;
  const t = range(frame, [b.count, b.count + b.countDur], [0, 1], easeOut);
  const value = Math.round(FROM + (TO - FROM) * t);
  const progress = ((TO - TIER_MIN) / (NEXT.min - TIER_MIN)) * range(frame, [b.ring, b.ring + b.countDur], [0, 1]);
  const ring = appear(frame, 0, 16);
  const ink = range(frame, [b.tier, b.tier + 20], [0, 1]);
  const note = appear(frame, b.tier + 14, 16);

  const size = 680;
  const stroke = 22;
  const rad = (size - stroke) / 2;
  const circ = 2 * Math.PI * rad;

  const visual = (
    <div style={{ width: 1000, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: SANS }}>
      <div style={{ position: 'relative', width: size, height: size, marginTop: 40, opacity: ring, transform: `scale(${0.94 + 0.06 * ring})` }}>
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={rad}
            fill="none"
            stroke={C.brass}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circ * progress} ${circ}`}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.label2 }}>Felt Rating</div>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 230,
              lineHeight: 1,
              marginTop: 10,
              color: C.label,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </div>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: 92,
              lineHeight: 1.1,
              marginTop: 6,
              color: C.brassText,
              // Ink: a soft edged mask wiping in from the left.
              WebkitMaskImage: `linear-gradient(90deg, #000 ${ink * 130 - 30}%, transparent ${ink * 130}%)`,
              maskImage: `linear-gradient(90deg, #000 ${ink * 130 - 30}%, transparent ${ink * 130}%)`,
            }}
          >
            {TIER}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 50, fontSize: 38, fontWeight: 500, color: C.label2, opacity: note, transform: `translateY(${(1 - note) * 12}px)` }}>
        {NEXT.min - TO} points to {NEXT.name}
      </div>
    </div>
  );

  return (
    <Stage
      visual={visual}
      boxHeight={H}
      caption={<Caption title="A rating that tracks real skill." sub="Cards you grade yourself never count." start={b.caption} />}
    />
  );
}

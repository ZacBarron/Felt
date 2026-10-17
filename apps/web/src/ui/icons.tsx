/**
 * Aced's own icon set, drawn on a 24pt grid in the spirit of SF Symbols:
 * 1.75 stroke, round caps and joins, optical centering. `filled` is the
 * selected state (like a .fill symbol) and tints the main shapes.
 */

import { type SVGProps, useId } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'fill'> {
  size?: number;
  filled?: boolean;
}

function Svg({ size = 24, filled: _filled, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * Path data shared with canvas drawings (the share cards), so an icon drawn
 * on an image matches the one in the interface. Strokes are on the 24pt grid.
 */
export const GLYPHS = {
  check: 'm5 12.5 4.5 4.5L19 7.5',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  minus: 'M6 12h12',
  flame: 'M12 3s5.75 4.4 5.75 10.5a5.75 5.75 0 0 1-11.5 0c0-3 2-5 2-5 0 2.5 1.6 3.6 1.6 3.6C9.85 8 12 3 12 3Z',
  freeze: [
    'M12 3.5v17M4.65 7.75l14.7 8.5M4.65 16.25l14.7-8.5',
    'm9.75 4.75 2.25 2 2.25-2M9.75 19.25l2.25-2 2.25 2',
    'm4.4 10.6 3 .65.95-2.9M19.6 13.4l-3-.65-.95 2.9',
    'm4.4 13.4 3-.65.95 2.9M19.6 10.6l-3 .65-.95-2.9',
  ],
} as const;

const fillProps = (filled?: boolean) => (filled ? { fill: 'currentColor', fillOpacity: 0.22 } : {});

/** Today: an activity style ring, three quarters closed. */
export function TodayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" opacity={0.3} />
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" strokeWidth={p.filled ? 3 : 2.25} />
    </Svg>
  );
}

/** Review: two fanned playing cards; the back card is cut away where the front one covers it. */
export function ReviewIcon(p: IconProps) {
  const id = useId();
  const front = 'rotate(10 15 11.5)';
  return (
    <Svg {...p}>
      <mask id={id}>
        <rect width="24" height="24" fill="#fff" />
        <rect x="9.25" y="3.25" width="11.5" height="15.5" rx="2.9" transform={front} fill="#000" />
      </mask>
      <rect x="3.5" y="5.5" width="10" height="14" rx="2.2" transform="rotate(-10 8.5 12.5)" mask={`url(#${id})`} />
      <rect x="10" y="4" width="10" height="14" rx="2.2" transform={front} {...fillProps(p.filled)} />
      <path d="M15 8.6 13.4 11 15 13.4 16.6 11z" transform={front} fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Drills: a stopwatch, since recall is timed. */
export function DrillsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13.5" r="7.25" {...fillProps(p.filled)} />
      <path d="M10 3h4M12 3v3.25M12 13.5V9.75M18.4 7.1l1.1-1.1" />
    </Svg>
  );
}

/** Ranges: the 13x13 chart in miniature, pairs on the diagonal. */
export function RangesIcon(p: IconProps) {
  const cells = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ({ r, c })));
  return (
    <Svg {...p} strokeWidth={1.5}>
      {cells.map(({ r, c }) => (
        <rect
          key={`${r}${c}`}
          x={3.75 + c * 6}
          y={3.75 + r * 6}
          width={4.5}
          height={4.5}
          rx={1.3}
          fill={r === c ? 'currentColor' : p.filled ? 'currentColor' : 'none'}
          fillOpacity={r === c ? 1 : 0.22}
        />
      ))}
    </Svg>
  );
}

export function MoreIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.75" {...fillProps(p.filled)} />
      <circle cx="8" cy="12" r="0.6" fill="currentColor" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" strokeWidth={1.5} />
      <circle cx="16" cy="12" r="0.6" fill="currentColor" strokeWidth={1.5} />
    </Svg>
  );
}

export function LearnIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6.6C10 5.1 7 4.6 3.75 5v13.4c3.25-.4 6.25.1 8.25 1.6 2-1.5 5-2 8.25-1.6V5C17 4.6 14 5.1 12 6.6Z" {...fillProps(p.filled)} />
      <path d="M12 6.6V20" />
    </Svg>
  );
}

export function ScenariosIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 20.5V4" />
      <path d="M6 4.75h11.5l-2.25 4 2.25 4H6" {...fillProps(p.filled)} />
    </Svg>
  );
}

/** Spot Lab: a poker table seen from above. */
export function LabIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.75" y="6" width="18.5" height="12" rx="6" {...fillProps(p.filled)} />
      <rect x="6.5" y="9.25" width="11" height="5.5" rx="2.75" opacity={0.45} />
    </Svg>
  );
}

export function ExploitsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.75 12C5 7.5 8.3 5.25 12 5.25S19 7.5 21.25 12C19 16.5 15.7 18.75 12 18.75S5 16.5 2.75 12Z" {...fillProps(p.filled)} />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function LogIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 4.5H6.75a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V13" />
      <path d="m17.6 3.9 2.5 2.5-8 8-3.3.8.8-3.3z" {...fillProps(p.filled)} />
    </Svg>
  );
}

/** Import: an arrow down into a tray. */
export function ImportIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 14v3.25a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V14" {...fillProps(p.filled)} />
      <path d="M12 4v10.5" />
      <path d="m8 10.5 4 4 4-4" />
    </Svg>
  );
}

/** Account: a head and shoulders. */
export function AccountIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.75" {...fillProps(p.filled)} />
      <path d="M4.75 19.5c1.2-3.3 4-5 7.25-5s6.05 1.7 7.25 5" />
    </Svg>
  );
}

/** League: a three step podium. */
export function LeagueIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 19.5V9.5h6v10" {...fillProps(p.filled)} />
      <path d="M3.5 19.5v-6H9M15 13.5h5.5v6M2.5 19.5h19" />
    </Svg>
  );
}

export function StatsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="12.5" width="3.5" height="7.5" rx="1.2" {...fillProps(p.filled)} />
      <rect x="10.25" y="8" width="3.5" height="12" rx="1.2" {...fillProps(p.filled)} />
      <rect x="16.5" y="4" width="3.5" height="16" rx="1.2" {...fillProps(p.filled)} />
    </Svg>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h7M15 17h5" />
      <circle cx="15" cy="7" r="2" {...fillProps(p.filled)} />
      <circle cx="9" cy="12" r="2" {...fillProps(p.filled)} />
      <circle cx="13" cy="17" r="2" {...fillProps(p.filled)} />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.25}>
      <path d={GLYPHS.close} />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.5}>
      <path d={GLYPHS.check} />
    </Svg>
  );
}

export function MinusIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.25}>
      <path d={GLYPHS.minus} />
    </Svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.25}>
      <path d="M12 6v12M6 12h12" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.25}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Svg>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.25}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.25}>
      <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />
    </Svg>
  );
}

/** Info: a lowercase i in a circle, for "about this" disclosures. */
export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" {...fillProps(p.filled)} />
      <path d="M12 11v5.25" />
      <circle cx="12" cy="7.75" r="0.6" fill="currentColor" strokeWidth={1.2} />
    </Svg>
  );
}

export function UndoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 6.5 4.75 10.75 9 15" />
      <path d="M4.75 10.75h10a4.5 4.5 0 0 1 0 9H11.5" />
    </Svg>
  );
}

export function FlameIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={1.6}>
      <path
        d={GLYPHS.flame}
        fill="currentColor"
        fillOpacity={0.9}
      />
    </Svg>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5" {...fillProps(p.filled)} />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Svg>
  );
}

/** A goal: concentric rings with a center mark. */
export function TargetIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="12" cy="12" r="4.5" {...fillProps(p.filled)} />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" {...fillProps(p.filled)} />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" {...fillProps(p.filled)} />
      <path d="M10 20.25a2.25 2.25 0 0 0 4 0" />
    </Svg>
  );
}

/** Solver: a game tree, one node splitting into three. */
export function SolverIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 7v3.5M12 10.5 6 15M12 10.5V15M12 10.5l6 4.5" />
      <circle cx="12" cy="5" r="2" {...fillProps(p.filled)} />
      <circle cx="6" cy="17" r="2" />
      <circle cx="12" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </Svg>
  );
}

/** Skipping ahead: two chevrons. */
export function SkipIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2}>
      <path d="m6 6.5 5.5 5.5L6 17.5M12.5 6.5 18 12l-5.5 5.5" />
    </Svg>
  );
}

export function TrophyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 4.5h8v5a4 4 0 0 1-8 0z" {...fillProps(p.filled)} />
      <path d="M8 6.5H5.5a2.5 2.5 0 0 0 2.75 3.4M16 6.5h2.5a2.5 2.5 0 0 1-2.75 3.4M12 13.5v3M8.5 19.5h7M10 16.5h4l.5 3h-5z" />
    </Svg>
  );
}

/** The weekly challenge: a medal hanging from a ribbon. */
export function MedalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 3.75h7l-2.6 6.15M8.5 3.75l2.6 6.15" />
      <circle cx="12" cy="15" r="5.25" {...fillProps(p.filled)} />
      <path d="m12 12.6.75 1.5 1.65.25-1.2 1.15.3 1.65-1.5-.8-1.5.8.3-1.65-1.2-1.15 1.65-.25z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Save: a bookmark ribbon. */
export function BookmarkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4.5h10a1 1 0 0 1 1 1v14.25l-6-3.9-6 3.9V5.5a1 1 0 0 1 1-1Z" fill={p.filled ? 'currentColor' : 'none'} />
    </Svg>
  );
}

/** Game: a poker chip with four edge spots. */
export function ChipIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="12" cy="12" r="3.75" {...fillProps(p.filled)} />
      <path d="M12 3.75v2.5M12 17.75v2.5M3.75 12h2.5M17.75 12h2.5" />
    </Svg>
  );
}

/** Rake: a percent sign. */
export function PercentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 6 6 18" />
      <circle cx="7.75" cy="7.75" r="2.25" {...fillProps(p.filled)} />
      <circle cx="16.25" cy="16.25" r="2.25" {...fillProps(p.filled)} />
    </Svg>
  );
}

/** Appearance: a circle half light, half dark. */
export function AppearanceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 3.75a8.25 8.25 0 0 0 0 16.5Z" fill="currentColor" />
    </Svg>
  );
}

/** Data: a storage cylinder. */
export function DataIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="6.5" rx="7" ry="2.75" {...fillProps(p.filled)} />
      <path d="M5 6.5v11c0 1.5 3.15 2.75 7 2.75s7-1.25 7-2.75v-11M5 12c0 1.5 3.15 2.75 7 2.75S19 13.5 19 12" />
    </Svg>
  );
}

/** Developer: angle brackets around a slash. */
export function CodeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13.25 5.5l-2.5 13" />
    </Svg>
  );
}

/** Coach: a speech bubble holding a card pip, a coach talking through a hand. */
export function CoachIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M12 4.25c4.56 0 8.25 3.03 8.25 6.75s-3.69 6.75-8.25 6.75c-.9 0-1.77-.12-2.58-.33L5.25 19.5l1.1-3.6C4.75 14.66 3.75 12.92 3.75 11c0-3.72 3.69-6.75 8.25-6.75z"
        {...fillProps(p.filled)}
      />
      <path d="M12 8.2 10.2 11 12 13.8 13.8 11z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Send: an arrow pointing up, as in Messages. */
export function SendIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 19V5.5M6.5 11 12 5.5l5.5 5.5" />
    </Svg>
  );
}

export type IconComponent =(p: IconProps) => React.ReactElement;

/** Glossary: a page with a capital A and two lines of definition. */
export function GlossaryIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4.25" y="3.75" width="15.5" height="16.5" rx="3" {...fillProps(p.filled)} />
      <path d="M7.75 15.25 10 8.75l2.25 6.5M8.55 13h2.9" />
      <path d="M14.75 10.5h2M14.75 13.5h2" />
    </Svg>
  );
}

/** Passkey: a person with a key, the shape people know from passkey prompts. */
export function PasskeyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" {...fillProps(p.filled)} />
      <path d="M2.75 19.5c.95-3.2 3.3-5 6.25-5 1.55 0 2.95.5 4 1.4" />
      <circle cx="17.5" cy="10.5" r="2.75" {...fillProps(p.filled)} />
      <path d="M17.5 13.25v7.25M17.5 18.25h2M17.5 16h1.5" />
    </Svg>
  );
}

/** Email: an envelope. */
export function EmailIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" {...fillProps(p.filled)} />
      <path d="m4.75 7.5 7.25 5.5 7.25-5.5" />
    </Svg>
  );
}

/** Saved to the cloud: a cloud with a check, or a slash when offline. */
export function CloudIcon({ offline, ...p }: IconProps & { offline?: boolean }) {
  return (
    <Svg {...p}>
      <path d="M7.25 18.5h10a3.75 3.75 0 0 0 .6-7.45A5.5 5.5 0 0 0 7.2 9.55 4.5 4.5 0 0 0 7.25 18.5Z" {...fillProps(p.filled)} />
      {offline ? <path d="M4.5 4.5l15 15" /> : <path d="m9.75 13.75 1.75 1.75 3-3.25" />}
    </Svg>
  );
}

/** Log out: a door with an arrow leaving it. */
export function LogOutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 4.5H7.25a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H13" />
      <path d="M10.5 12H20M16.75 8.5 20.25 12l-3.5 3.5" />
    </Svg>
  );
}

/** A device: a phone, for "this device" in sync choices. */
export function DeviceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6.5" y="3" width="11" height="18" rx="2.75" {...fillProps(p.filled)} />
      <path d="M10.5 18h3" />
    </Svg>
  );
}

/** Help: a question mark in a circle, for "how this screen works". */
export function HelpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" {...fillProps(p.filled)} />
      <path d="M9.6 9.6a2.45 2.45 0 0 1 4.75.8c0 1.6-2.35 2.1-2.35 3.6" />
      <circle cx="12" cy="16.9" r="0.6" fill="currentColor" strokeWidth={1.2} />
    </Svg>
  );
}

/** Paint: a brush laying down a stroke, for painting a chart from memory. */
export function BrushIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19.25 4.75 11.5 12.5" />
      <path d="M11.9 12.1a2.6 2.6 0 0 0-3.7 0c-1 1-.7 2.4-1.45 3.4-.5.7-1.3 1-2 1.1 1 1.5 3.3 2.2 5.2 1.4 1.4-.6 2.6-1.9 2.6-3.6 0-.9-.3-1.7-.65-2.3Z" {...fillProps(p.filled)} />
    </Svg>
  );
}

/** Share: a tray with an arrow leaving it, as in the system share sheet. */
export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 14.5V3.75" />
      <path d="m8.25 7.25 3.75-3.5 3.75 3.5" />
      <path d="M8.5 10.5H7.25a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H15.5" />
    </Svg>
  );
}

/** Streak freeze: a six armed snowflake, for a missed day a freeze covered. */
export function FreezeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {GLYPHS.freeze.map((d) => (
        <path key={d} d={d} />
      ))}
    </Svg>
  );
}

/** Link: two chain links at an angle, for copying a link. */
export function LinkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10.25 13.75a3.75 3.75 0 0 0 5.3 0l3.2-3.2a3.75 3.75 0 0 0-5.3-5.3l-1.2 1.2" />
      <path d="M13.75 10.25a3.75 3.75 0 0 0-5.3 0l-3.2 3.2a3.75 3.75 0 0 0 5.3 5.3l1.2-1.2" />
    </Svg>
  );
}

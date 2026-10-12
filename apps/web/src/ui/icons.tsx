/**
 * Felt's own icon set, drawn on a 24pt grid in the spirit of SF Symbols:
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
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.5}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function MinusIcon(p: IconProps) {
  return (
    <Svg {...p} strokeWidth={2.25}>
      <path d="M6 12h12" />
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
        d="M12 3s5.75 4.4 5.75 10.5a5.75 5.75 0 0 1-11.5 0c0-3 2-5 2-5 0 2.5 1.6 3.6 1.6 3.6C9.85 8 12 3 12 3Z"
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

/** Save: a bookmark ribbon. */
export function BookmarkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4.5h10a1 1 0 0 1 1 1v14.25l-6-3.9-6 3.9V5.5a1 1 0 0 1 1-1Z" fill={p.filled ? 'currentColor' : 'none'} />
    </Svg>
  );
}

export type IconComponent = (p: IconProps) => React.ReactElement;

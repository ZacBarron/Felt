import { Easing, interpolate, spring } from 'remotion';
import { FPS } from './timeline';

/** Ease out for things that appear (docs/BRAND.md, Motion). */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 to 1 over `dur` frames from `start`, eased out. */
export function appear(frame: number, start: number, dur = 14, easing = easeOut): number {
  return interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing });
}

/** Linear map with clamping. */
export function lerp(t: number, from: number, to: number): number {
  return from + (to - from) * t;
}

export function range(frame: number, input: [number, number], output: [number, number], easing = easeOut): number {
  return interpolate(frame, input, output, { ...clamp, easing });
}

/** Springs for things that are touched. */
export function touch(frame: number, start: number, stiffness = 260, damping = 16): number {
  return spring({ frame: frame - start, fps: FPS, config: { stiffness, damping, mass: 0.7 } });
}

/** A soft settle for things that land, like a dealt card. */
export function settle(frame: number, start: number): number {
  return spring({ frame: frame - start, fps: FPS, config: { stiffness: 120, damping: 18, mass: 0.9 } });
}

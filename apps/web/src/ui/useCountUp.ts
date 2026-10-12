import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from its previous value to `target` with an ease out. */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(reduced() ? target : 0);
  const from = useRef(value);

  useEffect(() => {
    if (reduced()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = origin + (target - origin) * eased;
      setValue(v);
      from.current = v;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

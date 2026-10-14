import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { useBodyClass } from './useBodyClass';

/** Bars on screen, newest last. During a page change two can be mounted at once. */
const bars: HTMLElement[] = [];

/** Pages pad their end by the pinned bar's real height (see --bottombar-h in styles.css). */
function measure() {
  const body = document.body.style;
  const el = bars[bars.length - 1];
  if (el && getComputedStyle(el).position === 'fixed') body.setProperty('--bottombar-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
  else body.removeProperty('--bottombar-h');
}

/**
 * Primary actions pinned to the thumb zone on phones; inline on desktop.
 * While pinned, it reports its real height so a bar with two or three
 * buttons never covers the end of the page.
 */
export function BottomBar({ children }: { children: ReactNode }) {
  useBodyClass('has-bottom-bar');
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    bars.push(el);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      bars.splice(bars.indexOf(el), 1);
      measure();
    };
  }, []);
  return (
    <div ref={ref} className="bottom-bar">
      {children}
    </div>
  );
}

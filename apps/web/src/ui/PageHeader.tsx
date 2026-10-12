import { type ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  /** Small line above the title, e.g. today's date. */
  kicker?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}

/**
 * iOS large title. When it scrolls away, a compact glass nav bar with the
 * same title fades in at the top, as in UINavigationBar.
 */
export function PageHeader({ title, kicker, subtitle, trailing }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { rootMargin: '-56px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className={`nav-bar${compact ? ' show' : ''}`} aria-hidden={!compact}>
        {title}
      </div>
      <header className="large-title">
        {kicker && <div className="kicker">{kicker}</div>}
        <div className="row between" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <h1 ref={ref}>{title}</h1>
          {trailing}
        </div>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </header>
    </>
  );
}

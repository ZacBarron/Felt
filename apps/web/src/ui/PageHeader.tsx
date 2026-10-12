import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from './icons';

interface Props {
  title: string;
  /** Small line above the title, e.g. today's date. */
  kicker?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  /** Back link for pages pushed from another page, such as More. */
  back?: { to: string; label: string };
}

/**
 * iOS large title. When it scrolls away, a compact glass nav bar with the
 * same title fades in at the top, as in UINavigationBar.
 */
export function PageHeader({ title, kicker, subtitle, trailing, back }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { rootMargin: '-56px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Each screen names itself in the browser and to assistive technology.
  useEffect(() => {
    document.title = `${title} · Felt`;
  }, [title]);

  return (
    <>
      <div className={`nav-bar${compact ? ' show' : ''}`} aria-hidden={!compact}>
        {back && (
          <Link to={back.to} className="nav-back" tabIndex={compact ? 0 : -1}>
            <ChevronLeftIcon size={18} />
            {back.label}
          </Link>
        )}
        {title}
      </div>
      <header className="large-title">
        {back && (
          <Link to={back.to} className="back-link">
            <ChevronLeftIcon size={18} />
            {back.label}
          </Link>
        )}
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

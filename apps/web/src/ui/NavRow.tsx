import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { IconComponent } from './icons';
import { ChevronRightIcon } from './icons';

interface Props {
  to: string;
  icon: IconComponent;
  color: string;
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
}

/** A Settings style row: colored icon tile, title, optional detail, chevron. */
export function NavRow({ to, icon: Icon, color, title, subtitle, detail }: Props) {
  return (
    <Link to={to} className="list-row">
      <span className="icon-tile" style={{ background: color }}>
        <Icon size={19} strokeWidth={2} />
      </span>
      <span className="grow">
        <span style={{ display: 'block' }}>{title}</span>
        {subtitle && <span className="footnote" style={{ display: 'block' }}>{subtitle}</span>}
      </span>
      {detail && <span className="detail">{detail}</span>}
      <ChevronRightIcon size={16} className="chev" />
    </Link>
  );
}

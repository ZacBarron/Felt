import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '../nav';

/** Phone only: everything that does not fit in the bottom tab bar. */
export function MorePage() {
  return (
    <div className="stack">
      <h1>More</h1>
      <div className="card stack" style={{ gap: 0, padding: 0 }}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

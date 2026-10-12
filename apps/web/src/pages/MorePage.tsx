import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NAV_SECTIONS, TABS } from '../nav';

const inTabs = new Set(TABS.map((t) => t.to));

/** Phone only: everything that does not fit in the bottom tab bar. */
export function MorePage() {
  return (
    <div className="stack" style={{ gap: '1.1rem' }}>
      <h1>More</h1>
      {NAV_SECTIONS.map(({ section, items }) => {
        const rest = items.filter((i) => !inTabs.has(i.to));
        if (!rest.length) return null;
        return (
          <section key={section} className="stack" style={{ gap: '0.5rem' }}>
            <div className="eyebrow">{section}</div>
            <div className="card" style={{ padding: '0.25rem 0' }}>
              {rest.map(({ to, label, icon: Icon }, i) => (
                <Link
                  key={to}
                  to={to}
                  className="list-link"
                  style={{ borderBottom: i < rest.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span className="tile">
                    <span className="icon" style={{ marginBottom: 0 }}>
                      <Icon size={17} />
                    </span>
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{label}</span>
                  <ChevronRight size={18} className="faint" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

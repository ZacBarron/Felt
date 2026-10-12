import { NAV_SECTIONS, TABS } from '../nav';
import { NavRow } from '../ui/NavRow';
import { PageHeader } from '../ui/PageHeader';

const inTabs = new Set(TABS.map((t) => t.to));

/** Phone only: everything that does not fit in the tab bar. */
export function MorePage() {
  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="More" />
      {NAV_SECTIONS.map(({ section, items }) => {
        const rest = items.filter((i) => !inTabs.has(i.to));
        if (!rest.length) return null;
        return (
          <section key={section}>
            <div className="section-title">{section}</div>
            <div className="list with-icons">
              {rest.map((i) => (
                <NavRow key={i.to} to={i.to} icon={i.icon} color={i.color} title={i.label} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

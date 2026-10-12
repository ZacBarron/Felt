import { useLiveQuery } from 'dexie-react-hooks';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { NAV_SECTIONS, TABS } from './nav';
import { DashboardPage } from './pages/DashboardPage';
import { DrillsPage } from './pages/DrillsPage';
import { LabPage } from './pages/LabPage';
import { LearnPage } from './pages/LearnPage';
import { MorePage } from './pages/MorePage';
import { PlannedPage } from './pages/PlannedPage';
import { RangesPage } from './pages/RangesPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { chartsForGame } from './state/charts';
import { buildQueue } from './state/review';
import { useSettings } from './state/settings';

function useReviewCount() {
  const { settings } = useSettings();
  const g = settings.game;
  return useLiveQuery(
    async () => {
      const q = await buildQueue(chartsForGame(g).charts, settings.study.newPerDay);
      return q.due.length + q.fresh.length;
    },
    [g.tableSize, g.format, settings.study.newPerDay],
    0,
  );
}

export function App() {
  const location = useLocation();
  const reviewCount = useReviewCount();
  const badge = (to: string) =>
    to === '/review' && reviewCount > 0 ? <span className="badge-dot num">{reviewCount > 99 ? '99+' : reviewCount}</span> : null;

  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="brand">
          <img src="/icon-192.png" alt="" />
          Felt
        </div>
        {NAV_SECTIONS.map(({ section, items }) => (
          <div key={section} className="nav-group">
            <div className="section eyebrow">{section}</div>
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} data-haptic="select">
                <Icon size={18} strokeWidth={2.2} />
                <span style={{ flex: 1 }}>{label}</span>
                {to === '/review' && reviewCount > 0 && <span className="pill pill-accent num">{reviewCount}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <main>
        {/* Keyed on the path so every page change replays the entrance animation. */}
        <div key={location.pathname} className="page">
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/drills" element={<DrillsPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/ranges" element={<RangesPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/scenarios" element={<PlannedPage feature="scenarios" />} />
            <Route path="/exploit" element={<PlannedPage feature="exploit" />} />
            <Route path="/log" element={<PlannedPage feature="log" />} />
            <Route path="/stats" element={<PlannedPage feature="stats" />} />
          </Routes>
        </div>
      </main>
      <nav className="tabbar" aria-label="Tabs">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} data-haptic="select">
            <Icon size={23} strokeWidth={2.1} />
            {label}
            {badge(to)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

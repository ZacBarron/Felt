import { NavLink, Route, Routes } from 'react-router-dom';
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

export function App() {
  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">
          F<span>e</span>lt
        </div>
        {NAV_SECTIONS.map(({ section, items }) => (
          <div key={section} className="nav-group">
            <div className="section">{section}</div>
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <main>
        <Routes>
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
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'}>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

import { NavLink, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LabPage } from './pages/LabPage';
import { LearnPage } from './pages/LearnPage';
import { PlannedPage } from './pages/PlannedPage';
import { RangesPage } from './pages/RangesPage';

const NAV = [
  { section: 'Train' },
  { to: '/', label: 'Today' },
  { to: '/learn', label: 'Learn' },
  { to: '/review', label: 'Review' },
  { to: '/drills', label: 'Drills' },
  { to: '/scenarios', label: 'Scenarios' },
  { section: 'Study' },
  { to: '/ranges', label: 'Ranges' },
  { to: '/lab', label: 'Spot Lab' },
  { to: '/exploit', label: 'Exploits' },
  { section: 'Play' },
  { to: '/log', label: 'Log' },
  { to: '/stats', label: 'Stats' },
] as const;

export function App() {
  return (
    <div className="shell">
      <nav className="nav">
        <div className="brand">
          F<span>e</span>lt
        </div>
        {NAV.map((item) =>
          'section' in item ? (
            <div key={item.section} className="section">
              {item.section}
            </div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/ranges" element={<RangesPage />} />
          <Route path="/lab" element={<LabPage />} />
          <Route path="/review" element={<PlannedPage feature="review" />} />
          <Route path="/drills" element={<PlannedPage feature="drills" />} />
          <Route path="/scenarios" element={<PlannedPage feature="scenarios" />} />
          <Route path="/exploit" element={<PlannedPage feature="exploit" />} />
          <Route path="/log" element={<PlannedPage feature="log" />} />
          <Route path="/stats" element={<PlannedPage feature="stats" />} />
        </Routes>
      </main>
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { NAV_SECTIONS, TABS } from './nav';
import { CheckPage, PlacementPage } from './pages/CheckPage';
import { DailyPage } from './pages/DailyPage';
import { DashboardPage } from './pages/DashboardPage';
import { DrillsPage } from './pages/DrillsPage';
import { LabPage } from './pages/LabPage';
import { LearnPage } from './pages/LearnPage';
import { LessonPage } from './pages/LessonPage';
import { MorePage } from './pages/MorePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PlannedPage } from './pages/PlannedPage';
import { ProPage } from './pages/ProPage';
import { RangesPage } from './pages/RangesPage';
import { ReviewPage } from './pages/ReviewPage';
import { SavedPage } from './pages/SavedPage';
import { SettingsPage } from './pages/SettingsPage';
import { SolverPage } from './pages/SolverPage';
import { YouPage } from './pages/YouPage';
import { chartsForGame } from './state/charts';
import { buildQueue } from './state/review';
import { useSettings } from './state/settings';
import { Lockup } from './ui/Brand';

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

/** Pages a player can reach before finishing onboarding. */
const FIRST_RUN = ['/welcome', '/placement', '/pro'];

export function App() {
  const location = useLocation();
  const { settings } = useSettings();
  const reviewCount = useReviewCount();
  // Lesson pages live under /learn, so match on the first path segment.
  const section = '/' + (location.pathname.split('/')[1] ?? '');
  const tabIndex = TABS.findIndex((t) => t.to === section);
  // Pages reached through More keep More selected.
  const activeTab = tabIndex === -1 ? TABS.length - 1 : tabIndex;
  const indicator = useRef<HTMLSpanElement>(null);
  const firstRender = useRef(true);

  // The selection pill stretches as it slides, like liquid between two tabs.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    indicator.current?.animate([{ scale: '1 1' }, { scale: '1.22 0.9', offset: 0.4 }, { scale: '1 1' }], {
      duration: 460,
      easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
    });
  }, [activeTab]);

  if (!settings.profile.onboarded && !FIRST_RUN.includes(location.pathname)) return <Navigate to="/welcome" replace />;

  return (
    <div className="shell">
      <nav className="nav glass" aria-label="Main">
        <Link to="/" className="brand" aria-label="Felt home">
          <Lockup size={30} />
        </Link>
        {NAV_SECTIONS.map(({ section, items }) => (
          <div key={section} className="nav-group">
            <div className="section">{section}</div>
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} data-haptic="select">
                {({ isActive }) => (
                  <>
                    <Icon size={22} filled={isActive} />
                    <span>{label}</span>
                    {to === '/review' && reviewCount > 0 && <span className="count">{reviewCount}</span>}
                  </>
                )}
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
            <Route path="/learn/*" element={<LessonPage />} />
            <Route path="/ranges" element={<RangesPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/welcome" element={<OnboardingPage />} />
            <Route path="/placement" element={<PlacementPage />} />
            <Route path="/check/:track/:module" element={<CheckPage />} />
            <Route path="/check/:track/:module/:lesson" element={<CheckPage />} />
            <Route path="/pro" element={<ProPage />} />
            <Route path="/solver" element={<SolverPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/scenarios" element={<PlannedPage feature="scenarios" />} />
            <Route path="/exploit" element={<PlannedPage feature="exploit" />} />
            <Route path="/log" element={<PlannedPage feature="log" />} />
            <Route path="/stats" element={<Navigate to="/you" replace />} />
            <Route path="/you" element={<YouPage />} />
            <Route path="/daily" element={<DailyPage />} />
          </Routes>
        </div>
      </main>
      <nav className="tabbar glass" aria-label="Tabs">
        <span ref={indicator} className="tab-indicator" style={{ transform: `translateX(${activeTab * 100}%)` }} />
        {TABS.map(({ to, label, icon: Icon }, i) => (
          <NavLink key={to} to={to} end={to === '/'} data-haptic="select" className={i === activeTab ? 'active' : undefined}>
            <Icon size={25} filled={i === activeTab} />
            {label}
            {to === '/review' && reviewCount > 0 && (
              <span className="badge-dot num">{reviewCount > 99 ? '99+' : reviewCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

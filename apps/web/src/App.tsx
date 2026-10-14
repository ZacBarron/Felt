import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { NAV_SECTIONS, TABS } from './nav';
import { CheckPage, PlacementPage } from './pages/CheckPage';
import { DailyPage } from './pages/DailyPage';
import { WeeklyPage } from './pages/WeeklyPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { LabPage } from './pages/LabPage';
import { LearnPage } from './pages/LearnPage';
import { LessonPage } from './pages/LessonPage';
import { MorePage } from './pages/MorePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { Moments } from './components/Moments';
import { ExploitsPage } from './pages/ExploitsPage';
import { LogPage } from './pages/LogPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { PracticePage } from './pages/PracticePage';
import { ProPage } from './pages/ProPage';
import { RangesPage } from './pages/RangesPage';
import { ReviewPage } from './pages/ReviewPage';
import { SavedPage } from './pages/SavedPage';
import { SettingsPage } from './pages/SettingsPage';
import { SolverPage } from './pages/SolverPage';
import { YouPage } from './pages/YouPage';
import { AccountPage } from './pages/AccountPage';
import { SignInPage } from './pages/SignInPage';
import { LeaguePage } from './pages/LeaguePage';
import { CoachPage } from './pages/CoachPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { LegalPage } from './pages/LegalPage';
import { accessFromServer } from './state/access';
import { useSession } from './state/api';
import { chartsForGame } from './state/charts';
import { reviewTotal } from './state/decks';
import { useSettings } from './state/settings';
import { Lockup } from './ui/Brand';

function useReviewCount() {
  const { settings } = useSettings();
  const g = settings.game;
  return useLiveQuery(
    async () => {
      return reviewTotal(chartsForGame(g).charts, settings.study);
    },
    [g.tableSize, g.format, JSON.stringify(settings.study)],
    0,
  );
}

/** Pages a player can reach before finishing onboarding. */
const FIRST_RUN = ['/welcome', '/signin', '/placement', '/pro', '/account', '/terms', '/privacy'];

/** Keeps Felt Pro in step with the account: the server's word wins over this device's. */
function useServerAccess() {
  const session = useSession();
  const { settings, update } = useSettings();
  const serverAccess = session?.user.access;
  useEffect(() => {
    if (!serverAccess) return;
    const next = accessFromServer(serverAccess, settings.access);
    if (JSON.stringify(next) !== JSON.stringify(settings.access)) update({ ...settings, access: next });
    // Only when the server's answer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(serverAccess)]);
}

export function App() {
  const location = useLocation();
  const { settings } = useSettings();
  const reviewCount = useReviewCount();
  useServerAccess();
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
      <Moments />
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
            <Route path="/drills" element={<RangesPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/learn/*" element={<LessonPage />} />
            <Route path="/ranges" element={<RangesPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/:section" element={<SettingsPage />} />
            <Route path="/welcome" element={<OnboardingPage />} />
            <Route path="/placement" element={<PlacementPage />} />
            <Route path="/check/:track/:module" element={<CheckPage />} />
            <Route path="/check/:track/:module/:lesson" element={<CheckPage />} />
            <Route path="/pro" element={<ProPage />} />
            <Route path="/solver" element={<SolverPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/scenarios/:id" element={<ScenariosPage />} />
            <Route path="/exploit" element={<ExploitsPage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/stats" element={<Navigate to="/you" replace />} />
            <Route path="/you" element={<YouPage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/weekly" element={<WeeklyPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/league" element={<LeaguePage />} />
            <Route path="/coach" element={<CoachPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="/terms" element={<LegalPage doc="terms" />} />
            <Route path="/privacy" element={<LegalPage doc="privacy" />} />
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
              <span className="badge-dot num">
                {reviewCount > 99 ? '99+' : reviewCount}
                <span className="sr-only"> due</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { NAV_SECTIONS, TABS, tabFor } from './nav';
import { CheckPage, PlacementPage } from './pages/CheckPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { WinRatePage } from './pages/WinRatePage';
import { DailyPage } from './pages/DailyPage';
import { WeeklyPage } from './pages/WeeklyPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { LabPage } from './pages/LabPage';
import { LearnPage } from './pages/LearnPage';
import { LessonPage } from './pages/LessonPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { Moments } from './components/Moments';
import { ExploitsPage } from './pages/ExploitsPage';
import { LogPage } from './pages/LogPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { PracticePage } from './pages/PracticePage';
import { ProPage } from './pages/ProPage';
import { RangesPage } from './pages/RangesPage';
import { ReviewPage } from './pages/ReviewPage';
import { TrainPage } from './pages/TrainPage';
import { PlayPage } from './pages/PlayPage';
import { CustomTablePage } from './pages/CustomTablePage';
import { InvitePage } from './pages/InvitePage';
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
import { refreshMe, useSession } from './state/api';
import { claimPendingReferral, pendingReferral } from './state/referral';
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

/**
 * Pages a player can reach before finishing onboarding. The daily challenge is
 * here so a share link or the website can drop a new player straight into it.
 */
const FIRST_RUN = ['/welcome', '/signin', '/placement', '/pro', '/account', '/terms', '/privacy', '/daily'];

/** Keeps Aced Pro in step with the account: the server's word wins over this device's. */
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

/** An invite that came with the link is claimed as soon as there is an account. */
function useClaimInvite() {
  const session = useSession();
  useEffect(() => {
    if (!session || !pendingReferral()) return;
    void claimPendingReferral().then((ok) => (ok ? refreshMe() : null));
  }, [session?.user.id]);
}

/** A shared daily result links to the same challenge: open it once the player is set up. */
function useChallengeLink() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  useEffect(() => {
    const url = new URL(location.href);
    if (!url.searchParams.has('daily') || !settings.profile.onboarded) return;
    url.searchParams.delete('daily');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    navigate('/daily');
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.profile.onboarded]);
}

/**
 * The key that replays a page's entrance. Sitting down at a Play table and
 * leaving it stay one page, so the fixed table never rides an animation.
 */
const pageKey = (pathname: string) => (pathname === '/play/seat' ? '/play' : pathname);

export function App() {
  const location = useLocation();
  const { settings } = useSettings();
  const reviewCount = useReviewCount();
  useServerAccess();
  useClaimInvite();
  useChallengeLink();
  // A page pushed from a tab keeps that tab selected.
  const activeTab = Math.max(0, TABS.findIndex((t) => t.to === tabFor(location.pathname)));
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

  // Keep the query string, so a shared ?daily link survives the trip through onboarding.
  if (!settings.profile.onboarded && !FIRST_RUN.includes(location.pathname))
    return <Navigate to={{ pathname: '/welcome', search: location.search }} replace />;

  return (
    <div className="shell">
      <Moments />
      <nav className="nav glass" aria-label="Main">
        <Link to="/" className="brand" aria-label="Aced home">
          <Lockup size={30} />
        </Link>
        {[{ section: '', items: TABS }, ...NAV_SECTIONS].map(({ section, items }) => (
          <div key={section} className="nav-group">
            {section && <div className="section">{section}</div>}
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} data-haptic="select" data-tour={section ? undefined : `tab-${label.toLowerCase()}`}>
                {({ isActive }) => (
                  <>
                    <Icon size={22} filled={isActive} />
                    <span>{label}</span>
                    {(to === '/review' || to === '/train') && reviewCount > 0 && <span className="count">{reviewCount}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <main>
        {/* Keyed on the path so every page change replays the entrance animation. */}
        <div key={pageKey(location.pathname)} className="page">
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/train" element={<TrainPage />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/play/seat" element={<PlayPage />} />
            <Route path="/play/new" element={<CustomTablePage />} />
            <Route path="/play/table/:id" element={<CustomTablePage />} />
            <Route path="/invite" element={<InvitePage />} />
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
            <Route path="/more" element={<Navigate to="/you" replace />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/scenarios/:id" element={<ScenariosPage />} />
            <Route path="/exploit" element={<ExploitsPage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/stats" element={<Navigate to="/you" replace />} />
            <Route path="/you" element={<YouPage />} />
            <Route path="/you/winrate" element={<WinRatePage />} />
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
      <nav className="tabbar glass" aria-label="Tabs" style={{ "--tabs": TABS.length } as React.CSSProperties}>
        <span ref={indicator} className="tab-indicator" style={{ transform: `translateX(${activeTab * 100}%)` }} />
        {TABS.map(({ to, label, icon: Icon }, i) => (
          <NavLink key={to} to={to} end={to === '/'} data-haptic="select" data-tour={`tab-${label.toLowerCase()}`} className={i === activeTab ? 'active' : undefined}>
            <Icon size={25} filled={i === activeTab} />
            {label}
            {to === '/train' && reviewCount > 0 && (
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

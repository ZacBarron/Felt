import {
  AccountIcon,
  LeagueIcon,
  BookmarkIcon,
  ChipIcon,
  CoachIcon,
  DrillsIcon,
  ExploitsIcon,
  GlossaryIcon,
  ImportIcon,
  type IconComponent,
  LabIcon,
  LearnIcon,
  LogIcon,
  MedalIcon,
  RangesIcon,
  ReviewIcon,
  ScenariosIcon,
  SettingsIcon,
  SolverIcon,
  TodayIcon,
  TrophyIcon,
} from './ui/icons';

export interface NavItem {
  to: string;
  label: string;
  icon: IconComponent;
  /** Tile color when shown as a Settings style row. Spruce for all, so action colors keep their meaning. */
  color: string;
}

const tint = 'var(--base-500)';

/** The tabs on a phone and the top of the sidebar. */
export const TABS: NavItem[] = [
  { to: '/', label: 'Today', icon: TodayIcon, color: tint },
  { to: '/learn', label: 'Learn', icon: LearnIcon, color: tint },
  { to: '/train', label: 'Train', icon: ReviewIcon, color: tint },
  { to: '/play', label: 'Play', icon: ChipIcon, color: tint },
  { to: '/you', label: 'You', icon: AccountIcon, color: tint },
];

/** Everything under a tab, grouped the way the Train and You pages group it. */
export const NAV_SECTIONS: { section: string; tab: string; items: NavItem[] }[] = [
  {
    section: 'Train',
    tab: '/train',
    items: [
      { to: '/review', label: 'Review', icon: ReviewIcon, color: tint },
      { to: '/daily', label: 'Daily challenge', icon: TrophyIcon, color: tint },
      { to: '/ranges', label: 'Ranges', icon: RangesIcon, color: tint },
      { to: '/scenarios', label: 'Scenarios', icon: ScenariosIcon, color: tint },
      { to: '/practice', label: 'At your level', icon: DrillsIcon, color: tint },
      { to: '/weekly', label: 'Weekly challenge', icon: MedalIcon, color: tint },
    ],
  },
  {
    section: 'Study tools',
    tab: '/learn',
    items: [
      { to: '/coach', label: 'Coach', icon: CoachIcon, color: tint },
      { to: '/solver', label: 'Solver', icon: SolverIcon, color: tint },
      { to: '/lab', label: 'Spot Lab', icon: LabIcon, color: tint },
      { to: '/exploit', label: 'Exploits', icon: ExploitsIcon, color: tint },
      { to: '/glossary', label: 'Glossary', icon: GlossaryIcon, color: tint },
    ],
  },
  {
    section: 'Your game',
    tab: '/you',
    items: [
      { to: '/log', label: 'Log', icon: LogIcon, color: tint },
      { to: '/import', label: 'Import', icon: ImportIcon, color: tint },
      { to: '/league', label: 'League', icon: LeagueIcon, color: tint },
      { to: '/saved', label: 'Saved', icon: BookmarkIcon, color: tint },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, color: tint },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = [...TABS, ...NAV_SECTIONS.flatMap((s) => s.items)];

export const navItem = (to: string) => NAV_ITEMS.find((i) => i.to === to)!;

/** Pages that are not in a section but still belong to a tab. */
const EXTRA: Record<string, string> = {
  '/drills': '/train',
  '/check': '/learn',
  '/placement': '/learn',
  '/stats': '/you',
  '/more': '/you',
  '/account': '/you',
  '/invite': '/you',
  '/signin': '/you',
  '/pro': '/you',
  '/terms': '/you',
  '/privacy': '/you',
};

/** The tab that stays selected for a path, so a pushed page keeps its parent tab lit. */
export function tabFor(pathname: string): string {
  const first = '/' + (pathname.split('/')[1] ?? '');
  if (TABS.some((t) => t.to === first)) return first;
  const section = NAV_SECTIONS.find((s) => s.items.some((i) => i.to === first));
  return section?.tab ?? EXTRA[first] ?? '/';
}

import {
  AccountIcon,
  LeagueIcon,
  BookmarkIcon,
  DrillsIcon,
  ExploitsIcon,
  ImportIcon,
  type IconComponent,
  LabIcon,
  LearnIcon,
  LogIcon,
  MoreIcon,
  RangesIcon,
  ReviewIcon,
  ScenariosIcon,
  SettingsIcon,
  SolverIcon,
  StatsIcon,
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

export const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Train',
    items: [
      { to: '/', label: 'Today', icon: TodayIcon, color: 'var(--base-500)' },
      { to: '/review', label: 'Review', icon: ReviewIcon, color: 'var(--base-500)' },
      { to: '/daily', label: 'Daily challenge', icon: TrophyIcon, color: 'var(--base-500)' },
      { to: '/drills', label: 'Drills', icon: DrillsIcon, color: 'var(--base-500)' },
      { to: '/learn', label: 'Learn', icon: LearnIcon, color: 'var(--base-500)' },
      { to: '/scenarios', label: 'Scenarios', icon: ScenariosIcon, color: 'var(--base-500)' },
    ],
  },
  {
    section: 'Study',
    items: [
      { to: '/ranges', label: 'Ranges', icon: RangesIcon, color: 'var(--base-500)' },
      { to: '/saved', label: 'Saved', icon: BookmarkIcon, color: 'var(--base-500)' },
      { to: '/solver', label: 'Solver', icon: SolverIcon, color: 'var(--base-500)' },
      { to: '/lab', label: 'Spot Lab', icon: LabIcon, color: 'var(--base-500)' },
      { to: '/exploit', label: 'Exploits', icon: ExploitsIcon, color: 'var(--base-500)' },
    ],
  },
  {
    section: 'Your game',
    items: [
      { to: '/log', label: 'Log', icon: LogIcon, color: 'var(--base-500)' },
      { to: '/you', label: 'You', icon: StatsIcon, color: 'var(--base-500)' },
      { to: '/league', label: 'League', icon: LeagueIcon, color: 'var(--base-500)' },
      { to: '/import', label: 'Import', icon: ImportIcon, color: 'var(--base-500)' },
      { to: '/account', label: 'Account', icon: AccountIcon, color: 'var(--base-500)' },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, color: 'var(--base-500)' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

const byPath = (to: string) => NAV_ITEMS.find((i) => i.to === to)!;

/** Bottom tab bar on phones: the daily loop first, everything else under More. */
export const TABS: NavItem[] = [
  byPath('/'),
  byPath('/learn'),
  byPath('/review'),
  byPath('/ranges'),
  { to: '/more', label: 'More', icon: MoreIcon, color: 'var(--base-500)' },
];

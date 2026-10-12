import {
  DrillsIcon,
  ExploitsIcon,
  type IconComponent,
  LabIcon,
  LearnIcon,
  LogIcon,
  MoreIcon,
  RangesIcon,
  ReviewIcon,
  ScenariosIcon,
  SettingsIcon,
  StatsIcon,
  TodayIcon,
} from './ui/icons';

export interface NavItem {
  to: string;
  label: string;
  icon: IconComponent;
  /** Tile color when shown as a Settings style row. */
  color: string;
}

export const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Train',
    items: [
      { to: '/', label: 'Today', icon: TodayIcon, color: 'var(--red)' },
      { to: '/review', label: 'Review', icon: ReviewIcon, color: 'var(--tint)' },
      { to: '/drills', label: 'Drills', icon: DrillsIcon, color: 'var(--orange)' },
      { to: '/learn', label: 'Learn', icon: LearnIcon, color: 'var(--orange)' },
      { to: '/scenarios', label: 'Scenarios', icon: ScenariosIcon, color: 'var(--indigo)' },
    ],
  },
  {
    section: 'Study',
    items: [
      { to: '/ranges', label: 'Ranges', icon: RangesIcon, color: 'var(--red)' },
      { to: '/lab', label: 'Spot Lab', icon: LabIcon, color: 'var(--green)' },
      { to: '/exploit', label: 'Exploits', icon: ExploitsIcon, color: 'var(--purple)' },
    ],
  },
  {
    section: 'Play',
    items: [
      { to: '/log', label: 'Log', icon: LogIcon, color: 'var(--teal)' },
      { to: '/stats', label: 'Stats', icon: StatsIcon, color: 'var(--pink)' },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, color: 'var(--gray)' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

const byPath = (to: string) => NAV_ITEMS.find((i) => i.to === to)!;

/** Bottom tab bar on phones: the daily loop first, everything else under More. */
export const TABS: NavItem[] = [
  byPath('/'),
  byPath('/review'),
  byPath('/drills'),
  byPath('/ranges'),
  { to: '/more', label: 'More', icon: MoreIcon, color: 'var(--gray)' },
];

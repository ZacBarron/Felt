import {
  BookOpen,
  ChartLine,
  Ellipsis,
  FlaskConical,
  Grid3x3,
  House,
  Layers,
  type LucideIcon,
  NotebookPen,
  Settings,
  Swords,
  Target,
  Trophy,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Train',
    items: [
      { to: '/', label: 'Today', icon: House },
      { to: '/review', label: 'Review', icon: Layers },
      { to: '/drills', label: 'Drills', icon: Target },
      { to: '/learn', label: 'Learn', icon: BookOpen },
      { to: '/scenarios', label: 'Scenarios', icon: Trophy },
    ],
  },
  {
    section: 'Study',
    items: [
      { to: '/ranges', label: 'Ranges', icon: Grid3x3 },
      { to: '/lab', label: 'Spot Lab', icon: FlaskConical },
      { to: '/exploit', label: 'Exploits', icon: Swords },
    ],
  },
  {
    section: 'Play',
    items: [
      { to: '/log', label: 'Log', icon: NotebookPen },
      { to: '/stats', label: 'Stats', icon: ChartLine },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Bottom tab bar on phones: the daily loop first, everything else under More. */
export const TABS: NavItem[] = [
  { to: '/', label: 'Today', icon: House },
  { to: '/review', label: 'Review', icon: Layers },
  { to: '/drills', label: 'Drills', icon: Target },
  { to: '/ranges', label: 'Ranges', icon: Grid3x3 },
  { to: '/more', label: 'More', icon: Ellipsis },
];

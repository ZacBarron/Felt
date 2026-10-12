export interface NavItem {
  to: string;
  label: string;
}

export const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Train',
    items: [
      { to: '/', label: 'Today' },
      { to: '/review', label: 'Review' },
      { to: '/drills', label: 'Drills' },
      { to: '/learn', label: 'Learn' },
      { to: '/scenarios', label: 'Scenarios' },
    ],
  },
  {
    section: 'Study',
    items: [
      { to: '/ranges', label: 'Ranges' },
      { to: '/lab', label: 'Spot Lab' },
      { to: '/exploit', label: 'Exploits' },
    ],
  },
  {
    section: 'Play',
    items: [
      { to: '/log', label: 'Log' },
      { to: '/stats', label: 'Stats' },
      { to: '/settings', label: 'Settings' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/** Bottom tab bar on phones: the daily loop first, everything else under More. */
export const TABS: NavItem[] = [
  { to: '/', label: 'Today' },
  { to: '/review', label: 'Review' },
  { to: '/drills', label: 'Drills' },
  { to: '/ranges', label: 'Ranges' },
  { to: '/more', label: 'More' },
];

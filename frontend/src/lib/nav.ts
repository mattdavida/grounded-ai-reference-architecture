export type NavItem = {
  href: string;
  label: string;
  description: string;
  phase: string;
};

export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/",
    label: "Portfolio",
    description: "Overview, list, watchlist, and detail",
    phase: "Phase 1",
  },
  {
    href: "/capacity",
    label: "Capacity",
    description: "Owner / area FTE load planning",
    phase: "Phase 2",
  },
  {
    href: "/exports",
    label: "Exports",
    description: "JSON / CSV grounded packs",
    phase: "Phase 2",
  },
];

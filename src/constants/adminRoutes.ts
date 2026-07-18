export const ADMIN_TABS = [
  "dashboard",
  "vendors",
  "invoices",
  "hubs",
  "remarks",
  "kyc",
  "archive",
  "settings",
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

export type AdminNavItem = {
  tab: AdminTab;
  href: `/${AdminTab}`;
  label: string;
  /** Compact label for the console tab strip */
  shortLabel: string;
  /** Show in primary tab strip */
  primary: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    tab: "dashboard",
    href: "/dashboard",
    label: "Analytics Dashboard",
    shortLabel: "Dashboard",
    primary: true,
  },
  {
    tab: "vendors",
    href: "/vendors",
    label: "Manage Vendors",
    shortLabel: "Vendors",
    primary: true,
  },
  {
    tab: "invoices",
    href: "/invoices",
    label: "Invoice logs",
    shortLabel: "Invoices",
    primary: true,
  },
  {
    tab: "hubs",
    href: "/hubs",
    label: "Logistics Hubs",
    shortLabel: "Hubs",
    primary: true,
  },
  {
    tab: "remarks",
    href: "/remarks",
    label: "Remarks Summary",
    shortLabel: "Remarks",
    primary: true,
  },
  {
    tab: "kyc",
    href: "/kyc",
    label: "KYC Approvals",
    shortLabel: "KYC",
    primary: true,
  },
  {
    tab: "archive",
    href: "/archive",
    label: "Archive",
    shortLabel: "Archive",
    primary: false,
  },
  {
    tab: "settings",
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    primary: false,
  },
];

export const ADMIN_DEFAULT_PATH = "/dashboard";

export function isAdminTab(value: string): value is AdminTab {
  return (ADMIN_TABS as readonly string[]).includes(value);
}

export function tabFromPathname(pathname: string | null): AdminTab | null {
  if (!pathname) return null;
  const segment = pathname.split("/").filter(Boolean)[0] || "";
  return isAdminTab(segment) ? segment : null;
}

export function hrefForTab(tab: AdminTab): `/${AdminTab}` {
  return `/${tab}`;
}

export const SETTINGS_SUB_TABS = ["profile", "users", "workspace"] as const;
export type SettingsSubTab = (typeof SETTINGS_SUB_TABS)[number];

export function isSettingsSubTab(value: string | null): value is SettingsSubTab {
  return value === "profile" || value === "users" || value === "workspace";
}

export function settingsHref(tab: SettingsSubTab = "profile"): string {
  return tab === "profile" ? "/settings" : `/settings?tab=${tab}`;
}

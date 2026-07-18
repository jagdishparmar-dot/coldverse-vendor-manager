"use client";

import { useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  isSettingsSubTab,
  settingsHref,
  type SettingsSubTab,
} from "@/src/constants/settingsRoutes";
import ProfilePanel from "@/src/features/admin/views/settings/ProfilePanel";
import UsersPanel from "@/src/features/admin/views/settings/UsersPanel";
import WorkspacePanel from "@/src/features/admin/views/settings/WorkspacePanel";

type SubTabDef = {
  id: SettingsSubTab;
  label: string;
  adminOnly: boolean;
};

const SUB_TABS: SubTabDef[] = [
  { id: "profile", label: "Profile", adminOnly: false },
  { id: "users", label: "Users", adminOnly: true },
  { id: "workspace", label: "Workspace", adminOnly: true },
];

type SettingsViewProps = {
  role?: string | null;
};

function SettingsViewInner({ role }: SettingsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const resolvedRole = role ?? session?.user?.role;
  const isAdmin = resolvedRole === "admin";

  const visibleTabs = useMemo(
    () => SUB_TABS.filter((tab) => !tab.adminOnly || isAdmin),
    [isAdmin]
  );

  const requested = searchParams.get("tab");
  const activeSubTab: SettingsSubTab = useMemo(() => {
    if (isSettingsSubTab(requested)) {
      const allowed = visibleTabs.some((t) => t.id === requested);
      if (allowed) return requested;
    }
    return "profile";
  }, [requested, visibleTabs]);

  useEffect(() => {
    if (!isSettingsSubTab(requested)) return;
    const allowed = visibleTabs.some((t) => t.id === requested);
    if (!allowed) {
      router.replace(settingsHref("profile"), { scroll: false });
    }
  }, [requested, visibleTabs, router]);

  const setSubTab = (tab: SettingsSubTab) => {
    router.replace(settingsHref(tab), { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Account & Settings</h2>
            <p className="text-xs text-gray-500">
              Profile, users, and workspace preferences in one place
            </p>
          </div>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 self-stretch md:self-auto justify-center">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeSubTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === "profile" && <ProfilePanel />}
      {activeSubTab === "users" && isAdmin && <UsersPanel />}
      {activeSubTab === "workspace" && isAdmin && <WorkspacePanel />}
    </div>
  );
}

export default function SettingsView({ role }: SettingsViewProps) {
  return (
    <Suspense
      fallback={
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-sm text-gray-500">
          Loading settings…
        </div>
      }
    >
      <SettingsViewInner role={role} />
    </Suspense>
  );
}

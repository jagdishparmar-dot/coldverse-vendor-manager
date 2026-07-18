"use client";

import { RefreshCw } from "lucide-react";

type AdminRefreshControlProps = {
  isAutoRefreshEnabled: boolean;
  autoRefreshCountdown: number;
  adminLoading: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
};

export function AdminRefreshControl({
  isAutoRefreshEnabled,
  autoRefreshCountdown,
  adminLoading,
  onRefresh,
  onToggleAutoRefresh,
}: AdminRefreshControlProps) {
  return (
    <div className="flex h-9 items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onRefresh}
        disabled={adminLoading}
        className="flex h-full items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-orange-600 hover:bg-slate-50 px-3 transition-colors cursor-pointer disabled:opacity-50 outline-none focus-visible:bg-slate-50"
        title="Refresh console data"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 shrink-0 text-slate-500 ${
            adminLoading ? "animate-spin text-orange-600" : ""
          }`}
        />
        <span className="hidden sm:inline">
          {adminLoading ? "Refreshing…" : "Refresh"}
        </span>
      </button>

      <div className="w-px self-stretch bg-gray-200" aria-hidden />

      <button
        type="button"
        onClick={onToggleAutoRefresh}
        className={`flex h-full items-center gap-1.5 text-xs font-semibold px-2.5 transition-colors cursor-pointer select-none outline-none ${
          isAutoRefreshEnabled
            ? "bg-orange-50 text-orange-700 hover:bg-orange-100/70"
            : "text-slate-500 hover:bg-slate-50"
        }`}
        title={
          isAutoRefreshEnabled
            ? "Pause auto-refresh (2 min)"
            : "Enable auto-refresh (2 min)"
        }
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isAutoRefreshEnabled ? "bg-orange-500 animate-pulse" : "bg-slate-400"
          }`}
        />
        <span className="tabular-nums">
          {isAutoRefreshEnabled ? `${autoRefreshCountdown}s` : "Off"}
        </span>
      </button>
    </div>
  );
}

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
    <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onRefresh}
        disabled={adminLoading}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 hover:bg-slate-50 px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        title="Refresh console data"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 text-slate-500 ${adminLoading ? "animate-spin text-orange-600" : ""}`}
        />
        <span className="hidden sm:inline">
          {adminLoading ? "Refreshing..." : "Refresh"}
        </span>
      </button>

      <div className="w-px self-stretch bg-gray-200" />

      <button
        type="button"
        onClick={onToggleAutoRefresh}
        className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 transition-all cursor-pointer select-none ${
          isAutoRefreshEnabled
            ? "bg-orange-50/80 text-orange-700 hover:bg-orange-100/50"
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
        <span>
          {isAutoRefreshEnabled ? `${autoRefreshCountdown}s` : "Auto off"}
        </span>
      </button>
    </div>
  );
}

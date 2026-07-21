"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Inbox,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { ListPagination } from "@/src/components/ListPagination";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
import type { Hub, Vendor } from "@/src/types";
import { getCategoryBadgeClass } from "@/src/features/admin/utils";
import { exportVendorsToExcel } from "@/src/utils/excelExport";
import { portalShareUrl } from "@/src/constants/portalRoutes";

const VENDOR_CARD_COLORS = [
  { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-150", accent: "bg-orange-500", light: "bg-orange-500/10", tagBg: "bg-orange-50 text-orange-700 border-orange-100" },
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-150", accent: "bg-blue-500", light: "bg-blue-500/10", tagBg: "bg-blue-50 text-blue-700 border-blue-100" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-150", accent: "bg-emerald-500", light: "bg-emerald-500/10", tagBg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-150", accent: "bg-indigo-500", light: "bg-indigo-500/10", tagBg: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-150", accent: "bg-violet-500", light: "bg-violet-500/10", tagBg: "bg-violet-50 text-violet-700 border-violet-100" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-150", accent: "bg-rose-500", light: "bg-rose-500/10", tagBg: "bg-rose-50 text-rose-700 border-rose-100" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-150", accent: "bg-amber-500", light: "bg-amber-500/10", tagBg: "bg-amber-50 text-amber-700 border-amber-100" },
];

function getVendorInitials(name: string): string {
  if (!name) return "V";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getKycBadgeClass(kycStatus?: Vendor["kycStatus"]): string {
  switch (kycStatus) {
    case "verified":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "pending_verification":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-gray-50 text-gray-600 border-gray-100";
  }
}

function getKycLabel(kycStatus?: Vendor["kycStatus"]): string {
  switch (kycStatus) {
    case "verified":
      return "KYC verified";
    case "pending_verification":
      return "KYC pending";
    case "rejected":
      return "KYC rejected";
    case "pending_submission":
      return "KYC incomplete";
    default:
      return "KYC unknown";
  }
}

type VendorsViewProps = {
  headerHubFilter: string;
  hubs: Hub[];
  refreshKey: number | string;
  vendorViewMode: "grid" | "table";
  onVendorViewModeChange: (mode: "grid" | "table") => void;
  copiedToken: string | null;
  onCopyLink: (token: string) => void;
  onEditVendor: (vendor: Vendor) => void;
  onDeleteVendor: (id: string, name: string) => void;
  onOpenCategoryModal: () => void;
  onOpenBulkUpload: () => void;
  onOpenAddVendor: () => void;
};

export default function VendorsView({
  headerHubFilter,
  hubs,
  refreshKey,
  vendorViewMode,
  onVendorViewModeChange,
  copiedToken,
  onCopyLink,
  onEditVendor,
  onDeleteVendor,
  onOpenCategoryModal,
  onOpenBulkUpload,
  onOpenAddVendor,
}: VendorsViewProps) {
  const [vendorSearch, setVendorSearch] = useState("");

  const filterKey = `${vendorSearch}|${headerHubFilter}`;
  const listRefreshKey = `${refreshKey}|${filterKey}`;

  const buildUrl = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      const q = vendorSearch.trim();
      if (q) params.set("search", q);
      if (headerHubFilter && headerHubFilter !== "All") {
        params.set("hubId", headerHubFilter);
      }
      return `/api/vendors?${params.toString()}`;
    },
    [vendorSearch, headerHubFilter]
  );

  const {
    items,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    setLimit,
  } = usePaginatedList<Vendor>({
    buildUrl,
    refreshKey: listRefreshKey,
  });

  useResetPageOnFilterChange(filterKey, setPage);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (headerHubFilter !== "All") {
      const hub = hubs.find((h) => h.id === headerHubFilter);
      labels.push(hub ? `Hub: ${hub.name}` : "Hub filtered");
    }
    if (vendorSearch.trim()) labels.push(`"${vendorSearch.trim()}"`);
    return labels;
  }, [headerHubFilter, hubs, vendorSearch]);

  const canExport = !loading && items.length > 0;

  const gstRegisteredCount = items.filter(
    (v) => v.gstNumber && v.gstNumber.trim()
  ).length;
  const uniqueStatesCount = new Set(
    items.flatMap((v) => v.states || (v.state ? [v.state] : []))
  ).size;
  const uniqueHubsCount =
    headerHubFilter === "All"
      ? new Set(items.flatMap((v) => v.hubs || [])).size
      : 1;

  const colorsList = VENDOR_CARD_COLORS;

  const pagination = (
    <div className="border-t border-gray-100 bg-gray-50/30">
      <ListPagination
        page={page}
        pageSize={limit}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        accent="orange"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-950">
            Vendor Directory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage vendor profiles, billing categories, and CSV bulk imports.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onOpenCategoryModal}
            className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-orange-600" />
            Add Billing Category
          </button>
          <button
            type="button"
            onClick={() => onOpenBulkUpload()}
            className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Upload
          </button>
          <button
            type="button"
            onClick={() => onOpenAddVendor()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-orange-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vendor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-50 text-[10px] font-bold uppercase tracking-wider">
                Total Vendors
              </p>
              <p className="text-2xl font-black mt-1">{total}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-xl">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
            <div className="bg-white h-full" style={{ width: "100%" }} />
          </div>
          <p className="text-[10px] text-orange-100 mt-2 font-medium">
            Verified active partnerships
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-50 text-[10px] font-bold uppercase tracking-wider">
                GST Compliant
              </p>
              <p className="text-2xl font-black mt-1">{gstRegisteredCount}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
            <div
              className="bg-white h-full"
              style={{
                width: `${items.length > 0 ? (gstRegisteredCount / items.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-emerald-100 mt-2 font-medium">
            {items.length > 0
              ? Math.round((gstRegisteredCount / items.length) * 100)
              : 0}
            % on this page
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-50 text-[10px] font-bold uppercase tracking-wider">
                State Coverage
              </p>
              <p className="text-2xl font-black mt-1">{uniqueStatesCount}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
            <div className="bg-white h-full" style={{ width: "100%" }} />
          </div>
          <p className="text-[10px] text-indigo-100 mt-2 font-medium">
            On this page
          </p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-pink-50 text-[10px] font-bold uppercase tracking-wider">
                Hub Association
              </p>
              <p className="text-2xl font-black mt-1">{uniqueHubsCount}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-xl">
              <Share2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
            <div className="bg-white h-full" style={{ width: "100%" }} />
          </div>
          <p className="text-[10px] text-pink-100 mt-2 font-medium">
            Connected logistics terminals
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white via-orange-50/20 to-white">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by vendor name, email, phone…"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                />
              </div>

              <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onVendorViewModeChange("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    vendorViewMode === "grid"
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => onVendorViewModeChange("table")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    vendorViewMode === "table"
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  Table
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
              <div className="text-[11px] text-gray-500 font-medium sm:text-right">
                {loading ? (
                  "Loading vendors…"
                ) : total === 0 ? (
                  "No matching vendors"
                ) : (
                  <>
                    <span className="font-semibold text-gray-800 tabular-nums">
                      {items.length}
                    </span>{" "}
                    on page ·{" "}
                    <span className="font-semibold text-gray-800 tabular-nums">
                      {total}
                    </span>{" "}
                    total
                  </>
                )}
              </div>
              <button
                type="button"
                disabled={!canExport}
                onClick={() =>
                  exportVendorsToExcel(
                    items,
                    hubs,
                    `SMILe_Vendors_Report_${new Date().toISOString().split("T")[0]}.xlsx`
                  )
                }
                className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-xl border border-emerald-600 shadow-sm transition-all cursor-pointer"
                title="Export current page to Excel"
              >
                <Download className="w-3.5 h-3.5" />
                Export Page
              </button>
            </div>
          </div>

          {activeFilterLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100/80">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Active:
              </span>
              {activeFilterLabels.map((label) => (
                <span
                  key={label}
                  className="text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full max-w-[180px] truncate"
                  title={label}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            <p className="text-xs font-medium">Loading vendor records…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-6 text-gray-400">
            <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No vendors found</p>
            <p className="text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              Try a different search or add a vendor to start collecting invoice uploads.
            </p>
          </div>
        ) : vendorViewMode === "grid" ? (
          <>
            <div className="p-4 sm:p-6 bg-gray-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {items.map((vendor, index) => {
                  const theme = colorsList[index % colorsList.length];
                  const shareLink = portalShareUrl(
                    window.location.origin,
                    vendor.token
                  );
                  const isInactive = vendor.status === "inactive";

                  return (
                    <article
                      key={vendor.id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        isInactive
                          ? "border-gray-200 opacity-90 hover:border-gray-300"
                          : "border-gray-100 hover:border-orange-200/70"
                      }`}
                    >
                      <div className={`h-1.5 w-full ${theme.accent}`} />

                      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl ${theme.bg} ${theme.text} font-bold text-xs flex items-center justify-center shrink-0 border ${theme.border}`}
                          >
                            {getVendorInitials(vendor.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <h4
                                className="font-bold text-sm text-gray-900 group-hover:text-orange-600 transition-colors truncate max-w-full"
                                title={vendor.name}
                              >
                                {vendor.name}
                              </h4>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
                                  isInactive
                                    ? "bg-gray-100 text-gray-500 border-gray-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                }`}
                              >
                                {isInactive ? "Inactive" : "Active"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate" title={vendor.email}>
                              {vendor.email}
                            </p>
                            {vendor.phone && (
                              <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                {vendor.phone}
                              </p>
                            )}
                            <span
                              className={`inline-flex mt-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${getKycBadgeClass(vendor.kycStatus)}`}
                            >
                              {getKycLabel(vendor.kycStatus)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">
                              GST
                            </span>
                            {vendor.gstNumber ? (
                              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-semibold text-right break-all max-w-[65%]">
                                {vendor.gstNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md italic">
                                Not registered
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-gray-200/50 pt-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              State
                            </span>
                            {vendor.state ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {vendor.state}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Not set</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                              Assigned hubs
                            </p>
                            {vendor.hubs && vendor.hubs.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {vendor.hubs.map((hubId) => {
                                  const hubObj = hubs.find((h) => h.id === hubId);
                                  return (
                                    <span
                                      key={hubId}
                                      className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full"
                                      title={hubObj ? hubObj.name : "Unknown hub"}
                                    >
                                      {hubObj ? hubObj.code : hubId}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 italic">None assigned</p>
                            )}
                          </div>

                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                              Billing categories
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {vendor.categories.map((cat) => (
                                <span
                                  key={cat}
                                  className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wide ${getCategoryBadgeClass(cat)}`}
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            Portal upload link
                          </p>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              readOnly
                              value={shareLink}
                              aria-label={`Portal link for ${vendor.name}`}
                              className="bg-gray-50 border border-gray-200 rounded-xl text-[9px] font-mono px-2.5 py-2 text-gray-500 w-full min-w-0 select-all focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                            />
                            <button
                              type="button"
                              onClick={() => onCopyLink(vendor.token)}
                              className={`p-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                                copiedToken === vendor.token
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                              }`}
                              title="Copy portal link"
                            >
                              {copiedToken === vendor.token ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                                "Action Required: Secure Invoice Submission Portal Link"
                              )}&body=${encodeURIComponent(
                                `Dear ${vendor.name},\n\nPlease find your secure invoice upload link below:\n\n${shareLink}\n\nYou are requested to upload all your invoices by clicking this secure link before the 10th of every month.\n\nThank you,\nFinance Department`
                              )}`}
                              className="p-2 rounded-xl border bg-white border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 transition-all flex items-center justify-center shrink-0"
                              title="Email portal link"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <footer className="bg-gray-50/90 px-4 sm:px-5 py-3 border-t border-gray-100 flex justify-between items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {vendor.createdAt
                            ? `Joined ${new Date(vendor.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}`
                            : "Join date unknown"}
                        </span>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => onEditVendor(vendor)}
                            className="text-gray-400 hover:text-orange-600 p-2 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                            title="Edit vendor"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteVendor(vendor.id, vendor.name)}
                            className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                            title="Archive vendor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </div>
            {pagination}
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/90 sticky top-0 z-[1] backdrop-blur-sm">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      GST & State
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Hubs
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                      Categories
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden 2xl:table-cell">
                      Portal link
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {items.map((vendor, index) => {
                    const theme = colorsList[index % colorsList.length];
                    const shareLink = portalShareUrl(
                      window.location.origin,
                      vendor.token
                    );
                    const hubCodes =
                      vendor.hubs?.map((hubId) => {
                        const hubObj = hubs.find((h) => h.id === hubId);
                        return hubObj ? hubObj.code : hubId;
                      }) ?? [];

                    return (
                      <tr
                        key={vendor.id}
                        className="group hover:bg-orange-50/25 transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-3.5 align-top">
                          <div className="flex items-start gap-3 min-w-[180px] max-w-[240px]">
                            <div
                              className={`w-9 h-9 rounded-xl ${theme.bg} ${theme.text} font-bold text-[11px] flex items-center justify-center shrink-0 border ${theme.border}`}
                            >
                              {getVendorInitials(vendor.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className="text-sm font-semibold text-gray-900 truncate"
                                  title={vendor.name}
                                >
                                  {vendor.name}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                                    vendor.status === "inactive"
                                      ? "bg-gray-100 text-gray-500 border-gray-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  }`}
                                >
                                  {vendor.status === "inactive" ? "Inactive" : "Active"}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 truncate block mt-0.5">
                                {vendor.email}
                              </span>
                              {vendor.phone && (
                                <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                                  {vendor.phone}
                                </span>
                              )}
                              <span
                                className={`inline-flex mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${getKycBadgeClass(vendor.kycStatus)}`}
                              >
                                {getKycLabel(vendor.kycStatus)}
                              </span>
                              {vendor.createdAt && (
                                <span className="text-[9px] text-gray-400 block mt-1">
                                  Joined{" "}
                                  {new Date(vendor.createdAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              )}

                              <div className="md:hidden mt-2 space-y-1.5">
                                {vendor.gstNumber ? (
                                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded inline-block">
                                    {vendor.gstNumber}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">
                                    No GST
                                  </span>
                                )}
                                {vendor.state && (
                                  <span className="flex items-center gap-1 text-[10px] text-orange-700 font-semibold">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {vendor.state}
                                  </span>
                                )}
                                {hubCodes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {hubCodes.map((code) => (
                                      <span
                                        key={code}
                                        className="text-[9px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded-full"
                                      >
                                        {code}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 align-top hidden md:table-cell">
                          <div className="flex flex-col gap-1.5 text-xs min-w-[120px]">
                            {vendor.gstNumber ? (
                              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block w-fit max-w-[180px] break-all">
                                {vendor.gstNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">
                                No GST registered
                              </span>
                            )}
                            {vendor.state ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {vendor.state}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">
                                No state set
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 align-top hidden lg:table-cell">
                          {hubCodes.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {vendor.hubs!.map((hubId) => {
                                const hubObj = hubs.find((h) => h.id === hubId);
                                return (
                                  <span
                                    key={hubId}
                                    className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full"
                                    title={hubObj ? hubObj.name : "Unknown hub"}
                                  >
                                    {hubObj ? hubObj.code : hubId}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">
                              None assigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 align-top hidden xl:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {vendor.categories.map((cat) => (
                              <span
                                key={cat}
                                className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wide ${getCategoryBadgeClass(cat)}`}
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 align-top hidden 2xl:table-cell">
                          <div className="flex items-center gap-1.5 max-w-[280px]">
                            <input
                              type="text"
                              readOnly
                              value={shareLink}
                              className="bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-mono px-2 py-1.5 text-gray-500 w-full select-all focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                              aria-label={`Portal link for ${vendor.name}`}
                            />
                            <button
                              type="button"
                              onClick={() => onCopyLink(vendor.token)}
                              className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                                copiedToken === vendor.token
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                              }`}
                              title="Copy portal link"
                            >
                              {copiedToken === vendor.token ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <a
                              href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                                "Action Required: Secure Invoice Submission Portal Link"
                              )}&body=${encodeURIComponent(
                                `Dear ${vendor.name},\n\nPlease find your secure invoice upload link below:\n\n${shareLink}\n\nYou are requested to upload all your invoices by clicking this secure link before the 10th of every month.\n\nThank you,\nFinance Department`
                              )}`}
                              className="p-1.5 rounded-lg border bg-white border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 transition-all shrink-0"
                              title="Email portal link"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 align-top text-right">
                          <div className="flex items-start justify-end gap-0.5">
                            <div className="2xl:hidden flex items-center gap-0.5 mr-0.5">
                              <button
                                type="button"
                                onClick={() => onCopyLink(vendor.token)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  copiedToken === vendor.token
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                }`}
                                title="Copy portal link"
                              >
                                {copiedToken === vendor.token ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <a
                                href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                                  "Action Required: Secure Invoice Submission Portal Link"
                                )}&body=${encodeURIComponent(
                                  `Dear ${vendor.name},\n\nPlease find your secure invoice upload link below:\n\n${shareLink}\n\nYou are requested to upload all your invoices by clicking this secure link before the 10th of every month.\n\nThank you,\nFinance Department`
                                )}`}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-orange-600 hover:bg-orange-50/50 transition-colors inline-flex"
                                title="Email portal link"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => onEditVendor(vendor)}
                              className="text-gray-400 hover:text-orange-600 p-2 hover:bg-orange-50/60 rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                              title="Edit vendor"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteVendor(vendor.id, vendor.name)}
                              className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50/60 rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                              title="Archive vendor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination}
          </>
        )}
      </div>
    </div>
  );
}

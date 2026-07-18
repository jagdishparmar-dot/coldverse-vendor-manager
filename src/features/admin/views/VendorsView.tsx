"use client";

import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Inbox,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import type { Hub, Vendor } from "@/src/types";
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

type VendorsViewProps = {
  hubFilteredVendors: Vendor[];
  filteredVendors: Vendor[];
  hubs: Hub[];
  headerHubFilter: string;
  vendorSearch: string;
  onVendorSearchChange: (value: string) => void;
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
  hubFilteredVendors,
  filteredVendors,
  hubs,
  headerHubFilter,
  vendorSearch,
  onVendorSearchChange,
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
  const totalVendorsCount = hubFilteredVendors.length;
  const gstRegisteredCount = hubFilteredVendors.filter((v) => v.gstNumber && v.gstNumber.trim()).length;
  const uniqueStatesCount = new Set(
    hubFilteredVendors.flatMap((v) => v.states || (v.state ? [v.state] : []))
  ).size;
  const uniqueHubsCount =
    headerHubFilter === "All"
      ? new Set(hubFilteredVendors.flatMap((v) => v.hubs || [])).size
      : 1;

  const colorsList = VENDOR_CARD_COLORS;

  return (
<div className="space-y-6">
  {/* Vendor actions */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h2 className="text-lg font-display font-bold text-gray-950">Vendor Directory</h2>
      <p className="text-xs text-gray-500 mt-0.5">
        Manage vendor profiles, billing categories, and bulk imports.
      </p>
    </div>
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:justify-end">
      <button
        onClick={onOpenCategoryModal}
        className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 text-orange-600" />
        Add Billing Category
      </button>
      <button
        onClick={() => onOpenBulkUpload()}
        className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
      >
        <Upload className="w-3.5 h-3.5" />
        Bulk Upload
      </button>
      <button
        onClick={() => onOpenAddVendor()}
        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-orange-500/10 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Vendor
      </button>
    </div>
  </div>

  {/* Colorful Vendor KPI Dashboard Row */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-orange-50 text-[10px] font-bold uppercase tracking-wider">Total Vendors</p>
          <p className="text-2xl font-black mt-1">{totalVendorsCount}</p>
        </div>
        <div className="p-2 bg-white/20 rounded-xl">
          <Users className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
        <div className="bg-white h-full" style={{ width: '100%' }}></div>
      </div>
      <p className="text-[10px] text-orange-100 mt-2 font-medium">Verified active partnerships</p>
    </div>

    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-emerald-50 text-[10px] font-bold uppercase tracking-wider">GST Compliant</p>
          <p className="text-2xl font-black mt-1">{gstRegisteredCount}</p>
        </div>
        <div className="p-2 bg-white/20 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
        <div className="bg-white h-full" style={{ width: `${totalVendorsCount > 0 ? (gstRegisteredCount / totalVendorsCount) * 100 : 0}%` }}></div>
      </div>
      <p className="text-[10px] text-emerald-100 mt-2 font-medium">
        {totalVendorsCount > 0 ? Math.round((gstRegisteredCount / totalVendorsCount) * 100) : 0}% GST compliance rate
      </p>
    </div>

    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-indigo-50 text-[10px] font-bold uppercase tracking-wider">State Coverage</p>
          <p className="text-2xl font-black mt-1">{uniqueStatesCount}</p>
        </div>
        <div className="p-2 bg-white/20 rounded-xl">
          <Building2 className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
        <div className="bg-white h-full" style={{ width: '100%' }}></div>
      </div>
      <p className="text-[10px] text-indigo-100 mt-2 font-medium">Operating across regions</p>
    </div>

    <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-pink-50 text-[10px] font-bold uppercase tracking-wider">Hub Association</p>
          <p className="text-2xl font-black mt-1">{uniqueHubsCount}</p>
        </div>
        <div className="p-2 bg-white/20 rounded-xl">
          <Share2 className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
        <div className="bg-white h-full" style={{ width: '100%' }}></div>
      </div>
      <p className="text-[10px] text-pink-100 mt-2 font-medium">Connected logistics terminals</p>
    </div>
  </div>

  {/* Main List & Card block */}
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
    {/* Filter and View mode bar */}
    <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
        {/* Search box */}
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by vendor name, email..."
            value={vendorSearch}
            onChange={(e) => onVendorSearchChange(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* View Switch Mode Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto gap-0.5">
          <button
            onClick={() => onVendorViewModeChange("grid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              vendorViewMode === "grid"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid Cards
          </button>
          <button
            onClick={() => onVendorViewModeChange("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              vendorViewMode === "table"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Table List
          </button>
        </div>
      </div>

      {/* Actions right side */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => exportVendorsToExcel(filteredVendors, hubs, `SMILe_Vendors_Report_${new Date().toISOString().split('T')[0]}.xlsx`)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl border border-emerald-600 shadow-sm transition-all cursor-pointer hover:shadow hover:scale-[1.01] active:scale-[0.99]"
          title="Export currently filtered vendors to Excel"
        >
          <Download className="w-3.5 h-3.5" />
          Export to Excel
        </button>
        <div className="text-[11px] text-gray-400 font-medium">
          Showing {filteredVendors.length} of {hubFilteredVendors.length} vendors
        </div>
      </div>
    </div>

    {/* Content rendering based on selected view mode */}
    {filteredVendors.length === 0 ? (
      <div className="text-center py-16 text-gray-400">
        <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium">No vendors found</p>
        <p className="text-xs mt-1">Register a new vendor to authorize monthly uploads.</p>
      </div>
    ) : vendorViewMode === "grid" ? (
      /* 1. CARDS GRID VIEW - ULTRA COLORFUL & ATTRACTIVE */
      <div className="p-6 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVendors.map((vendor, index) => {
            const theme = colorsList[index % colorsList.length];
            const shareLink = portalShareUrl(window.location.origin, vendor.token);
            const initials = vendor.name ? vendor.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "V";

            return (
              <div 
                key={vendor.id} 
                className="bg-white rounded-2xl border border-gray-100 hover:border-orange-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
              >
                {/* Decorative top strip */}
                <div className={`h-2 w-full ${theme.accent}`} />
                
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Vendor Header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.text} font-black text-sm flex items-center justify-center shrink-0 shadow-inner`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                        {vendor.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{vendor.email}</p>
                      {vendor.phone && (
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">{vendor.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* GST & State container */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">GST details</span>
                      {vendor.gstNumber ? (
                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold">
                          {vendor.gstNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md font-medium italic">
                          No GST listed
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200/40 pt-1.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Operating State</span>
                      {vendor.state ? (
                        <span className="text-[11px] font-extrabold text-gray-800 bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-0.5 rounded-md">
                          ðŸ“ {vendor.state}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">No State selected</span>
                      )}
                    </div>
                  </div>

                  {/* Associated Hubs */}
                  <div>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mb-1.5">Assigned Hubs</p>
                    {vendor.hubs && vendor.hubs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {vendor.hubs.map((hubId) => {
                          const hubObj = hubs.find((h) => h.id === hubId);
                          return (
                            <span
                              key={hubId}
                              className="text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100/80 px-2 py-0.5 rounded-lg hover:bg-violet-100 transition-colors"
                              title={hubObj ? hubObj.name : "Unknown Hub"}
                            >
                              {hubObj ? hubObj.code : hubId}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">None associated</p>
                    )}
                  </div>

                  {/* Allowed Billing Categories */}
                  <div>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mb-1.5">Allowed Billing Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {vendor.categories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Secure Access Link */}
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Unique Portal Link</p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={shareLink}
                        className="bg-gray-50 border border-gray-200 rounded-xl text-[9px] font-mono px-2.5 py-1.5 text-gray-500 w-full select-all focus:outline-none"
                      />
                      <button
                        onClick={() => onCopyLink(vendor.token)}
                        className={`p-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                          copiedToken === vendor.token
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                        }`}
                        title="Copy Secure Portal Link"
                      >
                        {copiedToken === vendor.token ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                          `Action Required: Secure Invoice Submission Portal Link`
                        )}&body=${encodeURIComponent(
                          `Dear ${vendor.name},\n\nPlease find your secure invoice upload link below:\n\n${shareLink}\n\nYou are requested to upload all your invoices by clicking this secure link before the 10th of every month.\n\nThank you,\nFinance Department`
                        )}`}
                        className="p-2 rounded-xl border bg-white border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title="Email Link to Vendor"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-medium">
                    Created {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onEditVendor(vendor)}
                      className="text-gray-500 hover:text-orange-600 p-2 hover:bg-orange-100/50 rounded-xl transition-colors inline-flex items-center cursor-pointer"
                      title="Edit Vendor Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteVendor(vendor.id, vendor.name)}
                      className="text-gray-500 hover:text-red-600 p-2 hover:bg-red-100/50 rounded-xl transition-colors inline-flex items-center cursor-pointer"
                      title="Archive / Delete Vendor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      /* 2. ENHANCED HIGH-CONTRAST LIST TABLE VIEW */
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Vendor Detail
              </th>
              <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                GST & State
              </th>
              <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Assigned Hubs
              </th>
              <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Allowed Categories
              </th>
              <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Copy Unique Upload Link
              </th>
              <th className="px-6 py-3.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredVendors.map((vendor, index) => {
              const theme = colorsList[index % colorsList.length];
              const shareLink = portalShareUrl(window.location.origin, vendor.token);
              return (
                <tr key={vendor.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${theme.bg} ${theme.text} font-bold text-xs flex items-center justify-center`}>
                        {vendor.name ? vendor.name[0].toUpperCase() : "V"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                          {vendor.name}
                        </span>
                        <span className="text-xs text-gray-500">{vendor.email}</span>
                        {vendor.phone && (
                          <span className="text-[10px] font-mono text-gray-400">{vendor.phone}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px] break-words whitespace-normal">
                    <div className="flex flex-col text-xs text-gray-600">
                      {vendor.gstNumber ? (
                        <span className="font-mono text-gray-900 font-medium break-all text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded inline-block max-w-max">
                          {vendor.gstNumber}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No GST</span>
                      )}
                      {vendor.state ? (
                        <span className="text-gray-700 mt-1 font-semibold text-[11px]">
                          ðŸ“ {vendor.state}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">No State</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vendor.hubs && vendor.hubs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {vendor.hubs.map((hubId) => {
                          const hubObj = hubs.find((h) => h.id === hubId);
                          return (
                            <span
                              key={hubId}
                              className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full"
                              title={hubObj ? hubObj.name : "Unknown Hub"}
                            >
                              {hubObj ? hubObj.code : hubId}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">None assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {vendor.categories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 max-w-[320px]">
                      <input
                        type="text"
                        readOnly
                        value={shareLink}
                        className="bg-gray-50 border border-gray-150 rounded-lg text-[10px] font-mono px-2.5 py-1.5 text-gray-500 w-full select-all focus:outline-none"
                      />
                      <button
                        onClick={() => onCopyLink(vendor.token)}
                        className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                          copiedToken === vendor.token
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                        }`}
                        title="Copy Shareable Link"
                      >
                        {copiedToken === vendor.token ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <a
                        href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                          `Action Required: Secure Invoice Submission Portal Link`
                        )}&body=${encodeURIComponent(
                          `Dear ${vendor.name},\n\nPlease find your secure invoice upload link below:\n\n${shareLink}\n\nYou are requested to upload all your invoices by clicking this secure link before the 10th of every month.\n\nThank you,\nFinance Department`
                        )}`}
                        className="p-1.5 rounded-lg border bg-white border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title="Send Link via Email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1">
                    <button
                      onClick={() => onEditVendor(vendor)}
                      className="text-gray-400 hover:text-orange-600 p-2 hover:bg-orange-50/50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                      title="Edit Vendor"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteVendor(vendor.id, vendor.name)}
                      className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50/50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                      title="Delete Vendor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>
  );
}

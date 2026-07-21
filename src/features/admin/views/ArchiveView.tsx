"use client";

import { useCallback, useState } from "react";
import { Archive, FileText, Loader2, RefreshCw, Search, Users } from "lucide-react";
import { ListPagination } from "@/src/components/ListPagination";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
import type { Invoice, Vendor } from "@/src/types";

type ArchiveSubTab = "vendor" | "invoice";

type ArchiveViewProps = {
  refreshKey: number | string;
  onRestore: (type: "vendor" | "invoice", id: string) => void;
};

export default function ArchiveView({ refreshKey, onRestore }: ArchiveViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<ArchiveSubTab>("vendor");
  const [archiveSearch, setArchiveSearch] = useState("");

  const filterKey = archiveSearch;
  const listRefreshKey = `${refreshKey}|${filterKey}`;

  const buildVendorUrl = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("type", "vendor");
      params.set("page", String(page));
      params.set("limit", String(limit));
      const q = archiveSearch.trim();
      if (q) params.set("search", q);
      return `/api/archive?${params.toString()}`;
    },
    [archiveSearch]
  );

  const buildInvoiceUrl = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("type", "invoice");
      params.set("page", String(page));
      params.set("limit", String(limit));
      const q = archiveSearch.trim();
      if (q) params.set("search", q);
      return `/api/archive?${params.toString()}`;
    },
    [archiveSearch]
  );

  const vendorsList = usePaginatedList<Vendor>({
    buildUrl: buildVendorUrl,
    refreshKey: listRefreshKey,
  });

  const invoicesList = usePaginatedList<Invoice>({
    buildUrl: buildInvoiceUrl,
    refreshKey: listRefreshKey,
  });

  useResetPageOnFilterChange(filterKey, vendorsList.setPage);
  useResetPageOnFilterChange(filterKey, invoicesList.setPage);

  const activeList = activeSubTab === "vendor" ? vendorsList : invoicesList;
  const searchPlaceholder =
    activeSubTab === "vendor"
      ? "Search archived vendors by name, email, remarks…"
      : "Search archived invoices by number, vendor, remarks…";

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 rounded-xl">
            <Archive className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">System Archive Center</h2>
            <p className="text-xs text-gray-500">
              View deletion remarks and restore archived vendors or invoices to active status.
            </p>
          </div>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 self-stretch md:self-auto justify-center">
          <button
            type="button"
            onClick={() => setActiveSubTab("vendor")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === "vendor"
                ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Vendors ({vendorsList.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("invoice")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === "invoice"
                ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Invoices ({invoicesList.total})
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white via-violet-50/20 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
              />
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              {activeList.loading
                ? "Loading archive…"
                : activeList.total === 0
                  ? "No matching records"
                  : `${activeList.total} archived ${activeSubTab === "vendor" ? "vendor" : "invoice"}${activeList.total === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {activeSubTab === "vendor" ? (
          <>
            {vendorsList.loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                <p className="text-xs font-medium">Loading archived vendors…</p>
              </div>
            ) : vendorsList.items.length === 0 ? (
              <div className="text-center py-20 px-6 text-gray-400">
                <Archive className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">No archived vendors found</p>
                <p className="text-xs mt-1.5">Try another search term or check the Invoices tab.</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                {vendorsList.items.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="p-4 border border-gray-100 rounded-xl bg-gray-50/30 hover:bg-gray-50/80 transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{vendor.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono">{vendor.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestore("vendor", vendor.id)}
                        className="px-3 py-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Restore
                      </button>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-[10px] text-amber-900 leading-normal">
                      <span className="font-semibold block uppercase tracking-wider text-[8px] text-amber-700 mb-0.5">
                        Deletion Remarks
                      </span>
                      {vendor.deletionRemarks || "No remarks provided"}
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-gray-400 border-t border-gray-100 pt-2 font-mono">
                      <span>
                        Archived:{" "}
                        {vendor.archivedAt
                          ? new Date(vendor.archivedAt).toLocaleString()
                          : "N/A"}
                      </span>
                      <span>Categories: {vendor.categories.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!vendorsList.loading && vendorsList.items.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50/30">
                <ListPagination
                  page={vendorsList.page}
                  pageSize={vendorsList.limit}
                  total={vendorsList.total}
                  onPageChange={vendorsList.setPage}
                  onPageSizeChange={vendorsList.setLimit}
                  accent="orange"
                />
              </div>
            )}
          </>
        ) : (
          <>
            {invoicesList.loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                <p className="text-xs font-medium">Loading archived invoices…</p>
              </div>
            ) : invoicesList.items.length === 0 ? (
              <div className="text-center py-20 px-6 text-gray-400">
                <Archive className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">No archived invoices found</p>
                <p className="text-xs mt-1.5">Try another search term or check the Vendors tab.</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                {invoicesList.items.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 border border-gray-100 rounded-xl bg-gray-50/30 hover:bg-gray-50/80 transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-gray-900">
                            {inv.invoiceNumber
                              ? `Inv: ${inv.invoiceNumber}`
                              : `No: ${inv.id.substring(0, 8)}`}
                          </h4>
                          <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                            {inv.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                          {inv.vendorName}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5 font-sans">
                        <span className="text-xs font-extrabold text-gray-900">
                          ₹{inv.amount.toLocaleString("en-IN")}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRestore("invoice", inv.id)}
                          className="px-3 py-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Restore
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-[10px] text-amber-900 leading-normal">
                      <span className="font-semibold block uppercase tracking-wider text-[8px] text-amber-700 mb-0.5">
                        Deletion Remarks
                      </span>
                      {inv.deletionRemarks || "No remarks provided"}
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-gray-400 border-t border-gray-100 pt-2 font-mono">
                      <span>
                        Archived:{" "}
                        {inv.archivedAt ? new Date(inv.archivedAt).toLocaleString() : "N/A"}
                      </span>
                      <span>File: {inv.fileName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!invoicesList.loading && invoicesList.items.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50/30">
                <ListPagination
                  page={invoicesList.page}
                  pageSize={invoicesList.limit}
                  total={invoicesList.total}
                  onPageChange={invoicesList.setPage}
                  onPageSizeChange={invoicesList.setLimit}
                  accent="orange"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

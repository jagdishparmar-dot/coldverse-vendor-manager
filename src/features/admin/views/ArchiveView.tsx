"use client";

import { useCallback, useState } from "react";
import { Archive, FileText, Loader2, RefreshCw, Search, Users } from "lucide-react";
import { ListPagination } from "@/src/components/ListPagination";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
import type { Invoice, Vendor } from "@/src/types";

type ArchiveViewProps = {
  refreshKey: number | string;
  onRestore: (type: "vendor" | "invoice", id: string) => void;
};

export default function ArchiveView({ refreshKey, onRestore }: ArchiveViewProps) {
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

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-violet-50 rounded-xl">
            <Archive className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">System Archive Center</h2>
            <p className="text-xs text-gray-500">
              Track all deleted vendors and invoices. You can view their deletion remarks and
              restore them to active status at any time.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search archive by name, invoice number, remarks..."
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Archived Vendors ({vendorsList.total})
              </h3>
            </div>
          </div>

          <div className="p-4 flex-1">
            {vendorsList.loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                <p className="text-xs font-medium">Loading...</p>
              </div>
            ) : vendorsList.items.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-medium">
                <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No archived vendors found.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {vendorsList.items.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="p-4 border border-gray-150 rounded-xl bg-gray-50/30 hover:bg-gray-50/80 transition-all space-y-3"
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
                        Deletion Remarks:
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
          </div>
          {!vendorsList.loading && vendorsList.items.length > 0 && (
            <ListPagination
              page={vendorsList.page}
              pageSize={vendorsList.limit}
              total={vendorsList.total}
              onPageChange={vendorsList.setPage}
              onPageSizeChange={vendorsList.setLimit}
              accent="orange"
            />
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Archived Invoices ({invoicesList.total})
              </h3>
            </div>
          </div>

          <div className="p-4 flex-1">
            {invoicesList.loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                <p className="text-xs font-medium">Loading...</p>
              </div>
            ) : invoicesList.items.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-medium">
                <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No archived invoices found.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {invoicesList.items.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 border border-gray-150 rounded-xl bg-gray-50/30 hover:bg-gray-50/80 transition-all space-y-3"
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
                        Deletion Remarks:
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
          </div>
          {!invoicesList.loading && invoicesList.items.length > 0 && (
            <ListPagination
              page={invoicesList.page}
              pageSize={invoicesList.limit}
              total={invoicesList.total}
              onPageChange={invoicesList.setPage}
              onPageSizeChange={invoicesList.setLimit}
              accent="orange"
            />
          )}
        </div>
      </div>
    </div>
  );
}

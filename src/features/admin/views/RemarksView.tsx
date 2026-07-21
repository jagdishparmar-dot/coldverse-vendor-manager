"use client";

import { useCallback } from "react";
import { Download, Inbox, Loader2, Pencil, Printer } from "lucide-react";
import { ListPagination } from "@/src/components/ListPagination";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
import type { Invoice } from "@/src/types";
import { formatCurrency } from "@/src/features/admin/utils";

type RemarksViewProps = {
  headerHubFilter: string;
  invoiceSearch: string;
  invoiceStatusFilter: string;
  selectedVendorId: string;
  selectedMonth: string;
  selectedDate: string;
  onStatusFilterChange: (status: string) => void;
  refreshKey: number | string;
  onEditStatus: (inv: Invoice) => void;
  onPrintInvoice: (inv: Invoice) => void;
};

export default function RemarksView({
  headerHubFilter,
  invoiceSearch,
  invoiceStatusFilter,
  selectedVendorId,
  selectedMonth,
  selectedDate,
  onStatusFilterChange,
  refreshKey,
  onEditStatus,
  onPrintInvoice,
}: RemarksViewProps) {
  const filterKey = [
    invoiceSearch,
    invoiceStatusFilter,
    selectedVendorId,
    selectedMonth,
    selectedDate,
    headerHubFilter,
  ].join("|");
  const listRefreshKey = `${refreshKey}|${filterKey}`;

  const buildUrl = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("hasRemarks", "1");
      const q = invoiceSearch.trim();
      if (q) params.set("search", q);
      if (invoiceStatusFilter && invoiceStatusFilter !== "All") {
        params.set("status", invoiceStatusFilter);
      }
      if (selectedVendorId && selectedVendorId !== "All") {
        params.set("vendorId", selectedVendorId);
      }
      if (headerHubFilter && headerHubFilter !== "All") {
        params.set("hubId", headerHubFilter);
      }
      if (selectedMonth && selectedMonth !== "All") {
        params.set("month", selectedMonth);
      }
      if (selectedDate) {
        params.set("date", selectedDate);
      }
      return `/api/invoices?${params.toString()}`;
    },
    [
      invoiceSearch,
      invoiceStatusFilter,
      selectedVendorId,
      headerHubFilter,
      selectedMonth,
      selectedDate,
    ]
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
    meta,
  } = usePaginatedList<Invoice>({
    buildUrl,
    refreshKey: listRefreshKey,
  });

  useResetPageOnFilterChange(filterKey, setPage);

  const statusCounts =
    (meta.statusCounts as Record<string, number> | undefined) || {};
  const holdCount = statusCounts.Hold || 0;
  const rejectedCount = statusCounts.Rejected || 0;
  const paidCount = statusCounts.Paid || 0;

  const toggleStatusFilter = (status: string) => {
    onStatusFilterChange(invoiceStatusFilter === status ? "All" : status);
  };

  const kpiCardClass = (status: string, idle: string, active: string) =>
    `p-5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 text-left ${
      invoiceStatusFilter === status ? active : idle
    }`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onStatusFilterChange("All")}
          className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-left cursor-pointer transition-all hover:-translate-y-0.5 ${
            invoiceStatusFilter === "All" ? "ring-2 ring-offset-1 ring-orange-400" : ""
          }`}
        >
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Total Flagged Remarks
          </div>
          <div className="text-2xl font-black text-gray-900">{total}</div>
          <p className="text-[10px] text-gray-500 mt-1">Invoices with summary notes</p>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusFilter("Hold")}
          className={kpiCardClass(
            "Hold",
            "bg-amber-50/30 border-amber-100",
            "bg-amber-50/50 border-amber-100 ring-2 ring-offset-1 ring-orange-400"
          )}
        >
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
            Hold Remarks
          </div>
          <div className="text-2xl font-black text-amber-700">{holdCount}</div>
          <p className="text-[10px] text-amber-600 mt-1">Awaiting corrections/approvals</p>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusFilter("Rejected")}
          className={kpiCardClass(
            "Rejected",
            "bg-rose-50/30 border-rose-100",
            "bg-rose-50/50 border-rose-100 ring-2 ring-offset-1 ring-orange-400"
          )}
        >
          <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">
            Rejected Remarks
          </div>
          <div className="text-2xl font-black text-rose-700">{rejectedCount}</div>
          <p className="text-[10px] text-rose-600 mt-1">Invoices flagged as returned/denied</p>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusFilter("Paid")}
          className={kpiCardClass(
            "Paid",
            "bg-emerald-50/30 border-emerald-100",
            "bg-emerald-50/50 border-emerald-100 ring-2 ring-offset-1 ring-orange-400"
          )}
        >
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Cleared / Paid Summary
          </div>
          <div className="text-2xl font-black text-emerald-700">{paidCount}</div>
          <p className="text-[10px] text-emerald-600 mt-1">Resolved notes & payments</p>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-base font-display font-semibold text-gray-900">
          Flagged Invoices & Remarks
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Use the filter panel above. Click a summary card to filter by status.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <p className="text-xs font-medium">Loading remarks...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400">
          <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No active remarks match your criteria</p>
          <p className="text-xs mt-1">Try adjusting filters in the panel above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {items.map((inv) => {
              const statusClass =
                inv.status === "Paid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : inv.status === "Hold"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : inv.status === "Rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-100"
                      : "bg-blue-50 text-blue-700 border-blue-100";

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-violet-200 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                          {inv.category}
                        </h4>
                        <h3 className="text-sm font-bold text-gray-900 mt-0.5">
                          {inv.vendorName}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-mono">
                          Invoice: <span className="font-semibold">{inv.invoiceNumber}</span> •{" "}
                          {inv.date}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className="text-sm font-mono font-bold text-gray-950">
                          {formatCurrency(inv.amount)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${statusClass}`}
                        >
                          {inv.status || "Pending"}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        inv.status === "Hold"
                          ? "bg-amber-50/40 border-amber-100 text-amber-900"
                          : inv.status === "Rejected"
                            ? "bg-rose-50/40 border-rose-100 text-rose-950"
                            : "bg-slate-50 border-gray-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <span>Invoice Summary & Remarks</span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed font-sans">
                        {inv.remarks}
                      </p>
                    </div>

                    {(inv.state || inv.hubName) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {inv.state && (
                          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium">
                            State: {inv.state}
                          </span>
                        )}
                        {inv.hubName && (
                          <span className="bg-violet-50 text-violet-700 text-[10px] px-2 py-0.5 rounded font-medium">
                            Hub: {inv.hubName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-gray-100/60 text-xs">
                    <button
                      type="button"
                      onClick={() => onEditStatus(inv)}
                      className="text-violet-600 hover:text-violet-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Update Summary / Status
                    </button>

                    <div className="flex items-center gap-3">
                      <a
                        href={`/api/invoices/download/${inv.id}`}
                        className="text-gray-500 hover:text-violet-600 font-semibold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Get File
                      </a>
                      <button
                        type="button"
                        onClick={() => onPrintInvoice(inv)}
                        className="text-gray-500 hover:text-emerald-600 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <ListPagination
            page={page}
            pageSize={limit}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            accent="orange"
          />
        </div>
      )}
    </div>
  );
}

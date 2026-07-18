"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  Pencil,
  Printer,
  Search,
} from "lucide-react";
import type { Hub, Invoice, Vendor } from "@/src/types";
import { exportInvoicesToExcel } from "@/src/utils/excelExport";
import {
  formatCurrency,
  getCategoryBadgeClass,
} from "@/src/features/admin/utils";

type StatusFilter = "All" | Invoice["status"];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const STATUS_STYLES: Record<Invoice["status"], string> = {
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Hold: "bg-amber-50 text-amber-700 border-amber-100",
  Rejected: "bg-rose-50 text-rose-700 border-rose-100",
  Pending: "bg-blue-50 text-blue-700 border-blue-100",
};

type PortalUploadHistoryProps = {
  invoices: Invoice[];
  vendor: Vendor | null;
  hubs: Hub[];
  onPrintInvoice: (inv: Invoice) => void;
  onEditInvoice: (inv: Invoice) => void;
};

function statusClass(status?: Invoice["status"]) {
  return STATUS_STYLES[status || "Pending"];
}

export default function PortalUploadHistory({
  invoices,
  vendor,
  hubs,
  onPrintInvoice,
  onEditInvoice,
}: PortalUploadHistoryProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      All: invoices.length,
      Pending: 0,
      Paid: 0,
      Hold: 0,
      Rejected: 0,
    };
    for (const inv of invoices) {
      const key = inv.status || "Pending";
      counts[key] += 1;
    }
    return counts;
  }, [invoices]);

  const sortedFiltered = useMemo(() => {
    const filtered = invoices.filter((inv) => {
      const status = inv.status || "Pending";
      if (statusFilter !== "All" && status !== statusFilter) return false;
      if (!deferredQuery) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(deferredQuery) ||
        inv.category.toLowerCase().includes(deferredQuery) ||
        inv.fileName.toLowerCase().includes(deferredQuery) ||
        (inv.state || "").toLowerCase().includes(deferredQuery) ||
        (inv.hubName || "").toLowerCase().includes(deferredQuery) ||
        (inv.remarks || "").toLowerCase().includes(deferredQuery) ||
        status.toLowerCase().includes(deferredQuery)
      );
    });

    return filtered.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [invoices, statusFilter, deferredQuery]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, safePage, pageSize]);

  const rangeStart = sortedFiltered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sortedFiltered.length);

  const totalAmount = useMemo(
    () => sortedFiltered.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    [sortedFiltered]
  );

  const setFilter = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
    setExpandedId(null);
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
    setExpandedId(null);
  };

  const onPageSizeChange = (value: number) => {
    setPageSize(value as (typeof PAGE_SIZE_OPTIONS)[number]);
    setPage(1);
    setExpandedId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[420px] overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-display font-semibold text-gray-900">
              Upload History
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {invoices.length} submitted · filtered total{" "}
              <span className="font-semibold text-gray-700">{formatCurrency(totalAmount)}</span>
            </p>
          </div>
          {invoices.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportInvoicesToExcel(
                  invoices,
                  vendor ? [vendor] : [],
                  hubs,
                  `SMILe_${vendor?.name || "Vendor"}_Submitted_Invoices_${new Date().toISOString().split("T")[0]}.xlsx`
                )
              }
              className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm shrink-0"
              title="Export all submitted invoices to Excel"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["All", "Pending", "Hold", "Paid", "Rejected"] as const).map((key) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-gray-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {key}
                <span
                  className={`min-w-[1.25rem] text-center rounded px-1 py-0.5 text-[9px] font-black ${
                    active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {statusCounts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoice no, category, hub, remarks…"
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 text-gray-400 px-4">
            <Inbox className="w-8 h-8 text-gray-300 stroke-[1.5] mb-2" />
            <p className="text-xs font-medium">No previous invoices uploaded</p>
            <p className="text-[10px] mt-0.5">
              Submit your first monthly invoice using the form.
            </p>
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-14 text-gray-400 px-4">
            <Search className="w-7 h-7 text-gray-300 stroke-[1.5] mb-2" />
            <p className="text-xs font-medium">No invoices match your filters</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
              className="mt-2 text-[11px] font-semibold text-violet-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[min(32rem,60vh)] overflow-y-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/95 border-b border-gray-100 sticky top-0 z-[1] backdrop-blur-sm">
                <tr className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  <th className="px-2 sm:px-3 py-2.5 w-8" aria-hidden />
                  <th className="px-2 py-2.5 font-bold">Invoice</th>
                  <th className="px-2 py-2.5 font-bold hidden xl:table-cell">Category</th>
                  <th className="px-2 py-2.5 font-bold text-right">Amount</th>
                  <th className="px-2 py-2.5 font-bold">Status</th>
                  <th className="px-2 sm:px-3 py-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageRows.map((inv) => {
                  const expanded = expandedId === inv.id;
                  const status = inv.status || "Pending";
                  return (
                    <Fragment key={inv.id}>
                      <tr className="align-top hover:bg-slate-50/40 transition-colors">
                        <td className="px-2 sm:px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : inv.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                            aria-expanded={expanded}
                            title={expanded ? "Hide details" : "Show details"}
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </td>
                        <td className="px-2 py-2.5 min-w-[7.5rem]">
                          <div
                            className="text-xs font-semibold text-gray-900 truncate max-w-[140px]"
                            title={inv.invoiceNumber}
                          >
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{inv.date}</div>
                          <div className="xl:hidden mt-1">
                            <span
                              className={`inline-flex text-[9px] font-bold border px-1.5 py-0.5 rounded ${getCategoryBadgeClass(inv.category)}`}
                            >
                              {inv.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 hidden xl:table-cell">
                          <span
                            className={`inline-flex text-[9px] font-bold border px-1.5 py-0.5 rounded ${getCategoryBadgeClass(inv.category)}`}
                          >
                            {inv.category}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="px-2 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusClass(status)}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <a
                              href={`/api/invoices/download/${inv.id}`}
                              className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 cursor-pointer"
                              title="Download file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => onPrintInvoice(inv)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title="Print invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {status !== "Paid" && (
                              <button
                                type="button"
                                onClick={() => onEditInvoice(inv)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Edit details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-violet-50/30">
                          <td colSpan={6} className="px-4 py-3 text-[11px] text-slate-600 space-y-2">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span>
                                <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider mr-1">
                                  Uploaded
                                </span>
                                {new Date(inv.uploadedAt).toLocaleString()}
                              </span>
                              {inv.state && (
                                <span>
                                  <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider mr-1">
                                    State
                                  </span>
                                  {inv.state}
                                </span>
                              )}
                              {inv.hubName && (
                                <span>
                                  <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider mr-1">
                                    Hub
                                  </span>
                                  {inv.hubName}
                                </span>
                              )}
                            </div>
                            <p
                              className="font-mono text-[10px] text-slate-500 truncate"
                              title={inv.fileName}
                            >
                              File: {inv.fileName}
                            </p>
                            {inv.remarks ? (
                              <p className="bg-white/80 border border-violet-100 rounded-lg px-2.5 py-2 text-slate-700">
                                <span className="font-semibold text-slate-800">Remarks: </span>
                                {inv.remarks}
                              </p>
                            ) : (
                              <p className="text-slate-400 italic">No remarks from accounts.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sortedFiltered.length > 0 && (
        <div className="border-t border-gray-100 px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>
              Showing <span className="font-semibold text-gray-700">{rangeStart}–{rangeEnd}</span> of{" "}
              <span className="font-semibold text-gray-700">{sortedFiltered.length}</span>
            </span>
            <label className="inline-flex items-center gap-1.5">
              <span className="sr-only">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="text-[10px] font-semibold border border-gray-200 rounded-lg bg-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                setExpandedId(null);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="min-w-[4.5rem] text-center text-[10px] font-semibold text-gray-600">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                setExpandedId(null);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

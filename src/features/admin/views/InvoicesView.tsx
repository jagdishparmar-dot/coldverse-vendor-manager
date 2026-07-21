"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileCheck,
  FileText,
  Inbox,
  Loader2,
  Printer,
  Trash2,
} from "lucide-react";
import { ListPagination } from "@/src/components/ListPagination";
import InvoicesExportProgressModal from "@/src/features/admin/components/InvoicesExportProgressModal";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
import {
  buildInvoiceExportFilename,
  exportAllFilteredInvoices,
  runInvoiceExcelExport,
  type InvoiceExportProgress,
} from "@/src/features/admin/utils/invoiceExport";
import { exportInvoicesToExcel } from "@/src/utils/excelExport";
import type { Hub, Invoice, Vendor } from "@/src/types";
import { formatCurrency, getCategoryBadgeClass } from "@/src/features/admin/utils";

type VendorOption = { id: string; name: string };

type InvoicesViewProps = {
  headerHubFilter: string;
  invoiceSearch: string;
  invoiceCategoryFilter: string;
  invoiceStatusFilter: string;
  selectedVendorId: string;
  selectedMonth: string;
  selectedDate: string;
  vendorOptions: VendorOption[];
  hubs: Hub[];
  refreshKey: number | string;
  onEditStatus: (inv: Invoice) => void;
  onPrintInvoice: (inv: Invoice) => void;
  onPrintChallan: (inv: Invoice) => void;
  onDeleteInvoice: (id: string, label: string) => void;
};

function getStatusBadgeClass(status: Invoice["status"] | string | undefined): string {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Hold":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Rejected":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-blue-50 text-blue-700 border-blue-100";
  }
}

function formatUploadedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvoicesView({
  headerHubFilter,
  invoiceSearch,
  invoiceCategoryFilter,
  invoiceStatusFilter,
  selectedVendorId,
  selectedMonth,
  selectedDate,
  vendorOptions,
  hubs,
  refreshKey,
  onEditStatus,
  onPrintInvoice,
  onPrintChallan,
  onDeleteInvoice,
}: InvoicesViewProps) {
  const filterKey = [
    invoiceSearch,
    invoiceCategoryFilter,
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
      const q = invoiceSearch.trim();
      if (q) params.set("search", q);
      if (invoiceCategoryFilter && invoiceCategoryFilter !== "All") {
        params.set("category", invoiceCategoryFilter);
      }
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
      invoiceCategoryFilter,
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
  } = usePaginatedList<Invoice>({
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
    if (selectedVendorId !== "All") {
      const vendor = vendorOptions.find((v) => v.id === selectedVendorId);
      labels.push(vendor ? `Vendor: ${vendor.name}` : "Vendor filtered");
    }
    if (invoiceCategoryFilter !== "All") labels.push(invoiceCategoryFilter);
    if (invoiceStatusFilter !== "All") labels.push(invoiceStatusFilter);
    if (selectedMonth !== "All") labels.push(`Month ${selectedMonth}`);
    if (selectedDate) labels.push(selectedDate);
    if (invoiceSearch.trim()) labels.push(`"${invoiceSearch.trim()}"`);
    return labels;
  }, [
    headerHubFilter,
    hubs,
    selectedVendorId,
    vendorOptions,
    invoiceCategoryFilter,
    invoiceStatusFilter,
    selectedMonth,
    selectedDate,
    invoiceSearch,
  ]);

  const canExport = !loading && total > 0;
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<InvoiceExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuOpen]);

  useEffect(() => {
    if (exportProgress?.phase !== "complete" || exportError) return;
    const timer = window.setTimeout(() => {
      setExportProgress(null);
      setExportError(null);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [exportProgress, exportError]);

  const vendorList = vendorOptions as Vendor[];

  const handleExportCurrentPage = () => {
    setExportMenuOpen(false);
    exportInvoicesToExcel(items, vendorList, hubs, buildInvoiceExportFilename());
  };

  const handleExportAll = async () => {
    setExportMenuOpen(false);
    setExportError(null);

    const needsFetch = total > items.length;
    const showProgressModal = needsFetch || total > 25;

    const startProgress = (): InvoiceExportProgress => ({
      phase: needsFetch ? "fetching" : "building",
      loaded: 0,
      total,
      message: needsFetch ? "Preparing export…" : "Building Excel spreadsheet…",
      percent: needsFetch ? 2 : 90,
    });

    if (!showProgressModal) {
      exportInvoicesToExcel(items, vendorList, hubs, buildInvoiceExportFilename());
      return;
    }

    setExportProgress(startProgress());

    try {
      if (needsFetch) {
        await exportAllFilteredInvoices({
          buildUrl,
          total,
          vendors: vendorList,
          hubs,
          onProgress: setExportProgress,
        });
      } else {
        await runInvoiceExcelExport({
          invoices: items,
          vendors: vendorList,
          hubs,
          onProgress: setExportProgress,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong during export.";
      setExportError(message);
      setExportProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: "error",
              message,
              percent: prev.percent,
            }
          : {
              phase: "error",
              loaded: 0,
              total,
              message,
              percent: 0,
            }
      );
    }
  };

  const closeExportProgress = () => {
    setExportProgress(null);
    setExportError(null);
  };

  return (
    <>
      {exportProgress && (
        <InvoicesExportProgressModal
          progress={exportProgress}
          error={exportError}
          onClose={exportError ? closeExportProgress : undefined}
        />
      )}

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white via-orange-50/20 to-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 shrink-0">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-gray-950 leading-tight">
                  Invoice Records
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Review uploads, update status, and manage attachments.
                </p>
              </div>
            </div>

            {activeFilterLabels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
            <div className="text-[11px] text-gray-500 font-medium sm:text-right">
              {loading ? (
                "Loading invoices…"
              ) : total === 0 ? (
                "No matching records"
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
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                disabled={!canExport}
                onClick={() => setExportMenuOpen((open) => !open)}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white pl-3.5 pr-3 py-2 rounded-xl border border-emerald-600 shadow-sm transition-all cursor-pointer"
                title="Export invoices to Excel"
                aria-expanded={exportMenuOpen}
                aria-haspopup="menu"
              >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {exportMenuOpen && canExport && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-100 bg-white shadow-lg py-1.5 z-20"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportCurrentPage}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-gray-900 block">Current page</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Export {items.length.toLocaleString("en-IN")} record
                      {items.length === 1 ? "" : "s"} visible on this page
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleExportAll()}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-gray-50 transition-colors border-t border-gray-100 cursor-pointer"
                  >
                    <span className="font-semibold text-gray-900 block">All filtered records</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Export all {total.toLocaleString("en-IN")} matching invoice
                      {total === 1 ? "" : "s"}
                      {total > items.length ? " with progress tracking" : ""}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            <p className="text-xs font-medium">Loading invoice records…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-6 text-gray-400">
            <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No invoice records found</p>
            <p className="text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              Adjust filters in the panel above or share vendor portal links to collect new
              uploads.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/90 sticky top-0 z-[1] backdrop-blur-sm">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Invoice / Date
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Category
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Attachment
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-12">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {items.map((inv) => (
                <tr
                  key={inv.id}
                  className="group hover:bg-orange-50/25 transition-colors"
                >
                  <td className="px-4 sm:px-6 py-3.5 align-top">
                    <div className="flex flex-col gap-0.5 min-w-[140px]">
                      <span
                        className="text-sm font-semibold text-gray-900 truncate max-w-[160px]"
                        title={inv.invoiceNumber}
                      >
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {inv.date}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        Uploaded {formatUploadedAt(inv.uploadedAt)}
                      </span>
                      {inv.hubName && (
                        <span className="text-[9px] text-violet-600 font-medium mt-0.5 truncate max-w-[160px]">
                          {inv.hubName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 align-top">
                    <div className="min-w-[120px] max-w-[180px]">
                      <span
                        className="text-xs font-semibold text-gray-800 line-clamp-2"
                        title={inv.vendorName}
                      >
                        {inv.vendorName}
                      </span>
                      {inv.state && (
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {inv.state}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 align-top hidden md:table-cell">
                    <span
                      className={`inline-flex text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wide ${getCategoryBadgeClass(inv.category)}`}
                    >
                      {inv.category}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 align-top whitespace-nowrap">
                    <span className="font-mono text-sm font-bold text-gray-900 tabular-nums">
                      {formatCurrency(inv.amount)}
                    </span>
                    <span className="md:hidden block mt-1">
                      <span
                        className={`inline-flex text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase ${getCategoryBadgeClass(inv.category)}`}
                      >
                        {inv.category}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 align-top">
                    <button
                      type="button"
                      onClick={() => onEditStatus(inv)}
                      className="group/status flex flex-col items-start gap-1 text-left cursor-pointer rounded-lg p-1 -m-1 hover:bg-white/80 transition-colors max-w-[200px]"
                      title="Update status and remarks"
                    >
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border inline-flex items-center gap-1 ${getStatusBadgeClass(inv.status)}`}
                      >
                        {inv.status || "Pending"}
                        <span className="text-[9px] text-gray-400 group-hover/status:text-gray-600 font-normal normal-case">
                          edit
                        </span>
                      </span>
                      {inv.remarks ? (
                        <span
                          className="text-[10px] text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 line-clamp-2 leading-snug"
                          title={inv.remarks}
                        >
                          {inv.remarks}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400 italic">
                          No remarks
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 align-top hidden lg:table-cell">
                    <div className="flex flex-col gap-2 min-w-[150px]">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`/api/invoices/download/${inv.id}`}
                          className="text-[11px] text-violet-600 hover:text-violet-700 font-semibold inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 -ml-1 hover:bg-violet-50 w-fit transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          Download
                        </a>
                        <button
                          type="button"
                          onClick={() => onPrintInvoice(inv)}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 -ml-1 hover:bg-emerald-50 w-fit text-left cursor-pointer transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 shrink-0" />
                          Print invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintChallan(inv)}
                          className="text-[11px] text-violet-600 hover:text-violet-700 font-semibold inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 -ml-1 hover:bg-violet-50 w-fit text-left cursor-pointer transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          Print challan
                        </button>
                      </div>
                      <p
                        className="text-[9px] text-gray-400 font-mono truncate flex items-center gap-1 max-w-[160px]"
                        title={inv.fileName}
                      >
                        <FileText className="w-3 h-3 shrink-0 opacity-60" />
                        {inv.fileName}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 align-top text-right">
                    <div className="flex items-start justify-end gap-0.5">
                      <div className="lg:hidden flex flex-col gap-1 mr-1">
                        <a
                          href={`/api/invoices/download/${inv.id}`}
                          className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onPrintInvoice(inv)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Print invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onDeleteInvoice(inv.id, inv.invoiceNumber || inv.fileName)
                        }
                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50/60 rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Archive invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && items.length > 0 && (
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
      )}
    </div>
    </>
  );
}

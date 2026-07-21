"use client";

import { useCallback } from "react";
import {
  Download,
  FileCheck,
  Inbox,
  Loader2,
  Printer,
  Trash2,
} from "lucide-react";
import { ListPagination } from "@/src/components/ListPagination";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="text-[11px] text-gray-500 font-medium">
          Use the filter panel above to search and narrow invoice records.
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              exportInvoicesToExcel(
                items,
                vendorOptions as Vendor[],
                hubs,
                `SMILe_Invoice_Details_Report_${new Date().toISOString().split("T")[0]}.xlsx`
              )
            }
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl border border-emerald-600 shadow-sm transition-all cursor-pointer hover:shadow hover:scale-[1.01] active:scale-[0.99]"
            title="Export current page invoices to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Export to Excel
          </button>
          <div className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
            {loading ? "Loading..." : `Showing ${items.length} of ${total} invoices`}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            <p className="text-xs font-medium">Loading invoices...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No invoice records found</p>
            <p className="text-xs mt-1">
              Change search filters or share links with vendors to get started.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Invoice No / Date
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Vendor Name
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Gross Amount (INR)
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Status & Remarks
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Attachment
                </th>
                <th className="px-6 py-3.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Invoice Date: {inv.date}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        Uploaded: {new Date(inv.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-semibold text-gray-800">
                      {inv.vendorName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wide ${getCategoryBadgeClass(inv.category)}`}
                    >
                      {inv.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-gray-900">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onEditStatus(inv)}
                      className="group flex flex-col items-start gap-1 text-left cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-all"
                      title="Click to update status and remarks"
                    >
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                          inv.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : inv.status === "Hold"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : inv.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                      >
                        {inv.status || "Pending"}
                        <span className="text-[9px] text-gray-400 group-hover:text-gray-600 font-normal ml-0.5">
                          (Edit)
                        </span>
                      </span>
                      {inv.remarks && (
                        <span
                          className="text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 mt-0.5 block max-w-[180px] truncate"
                          title={inv.remarks}
                        >
                          {inv.remarks}
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={`/api/invoices/download/${inv.id}`}
                        className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1.5 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download File
                      </a>
                      <button
                        type="button"
                        onClick={() => onPrintInvoice(inv)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 hover:underline text-left cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrintChallan(inv)}
                        className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1.5 hover:underline text-left cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Print Challan
                      </button>
                    </div>
                    <p
                      className="text-[9px] text-gray-400 font-mono mt-1 max-w-[140px] truncate"
                      title={inv.fileName}
                    >
                      {inv.fileName}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        onDeleteInvoice(inv.id, inv.invoiceNumber || inv.fileName)
                      }
                      className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50/50 rounded-lg transition-colors"
                      title="Delete Invoice Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && items.length > 0 && (
        <ListPagination
          page={page}
          pageSize={limit}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          accent="orange"
        />
      )}
    </div>
  );
}

"use client";

import { Download, Inbox, Pencil, Printer, Search } from "lucide-react";
import type { Invoice } from "@/src/types";
import { formatCurrency } from "@/src/features/admin/utils";

type RemarksViewProps = {
  invoices: Invoice[];
  invoiceSearch: string;
  onInvoiceSearchChange: (value: string) => void;
  matchesHeaderHubInvoice: (inv: Invoice) => boolean;
  onEditStatus: (inv: Invoice) => void;
  onPrintInvoice: (inv: Invoice) => void;
};

export default function RemarksView({
  invoices,
  invoiceSearch,
  onInvoiceSearchChange,
  matchesHeaderHubInvoice,
  onEditStatus,
  onPrintInvoice,
}: RemarksViewProps) {
  const invoicesWithRemarks = invoices.filter(
    (inv) =>
      inv.remarks &&
      inv.remarks.trim().length > 0 &&
      !inv.archived &&
      matchesHeaderHubInvoice(inv)
  );

  const filteredRemarksList = invoicesWithRemarks.filter((inv) => {
    const query = invoiceSearch.toLowerCase();
    return (
      inv.vendorName.toLowerCase().includes(query) ||
      inv.invoiceNumber.toLowerCase().includes(query) ||
      inv.remarks.toLowerCase().includes(query) ||
      inv.category.toLowerCase().includes(query)
    );
  });

  const holdCount = invoicesWithRemarks.filter((inv) => inv.status === "Hold").length;
  const rejectedCount = invoicesWithRemarks.filter((inv) => inv.status === "Rejected").length;
  const paidCount = invoicesWithRemarks.filter((inv) => inv.status === "Paid").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Total Flagged Remarks
          </div>
          <div className="text-2xl font-black text-gray-900">{invoicesWithRemarks.length}</div>
          <p className="text-[10px] text-gray-500 mt-1">Invoices with summary notes</p>
        </div>
        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
            Hold Remarks
          </div>
          <div className="text-2xl font-black text-amber-700">{holdCount}</div>
          <p className="text-[10px] text-amber-600 mt-1">Awaiting corrections/approvals</p>
        </div>
        <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 shadow-sm">
          <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">
            Rejected Remarks
          </div>
          <div className="text-2xl font-black text-rose-700">{rejectedCount}</div>
          <p className="text-[10px] text-rose-600 mt-1">Invoices flagged as returned/denied</p>
        </div>
        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Cleared / Paid Summary
          </div>
          <div className="text-2xl font-black text-emerald-700">{paidCount}</div>
          <p className="text-[10px] text-emerald-600 mt-1">Resolved notes & payments</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-display font-semibold text-gray-900">
            Flagged Invoices & Remarks
          </h3>
          <p className="text-xs text-gray-500">
            Highlighting all invoices with active summaries, notes, and remarks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search remarks, vendors, INV no..."
              value={invoiceSearch}
              onChange={(e) => onInvoiceSearchChange(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {filteredRemarksList.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400">
          <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No active remarks match your criteria</p>
          <p className="text-xs mt-1">Try resetting the search query above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRemarksList.map((inv) => {
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
                      <h3 className="text-sm font-bold text-gray-900 mt-0.5">{inv.vendorName}</h3>
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
                    <p className="text-xs font-medium leading-relaxed font-sans">{inv.remarks}</p>
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
      )}
    </div>
  );
}

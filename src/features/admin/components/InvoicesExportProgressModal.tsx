"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { InvoiceExportProgress } from "@/src/features/admin/utils/invoiceExport";

type InvoicesExportProgressModalProps = {
  progress: InvoiceExportProgress;
  error?: string | null;
  onClose?: () => void;
};

export default function InvoicesExportProgressModal({
  progress,
  error,
  onClose,
}: InvoicesExportProgressModalProps) {
  const isError = progress.phase === "error" || Boolean(error);
  const isComplete = progress.phase === "complete" && !isError;
  const canClose = isError && onClose;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-export-progress-title"
      aria-busy={!isError && !isComplete}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                isError
                  ? "bg-red-50 text-red-600"
                  : isComplete
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-orange-50 text-orange-600"
              }`}
            >
              {isError ? (
                <AlertCircle className="w-5 h-5" />
              ) : isComplete ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                id="invoice-export-progress-title"
                className="text-sm font-bold text-gray-900"
              >
                {isError
                  ? "Export failed"
                  : isComplete
                    ? "Export complete"
                    : "Exporting invoices"}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {error || progress.message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isError
                  ? "bg-red-500"
                  : isComplete
                    ? "bg-emerald-500"
                    : "bg-orange-500"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span>{Math.round(progress.percent)}% complete</span>
            {!isError && progress.total > 0 && (
              <span className="tabular-nums">
                {progress.loaded.toLocaleString("en-IN")} /{" "}
                {progress.total.toLocaleString("en-IN")} records
              </span>
            )}
          </div>

          {!isError && !isComplete && (
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Please keep this window open. Large exports may take a minute while records are
              fetched and the spreadsheet is prepared.
            </p>
          )}
        </div>

        {canClose && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

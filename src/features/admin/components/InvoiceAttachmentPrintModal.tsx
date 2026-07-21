"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import type { Invoice } from "@/src/types";
import {
  attachmentKindLabel,
  isPrintableAttachmentKind,
  resolveAttachmentKind,
} from "@/src/features/admin/utils/attachmentKind";

type LoadStatus = "loading" | "ready" | "error";

type InvoiceAttachmentPrintModalProps = {
  invoice: Invoice;
  viewUrl: string;
  downloadUrl: string;
  onClose: () => void;
  closeAfterPrint?: boolean;
};

export default function InvoiceAttachmentPrintModal({
  invoice,
  viewUrl,
  downloadUrl,
  onClose,
  closeAfterPrint = true,
}: InvoiceAttachmentPrintModalProps) {
  const kind = resolveAttachmentKind(invoice.fileType, invoice.fileName);
  const printable = isPrintableAttachmentKind(kind);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(
    printable ? "loading" : "error"
  );
  const [errorMessage, setErrorMessage] = useState(
    printable
      ? ""
      : `Printing is not supported for ${attachmentKindLabel(kind)} attachments (${invoice.fileType || "unknown type"}). Download the file instead.`
  );

  const markReady = useCallback(() => setLoadStatus("ready"), []);
  const markError = useCallback((message: string) => {
    setLoadStatus("error");
    setErrorMessage(message);
  }, []);

  useEffect(() => {
    if (!printable) return;

    setLoadStatus("loading");
    setErrorMessage("");

    let cancelled = false;

    fetch(viewUrl, { method: "GET", cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          markError(
            res.status === 404
              ? "Attachment file not found in storage. Download may also fail."
              : `Could not load attachment (HTTP ${res.status}).`
          );
          return;
        }
        await res.body?.cancel?.();
      })
      .catch(() => {
        if (!cancelled) {
          markError("Network error while loading the attachment.");
        }
      });

    const timeout = window.setTimeout(() => {
      setLoadStatus((prev) => {
        if (prev === "loading") {
          setErrorMessage(
            "The attachment is taking too long to load. Check your connection or download the file."
          );
          return "error";
        }
        return prev;
      });
    }, 20000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [viewUrl, invoice.id, printable, markError]);

  useEffect(() => {
    if (!closeAfterPrint) return;

    const handleAfterPrint = () => onClose();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [closeAfterPrint, onClose]);

  const handlePrint = () => {
    if (loadStatus !== "ready") return;
    window.print();
  };

  const canPrint = printable && loadStatus === "ready";

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto screen-only">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full flex flex-col my-auto transition-all">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150/80 bg-slate-50/50 rounded-t-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-display font-bold text-gray-950 leading-tight">
                  Print Invoice Attachment
                </h2>
                <p className="text-[11px] text-gray-400 font-medium font-sans truncate">
                  {invoice.fileName} · {attachmentKindLabel(kind)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-slate-100/80 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Close print preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 md:p-8 bg-slate-100/40 border-b border-gray-100 max-h-[65vh] overflow-y-auto flex flex-col items-center">
            <div className="bg-white p-4 shadow-md border border-slate-200/80 rounded-xl w-full">
              <p className="text-xs text-gray-400 mb-3 font-semibold text-center">
                Attachment preview
              </p>

              {loadStatus === "loading" && printable && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                  <p className="text-xs font-medium">Loading attachment…</p>
                </div>
              )}

              {loadStatus === "error" && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-800">
                    Unable to preview this attachment
                  </p>
                  <p className="text-xs text-gray-500 max-w-md">{errorMessage}</p>
                  <a
                    href={downloadUrl}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline"
                  >
                    Download file instead
                  </a>
                </div>
              )}

              {printable && loadStatus !== "error" && kind === "image" && (
                <div
                  className={`border border-slate-200 rounded-lg overflow-hidden p-2 bg-slate-50 max-h-[420px] flex justify-center items-center ${
                    loadStatus === "loading" ? "opacity-0 h-0 overflow-hidden p-0 border-0" : ""
                  }`}
                >
                  <img
                    src={viewUrl}
                    alt={invoice.fileName}
                    onLoad={markReady}
                    onError={() =>
                      markError(
                        "Could not load the image file. It may be missing from storage or corrupted."
                      )
                    }
                    className="max-h-[400px] w-auto object-contain rounded"
                  />
                </div>
              )}

              {printable && loadStatus !== "error" && kind === "pdf" && (
                <div
                  className={`border border-slate-200 rounded-lg overflow-hidden bg-slate-50 ${
                    loadStatus === "loading" ? "opacity-0 h-0 overflow-hidden border-0" : ""
                  }`}
                >
                  <iframe
                    src={viewUrl}
                    title={`PDF preview: ${invoice.fileName}`}
                    onLoad={markReady}
                    className="w-full h-[420px] border-0 bg-white"
                  />
                </div>
              )}

              {canPrint && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-3 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100 text-center">
                  Only the uploaded attachment will be sent to the printer.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-6 py-4 border-t border-gray-100 bg-slate-50/50 rounded-b-2xl">
            <p className="text-[11px] text-gray-400 font-medium">
              {canPrint
                ? "Choose portrait or landscape in the print dialog to fit your document."
                : "Download the file if printing is unavailable."}
            </p>
            <div className="flex flex-wrap gap-2 shrink-0 justify-end">
              {kind === "pdf" && printable && (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open PDF
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!canPrint}
                title={
                  !printable
                    ? "This file type cannot be printed from the browser"
                    : loadStatus === "loading"
                      ? "Wait until the attachment finishes loading"
                      : undefined
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {loadStatus === "loading" ? "Preparing…" : "Print Now"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {canPrint && kind === "image" && (
        <div className="print-only invoice-print-attachment bg-white">
          <img
            src={viewUrl}
            alt={invoice.fileName}
            referrerPolicy="no-referrer"
            className="invoice-print-image"
          />
        </div>
      )}

      {canPrint && kind === "pdf" && (
        <div className="print-only invoice-print-attachment bg-white">
          <iframe
            src={viewUrl}
            title={`Print: ${invoice.fileName}`}
            className="invoice-print-pdf"
          />
        </div>
      )}
    </>
  );
}

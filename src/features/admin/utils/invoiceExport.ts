import type { PaginatedResult } from "@/lib/pagination";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { exportInvoicesToExcel } from "@/src/utils/excelExport";
import type { Hub, Invoice, Vendor } from "@/src/types";

export type InvoiceExportPhase = "fetching" | "building" | "complete" | "error";

export type InvoiceExportProgress = {
  phase: InvoiceExportPhase;
  loaded: number;
  total: number;
  message: string;
  percent: number;
};

export function buildInvoiceExportFilename(): string {
  return `SMILe_Invoice_Details_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
}

export async function fetchAllFilteredInvoices(
  buildUrl: (page: number, limit: number) => string,
  total: number,
  onProgress?: (progress: InvoiceExportProgress) => void
): Promise<Invoice[]> {
  if (total <= 0) return [];

  const batchSize = MAX_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / batchSize));
  const collected: Invoice[] = [];

  for (let page = 1; page <= totalPages; page++) {
    onProgress?.({
      phase: "fetching",
      loaded: collected.length,
      total,
      message: `Fetching records… page ${page} of ${totalPages}`,
      percent: Math.min(
        88,
        Math.round((collected.length / total) * 88) || (page === 1 ? 4 : 0)
      ),
    });

    const response = await fetch(buildUrl(page, batchSize));
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        typeof data.error === "string" ? data.error : "Failed to load invoices for export."
      );
    }

    const data = (await response.json()) as PaginatedResult<Invoice>;
    collected.push(...(data.items || []));

    onProgress?.({
      phase: "fetching",
      loaded: collected.length,
      total,
      message: `Fetched ${collected.length.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} records`,
      percent: Math.min(88, Math.round((collected.length / total) * 88)),
    });
  }

  return collected;
}

export async function runInvoiceExcelExport(options: {
  invoices: Invoice[];
  vendors: Vendor[];
  hubs: Hub[];
  filename?: string;
  onProgress?: (progress: InvoiceExportProgress) => void;
}): Promise<void> {
  const { invoices, vendors, hubs, onProgress } = options;
  const filename = options.filename ?? buildInvoiceExportFilename();
  const total = invoices.length;

  onProgress?.({
    phase: "building",
    loaded: total,
    total,
    message: "Building Excel spreadsheet…",
    percent: 92,
  });

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });

  exportInvoicesToExcel(invoices, vendors, hubs, filename);

  onProgress?.({
    phase: "complete",
    loaded: total,
    total,
    message: `Download started — ${total.toLocaleString("en-IN")} record${total === 1 ? "" : "s"}`,
    percent: 100,
  });
}

export async function exportAllFilteredInvoices(options: {
  buildUrl: (page: number, limit: number) => string;
  total: number;
  vendors: Vendor[];
  hubs: Hub[];
  onProgress?: (progress: InvoiceExportProgress) => void;
}): Promise<void> {
  const invoices = await fetchAllFilteredInvoices(
    options.buildUrl,
    options.total,
    options.onProgress
  );

  if (invoices.length === 0) {
    throw new Error("No invoice records matched the current filters.");
  }

  await runInvoiceExcelExport({
    invoices,
    vendors: options.vendors,
    hubs: options.hubs,
    onProgress: options.onProgress,
  });
}

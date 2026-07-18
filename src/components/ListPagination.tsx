"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/lib/pagination";

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  /** Accent for focus rings — orange matches admin console */
  accent?: "orange" | "violet";
};

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  accent = "orange",
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);
  const ring =
    accent === "violet"
      ? "focus:ring-violet-500/20"
      : "focus:ring-orange-500/20";

  if (total === 0) return null;

  return (
    <div className="border-t border-gray-100 px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span>
          Showing{" "}
          <span className="font-semibold text-gray-700">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          of <span className="font-semibold text-gray-700">{total}</span>
        </span>
        <label className="inline-flex items-center gap-1.5">
          <span className="sr-only">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as PageSize)
            }
            className={`text-[10px] font-semibold border border-gray-200 rounded-lg bg-white px-2 py-1 focus:outline-none focus:ring-2 ${ring}`}
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
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <span className="min-w-[4.5rem] text-center text-[11px] font-semibold text-slate-700 tabular-nums">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

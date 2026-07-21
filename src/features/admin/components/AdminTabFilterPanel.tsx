"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { ColdverseDateField } from "@/src/components/coldverse-date-field";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import type { AdminTab } from "@/src/constants/adminRoutes";

export const MONTH_FILTER_OPTIONS = [
  { value: "All", label: "All Months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "Paid", label: "Paid" },
  { value: "Hold", label: "Hold" },
  { value: "Rejected", label: "Rejected" },
  { value: "Pending", label: "Pending Approval" },
];

const PANEL_TITLES: Partial<Record<AdminTab, string>> = {
  dashboard: "Refine Dashboard Metrics",
  invoices: "Filter Invoices",
  remarks: "Filter Remarks & Logs",
};

type VendorOption = { id: string; name: string };

export type AdminFilterState = {
  selectedVendorId: string;
  selectedMonth: string;
  selectedDate: string;
  invoiceCategoryFilter: string;
  invoiceStatusFilter: string;
  invoiceSearch: string;
};

type AdminTabFilterPanelProps = {
  activeTab: AdminTab;
  vendorOptions: VendorOption[];
  allCategories: string[];
  filters: AdminFilterState;
  onVendorChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
};

function hasActiveFilters(tab: AdminTab, filters: AdminFilterState): boolean {
  const shared =
    filters.selectedVendorId !== "All" ||
    filters.selectedMonth !== "All" ||
    filters.selectedDate !== "" ||
    filters.invoiceStatusFilter !== "All";

  if (tab === "dashboard") {
    return shared || filters.invoiceCategoryFilter !== "All";
  }
  if (tab === "invoices") {
    return (
      shared ||
      filters.invoiceCategoryFilter !== "All" ||
      filters.invoiceSearch !== ""
    );
  }
  if (tab === "remarks") {
    return shared || filters.invoiceSearch !== "";
  }
  return false;
}

function gridColsClass(tab: AdminTab): string {
  if (tab === "dashboard") return "xl:grid-cols-5";
  if (tab === "invoices") return "xl:grid-cols-6";
  return "xl:grid-cols-5";
}

export default function AdminTabFilterPanel({
  activeTab,
  vendorOptions,
  allCategories,
  filters,
  onVendorChange,
  onMonthChange,
  onDateChange,
  onCategoryChange,
  onStatusChange,
  onSearchChange,
  onReset,
}: AdminTabFilterPanelProps) {
  if (activeTab === "hubs" || activeTab === "vendors" || activeTab === "archive" || activeTab === "kyc" || activeTab === "settings") {
    return null;
  }

  const title = PANEL_TITLES[activeTab] ?? "Refine Filters";
  const showCategory = activeTab === "dashboard" || activeTab === "invoices";
  const showSearch = activeTab === "invoices" || activeTab === "remarks";

  return (
    <div
      id="global-filters-panel"
      className="bg-white rounded-2xl border-y border-r border-l-4 border-l-orange-500 border-gray-100 p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">{title}</h3>
        </div>

        {hasActiveFilters(activeTab, filters) && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50/50 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 transition-colors cursor-pointer"
          >
            Reset Tab Filters
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${gridColsClass(activeTab)} gap-4`}>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Filter by Vendor
          </label>
          <ColdverseSelect
            value={filters.selectedVendorId}
            onValueChange={onVendorChange}
            variant="filter"
            options={[
              { value: "All", label: "All Vendors" },
              ...vendorOptions.map((v) => ({ value: v.id, label: v.name })),
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Filter by Month
          </label>
          <ColdverseSelect
            value={filters.selectedMonth}
            onValueChange={onMonthChange}
            variant="filter"
            options={MONTH_FILTER_OPTIONS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Filter by Specific Date
          </label>
          <ColdverseDateField
            value={filters.selectedDate}
            onValueChange={onDateChange}
            variant="filter"
            clearable
            placeholder="Select date"
          />
        </div>

        {showCategory && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              Filter by Category
            </label>
            <ColdverseSelect
              value={filters.invoiceCategoryFilter}
              onValueChange={onCategoryChange}
              variant="filter"
              options={[
                { value: "All", label: "All Categories" },
                ...allCategories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Filter by Status
          </label>
          <ColdverseSelect
            value={filters.invoiceStatusFilter}
            onValueChange={onStatusChange}
            variant="filter"
            className="font-medium"
            options={STATUS_FILTER_OPTIONS}
          />
        </div>

        {showSearch && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              Keyword Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder={
                  activeTab === "remarks"
                    ? "Remarks, vendor, invoice no..."
                    : "Invoice no, file, vendor..."
                }
                value={filters.invoiceSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function buildStatsSearchParams(filters: {
  headerHubFilter: string;
  selectedVendorId: string;
  invoiceCategoryFilter: string;
  invoiceStatusFilter: string;
  selectedMonth: string;
  selectedDate: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.headerHubFilter !== "All") {
    params.set("hubId", filters.headerHubFilter);
  }
  if (filters.selectedVendorId !== "All") {
    params.set("vendorId", filters.selectedVendorId);
  }
  if (filters.invoiceCategoryFilter !== "All") {
    params.set("category", filters.invoiceCategoryFilter);
  }
  if (filters.invoiceStatusFilter !== "All") {
    params.set("status", filters.invoiceStatusFilter);
  }
  if (filters.selectedMonth !== "All") {
    params.set("month", filters.selectedMonth);
  }
  if (filters.selectedDate) {
    params.set("date", filters.selectedDate);
  }
  return params;
}

export function resetFiltersForTab(tab: AdminTab): Partial<AdminFilterState> {
  const base: Partial<AdminFilterState> = {
    selectedVendorId: "All",
    selectedMonth: "All",
    selectedDate: "",
    invoiceStatusFilter: "All",
  };

  if (tab === "dashboard") {
    return { ...base, invoiceCategoryFilter: "All" };
  }
  if (tab === "invoices") {
    return {
      ...base,
      invoiceCategoryFilter: "All",
      invoiceSearch: "",
    };
  }
  if (tab === "remarks") {
    return { ...base, invoiceSearch: "" };
  }
  return base;
}

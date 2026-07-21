"use client";

import React, { useState, useEffect, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  AlertCircle,
  FileText,
  Building2,
  X,
  Archive,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import type { Vendor, Invoice, Hub } from "./types";
import BulkUpload from "./components/BulkUpload";
import VendorForm from "./components/VendorForm";
import { SmileLogo } from "./components/Logo";
import { portalShareUrl } from "@/src/constants/portalRoutes";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { UserMenu } from "@/src/components/UserMenu";
import { AdminRefreshControl } from "@/src/components/AdminRefreshControl";
import AdminTabFilterPanel, {
  buildStatsSearchParams,
  resetFiltersForTab,
} from "@/src/features/admin/components/AdminTabFilterPanel";
import ChallanPrintModal from "@/src/features/admin/components/ChallanPrintModal";
import InvoiceAttachmentPrintModal from "@/src/features/admin/components/InvoiceAttachmentPrintModal";
import { useSession } from "@/lib/auth-client";
import {
  ADMIN_NAV,
  hrefForTab,
  tabFromPathname,
  type AdminTab,
} from "@/src/constants/adminRoutes";
import {
  DashboardView,
  HubsView,
  KycView,
  ArchiveView,
  RemarksView,
  VendorsView,
  InvoicesView,
  SettingsView,
} from "@/src/features/admin/views";

const ALL_CATEGORIES = ["Rent", "Manpower", "Vehicle rent", "Repairs & maintenance", "Electricity", "Others"];

const ADMIN_TAB_ICONS: Record<AdminTab, LucideIcon> = {
  dashboard: LayoutDashboard,
  vendors: Users,
  invoices: FileText,
  hubs: MapPin,
  remarks: MessageSquareText,
  kyc: ShieldCheck,
  archive: Archive,
  settings: Settings,
};

export default function App() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Routing State based on URL Search Query Token — seed from URL so portal never flashes admin UI
  const [allCategories, setAllCategories] = useState<string[]>(ALL_CATEGORIES);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryModalError, setCategoryModalError] = useState("");
  const [categoryModalSuccess, setCategoryModalSuccess] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Status & remarks editing state
  const [statusEditInvoice, setStatusEditInvoice] = useState<Invoice | null>(null);
  const [editStatusValue, setEditStatusValue] = useState<'Pending' | 'Paid' | 'Hold' | 'Rejected'>('Pending');
  const [editRemarksValue, setEditRemarksValue] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusSaveError, setStatusSaveError] = useState("");
  
  // Admin bootstrap data (lists self-fetch inside views)
  const [statsData, setStatsData] = useState<any | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [vendorOptions, setVendorOptions] = useState<{ id: string; name: string }[]>([]);
  const [kycPendingCount, setKycPendingCount] = useState(0);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const bumpListRefresh = () => setListRefreshKey((k) => k + 1);

  // UI states — optimistic tab avoids waiting on route transition / remount flashes
  const routeTab = useMemo(
    () => tabFromPathname(pathname) || "dashboard",
    [pathname]
  );
  const [optimisticTab, setOptimisticTab] = useState<AdminTab | null>(null);
  const activeTab = optimisticTab ?? routeTab;
  const [visitedTabs, setVisitedTabs] = useState<Set<AdminTab>>(
    () => new Set<AdminTab>([routeTab])
  );
  const hasLoadedOnceRef = useRef(false);
  const [showSingleVendorModal, setShowSingleVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorViewMode, setVendorViewMode] = useState<"grid" | "table">("grid");
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "vendor" | "invoice"; label: string } | null>(null);
  const [deleteRemarks, setDeleteRemarks] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  
  // Auto-refresh states
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(120);
  
  // Filter / Search states (global panel + InvoicesView)
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceCategoryFilter, setInvoiceCategoryFilter] = useState("All");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All");
  const [selectedVendorId, setSelectedVendorId] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");
  const [headerHubFilter, setHeaderHubFilter] = useState("All");
  
  // Copying notification states
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Printing state
  const [activePrintInvoice, setActivePrintInvoice] = useState<Invoice | null>(null);
  const [activeChallanInvoice, setActiveChallanInvoice] = useState<Invoice | null>(null);

  const handlePrintInvoice = (invoice: Invoice) => {
    setActivePrintInvoice(invoice);
  };

  const handlePrintChallan = (invoice: Invoice) => {
    setActiveChallanInvoice(invoice);
  };

  const renderPrintAndPreview = () => {
    if (!activePrintInvoice && !activeChallanInvoice) return null;

    if (activePrintInvoice) {
      return (
        <InvoiceAttachmentPrintModal
          invoice={activePrintInvoice}
          viewUrl={`/api/invoices/view/${activePrintInvoice.id}`}
          downloadUrl={`/api/invoices/download/${activePrintInvoice.id}`}
          onClose={() => setActivePrintInvoice(null)}
        />
      );
    }

    if (activeChallanInvoice) {
      return (
        <ChallanPrintModal
          invoice={activeChallanInvoice}
          onClose={() => setActiveChallanInvoice(null)}
        />
      );
    }

    return null;
  };
  
  // Loading states
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    fetchAdminData("initial");
  }, []);

  // Refetch dashboard stats when hub or dashboard-applicable filters change
  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    fetchAdminData("silent");
  }, [
    headerHubFilter,
    selectedVendorId,
    invoiceCategoryFilter,
    invoiceStatusFilter,
    selectedMonth,
    selectedDate,
  ]);

  // Clear optimistic tab once the URL has caught up; mark tab as visited (keep-alive)
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
    if (optimisticTab && routeTab === optimisticTab) {
      setOptimisticTab(null);
    }
  }, [activeTab, optimisticTab, routeTab]);

  const navigateToTab = (tab: AdminTab) => {
    setOptimisticTab(tab);
    startTransition(() => {
      router.push(hrefForTab(tab), { scroll: false });
    });
  };

  // Auto-refresh timer for Admin Console
  useEffect(() => {
    if (!isAutoRefreshEnabled) {
      return;
    }

    const interval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchAdminData("silent");
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled]);

  // Lightweight bootstrap — lists paginate themselves inside views
  const fetchAdminData = async (mode: "initial" | "refresh" | "silent" = "refresh") => {
    const isFirstLoad = !hasLoadedOnceRef.current;
    if (isFirstLoad) {
      setAdminLoading(true);
    } else if (mode === "refresh") {
      // Spin the refresh control only — never swap the page for a skeleton.
      setAdminLoading(true);
    }
    setAutoRefreshCountdown(120);
    try {
      const statsParams = buildStatsSearchParams({
        headerHubFilter,
        selectedVendorId,
        invoiceCategoryFilter,
        invoiceStatusFilter,
        selectedMonth,
        selectedDate,
      });
      const statsQuery = statsParams.toString();
      const statsUrl = statsQuery ? `/api/stats?${statsQuery}` : "/api/stats";

      const [sRes, cRes, hRes, voRes, kycRes] = await Promise.all([
        fetch(statsUrl),
        fetch("/api/categories"),
        fetch("/api/hubs?options=1"),
        fetch("/api/vendors?options=1"),
        fetch("/api/vendors?kycStatus=pending_verification&page=1&limit=1"),
      ]);

      if (sRes.ok) {
        setStatsData(await sRes.json());
      }
      if (cRes.ok) {
        setAllCategories(await cRes.json());
      }
      if (hRes.ok) {
        const hData = await hRes.json();
        setHubs(
          (Array.isArray(hData) ? hData : []).map(
            (h: { id: string; name: string; code: string; state: string }) => ({
              id: h.id,
              name: h.name,
              code: h.code,
              state: h.state,
              createdAt: "",
            })
          )
        );
      }
      if (voRes.ok) {
        const voData = await voRes.json();
        setVendorOptions(Array.isArray(voData) ? voData : []);
      }
      if (kycRes.ok) {
        const kycData = await kycRes.json();
        setKycPendingCount(typeof kycData.total === "number" ? kycData.total : 0);
      }
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  // Copy shareable link to clipboard
  const handleCopyLink = (vendorToken: string) => {
    const shareableLink = portalShareUrl(window.location.origin, vendorToken);

    // Copy fallback for iframe constraints
    try {
      navigator.clipboard.writeText(shareableLink);
    } catch (e) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopiedToken(vendorToken);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRestoreItem = async (type: "vendor" | "invoice", id: string) => {
    try {
      const response = await fetch(`/api/archive/restore/${type}/${id}`, {
        method: "POST"
      });
      if (response.ok) {
        bumpListRefresh();
        fetchAdminData("silent");
      } else {
        const errData = await response.json();
        alert(errData.error || "Failed to restore item.");
      }
    } catch (err) {
      console.error("Failed to restore item:", err);
    }
  };

  const openDeleteModal = (id: string, type: "vendor" | "invoice", label: string) => {
    setDeleteTarget({ id, type, label });
    setDeleteRemarks("");
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!deleteRemarks.trim()) {
      setDeleteError("Please enter deletion remarks/reason before proceeding.");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const endpoint = deleteTarget.type === "vendor" 
        ? `/api/vendors/${deleteTarget.id}` 
        : `/api/invoices/${deleteTarget.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: deleteRemarks })
      });

      if (response.ok) {
        setDeleteTarget(null);
        setDeleteRemarks("");
        bumpListRefresh();
        fetchAdminData("silent");
      } else {
        const errData = await response.json();
        setDeleteError(errData.error || "Failed to complete archiving.");
      }
    } catch (err: any) {
      console.error("Error during archive deletion:", err);
      setDeleteError("Network error occurred. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit dynamic category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryModalError("Category name cannot be empty.");
      return;
    }
    setIsSavingCategory(true);
    setCategoryModalError("");
    setCategoryModalSuccess("");
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to add category.");
      }
      const resData = await response.json();
      setAllCategories(resData.categories);
      setCategoryModalSuccess(`Category "${newCategoryName}" added successfully!`);
      setNewCategoryName("");
      bumpListRefresh();
      fetchAdminData("silent");
    } catch (err: any) {
      setCategoryModalError(err.message || "Something went wrong.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Save invoice status and remarks
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusEditInvoice) return;
    setIsSavingStatus(true);
    setStatusSaveError("");
    try {
      const response = await fetch(`/api/invoices/${statusEditInvoice.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatusValue,
          remarks: editRemarksValue.trim(),
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update status.");
      }
      
      // Refresh bootstrap + paginated lists
      bumpListRefresh();
      fetchAdminData("silent");
      setStatusEditInvoice(null);
    } catch (err: any) {
      setStatusSaveError(err.message || "Failed to save status.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Category / currency helpers live in @/src/features/admin/utils

  const headerHubOptions = [
    { value: "All", label: "All Hubs" },
    ...hubs.map((hub) => ({
      value: hub.id,
      label: `${hub.name} (${hub.code})`,
    })),
  ];

  const headerHubSelectedLabel =
    headerHubFilter === "All"
      ? "All Hubs"
      : hubs.find((hub) => hub.id === headerHubFilter)?.name ?? "All Hubs";

  // Dashboard uses API-shaped stats (hub-scoped via fetchAdminData)
  const dynamicStats = statsData;
  const statusKPIs = {
    paidCount: statsData?.statusCounts?.Paid?.count ?? 0,
    paidSum: statsData?.statusCounts?.Paid?.total ?? 0,
    holdCount: statsData?.statusCounts?.Hold?.count ?? 0,
    holdSum: statsData?.statusCounts?.Hold?.total ?? 0,
    rejectedCount: statsData?.statusCounts?.Rejected?.count ?? 0,
    rejectedSum: statsData?.statusCounts?.Rejected?.total ?? 0,
    pendingCount: statsData?.statusCounts?.Pending?.count ?? 0,
    pendingSum: statsData?.statusCounts?.Pending?.total ?? 0,
  };
  const monthlyTrendData = statsData?.monthlyTrend ?? [];

  // ================= ADMIN CONSOLE RENDERING =================
  return (
    <>
      <div id="admin-root" className="min-h-screen bg-gray-50/50 flex flex-col screen-only">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex h-14 sm:h-16 justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SmileLogo showText={false} />
            <div className="h-7 w-px bg-gray-200 hidden md:block shrink-0" aria-hidden />
            <div className="hidden md:block leading-tight min-w-0">
              <h1 className="text-[13px] font-display font-bold text-slate-800 tracking-tight truncate">
                Shree Maruti Integrated Logistics Limited
              </h1>
              <p className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5 truncate">
                Vendor Billing & Invoices Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ColdverseSelect
              value={headerHubFilter}
              onValueChange={setHeaderHubFilter}
              options={headerHubOptions}
              selectedLabel={headerHubSelectedLabel}
              placeholder="All Hubs"
              variant="inline"
              className="min-w-[120px] sm:min-w-[168px]"
            />

            <AdminRefreshControl
              isAutoRefreshEnabled={isAutoRefreshEnabled}
              autoRefreshCountdown={autoRefreshCountdown}
              adminLoading={adminLoading}
              onRefresh={() => {
                bumpListRefresh();
                fetchAdminData();
              }}
              onToggleAutoRefresh={() => {
                setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
                if (!isAutoRefreshEnabled) {
                  setAutoRefreshCountdown(120);
                }
              }}
            />

            {session?.user && (
              <>
                <div className="h-7 w-px bg-gray-200 hidden sm:block shrink-0" aria-hidden />
                <UserMenu
                  name={session.user.name}
                  email={session.user.email}
                  role={session.user.role}
                />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-stretch min-w-0">
              <nav
                aria-label="Console sections"
                className="flex flex-1 items-stretch overflow-x-auto whitespace-nowrap no-scrollbar scrollbar-none px-1.5 sm:px-2"
              >
                {ADMIN_NAV.filter((item) => item.primary).map((item) => {
                  const Icon = ADMIN_TAB_ICONS[item.tab];
                  const isActive = activeTab === item.tab;
                  const pendingKyc = item.tab === "kyc" ? kycPendingCount : 0;

                  return (
                    <Link
                      key={item.tab}
                      href={item.href}
                      scroll={false}
                      prefetch
                      title={item.label}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToTab(item.tab);
                      }}
                      className={`group relative inline-flex items-center gap-2 px-3 sm:px-3.5 py-3.5 text-[13px] font-display font-semibold tracking-tight shrink-0 transition-colors ${
                        isActive
                          ? "text-orange-600"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                          isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                        }`}
                      />
                      <span>{item.shortLabel}</span>
                      {pendingKyc > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                          {pendingKyc}
                        </span>
                      )}
                      <span
                        className={`pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-all ${
                          isActive
                            ? "bg-orange-600 opacity-100"
                            : "bg-transparent opacity-0 group-hover:bg-gray-200 group-hover:opacity-100"
                        }`}
                      />
                    </Link>
                  );
                })}

                <div
                  className="mx-1.5 my-3 w-px shrink-0 bg-gray-200"
                  aria-hidden
                />

                {ADMIN_NAV.filter((item) => !item.primary).map((item) => {
                  const Icon = ADMIN_TAB_ICONS[item.tab];
                  const isActive = activeTab === item.tab;

                  return (
                    <Link
                      key={item.tab}
                      href={item.href}
                      scroll={false}
                      prefetch
                      title={item.label}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToTab(item.tab);
                      }}
                      className={`group relative inline-flex items-center gap-2 px-3 sm:px-3.5 py-3.5 text-[13px] font-display font-semibold tracking-tight shrink-0 transition-colors ${
                        isActive
                          ? "text-orange-600"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                          isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                        }`}
                      />
                      <span className="hidden sm:inline">{item.shortLabel}</span>
                      <span
                        className={`pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-all ${
                          isActive
                            ? "bg-orange-600 opacity-100"
                            : "bg-transparent opacity-0 group-hover:bg-gray-200 group-hover:opacity-100"
                        }`}
                      />
                    </Link>
                  );
                })}
              </nav>

              {headerHubFilter !== "All" && (
                <div className="hidden sm:flex items-center pr-3 pl-1 border-l border-gray-100 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                    <Building2 className="w-3 h-3" />
                    {hubs.find((h) => h.id === headerHubFilter)?.name || "Selected Hub"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {headerHubFilter !== "All" && (
            <span className="sm:hidden inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 self-start">
              <Building2 className="w-3 h-3" />
              {hubs.find((h) => h.id === headerHubFilter)?.name || "Selected Hub"}
            </span>
          )}
        </div>

        {/* Modal Overlays */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 md:py-12">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm w-full max-w-md my-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-gray-950">Add Billing Category</h2>
                  <p className="text-xs text-gray-500 mt-1">Manage global billing options for your invoices.</p>
                </div>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Legal Fees, Consultancy"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full text-sm px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
                  />
                </div>

                {categoryModalError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {categoryModalError}
                  </p>
                )}

                {categoryModalSuccess && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                    {categoryModalSuccess}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-xl text-gray-600"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCategory}
                    className="px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold rounded-xl"
                  >
                    {isSavingCategory ? "Adding..." : "Add Category"}
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Existing Categories</span>
                <div className="flex flex-wrap gap-1.5">
                  {allCategories.map((c) => (
                    <span key={c} className="bg-gray-100 border border-gray-200 rounded-full text-[10px] font-semibold text-gray-600 px-2.5 py-0.5">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {statusEditInvoice && (
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 md:py-12">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm w-full max-w-md my-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-base font-display font-bold text-gray-950">Update Invoice Status</h2>
                  <p className="text-xs text-gray-500 mt-1">Invoice: <strong className="font-semibold text-gray-700">{statusEditInvoice.invoiceNumber}</strong></p>
                </div>
                <button
                  onClick={() => setStatusEditInvoice(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStatus} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Status
                  </label>
                  <ColdverseSelect
                    value={editStatusValue}
                    onValueChange={(val) => setEditStatusValue(val as typeof editStatusValue)}
                    variant="compact"
                    options={[
                      { value: "Pending", label: "Pending" },
                      { value: "Paid", label: "Paid" },
                      { value: "Hold", label: "Hold with Remarks" },
                      { value: "Rejected", label: "Reject with Remarks" },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Remarks / Message
                  </label>
                  <textarea
                    placeholder="Enter details (e.g. reason for hold or rejection)"
                    value={editRemarksValue}
                    onChange={(e) => setEditRemarksValue(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/50"
                  />
                  <p className="text-[10px] text-gray-400">Remarks will be displayed instantly to the vendor on their secure portal page.</p>
                </div>

                {statusSaveError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {statusSaveError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatusEditInvoice(null)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-xl text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStatus}
                    className="px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold rounded-xl"
                  >
                    {isSavingStatus ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 md:py-12">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-150 max-w-md w-full p-6 animate-fade-in space-y-4 my-auto">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Confirm Archival / Deletion</h3>
                  <p className="text-[11px] text-gray-500">You are archiving: <strong className="text-gray-700">{deleteTarget.label}</strong></p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Reason / Deletion Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  placeholder="Enter the reason or remarks for archiving this item (e.g. Contract ended, Incorrect invoice, Duplicate entry)"
                  value={deleteRemarks}
                  onChange={(e) => setDeleteRemarks(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 min-h-[90px] resize-none"
                />
                {deleteError && (
                  <p className="text-[10px] text-red-600 font-semibold">{deleteError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  {isDeleting ? "Archiving..." : "Archive Item"}
                </button>
              </div>
            </div>
          </div>
        )}

        {(showSingleVendorModal || editingVendor) && (
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 md:py-12">
            <div className="w-full max-w-xl my-auto">
              <VendorForm
                vendor={editingVendor || undefined}
                onSuccess={() => {
                  setShowSingleVendorModal(false);
                  setEditingVendor(null);
                  bumpListRefresh();
                  fetchAdminData("silent");
                }}
                onClose={() => {
                  setShowSingleVendorModal(false);
                  setEditingVendor(null);
                }}
              />
            </div>
          </div>
        )}

        {showBulkUploadModal && (
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 md:py-12">
            <div className="w-full max-w-5xl my-auto">
              <BulkUpload
                onSuccess={() => {
                  setShowBulkUploadModal(false);
                  bumpListRefresh();
                  fetchAdminData("silent");
                }}
                onClose={() => setShowBulkUploadModal(false)}
              />
            </div>
          </div>
        )}

        <AdminTabFilterPanel
          activeTab={activeTab}
          vendorOptions={vendorOptions}
          allCategories={allCategories}
          filters={{
            selectedVendorId,
            selectedMonth,
            selectedDate,
            invoiceCategoryFilter,
            invoiceStatusFilter,
            invoiceSearch,
          }}
          onVendorChange={setSelectedVendorId}
          onMonthChange={setSelectedMonth}
          onDateChange={setSelectedDate}
          onCategoryChange={setInvoiceCategoryFilter}
          onStatusChange={setInvoiceStatusFilter}
          onSearchChange={setInvoiceSearch}
          onReset={() => {
            const reset = resetFiltersForTab(activeTab);
            if (reset.selectedVendorId !== undefined) setSelectedVendorId(reset.selectedVendorId);
            if (reset.selectedMonth !== undefined) setSelectedMonth(reset.selectedMonth);
            if (reset.selectedDate !== undefined) setSelectedDate(reset.selectedDate);
            if (reset.invoiceCategoryFilter !== undefined) {
              setInvoiceCategoryFilter(reset.invoiceCategoryFilter);
            }
            if (reset.invoiceStatusFilter !== undefined) {
              setInvoiceStatusFilter(reset.invoiceStatusFilter);
            }
            if (reset.invoiceSearch !== undefined) setInvoiceSearch(reset.invoiceSearch);
          }}
        />

        {/* Dashboard remounts on visit (Chart.js needs a real layout box); other tabs stay mounted. */}
        {activeTab === "dashboard" && (
          <DashboardView
            stats={dynamicStats}
            loading={adminLoading}
            monthlyTrend={monthlyTrendData}
            statusKPIs={statusKPIs}
            onStatusClick={(status) => {
              setInvoiceStatusFilter(status);
              navigateToTab("invoices");
            }}
          />
        )}

        {visitedTabs.has("vendors") && (
          <div hidden={activeTab !== "vendors"} className={activeTab === "vendors" ? undefined : "hidden"}>
            <VendorsView
              headerHubFilter={headerHubFilter}
              hubs={hubs}
              refreshKey={listRefreshKey}
              vendorViewMode={vendorViewMode}
              onVendorViewModeChange={setVendorViewMode}
              copiedToken={copiedToken}
              onCopyLink={handleCopyLink}
              onEditVendor={setEditingVendor}
              onDeleteVendor={(id, name) => openDeleteModal(id, "vendor", name)}
              onOpenCategoryModal={() => {
                setCategoryModalError("");
                setCategoryModalSuccess("");
                setShowCategoryModal(true);
              }}
              onOpenBulkUpload={() => setShowBulkUploadModal(true)}
              onOpenAddVendor={() => setShowSingleVendorModal(true)}
            />
          </div>
        )}

        {visitedTabs.has("kyc") && (
          <div hidden={activeTab !== "kyc"} className={activeTab === "kyc" ? undefined : "hidden"}>
            <KycView
              refreshKey={listRefreshKey}
              onRefresh={() => {
                bumpListRefresh();
                fetchAdminData("silent");
              }}
            />
          </div>
        )}

        {visitedTabs.has("invoices") && (
          <div hidden={activeTab !== "invoices"} className={activeTab === "invoices" ? undefined : "hidden"}>
            <InvoicesView
              headerHubFilter={headerHubFilter}
              invoiceSearch={invoiceSearch}
              invoiceCategoryFilter={invoiceCategoryFilter}
              invoiceStatusFilter={invoiceStatusFilter}
              selectedVendorId={selectedVendorId}
              selectedMonth={selectedMonth}
              selectedDate={selectedDate}
              vendorOptions={vendorOptions}
              hubs={hubs}
              refreshKey={listRefreshKey}
              onEditStatus={(inv) => {
                setStatusEditInvoice(inv);
                setEditStatusValue(inv.status || "Pending");
                setEditRemarksValue(inv.remarks || "");
                setStatusSaveError("");
              }}
              onPrintInvoice={handlePrintInvoice}
              onPrintChallan={handlePrintChallan}
              onDeleteInvoice={(id, label) => openDeleteModal(id, "invoice", label)}
            />
          </div>
        )}

        {visitedTabs.has("remarks") && (
          <div hidden={activeTab !== "remarks"} className={activeTab === "remarks" ? undefined : "hidden"}>
            <RemarksView
              headerHubFilter={headerHubFilter}
              invoiceSearch={invoiceSearch}
              invoiceStatusFilter={invoiceStatusFilter}
              selectedVendorId={selectedVendorId}
              selectedMonth={selectedMonth}
              selectedDate={selectedDate}
              onStatusFilterChange={setInvoiceStatusFilter}
              refreshKey={listRefreshKey}
              onEditStatus={(inv) => {
                setStatusEditInvoice(inv);
                setEditStatusValue(inv.status || "Pending");
                setEditRemarksValue(inv.remarks || "");
                setStatusSaveError("");
              }}
              onPrintInvoice={handlePrintInvoice}
            />
          </div>
        )}

        {visitedTabs.has("hubs") && (
          <div hidden={activeTab !== "hubs"} className={activeTab === "hubs" ? undefined : "hidden"}>
            <HubsView
              onHubsUpdated={() => {
                bumpListRefresh();
                fetchAdminData("silent");
              }}
            />
          </div>
        )}

        {visitedTabs.has("archive") && (
          <div hidden={activeTab !== "archive"} className={activeTab === "archive" ? undefined : "hidden"}>
            <ArchiveView
              refreshKey={listRefreshKey}
              onRestore={handleRestoreItem}
            />
          </div>
        )}

        {visitedTabs.has("settings") && (
          <div hidden={activeTab !== "settings"} className={activeTab === "settings" ? undefined : "hidden"}>
            <SettingsView role={session?.user?.role} />
          </div>
        )}
      </main>
    </div>

    {renderPrintAndPreview()}
  </>
  );
}

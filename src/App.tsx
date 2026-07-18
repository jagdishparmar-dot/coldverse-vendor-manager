"use client";

import React, { useState, useEffect, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Share2,
  Copy,
  Trash2,
  Download,
  Printer,
  Upload,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Inbox,
  Filter,
  Building2,
  Send,
  HelpCircle,
  X,
  SlidersHorizontal,
  Mail,
  Archive,
  RefreshCw,
  Pencil,
  ShieldCheck,
  LayoutGrid,
  List,
} from "lucide-react";
import type { Vendor, Invoice, Hub } from "./types";
import BulkUpload from "./components/BulkUpload";
import VendorForm from "./components/VendorForm";
import { SmileLogo } from "./components/Logo";
import { portalShareUrl } from "@/src/constants/portalRoutes";
import { exportInvoicesToExcel } from "./utils/excelExport";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { ColdverseDateField } from "@/src/components/coldverse-date-field";
import { UserMenu } from "@/src/components/UserMenu";
import { AdminRefreshControl } from "@/src/components/AdminRefreshControl";
import ChallanPrintModal from "@/src/features/admin/components/ChallanPrintModal";
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
} from "@/src/features/admin/views";
import {
  formatCurrency,
  getCategoryBadgeClass,
} from "@/src/features/admin/utils";

const MONTH_FILTER_OPTIONS = [
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

const ALL_CATEGORIES = ["Rent", "Manpower", "Vehicle rent", "Repairs & maintenance", "Electricity", "Others"];

export default function App() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Routing State based on URL Search Query Token â€” seed from URL so portal never flashes admin UI
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
  
  // Admin Data States
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [archivedVendors, setArchivedVendors] = useState<Vendor[]>([]);
  const [archivedInvoices, setArchivedInvoices] = useState<Invoice[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  
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
  
  // Filter / Search states
  const [vendorSearch, setVendorSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
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
        <>
          {/* On-screen Modal Print Preview (Hidden during printing) */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto screen-only">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col my-auto transition-all">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150/80 bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Printer className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-display font-bold text-gray-950 leading-tight">Print Invoice Attachment Only</h2>
                    <p className="text-[11px] text-gray-400 font-medium font-sans">Prints only the original uploaded invoice document proof</p>
                  </div>
                </div>
                <button
                  onClick={() => setActivePrintInvoice(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-slate-100/80 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 bg-slate-100/40 border-b border-gray-100 max-h-[60vh] overflow-y-auto flex flex-col items-center">
                <div className="bg-white p-4 shadow-md border border-slate-200/80 rounded-xl w-full text-center">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Attachment File Document Preview:</p>
                  {activePrintInvoice.fileType && activePrintInvoice.fileType.startsWith("image/") ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden p-2 bg-slate-50 max-h-[400px] flex justify-center items-center">
                      <img
                        src={`/api/invoices/view/${activePrintInvoice.id}`}
                        alt={activePrintInvoice.fileName}
                        className="max-h-[380px] w-auto object-contain rounded animate-fade-in"
                      />
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 rounded-lg p-6 bg-slate-50 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700 mb-1">Non-Image Document Attachment</p>
                      <p className="text-[10px] text-gray-400 font-mono">File: {activePrintInvoice.fileName} ({activePrintInvoice.fileType})</p>
                    </div>
                  )}
                  <p className="text-[10px] text-emerald-600 font-semibold mt-3 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100 inline-block">
                    Note: To comply with printing specifications, only the attachment document itself will be printed.
                  </p>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-slate-50/50 rounded-b-2xl">
                <p className="text-[11px] text-gray-400 font-medium">Please set layout to portrait or landscape to fit your document.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActivePrintInvoice(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Close Preview
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Clean, Raw Print-Only version (Visible ONLY to the printer device) */}
          <div className="print-only bg-white text-black w-full h-full flex flex-col justify-center items-center p-0 m-0">
            {activePrintInvoice.fileType && activePrintInvoice.fileType.startsWith("image/") ? (
              <img
                src={`/api/invoices/view/${activePrintInvoice.id}`}
                alt={activePrintInvoice.fileName}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[98vh] object-contain mx-auto"
              />
            ) : (
              <div className="border-2 border-dashed border-slate-400 rounded-2xl p-12 bg-white text-center text-sm text-slate-800 max-w-xl mx-auto my-auto">
                <h2 className="font-extrabold text-2xl mb-4 text-slate-900">Shree Maruti</h2>
                <h3 className="font-bold text-lg mb-2 text-slate-800">Non-Image Document Attachment</h3>
                <p className="text-xs font-mono text-slate-600 mb-6">File: {activePrintInvoice.fileName} ({activePrintInvoice.fileType || "Unknown format"})</p>
                <p className="text-xs text-slate-500 font-medium">Please download this file from your dashboard for full contents.</p>
              </div>
            )}
          </div>
        </>
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

  // Fetch All Admin Data
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
      const [vRes, iRes, sRes, cRes, aRes, hRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/invoices"),
        fetch("/api/stats"),
        fetch("/api/categories"),
        fetch("/api/archive"),
        fetch("/api/hubs")
      ]);

      if (vRes.ok && iRes.ok && sRes.ok && cRes.ok && aRes.ok && hRes.ok) {
        const vData = await vRes.json();
        const iData = await iRes.json();
        const sData = await sRes.json();
        const cData = await cRes.json();
        const aData = await aRes.json();
        const hData = await hRes.json();
        setVendors(vData);
        setInvoices(iData);
        setStatsData(sData);
        setAllCategories(cData);
        setArchivedVendors(aData.archivedVendors || []);
        setArchivedInvoices(aData.archivedInvoices || []);
        setHubs(hData);
        hasLoadedOnceRef.current = true;
      }
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
        fetchAdminData();
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
        fetchAdminData();
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
      // Refresh admin stats to update lists if needed
      fetchAdminData();
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
      
      // Update local invoices state or refresh admin data
      fetchAdminData();
      setStatusEditInvoice(null);
    } catch (err: any) {
      setStatusSaveError(err.message || "Failed to save status.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Category / currency helpers live in @/src/features/admin/utils

  const matchesHeaderHubInvoice = (inv: Invoice) =>
    headerHubFilter === "All" || inv.hubId === headerHubFilter;

  const matchesHeaderHubVendor = (v: Vendor) => {
    if (headerHubFilter === "All") return true;
    if (v.hubs?.includes(headerHubFilter)) return true;
    return invoices.some(
      (inv) =>
        !inv.archived &&
        inv.vendorId === v.id &&
        inv.hubId === headerHubFilter
    );
  };

  const hubFilteredVendors = vendors.filter(matchesHeaderHubVendor);
  const hubScopedInvoices = invoices.filter(matchesHeaderHubInvoice);

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

  // Filter vendor list
  const filteredVendors = hubFilteredVendors.filter((v) => {
    const query = vendorSearch.toLowerCase();
    return (
      v.name.toLowerCase().includes(query) ||
      v.email.toLowerCase().includes(query) ||
      (v.phone && v.phone.includes(query))
    );
  });

  // Filter invoice logs (except status, to keep status counts updated on status cards)
  const invoicesFilteredExceptStatus = invoices.filter((inv) => {
    const query = invoiceSearch.toLowerCase();
    const matchesSearch =
      inv.vendorName.toLowerCase().includes(query) ||
      inv.invoiceNumber.toLowerCase().includes(query) ||
      inv.fileName.toLowerCase().includes(query);

    const matchesCategory =
      invoiceCategoryFilter === "All" || inv.category === invoiceCategoryFilter;

    const matchesVendor =
      selectedVendorId === "All" || inv.vendorId === selectedVendorId;

    let matchesMonth = true;
    if (selectedMonth !== "All" && inv.date) {
      const parts = inv.date.split("-");
      if (parts.length >= 2) {
        matchesMonth = parts[1] === selectedMonth;
      } else {
        matchesMonth = false;
      }
    }

    let matchesDate = true;
    if (selectedDate && inv.date) {
      matchesDate = inv.date === selectedDate;
    }

    const matchesHub = matchesHeaderHubInvoice(inv);

    return matchesSearch && matchesCategory && matchesVendor && matchesMonth && matchesDate && matchesHub;
  });

  // Apply status filter for final list
  const filteredInvoices = invoicesFilteredExceptStatus.filter((inv) => {
    if (invoiceStatusFilter === "All") return true;
    if (invoiceStatusFilter === "Pending") {
      return inv.status === "Pending" || !inv.status;
    }
    return inv.status === invoiceStatusFilter;
  });

  // Dynamic stats calculation
  const getDynamicStats = () => {
    if (!statsData) return null;
    
    // We compute dynamic statistics based on our current filteredInvoices
    const totalVendorsCount = hubFilteredVendors.length;
    const totalInvoicesCount = filteredInvoices.length;
    const totalAmountSum = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // Categories Breakdown
    const categoriesMap: Record<string, { count: number; total: number }> = {};
    allCategories.forEach(c => {
      categoriesMap[c] = { count: 0, total: 0 };
    });
    filteredInvoices.forEach(inv => {
      if (!categoriesMap[inv.category]) {
        categoriesMap[inv.category] = { count: 0, total: 0 };
      }
      categoriesMap[inv.category].count += 1;
      categoriesMap[inv.category].total += inv.amount;
    });

    const categoriesArray = Object.entries(categoriesMap).map(([name, stats]) => ({
      name,
      count: stats.count,
      total: stats.total
    }));

    // Vendors Breakdown
    const vendorStatsMap: Record<string, { name: string; count: number; total: number }> = {};
    hubFilteredVendors.forEach(v => {
      vendorStatsMap[v.id] = { name: v.name, count: 0, total: 0 };
    });
    filteredInvoices.forEach(inv => {
      if (vendorStatsMap[inv.vendorId]) {
        vendorStatsMap[inv.vendorId].count += 1;
        vendorStatsMap[inv.vendorId].total += inv.amount;
      } else {
        vendorStatsMap[inv.vendorId] = { name: inv.vendorName, count: 1, total: inv.amount };
      }
    });

    const vendorsArray = Object.entries(vendorStatsMap).map(([id, stats]) => ({
      vendorId: id,
      vendorName: stats.name,
      invoiceCount: stats.count,
      totalAmount: stats.total
    }));

    return {
      totalVendors: totalVendorsCount,
      totalInvoices: totalInvoicesCount,
      totalAmount: totalAmountSum,
      categories: categoriesArray,
      vendors: vendorsArray
    };
  };

  const dynamicStats = getDynamicStats();

  // Status KPIs (calculated on invoicesFilteredExceptStatus so selecting one status doesn't reset other cards to 0)
  const paidInvoices = invoicesFilteredExceptStatus.filter(inv => inv.status === 'Paid');
  const holdInvoices = invoicesFilteredExceptStatus.filter(inv => inv.status === 'Hold');
  const rejectedInvoices = invoicesFilteredExceptStatus.filter(inv => inv.status === 'Rejected');
  const pendingInvoices = invoicesFilteredExceptStatus.filter(inv => inv.status === 'Pending' || !inv.status);

  const statusKPIs = {
    paidCount: paidInvoices.length,
    paidSum: paidInvoices.reduce((sum, i) => sum + i.amount, 0),
    holdCount: holdInvoices.length,
    holdSum: holdInvoices.reduce((sum, i) => sum + i.amount, 0),
    rejectedCount: rejectedInvoices.length,
    rejectedSum: rejectedInvoices.reduce((sum, i) => sum + i.amount, 0),
    pendingCount: pendingInvoices.length,
    pendingSum: pendingInvoices.reduce((sum, i) => sum + i.amount, 0),
  };

  // Monthly Trend Data
  const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const getMonthlyTrendData = () => {
    const trendInvoices = invoices.filter(inv => {
      const matchesCategory = invoiceCategoryFilter === "All" || inv.category === invoiceCategoryFilter;
      const matchesVendor = selectedVendorId === "All" || inv.vendorId === selectedVendorId;
      const matchesHub = matchesHeaderHubInvoice(inv);
      return matchesCategory && matchesVendor && matchesHub;
    });

    const monthsMap: Record<string, { monthKey: string; label: string; count: number; total: number; sortKey: string }> = {};

    // Seed 2026 months
    const year2026Months = [
      { key: "01", label: "Jan" },
      { key: "02", label: "Feb" },
      { key: "03", label: "Mar" },
      { key: "04", label: "Apr" },
      { key: "05", label: "May" },
      { key: "06", label: "Jun" },
      { key: "07", label: "Jul" },
      { key: "08", label: "Aug" },
      { key: "09", label: "Sep" },
      { key: "10", label: "Oct" },
      { key: "11", label: "Nov" },
      { key: "12", label: "Dec" },
    ];

    year2026Months.forEach(m => {
      const monthLabel = `${m.label} 2026`;
      monthsMap[monthLabel] = {
        monthKey: m.key,
        label: monthLabel,
        count: 0,
        total: 0,
        sortKey: `2026-${m.key}`
      };
    });

    trendInvoices.forEach(inv => {
      if (!inv.date) return;
      const parts = inv.date.split("-");
      if (parts.length >= 2) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          const label = `${monthsNames[monthIdx]} ${year}`;
          if (!monthsMap[label]) {
            monthsMap[label] = {
              monthKey: parts[1],
              label,
              count: 0,
              total: 0,
              sortKey: `${year}-${parts[1]}`
            };
          }
          monthsMap[label].count += 1;
          monthsMap[label].total += inv.amount;
        }
      }
    });

    return Object.values(monthsMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  };

  const monthlyTrendData = getMonthlyTrendData();

  // ================= ADMIN CONSOLE RENDERING =================
  return (
    <>
      <div id="admin-root" className="min-h-screen bg-gray-50/50 flex flex-col screen-only">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex h-16 justify-between items-center">
          <div className="flex items-center gap-4">
            <SmileLogo showText={false} />
            <div className="h-8 w-[1.5px] bg-slate-200 hidden md:block"></div>
            <div className="hidden md:block leading-none">
              <h1 className="text-xs font-black text-slate-800 uppercase tracking-wider font-sans">
                Shree Maruti Integrated Logistics Limited
              </h1>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                Vendor Billing & Invoices Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Hub filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
              <ColdverseSelect
                value={headerHubFilter}
                onValueChange={setHeaderHubFilter}
                options={headerHubOptions}
                selectedLabel={headerHubSelectedLabel}
                placeholder="All Hubs"
                variant="inline"
                className="min-w-[130px] sm:min-w-[180px]"
              />
            </div>

            <AdminRefreshControl
              isAutoRefreshEnabled={isAutoRefreshEnabled}
              autoRefreshCountdown={autoRefreshCountdown}
              adminLoading={adminLoading}
              onRefresh={fetchAdminData}
              onToggleAutoRefresh={() => {
                setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
                if (!isAutoRefreshEnabled) {
                  setAutoRefreshCountdown(120);
                }
              }}
            />

            {session?.user && (
              <div className="pl-2 border-l border-gray-200">
                <UserMenu
                  name={session.user.name}
                  email={session.user.email}
                  role={session.user.role}
                />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation Tabs and Quick Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto whitespace-nowrap flex-nowrap max-w-full gap-1 no-scrollbar scrollbar-none">
            {ADMIN_NAV.filter((item) => item.primary).map((item) => (
              <Link
                key={item.tab}
                href={item.href}
                scroll={false}
                prefetch
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTab(item.tab);
                }}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-colors shrink-0 relative ${
                  activeTab === item.tab
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                }`}
              >
                {item.label}
                {item.tab === "kyc" &&
                  vendors.filter((v) => v.kycStatus === "pending_verification").length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                      {vendors.filter((v) => v.kycStatus === "pending_verification").length}
                    </span>
                  )}
              </Link>
            ))}
            <Link
              href="/archive"
              scroll={false}
              prefetch
              onClick={(e) => {
                e.preventDefault();
                navigateToTab("archive");
              }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-colors shrink-0 ${
                activeTab === "archive"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
              title="System Archive"
            >
              <span className="inline-flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                Archive
              </span>
            </Link>
          </div>
          {headerHubFilter !== "All" && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 shrink-0">
              <Building2 className="w-3 h-3" />
              {hubs.find((h) => h.id === headerHubFilter)?.name || "Selected Hub"}
            </span>
          )}
          </div>
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
                onSuccess={(newV) => {
                  setShowSingleVendorModal(false);
                  setEditingVendor(null);
                  fetchAdminData();
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
                onSuccess={(added) => {
                  setShowBulkUploadModal(false);
                  fetchAdminData();
                }}
                onClose={() => setShowBulkUploadModal(false)}
              />
            </div>
          </div>
        )}

        {/* Global Filters Panel */}
        {activeTab !== "vendors" && activeTab !== "archive" && activeTab !== "kyc" && (
          <div id="global-filters-panel" className="bg-white rounded-2xl border-y border-r border-l-4 border-l-orange-500 border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Refine Platform Metrics & Logs</h3>
              </div>
              
              {/* Clear Filters Button */}
              {(selectedVendorId !== "All" || selectedMonth !== "All" || selectedDate !== "" || invoiceCategoryFilter !== "All" || invoiceStatusFilter !== "All" || invoiceSearch !== "") && (
                <button
                  onClick={() => {
                    setSelectedVendorId("All");
                    setSelectedMonth("All");
                    setSelectedDate("");
                    setInvoiceCategoryFilter("All");
                    setInvoiceStatusFilter("All");
                    setInvoiceSearch("");
                  }}
                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50/50 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Vendor Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Filter by Vendor</label>
                <ColdverseSelect
                  value={selectedVendorId}
                  onValueChange={setSelectedVendorId}
                  variant="filter"
                  options={[
                    { value: "All", label: "All Vendors" },
                    ...vendors.map((v) => ({ value: v.id, label: v.name })),
                  ]}
                />
              </div>

              {/* Month Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Filter by Month</label>
                <ColdverseSelect
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                  variant="filter"
                  options={MONTH_FILTER_OPTIONS}
                />
              </div>

              {/* Specific Date Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Filter by Specific Date</label>
                <div className="relative">
                  <ColdverseDateField
                    value={selectedDate}
                    onValueChange={setSelectedDate}
                    variant="filter"
                    clearable
                    placeholder="Select date"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Filter by Category</label>
                <ColdverseSelect
                  value={invoiceCategoryFilter}
                  onValueChange={setInvoiceCategoryFilter}
                  variant="filter"
                  options={[
                    { value: "All", label: "All Categories" },
                    ...allCategories.map((cat) => ({ value: cat, label: cat })),
                  ]}
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Filter by Status</label>
                <ColdverseSelect
                  value={invoiceStatusFilter}
                  onValueChange={setInvoiceStatusFilter}
                  variant="filter"
                  className="font-medium"
                  options={[
                    { value: "All", label: "All Statuses" },
                    { value: "Paid", label: "Paid" },
                    { value: "Hold", label: "Hold" },
                    { value: "Rejected", label: "Rejected" },
                    { value: "Pending", label: "Pending Approval" },
                  ]}
                />
              </div>

              {/* Search filter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Keyword Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Invoice no, file..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

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
              hubFilteredVendors={hubFilteredVendors}
              filteredVendors={filteredVendors}
              hubs={hubs}
              headerHubFilter={headerHubFilter}
              vendorSearch={vendorSearch}
              onVendorSearchChange={setVendorSearch}
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
            <KycView vendors={vendors} onRefresh={() => fetchAdminData("silent")} />
          </div>
        )}

        {visitedTabs.has("invoices") && (
          <div hidden={activeTab !== "invoices"} className={activeTab === "invoices" ? undefined : "hidden"}>
            <InvoicesView
              filteredInvoices={filteredInvoices}
              hubScopedInvoices={hubScopedInvoices}
              vendors={vendors}
              hubs={hubs}
              allCategories={allCategories}
              invoiceSearch={invoiceSearch}
              onInvoiceSearchChange={setInvoiceSearch}
              invoiceCategoryFilter={invoiceCategoryFilter}
              onInvoiceCategoryFilterChange={setInvoiceCategoryFilter}
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
              invoices={invoices}
              invoiceSearch={invoiceSearch}
              onInvoiceSearchChange={setInvoiceSearch}
              matchesHeaderHubInvoice={matchesHeaderHubInvoice}
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
            <HubsView vendors={vendors} onHubsUpdated={() => fetchAdminData("silent")} />
          </div>
        )}

        {visitedTabs.has("archive") && (
          <div hidden={activeTab !== "archive"} className={activeTab === "archive" ? undefined : "hidden"}>
            <ArchiveView
              archivedVendors={archivedVendors}
              archivedInvoices={archivedInvoices}
              archiveSearch={archiveSearch}
              onArchiveSearchChange={setArchiveSearch}
              onRestore={handleRestoreItem}
            />
          </div>
        )}
      </main>
    </div>

    {renderPrintAndPreview()}
  </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  FileCheck,
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
import { Vendor, Invoice, Hub, CompanyProfile } from "./types";
import BulkUpload from "./components/BulkUpload";
import VendorForm from "./components/VendorForm";
import DashboardStats from "./components/DashboardStats";
import HubsManagement from "./components/HubsManagement";
import PortalKycGate from "./components/PortalKycGate";
import PortalInvoiceGenerator from "./components/PortalInvoiceGenerator";
import AdminKycTab from "./components/AdminKycTab";
import { SmileLogo } from "./components/Logo";
import { exportInvoicesToExcel, exportVendorsToExcel } from "./utils/excelExport";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { ColdverseDateField } from "@/src/components/coldverse-date-field";
import { UserMenu } from "@/src/components/UserMenu";
import { AdminRefreshControl } from "@/src/components/AdminRefreshControl";
import { useSession } from "@/lib/auth-client";

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

type AppProps = {
  /** When present, App stays in vendor-portal mode only (never renders admin UI). */
  initialVendorToken?: string | null;
};

export default function App({ initialVendorToken = null }: AppProps) {
  const { data: session } = useSession();

  // Routing State based on URL Search Query Token — seed from URL so portal never flashes admin UI
  const [vendorToken, setVendorToken] = useState<string | null>(initialVendorToken);
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
  
  // UI states
  const [activeTab, setActiveTab] = useState<"dashboard" | "vendors" | "invoices" | "hubs" | "archive" | "remarks" | "kyc">("dashboard");
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

  // Convert number to Indian Rupees words
  const numberToWordsINR = (num: number): string => {
    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (num === 0) return "Zero";

    const formatHundreds = (n: number) => {
      let str = "";
      if (n >= 100) {
        str += a[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n > 0) {
        if (str !== "") str += "and ";
        if (n < 20) {
          str += a[n];
        } else {
          str += b[Math.floor(n / 10)];
          if (n % 10 > 0) str += "-" + a[n % 10];
        }
      }
      return str.trim();
    };

    let result = "";
    let crore = Math.floor(num / 10000000);
    num %= 10000000;
    let lakh = Math.floor(num / 100000);
    num %= 100000;
    let thousand = Math.floor(num / 1000);
    num %= 1000;

    if (crore > 0) {
      result += formatHundreds(crore) + " Crore ";
    }
    if (lakh > 0) {
      result += formatHundreds(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      result += formatHundreds(thousand) + " Thousand ";
    }
    if (num > 0) {
      result += formatHundreds(num);
    }

    return result.trim() + " Rupees Only";
  };

  // Generate deterministic Challan Number
  const getChallanNumber = (invoice: Invoice) => {
    const year = invoice.date ? invoice.date.split("-")[0] : "2026";
    const rawId = invoice.id.replace("inv-", "");
    const formattedId = rawId.length > 5 ? rawId.slice(-5) : rawId.padStart(5, "0");
    return `CH-${year}-${formattedId.toUpperCase()}`;
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
      const challanNumber = getChallanNumber(activeChallanInvoice);
      const amountInWords = numberToWordsINR(activeChallanInvoice.amount);

      return (
        <>
          {/* On-screen Modal Preview for Challan */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto screen-only">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full flex flex-col my-auto transition-all animate-fade-in">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150/80 bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-display font-bold text-gray-950 leading-tight">Payment Challan Copy</h2>
                    <p className="text-[11px] text-gray-400 font-medium">Official deposit challan for vendor payment processing</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveChallanInvoice(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-slate-100/80 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: A4 Paper Challan Copy Simulation */}
              <div className="p-6 bg-slate-100/40 border-b border-gray-100 max-h-[65vh] overflow-y-auto flex flex-col items-center">
                <div className="bg-white p-6 sm:p-8 shadow-lg border border-slate-200 rounded-xl w-full max-w-[680px] text-black text-left font-sans">
                  
                  {/* Top Header of Challan */}
                  <div className="border-b-2 border-gray-900 pb-4 mb-4 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <SmileLogo className="h-8 w-auto" showText={false} />
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                        Shree Maruti Integrated Logistics Limited
                      </p>
                      <p className="text-[8px] text-gray-400">
                        Corporate Off: Navrangpura, Ahmedabad, Gujarat - 380009
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 inline-block mb-1">
                        Official Payment Challan
                      </span>
                      <h1 className="text-base font-bold text-gray-900 font-display">CHALLAN COPY</h1>
                      <p className="text-[10px] text-red-600 font-bold font-mono mt-0.5">Challan No: {challanNumber}</p>
                      <p className="text-[8px] text-gray-400">Gen Date: {new Date(activeChallanInvoice.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Warning / Instruction Info */}
                  <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2.5 mb-4 text-[9px] text-amber-800 leading-normal">
                    <strong>Payment Process Directive:</strong> Please process the payment for the gross payable sum. Always quote the auto-generated <strong>Challan Number ({challanNumber})</strong> in your transaction narration/reference field to facilitate automated accounts reconciliation.
                  </div>

                  {/* Two Column details */}
                  <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px]">
                    <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] mb-1">Vendor (Beneficiary)</p>
                      <p className="font-bold text-slate-800 text-[11px]">{activeChallanInvoice.vendorName}</p>
                      <p className="text-slate-500">ID: {activeChallanInvoice.vendorId}</p>
                      <p className="text-slate-500">Service Category: <span className="font-semibold uppercase text-slate-700">{activeChallanInvoice.category}</span></p>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                      <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] mb-1">Invoice Reference</p>
                      <p className="font-bold text-slate-800">Invoice No: {activeChallanInvoice.invoiceNumber}</p>
                      <p className="text-slate-500">Invoice Date: {activeChallanInvoice.date}</p>
                      <p className="text-slate-500">Gross Amount: <span className="font-mono font-bold text-slate-800">{formatCurrency(activeChallanInvoice.amount)}</span></p>
                    </div>
                  </div>

                  {/* Financial Settlement Table */}
                  <div className="mb-4">
                    <table className="min-w-full divide-y divide-slate-200 border border-slate-150 rounded-lg overflow-hidden text-[10px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-bold text-slate-500 uppercase tracking-wider">Transaction Head</th>
                          <th className="px-3 py-1.5 text-right font-bold text-slate-500 uppercase tracking-wider">Amount (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white">
                        <tr>
                          <td className="px-3 py-2 text-slate-800 font-medium">
                            Settlement of invoice {activeChallanInvoice.invoiceNumber} for {activeChallanInvoice.category} category.
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-950">
                            {formatCurrency(activeChallanInvoice.amount)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-3 py-1.5 text-right text-slate-600 uppercase text-[9px]">
                            Gross Payable Sum:
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-950">
                            {formatCurrency(activeChallanInvoice.amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Amount in Words */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mb-5 text-[10px]">
                    <span className="text-slate-400 font-bold uppercase text-[8px] block mb-0.5">Amount in Words</span>
                    <span className="font-bold text-slate-800 italic">{amountInWords}</span>
                  </div>

                  {/* Footer Stamps & Barcodes */}
                  <div className="flex justify-between items-end border-t border-slate-200 pt-4 text-[9px]">
                    <div>
                      {/* Simulated Barcode */}
                      <div className="flex flex-col items-start gap-1">
                        <div className="h-6 w-32 bg-slate-900 flex items-end justify-between px-1 py-0.5">
                          <div className="w-[1px] h-full bg-white"></div>
                          <div className="w-[2px] h-full bg-white"></div>
                          <div className="w-[1px] h-full bg-white"></div>
                          <div className="w-[3px] h-full bg-white"></div>
                          <div className="w-[1px] h-full bg-white"></div>
                          <div className="w-[2px] h-full bg-white"></div>
                          <div className="w-[4px] h-full bg-white"></div>
                          <div className="w-[1px] h-full bg-white"></div>
                          <div className="w-[2px] h-full bg-white"></div>
                          <div className="w-[3px] h-full bg-white"></div>
                        </div>
                        <span className="font-mono text-[8px] text-slate-400 tracking-widest">{challanNumber}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-12 flex flex-col justify-end">
                        <div className="border-t border-dashed border-slate-300 pt-1 inline-block w-40">
                          <p className="font-bold text-slate-600">Authorized Officer Stamp</p>
                          <p className="text-[8px] text-slate-400">Shree Maruti Accounts Desk</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-slate-50/50 rounded-b-2xl">
                <p className="text-[11px] text-gray-400 font-medium">Please submit this physical challan copy at the cash counter or include it in electronic remittance.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveChallanInvoice(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Close Preview
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print Challan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Clean, Raw Print-Only version (Visible ONLY to the printer device) */}
          <div className="print-only p-8 bg-white text-black font-sans max-w-[800px] mx-auto text-left leading-normal">
            {/* Top Header of Challan */}
            <div className="border-b-2 border-gray-950 pb-4 mb-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SmileLogo className="h-10 w-auto" showText={false} />
                </div>
                <p className="text-[10px] text-gray-600 font-bold tracking-wider uppercase leading-none mt-1">
                  Shree Maruti Integrated Logistics Limited
                </p>
                <p className="text-[9px] text-gray-500 mt-1">
                  Corporate Head Office: Navrangpura, Ahmedabad, Gujarat - 380009
                </p>
              </div>
              <div className="text-right">
                <h1 className="text-lg font-bold text-gray-900 leading-none">OFFICIAL PAYMENT CHALLAN</h1>
                <p className="text-xs text-red-600 font-bold font-mono mt-1">Challan No: {challanNumber}</p>
                <p className="text-[9px] text-gray-400">Date Generated: {new Date(activeChallanInvoice.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Directive */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs text-slate-800">
              <strong>Remittance Instructions:</strong> Process the exact gross settlement amount specified below. Please quote the auto-generated <strong>Challan Number ({challanNumber})</strong> in your transaction details/remarks.
            </div>

            {/* Two Column details */}
            <div className="grid grid-cols-2 gap-6 mb-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Vendor Beneficiary</p>
                <p className="font-bold text-slate-800 text-[12px]">{activeChallanInvoice.vendorName}</p>
                <p className="text-slate-600 font-medium">Vendor ID: {activeChallanInvoice.vendorId}</p>
                <p className="text-slate-600 font-medium">Service Category: <span className="font-bold uppercase text-slate-700">{activeChallanInvoice.category}</span></p>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Invoice Reference</p>
                <p className="font-bold text-slate-800">Invoice No: {activeChallanInvoice.invoiceNumber}</p>
                <p className="text-slate-600 font-medium">Invoice Date: {activeChallanInvoice.date}</p>
                <p className="text-slate-600 font-medium">Gross Payable: <span className="font-mono font-bold text-slate-800">{formatCurrency(activeChallanInvoice.amount)}</span></p>
              </div>
            </div>

            {/* Financial Settlement Table */}
            <div className="mb-4">
              <table className="min-w-full divide-y divide-slate-300 border border-slate-300 rounded-lg overflow-hidden text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold text-slate-600 uppercase tracking-wider">Transaction Head</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-600 uppercase tracking-wider">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td className="px-4 py-3 text-slate-800 font-semibold">
                      Settlement of vendor invoice {activeChallanInvoice.invoiceNumber} under category "{activeChallanInvoice.category}".
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-950 text-sm">
                      {formatCurrency(activeChallanInvoice.amount)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-sm">
                    <td className="px-4 py-2.5 text-right text-slate-600 uppercase text-[10px]">
                      Net Deposit Amount:
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-950 text-base">
                      {formatCurrency(activeChallanInvoice.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in Words */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Amount in Words</span>
              <span className="font-extrabold text-slate-800 italic">{amountInWords}</span>
            </div>

            {/* Footer Stamps & Barcodes */}
            <div className="flex justify-between items-end border-t border-slate-300 pt-6 text-xs mt-10">
              <div>
                {/* Simulated Barcode */}
                <div className="flex flex-col items-start gap-1">
                  <div className="h-8 w-44 bg-slate-900 flex items-end justify-between px-1 py-0.5">
                    <div className="w-[1px] h-full bg-white"></div>
                    <div className="w-[2px] h-full bg-white"></div>
                    <div className="w-[1px] h-full bg-white"></div>
                    <div className="w-[3px] h-full bg-white"></div>
                    <div className="w-[1px] h-full bg-white"></div>
                    <div className="w-[2px] h-full bg-white"></div>
                    <div className="w-[4px] h-full bg-white"></div>
                    <div className="w-[1px] h-full bg-white"></div>
                    <div className="w-[2px] h-full bg-white"></div>
                    <div className="w-[3px] h-full bg-white"></div>
                    <div className="w-[1px] h-full bg-white"></div>
                    <div className="w-[4px] h-full bg-white"></div>
                    <div className="w-[2px] h-full bg-white"></div>
                    <div className="w-[1px] h-full bg-white"></div>
                  </div>
                  <span className="font-mono text-[9px] text-slate-500 tracking-widest">{challanNumber}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="h-16 flex flex-col justify-end">
                  <div className="border-t border-dashed border-slate-400 pt-1.5 inline-block w-48">
                    <p className="font-bold text-slate-700">Authorized Treasury Officer</p>
                    <p className="text-[10px] text-slate-400">Shree Maruti Integrated Logistics Limited</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    return null;
  };
  
  // Loading states
  const [adminLoading, setAdminLoading] = useState(true);
  // Portal Mode Detection
  const [portalLoading, setPortalLoading] = useState(() => Boolean(initialVendorToken));
  
  // Portal States (for logged-in vendor)
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [portalInvoices, setPortalInvoices] = useState<any[]>([]);
  const [portalError, setPortalError] = useState("");
  const [portalHubs, setPortalHubs] = useState<Hub[]>([]);
  const [portalCompany, setPortalCompany] = useState<CompanyProfile | null>(null);

  // OTP Verification States
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [portalCheckedVendor, setPortalCheckedVendor] = useState<{ name: string; phone: string; maskedPhone: string } | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Portal Edit Invoice states
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editInvoiceNo, setEditInvoiceNo] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editState, setEditState] = useState("");
  const [editHubId, setEditHubId] = useState("");
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editBase64File, setEditBase64File] = useState<string | null>(null);
  const [isUpdatingInvoice, setIsUpdatingInvoice] = useState(false);
  const [editError, setEditError] = useState("");
  
  // Vendor Form Fields
  const [pCategory, setPCategory] = useState("");
  const [pInvoiceNo, setPInvoiceNo] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pDate, setPDate] = useState("");
  const [pState, setPState] = useState("");
  const [pHubId, setPHubId] = useState("");
  const [pRemarks, setPRemarks] = useState("");
  const [pSelectedFile, setPSelectedFile] = useState<File | null>(null);
  const [pBase64File, setPBase64File] = useState<string | null>(null);
  const [pSuccessMsg, setPSuccessMsg] = useState<string | null>(null);
  const [pUploadError, setPUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [portalSubMode, setPortalSubMode] = useState<"upload" | "generate">("upload");
  const [pHardCopySubmittedTo, setPHardCopySubmittedTo] = useState("");
  const [pHardCopySubmissionDate, setPHardCopySubmissionDate] = useState("");

  // Parse Token on Mount — portal links must never load admin data or UI
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || initialVendorToken;

    if (token) {
      setVendorToken(token);
      setPortalLoading(true);
      fetchPortalData(token);
      return;
    }

    setVendorToken(null);
    fetchAdminData();
  }, [initialVendorToken]);

  // Auto-refresh timer for Admin Console
  useEffect(() => {
    // Only auto-refresh in admin mode (no vendorToken) and if auto-refresh is enabled
    if (vendorToken || !isAutoRefreshEnabled) {
      return;
    }

    const interval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchAdminData();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [vendorToken, isAutoRefreshEnabled]);

  // Fetch Vendor Portal Specific Data
  const fetchPortalData = async (token: string) => {
    setPortalLoading(true);
    setPortalError("");
    try {
      const response = await fetch(`/api/vendors/token/${encodeURIComponent(token)}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // OTP verification required
          const checkRes = await fetch(`/api/vendors/portal-check/${encodeURIComponent(token)}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            setPortalCheckedVendor({
              name: checkData.name,
              phone: checkData.phone,
              maskedPhone: checkData.maskedPhone
            });
            setIsOtpVerified(false);
            setPortalLoading(false);
            return;
          }
        }
        throw new Error("Invalid or inactive vendor portal link.");
      }
      
      const data = await response.json();
      setCurrentVendor(data.vendor);
      setPortalInvoices(data.invoices);
      setPortalHubs(data.hubs || []);
      setPortalCompany(data.company || null);
      setIsOtpVerified(true);
      
      if (data.categories) {
        setAllCategories(data.categories);
      }
      
      // Default form category to vendor's first allowed category, or fallback to Rent
      if (data.vendor.categories && data.vendor.categories.length > 0) {
        setPCategory(data.vendor.categories[0]);
      } else {
        setPCategory("Rent");
      }
    } catch (err: any) {
      setPortalError(err.message || "Failed to load vendor profile.");
    } finally {
      setPortalLoading(false);
    }
  };

  // Request OTP for Vendor Portal Access
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorToken || !otpPhone.trim()) return;
    setIsRequestingOtp(true);
    setOtpError("");
    try {
      const response = await fetch("/api/vendors/portal-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: vendorToken, phone: otpPhone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP.");
      }

      setOtpRequested(true);
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Verify OTP for Vendor Portal Access
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorToken || !otpPhone.trim() || !otpCode.trim()) return;
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const response = await fetch("/api/vendors/portal-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: vendorToken, phone: otpPhone, otp: otpCode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid OTP code.");
      }

      // Successful login
      setCurrentVendor(data.vendor);
      setPortalInvoices(data.invoices);
      setPortalHubs(data.hubs || []);
      setPortalCompany(data.company || null);
      if (data.categories) {
        setAllCategories(data.categories);
      }
      
      // Default form category
      if (data.vendor.categories && data.vendor.categories.length > 0) {
        setPCategory(data.vendor.categories[0]);
      } else {
        setPCategory("Rent");
      }

      setIsOtpVerified(true);
    } catch (err: any) {
      setOtpError(err.message || "OTP verification failed.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Fetch All Admin Data
  const fetchAdminData = async () => {
    setAdminLoading(true);
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
      }
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  // Copy shareable link to clipboard
  const handleCopyLink = (token: string) => {
    // Construct absolute shareable URL
    const appUrl = window.location.origin + window.location.pathname;
    const shareableLink = `${appUrl}?token=${token}`;
    
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

    setCopiedToken(token);
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

  // Vendor Side File Reader
  const handleVendorFile = (file: File) => {
    setPUploadError("");
    if (file.size > 10 * 1024 * 1024) {
      setPUploadError("File size exceeds 10MB limit.");
      return;
    }
    
    setPSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPBase64File(base64);
    };
    reader.onerror = () => {
      setPUploadError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVendorFile(e.dataTransfer.files[0]);
    }
  };

  // Vendor Invoice Upload
  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendor) return;

    if (!pCategory || !pInvoiceNo.trim() || !pAmount.trim() || !pDate || !pBase64File) {
      setPUploadError("Please fill out all invoice fields and select a file.");
      return;
    }

    const vendorStates = currentVendor.states && currentVendor.states.length > 0 
      ? currentVendor.states 
      : (currentVendor.state ? currentVendor.state.split(",").map(s => s.trim()).filter(s => s.length > 0) : []);
    
    const allStatesFromHubs = Array.from(new Set(portalHubs.map(h => h.state))).filter(Boolean);
    const availableStates = vendorStates.length > 0 ? vendorStates : allStatesFromHubs;

    if (availableStates.length > 0 && !pState) {
      setPUploadError("Please select the operating State for this invoice.");
      return;
    }

    const assignedHubs = portalHubs.filter(h => currentVendor.hubs?.includes(h.id));
    const hubsForSelection = currentVendor.hubs && currentVendor.hubs.length > 0 ? assignedHubs : portalHubs;
    const filteredHubs = pState ? hubsForSelection.filter(h => h.state === pState) : hubsForSelection;
    if (filteredHubs.length > 0 && !pHubId) {
      setPUploadError("Please select the regional Logistics Hub for this invoice.");
      return;
    }

    const amt = parseFloat(pAmount);
    if (isNaN(amt) || amt <= 0) {
      setPUploadError("Please provide a valid billing amount.");
      return;
    }

    setIsUploading(true);
    setPUploadError("");
    setPSuccessMsg(null);

    try {
      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: currentVendor.id,
          token: vendorToken,
          category: pCategory,
          invoiceNumber: pInvoiceNo.trim(),
          amount: amt,
          date: pDate,
          fileName: pSelectedFile?.name || "invoice.pdf",
          fileType: pSelectedFile?.type || "application/pdf",
          fileData: pBase64File,
          state: pState,
          hubId: pHubId,
          hubName: portalHubs.find(h => h.id === pHubId)?.name || "",
          remarks: pRemarks.trim(),
          hardCopySubmittedTo: pHardCopySubmittedTo.trim(),
          hardCopySubmissionDate: pHardCopySubmissionDate,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to submit invoice to admin portal.");
      }

      setPSuccessMsg("Invoice uploaded successfully! Thank you.");
      
      // Reset Form fields
      setPInvoiceNo("");
      setPAmount("");
      setPDate("");
      setPState("");
      setPHubId("");
      setPRemarks("");
      setPHardCopySubmittedTo("");
      setPHardCopySubmissionDate("");
      setPSelectedFile(null);
      setPBase64File(null);
      
      // Reload History for Vendor
      if (vendorToken) {
        fetchPortalData(vendorToken);
      }
    } catch (err: any) {
      setPUploadError(err.message || "Failed to complete upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const startEditingInvoice = (inv: any) => {
    setEditingInvoice(inv);
    setEditCategory(inv.category);
    setEditInvoiceNo(inv.invoiceNumber);
    setEditAmount(String(inv.amount));
    setEditDate(inv.date);
    setEditState(inv.state || "");
    setEditHubId(inv.hubId || "");
    setEditSelectedFile(null);
    setEditBase64File(null);
    setEditError("");
  };

  const handleEditFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setEditError("File size exceeds 10MB limit.");
      return;
    }
    setEditSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setEditBase64File(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice || !currentVendor) return;

    if (!editCategory || !editInvoiceNo.trim() || !editAmount.trim() || !editDate) {
      setEditError("Please fill out all invoice fields.");
      return;
    }

    const vendorStates = currentVendor.states && currentVendor.states.length > 0 
      ? currentVendor.states 
      : (currentVendor.state ? currentVendor.state.split(",").map(s => s.trim()).filter(s => s.length > 0) : []);
    
    if (vendorStates.length > 0 && !editState) {
      setEditError("Please select the operating State for this invoice.");
      return;
    }

    const assignedHubs = portalHubs.filter(h => currentVendor.hubs?.includes(h.id));
    const filteredHubs = editState ? assignedHubs.filter(h => h.state === editState) : assignedHubs;
    if (filteredHubs.length > 0 && !editHubId) {
      setEditError("Please select the regional Logistics Hub for this invoice.");
      return;
    }

    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setEditError("Please provide a valid billing amount.");
      return;
    }

    setIsUpdatingInvoice(true);
    setEditError("");

    try {
      const response = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editCategory,
          invoiceNumber: editInvoiceNo.trim(),
          amount: amt,
          date: editDate,
          state: editState,
          hubId: editHubId,
          hubName: portalHubs.find(h => h.id === editHubId)?.name || "",
          fileName: editSelectedFile?.name || undefined,
          fileType: editSelectedFile?.type || undefined,
          fileData: editBase64File || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update invoice.");
      }

      setEditingInvoice(null);
      if (vendorToken) {
        fetchPortalData(vendorToken);
      }
    } catch (err: any) {
      setEditError(err.message || "Failed to update invoice.");
    } finally {
      setIsUpdatingInvoice(false);
    }
  };

  // Helper colors for badges
  const getCategoryBadgeClass = (category: string) => {
    const badges: Record<string, string> = {
      Rent: "bg-blue-50 text-blue-700 border-blue-100",
      Manpower: "bg-violet-50 text-violet-700 border-violet-100",
      "Vehicle rent": "bg-amber-50 text-amber-700 border-amber-100",
      "Repairs & maintenance": "bg-emerald-50 text-emerald-700 border-emerald-100",
      Electricity: "bg-rose-50 text-rose-700 border-rose-100",
      Others: "bg-gray-50 text-gray-700 border-gray-100",
    };
    return badges[category] || "bg-gray-50 text-gray-700 border-gray-100";
  };

  // Format monetary value to Indian format
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

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

  // ================= VENDOR PORTAL RENDERING =================
  // Any portal token keeps the UI locked to vendor portal (no admin dashboard flash).
  if (vendorToken || initialVendorToken) {
    if (portalLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 mt-4">Verifying secure billing token...</p>
        </div>
      );
    }

    if (portalError || (!currentVendor && !portalCheckedVendor)) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-display font-bold text-gray-950">Invalid Access Token</h2>
          <p className="text-sm text-gray-500 max-w-sm mt-1">
            The billing upload URL you followed is expired, revoked, or formatted incorrectly. Please reach out to your Accounts Manager for a new portal link.
          </p>
        </div>
      );
    }

    // --- RENDER OTP LOGIN SCREEN IF NOT VERIFIED ---
    if (!isOtpVerified && portalCheckedVendor) {
      return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col justify-center items-center p-4 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-emerald-500 to-indigo-600 font-sans"></div>
          
          <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8 space-y-6 relative z-10 transition-all">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 mb-2">
                <ShieldCheck className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h2 className="text-xl font-display font-black text-slate-900 tracking-tight">Secure Vendor Verification</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Welcome, <span className="font-bold text-slate-800">{portalCheckedVendor.name}</span>. 
                Please verify your identity using your registered mobile number.
              </p>
            </div>

            {otpError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            {!otpRequested ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      🇮🇳
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="Enter registered phone number"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      className="w-full text-sm pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Expected registered format: <span className="font-semibold">{portalCheckedVendor.maskedPhone}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isRequestingOtp || !otpPhone.trim()}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-2"
                >
                  {isRequestingOtp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Requesting OTP...</span>
                    </>
                  ) : (
                    <span>Get Verification OTP</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-gray-100 text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Mobile: <strong className="text-slate-800">{otpPhone}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpRequested(false);
                        setOtpCode("");
                        setOtpError("");
                      }}
                      className="text-violet-600 hover:underline font-bold text-[10px] uppercase"
                    >
                      Change Number
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium leading-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block"></span>
                    OTP has been sent to your registered mobile number.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center tracking-[0.5em] text-lg font-black font-mono py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isRequestingOtp}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
                  >
                    Resend
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify & Login</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center text-[10px] text-slate-400">
              By logging in, you agree to secure transport protocol safeguards.
            </div>
          </div>
        </div>
      );
    }

    if (!currentVendor) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 mt-4">Preparing your vendor portal...</p>
        </div>
      );
    }

    return (
      <>
        <div id="vendor-portal-root" className="min-h-screen w-full bg-gray-50/50 flex flex-col screen-only">
        {/* Top Navigation Bar */}
        <nav className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-10 xl:px-12 shadow-sm w-full">
          <div className="w-full max-w-[1600px] mx-auto flex h-16 justify-between items-center">
            <div className="flex items-center gap-4">
              <SmileLogo showText={false} />
              <div className="h-8 w-[1.5px] bg-slate-200 hidden sm:block"></div>
              <div className="hidden sm:block leading-none">
                <h1 className="text-xs font-black text-slate-800 uppercase tracking-wider font-sans">
                  Shree Maruti Integrated Logistics Limited
                </h1>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                  Secure Billing Portal
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Authorized
              </span>
            </div>
          </div>
        </nav>

        <div className="flex-1 w-full max-w-[1600px] mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-10 xl:px-12 space-y-8">
          
          {/* Header Info Banner */}
          <div className="bg-blue-950 rounded-2xl border border-blue-900 p-6 md:p-8 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest bg-blue-900/50 border border-blue-800 px-3 py-1 rounded-full shadow-sm">
                Secure Vendor Billing Portal
              </span>
              <h1 className="text-2xl font-display font-extrabold text-white mt-1.5">{currentVendor.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200 mt-2">
                <span>Email: <strong className="font-bold text-white">{currentVendor.email}</strong></span>
                {currentVendor.phone && (
                  <>
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Phone: <strong className="font-bold text-white">{currentVendor.phone}</strong></span>
                  </>
                )}
              </div>
            </div>

            <div className="text-left md:text-right text-xs text-blue-200 font-medium">
              Authorized categories: 
              <div className="flex flex-wrap gap-1 mt-1.5 justify-start md:justify-end">
                {currentVendor.categories.map((c) => (
                  <span key={c} className="bg-white/10 text-white border border-white/10 font-bold px-2.5 py-1 rounded-lg text-[10px] shadow-sm hover:bg-white/20 transition-all">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {currentVendor.kycStatus !== "verified" && vendorToken ? (
            <PortalKycGate
              vendor={currentVendor}
              vendorToken={vendorToken}
              onVendorUpdated={(vendor) => {
                setCurrentVendor(vendor);
                if (vendor.kycStatus === "verified" && vendorToken) {
                  fetchPortalData(vendorToken);
                }
              }}
            />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Primary upload + optional creator */}
            <div className={`${portalSubMode === "generate" ? "lg:col-span-12" : "lg:col-span-7"} space-y-6`}>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-display font-semibold text-gray-900">Submit Invoice</h2>
                  <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Portal Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-6">
                  Upload your existing tax invoice file. Invoice creator is optional if you need to generate a PDF here.
                </p>

                {pSuccessMsg && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Action Completed Successfully!</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          {pSuccessMsg}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPSuccessMsg(null)}
                      className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      Upload another invoice →
                    </button>
                  </div>
                )}

                {portalSubMode !== "generate" && (
                <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                  {/* Category Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Select Account Category <span className="text-red-500">*</span>
                    </label>
                    <ColdverseSelect
                      value={pCategory}
                      onValueChange={setPCategory}
                      options={allCategories.map((cat) => ({ value: cat, label: cat }))}
                    />
                  </div>

                  {/* State & Hub Multi-location Choice */}
                  {(() => {
                    const vendorStates = currentVendor?.states && currentVendor.states.length > 0 
                      ? currentVendor.states 
                      : (currentVendor?.state ? currentVendor.state.split(",").map(s => s.trim()).filter(s => s.length > 0) : []);

                    const allStatesFromHubs = Array.from(new Set(portalHubs.map(h => h.state))).filter(Boolean);
                    const availableStates = vendorStates.length > 0 ? vendorStates : allStatesFromHubs;

                    const assignedHubs = portalHubs.filter(h => currentVendor?.hubs?.includes(h.id));
                    const hubsForSelection = currentVendor?.hubs && currentVendor.hubs.length > 0 ? assignedHubs : portalHubs;
                    const filteredHubs = pState 
                      ? hubsForSelection.filter(h => h.state === pState)
                      : hubsForSelection;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Operating State <span className="text-red-500">*</span>
                          </label>
                          <ColdverseSelect
                            value={pState}
                            onValueChange={(val) => {
                              setPState(val);
                              setPHubId("");
                            }}
                            placeholder="-- Select State --"
                            options={availableStates.map((st) => ({ value: st, label: st }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Transit Hub <span className="text-red-500">*</span>
                          </label>
                          <ColdverseSelect
                            value={pHubId}
                            onValueChange={setPHubId}
                            disabled={!pState}
                            placeholder={
                              !pState
                                ? "Select state first..."
                                : filteredHubs.length === 0
                                ? "No assigned hubs in this state"
                                : "-- Select Hub --"
                            }
                            options={filteredHubs.map((hub) => ({
                              value: hub.id,
                              label: `${hub.name} (${hub.code})`,
                            }))}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Invoice Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Invoice / Bill Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. INV/2026/07-12"
                        value={pInvoiceNo}
                        onChange={(e) => setPInvoiceNo(e.target.value)}
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
                      />
                    </div>

                    {/* Invoice Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Invoice Date <span className="text-red-500">*</span>
                      </label>
                      <ColdverseDateField
                        value={pDate}
                        onValueChange={setPDate}
                        placeholder="Select invoice date"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Billing Amount */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Invoice Gross Amount (INR) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 font-semibold text-sm">
                          ₹
                        </div>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 75000"
                          value={pAmount}
                          onChange={(e) => setPAmount(e.target.value)}
                          className="w-full text-sm pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
                        />
                      </div>
                    </div>

                    {/* Remarks / Details */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Remarks / Details (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. June services, special discounts..."
                        value={pRemarks}
                        onChange={(e) => setPRemarks(e.target.value)}
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
                      />
                    </div>
                  </div>

                  {/* File Upload Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Attach Digital Invoice (PDF, JPG, PNG) <span className="text-red-500">*</span>
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("p-file-input")?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? "border-violet-500 bg-violet-50/50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
                      }`}
                    >
                      <input
                        id="p-file-input"
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*,.docx,.doc,.txt"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleVendorFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-medium text-gray-900">
                        {pSelectedFile ? pSelectedFile.name : "Drag & drop your invoice file here"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {pSelectedFile
                          ? `Size: ${(pSelectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace`
                          : "Supports PDF, JPEG, PNG formats (Max 10MB)"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Hard Copy Submitted To (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Finance Desk / Hub Manager"
                        value={pHardCopySubmittedTo}
                        onChange={(e) => setPHardCopySubmittedTo(e.target.value)}
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Hard Copy Submission Date
                      </label>
                      <ColdverseDateField
                        value={pHardCopySubmissionDate}
                        onValueChange={setPHardCopySubmissionDate}
                        placeholder="Optional date"
                      />
                    </div>
                  </div>

                  {pUploadError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pUploadError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-violet-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-500/10 disabled:opacity-60"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading invoice securely...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Upload &amp; Submit Invoice
                      </>
                    )}
                  </button>
                </form>
                )}

                {/* Optional creator — secondary path */}
                {vendorToken && (
                  <div className={`${portalSubMode === "generate" ? "mt-2" : "mt-6"} border-t border-dashed border-gray-200 pt-5`}>
                    {portalSubMode !== "generate" ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            Need to create an invoice?
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Optional — generate a GST tax invoice PDF with templates, then submit it from here.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPortalSubMode("generate");
                            setPUploadError("");
                            setPSuccessMsg(null);
                          }}
                          className="shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Open invoice creator
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-800">Invoice creator</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPortalSubMode("upload");
                              setPUploadError("");
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            ← Back to upload
                          </button>
                        </div>
                        <PortalInvoiceGenerator
                          vendor={currentVendor}
                          vendorToken={vendorToken}
                          categories={allCategories}
                          portalHubs={portalHubs}
                          company={portalCompany}
                          onSuccess={(message) => {
                            setPSuccessMsg(message);
                            setPUploadError("");
                            setPortalSubMode("upload");
                            if (vendorToken) fetchPortalData(vendorToken);
                          }}
                          onError={(message) => setPUploadError(message)}
                          onClose={() => setPortalSubMode("upload")}
                        />
                        {pUploadError && portalSubMode === "generate" && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{pUploadError}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Portal Upload History */}
            {portalSubMode !== "generate" && (
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between h-full min-h-[400px]">
                <div>
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div>
                      <h3 className="text-base font-display font-semibold text-gray-900 mb-1">Upload History</h3>
                      <p className="text-xs text-gray-500">Historical record of invoices submitted by you.</p>
                    </div>
                    {portalInvoices.length > 0 && (
                      <button
                        onClick={() => exportInvoicesToExcel(
                          portalInvoices,
                          currentVendor ? [currentVendor] : [],
                          portalHubs,
                          `SMILe_${currentVendor?.name || "Vendor"}_Submitted_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`
                        )}
                        className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow hover:scale-[1.01] active:scale-[0.99] shrink-0"
                        title="Export submitted invoices to Excel"
                      >
                        <Download className="w-3 h-3" />
                        Export to Excel
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                    {portalInvoices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-12 text-gray-400">
                        <Inbox className="w-8 h-8 text-gray-300 stroke-[1.5] mb-2" />
                        <p className="text-xs font-medium">No previous invoices uploaded</p>
                        <p className="text-[10px] mt-0.5">Submit your first monthly invoice using the wizard.</p>
                      </div>
                    ) : (
                      portalInvoices
                        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                        .map((inv) => (
                          <div key={inv.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-gray-800 truncate max-w-[120px]" title={inv.invoiceNumber}>
                                {inv.invoiceNumber}
                              </span>
                              <span className="font-semibold font-mono text-gray-900">
                                {formatCurrency(inv.amount)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-500">
                              <span>Date: {inv.date}</span>
                              <span className={`px-2 py-0.2 rounded-full border ${getCategoryBadgeClass(inv.category)}`}>
                                {inv.category}
                              </span>
                            </div>

                            {/* State and Hub selection display */}
                            {(inv.state || inv.hubName) && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {inv.state && (
                                  <span className="bg-slate-100 text-slate-700 text-[9px] font-medium px-1.5 py-0.5 rounded">
                                    State: {inv.state}
                                  </span>
                                )}
                                {inv.hubName && (
                                  <span className="bg-violet-50 text-violet-700 text-[9px] font-medium px-1.5 py-0.5 rounded">
                                    Hub: {inv.hubName}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Status and remarks */}
                            <div className="flex flex-col gap-1 border-t border-gray-100/60 pt-1.5 mt-1.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-400 font-medium">Status:</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                  inv.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : inv.status === "Hold"
                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                    : inv.status === "Rejected"
                                    ? "bg-rose-50 text-rose-700 border-rose-100"
                                    : "bg-blue-50 text-blue-700 border-blue-100"
                                }`}>
                                  {inv.status || "Pending"}
                                </span>
                              </div>
                              {inv.remarks && (
                                <div className="text-[10px] text-gray-600 bg-gray-50 p-1.5 rounded-lg border border-gray-100/80 mt-1">
                                  <strong className="font-semibold text-gray-700">Remarks:</strong> {inv.remarks}
                                </div>
                              )}
                            </div>

                            <p className="text-[9px] font-mono text-gray-400 truncate mt-1 font-semibold">
                              File: {inv.fileName}
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 border-t border-gray-100/60 pt-2">
                              <a
                                href={`/api/invoices/download/${inv.id}`}
                                className="text-[10px] text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1 hover:underline"
                              >
                                <Download className="w-3 h-3" />
                                Download File
                              </a>
                              <button
                                onClick={() => handlePrintInvoice(inv)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                Print Invoice
                              </button>
                              <button
                                onClick={() => handlePrintChallan(inv)}
                                className="text-[10px] text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <FileCheck className="w-3 h-3 text-violet-500" />
                                Print Challan
                              </button>
                              {inv.status !== "Paid" && (
                                <button
                                  onClick={() => startEditingInvoice(inv)}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3 text-blue-500" />
                                  Edit Details
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-6 flex justify-between items-center text-[10px] text-gray-400">
                  <span>Authorized Link</span>
                  <span>SSL Encrypted Transport</span>
                </div>
              </div>
            </div>
            )}
          </div>
          )}
        </div>
      </div>
      
      {editingInvoice && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 overflow-y-auto flex justify-center items-start md:items-center p-4 py-8 md:py-12 screen-only">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-xl w-full max-w-xl my-auto animate-fade-in relative">
            <button 
              type="button"
              onClick={() => setEditingInvoice(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-display font-bold text-gray-950 mb-1">Edit Submitted Invoice</h2>
            <p className="text-xs text-gray-500 mb-6">Modify details for Invoice: <strong className="text-gray-700">{editingInvoice.invoiceNumber}</strong></p>

            <form onSubmit={handleEditInvoiceSubmit} className="space-y-4">
              {/* Edit Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Select Account Category <span className="text-red-500">*</span>
                </label>
                <ColdverseSelect
                  value={editCategory}
                  onValueChange={setEditCategory}
                  options={allCategories.map((cat) => ({ value: cat, label: cat }))}
                />
              </div>

              {/* Edit State & Hub Multi-location Choice */}
              {(() => {
                const vendorStates = currentVendor?.states && currentVendor.states.length > 0 
                  ? currentVendor.states 
                  : (currentVendor?.state ? currentVendor.state.split(",").map(s => s.trim()).filter(s => s.length > 0) : []);

                const assignedHubs = portalHubs.filter(h => currentVendor?.hubs?.includes(h.id));
                const filteredHubs = editState 
                  ? assignedHubs.filter(h => h.state === editState)
                  : assignedHubs;

                if (vendorStates.length > 0) {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Operating State <span className="text-red-500">*</span>
                        </label>
                        <ColdverseSelect
                          value={editState}
                          onValueChange={(val) => {
                            setEditState(val);
                            setEditHubId("");
                          }}
                          placeholder="-- Select State --"
                          options={vendorStates.map((st) => ({ value: st, label: st }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Transit Hub <span className="text-red-500">*</span>
                        </label>
                        <ColdverseSelect
                          value={editHubId}
                          onValueChange={setEditHubId}
                          disabled={!editState}
                          placeholder={
                            !editState
                              ? "Select state first..."
                              : filteredHubs.length === 0
                              ? "No assigned hubs in this state"
                              : "-- Select Hub --"
                          }
                          options={filteredHubs.map((hub) => ({
                            value: hub.id,
                            label: `${hub.name} (${hub.code})`,
                          }))}
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Edit Invoice Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Invoice / Bill Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editInvoiceNo}
                    onChange={(e) => setEditInvoiceNo(e.target.value)}
                    className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
                  />
                </div>

                {/* Edit Invoice Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <ColdverseDateField
                    value={editDate}
                    onValueChange={setEditDate}
                    placeholder="Select invoice date"
                  />
                </div>
              </div>

              {/* Edit Billing Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Invoice Gross Amount (INR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 font-semibold text-sm">
                    ₹
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full text-sm pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
                  />
                </div>
              </div>

              {/* Edit Optional File Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Replace Attached Invoice (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*,.docx,.doc,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleEditFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-gray-500 border border-gray-200 rounded-xl p-2 bg-gray-50/30 focus:outline-none"
                />
                <p className="text-[10px] text-gray-400">
                  Current file: <span className="font-semibold text-gray-600">{editingInvoice.fileName}</span>. Only upload if you want to replace it.
                </p>
              </div>

              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingInvoice}
                  className="px-6 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60 shadow-sm"
                >
                  {isUpdatingInvoice ? "Saving changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {renderPrintAndPreview()}
    </>
    );
  }

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
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all cursor-pointer shrink-0 ${
                activeTab === "dashboard"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveTab("vendors")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all cursor-pointer shrink-0 ${
                activeTab === "vendors"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              Manage Vendors
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all cursor-pointer shrink-0 ${
                activeTab === "invoices"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              Invoice logs
            </button>
            <button
              onClick={() => setActiveTab("hubs")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all cursor-pointer shrink-0 ${
                activeTab === "hubs"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              Logistics Hubs
            </button>
            <button
              onClick={() => setActiveTab("remarks")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all cursor-pointer shrink-0 ${
                activeTab === "remarks"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              Remarks Summary
            </button>
            <button
              onClick={() => setActiveTab("kyc")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all cursor-pointer shrink-0 relative ${
                activeTab === "kyc"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              KYC Approvals
              {vendors.filter((v) => v.kycStatus === "pending_verification").length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                  {vendors.filter((v) => v.kycStatus === "pending_verification").length}
                </span>
              )}
            </button>
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

        {/* Tab 1: Analytics Dashboard View */}
        {activeTab === "dashboard" && (
          <DashboardStats 
            stats={dynamicStats} 
            loading={adminLoading} 
            monthlyTrend={monthlyTrendData}
            statusKPIs={statusKPIs}
            onStatusClick={(status) => {
              setInvoiceStatusFilter(status);
              setActiveTab("invoices");
            }}
          />
        )}

        {/* Tab 2: Vendor List View */}
        {activeTab === "vendors" && (() => {
          // Calculate Vendor KPIs (scoped to selected hub)
          const totalVendorsCount = hubFilteredVendors.length;
          const gstRegisteredCount = hubFilteredVendors.filter(v => v.gstNumber && v.gstNumber.trim()).length;
          const uniqueStatesCount = new Set(hubFilteredVendors.flatMap(v => v.states || (v.state ? [v.state] : []))).size;
          const uniqueHubsCount = headerHubFilter === "All"
            ? new Set(hubFilteredVendors.flatMap(v => v.hubs || [])).size
            : 1;

          const colorsList = [
            { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-150", accent: "bg-orange-500", light: "bg-orange-500/10", tagBg: "bg-orange-50 text-orange-700 border-orange-100" },
            { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-150", accent: "bg-blue-500", light: "bg-blue-500/10", tagBg: "bg-blue-50 text-blue-700 border-blue-100" },
            { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-150", accent: "bg-emerald-500", light: "bg-emerald-500/10", tagBg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-150", accent: "bg-indigo-500", light: "bg-indigo-500/10", tagBg: "bg-indigo-50 text-indigo-700 border-indigo-100" },
            { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-150", accent: "bg-violet-500", light: "bg-violet-500/10", tagBg: "bg-violet-50 text-violet-700 border-violet-100" },
            { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-150", accent: "bg-rose-500", light: "bg-rose-500/10", tagBg: "bg-rose-50 text-rose-700 border-rose-100" },
            { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-150", accent: "bg-amber-500", light: "bg-amber-500/10", tagBg: "bg-amber-50 text-amber-700 border-amber-100" },
          ];

          return (
            <div className="space-y-6">
              {/* Vendor actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-display font-bold text-gray-950">Vendor Directory</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage vendor profiles, billing categories, and bulk imports.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:justify-end">
                  <button
                    onClick={() => {
                      setCategoryModalError("");
                      setCategoryModalSuccess("");
                      setShowCategoryModal(true);
                    }}
                    className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-600" />
                    Add Billing Category
                  </button>
                  <button
                    onClick={() => setShowBulkUploadModal(true)}
                    className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => setShowSingleVendorModal(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-orange-500/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Vendor
                  </button>
                </div>
              </div>

              {/* Colorful Vendor KPI Dashboard Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-orange-50 text-[10px] font-bold uppercase tracking-wider">Total Vendors</p>
                      <p className="text-2xl font-black mt-1">{totalVendorsCount}</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
                    <div className="bg-white h-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-[10px] text-orange-100 mt-2 font-medium">Verified active partnerships</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-emerald-50 text-[10px] font-bold uppercase tracking-wider">GST Compliant</p>
                      <p className="text-2xl font-black mt-1">{gstRegisteredCount}</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
                    <div className="bg-white h-full" style={{ width: `${totalVendorsCount > 0 ? (gstRegisteredCount / totalVendorsCount) * 100 : 0}%` }}></div>
                  </div>
                  <p className="text-[10px] text-emerald-100 mt-2 font-medium">
                    {totalVendorsCount > 0 ? Math.round((gstRegisteredCount / totalVendorsCount) * 100) : 0}% GST compliance rate
                  </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-indigo-50 text-[10px] font-bold uppercase tracking-wider">State Coverage</p>
                      <p className="text-2xl font-black mt-1">{uniqueStatesCount}</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
                    <div className="bg-white h-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-[10px] text-indigo-100 mt-2 font-medium">Operating across regions</p>
                </div>

                <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-pink-50 text-[10px] font-bold uppercase tracking-wider">Hub Association</p>
                      <p className="text-2xl font-black mt-1">{uniqueHubsCount}</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="w-full bg-white/20 h-[3px] rounded-full mt-3 overflow-hidden">
                    <div className="bg-white h-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-[10px] text-pink-100 mt-2 font-medium">Connected logistics terminals</p>
                </div>
              </div>

              {/* Main List & Card block */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Filter and View mode bar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                    {/* Search box */}
                    <div className="relative flex-1 max-w-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search by vendor name, email..."
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>

                    {/* View Switch Mode Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto gap-0.5">
                      <button
                        onClick={() => setVendorViewMode("grid")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          vendorViewMode === "grid"
                            ? "bg-white text-orange-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Grid Cards
                      </button>
                      <button
                        onClick={() => setVendorViewMode("table")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          vendorViewMode === "table"
                            ? "bg-white text-orange-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        Table List
                      </button>
                    </div>
                  </div>

                  {/* Actions right side */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => exportVendorsToExcel(filteredVendors, hubs, `SMILe_Vendors_Report_${new Date().toISOString().split('T')[0]}.xlsx`)}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl border border-emerald-600 shadow-sm transition-all cursor-pointer hover:shadow hover:scale-[1.01] active:scale-[0.99]"
                      title="Export currently filtered vendors to Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export to Excel
                    </button>
                    <div className="text-[11px] text-gray-400 font-medium">
                      Showing {filteredVendors.length} of {hubFilteredVendors.length} vendors
                    </div>
                  </div>
                </div>

                {/* Content rendering based on selected view mode */}
                {filteredVendors.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No vendors found</p>
                    <p className="text-xs mt-1">Register a new vendor to authorize monthly uploads.</p>
                  </div>
                ) : vendorViewMode === "grid" ? (
                  /* 1. CARDS GRID VIEW - ULTRA COLORFUL & ATTRACTIVE */
                  <div className="p-6 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredVendors.map((vendor, index) => {
                        const theme = colorsList[index % colorsList.length];
                        const shareLink = `${window.location.origin}${window.location.pathname}?token=${vendor.token}`;
                        const initials = vendor.name ? vendor.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "V";

                        return (
                          <div 
                            key={vendor.id} 
                            className="bg-white rounded-2xl border border-gray-100 hover:border-orange-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                          >
                            {/* Decorative top strip */}
                            <div className={`h-2 w-full ${theme.accent}`} />
                            
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                              {/* Vendor Header */}
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.text} font-black text-sm flex items-center justify-center shrink-0 shadow-inner`}>
                                  {initials}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                                    {vendor.name}
                                  </h4>
                                  <p className="text-xs text-gray-500 truncate mt-0.5">{vendor.email}</p>
                                  {vendor.phone && (
                                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">{vendor.phone}</p>
                                  )}
                                </div>
                              </div>

                              {/* GST & State container */}
                              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">GST details</span>
                                  {vendor.gstNumber ? (
                                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold">
                                      {vendor.gstNumber}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md font-medium italic">
                                      No GST listed
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200/40 pt-1.5">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Operating State</span>
                                  {vendor.state ? (
                                    <span className="text-[11px] font-extrabold text-gray-800 bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-0.5 rounded-md">
                                      📍 {vendor.state}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">No State selected</span>
                                  )}
                                </div>
                              </div>

                              {/* Associated Hubs */}
                              <div>
                                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mb-1.5">Assigned Hubs</p>
                                {vendor.hubs && vendor.hubs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {vendor.hubs.map((hubId) => {
                                      const hubObj = hubs.find((h) => h.id === hubId);
                                      return (
                                        <span
                                          key={hubId}
                                          className="text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100/80 px-2 py-0.5 rounded-lg hover:bg-violet-100 transition-colors"
                                          title={hubObj ? hubObj.name : "Unknown Hub"}
                                        >
                                          {hubObj ? hubObj.code : hubId}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-gray-400 italic">None associated</p>
                                )}
                              </div>

                              {/* Allowed Billing Categories */}
                              <div>
                                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mb-1.5">Allowed Billing Categories</p>
                                <div className="flex flex-wrap gap-1">
                                  {vendor.categories.map((cat) => (
                                    <span
                                      key={cat}
                                      className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Secure Access Link */}
                              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                                <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Unique Portal Link</p>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    readOnly
                                    value={shareLink}
                                    className="bg-gray-50 border border-gray-200 rounded-xl text-[9px] font-mono px-2.5 py-1.5 text-gray-500 w-full select-all focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleCopyLink(vendor.token)}
                                    className={`p-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                                      copiedToken === vendor.token
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                                    }`}
                                    title="Copy Secure Portal Link"
                                  >
                                    {copiedToken === vendor.token ? (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                                      `Action Required: Secure Invoice Submission Portal Link`
                                    )}&body=${encodeURIComponent(
                                      `Dear ${vendor.name},\n\nPlease find your secure invoice upload link below:\n\n${shareLink}\n\nYou are requested to upload all your invoices by clicking this secure link before the 10th of every month.\n\nThank you,\nFinance Department`
                                    )}`}
                                    className="p-2 rounded-xl border bg-white border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Email Link to Vendor"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            </div>

                            {/* Card Actions Footer */}
                            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                              <span className="text-[10px] text-gray-400 font-medium">
                                Created {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : "N/A"}
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setEditingVendor(vendor)}
                                  className="text-gray-500 hover:text-orange-600 p-2 hover:bg-orange-100/50 rounded-xl transition-colors inline-flex items-center cursor-pointer"
                                  title="Edit Vendor Details"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(vendor.id, "vendor", vendor.name)}
                                  className="text-gray-500 hover:text-red-600 p-2 hover:bg-red-100/50 rounded-xl transition-colors inline-flex items-center cursor-pointer"
                                  title="Archive / Delete Vendor"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* 2. ENHANCED HIGH-CONTRAST LIST TABLE VIEW */
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/70">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Vendor Detail
                          </th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            GST & State
                          </th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Assigned Hubs
                          </th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Allowed Categories
                          </th>
                          <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Copy Unique Upload Link
                          </th>
                          <th className="px-6 py-3.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredVendors.map((vendor, index) => {
                          const theme = colorsList[index % colorsList.length];
                          const shareLink = `${window.location.origin}${window.location.pathname}?token=${vendor.token}`;
                          return (
                            <tr key={vendor.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg ${theme.bg} ${theme.text} font-bold text-xs flex items-center justify-center`}>
                                    {vendor.name ? vendor.name[0].toUpperCase() : "V"}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                                      {vendor.name}
                                    </span>
                                    <span className="text-xs text-gray-500">{vendor.email}</span>
                                    {vendor.phone && (
                                      <span className="text-[10px] font-mono text-gray-400">{vendor.phone}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 max-w-[200px] break-words whitespace-normal">
                                <div className="flex flex-col text-xs text-gray-600">
                                  {vendor.gstNumber ? (
                                    <span className="font-mono text-gray-900 font-medium break-all text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded inline-block max-w-max">
                                      {vendor.gstNumber}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">No GST</span>
                                  )}
                                  {vendor.state ? (
                                    <span className="text-gray-700 mt-1 font-semibold text-[11px]">
                                      📍 {vendor.state}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic text-[11px]">No State</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {vendor.hubs && vendor.hubs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                                    {vendor.hubs.map((hubId) => {
                                      const hubObj = hubs.find((h) => h.id === hubId);
                                      return (
                                        <span
                                          key={hubId}
                                          className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full"
                                          title={hubObj ? hubObj.name : "Unknown Hub"}
                                        >
                                          {hubObj ? hubObj.code : hubId}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400">None assigned</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {vendor.categories.map((cat) => (
                                    <span
                                      key={cat}
                                      className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full"
                                    >
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 max-w-[320px]">
                                  <input
                                    type="text"
                                    readOnly
                                    value={shareLink}
                                    className="bg-gray-50 border border-gray-150 rounded-lg text-[10px] font-mono px-2.5 py-1.5 text-gray-500 w-full select-all focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleCopyLink(vendor.token)}
                                    className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                                      copiedToken === vendor.token
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                                    }`}
                                    title="Copy Shareable Link"
                                  >
                                    {copiedToken === vendor.token ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>

                                  <a
                                    href={`mailto:${vendor.email}?subject=${encodeURIComponent(
                                      `Action Required: Secure Invoice Submission Portal Link`
                                    )}&body=${encodeURIComponent(
                                      `Dear ${vendor.name},\n\nPlease find your secure invoice upload link below:\n\n${shareLink}\n\nYou are requested to upload all your invoices by clicking this secure link before the 10th of every month.\n\nThank you,\nFinance Department`
                                    )}`}
                                    className="p-1.5 rounded-lg border bg-white border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Send Link via Email"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </a>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1">
                                <button
                                  onClick={() => setEditingVendor(vendor)}
                                  className="text-gray-400 hover:text-orange-600 p-2 hover:bg-orange-50/50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                                  title="Edit Vendor"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(vendor.id, "vendor", vendor.name)}
                                  className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50/50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                                  title="Delete Vendor"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab: KYC Approvals */}
        {activeTab === "kyc" && (
          <AdminKycTab vendors={vendors} onRefresh={fetchAdminData} />
        )}

        {/* Tab 3: Invoice Logs View */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Filter and search bar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Text search */}
                <div className="relative flex-1 max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by vendor, invoice no..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                {/* Category dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <ColdverseSelect
                    value={invoiceCategoryFilter}
                    onValueChange={setInvoiceCategoryFilter}
                    variant="inline"
                    options={[
                      { value: "All", label: "All Categories" },
                      ...allCategories.map((cat) => ({ value: cat, label: cat })),
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => exportInvoicesToExcel(filteredInvoices, vendors, hubs, `SMILe_Invoice_Details_Report_${new Date().toISOString().split('T')[0]}.xlsx`)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl border border-emerald-600 shadow-sm transition-all cursor-pointer hover:shadow hover:scale-[1.01] active:scale-[0.99]"
                  title="Export currently filtered invoices to Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export to Excel
                </button>
                <div className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                  Showing {filteredInvoices.length} of {hubScopedInvoices.length} invoices
                </div>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Inbox className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No invoice records found</p>
                  <p className="text-xs mt-1">Change search filters or share links with vendors to get started.</p>
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
                    {filteredInvoices
                      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                      .map((inv) => (
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
                            <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wide ${getCategoryBadgeClass(inv.category)}`}>
                              {inv.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-gray-900">
                            {formatCurrency(inv.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setStatusEditInvoice(inv);
                                setEditStatusValue(inv.status || "Pending");
                                setEditRemarksValue(inv.remarks || "");
                                setStatusSaveError("");
                              }}
                              className="group flex flex-col items-start gap-1 text-left cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-all"
                              title="Click to update status and remarks"
                            >
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                                inv.status === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : inv.status === 'Hold'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : inv.status === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-100'
                                  : 'bg-blue-50 text-blue-700 border-blue-100'
                              }`}>
                                {inv.status || 'Pending'}
                                <span className="text-[9px] text-gray-400 group-hover:text-gray-600 font-normal ml-0.5">(Edit)</span>
                              </span>
                              {inv.remarks && (
                                <span className="text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 mt-0.5 block max-w-[180px] truncate" title={inv.remarks}>
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
                                onClick={() => handlePrintInvoice(inv)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 hover:underline text-left cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Print Invoice
                              </button>
                              <button
                                onClick={() => handlePrintChallan(inv)}
                                className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1.5 hover:underline text-left cursor-pointer"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-violet-500" />
                                Print Challan
                              </button>
                            </div>
                            <p className="text-[9px] text-gray-400 font-mono mt-1 max-w-[140px] truncate" title={inv.fileName}>
                              {inv.fileName}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                            <button
                              onClick={() => openDeleteModal(inv.id, "invoice", inv.invoiceNumber || inv.fileName)}
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
          </div>
        )}

        {/* Tab: Remarks & Summary Highlight Hub */}
        {activeTab === "remarks" && (() => {
          const invoicesWithRemarks = invoices.filter(inv =>
            inv.remarks &&
            inv.remarks.trim().length > 0 &&
            !inv.archived &&
            matchesHeaderHubInvoice(inv)
          );
          
          // Filter by search
          const filteredRemarksList = invoicesWithRemarks.filter(inv => {
            const query = invoiceSearch.toLowerCase();
            return (
              inv.vendorName.toLowerCase().includes(query) ||
              inv.invoiceNumber.toLowerCase().includes(query) ||
              inv.remarks.toLowerCase().includes(query) ||
              inv.category.toLowerCase().includes(query)
            );
          });

          const holdCount = invoicesWithRemarks.filter(inv => inv.status === "Hold").length;
          const rejectedCount = invoicesWithRemarks.filter(inv => inv.status === "Rejected").length;
          const paidCount = invoicesWithRemarks.filter(inv => inv.status === "Paid").length;
          const pendingCount = invoicesWithRemarks.filter(inv => !inv.status || inv.status === "Pending").length;

          return (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Flagged Remarks</div>
                  <div className="text-2xl font-black text-gray-900">{invoicesWithRemarks.length}</div>
                  <p className="text-[10px] text-gray-500 mt-1">Invoices with summary notes</p>
                </div>
                <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Hold Remarks</div>
                  <div className="text-2xl font-black text-amber-700">{holdCount}</div>
                  <p className="text-[10px] text-amber-600 mt-1">Awaiting corrections/approvals</p>
                </div>
                <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 shadow-sm">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Rejected Remarks</div>
                  <div className="text-2xl font-black text-rose-700">{rejectedCount}</div>
                  <p className="text-[10px] text-rose-600 mt-1">Invoices flagged as returned/denied</p>
                </div>
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Cleared / Paid Summary</div>
                  <div className="text-2xl font-black text-emerald-700">{paidCount}</div>
                  <p className="text-[10px] text-emerald-600 mt-1">Resolved notes & payments</p>
                </div>
              </div>

              {/* Controls bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-display font-semibold text-gray-900">Flagged Invoices & Remarks</h3>
                  <p className="text-xs text-gray-500">Highlighting all invoices with active summaries, notes, and remarks.</p>
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
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks Cards Grid */}
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
                      <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-violet-200 transition-all flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* Top Header */}
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">{inv.category}</h4>
                              <h3 className="text-sm font-bold text-gray-900 mt-0.5">{inv.vendorName}</h3>
                              <p className="text-[10px] text-gray-500 font-mono">Invoice: <span className="font-semibold">{inv.invoiceNumber}</span> • {inv.date}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1.5">
                              <span className="text-sm font-mono font-bold text-gray-950">{formatCurrency(inv.amount)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${statusClass}`}>
                                {inv.status || "Pending"}
                              </span>
                            </div>
                          </div>

                          {/* Remarks Highlight Box (MANDATORY REQUEST) */}
                          <div className={`p-4 rounded-xl border ${
                            inv.status === "Hold" 
                              ? "bg-amber-50/40 border-amber-100 text-amber-900" 
                              : inv.status === "Rejected" 
                              ? "bg-rose-50/40 border-rose-100 text-rose-950" 
                              : "bg-slate-50 border-gray-100 text-slate-800"
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              <span>Invoice Summary & Remarks</span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed font-sans">{inv.remarks}</p>
                          </div>

                          {/* State & Hub location footer badge if present */}
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

                        {/* Action buttons footer */}
                        <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-gray-100/60 text-xs">
                          <button
                            onClick={() => {
                              setStatusEditInvoice(inv);
                              setEditStatusValue(inv.status || "Pending");
                              setEditRemarksValue(inv.remarks || "");
                              setStatusSaveError("");
                            }}
                            className="text-violet-600 hover:text-violet-700 font-bold hover:underline flex items-center gap-1"
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
                              onClick={() => handlePrintInvoice(inv)}
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
        })()}

        {/* Tab: Logistics Hubs View */}
        {activeTab === "hubs" && (
          <HubsManagement vendors={vendors} onHubsUpdated={fetchAdminData} />
        )}

        {/* Tab 4: Archive View */}
        {activeTab === "archive" && (
          <div className="space-y-6">
            {/* Header / Info Card */}
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-violet-50 rounded-xl">
                  <Archive className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">System Archive Center</h2>
                  <p className="text-xs text-gray-500">
                    Track all deleted vendors and invoices. You can view their deletion remarks and restore them to active status at any time.
                  </p>
                </div>
              </div>
            </div>

            {/* Archive Search Bar */}
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search archive by name, invoice number, remarks..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Archived Vendors Panel */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Archived Vendors ({archivedVendors.length})</h3>
                  </div>
                </div>

                <div className="p-4 flex-1">
                  {archivedVendors.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs font-medium">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No archived vendors found.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {archivedVendors
                        .filter(v => 
                          v.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                          v.email.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                          (v.deletionRemarks || "").toLowerCase().includes(archiveSearch.toLowerCase())
                        )
                        .map(vendor => (
                          <div key={vendor.id} className="p-4 border border-gray-150 rounded-xl bg-gray-50/30 hover:bg-gray-50/80 transition-all space-y-3">
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <h4 className="text-xs font-bold text-gray-900">{vendor.name}</h4>
                                <p className="text-[10px] text-gray-400 font-mono">{vendor.email}</p>
                              </div>
                              <button
                                onClick={() => handleRestoreItem("vendor", vendor.id)}
                                className="px-3 py-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Restore
                              </button>
                            </div>

                            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-[10px] text-amber-900 leading-normal">
                              <span className="font-semibold block uppercase tracking-wider text-[8px] text-amber-700 mb-0.5">Deletion Remarks:</span>
                              {vendor.deletionRemarks || "No remarks provided"}
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-gray-400 border-t border-gray-100 pt-2 font-mono">
                              <span>Archived: {vendor.archivedAt ? new Date(vendor.archivedAt).toLocaleString() : "N/A"}</span>
                              <span>Categories: {vendor.categories.join(", ")}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Archived Invoices Panel */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Archived Invoices ({archivedInvoices.length})</h3>
                  </div>
                </div>

                <div className="p-4 flex-1">
                  {archivedInvoices.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs font-medium">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No archived invoices found.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {archivedInvoices
                        .filter(inv => 
                          (inv.invoiceNumber || "").toLowerCase().includes(archiveSearch.toLowerCase()) ||
                          inv.vendorName.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                          inv.category.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                          (inv.deletionRemarks || "").toLowerCase().includes(archiveSearch.toLowerCase())
                        )
                        .map(inv => (
                          <div key={inv.id} className="p-4 border border-gray-150 rounded-xl bg-gray-50/30 hover:bg-gray-50/80 transition-all space-y-3">
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold text-gray-900">
                                    {inv.invoiceNumber ? `Inv: ${inv.invoiceNumber}` : `No: ${inv.id.substring(0,8)}`}
                                  </h4>
                                  <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                                    {inv.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">{inv.vendorName}</p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1.5 font-sans">
                                <span className="text-xs font-extrabold text-gray-900">₹{inv.amount.toLocaleString("en-IN")}</span>
                                <button
                                  onClick={() => handleRestoreItem("invoice", inv.id)}
                                  className="px-3 py-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Restore
                                </button>
                              </div>
                            </div>

                            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-[10px] text-amber-900 leading-normal">
                              <span className="font-semibold block uppercase tracking-wider text-[8px] text-amber-700 mb-0.5">Deletion Remarks:</span>
                              {inv.deletionRemarks || "No remarks provided"}
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-gray-400 border-t border-gray-100 pt-2 font-mono">
                              <span>Archived: {inv.archivedAt ? new Date(inv.archivedAt).toLocaleString() : "N/A"}</span>
                              <span>File: {inv.fileName}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>

    {renderPrintAndPreview()}
  </>
  );
}

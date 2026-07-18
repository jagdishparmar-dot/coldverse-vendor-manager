"use client";

import React, { useState, useEffect } from "react";
import {
  LogOut,
  Printer,
  Upload,
  AlertCircle,
  FileText,
  CheckCircle2,
  Send,
  X,
  ShieldCheck,
} from "lucide-react";
import type { Vendor, Invoice, Hub, CompanyProfile } from "@/src/types";
import PortalKycGate from "@/src/components/PortalKycGate";
import PortalInvoiceGenerator from "@/src/components/PortalInvoiceGenerator";
import { SmileLogo } from "@/src/components/Logo";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { ColdverseDateField } from "@/src/components/coldverse-date-field";
import PortalUploadHistory from "@/src/features/portal/PortalUploadHistory";
import { formatCurrency } from "@/src/features/admin/utils";

const ALL_CATEGORIES = ["Rent", "Manpower", "Vehicle rent", "Repairs & maintenance", "Electricity", "Others"];

type VendorPortalProps = {
  token: string;
};

export default function VendorPortal({ token }: VendorPortalProps) {
  const [allCategories, setAllCategories] = useState<string[]>(ALL_CATEGORIES);

  // Portal States
  const [portalLoading, setPortalLoading] = useState(true);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [portalInvoices, setPortalInvoices] = useState<Invoice[]>([]);
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
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Printing state
  const [activePrintInvoice, setActivePrintInvoice] = useState<Invoice | null>(null);

  const handlePrintInvoice = (invoice: Invoice) => {
    setActivePrintInvoice(invoice);
  };


  // Fetch Vendor Portal Specific Data
  const fetchPortalData = async (portalToken: string) => {
    setPortalLoading(true);
    setPortalError("");
    try {
      const response = await fetch(`/api/vendors/token/${encodeURIComponent(portalToken)}`);

      if (!response.ok) {
        if (response.status === 401) {
          // OTP verification required
          const checkRes = await fetch(`/api/vendors/portal-check/${encodeURIComponent(portalToken)}`);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load vendor profile.";
      setPortalError(message);
    } finally {
      setPortalLoading(false);
    }
  };

  // Request OTP for Vendor Portal Access
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !otpPhone.trim()) return;
    setIsRequestingOtp(true);
    setOtpError("");
    try {
      const response = await fetch("/api/vendors/portal-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, phone: otpPhone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP.");
      }

      setOtpRequested(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP.";
      setOtpError(message);
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Verify OTP for Vendor Portal Access
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !otpPhone.trim() || !otpCode.trim()) return;
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const response = await fetch("/api/vendors/portal-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, phone: otpPhone, otp: otpCode }),
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OTP verification failed.";
      setOtpError(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handlePortalLogout = async () => {
    if (!token || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/vendors/portal-otp/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {
      // Still clear local session UI even if the network call fails.
    } finally {
      setCurrentVendor(null);
      setPortalInvoices([]);
      setPortalHubs([]);
      setPortalCompany(null);
      setIsOtpVerified(false);
      setOtpRequested(false);
      setOtpCode("");
      setOtpPhone("");
      setOtpError("");
      setEditingInvoice(null);
      setPortalSubMode("upload");
      setPSuccessMsg(null);
      setPUploadError("");
      setIsLoggingOut(false);
      await fetchPortalData(token);
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
          token,
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
      fetchPortalData(token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete upload.";
      setPUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const startEditingInvoice = (inv: Invoice) => {
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
      fetchPortalData(token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update invoice.";
      setEditError(message);
    } finally {
      setIsUpdatingInvoice(false);
    }
  };

  // Load portal data on mount
  useEffect(() => {
    fetchPortalData(token);
  }, [token]);

  const renderPrintAndPreview = () => {
    if (!activePrintInvoice) return null;

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

    return null;
  };

  // ================= PORTAL RENDERING =================

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

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest hidden xs:inline sm:inline">
                  Authorized
                </span>
              </div>
              <button
                type="button"
                onClick={handlePortalLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="End this vendor portal session"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isLoggingOut ? "Signing out…" : "Log out"}
              </button>
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

          {currentVendor.kycStatus !== "verified" ? (
            <PortalKycGate
              vendor={currentVendor}
              vendorToken={token}
              onVendorUpdated={(vendor) => {
                setCurrentVendor(vendor);
                if (vendor.kycStatus === "verified") {
                  fetchPortalData(token);
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
                          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragOver
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
                          vendorToken={token}
                          categories={allCategories}
                          portalHubs={portalHubs}
                          company={portalCompany}
                          onSuccess={(message) => {
                            setPSuccessMsg(message);
                            setPUploadError("");
                            setPortalSubMode("upload");
                            fetchPortalData(token);
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
                </div>
              </div>

              {portalSubMode !== "generate" && (
                <div className="lg:col-span-5 space-y-6">
                  <PortalUploadHistory
                    invoices={portalInvoices}
                    vendor={currentVendor}
                    hubs={portalHubs}
                    onPrintInvoice={handlePrintInvoice}
                    onEditInvoice={startEditingInvoice}
                  />
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

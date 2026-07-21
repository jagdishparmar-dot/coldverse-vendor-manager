"use client";

import React, { useState, useEffect } from "react";
import {
  LogOut,
  Upload,
  AlertCircle,
  FileText,
  CheckCircle2,
  Send,
  X,
  Loader2,
} from "lucide-react";
import type { Vendor, Invoice, Hub, CompanyProfile } from "@/src/types";
import PortalKycGate from "@/src/components/PortalKycGate";
import PortalInvoiceGenerator from "@/src/components/PortalInvoiceGenerator";
import { SmileLogo } from "@/src/components/Logo";
import { COMPANY_LEGAL_NAME } from "@/src/constants/brand";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { ColdverseDateField } from "@/src/components/coldverse-date-field";
import PortalUploadHistory from "@/src/features/portal/PortalUploadHistory";
import InvoiceAttachmentPrintModal from "@/src/features/admin/components/InvoiceAttachmentPrintModal";
import { formatCurrency } from "@/src/features/admin/utils";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

const ALL_CATEGORIES = ["Rent", "Manpower", "Vehicle rent", "Repairs & maintenance", "Electricity", "Others"];
const OTP_RESEND_COOLDOWN_SEC = 60;

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
  const [portalCheckedVendor, setPortalCheckedVendor] = useState<{
    name: string;
    maskedPhone: string;
    maskedEmail?: string;
  } | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpDeliveryMessage, setOtpDeliveryMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
      const checkRes = await fetch(
        `/api/vendors/portal-check/${encodeURIComponent(portalToken)}`
      );
      if (!checkRes.ok) {
        throw new Error("Invalid or inactive vendor portal link.");
      }

      const checkData = await checkRes.json();
      setPortalCheckedVendor({
        name: checkData.name,
        maskedPhone: checkData.maskedPhone,
        maskedEmail: checkData.maskedEmail,
      });

      const response = await fetch(`/api/vendors/token/${encodeURIComponent(portalToken)}`);
      if (response.status === 401) {
        setIsOtpVerified(false);
        setPortalLoading(false);
        return;
      }

      if (!response.ok) {
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
    if (otpRequested && resendCooldown > 0) return;
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
        throw new Error(data.error || "Could not send the code. Please try again.");
      }

      setOtpRequested(true);
      setOtpDeliveryMessage(
        typeof data.message === "string"
          ? data.message
          : "Verification code sent to your registered mobile number."
      );
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not send the code. Please try again.";
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
        throw new Error(data.error || "That code looks wrong. Please check and try again.");
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
      const message = err instanceof Error ? err.message : "Could not verify the code. Please try again.";
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
          token,
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

  // Countdown for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  // Load portal data on mount
  useEffect(() => {
    fetchPortalData(token);
  }, [token]);

  const renderPrintAndPreview = () => {
    if (!activePrintInvoice) return null;

    const tokenParam = encodeURIComponent(token);
    return (
      <InvoiceAttachmentPrintModal
        invoice={activePrintInvoice}
        viewUrl={`/api/invoices/view/${activePrintInvoice.id}?token=${tokenParam}`}
        downloadUrl={`/api/invoices/download/${activePrintInvoice.id}?token=${tokenParam}`}
        onClose={() => setActivePrintInvoice(null)}
      />
    );
  };

  // ================= PORTAL RENDERING =================

  if (portalLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
        <div className="flex justify-center mb-8">
          <SmileLogo />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        <p className="text-sm text-slate-500 mt-4">Opening your billing page...</p>
      </div>
    );
  }

  if (portalError || (!currentVendor && !portalCheckedVendor)) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <SmileLogo />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <AlertCircle className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">
              Link not working
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              This invoice upload link is invalid or no longer active. Please ask your Shree Maruti
              accounts contact for a fresh link.
            </p>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-6">{COMPANY_LEGAL_NAME}</p>
        </div>
      </div>
    );
  }

  // --- RENDER OTP LOGIN SCREEN IF NOT VERIFIED ---
  if (!isOtpVerified && portalCheckedVendor) {
    const otpSlotClass =
      "size-11 text-base font-bold first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-violet-400 data-[active=true]:ring-violet-100";

    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <SmileLogo />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">
                {otpRequested ? "Enter verification code" : "Vendor sign in"}
              </h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {otpRequested ? (
                  <>
                    {otpDeliveryMessage || (
                      <>
                        We sent a 6-digit code to{" "}
                        <span className="font-semibold text-slate-700">+91 {otpPhone}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Hi <span className="font-semibold text-slate-700">{portalCheckedVendor.name}</span>
                    . Enter your registered mobile to upload invoices.
                  </>
                )}
              </p>
            </div>

            {otpError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {!otpRequested ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="portal-mobile"
                    className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
                  >
                    Mobile number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">
                      +91
                    </span>
                    <Input
                      id="portal-mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="h-10 rounded-xl border-gray-200 pl-12 font-mono tracking-wide focus-visible:border-violet-300 focus-visible:ring-violet-100"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Should end with{" "}
                    <span className="font-semibold text-slate-500">{portalCheckedVendor.maskedPhone}</span>
                    {portalCheckedVendor.maskedEmail ? (
                      <>
                        {" "}
                        · OTP is also sent to{" "}
                        <span className="font-semibold text-slate-500">
                          {portalCheckedVendor.maskedEmail}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isRequestingOtp || otpPhone.length !== 10}
                  className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-extrabold tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRequestingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    "Send code"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 text-center">
                    6-digit code
                  </label>
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value.replace(/\D/g, ""))}
                    autoFocus
                    containerClassName="justify-center gap-2"
                    aria-invalid={Boolean(otpError)}
                  >
                    <InputOTPGroup className="gap-0">
                      <InputOTPSlot index={0} className={otpSlotClass} />
                      <InputOTPSlot index={1} className={otpSlotClass} />
                      <InputOTPSlot index={2} className={otpSlotClass} />
                    </InputOTPGroup>
                    <InputOTPSeparator className="text-slate-300" />
                    <InputOTPGroup className="gap-0">
                      <InputOTPSlot index={3} className={otpSlotClass} />
                      <InputOTPSlot index={4} className={otpSlotClass} />
                      <InputOTPSlot index={5} className={otpSlotClass} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isRequestingOtp || resendCooldown > 0}
                    className="h-11 min-w-[7.5rem] px-4 rounded-xl border border-gray-200 bg-white text-slate-700 text-sm font-extrabold tracking-wide hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center whitespace-nowrap"
                  >
                    {isRequestingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      "Resend"
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-extrabold tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOtpRequested(false);
                    setOtpCode("");
                    setOtpError("");
                    setResendCooldown(0);
                  }}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Use a different mobile number
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            {COMPANY_LEGAL_NAME}
          </p>
        </div>
      </div>
    );
  }

  if (!currentVendor) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
        <div className="flex justify-center mb-8">
          <SmileLogo />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        <p className="text-sm text-slate-500 mt-4">Loading your invoices...</p>
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
                title="Log out"
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
              {/* Left Column: creator first, then upload submit */}
              <div className={`${portalSubMode === "generate" ? "lg:col-span-12" : "lg:col-span-7"} space-y-6`}>
                {/* 1) Invoice creator — shown first so vendors see create OR upload */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  {portalSubMode !== "generate" ? (
                    <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50/80 to-white px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                            Option 1
                          </span>
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600" />
                            Create invoice here
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Generate a GST tax invoice PDF with templates, then submit it from the portal.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPortalSubMode("generate");
                          setPUploadError("");
                          setPSuccessMsg(null);
                        }}
                        className="shrink-0 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-orange-600 text-white hover:bg-orange-700 shadow-sm cursor-pointer"
                      >
                        Open invoice creator
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-display font-semibold text-gray-900">
                            Invoice creator
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Build your tax invoice PDF, then return to upload if you already have a file.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPortalSubMode("upload");
                            setPUploadError("");
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
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
                      {pUploadError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{pUploadError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2) Submit / upload existing invoice */}
                {portalSubMode !== "generate" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        Option 2
                      </span>
                      <h2 className="text-lg font-display font-semibold text-gray-900">Submit Invoice</h2>
                    </div>
                    <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-6">
                    Already have a tax invoice file? Upload it below with category, hub, and amount details.
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
                            accept=".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
                </div>
                )}
              </div>

              {portalSubMode !== "generate" && (
                <div className="lg:col-span-5 space-y-6">
                  <PortalUploadHistory
                    invoices={portalInvoices}
                    vendor={currentVendor}
                    hubs={portalHubs}
                    portalToken={token}
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

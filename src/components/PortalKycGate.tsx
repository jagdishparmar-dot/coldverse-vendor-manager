"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  FileCheck,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { Vendor } from "@/src/types";
import { ColdverseSelect } from "@/src/components/coldverse-select";

const COMPANY_TYPES = [
  { value: "Private Limited Company (Pvt Ltd)", label: "Private Limited Company (Pvt Ltd)" },
  { value: "Proprietorship", label: "Proprietorship" },
  { value: "Partnership", label: "Partnership" },
  { value: "LLP", label: "LLP" },
  { value: "Public Limited Company", label: "Public Limited Company" },
  { value: "One Person Company (OPC)", label: "One Person Company (OPC)" },
  { value: "Trust / NGO", label: "Trust / NGO" },
  { value: "Others", label: "Others" },
];

type DocSlot = {
  fileName: string;
  fileType: string;
  fileData: string;
};

const emptyDoc = (): DocSlot => ({ fileName: "", fileType: "", fileData: "" });

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

type PortalKycGateProps = {
  vendor: Vendor;
  vendorToken: string;
  onVendorUpdated: (vendor: Vendor) => void;
};

export default function PortalKycGate({
  vendor,
  vendorToken,
  onVendorUpdated,
}: PortalKycGateProps) {
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [companyType, setCompanyType] = useState(COMPANY_TYPES[0].value);
  const [panNumber, setPanNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [address, setAddress] = useState("");

  const [mainDoc, setMainDoc] = useState<DocSlot>(emptyDoc());
  const [panDoc, setPanDoc] = useState<DocSlot>(emptyDoc());
  const [gstDoc, setGstDoc] = useState<DocSlot>(emptyDoc());
  const [msmeDoc, setMsmeDoc] = useState<DocSlot>(emptyDoc());
  const [otherDoc, setOtherDoc] = useState<DocSlot>(emptyDoc());

  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setGstNumber(vendor.gstNumber || "");
    setBeneficiaryName(vendor.name || "");
    const details = vendor.kycDetails;
    if (details) {
      setPanNumber(details.panNumber || "");
      setCompanyType(details.companyType || COMPANY_TYPES[0].value);
      setBankName(details.bankName || "");
      setAccountNumber(details.accountNumber || "");
      setIfscCode(details.ifscCode || "");
      setBeneficiaryName(details.beneficiaryName || vendor.name || "");
      setAddress(details.address || "");
      setMainDoc({
        fileName: details.kycDocName || "",
        fileType: details.kycDocType || "",
        fileData: "",
      });
      setPanDoc({
        fileName: details.panDocName || "",
        fileType: details.panDocType || "",
        fileData: "",
      });
      setGstDoc({
        fileName: details.gstDocName || "",
        fileType: details.gstDocType || "",
        fileData: "",
      });
      setMsmeDoc({
        fileName: details.msmeDocName || "",
        fileType: details.msmeDocType || "",
        fileData: "",
      });
      setOtherDoc({
        fileName: details.otherDocName || "",
        fileType: details.otherDocType || "",
        fileData: "",
      });
    } else {
      setPanNumber("");
      setCompanyType(COMPANY_TYPES[0].value);
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setAddress("");
      setMainDoc(emptyDoc());
      setPanDoc(emptyDoc());
      setGstDoc(emptyDoc());
      setMsmeDoc(emptyDoc());
      setOtherDoc(emptyDoc());
    }
  }, [vendor]);

  const downloadUrl = (docType?: string) => {
    const base = `/api/vendors/kyc/download/${vendor.id}?token=${encodeURIComponent(vendorToken)}`;
    return docType ? `${base}&docType=${docType}` : base;
  };

  const handleFilePick = async (
    file: File | undefined,
    setter: React.Dispatch<React.SetStateAction<DocSlot>>
  ) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("File size exceeds 10MB limit.");
      return;
    }
    try {
      const data = await readFileAsDataUrl(file);
      setter({ fileName: file.name, fileType: file.type, fileData: data });
      setSubmitError("");
    } catch {
      setSubmitError("Failed to read the selected file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !panNumber ||
      !companyType ||
      !bankName ||
      !accountNumber ||
      !ifscCode ||
      !beneficiaryName ||
      !address
    ) {
      setSubmitError("Please fill in all required fields.");
      return;
    }
    if (!mainDoc.fileData && !mainDoc.fileName) {
      setSubmitError("Please upload a scanned copy of your KYC document.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/vendors/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: vendorToken,
          panNumber: panNumber.toUpperCase().trim(),
          companyType,
          bankName,
          accountNumber,
          ifscCode: ifscCode.toUpperCase().trim(),
          beneficiaryName,
          address,
          gstNumber: gstNumber.toUpperCase().trim(),
          fileName: mainDoc.fileName,
          fileType: mainDoc.fileType,
          fileData: mainDoc.fileData || undefined,
          panDocName: panDoc.fileName || undefined,
          panDocType: panDoc.fileType || undefined,
          panDocData: panDoc.fileData || undefined,
          gstDocName: gstDoc.fileName || undefined,
          gstDocType: gstDoc.fileType || undefined,
          gstDocData: gstDoc.fileData || undefined,
          msmeDocName: msmeDoc.fileName || undefined,
          msmeDocType: msmeDoc.fileType || undefined,
          msmeDocData: msmeDoc.fileData || undefined,
          otherDocName: otherDoc.fileName || undefined,
          otherDocType: otherDoc.fileType || undefined,
          otherDocData: otherDoc.fileData || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit KYC details.");
      }
      if (data.vendor) {
        onVendorUpdated(data.vendor);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during KYC submission.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (vendor.kycStatus === "pending_verification") {
    const details = vendor.kycDetails;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
        {submitError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="text-center py-12 max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto relative">
            <span className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-35" />
            <ShieldCheck className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-gray-950">We&apos;re checking your details</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Thanks for sharing your business documents. The Shree Maruti accounts team is reviewing them.
            </p>
            <p className="text-xs text-slate-400">
              First-time vendors need this approval before uploading invoices. It usually takes 2–4 working hours.
            </p>
          </div>
        </div>

        {details && (
          <div className="border-t border-gray-100 pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              What you submitted
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
              <div>
                <span className="text-slate-400 block font-medium">GSTIN / Registration</span>
                <strong className="text-slate-800 font-bold font-mono text-xs">
                  {vendor.gstNumber || "Not Provided"}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">PAN Number</span>
                <strong className="text-slate-800 font-bold font-mono text-xs">{details.panNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Business Type</span>
                <strong className="text-slate-800 font-bold text-xs">{details.companyType}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Bank Details</span>
                <strong className="text-slate-800 font-bold text-xs">{details.bankName}</strong>
                <span className="text-slate-400 block text-[10px] font-mono mt-0.5">
                  A/C: {details.accountNumber}
                </span>
                <span className="text-slate-400 block text-[10px] font-mono">IFSC: {details.ifscCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Account holder name</span>
                <strong className="text-slate-800 font-bold text-xs">{details.beneficiaryName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">KYC Attached Document</span>
                {details.kycDocPath ? (
                  <a
                    href={downloadUrl()}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Document
                  </a>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </div>
              {details.panDocPath && (
                <div>
                  <span className="text-slate-400 block font-medium">PAN Card Document</span>
                  <a
                    href={downloadUrl("pan")}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="text-violet-600 hover:underline font-bold inline-flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View PAN Card
                  </a>
                </div>
              )}
              {details.gstDocPath && (
                <div>
                  <span className="text-slate-400 block font-medium">GST Certificate</span>
                  <a
                    href={downloadUrl("gst")}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="text-violet-600 hover:underline font-bold inline-flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View GST Certificate
                  </a>
                </div>
              )}
              {details.msmeDocPath && (
                <div>
                  <span className="text-slate-400 block font-medium">MSME Certificate</span>
                  <a
                    href={downloadUrl("msme")}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="text-violet-600 hover:underline font-bold inline-flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View MSME Certificate
                  </a>
                </div>
              )}
              {details.otherDocPath && (
                <div>
                  <span className="text-slate-400 block font-medium">Other Documents</span>
                  <a
                    href={downloadUrl("other")}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="text-violet-600 hover:underline font-bold inline-flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Other Doc
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-display font-bold text-slate-900">Complete your business details</h2>
        <p className="text-xs text-slate-500">
          Fill in your GST, bank, and company details, then upload one supporting document
          (GST certificate, incorporation letter, or cancelled cheque).
        </p>
      </div>

      {vendor.kycStatus === "rejected" && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs flex gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Details need a correction</p>
            <p className="mt-1">
              Note from accounts:{" "}
              <strong className="font-black text-rose-950">
                &quot;{vendor.kycDetails?.remarks || "Please check your details and submit again"}&quot;
              </strong>
            </p>
            <p className="text-[10px] text-rose-600 mt-1">
              Please review the details below, correct the fields, and resubmit for verification.
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 pb-1.5">
            1. Corporate &amp; Tax Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Beneficiary Name / Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Corporate Name"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Constitution of Business <span className="text-red-500">*</span>
              </label>
              <ColdverseSelect
                value={companyType}
                onValueChange={setCompanyType}
                options={COMPANY_TYPES}
                placeholder="Select company type"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                PAN Number (10 Characters) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="e.g. ABCDE1234F"
                value={panNumber}
                onChange={(e) =>
                  setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono tracking-widest uppercase bg-gray-50/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                GSTIN / GST Number (15 Characters)
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 24ABCDE1234F1Z5"
                value={gstNumber}
                onChange={(e) =>
                  setGstNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono tracking-widest uppercase bg-gray-50/30"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 pb-1.5">
            2. Banking Settlement Account
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Bank, SBI"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Bank Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter bank account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono tracking-widest bg-gray-50/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                IFSC Code (11 Characters) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                placeholder="e.g. HDFC0000123"
                value={ifscCode}
                onChange={(e) =>
                  setIfscCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono tracking-wider uppercase bg-gray-50/30"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Registered Office Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Registered corporate/billing address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 pb-1.5">
            3. Supporting Corporate Documents
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Scanned Business Proof (PDF, JPG or PNG) <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFilePick(e.dataTransfer.files?.[0], setMainDoc);
              }}
              onClick={() => document.getElementById("kyc-file-input")?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-violet-500 bg-violet-50/40"
                  : mainDoc.fileName
                    ? "border-emerald-300 bg-emerald-50/10 hover:bg-emerald-50/20"
                    : "border-gray-200 bg-gray-50/20 hover:bg-gray-50/50"
              }`}
            >
              <input
                type="file"
                id="kyc-file-input"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => void handleFilePick(e.target.files?.[0], setMainDoc)}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
                  <Upload className="w-5 h-5 stroke-[1.5]" />
                </div>
                {mainDoc.fileName ? (
                  <div>
                    <p className="text-xs font-bold text-emerald-800">File Selected: {mainDoc.fileName}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      Click or drag another file to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Drag &amp; drop your supporting document, or{" "}
                      <span className="text-violet-600 hover:underline">browse</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Upload a copy of PAN, GST registration Certificate, or Canceled Cheque (Max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Optional Documents (To speed up verification)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { id: "pan-card-file-input", label: "PAN Card (Optional)", hint: "Click to upload PAN Card", slot: panDoc, setter: setPanDoc },
                  { id: "gst-cert-file-input", label: "GST Certificate (Optional)", hint: "Click to upload GST Certificate", slot: gstDoc, setter: setGstDoc },
                  { id: "msme-file-input", label: "MSME Registration Certificate (Optional)", hint: "Click to upload MSME Certificate", slot: msmeDoc, setter: setMsmeDoc },
                  { id: "other-file-input", label: "Any Other Documents (Optional)", hint: "Click to upload other documents", slot: otherDoc, setter: setOtherDoc },
                ] as const
              ).map((opt) => (
                <div key={opt.id} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                    {opt.label}
                  </label>
                  <div
                    onClick={() => document.getElementById(opt.id)?.click()}
                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      opt.slot.fileName
                        ? "border-emerald-300 bg-emerald-50/10 hover:bg-emerald-50/20"
                        : "border-gray-200 bg-gray-50/20 hover:bg-gray-50/50"
                    }`}
                  >
                    <input
                      type="file"
                      id={opt.id}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => void handleFilePick(e.target.files?.[0], opt.setter)}
                      className="hidden"
                    />
                    <div className="space-y-1 flex flex-col items-center">
                      <FileCheck className="w-5 h-5 text-slate-400" />
                      {opt.slot.fileName ? (
                        <p className="text-[10px] font-bold text-emerald-800 line-clamp-1">
                          {opt.slot.fileName}
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-500 font-medium">{opt.hint}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Submitting KYC details...</span>
            </>
          ) : (
            <span>Submit KYC Enrollment</span>
          )}
        </button>
      </form>
    </div>
  );
}

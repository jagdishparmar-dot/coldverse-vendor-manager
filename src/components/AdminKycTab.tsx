"use client";

import React, { useMemo, useState } from "react";
import {
  FileDown,
  FileText,
  FolderOpen,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import type { Vendor } from "@/src/types";

type KycStatusFilter = "all" | "pending" | "verified" | "rejected";

type AdminKycTabProps = {
  vendors: Vendor[];
  onRefresh: () => void;
};

export default function AdminKycTab({ vendors, onRefresh }: AdminKycTabProps) {
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [actionVendorId, setActionVendorId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const pendingCount = vendors.filter((v) => v.kycStatus === "pending_verification").length;
  const verifiedCount = vendors.filter((v) => v.kycStatus === "verified").length;
  const rejectedCount = vendors.filter((v) => v.kycStatus === "rejected").length;

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        Boolean(v.kycDetails?.panNumber && v.kycDetails.panNumber.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && v.kycStatus === "pending_verification") ||
        (statusFilter === "verified" && v.kycStatus === "verified") ||
        (statusFilter === "rejected" && v.kycStatus === "rejected");

      return matchesSearch && matchesStatus;
    });
  }, [vendors, search, statusFilter]);

  const handleVerify = async (
    vendorId: string,
    status: "verified" | "rejected",
    remarks?: string
  ) => {
    setIsVerifying(true);
    setVerifyError("");
    try {
      const response = await fetch(`/api/vendors/${vendorId}/kyc/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, remarks }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify KYC.");
      }
      setActionVendorId(null);
      setRejectRemarks("");
      onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during verification.";
      setVerifyError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const filterChipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
      active
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-gray-200/50"
    }`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Pending Approvals
            </span>
            <h3 className="text-2xl font-bold text-amber-600 font-mono">{pendingCount}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldAlert className="w-5 h-5 stroke-[1.5]" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Verified Accounts
            </span>
            <h3 className="text-2xl font-bold text-emerald-600 font-mono">{verifiedCount}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5 h-5 stroke-[1.5]" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Rejected Accounts
            </span>
            <h3 className="text-2xl font-bold text-red-600 font-mono">{rejectedCount}</h3>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ShieldX className="w-5 h-5 stroke-[1.5]" />
          </div>
        </div>
      </div>

      {verifyError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
          {verifyError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex bg-gray-100 p-1 rounded-xl whitespace-nowrap self-start gap-1 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={filterChipClass(statusFilter === "pending")}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("verified")}
            className={filterChipClass(statusFilter === "verified")}
          >
            Verified ({verifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={filterChipClass(statusFilter === "rejected")}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={filterChipClass(statusFilter === "all")}
          >
            All ({vendors.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search vendor name, email, or PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredVendors.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 border border-slate-100">
              <FolderOpen className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">No KYC records found</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                There are no vendor registration records matching the selected status filter or search
                parameters.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left">
              <thead className="bg-gray-50/50">
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Vendor &amp; Constitution</th>
                  <th className="px-6 py-4">PAN &amp; GST Details</th>
                  <th className="px-6 py-4">Bank Account Details</th>
                  <th className="px-6 py-4">KYC Document</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredVendors.map((vendor) => {
                  const isActionOpen = actionVendorId === vendor.id;
                  return (
                    <tr
                      key={vendor.id}
                      className="hover:bg-slate-50/30 transition-colors align-top"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 text-sm leading-snug">
                          {vendor.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{vendor.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{vendor.phone}</div>
                        {vendor.kycDetails?.companyType && (
                          <span className="inline-block mt-2 bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">
                            {vendor.kycDetails.companyType}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div>
                            <span className="text-[10px] text-slate-400 block leading-none">
                              PAN Number
                            </span>
                            <strong className="font-mono text-slate-800 font-bold uppercase">
                              {vendor.kycDetails?.panNumber || "Not Provided"}
                            </strong>
                          </div>
                          <div className="pt-1">
                            <span className="text-[10px] text-slate-400 block leading-none">
                              GST Number
                            </span>
                            <strong className="font-mono text-slate-800 font-bold uppercase">
                              {vendor.gstNumber || "Not Provided"}
                            </strong>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {vendor.kycDetails ? (
                          <div className="space-y-1">
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-none">
                                Bank Name
                              </span>
                              <span className="font-semibold text-slate-800">
                                {vendor.kycDetails.bankName}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-none">
                                A/C Number
                              </span>
                              <span className="font-mono text-slate-800 font-bold">
                                {vendor.kycDetails.accountNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-none">
                                IFSC Code
                              </span>
                              <span className="font-mono text-slate-800 font-bold">
                                {vendor.kycDetails.ifscCode}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Payee:{" "}
                              <strong className="text-slate-600">
                                {vendor.kycDetails.beneficiaryName}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No banking details</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {vendor.kycDetails?.kycDocPath ? (
                          <div className="space-y-1.5">
                            <div
                              className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]"
                              title={vendor.kycDetails.kycDocName}
                            >
                              {vendor.kycDetails.kycDocName}
                            </div>
                            <a
                              href={`/api/vendors/kyc/download/${vendor.id}`}
                              target="_blank"
                              rel="noreferrer"
                              referrerPolicy="no-referrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-lg hover:underline transition-all cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5 stroke-[2]" />
                              View Document
                            </a>

                            {vendor.kycDetails.panDocPath && (
                              <div className="pt-1.5 mt-1.5 border-t border-slate-100/60 flex flex-col gap-1">
                                <span className="text-[9px] text-slate-400 font-medium block leading-none">
                                  PAN Card:
                                </span>
                                <a
                                  href={`/api/vendors/kyc/download/${vendor.id}?docType=pan`}
                                  target="_blank"
                                  rel="noreferrer"
                                  referrerPolicy="no-referrer"
                                  className="text-[10px] text-violet-600 hover:text-violet-700 hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <FileText className="w-3 h-3" />
                                  {vendor.kycDetails.panDocName || "pan_card.pdf"}
                                </a>
                              </div>
                            )}

                            {vendor.kycDetails.gstDocPath && (
                              <div className="pt-1.5 mt-1.5 border-t border-slate-100/60 flex flex-col gap-1">
                                <span className="text-[9px] text-slate-400 font-medium block leading-none">
                                  GST Certificate:
                                </span>
                                <a
                                  href={`/api/vendors/kyc/download/${vendor.id}?docType=gst`}
                                  target="_blank"
                                  rel="noreferrer"
                                  referrerPolicy="no-referrer"
                                  className="text-[10px] text-violet-600 hover:text-violet-700 hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <FileText className="w-3 h-3" />
                                  {vendor.kycDetails.gstDocName || "gst_certificate.pdf"}
                                </a>
                              </div>
                            )}

                            {vendor.kycDetails.msmeDocPath && (
                              <div className="pt-1.5 mt-1.5 border-t border-slate-100/60 flex flex-col gap-1">
                                <span className="text-[9px] text-slate-400 font-medium block leading-none">
                                  MSME Certificate:
                                </span>
                                <a
                                  href={`/api/vendors/kyc/download/${vendor.id}?docType=msme`}
                                  target="_blank"
                                  rel="noreferrer"
                                  referrerPolicy="no-referrer"
                                  className="text-[10px] text-violet-600 hover:text-violet-700 hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <FileText className="w-3 h-3" />
                                  {vendor.kycDetails.msmeDocName || "msme_registration.pdf"}
                                </a>
                              </div>
                            )}

                            {vendor.kycDetails.otherDocPath && (
                              <div className="pt-1.5 mt-1.5 border-t border-slate-100/60 flex flex-col gap-1">
                                <span className="text-[9px] text-slate-400 font-medium block leading-none">
                                  Other Doc:
                                </span>
                                <a
                                  href={`/api/vendors/kyc/download/${vendor.id}?docType=other`}
                                  target="_blank"
                                  rel="noreferrer"
                                  referrerPolicy="no-referrer"
                                  className="text-[10px] text-violet-600 hover:text-violet-700 hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <FileText className="w-3 h-3" />
                                  {vendor.kycDetails.otherDocName || "other_document.pdf"}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No document</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-sm ${
                            vendor.kycStatus === "verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : vendor.kycStatus === "pending_verification"
                                ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                                : vendor.kycStatus === "rejected"
                                  ? "bg-red-50 text-red-700 border-red-100"
                                  : "bg-gray-50 text-gray-500 border-gray-100"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              vendor.kycStatus === "verified"
                                ? "bg-emerald-500"
                                : vendor.kycStatus === "pending_verification"
                                  ? "bg-amber-500"
                                  : vendor.kycStatus === "rejected"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                            }`}
                          />
                          {vendor.kycStatus === "verified"
                            ? "Verified / Approved"
                            : vendor.kycStatus === "pending_verification"
                              ? "Pending Review"
                              : vendor.kycStatus === "rejected"
                                ? "Rejected"
                                : "Pending Submission"}
                        </span>
                        {vendor.kycStatus === "rejected" && vendor.kycDetails?.remarks && (
                          <div className="mt-2 text-[10px] text-red-600 bg-red-50/50 p-2 rounded-lg border border-red-100 max-w-[180px] break-words">
                            Remarks: &quot;{vendor.kycDetails.remarks}&quot;
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {vendor.kycStatus === "pending_verification" ? (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                disabled={isVerifying}
                                onClick={() => void handleVerify(vendor.id, "verified")}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionVendorId(isActionOpen ? null : vendor.id);
                                  setRejectRemarks("");
                                }}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>

                            {isActionOpen && (
                              <div className="text-left mt-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 max-w-xs shadow-lg">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                  Reason for Rejection
                                </span>
                                <textarea
                                  value={rejectRemarks}
                                  onChange={(e) => setRejectRemarks(e.target.value)}
                                  placeholder="Enter brief reason for rejection..."
                                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 bg-white"
                                  rows={2}
                                  required
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setActionVendorId(null)}
                                    className="px-2 py-1 text-[10px] bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-700"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleVerify(vendor.id, "rejected", rejectRemarks)
                                    }
                                    disabled={!rejectRemarks.trim() || isVerifying}
                                    className="px-2.5 py-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded font-bold disabled:opacity-50"
                                  >
                                    Confirm Reject
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              disabled={isVerifying || !vendor.kycStatus}
                              onClick={() =>
                                void handleVerify(
                                  vendor.id,
                                  vendor.kycStatus === "verified" ? "rejected" : "verified",
                                  "Status overridden by Admin"
                                )
                              }
                              className="text-[10px] text-gray-500 hover:text-slate-800 font-medium hover:underline cursor-pointer disabled:opacity-50"
                            >
                              Override Status
                            </button>
                          </div>
                        )}
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
}

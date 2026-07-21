"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  FileDown,
  FileText,
  FolderOpen,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { ListPagination } from "@/src/components/ListPagination";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
import type { KYCDetails, Vendor } from "@/src/types";

type KycStatusFilter = "all" | "pending" | "verified" | "rejected";

type AdminKycTabProps = {
  refreshKey: number | string;
  onRefresh: () => void;
};

type KycDocLink = {
  docType: "pan" | "gst" | "msme" | "other";
  label: string;
  name?: string;
  path?: string;
};

function statusFilterToKycStatus(filter: KycStatusFilter): string | undefined {
  if (filter === "pending") return "pending_verification";
  if (filter === "verified") return "verified";
  if (filter === "rejected") return "rejected";
  return undefined;
}

function getKycStatusLabel(status?: Vendor["kycStatus"]): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending_verification":
      return "Pending review";
    case "rejected":
      return "Rejected";
    case "pending_submission":
      return "Incomplete";
    default:
      return "Unknown";
  }
}

function getKycStatusBadgeClass(status?: Vendor["kycStatus"]): string {
  switch (status) {
    case "verified":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "pending_verification":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-gray-50 text-gray-600 border-gray-100";
  }
}

function formatKycDate(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getSupplementaryDocs(details?: KYCDetails): KycDocLink[] {
  if (!details) return [];
  const docs: KycDocLink[] = [
    { docType: "pan", label: "PAN", name: details.panDocName, path: details.panDocPath },
    { docType: "gst", label: "GST", name: details.gstDocName, path: details.gstDocPath },
    { docType: "msme", label: "MSME", name: details.msmeDocName, path: details.msmeDocPath },
    { docType: "other", label: "Other", name: details.otherDocName, path: details.otherDocPath },
  ];
  return docs.filter((doc) => Boolean(doc.path));
}

function DetailField({
  label,
  value,
  mono = false,
  fallback = "Not provided",
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  fallback?: string;
}) {
  const display = value?.trim() ? value : fallback;
  const isMissing = !value?.trim();

  return (
    <div>
      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-0.5">
        {label}
      </span>
      <span
        className={`text-[11px] block leading-snug ${
          isMissing
            ? "text-gray-400 italic"
            : mono
              ? "font-mono font-semibold text-gray-900 uppercase"
              : "font-semibold text-gray-800"
        }`}
      >
        {display}
      </span>
    </div>
  );
}

export default function AdminKycTab({ refreshKey, onRefresh }: AdminKycTabProps) {
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [actionVendorId, setActionVendorId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const filterKey = `${statusFilter}|${search}`;
  const listRefreshKey = `${refreshKey}|${filterKey}`;

  const buildUrl = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      const q = search.trim();
      if (q) params.set("search", q);
      const kycStatus = statusFilterToKycStatus(statusFilter);
      if (kycStatus) params.set("kycStatus", kycStatus);
      return `/api/vendors?${params.toString()}`;
    },
    [search, statusFilter]
  );

  const {
    items,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    setLimit,
    reload,
    meta,
  } = usePaginatedList<Vendor>({
    buildUrl,
    refreshKey: listRefreshKey,
  });

  useResetPageOnFilterChange(filterKey, setPage);

  const kycCounts = (meta.kycCounts as Record<string, number> | undefined) || {};
  const pendingCount = kycCounts.pending_verification || 0;
  const verifiedCount = kycCounts.verified || 0;
  const rejectedCount = kycCounts.rejected || 0;
  const allCount = kycCounts.All || 0;

  const activeSearch = search.trim();

  const statusFilterLabel = useMemo(() => {
    switch (statusFilter) {
      case "pending":
        return "Pending review";
      case "verified":
        return "Verified";
      case "rejected":
        return "Rejected";
      default:
        return "All statuses";
    }
  }, [statusFilter]);

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
      reload({ silent: true });
      onRefresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred during verification.";
      setVerifyError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const kpiCardClass = (filter: KycStatusFilter, accent: string) =>
    `p-5 rounded-2xl border shadow-sm text-left cursor-pointer transition-all hover:-translate-y-0.5 ${
      statusFilter === filter
        ? `${accent} ring-2 ring-offset-1 ring-orange-400`
        : accent.replace("/50", "/30")
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-950">KYC Verification</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review vendor identity, tax, and banking documents before enabling uploads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={kpiCardClass("pending", "bg-amber-50/50 border-amber-100")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Pending review
              </span>
              <p className="text-2xl font-black text-amber-700 mt-1 tabular-nums">
                {pendingCount}
              </p>
              <p className="text-[10px] text-amber-600/80 mt-1">Awaiting admin action</p>
            </div>
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("verified")}
          className={kpiCardClass("verified", "bg-emerald-50/50 border-emerald-100")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Verified
              </span>
              <p className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
                {verifiedCount}
              </p>
              <p className="text-[10px] text-emerald-600/80 mt-1">Approved vendors</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={kpiCardClass("rejected", "bg-rose-50/50 border-rose-100")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                Rejected
              </span>
              <p className="text-2xl font-black text-rose-700 mt-1 tabular-nums">
                {rejectedCount}
              </p>
              <p className="text-[10px] text-rose-600/80 mt-1">Needs resubmission</p>
            </div>
            <ShieldX className="w-5 h-5 text-rose-600 shrink-0" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={kpiCardClass("all", "bg-white border-gray-100")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                All records
              </span>
              <p className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{allCount}</p>
              <p className="text-[10px] text-gray-500 mt-1">Every KYC submission</p>
            </div>
            <Shield className="w-5 h-5 text-gray-500 shrink-0" />
          </div>
        </button>
      </div>

      {(verifyError || error) && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold">
          {verifyError || error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white via-violet-50/20 to-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search vendor, email, PAN, GST…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
                />
              </div>
              <div className="text-[11px] text-gray-500 font-medium">
                {loading ? (
                  "Loading KYC records…"
                ) : total === 0 ? (
                  "No matching records"
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-gray-800 tabular-nums">
                      {items.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-800 tabular-nums">{total}</span> ·{" "}
                    {statusFilterLabel}
                  </>
                )}
              </div>
            </div>
          </div>

          {activeSearch && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100/80">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Search:
              </span>
              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                &quot;{activeSearch}&quot;
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            <p className="text-xs font-medium">Loading KYC records…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-6 text-gray-400">
            <FolderOpen className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No KYC records found</p>
            <p className="text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              Try another status filter or search term. Vendors appear here after submitting KYC
              from the portal.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left">
                <thead className="bg-gray-50/90 sticky top-0 z-[1] backdrop-blur-sm">
                  <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 sm:px-6 py-3">Vendor</th>
                    <th className="px-4 sm:px-6 py-3 hidden md:table-cell">Tax IDs</th>
                    <th className="px-4 sm:px-6 py-3 hidden lg:table-cell">Banking</th>
                    <th className="px-4 sm:px-6 py-3 hidden xl:table-cell">Documents</th>
                    <th className="px-4 sm:px-6 py-3">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs bg-white">
                  {items.map((vendor) => {
                    const isActionOpen = actionVendorId === vendor.id;
                    const details = vendor.kycDetails;
                    const extraDocs = getSupplementaryDocs(details);
                    const submittedOn = formatKycDate(details?.submittedAt);
                    const verifiedOn = formatKycDate(details?.verifiedAt);

                    return (
                      <tr
                        key={vendor.id}
                        className="group hover:bg-violet-50/20 transition-colors align-top"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="min-w-[160px] max-w-[220px]">
                            <div
                              className="font-semibold text-gray-900 text-sm leading-snug truncate"
                              title={vendor.name}
                            >
                              {vendor.name}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate mt-0.5">
                              {vendor.email}
                            </div>
                            {vendor.phone && (
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                {vendor.phone}
                              </div>
                            )}
                            {details?.companyType && (
                              <span className="inline-flex mt-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                                {details.companyType}
                              </span>
                            )}
                            {(submittedOn || verifiedOn) && (
                              <div className="mt-2 space-y-0.5 text-[9px] text-gray-400">
                                {submittedOn && <p>Submitted {submittedOn}</p>}
                                {verifiedOn && <p>Verified {verifiedOn}</p>}
                              </div>
                            )}

                            <div className="md:hidden mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
                              <DetailField
                                label="PAN"
                                value={details?.panNumber}
                                mono
                              />
                              <DetailField
                                label="GST"
                                value={vendor.gstNumber}
                                mono
                              />
                              {details?.bankName && (
                                <DetailField label="Bank" value={details.bankName} />
                              )}
                              {details?.kycDocPath && (
                                <a
                                  href={`/api/vendors/kyc/download/${vendor.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:underline"
                                >
                                  <FileDown className="w-3 h-3" />
                                  View primary KYC doc
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                          <div className="space-y-2.5 min-w-[130px]">
                            <DetailField label="PAN" value={details?.panNumber} mono />
                            <DetailField label="GST" value={vendor.gstNumber} mono />
                          </div>
                        </td>

                        <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                          {details ? (
                            <div className="space-y-2 min-w-[150px]">
                              <DetailField label="Bank" value={details.bankName} />
                              <DetailField
                                label="Account"
                                value={details.accountNumber}
                                mono
                              />
                              <DetailField label="IFSC" value={details.ifscCode} mono />
                              <DetailField
                                label="Beneficiary"
                                value={details.beneficiaryName}
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">
                              No banking details
                            </span>
                          )}
                        </td>

                        <td className="px-4 sm:px-6 py-4 hidden xl:table-cell">
                          {details?.kycDocPath ? (
                            <div className="space-y-2 min-w-[160px] max-w-[200px]">
                              <div>
                                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-1">
                                  Primary KYC
                                </span>
                                <p
                                  className="text-[10px] text-gray-600 truncate mb-1.5"
                                  title={details.kycDocName}
                                >
                                  {details.kycDocName}
                                </p>
                                <a
                                  href={`/api/vendors/kyc/download/${vendor.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  referrerPolicy="no-referrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold rounded-lg text-[10px] transition-colors"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  Open document
                                </a>
                              </div>

                              {extraDocs.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block">
                                    Supporting ({extraDocs.length})
                                  </span>
                                  {extraDocs.map((doc) => (
                                    <a
                                      key={doc.docType}
                                      href={`/api/vendors/kyc/download/${vendor.id}?docType=${doc.docType}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-violet-700 transition-colors"
                                      title={doc.name}
                                    >
                                      <FileText className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        {doc.label}: {doc.name || `${doc.docType}.pdf`}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">No documents</span>
                          )}
                        </td>

                        <td className="px-4 sm:px-6 py-4">
                          <div className="max-w-[200px]">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getKycStatusBadgeClass(vendor.kycStatus)}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  vendor.kycStatus === "verified"
                                    ? "bg-emerald-500"
                                    : vendor.kycStatus === "pending_verification"
                                      ? "bg-amber-500"
                                      : vendor.kycStatus === "rejected"
                                        ? "bg-rose-500"
                                        : "bg-gray-400"
                                }`}
                              />
                              {getKycStatusLabel(vendor.kycStatus)}
                            </span>

                            {vendor.kycStatus === "rejected" && details?.remarks && (
                              <p
                                className="mt-2 text-[10px] text-rose-700 bg-rose-50/80 p-2 rounded-lg border border-rose-100 leading-snug line-clamp-3"
                                title={details.remarks}
                              >
                                {details.remarks}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 sm:px-6 py-4 text-right">
                          {vendor.kycStatus === "pending_verification" ? (
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex flex-wrap gap-1.5 justify-end">
                                <button
                                  type="button"
                                  disabled={isVerifying}
                                  onClick={() => void handleVerify(vendor.id, "verified")}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionVendorId(isActionOpen ? null : vendor.id);
                                    setRejectRemarks("");
                                  }}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>

                              {isActionOpen && (
                                <div className="text-left mt-1 p-3.5 bg-white border border-gray-200 rounded-xl space-y-2.5 w-full max-w-xs shadow-lg">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase block">
                                    Rejection reason
                                  </span>
                                  <textarea
                                    value={rejectRemarks}
                                    onChange={(e) => setRejectRemarks(e.target.value)}
                                    placeholder="Brief reason for the vendor…"
                                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-400 bg-gray-50/50"
                                    rows={3}
                                    required
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setActionVendorId(null)}
                                      className="px-2.5 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleVerify(vendor.id, "rejected", rejectRemarks)
                                      }
                                      disabled={!rejectRemarks.trim() || isVerifying}
                                      className="px-2.5 py-1 text-[10px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                                    >
                                      Confirm reject
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
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
                              className="text-[10px] text-gray-500 hover:text-gray-800 font-semibold hover:underline cursor-pointer disabled:opacity-50 opacity-80 group-hover:opacity-100"
                            >
                              Override status
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 bg-gray-50/30">
              <ListPagination
                page={page}
                pageSize={limit}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setLimit}
                accent="orange"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

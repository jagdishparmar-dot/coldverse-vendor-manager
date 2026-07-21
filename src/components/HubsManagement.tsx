"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  MapPin,
  Layers,
  Upload,
  AlertCircle,
  CheckCircle2,
  Search,
  Pencil,
  Loader2,
  Download,
  HelpCircle,
} from "lucide-react";
import { Hub, Vendor } from "../types";
import { INDIAN_STATES } from "../constants";
import {
  HUB_BULK_CSV_FILENAME,
  HUB_BULK_CSV_HEADERS,
  HUB_BULK_CSV_TEMPLATE_PATH,
  buildHubBulkCsvContent,
  parseHubBulkText,
} from "../constants/hubBulkCsv";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { ListPagination } from "@/src/components/ListPagination";
import {
  usePaginatedList,
  useResetPageOnFilterChange,
} from "@/src/hooks/usePaginatedList";
import { getStateCodeFromName, isValidGstin } from "@/src/utils/gst";

interface HubsManagementProps {
  /** Optional — used only for per-hub vendor count column; may be empty. */
  vendors?: Vendor[];
  onHubsUpdated: () => void;
}

const emptyHubForm = {
  name: "",
  code: "",
  state: "",
  address: "",
  city: "",
  pincode: "",
  gstin: "",
  billingAddress: "",
};

export default function HubsManagement({
  vendors = [],
  onHubsUpdated,
}: HubsManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<"list" | "single" | "bulk">("list");
  const [editingHubId, setEditingHubId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyHubForm });
  const [bulkText, setBulkText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [isDraggingBulkFile, setIsDraggingBulkFile] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const filterKey = `${searchQuery}|${stateFilter}`;

  const buildUrl = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      const q = searchQuery.trim();
      if (q) params.set("search", q);
      if (stateFilter && stateFilter !== "All") {
        params.set("state", stateFilter);
      }
      return `/api/hubs?${params.toString()}`;
    },
    [searchQuery, stateFilter]
  );

  const {
    items: hubs,
    total,
    page,
    limit,
    loading: isLoading,
    error: listError,
    setPage,
    setLimit,
    reload,
  } = usePaginatedList<Hub>({
    buildUrl,
    refreshKey: filterKey,
  });

  useResetPageOnFilterChange(filterKey, setPage);

  const reloadList = () => {
    reload();
  };

  const clearNotifications = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setBulkErrors([]);
  };

  const startCreate = () => {
    setEditingHubId(null);
    setForm({ ...emptyHubForm });
    setActiveSubTab("single");
    clearNotifications();
  };

  const startEdit = (hub: Hub) => {
    setEditingHubId(hub.id);
    setForm({
      name: hub.name,
      code: hub.code,
      state: hub.state,
      address: hub.address || "",
      city: hub.city || "",
      pincode: hub.pincode || "",
      gstin: hub.gstin || "",
      billingAddress: hub.billingAddress || "",
    });
    setActiveSubTab("single");
    clearNotifications();
  };

  const handleSaveHub = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();

    if (!form.name.trim() || !form.code.trim() || !form.state) {
      setErrorMsg("Hub name, code, and state are required.");
      return;
    }
    if (form.gstin.trim() && !isValidGstin(form.gstin)) {
      setErrorMsg("Hub GSTIN must be a valid 15-character GSTIN (or leave blank).");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        state: form.state,
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        gstin: form.gstin.trim(),
        billingAddress: form.billingAddress.trim(),
      };

      const res = await fetch(editingHubId ? `/api/hubs/${editingHubId}` : "/api/hubs", {
        method: editingHubId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save hub.");
      }

      setSuccessMsg(
        editingHubId
          ? `Updated hub: ${payload.name} (${payload.code})`
          : `Registered hub: ${payload.name} (${payload.code})`
      );
      setForm({ ...emptyHubForm });
      setEditingHubId(null);
      reloadList();
      onHubsUpdated();
      setActiveSubTab("list");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();

    if (!bulkText.trim()) {
      setErrorMsg("Please paste hub rows or load the CSV template.");
      return;
    }

    const { rows: hubsList, errors: parseErrors } = parseHubBulkText(bulkText);

    if (parseErrors.length > 0 && hubsList.length === 0) {
      setBulkErrors(parseErrors);
      setErrorMsg("Could not parse any valid hub rows.");
      return;
    }

    try {
      const res = await fetch("/api/hubs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubsList }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bulk upload failed.");
      }
      if (data.errors?.length) {
        setBulkErrors([...parseErrors, ...data.errors]);
        setErrorMsg("Bulk upload completed with some errors.");
      } else {
        if (parseErrors.length > 0) {
          setBulkErrors(parseErrors);
          setErrorMsg("Imported valid rows. Some lines were skipped.");
        } else {
          setSuccessMsg(data.message || "All hubs imported successfully!");
          setBulkText("");
          setActiveSubTab("list");
        }
      }
      reloadList();
      onHubsUpdated();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Bulk upload failed.");
    }
  };

  const downloadHubTemplate = () => {
    const content = buildHubBulkCsvContent();
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = HUB_BULK_CSV_FILENAME;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadHubTemplate = async () => {
    clearNotifications();
    try {
      const res = await fetch(HUB_BULK_CSV_TEMPLATE_PATH);
      const text = res.ok ? await res.text() : buildHubBulkCsvContent();
      setBulkText(text.trimEnd());
    } catch {
      setBulkText(buildHubBulkCsvContent().trimEnd());
    }
  };

  const applyBulkCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setBulkText(text.trimEnd());
      clearNotifications();
    };
    reader.readAsText(file);
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyBulkCsvFile(file);
    e.target.value = "";
  };

  const handleDeleteHub = async (hubId: string, hubName: string) => {
    if (!window.confirm(`Delete logistics hub: ${hubName}?`)) return;
    clearNotifications();
    try {
      const res = await fetch(`/api/hubs/${hubId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete hub.");
      }
      setSuccessMsg(`Deleted hub: ${hubName}`);
      reloadList();
      onHubsUpdated();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete hub.");
    }
  };

  const formStateCode = getStateCodeFromName(form.state) || "—";
  const displayError = errorMsg || listError;

  return (
    <div id="hubs-management-root" className="space-y-6">
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 rounded-xl">
            <MapPin className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Logistics Hubs + GST</h2>
            <p className="text-xs text-gray-500">
              Each hub can carry its own GSTIN and billing address for place-of-supply on vendor tax
              invoices.
            </p>
          </div>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 self-stretch md:self-auto justify-center">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("list");
              clearNotifications();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "list"
                ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            All Hubs ({total})
          </button>
          <button
            type="button"
            onClick={startCreate}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeSubTab === "single" && !editingHubId
                ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Plus className="w-3 h-3 text-violet-600" /> Add Hub
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("bulk");
              clearNotifications();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeSubTab === "bulk"
                ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Upload className="w-3 h-3 text-violet-600" /> Bulk Import
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {displayError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="font-semibold">{displayError}</span>
          </div>
          {bulkErrors.length > 0 && (
            <ul className="mt-2 pl-6 list-disc space-y-1 font-mono text-[10px] text-red-600/80 max-h-[150px] overflow-y-auto">
              {bulkErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeSubTab === "list" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search by name, code, state, or GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/20"
              />
            </div>
            <div className="w-full sm:w-52">
              <ColdverseSelect
                value={stateFilter}
                onValueChange={setStateFilter}
                variant="inline"
                options={[
                  { value: "All", label: "All States" },
                  ...INDIAN_STATES.map((state) => ({ value: state, label: state })),
                ]}
              />
            </div>
            {(searchQuery || stateFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStateFilter("All");
                }}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 px-3 py-2 rounded-lg border border-orange-100 bg-orange-50/50 whitespace-nowrap cursor-pointer"
              >
                Reset Hub Filters
              </button>
            )}
            <div className="text-[11px] text-gray-400 font-medium whitespace-nowrap self-center">
              {isLoading ? "Loading..." : `Showing ${hubs.length} of ${total}`}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                <p className="text-xs font-medium">Loading hubs...</p>
              </div>
            ) : hubs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Layers className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No logistics hubs found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/70">
                      <tr>
                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase">
                          Hub
                        </th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase">
                          State / Code
                        </th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase">
                          GSTIN
                        </th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase">
                          Address
                        </th>
                        <th className="px-5 py-3.5 text-center text-[10px] font-semibold text-gray-500 uppercase">
                          Vendors
                        </th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {hubs.map((hub) => {
                        const mappedVendorsCount = vendors.filter((v) =>
                          v.hubs?.includes(hub.id)
                        ).length;
                        return (
                          <tr key={hub.id} className="hover:bg-gray-50/30 align-top">
                            <td className="px-5 py-4">
                              <div className="text-sm font-semibold text-gray-900">{hub.name}</div>
                              <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                                {hub.code}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-600">
                              {hub.state}
                              <div className="text-[10px] text-gray-400 font-mono">
                                GST code {hub.stateCode || getStateCodeFromName(hub.state) || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {hub.gstin ? (
                                <span className="text-[11px] font-mono font-semibold text-violet-700">
                                  {hub.gstin}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">
                                  Not set — uses company GSTIN if same state
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-[11px] text-gray-500 max-w-[220px]">
                              <span className="whitespace-pre-line">
                                {hub.billingAddress ||
                                  [hub.address, hub.city, hub.pincode]
                                    .filter(Boolean)
                                    .join(", ") ||
                                  "—"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                                {mappedVendorsCount}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => startEdit(hub)}
                                className="text-gray-400 hover:text-violet-600 p-2 hover:bg-violet-50 rounded-lg"
                                title="Edit hub"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteHub(hub.id, hub.name)}
                                className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                title="Delete hub"
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
                <ListPagination
                  page={page}
                  pageSize={limit}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={setLimit}
                  accent="orange"
                />
              </>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "single" && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 max-w-3xl">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              {editingHubId ? "Edit Hub + GST" : "Register Hub + GST"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              GSTIN and address on the hub are used as Bill To / place of supply on vendor-generated
              tax invoices.
            </p>
          </div>

          <form onSubmit={(e) => void handleSaveHub(e)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Hub Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Hub Code *
                </label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  State / UT *
                </label>
                <ColdverseSelect
                  value={form.state}
                  onValueChange={(state) => setForm({ ...form, state })}
                  placeholder="Select state"
                  options={INDIAN_STATES.map((st) => ({ value: st, label: st }))}
                />
                <p className="text-[10px] text-gray-400">GST state code: {formStateCode}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Hub GSTIN
                </label>
                <input
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="15-char GSTIN for this state"
                  className={`w-full text-sm px-4 py-2.5 rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                    form.gstin && !isValidGstin(form.gstin)
                      ? "border-red-300 bg-red-50/40"
                      : "border-gray-200 bg-gray-50/30"
                  }`}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street / plot / area"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  City
                </label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Pincode
                </label>
                <input
                  value={form.pincode}
                  maxLength={6}
                  onChange={(e) =>
                    setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                  }
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Invoice Billing Address Override (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.billingAddress}
                  onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                  placeholder="If set, printed as Bill To address instead of composing from address/city/pincode"
                  className="w-full text-sm px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button
                type="submit"
                className="px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700"
              >
                {editingHubId ? "Update Hub" : "Save Hub"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("list");
                  setEditingHubId(null);
                }}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === "bulk" && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Bulk Import Hubs
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Download the CSV template, fill hub rows, then upload or paste to import in bulk.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadHubTemplate}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV template
                </button>
                <button
                  type="button"
                  onClick={() => void loadHubTemplate()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Load sample in editor
                </button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBulkFile(true);
                }}
                onDragLeave={() => setIsDraggingBulkFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingBulkFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) applyBulkCsvFile(file);
                }}
                onClick={() => bulkFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDraggingBulkFile
                    ? "border-violet-500 bg-violet-50/50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <input
                  type="file"
                  ref={bulkFileInputRef}
                  onChange={handleBulkFileChange}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-900">Drag & drop CSV file here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse from device</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  CSV template guide
                </p>
                <p className="text-[11px] text-gray-600 font-mono break-all">
                  {HUB_BULK_CSV_HEADERS.join(", ")}
                </p>
                <ul className="text-[11px] text-gray-600 space-y-1 list-disc pl-4">
                  <li>
                    <span className="font-semibold">Name, Code, State</span> are required on every
                    row.
                  </li>
                  <li>
                    <span className="font-semibold">Code</span> must be unique (e.g. AMD-01).
                  </li>
                  <li>
                    <span className="font-semibold">State</span> must match an Indian state/UT name
                    from the hub form.
                  </li>
                  <li>
                    <span className="font-semibold">GSTIN</span> is optional; leave blank if the hub
                    uses the company GSTIN for that state.
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-7">
              <form onSubmit={(e) => void handleCreateBulk(e)} className="space-y-4 h-full flex flex-col">
                <textarea
                  required
                  rows={14}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`${HUB_BULK_CSV_HEADERS.join(",")}\nAhmedabad Main Hub,AMD-01,Gujarat,SG Highway,Ahmedabad,380051,24AABCC0000A1Z5`}
                  className="w-full flex-1 min-h-[280px] text-sm font-mono p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/20"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 inline-flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <Upload className="w-4 h-4" /> Start Bulk Import
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

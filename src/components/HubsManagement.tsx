import React, { useState, useEffect } from "react";
import { Plus, Trash2, MapPin, Layers, Upload, Download, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { Hub, Vendor } from "../types";
import { INDIAN_STATES } from "../constants";
import { ColdverseSelect } from "@/src/components/coldverse-select";

interface HubsManagementProps {
  vendors: Vendor[];
  onHubsUpdated: () => void;
}

export default function HubsManagement({ vendors, onHubsUpdated }: HubsManagementProps) {
  // Local States
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"list" | "single" | "bulk">("list");
  
  // Single Hub Form State
  const [singleName, setSingleName] = useState("");
  const [singleCode, setSingleCode] = useState("");
  const [singleState, setSingleState] = useState("");
  
  // Bulk Hubs Form State
  const [bulkText, setBulkText] = useState("");
  
  // Notification states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  const fetchHubs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/hubs");
      if (res.ok) {
        const data = await res.json();
        setHubs(data);
      }
    } catch (err) {
      console.error("Failed to fetch hubs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  const clearNotifications = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setBulkErrors([]);
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();
    
    if (!singleName.trim() || !singleCode.trim() || !singleState) {
      setErrorMsg("All fields are required.");
      return;
    }

    try {
      const res = await fetch("/api/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: singleName.trim(),
          code: singleCode.trim().toUpperCase(),
          state: singleState
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create hub.");
      }

      setSuccessMsg(`Successfully registered Hub: ${singleName.trim()} (${singleCode.trim().toUpperCase()})`);
      setSingleName("");
      setSingleCode("");
      setSingleState("");
      fetchHubs();
      onHubsUpdated();
      setActiveSubTab("list");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotifications();

    if (!bulkText.trim()) {
      setErrorMsg("Please paste or type some hub details to upload.");
      return;
    }

    // Parse CSV-like / comma-separated input: Hub Name, Hub Code, State
    const lines = bulkText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const hubsList: any[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      // Allow commas or tabs as separators
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length < 3) {
        errors.push(`Line ${index + 1}: Expected 3 values (Name, Code, State), got ${parts.length}.`);
        return;
      }
      const [name, code, state] = parts;
      if (!name) {
        errors.push(`Line ${index + 1}: Hub Name is missing.`);
        return;
      }
      if (!code) {
        errors.push(`Line ${index + 1}: Hub Code is missing.`);
        return;
      }
      if (!state) {
        errors.push(`Line ${index + 1}: State is missing.`);
        return;
      }

      // Check if state is in our recognized list
      const matchedState = INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase()) || state;

      hubsList.push({
        name,
        code: code.toUpperCase(),
        state: matchedState
      });
    });

    if (errors.length > 0) {
      setBulkErrors(errors);
      setErrorMsg("Failed to parse some rows. Please correct and retry.");
      return;
    }

    try {
      const res = await fetch("/api/hubs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubsList })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bulk upload failed.");
      }

      if (data.errors && data.errors.length > 0) {
        setBulkErrors(data.errors);
        setErrorMsg("Bulk upload completed with some errors.");
      } else {
        setSuccessMsg(data.message || "All hubs imported successfully!");
        setBulkText("");
        setActiveSubTab("list");
      }
      fetchHubs();
      onHubsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Bulk upload failed.");
    }
  };

  const handleDeleteHub = async (hubId: string, hubName: string) => {
    if (!window.confirm(`Are you sure you want to delete the logistics hub: ${hubName}?`)) {
      return;
    }
    clearNotifications();

    try {
      const res = await fetch(`/api/hubs/${hubId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete hub.");
      }

      setSuccessMsg(`Successfully deleted Hub: ${hubName}`);
      fetchHubs();
      onHubsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete hub.");
    }
  };

  // Filter hubs based on search
  const filteredHubs = hubs.filter(h => {
    const q = searchQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.code.toLowerCase().includes(q) ||
      h.state.toLowerCase().includes(q)
    );
  });

  return (
    <div id="hubs-management-root" className="space-y-6">
      
      {/* Overview Intro Card */}
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-violet-50 rounded-xl">
              <MapPin className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Logistics Hubs Console</h2>
              <p className="text-xs text-gray-500">
                Configure and map regional transit hubs. Assign hubs to vendors to govern automated regional billing rules.
              </p>
            </div>
          </div>
        </div>

        {/* Console Action Tabs */}
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-150 self-stretch md:self-auto justify-center">
          <button
            onClick={() => { setActiveSubTab("list"); clearNotifications(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "list"
                ? "bg-white text-gray-900 shadow-xs border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            All Hubs ({hubs.length})
          </button>
          <button
            onClick={() => { setActiveSubTab("single"); clearNotifications(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeSubTab === "single"
                ? "bg-white text-gray-900 shadow-xs border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Plus className="w-3 h-3 text-violet-600" /> Add Hub
          </button>
          <button
            onClick={() => { setActiveSubTab("bulk"); clearNotifications(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeSubTab === "bulk"
                ? "bg-white text-gray-900 shadow-xs border border-gray-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Upload className="w-3 h-3 text-violet-600" /> Bulk Import
          </button>
        </div>
      </div>

      {/* Global Alert messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 flex flex-col gap-2 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
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

      {/* RENDER ACTIVE SUBTAB CONTENT */}

      {activeSubTab === "list" && (
        <div className="space-y-4">
          
          {/* Search bar */}
          <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search hubs by name, transit code or operating state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/20"
              />
            </div>
            <div className="text-[11px] text-gray-400 font-medium whitespace-nowrap self-center">
              Showing {filteredHubs.length} of {hubs.length} hubs
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {filteredHubs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Layers className="w-12 h-12 stroke-[1.2] mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No logistics hubs found</p>
                <p className="text-xs mt-1">Add regional hub details individually or in bulk to authorize them.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/70">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Transit Hub Detail
                      </th>
                      <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Regional Code
                      </th>
                      <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Operating State
                      </th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Mapped Vendors
                      </th>
                      <th className="px-6 py-3.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredHubs.map((hub) => {
                      // Count of vendors mapped to this hub ID
                      const mappedVendorsCount = vendors.filter(v => v.hubs?.includes(hub.id)).length;
                      
                      return (
                        <tr key={hub.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-violet-600" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">
                                  {hub.name}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  ID: {hub.id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono font-bold bg-gray-50 text-gray-700 px-2.5 py-1 rounded-md border border-gray-150">
                              {hub.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs text-gray-600 font-medium">
                              {hub.state}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              mappedVendorsCount > 0 
                                ? "bg-violet-50 text-violet-700 border border-violet-100" 
                                : "bg-gray-50 text-gray-400 border border-gray-100"
                            }`}>
                              {mappedVendorsCount} Vendors
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                            <button
                              onClick={() => handleDeleteHub(hub.id, hub.name)}
                              className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50/50 rounded-lg transition-colors"
                              title="Delete Hub"
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
      )}

      {activeSubTab === "single" && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 max-w-2xl">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Register Single Hub</h3>
            <p className="text-xs text-gray-500 mt-0.5">Input the specific name, airport/transit code, and state location for the logistics hub.</p>
          </div>

          <form onSubmit={handleCreateSingle} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Hub Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surat Transit Hub"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Hub Code / Transit Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STV-01"
                  value={singleCode}
                  onChange={(e) => setSingleCode(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/30 uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">State / UT *</label>
                <ColdverseSelect
                  value={singleState}
                  onValueChange={setSingleState}
                  placeholder="-- Select Hub State / UT --"
                  options={INDIAN_STATES.map((st) => ({ value: st, label: st }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button
                type="submit"
                className="px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Save Logistics Hub
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("list")}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
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
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Bulk Import Hubs</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Input multiple hubs easily by pasting comma-separated or tab-separated lines. Format each line exactly as:
            </p>
            <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-150 font-mono text-[11px] text-gray-600">
              <span className="text-violet-600 font-semibold">Format:</span> Hub Name, Hub Code, State<br/>
              <span className="text-gray-400">Example lines:</span><br/>
              Surat Main Hub, STV-01, Gujarat<br/>
              Pune Distribution Centre, PNQ-02, Maharashtra<br/>
              Kolkata Air Cargo Terminal, CCU-05, West Bengal
            </div>
          </div>

          <form onSubmit={handleCreateBulk} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Paste Hub Details *</label>
              <textarea
                required
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste lines here..."
                className="w-full text-sm font-mono p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-gray-50/20"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-50">
              <button
                type="submit"
                className="px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> Start Bulk Import
              </button>
              <button
                type="button"
                onClick={() => setBulkText("")}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear Input
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("list")}
                className="px-5 py-2.5 border border-transparent text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors ml-auto"
              >
                Go Back
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

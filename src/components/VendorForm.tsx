import React, { useState, useEffect } from "react";
import { Plus, X, UserCheck, AlertCircle, MapPin } from "lucide-react";
import { Vendor, Hub } from "../types";
import { INDIAN_STATES } from "../constants";
import { ColdverseSelect } from "@/src/components/coldverse-select";

interface VendorFormProps {
  vendor?: Vendor;
  onSuccess: (updatedVendor: Vendor) => void;
  onClose: () => void;
}

export default function VendorForm({ vendor, onSuccess, onClose }: VendorFormProps) {
  const [name, setName] = useState(vendor?.name || "");
  const [email, setEmail] = useState(vendor?.email || "");
  const [phone, setPhone] = useState(vendor?.phone || "");
  const [gstNumber, setGstNumber] = useState(vendor?.gstNumber || "");
  const [selectedStates, setSelectedStates] = useState<string[]>(vendor?.states || (vendor?.state ? [vendor.state] : []));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(vendor?.categories || []);
  const [availableHubs, setAvailableHubs] = useState<Hub[]>([]);
  const [selectedHubs, setSelectedHubs] = useState<string[]>(vendor?.hubs || []);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredHubsForState = availableHubs.filter(h => selectedStates.includes(h.state));

  const handleAddState = (st: string) => {
    if (st && !selectedStates.includes(st)) {
      setSelectedStates([...selectedStates, st]);
    }
  };

  const handleRemoveState = (stToRemove: string) => {
    const updated = selectedStates.filter((st) => st !== stToRemove);
    setSelectedStates(updated);

    // Also remove from selectedHubs any hub whose state is no longer in updated states
    const remainingHubs = availableHubs.filter(h => updated.includes(h.state));
    const remainingHubIds = remainingHubs.map(h => h.id);
    setSelectedHubs(selectedHubs.filter(id => remainingHubIds.includes(id)));
  };

  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "Rent",
    "Manpower",
    "Vehicle rent",
    "Repairs & maintenance",
    "Electricity",
    "Others"
  ]);

  useEffect(() => {
    // Fetch categories
    fetch("/api/categories")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        setAvailableCategories(data);
        if (!vendor) {
          // Pre-select all categories by default to support "All category allowed to all vendors"
          setSelectedCategories(data);
        }
      })
      .catch(() => {
        if (!vendor) {
          // Fallback
          setSelectedCategories([
            "Rent",
            "Manpower",
            "Vehicle rent",
            "Repairs & maintenance",
            "Electricity",
            "Others"
          ]);
        }
      });

    // Fetch hubs (compact options list — /api/hubs alone returns a paginated envelope)
    fetch("/api/hubs?options=1")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        setAvailableHubs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load hubs:", err);
        setAvailableHubs([]);
      });
  }, []);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const selectAllCategories = () => {
    setSelectedCategories(availableCategories);
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  const toggleHub = (hubId: string) => {
    if (selectedHubs.includes(hubId)) {
      setSelectedHubs(selectedHubs.filter((id) => id !== hubId));
    } else {
      setSelectedHubs([...selectedHubs, hubId]);
    }
  };

  const selectAllHubs = () => {
    const filteredIds = filteredHubsForState.map(h => h.id);
    setSelectedHubs(Array.from(new Set([...selectedHubs, ...filteredIds])));
  };

  const clearAllHubs = () => {
    const filteredIds = filteredHubsForState.map(h => h.id);
    setSelectedHubs(selectedHubs.filter(id => !filteredIds.includes(id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Vendor name is required.");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Phone number is required.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (selectedCategories.length === 0) {
      setErrorMessage("Please select at least one billing category.");
      return;
    }

    // Validate GST format if provided (standard 15-character alphanumeric GST format)
    if (gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber.trim().toUpperCase())) {
      setErrorMessage("Please enter a valid 15-digit GST Number (e.g. 24AAAAC1234A1Z1).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const url = vendor ? `/api/vendors/${vendor.id}` : "/api/vendors";
      const method = vendor ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          categories: selectedCategories,
          gstNumber: gstNumber.trim().toUpperCase(),
          state: selectedStates.join(", "),
          states: selectedStates,
          hubs: selectedHubs
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${vendor ? "update" : "create"} vendor account.`);
      }

      const savedVendor = await response.json();
      onSuccess(savedVendor);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="vendor-form-container" className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-900">
            {vendor ? "Edit Vendor Details" : "Register New Vendor"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {vendor ? "Modify operating State, assigned Hubs, and categories." : "Setup GST, operating State, assigned Hubs, and billing category limits."}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Vendor Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Vendor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aman Logistics Ltd"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/30"
            />
          </div>

          {/* Vendor Contact Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Billing Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. invoices@amanlogistics.com"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/30"
            />
          </div>

          {/* Vendor Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/30"
            />
          </div>

          {/* GST Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="e.g. 24AAAAC1234A1Z1"
              maxLength={15}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50/30 uppercase font-mono"
            />
          </div>

          {/* State (Indian States list multi-select dropdown) */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex justify-between items-center">
              <span>Operating States / UTs (Optional)</span>
              {selectedStates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStates([]);
                    setSelectedHubs([]);
                  }}
                  className="text-[10px] font-bold text-violet-600 hover:underline normal-case"
                >
                  Clear All States
                </button>
              )}
            </label>
            <ColdverseSelect
              value=""
              onValueChange={handleAddState}
              placeholder="-- Add Indian State / UT --"
              options={INDIAN_STATES.filter((st) => !selectedStates.includes(st)).map((st) => ({
                value: st,
                label: st,
              }))}
            />

            {selectedStates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-[100px] overflow-y-auto p-1 bg-gray-50/50 rounded-xl border border-gray-100">
                {selectedStates.map((st) => (
                  <span
                    key={st}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-2.5 py-1 rounded-full"
                  >
                    {st}
                    <button
                      type="button"
                      onClick={() => handleRemoveState(st)}
                      className="text-violet-400 hover:text-violet-600 transition-colors focus:outline-none ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Hubs */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-violet-600" />
              Assign Hubs
            </label>
            {selectedStates.length > 0 && filteredHubsForState.length > 0 && (
              <div className="flex gap-2 text-[11px] font-medium text-violet-600">
                <button type="button" onClick={selectAllHubs} className="hover:underline">Assign All ({filteredHubsForState.length})</button>
                <span className="text-gray-300">•</span>
                <button type="button" onClick={clearAllHubs} className="hover:underline">Clear All</button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Select the localized logistics hubs this vendor is associated with. Showing only hubs within the selected states.
          </p>

          {selectedStates.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-500">
              Please select one or more operating States above to view and assign regional transit hubs.
            </div>
          ) : filteredHubsForState.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl text-center text-xs text-gray-500">
              No regional hubs registered in the selected state(s) ({selectedStates.join(", ")}). Register new transit hubs in the Hubs Console.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto p-1 border border-gray-100 rounded-xl">
              {filteredHubsForState.map((hub) => {
                const isSelected = selectedHubs.includes(hub.id);
                return (
                  <button
                    type="button"
                    key={hub.id}
                    onClick={() => toggleHub(hub.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? "border-violet-500 bg-violet-50/50 text-violet-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-semibold truncate">{hub.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{hub.code} • {hub.state}</span>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Permissions */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Allowed Invoice Categories <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 text-[11px] font-medium text-violet-600">
              <button type="button" onClick={selectAllCategories} className="hover:underline">Select All</button>
              <span className="text-gray-300">•</span>
              <button type="button" onClick={clearAllCategories} className="hover:underline">Clear All</button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Define which categories this vendor is permitted to select when uploading invoices.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableCategories.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                    selected
                      ? "border-violet-500 bg-violet-50/50 text-violet-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <span>{cat}</span>
                  {selected && (
                    <span className="w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px]">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-sm shadow-violet-500/10 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                {vendor ? "Save Changes" : "Register Vendor"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

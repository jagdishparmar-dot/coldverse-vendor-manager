"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Save } from "lucide-react";
import type { CompanyProfile } from "@/src/types";
import { INDIAN_STATES } from "@/src/constants";
import { COMPANY_LEGAL_NAME, COMPANY_TRADE_NAME } from "@/src/constants/brand";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { getStateCodeFromName, isValidGstin } from "@/src/utils/gst";

type CompanyBillingProfileProps = {
  onUpdated?: (company: CompanyProfile) => void;
};

export default function CompanyBillingProfile({ onUpdated }: CompanyBillingProfileProps) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [pan, setPan] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [registeredState, setRegisteredState] = useState("");
  const [registeredGstin, setRegisteredGstin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/company");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load company profile.");
      }
      const data: CompanyProfile = await res.json();
      setLegalName(data.legalName || "");
      setTradeName(data.tradeName || "");
      setPan(data.pan || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setRegisteredAddress(data.registeredAddress || "");
      setRegisteredState(data.registeredState || "");
      setRegisteredGstin(data.registeredGstin || "");
      onUpdated?.(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load company profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!legalName.trim() || !registeredAddress.trim() || !registeredState || !registeredGstin.trim()) {
      setError("Legal name, address, state, and GSTIN are required.");
      return;
    }
    if (!isValidGstin(registeredGstin)) {
      setError("Enter a valid 15-character GSTIN.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName,
          tradeName,
          pan,
          email,
          phone,
          registeredAddress,
          registeredState,
          registeredGstin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save company profile.");
      }
      setSuccess(data.message || "Company profile saved.");
      if (data.company) {
        onUpdated?.(data.company);
        setPan(data.company.pan || pan);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const stateCode = getStateCodeFromName(registeredState) || "—";

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">
        Loading company billing profile...
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-orange-50 rounded-xl">
          <Building2 className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Company Billing Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Admin-managed buyer entity for GST tax invoices (Bill To legal name, PAN, registered GSTIN &amp; address).
            Hub-level GSTINs override the place-of-supply registration on invoices.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder={COMPANY_LEGAL_NAME}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-gray-50/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Trade Name</label>
            <input
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder={COMPANY_TRADE_NAME}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-gray-50/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">PAN</label>
            <input
              value={pan}
              maxLength={10}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="Auto-filled from GSTIN if blank"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-gray-50/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Registered GSTIN <span className="text-red-500">*</span>
            </label>
            <input
              required
              maxLength={15}
              value={registeredGstin}
              onChange={(e) => setRegisteredGstin(e.target.value.toUpperCase())}
              className={`w-full text-sm px-4 py-2.5 rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
                registeredGstin && !isValidGstin(registeredGstin)
                  ? "border-red-300 bg-red-50/40"
                  : "border-gray-200 bg-gray-50/30"
              }`}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Registered Address <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={registeredAddress}
              onChange={(e) => setRegisteredAddress(e.target.value)}
              className="w-full text-sm px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-gray-50/30 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Registered State <span className="text-red-500">*</span>
            </label>
            <ColdverseSelect
              value={registeredState}
              onValueChange={setRegisteredState}
              options={INDIAN_STATES.map((st) => ({ value: st, label: st }))}
              placeholder="Select state"
            />
            <p className="text-[10px] text-gray-400">GST state code: {stateCode}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-gray-50/30"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-gray-50/30"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Company Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

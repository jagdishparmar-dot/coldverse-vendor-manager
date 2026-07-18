"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Loader2 } from "lucide-react";
import CompanyBillingProfile from "@/src/components/CompanyBillingProfile";

type NotificationSettings = {
  id: string;
  notifyCompanyOnInvoiceUpload: boolean;
  notifyVendorOnRegistration: boolean;
  notifyVendorOnKycVerified: boolean;
  notifyVendorOnInvoiceStatusChange: boolean;
  updatedAt: string;
};

type ToggleKey = keyof Pick<
  NotificationSettings,
  | "notifyCompanyOnInvoiceUpload"
  | "notifyVendorOnRegistration"
  | "notifyVendorOnKycVerified"
  | "notifyVendorOnInvoiceStatusChange"
>;

const TOGGLES: {
  key: ToggleKey;
  title: string;
  description: string;
}[] = [
  {
    key: "notifyCompanyOnInvoiceUpload",
    title: "Invoice uploaded (company)",
    description:
      "Email the company profile address when a vendor uploads an invoice via the portal.",
  },
  {
    key: "notifyVendorOnRegistration",
    title: "Vendor registered",
    description:
      "Email the vendor with their portal link when they are created (single or bulk).",
  },
  {
    key: "notifyVendorOnKycVerified",
    title: "KYC verified",
    description: "Email the vendor when their KYC status is marked verified.",
  },
  {
    key: "notifyVendorOnInvoiceStatusChange",
    title: "Invoice status changed",
    description:
      "Email the vendor when an invoice is marked Pending, Paid, Hold, or Rejected.",
  },
];

export default function WorkspacePanel() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/notifications");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load notification settings.");
      }
      setSettings(await res.json());
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load notification settings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleToggle = async (key: ToggleKey, next: boolean) => {
    if (!settings) return;
    setSavingKey(key);
    setError("");
    setSuccess("");
    const previous = settings;
    setSettings({ ...settings, [key]: next });

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update settings.");
      }
      setSettings(await res.json());
      setSuccess("Notification preference saved.");
    } catch (err: unknown) {
      setSettings(previous);
      setError(err instanceof Error ? err.message : "Failed to update settings.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-gray-950">Workspace</h2>
        <p className="text-xs text-gray-500 mt-1">
          Company billing profile and email notification preferences
        </p>
      </div>

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <CompanyBillingProfile />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Email notifications</h3>
            <p className="text-xs text-gray-500">
              Each event can be enabled independently. Emails send only when a
              recipient address exists and Resend is configured.
            </p>
          </div>
        </div>

        {loading || !settings ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {TOGGLES.map((item) => {
              const enabled = settings[item.key];
              const busy = savingKey === item.key;
              return (
                <li
                  key={item.key}
                  className="flex items-start justify-between gap-4 py-4 first:pt-2 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={busy}
                    onClick={() => void handleToggle(item.key, !enabled)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors disabled:opacity-60 ${
                      enabled
                        ? "bg-orange-600 border-orange-600"
                        : "bg-slate-200 border-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                      style={{ height: 22, width: 22 }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

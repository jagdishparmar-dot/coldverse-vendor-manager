"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  FileCheck,
  FileText,
  LayoutTemplate,
  Plus,
  Trash2,
} from "lucide-react";
import type { CompanyProfile, Hub, Vendor } from "@/src/types";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { ColdverseDateField } from "@/src/components/coldverse-date-field";
import {
  INVOICE_TEMPLATES,
  getInvoiceTemplate,
  type InvoiceTemplateId,
} from "@/src/constants/invoiceTemplates";
import {
  calculateInvoiceGrandTotal,
  generateGstInvoiceHtml,
  type InvoiceLineItem,
} from "@/src/utils/generateInvoiceHtml";
import {
  downloadPdfBlob,
  generateInvoicePdfBlob,
  generateInvoicePdfDataUrl,
} from "@/src/utils/invoicePdf";
import {
  computeGstLine,
  computeInvoiceGstTotals,
  getStateCodeFromGstin,
  getStateCodeFromName,
  getStateNameFromCode,
  GST_RATE_OPTIONS,
  isValidGstin,
  normalizeGstin,
  numberToWordsINR,
  UOM_OPTIONS,
} from "@/src/utils/gst";
import {
  COMPANY_LEGAL_NAME,
} from "@/src/constants/brand";
import { getCategoryGstPreset } from "@/src/constants/gstMasters";

type PortalInvoiceGeneratorProps = {
  vendor: Vendor;
  vendorToken: string;
  categories: string[];
  portalHubs: Hub[];
  company: CompanyProfile | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onClose?: () => void;
};

function newLineItem(
  category: string,
  partial?: Partial<InvoiceLineItem>
): InvoiceLineItem {
  const preset = getCategoryGstPreset(category);
  return {
    id: String(Date.now() + Math.random()),
    description: "",
    hsnSac: preset.sac,
    uom: preset.defaultUom,
    qty: 1,
    rate: 0,
    taxRate: preset.defaultTaxRate,
    ...partial,
  };
}

function composeHubBillingAddress(
  hub: Hub,
  company?: CompanyProfile | null
): string {
  if (hub.billingAddress?.trim()) return hub.billingAddress.trim();

  const lines = [
    hub.address?.trim(),
    [hub.city, hub.pincode].filter(Boolean).join(" - "),
    hub.state,
    hub.name ? `Hub: ${hub.name} (${hub.code})` : "",
  ].filter(Boolean);

  if (lines.length > 0) return lines.join("\n");

  if (company) {
    return [
      company.registeredAddress,
      company.registeredState,
      `Hub: ${hub.name} (${hub.code})`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return `${hub.name} (${hub.code}), ${hub.state}`;
}

function resolveBillToFromHub(
  hub: Hub | undefined,
  company: CompanyProfile | null,
  fallbackState: string
): { name: string; address: string; gstin: string; placeOfSupply: string } {
  const legalName = company?.legalName || COMPANY_LEGAL_NAME;

  if (hub) {
    const hubGstin = hub.gstin?.trim() || "";
    const companyGstin =
      company &&
      (company.registeredState === hub.state ||
        company.registeredStateCode === hub.stateCode ||
        company.registeredStateCode === getStateCodeFromName(hub.state))
        ? company.registeredGstin
        : "";

    return {
      name: legalName,
      address: composeHubBillingAddress(hub, company),
      gstin: hubGstin || companyGstin || "",
      placeOfSupply: hub.state || fallbackState,
    };
  }

  return {
    name: legalName,
    address: company
      ? `${company.registeredAddress}\n${company.registeredState}`
      : "",
    gstin: company?.registeredGstin || "",
    placeOfSupply: company?.registeredState || fallbackState,
  };
}

export default function PortalInvoiceGenerator({
  vendor,
  vendorToken,
  categories,
  portalHubs,
  company,
  onSuccess,
  onError,
  onClose,
}: PortalInvoiceGeneratorProps) {
  const [templateId, setTemplateId] = useState<InvoiceTemplateId>("classic");
  const [companyAddress, setCompanyAddress] = useState("");
  const [supplierGst, setSupplierGst] = useState("");
  const [toPartyMode, setToPartyMode] = useState<"auto" | "manual">("auto");
  const [toPartyName, setToPartyName] = useState(
    company?.legalName || COMPANY_LEGAL_NAME
  );
  const [toPartyAddress, setToPartyAddress] = useState("");
  const [toPartyGstin, setToPartyGstin] = useState("");
  const [category, setCategory] = useState(categories[0] || "Others");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [state, setState] = useState("");
  const [hubId, setHubId] = useState("");
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState("");
  const [reverseCharge, setReverseCharge] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [hardCopySubmittedTo, setHardCopySubmittedTo] = useState("");
  const [hardCopySubmissionDate, setHardCopySubmissionDate] = useState("");
  const [items, setItems] = useState<InvoiceLineItem[]>([
    newLineItem(categories[0] || "Others", { id: "1" }),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setCompanyAddress((prev) => {
      if (prev) return prev;
      const parts: string[] = [];
      if (vendor.kycDetails?.address) parts.push(vendor.kycDetails.address);
      else if (vendor.state) parts.push(vendor.state);
      return parts.join(", ") || "Registered Office Address";
    });
    setSupplierGst((prev) => prev || vendor.gstNumber || "");
  }, [vendor]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  useEffect(() => {
    if (state && !placeOfSupplyState) {
      setPlaceOfSupplyState(state);
    }
  }, [state, placeOfSupplyState]);

  useEffect(() => {
    if (toPartyMode !== "auto") return;
    const hub = portalHubs.find((h) => h.id === hubId);
    const resolved = resolveBillToFromHub(hub, company, placeOfSupplyState || state);
    setToPartyName(resolved.name);
    setToPartyAddress(resolved.address);
    setToPartyGstin(resolved.gstin);
    if (resolved.placeOfSupply) {
      setPlaceOfSupplyState(resolved.placeOfSupply);
    }
  }, [hubId, state, placeOfSupplyState, toPartyMode, portalHubs, company]);

  const availableStates = useMemo(() => {
    const vendorStates =
      vendor.states && vendor.states.length > 0
        ? vendor.states
        : vendor.state
          ? vendor.state
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
    const fromHubs = Array.from(new Set(portalHubs.map((h) => h.state))).filter(Boolean);
    return vendorStates.length > 0 ? vendorStates : fromHubs;
  }, [vendor, portalHubs]);

  const filteredHubs = useMemo(() => {
    const assigned = portalHubs.filter((h) => vendor.hubs?.includes(h.id));
    const pool = assigned.length > 0 ? assigned : portalHubs;
    if (!state) return pool;
    return pool.filter((h) => h.state === state);
  }, [portalHubs, vendor.hubs, state]);

  const supplierStateCode = getStateCodeFromGstin(supplierGst);
  const placeOfSupplyStateCode =
    getStateCodeFromName(placeOfSupplyState || state) || "";

  const gstTotals = useMemo(
    () =>
      computeInvoiceGstTotals(
        items,
        supplierStateCode,
        placeOfSupplyStateCode || null
      ),
    [items, supplierStateCode, placeOfSupplyStateCode]
  );

  const selectedTemplate = getInvoiceTemplate(templateId);

  const livePreviewHtml = useMemo(() => {
    const targetHub = portalHubs.find((h) => h.id === hubId);
    return generateGstInvoiceHtml({
      vendor,
      invNo: invoiceNo.trim() || "DRAFT",
      invDate: invoiceDate || "—",
      category,
      operatingState: state || placeOfSupplyState || "",
      hubName: targetHub?.name || "",
      items,
      remarks,
      companyAddress,
      paymentDetails: vendor.kycDetails,
      supplierGstin: normalizeGstin(supplierGst) || "—",
      toPartyName: toPartyName || "—",
      toPartyAddress,
      toPartyGstin: normalizeGstin(toPartyGstin) || "—",
      placeOfSupplyState: placeOfSupplyState || state,
      placeOfSupplyStateCode: placeOfSupplyStateCode || "",
      supplierStateCode,
      reverseCharge,
      templateId,
    });
  }, [
    vendor,
    invoiceNo,
    invoiceDate,
    category,
    state,
    hubId,
    portalHubs,
    items,
    remarks,
    companyAddress,
    supplierGst,
    toPartyName,
    toPartyAddress,
    toPartyGstin,
    placeOfSupplyState,
    placeOfSupplyStateCode,
    supplierStateCode,
    reverseCharge,
    templateId,
  ]);

  const buildHtml = () => {
    const targetHub = portalHubs.find((h) => h.id === hubId);
    return generateGstInvoiceHtml({
      vendor,
      invNo: invoiceNo.trim(),
      invDate: invoiceDate,
      category,
      operatingState: state,
      hubName: targetHub?.name || "",
      items,
      remarks,
      companyAddress,
      paymentDetails: vendor.kycDetails,
      supplierGstin: normalizeGstin(supplierGst),
      toPartyName,
      toPartyAddress,
      toPartyGstin: normalizeGstin(toPartyGstin),
      placeOfSupplyState: placeOfSupplyState || state,
      placeOfSupplyStateCode: placeOfSupplyStateCode || "",
      supplierStateCode,
      reverseCharge,
      templateId,
    });
  };

  const validateForm = (): string | null => {
    if (!category || !invoiceNo.trim() || !invoiceDate) {
      return "Please fill out invoice details (Category, Invoice No, Date).";
    }
    if (!companyAddress.trim()) {
      return "Please provide your registered / corporate address.";
    }
    if (!supplierGst.trim() || !isValidGstin(supplierGst)) {
      return "Please enter a valid 15-character Supplier GSTIN.";
    }
    if (availableStates.length > 0 && !state) {
      return "Please select the operating State.";
    }
    if (filteredHubs.length > 0 && !hubId) {
      return "Please select the regional Logistics Hub.";
    }
    if (!(placeOfSupplyState || state)) {
      return "Please select Place of Supply (State).";
    }
    if (!toPartyName.trim() || !toPartyAddress.trim()) {
      return "Please complete Bill To name and address.";
    }
    if (!toPartyGstin.trim() || !isValidGstin(toPartyGstin)) {
      return "Bill To GSTIN is missing or invalid. Select a hub with GSTIN, or enter GSTIN manually.";
    }
    if (toPartyMode === "auto" && hubId) {
      const hub = portalHubs.find((h) => h.id === hubId);
      const resolved = resolveBillToFromHub(hub, company, placeOfSupplyState || state);
      if (!resolved.gstin) {
        return `No Bill To GSTIN for hub "${hub?.name || hubId}". Ask admin to set Hub GSTIN, or switch Bill To to Manual.`;
      }
    }
    if (!company?.legalName && toPartyMode === "auto") {
      return "Company billing profile is not configured. Ask admin to set Company Billing Profile under Logistics Hubs.";
    }
    for (const item of items) {
      if (!item.description.trim() || item.qty <= 0 || item.rate <= 0) {
        return "Each line needs description, quantity > 0, and rate > 0.";
      }
      if (!item.hsnSac.trim() || item.hsnSac.trim().length < 4) {
        return "Each line needs a valid SAC / HSN code (min 4 digits).";
      }
      if (!item.uom.trim()) {
        return "Each line needs a Unit of Measure (UOM).";
      }
    }
    return null;
  };

  const pdfFileName = () =>
    `Tax_Invoice_${invoiceNo.trim().replace(/[^a-zA-Z0-9]/g, "_") || "DRAFT"}.pdf`;

  const handleExportPdf = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      onError(error);
      return;
    }

    setIsExportingPdf(true);
    setFormError("");
    try {
      const blob = await generateInvoicePdfBlob(buildHtml());
      downloadPdfBlob(blob, pdfFileName());
      onSuccess("PDF downloaded. You can also submit it from this creator.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to export PDF.";
      setFormError(message);
      onError(message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      onError(error);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const targetHub = portalHubs.find((h) => h.id === hubId);
      const htmlContent = buildHtml();
      const pdfDataUrl = await generateInvoicePdfDataUrl(htmlContent);
      const grandTotal = calculateInvoiceGrandTotal(
        items,
        supplierStateCode,
        placeOfSupplyStateCode
      );

      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          token: vendorToken,
          category,
          invoiceNumber: invoiceNo.trim(),
          amount: parseFloat(grandTotal.toFixed(2)),
          date: invoiceDate,
          fileName: pdfFileName(),
          fileType: "application/pdf",
          fileData: pdfDataUrl,
          state,
          hubId,
          hubName: targetHub?.name || "",
          remarks: [
            remarks.trim(),
            `Template:${selectedTemplate.name}`,
            `POS:${placeOfSupplyState || state}`,
            `Supply:${gstTotals.supplyType}`,
            reverseCharge ? "RCM:Yes" : "RCM:No",
            `SupplierGSTIN:${normalizeGstin(supplierGst)}`,
            `BuyerGSTIN:${normalizeGstin(toPartyGstin)}`,
          ]
            .filter(Boolean)
            .join(" | "),
          hardCopySubmittedTo: hardCopySubmittedTo.trim(),
          hardCopySubmissionDate,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to submit generated invoice.");
      }

      onSuccess("GST tax invoice PDF generated & submitted successfully!");

      setInvoiceNo("");
      setInvoiceDate("");
      setState("");
      setHubId("");
      setPlaceOfSupplyState("");
      setRemarks("");
      setHardCopySubmittedTo("");
      setHardCopySubmissionDate("");
      setReverseCharge(false);
      setItems([newLineItem(category, { id: "1" })]);
      onClose?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate & submit PDF.";
      setFormError(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItem = (id: string, patch: Partial<InvoiceLineItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const categoryPreset = getCategoryGstPreset(category);
  const posStateOptions = Array.from(
    new Set([
      ...availableStates,
      ...portalHubs.map((h) => h.state),
      ...(company?.registeredState ? [company.registeredState] : []),
    ])
  ).map((st) => ({ value: st, label: st }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <LayoutTemplate className="w-4 h-4 text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Optional invoice creator</p>
            <p className="text-[11px] text-slate-500 truncate">
              Build a GST tax invoice PDF if you do not already have a file to upload.
            </p>
          </div>
        </div>
        <div className="w-full sm:w-56">
          <ColdverseSelect
            value={templateId}
            onValueChange={(v) => setTemplateId(v as InvoiceTemplateId)}
            options={INVOICE_TEMPLATES.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />
          <p className="text-[10px] text-slate-400 mt-1">{selectedTemplate.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="xl:col-span-7 space-y-5"
        >
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-[11px] text-emerald-900">
            Tax splits into{" "}
            <strong>
              {gstTotals.supplyType === "intra" ? "CGST + SGST" : "IGST"}
            </strong>{" "}
            from Supplier GSTIN
            {supplierStateCode
              ? ` (${getStateNameFromCode(supplierStateCode)} / ${supplierStateCode})`
              : ""}{" "}
            vs Place of Supply
            {placeOfSupplyStateCode ? ` (${placeOfSupplyStateCode})` : ""}. Preview
            updates live on the right; submit stores a PDF.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                Supplier Address <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Registered address as on GST registration"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full text-sm px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-gray-50/30 font-sans resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                Supplier GSTIN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={15}
                placeholder="15-character GSTIN"
                value={supplierGst}
                onChange={(e) => setSupplierGst(e.target.value.toUpperCase())}
                className={`w-full text-sm px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-mono ${
                  supplierGst && !isValidGstin(supplierGst)
                    ? "border-red-300 bg-red-50/40"
                    : "border-gray-200 bg-gray-50/30 focus:border-violet-500"
                }`}
              />
            </div>
          </div>

          <div className="p-4 bg-violet-50/20 border border-violet-100 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-xs font-bold text-violet-800 uppercase tracking-wider block">
                  Bill To (Recipient)
                </span>
                <p className="text-[10px] text-gray-400">
                  From Company Profile + Hub GSTIN/address, or Manual.
                </p>
              </div>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => setToPartyMode("auto")}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                    toPartyMode === "auto"
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  From Master
                </button>
                <button
                  type="button"
                  onClick={() => setToPartyMode("manual")}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                    toPartyMode === "manual"
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {toPartyMode === "auto" ? (
              toPartyGstin ? (
                <div className="bg-white/60 p-3 rounded-xl border border-violet-100/40 text-xs space-y-1 text-gray-600">
                  <div className="font-medium text-gray-900">{toPartyName}</div>
                  <div className="whitespace-pre-line text-gray-700">{toPartyAddress}</div>
                  <div className="font-mono text-violet-700 font-semibold">{toPartyGstin}</div>
                </div>
              ) : (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Select state &amp; hub with GSTIN, or switch to Manual.
                </p>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Bill To name"
                  value={toPartyName}
                  onChange={(e) => setToPartyName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/30"
                />
                <textarea
                  required
                  rows={1}
                  placeholder="Bill To address"
                  value={toPartyAddress}
                  onChange={(e) => setToPartyAddress(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/30 resize-none"
                />
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Bill To GSTIN"
                  value={toPartyGstin}
                  onChange={(e) => setToPartyGstin(e.target.value.toUpperCase())}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/30 font-mono"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Category *
              </label>
              <ColdverseSelect
                value={category}
                onValueChange={(cat) => {
                  setCategory(cat);
                  const preset = getCategoryGstPreset(cat);
                  setItems((prev) =>
                    prev.map((item) => ({
                      ...item,
                      hsnSac: item.hsnSac || preset.sac,
                      uom: item.uom || preset.defaultUom,
                      taxRate: item.taxRate || preset.defaultTaxRate,
                    }))
                  );
                }}
                options={categories.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Invoice No *
              </label>
              <input
                type="text"
                required
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Invoice Date *
              </label>
              <ColdverseDateField value={invoiceDate} onValueChange={setInvoiceDate} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Place of Supply *
              </label>
              <ColdverseSelect
                value={placeOfSupplyState}
                onValueChange={setPlaceOfSupplyState}
                options={posStateOptions}
                placeholder="Select state"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Operating State
              </label>
              <ColdverseSelect
                value={state}
                onValueChange={(v) => {
                  setState(v);
                  setHubId("");
                }}
                options={availableStates.map((s) => ({ value: s, label: s }))}
                placeholder="Select state"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Logistics Hub
              </label>
              <ColdverseSelect
                value={hubId}
                onValueChange={setHubId}
                options={filteredHubs.map((h) => ({
                  value: h.id,
                  label: `${h.name} (${h.code})${h.gstin ? "" : " · no GSTIN"}`,
                }))}
                placeholder="Select hub"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={reverseCharge}
              onChange={(e) => setReverseCharge(e.target.checked)}
              className="rounded border-gray-300"
            />
            Reverse Charge Mechanism (RCM) applicable
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Line Items
              </h4>
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [...prev, newLineItem(category)])
                }
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add line
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => {
                const breakdown = computeGstLine({
                  taxableAmount: item.qty * item.rate,
                  gstRate: item.taxRate,
                  supplierStateCode,
                  placeOfSupplyStateCode: placeOfSupplyStateCode || null,
                });
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Description of service"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, { description: e.target.value })
                        }
                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) => prev.filter((i) => i.id !== item.id))
                          }
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <input
                        type="text"
                        placeholder={categoryPreset.sac}
                        value={item.hsnSac}
                        onChange={(e) =>
                          updateItem(item.id, { hsnSac: e.target.value })
                        }
                        className="text-xs px-2 py-2 rounded-lg border border-gray-200 font-mono"
                      />
                      <ColdverseSelect
                        value={item.uom}
                        onValueChange={(uom) => updateItem(item.id, { uom })}
                        options={UOM_OPTIONS.map((u) => ({
                          value: u.value,
                          label: u.label,
                        }))}
                      />
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(item.id, { qty: Number(e.target.value) || 0 })
                        }
                        className="text-xs px-2 py-2 rounded-lg border border-gray-200"
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.rate || ""}
                        onChange={(e) =>
                          updateItem(item.id, { rate: Number(e.target.value) || 0 })
                        }
                        className="text-xs px-2 py-2 rounded-lg border border-gray-200"
                        placeholder="Rate"
                      />
                      <ColdverseSelect
                        value={String(item.taxRate)}
                        onValueChange={(v) =>
                          updateItem(item.id, { taxRate: Number(v) })
                        }
                        options={GST_RATE_OPTIONS.map((r) => ({
                          value: r.value,
                          label: r.label,
                        }))}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-right font-mono">
                      Line ₹{breakdown.lineTotal.toFixed(2)} ·{" "}
                      {breakdown.supplyType === "intra"
                        ? `CGST+SGST ₹${(breakdown.cgstAmount + breakdown.sgstAmount).toFixed(2)}`
                        : `IGST ₹${breakdown.igstAmount.toFixed(2)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea
              rows={2}
              placeholder="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 resize-none"
            />
            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                placeholder="Hard copy submitted to (optional)"
                value={hardCopySubmittedTo}
                onChange={(e) => setHardCopySubmittedTo(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200"
              />
              <ColdverseDateField
                value={hardCopySubmissionDate}
                onValueChange={setHardCopySubmissionDate}
                placeholder="Hard copy date"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Taxable</span>
              <span className="font-mono font-semibold">
                ₹{gstTotals.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {gstTotals.supplyType === "intra" ? (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>CGST</span>
                  <span className="font-mono">
                    ₹{gstTotals.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>SGST</span>
                  <span className="font-mono">
                    ₹{gstTotals.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-gray-500">
                <span>IGST</span>
                <span className="font-mono">
                  ₹{gstTotals.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-gray-200 pt-2 text-sm">
              <span className="font-bold">Grand Total</span>
              <span className="font-mono font-black text-violet-600">
                ₹{gstTotals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">{numberToWordsINR(gstTotals.grandTotal)}</p>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isExportingPdf || isSubmitting}
              onClick={() => void handleExportPdf()}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 rounded-xl py-3 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border border-slate-200 cursor-pointer disabled:opacity-60"
            >
              {isExportingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Preparing PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export PDF
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isExportingPdf}
              className="w-full bg-violet-600 text-white rounded-xl py-3 font-bold text-xs uppercase tracking-wider hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Generate PDF &amp; Submit
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="xl:col-span-5 xl:sticky xl:top-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-100/80 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-violet-600" />
                  Live template preview
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {selectedTemplate.name} · changes update instantly
                </p>
              </div>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedTemplate.accent }}
                title={selectedTemplate.accent}
              />
            </div>
            <div className="h-[min(72vh,720px)] bg-slate-200/60 p-3">
              <iframe
                title="Invoice template preview"
                srcDoc={livePreviewHtml}
                className="w-full h-full rounded-lg border border-slate-300 bg-white shadow-sm"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

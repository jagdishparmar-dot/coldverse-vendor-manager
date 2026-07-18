"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Trash2,
  Download,
  HelpCircle,
} from "lucide-react";
import { Vendor, Hub } from "../types";
import { INDIAN_STATES } from "../constants";
import {
  VENDOR_BULK_CSV_FILENAME,
  VENDOR_BULK_CSV_HEADERS,
  VENDOR_BULK_CSV_TEMPLATE_PATH,
  VENDOR_BULK_HEADER_ALIASES,
  buildVendorBulkCsvContent,
  GSTIN_REGEX,
  parseCsvLine,
  splitMultiValue,
} from "../constants/vendorBulkCsv";

interface BulkUploadProps {
  onSuccess: (addedVendors: Vendor[]) => void;
  onClose: () => void;
}

interface ParsedRow {
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  states: string[];
  hubCodes: string[];
  /** Resolved hub ids for API (from hub codes) */
  hubs: string[];
  categories: string[];
  error?: string;
}

const FALLBACK_CATEGORIES = [
  "Rent",
  "Manpower",
  "Vehicle rent",
  "Repairs & maintenance",
  "Electricity",
  "Others",
];

export default function BulkUpload({ onSuccess, onClose }: BulkUploadProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCategories, setAvailableCategories] =
    useState<string[]>(FALLBACK_CATEGORIES);
  const [hubs, setHubs] = useState<Pick<Hub, "id" | "name" | "code" | "state">[]>(
    []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hubByCode = useMemo(() => {
    const map = new Map<string, Pick<Hub, "id" | "name" | "code" | "state">>();
    for (const hub of hubs) {
      map.set(hub.code.trim().toLowerCase(), hub);
    }
    return map;
  }, [hubs]);

  const categorySet = useMemo(
    () => new Set(availableCategories.map((c) => c.toLowerCase())),
    [availableCategories]
  );

  const stateSet = useMemo(
    () => new Set(INDIAN_STATES.map((s) => s.toLowerCase())),
    []
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableCategories(data);
        }
      })
      .catch(() => {
        /* keep fallback */
      });

    fetch("/api/hubs?options=1")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items ?? data?.hubs ?? [];
        if (Array.isArray(list)) {
          setHubs(list);
        }
      })
      .catch(() => {
        /* hub validation will be skipped if empty */
      });
  }, []);

  const validateAndBuildRow = (
    fields: {
      name: string;
      email: string;
      phone: string;
      gstNumber: string;
      states: string[];
      hubCodes: string[];
      categories: string[];
    }
  ): ParsedRow => {
    const name = fields.name.trim();
    const email = fields.email.trim();
    const phone = fields.phone.trim();
    const gstNumber = fields.gstNumber.trim().toUpperCase();
    const states = fields.states;
    const hubCodes = fields.hubCodes;
    let categories = fields.categories;
    if (categories.length === 0) {
      categories = ["Others"];
    }

    const errors: string[] = [];
    if (!name) errors.push("Name is required");
    if (!phone) errors.push("Phone is required");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Invalid email");
    }
    if (gstNumber && !GSTIN_REGEX.test(gstNumber)) {
      errors.push("Invalid GSTIN");
    }

    const unknownStates = states.filter(
      (st) => !stateSet.has(st.toLowerCase())
    );
    if (unknownStates.length > 0) {
      errors.push(`Unknown state(s): ${unknownStates.join(", ")}`);
    }

    const resolvedHubs: string[] = [];
    const unknownHubs: string[] = [];
    for (const code of hubCodes) {
      const hub = hubByCode.get(code.toLowerCase());
      if (hub) {
        resolvedHubs.push(hub.id);
      } else if (hubs.length > 0) {
        unknownHubs.push(code);
      }
    }
    if (unknownHubs.length > 0) {
      errors.push(`Unknown hub code(s): ${unknownHubs.join(", ")}`);
    }

    const unknownCats = categories.filter(
      (cat) => !categorySet.has(cat.toLowerCase())
    );
    if (unknownCats.length > 0) {
      errors.push(`Unknown categor(y/ies): ${unknownCats.join(", ")}`);
    }

    return {
      name,
      email,
      phone,
      gstNumber,
      states,
      hubCodes,
      hubs: resolvedHubs,
      categories,
      error: errors.length > 0 ? errors.join(" · ") : undefined,
    };
  };

  const parseCSVText = (text: string) => {
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    const firstCells = parseCsvLine(lines[0]).map((c) =>
      c.trim().toLowerCase()
    );
    const mappedKeys = firstCells.map(
      (cell) => VENDOR_BULK_HEADER_ALIASES[cell] ?? null
    );
    const headerHits = mappedKeys.filter(Boolean).length;
    const hasHeader =
      headerHits >= 2 &&
      mappedKeys.some((key) => key === "name") &&
      mappedKeys.some((key) => key === "phone");

    const columnIndex: Record<string, number> = {};
    if (hasHeader) {
      mappedKeys.forEach((key, idx) => {
        if (key) columnIndex[key] = idx;
      });
    } else {
      // Positional fallback matching template order
      VENDOR_BULK_CSV_HEADERS.forEach((_, idx) => {
        const key = [
          "name",
          "email",
          "phone",
          "gstNumber",
          "states",
          "hubCodes",
          "categories",
        ][idx];
        columnIndex[key] = idx;
      });
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows: ParsedRow[] = dataLines.map((line) => {
      const parts = parseCsvLine(line);
      const at = (key: string) => parts[columnIndex[key] ?? -1] || "";

      return validateAndBuildRow({
        name: at("name"),
        email: at("email"),
        phone: at("phone"),
        gstNumber: at("gstNumber"),
        states: splitMultiValue(at("states")),
        hubCodes: splitMultiValue(at("hubCodes")),
        categories: splitMultiValue(at("categories")),
      });
    });

    setParsedRows(rows);
    setErrorMessage("");
  };

  // Re-validate when hubs/categories finish loading
  useEffect(() => {
    if (pasteText.trim()) {
      parseCSVText(pasteText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run validation when master data arrives
  }, [hubs, availableCategories]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteText(e.target.value);
    parseCSVText(e.target.value);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setErrorMessage("Please upload a valid CSV or TXT file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPasteText(text);
      parseCSVText(text);
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const content = buildVendorBulkCsvContent();
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = VENDOR_BULK_CSV_FILENAME;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadTemplate = async () => {
    try {
      const res = await fetch(VENDOR_BULK_CSV_TEMPLATE_PATH);
      const text = res.ok
        ? await res.text()
        : buildVendorBulkCsvContent();
      setPasteText(text.trimEnd());
      parseCSVText(text);
    } catch {
      const fallback = buildVendorBulkCsvContent();
      setPasteText(fallback.trimEnd());
      parseCSVText(fallback);
    }
  };

  const submitBulk = async () => {
    const validRows = parsedRows.filter((r) => !r.error);
    if (validRows.length === 0) {
      setErrorMessage("No valid vendor records to import.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = validRows.map((row) => ({
        name: row.name,
        email: row.email,
        phone: row.phone,
        gstNumber: row.gstNumber,
        states: row.states,
        hubs: row.hubs,
        categories: row.categories,
      }));

      const response = await fetch("/api/vendors/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorsList: payload }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to bulk upload vendors.");
      }

      const result = await response.json();
      onSuccess(result.vendors);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong during upload.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = parsedRows.some((r) => r.error);
  const validCount = parsedRows.filter((r) => !r.error).length;

  return (
    <div
      id="bulk-upload-container"
      className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm"
    >
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-900">
            Bulk Import Vendors
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Download the CSV template, fill rows, then upload or paste to
            register vendors with GST, states, hubs, and categories.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-50 rounded-lg transition-colors shrink-0"
          title="Back to List"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV template
            </button>
            <button
              type="button"
              onClick={loadTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Load sample in editor
            </button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileClick}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-orange-500 bg-orange-50/50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.txt"
              className="hidden"
            />
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              Drag & drop CSV file here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to browse from device
            </p>
          </div>

          <div className="flex items-center text-xs text-gray-400 px-1">
            <span>OR PASTE CSV TEXT BELOW</span>
          </div>

          <textarea
            value={pasteText}
            onChange={handleTextChange}
            placeholder={`${VENDOR_BULK_CSV_HEADERS.join(",")}\nAman Logistics,aman@logistics.com,+919988776655,24AABCU9603R1ZM,Gujarat,AMD01,Vehicle rent;Electricity`}
            rows={9}
            className="w-full text-sm font-mono p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
          />

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              CSV template guide
            </h4>
            <ul className="text-xs text-gray-500 space-y-1.5 list-disc pl-4">
              <li>
                Use the header row:{" "}
                <code className="text-orange-700 bg-orange-50 px-1 py-0.5 rounded font-mono font-medium text-[10px]">
                  {VENDOR_BULK_CSV_HEADERS.join(", ")}
                </code>
              </li>
              <li>
                <strong>Name</strong> and <strong>Phone</strong> are required.
                Email and GST are optional.
              </li>
              <li>
                Multi-values (<strong>States</strong>, <strong>Hub Codes</strong>,{" "}
                <strong>Categories</strong>) use{" "}
                <code className="font-mono text-gray-700">;</code> (commas also
                work).
              </li>
              <li>
                <strong>Hub Codes</strong> must match existing hub codes (e.g.
                AMD01), not internal IDs.
              </li>
              <li>
                Categories: {availableCategories.join(", ")}.
              </li>
              <li>
                States must match Indian state names (e.g. Gujarat,
                Maharashtra).
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col min-h-[400px]">
          <div className="flex-1 border border-gray-200/80 rounded-xl overflow-hidden flex flex-col bg-gray-50/50">
            <div className="px-4 py-3 bg-white border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Preview ({parsedRows.length} rows · {validCount} valid)
              </span>
              {hasErrors && (
                <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Fix errors before
                  importing
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[420px]">
              {parsedRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center min-h-[250px]">
                  <FileText className="w-10 h-10 stroke-[1.5] mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No records parsed yet</p>
                  <p className="text-xs mt-1 max-w-[280px]">
                    Download the template, fill it in, then upload or paste to
                    preview structured vendors here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 bg-white">
                  {parsedRows.map((row, idx) => (
                    <div
                      key={idx}
                      className={`p-4 transition-colors hover:bg-gray-50/50 flex justify-between items-start ${
                        row.error ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <div className="space-y-1.5 pr-4 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {row.name || (
                              <span className="text-red-400 italic">No Name</span>
                            )}
                          </span>
                          {row.phone && (
                            <span className="text-xs font-mono text-gray-400">
                              ({row.phone})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {row.email || (
                            <span className="italic text-gray-400">No email</span>
                          )}
                          {row.gstNumber ? (
                            <span className="ml-2 font-mono text-slate-600">
                              · {row.gstNumber}
                            </span>
                          ) : null}
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {row.states.map((st) => (
                            <span
                              key={st}
                              className="text-[10px] font-medium bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full"
                            >
                              {st}
                            </span>
                          ))}
                          {row.hubCodes.map((code) => (
                            <span
                              key={code}
                              className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                            >
                              {code}
                            </span>
                          ))}
                          {row.categories.map((c) => (
                            <span
                              key={c}
                              className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                            >
                              {c}
                            </span>
                          ))}
                        </div>

                        {row.error && (
                          <div className="text-xs text-amber-600 font-medium flex items-start gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{row.error}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeRow(idx)}
                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50/50 rounded-lg transition-all shrink-0"
                        title="Remove record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submitBulk}
              disabled={isSubmitting || validCount === 0}
              className="px-5 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm & Import ({validCount} valid)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import { Upload, FileText, Check, AlertCircle, Trash2, HelpCircle } from "lucide-react";
import { Vendor } from "../types";

interface BulkUploadProps {
  onSuccess: (addedVendors: Vendor[]) => void;
  onClose: () => void;
}

interface ParsedRow {
  name: string;
  email: string;
  phone: string;
  categories: string[];
  error?: string;
}

export default function BulkUpload({ onSuccess, onClose }: BulkUploadProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCategories = ["Rent", "Manpower", "Vehicle rent", "Repairs & maintenance", "Electricity", "Others"];

  // Core parser function
  const parseCSVText = (text: string) => {
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split(/\r?\n/);
    const rows: ParsedRow[] = [];

    lines.forEach((line, index) => {
      if (!line.trim()) return; // skip empty lines

      // Basic comma splitter, but handle simple quotes if any
      const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));
      
      // We expect format: Name, Email, Phone, Category1;Category2
      const name = parts[0] || "";
      const email = parts[1] || "";
      const phone = parts[2] || "";
      
      // Categories can be separated by semicolons or just be a single string
      let rawCats = parts[3] || "Others";
      let categories = rawCats.split(/[;|]/).map(c => c.trim()).filter(Boolean);
      if (categories.length === 0) {
        categories = ["Others"];
      }

      // Simple validations
      let error = "";
      if (!name) {
        error = "Name is missing";
      } else if (!phone) {
        error = "Phone number is missing";
      } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        error = "Invalid email format";
      }

      rows.push({
        name,
        email,
        phone,
        categories,
        error: error || undefined
      });
    });

    setParsedRows(rows);
    setErrorMessage("");
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteText(e.target.value);
    parseCSVText(e.target.value);
  };

  // Handle CSV file selection & reading
  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setErrorMessage("Please upload a valid CSV or TXT file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
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

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeRow = (index: number) => {
    const updated = [...parsedRows];
    updated.splice(index, 1);
    setParsedRows(updated);
  };

  const loadTemplate = () => {
    const template = `Aman Logistics, aman.logistics@gmail.com, +919876543210, Vehicle rent;Repairs & maintenance
Techno Manpower, billing@techno.in, +918887766554, Manpower
Metro Space Realty, accounts@metrorealty.com, +917776655443, Rent
State Power Grid, , +919998887776, Electricity`;
    setPasteText(template);
    parseCSVText(template);
  };

  const submitBulk = async () => {
    const validRows = parsedRows.filter(r => !r.error);
    if (validRows.length === 0) {
      setErrorMessage("No valid vendor records to import.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/vendors/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorsList: validRows })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to bulk upload vendors.");
      }

      const result = await response.json();
      onSuccess(result.vendors);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong during upload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = parsedRows.some(r => r.error);

  return (
    <div id="bulk-upload-container" className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-900">Bulk Import Vendors</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload a CSV file or paste vendor details below to register multiple vendors instantly.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
          title="Back to List"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input and Upload Methods */}
        <div className="lg:col-span-5 space-y-4">
          {/* Drag & Drop Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileClick}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-violet-500 bg-violet-50/50"
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
            <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-gray-900">Drag & drop CSV file here</p>
            <p className="text-xs text-gray-500 mt-1">or click to browse from device</p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>OR PASTE RAW CSV TEXT BELOW</span>
            <button
              onClick={loadTemplate}
              className="text-violet-600 hover:text-violet-700 font-medium hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Load Sample Template
            </button>
          </div>

          {/* Paste area */}
          <div>
            <textarea
              value={pasteText}
              onChange={handleTextChange}
              placeholder="Format: Name, Email, Phone, Categories (separated by semicolon)&#10;Example: Aman Logistics, aman@logistics.com, +919988776655, Vehicle rent;Electricity"
              rows={8}
              className="w-full text-sm font-mono p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">CSV Formatting Guide</h4>
            <ul className="text-xs text-gray-500 space-y-1.5 list-disc pl-4">
              <li>Header row is optional (empty lines are ignored automatically).</li>
              <li>Columns: <code className="text-violet-600 bg-violet-50 px-1 py-0.2 rounded font-mono font-medium">Name, Email, Phone, Categories</code></li>
              <li><strong>Billing Email</strong> is optional, but <strong>Phone Number</strong> is mandatory.</li>
              <li>Multiple categories should be separated by a semicolon (<code className="font-mono text-gray-700 font-medium">;</code>).</li>
              <li>Categories allowed: Rent, Manpower, Vehicle rent, Repairs & maintenance, Electricity, Others.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Parsed Review Panel */}
        <div className="lg:col-span-7 flex flex-col min-h-[400px]">
          <div className="flex-1 border border-gray-200/80 rounded-xl overflow-hidden flex flex-col bg-gray-50/50">
            <div className="px-4 py-3 bg-white border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Preview Parsed Records ({parsedRows.length})
              </span>
              {hasErrors && (
                <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Fix errors before importing
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[360px]">
              {parsedRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center min-h-[250px]">
                  <FileText className="w-10 h-10 stroke-[1.5] mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No records parsed yet</p>
                  <p className="text-xs mt-1 max-w-[280px]">
                    Drag a file or paste comma-separated lines on the left to see your structured preview here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 bg-white">
                  {parsedRows.map((row, idx) => (
                    <div key={idx} className={`p-4 transition-colors hover:bg-gray-50/50 flex justify-between items-start ${row.error ? "bg-amber-50/30" : ""}`}>
                      <div className="space-y-1 pr-4 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {row.name || <span className="text-red-400 italic">No Name</span>}
                          </span>
                          {row.phone && (
                            <span className="text-xs font-mono text-gray-400">
                              ({row.phone})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{row.email || <span className="text-red-400 italic">No Email</span>}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {row.categories.map((c, cidx) => (
                            <span
                              key={cidx}
                              className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                            >
                              {c}
                            </span>
                          ))}
                        </div>

                        {row.error && (
                          <div className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {row.error}
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
              disabled={isSubmitting || parsedRows.length === 0}
              className="px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-sm shadow-violet-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm & Import ({parsedRows.filter(r => !r.error).length} valid)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Predefined CSV columns for vendor bulk import (aligned with Vendor schema). */

export const VENDOR_BULK_CSV_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "GST Number",
  "States",
  "Hub Codes",
  "Categories",
] as const;

export type VendorBulkCsvHeader = (typeof VENDOR_BULK_CSV_HEADERS)[number];

/** Canonical download path served from /public */
export const VENDOR_BULK_CSV_TEMPLATE_PATH =
  "/templates/vendor-bulk-upload.csv";

export const VENDOR_BULK_CSV_FILENAME = "vendor-bulk-upload-template.csv";

/**
 * Sample rows used for “Load sample” and the downloadable template.
 * Hub Codes must match existing Hub.code values in the target environment.
 */
export const VENDOR_BULK_CSV_SAMPLE_ROWS: string[][] = [
  [
    "Aman Logistics",
    "aman.logistics@gmail.com",
    "+919876543210",
    "24AABCU9603R1ZM",
    "Gujarat",
    "AMD01",
    "Vehicle rent;Repairs & maintenance",
  ],
  [
    "Techno Manpower",
    "billing@techno.in",
    "+918887766554",
    "",
    "Maharashtra;Gujarat",
    "BOM01;AMD01",
    "Manpower",
  ],
  [
    "Metro Space Realty",
    "accounts@metrorealty.com",
    "+917776655443",
    "27AADCM1234A1Z5",
    "Maharashtra",
    "",
    "Rent",
  ],
  [
    "State Power Grid",
    "",
    "+919998887776",
    "",
    "",
    "",
    "Electricity",
  ],
];

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/** Map flexible header labels → canonical field keys */
export const VENDOR_BULK_HEADER_ALIASES: Record<string, string> = {
  name: "name",
  "vendor name": "name",
  vendorname: "name",
  email: "email",
  "email address": "email",
  "billing email": "email",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  gst: "gstNumber",
  gstin: "gstNumber",
  "gst number": "gstNumber",
  "gstin / tax no": "gstNumber",
  state: "states",
  states: "states",
  "operating state": "states",
  "operating states": "states",
  hub: "hubCodes",
  hubs: "hubCodes",
  "hub code": "hubCodes",
  "hub codes": "hubCodes",
  "hub id": "hubCodes",
  "hub ids": "hubCodes",
  category: "categories",
  categories: "categories",
};

export function buildVendorBulkCsvContent(rows = VENDOR_BULK_CSV_SAMPLE_ROWS): string {
  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const header = VENDOR_BULK_CSV_HEADERS.join(",");
  const body = rows.map((row) => row.map(escape).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

export function splitMultiValue(raw: string): string[] {
  return raw
    .split(/[;|,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

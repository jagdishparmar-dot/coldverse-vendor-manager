import { parseCsvLine } from "@/src/constants/vendorBulkCsv";

/** Predefined CSV columns for hub bulk import (aligned with Hub schema). */

export const HUB_BULK_CSV_HEADERS = [
  "Name",
  "Code",
  "State",
  "Address",
  "City",
  "Pincode",
  "GSTIN",
] as const;

export const HUB_BULK_CSV_TEMPLATE_PATH = "/templates/hub-bulk-upload.csv";

export const HUB_BULK_CSV_FILENAME = "hub-bulk-upload-template.csv";

export const HUB_BULK_CSV_SAMPLE_ROWS: string[][] = [
  [
    "Ahmedabad Main Hub",
    "AMD-01",
    "Gujarat",
    "SG Highway, Near Iscon",
    "Ahmedabad",
    "380051",
    "24AABCC0000A1Z5",
  ],
  [
    "Mumbai Central Hub",
    "BOM-01",
    "Maharashtra",
    "Andheri East, MIDC Road",
    "Mumbai",
    "400093",
    "27AABCC0000A1Z5",
  ],
  [
    "Delhi NCR Hub",
    "DEL-01",
    "Delhi",
    "Okhla Industrial Area Phase 2",
    "New Delhi",
    "110020",
    "",
  ],
];

export const HUB_BULK_HEADER_ALIASES: Record<string, string> = {
  name: "name",
  "hub name": "name",
  hubname: "name",
  code: "code",
  "hub code": "code",
  hubcode: "code",
  state: "state",
  "state / ut": "state",
  "state/ut": "state",
  address: "address",
  city: "city",
  pincode: "pincode",
  pin: "pincode",
  gstin: "gstin",
  gst: "gstin",
  "gst number": "gstin",
};

const HUB_BULK_FIELD_KEYS = [
  "name",
  "code",
  "state",
  "address",
  "city",
  "pincode",
  "gstin",
] as const;

export type HubBulkRow = {
  name: string;
  code: string;
  state: string;
  address: string;
  city: string;
  pincode: string;
  gstin: string;
};

export type HubBulkParseResult = {
  rows: HubBulkRow[];
  errors: string[];
};

export function buildHubBulkCsvContent(rows = HUB_BULK_CSV_SAMPLE_ROWS): string {
  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const header = HUB_BULK_CSV_HEADERS.join(",");
  const body = rows.map((row) => row.map(escape).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

export function parseHubBulkText(text: string): HubBulkParseResult {
  const errors: string[] = [];
  const rows: HubBulkRow[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows, errors: ["No hub rows found."] };
  }

  const firstCells = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const mappedKeys = firstCells.map((cell) => HUB_BULK_HEADER_ALIASES[cell] ?? null);
  const headerHits = mappedKeys.filter(Boolean).length;
  const hasHeader =
    headerHits >= 2 &&
    mappedKeys.some((key) => key === "name") &&
    mappedKeys.some((key) => key === "code");

  const columnIndex: Record<string, number> = {};
  if (hasHeader) {
    mappedKeys.forEach((key, idx) => {
      if (key) columnIndex[key] = idx;
    });
  } else {
    HUB_BULK_FIELD_KEYS.forEach((key, idx) => {
      columnIndex[key] = idx;
    });
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;

  dataLines.forEach((line, index) => {
    const lineNo = hasHeader ? index + 2 : index + 1;
    const parts = parseCsvLine(line);
    const at = (key: string) => parts[columnIndex[key] ?? -1]?.trim() ?? "";

    const name = at("name");
    const code = at("code");
    const state = at("state");
    const address = at("address");
    const city = at("city");
    const pincode = at("pincode");
    const gstin = at("gstin");

    if (!name || !code || !state) {
      errors.push(`Line ${lineNo}: Name, Code, and State are required.`);
      return;
    }

    rows.push({ name, code, state, address, city, pincode, gstin });
  });

  return { rows, errors };
}

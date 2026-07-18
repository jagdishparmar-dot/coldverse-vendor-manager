/** Indian GST utilities: state codes, GSTIN validation, CGST/SGST vs IGST. */

export const GST_STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  Punjab: "03",
  Chandigarh: "04",
  Uttarakhand: "05",
  Haryana: "06",
  Delhi: "07",
  Rajasthan: "08",
  "Uttar Pradesh": "09",
  Bihar: "10",
  Sikkim: "11",
  "Arunachal Pradesh": "12",
  Nagaland: "13",
  Manipur: "14",
  Mizoram: "15",
  Tripura: "16",
  Meghalaya: "17",
  Assam: "18",
  "West Bengal": "19",
  Jharkhand: "20",
  Odisha: "21",
  Chhattisgarh: "22",
  "Madhya Pradesh": "23",
  Gujarat: "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  Maharashtra: "27",
  "Andhra Pradesh": "28", // legacy; new AP is 37 — keep 28 for older GSTINs
  Karnataka: "29",
  Goa: "30",
  Lakshadweep: "31",
  Kerala: "32",
  "Tamil Nadu": "33",
  Puducherry: "34",
  "Andaman and Nicobar Islands": "35",
  Telangana: "36",
  "Andhra Pradesh (New)": "37",
  Ladakh: "38",
  "Other Territory": "97",
  "Centre Jurisdiction": "99",
};

/** Reverse lookup: GST state code → primary state name */
export const GST_CODE_TO_STATE: Record<string, string> = Object.entries(GST_STATE_CODES).reduce(
  (acc, [name, code]) => {
    if (!acc[code] || name === "Andhra Pradesh") {
      acc[code] = name === "Andhra Pradesh (New)" ? "Andhra Pradesh" : name;
    }
    return acc;
  },
  {} as Record<string, string>
);

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export type SupplyType = "intra" | "inter";

export type GstBreakdown = {
  taxableAmount: number;
  gstRate: number;
  supplyType: SupplyType;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  lineTotal: number;
};

export type InvoiceGstTotals = {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
  supplyType: SupplyType;
};

export function normalizeGstin(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidGstin(value: string): boolean {
  const gstin = normalizeGstin(value);
  if (!GSTIN_REGEX.test(gstin)) return false;
  const stateCode = gstin.slice(0, 2);
  return Boolean(GST_CODE_TO_STATE[stateCode]);
}

export function getStateCodeFromGstin(gstin: string): string | null {
  const normalized = normalizeGstin(gstin);
  if (normalized.length < 2) return null;
  const code = normalized.slice(0, 2);
  return GST_CODE_TO_STATE[code] ? code : null;
}

export function getStateCodeFromName(stateName: string): string | null {
  if (!stateName?.trim()) return null;
  const direct = GST_STATE_CODES[stateName.trim()];
  if (direct) return direct;
  // fuzzy: Andhra Pradesh new code preference
  if (stateName.trim() === "Andhra Pradesh") return "37";
  const found = Object.entries(GST_STATE_CODES).find(
    ([name]) => name.toLowerCase() === stateName.trim().toLowerCase()
  );
  return found ? found[1] : null;
}

export function getStateNameFromCode(code: string): string | null {
  return GST_CODE_TO_STATE[code] || null;
}

export function resolveSupplyType(
  supplierStateCode: string | null,
  placeOfSupplyStateCode: string | null
): SupplyType {
  if (!supplierStateCode || !placeOfSupplyStateCode) {
    return "inter";
  }
  return supplierStateCode === placeOfSupplyStateCode ? "intra" : "inter";
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeGstLine(params: {
  taxableAmount: number;
  gstRate: number;
  supplierStateCode: string | null;
  placeOfSupplyStateCode: string | null;
}): GstBreakdown {
  const taxableAmount = round2(Math.max(0, params.taxableAmount));
  const gstRate = Math.max(0, params.gstRate);
  const supplyType = resolveSupplyType(
    params.supplierStateCode,
    params.placeOfSupplyStateCode
  );
  const totalTax = round2(taxableAmount * (gstRate / 100));

  if (supplyType === "intra") {
    const halfRate = gstRate / 2;
    const cgstAmount = round2(taxableAmount * (halfRate / 100));
    const sgstAmount = round2(totalTax - cgstAmount);
    return {
      taxableAmount,
      gstRate,
      supplyType,
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalTax: round2(cgstAmount + sgstAmount),
      lineTotal: round2(taxableAmount + cgstAmount + sgstAmount),
    };
  }

  return {
    taxableAmount,
    gstRate,
    supplyType,
    cgstRate: 0,
    sgstRate: 0,
    igstRate: gstRate,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: totalTax,
    totalTax,
    lineTotal: round2(taxableAmount + totalTax),
  };
}

export function computeInvoiceGstTotals(
  lines: Array<{ qty: number; rate: number; taxRate: number }>,
  supplierStateCode: string | null,
  placeOfSupplyStateCode: string | null
): InvoiceGstTotals {
  const supplyType = resolveSupplyType(supplierStateCode, placeOfSupplyStateCode);
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  for (const line of lines) {
    const taxable = round2(line.qty * line.rate);
    const breakdown = computeGstLine({
      taxableAmount: taxable,
      gstRate: line.taxRate,
      supplierStateCode,
      placeOfSupplyStateCode,
    });
    taxableAmount += breakdown.taxableAmount;
    cgstAmount += breakdown.cgstAmount;
    sgstAmount += breakdown.sgstAmount;
    igstAmount += breakdown.igstAmount;
  }

  taxableAmount = round2(taxableAmount);
  cgstAmount = round2(cgstAmount);
  sgstAmount = round2(sgstAmount);
  igstAmount = round2(igstAmount);
  const totalTax = round2(cgstAmount + sgstAmount + igstAmount);

  return {
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    grandTotal: round2(taxableAmount + totalTax),
    supplyType,
  };
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ""}`.trim();
}

function threeDigitsToWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred && rest) return `${ONES[hundred]} Hundred ${twoDigitsToWords(rest)}`;
  if (hundred) return `${ONES[hundred]} Hundred`;
  return twoDigitsToWords(rest);
}

/** Convert amount to Indian-system words (Rupees … Paise Only). */
export function numberToWordsINR(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "Zero Rupees Only";

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  let result = parts.length ? `${parts.join(" ")} Rupees` : "Zero Rupees";
  if (paise > 0) {
    result += ` and ${twoDigitsToWords(paise)} Paise`;
  }
  return `${result} Only`;
}

export const UOM_OPTIONS = [
  { value: "NOS", label: "Nos" },
  { value: "HRS", label: "Hours" },
  { value: "DAY", label: "Days" },
  { value: "MON", label: "Month" },
  { value: "TRP", label: "Trip" },
  { value: "KMS", label: "Km" },
  { value: "SQF", label: "Sq Ft" },
  { value: "OTH", label: "Others" },
] as const;

export const GST_RATE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
] as const;

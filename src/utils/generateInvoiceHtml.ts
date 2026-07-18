import type { KYCDetails, Vendor } from "@/src/types";
import {
  getInvoiceTemplate,
  type InvoiceTemplateId,
} from "@/src/constants/invoiceTemplates";
import { COMPANY_LEGAL_NAME } from "@/src/constants/brand";
import {
  computeGstLine,
  computeInvoiceGstTotals,
  getStateNameFromCode,
  numberToWordsINR,
  type SupplyType,
} from "@/src/utils/gst";

export type InvoiceLineItem = {
  id: string;
  description: string;
  hsnSac: string;
  uom: string;
  qty: number;
  rate: number;
  taxRate: number;
};

export type GenerateInvoiceParams = {
  vendor: Vendor;
  invNo: string;
  invDate: string;
  category: string;
  operatingState: string;
  hubName: string;
  items: InvoiceLineItem[];
  remarks: string;
  companyAddress: string;
  paymentDetails?: KYCDetails | null;
  supplierGstin: string;
  toPartyName: string;
  toPartyAddress: string;
  toPartyGstin: string;
  placeOfSupplyState: string;
  placeOfSupplyStateCode: string;
  supplierStateCode: string | null;
  reverseCharge: boolean;
  templateId?: InvoiceTemplateId;
};

export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inr(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type BuiltInvoice = {
  supplyType: SupplyType;
  posLabel: string;
  supplierStateName: string;
  amountInWords: string;
  itemsHtml: string;
  tableHead: string;
  taxRows: string;
  totals: ReturnType<typeof computeInvoiceGstTotals>;
  templateId: InvoiceTemplateId;
  accent: string;
};

function buildInvoiceData(params: GenerateInvoiceParams): BuiltInvoice {
  const {
    items,
    placeOfSupplyState,
    placeOfSupplyStateCode,
    supplierStateCode,
    operatingState,
    templateId,
  } = params;

  const template = getInvoiceTemplate(templateId);
  const totals = computeInvoiceGstTotals(
    items,
    supplierStateCode,
    placeOfSupplyStateCode || null
  );
  const supplyType: SupplyType = totals.supplyType;
  const posLabel = placeOfSupplyStateCode
    ? `${placeOfSupplyState} (${placeOfSupplyStateCode})`
    : placeOfSupplyState || operatingState;
  const supplierStateName = supplierStateCode
    ? getStateNameFromCode(supplierStateCode) || ""
    : "";

  const itemsHtml = items
    .map((item, index) => {
      const taxable = item.qty * item.rate;
      const breakdown = computeGstLine({
        taxableAmount: taxable,
        gstRate: item.taxRate,
        supplierStateCode,
        placeOfSupplyStateCode: placeOfSupplyStateCode || null,
      });

      if (supplyType === "intra") {
        return `
      <tr>
        <td class="c">${index + 1}</td>
        <td>${escapeHtml(item.description || "Service")}</td>
        <td class="c mono">${escapeHtml(item.hsnSac || "—")}</td>
        <td class="c">${escapeHtml(item.uom || "NOS")}</td>
        <td class="r">${item.qty}</td>
        <td class="r mono">₹${inr(item.rate)}</td>
        <td class="r mono">₹${inr(breakdown.taxableAmount)}</td>
        <td class="r">${breakdown.cgstRate}%</td>
        <td class="r mono">₹${inr(breakdown.cgstAmount)}</td>
        <td class="r">${breakdown.sgstRate}%</td>
        <td class="r mono">₹${inr(breakdown.sgstAmount)}</td>
        <td class="r mono b">₹${inr(breakdown.lineTotal)}</td>
      </tr>`;
      }

      return `
      <tr>
        <td class="c">${index + 1}</td>
        <td>${escapeHtml(item.description || "Service")}</td>
        <td class="c mono">${escapeHtml(item.hsnSac || "—")}</td>
        <td class="c">${escapeHtml(item.uom || "NOS")}</td>
        <td class="r">${item.qty}</td>
        <td class="r mono">₹${inr(item.rate)}</td>
        <td class="r mono">₹${inr(breakdown.taxableAmount)}</td>
        <td class="r">${breakdown.igstRate}%</td>
        <td class="r mono">₹${inr(breakdown.igstAmount)}</td>
        <td class="r mono b">₹${inr(breakdown.lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const tableHead =
    supplyType === "intra"
      ? `<tr>
          <th class="c">#</th><th>Description</th><th class="c">SAC</th><th class="c">UOM</th>
          <th class="r">Qty</th><th class="r">Rate</th><th class="r">Taxable</th>
          <th class="r">CGST%</th><th class="r">CGST</th><th class="r">SGST%</th><th class="r">SGST</th><th class="r">Total</th>
        </tr>`
      : `<tr>
          <th class="c">#</th><th>Description</th><th class="c">SAC</th><th class="c">UOM</th>
          <th class="r">Qty</th><th class="r">Rate</th><th class="r">Taxable</th>
          <th class="r">IGST%</th><th class="r">IGST</th><th class="r">Total</th>
        </tr>`;

  const taxRows =
    supplyType === "intra"
      ? `
            <tr><td>CGST</td><td class="r mono">₹${inr(totals.cgstAmount)}</td></tr>
            <tr><td>SGST / UTGST</td><td class="r mono">₹${inr(totals.sgstAmount)}</td></tr>`
      : `
            <tr><td>IGST</td><td class="r mono">₹${inr(totals.igstAmount)}</td></tr>`;

  return {
    supplyType,
    posLabel,
    supplierStateName,
    amountInWords: numberToWordsINR(totals.grandTotal),
    itemsHtml,
    tableHead,
    taxRows,
    totals,
    templateId: template.id,
    accent: template.accent,
  };
}

function partyAndTotalsBody(params: GenerateInvoiceParams, data: BuiltInvoice): string {
  const {
    vendor,
    invNo,
    invDate,
    category,
    operatingState,
    hubName,
    remarks,
    companyAddress,
    paymentDetails,
    supplierGstin,
    toPartyName,
    toPartyAddress,
    toPartyGstin,
    reverseCharge,
    supplierStateCode,
  } = params;

  return `
    <div class="meta-grid">
      <div>Invoice No: <strong>${escapeHtml(invNo || "DRAFT")}</strong></div>
      <div>Invoice Date: <strong>${escapeHtml(invDate || "—")}</strong></div>
      <div>Place of Supply: <strong>${escapeHtml(data.posLabel)}</strong></div>
      <div>Reverse Charge: <strong>${reverseCharge ? "Yes" : "No"}</strong></div>
      <div>Operating State / Hub: <strong>${escapeHtml(operatingState || "—")}${hubName ? ` / ${escapeHtml(hubName)}` : ""}</strong></div>
      <div>Supply Type: <strong>${data.supplyType === "intra" ? "Intra-State" : "Inter-State"}</strong></div>
      <div>Category: <strong>${escapeHtml(category)}</strong></div>
      <div>Template: <strong>${escapeHtml(getInvoiceTemplate(data.templateId).name)}</strong></div>
    </div>

    <table class="party-table">
      <tr>
        <td>
          <div class="label">Supplier (Seller)</div>
          <div class="party-name">${escapeHtml(vendor.name)}</div>
          <div class="party-addr">${escapeHtml(companyAddress || "Registered Address")}</div>
          <div class="party-meta">
            ${data.supplierStateName ? `State: <strong>${escapeHtml(data.supplierStateName)}</strong>${supplierStateCode ? ` (${escapeHtml(supplierStateCode)})` : ""}<br>` : ""}
            GSTIN: <strong class="mono">${escapeHtml(supplierGstin || "—")}</strong><br>
            ${paymentDetails?.panNumber ? `PAN: <strong class="mono">${escapeHtml(paymentDetails.panNumber)}</strong><br>` : ""}
            Email: ${escapeHtml(vendor.email || "—")}<br>
            Phone: ${escapeHtml(vendor.phone || "—")}
          </div>
        </td>
        <td>
          <div class="label">Bill To (Recipient / Buyer)</div>
          <div class="party-name">${escapeHtml(toPartyName || "—")}</div>
          <div class="party-addr">${escapeHtml(toPartyAddress || "—")}</div>
          <div class="party-meta">
            GSTIN: <strong class="mono">${escapeHtml(toPartyGstin || "—")}</strong>
          </div>
          <div class="label" style="margin-top: 12px;">Payment / Remittance</div>
          <div class="party-meta">
            Beneficiary: <strong>${escapeHtml(paymentDetails?.beneficiaryName || vendor.name)}</strong><br>
            Bank: <strong>${escapeHtml(paymentDetails?.bankName || "N/A")}</strong><br>
            A/C: <strong class="mono">${escapeHtml(paymentDetails?.accountNumber || "N/A")}</strong><br>
            IFSC: <strong class="mono">${escapeHtml(paymentDetails?.ifscCode || "N/A")}</strong>
          </div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>${data.tableHead}</thead>
      <tbody>${data.itemsHtml || `<tr><td colspan="12" class="c" style="padding:16px;color:#94a3b8;">Add line items to preview amounts</td></tr>`}</tbody>
    </table>

    <table class="summary-wrap">
      <tr>
        <td class="summary-left">
          <div class="label">Amount in Words</div>
          <div class="words">${escapeHtml(data.amountInWords)}</div>
          ${
            remarks
              ? `<div class="label">Remarks</div><div class="remarks">${escapeHtml(remarks).replace(/\n/g, "<br>")}</div>`
              : ""
          }
          <div class="declaration">
            Declaration: We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.
          </div>
        </td>
        <td class="summary-right">
          <table class="totals">
            <tr><td>Taxable Value</td><td class="r mono">₹${inr(data.totals.taxableAmount)}</td></tr>
            ${data.taxRows}
            <tr><td>Total Tax</td><td class="r mono">₹${inr(data.totals.totalTax)}</td></tr>
            <tr class="grand"><td>Grand Total (INR)</td><td class="r mono">₹${inr(data.totals.grandTotal)}</td></tr>
          </table>
          <div class="sign">
            <div class="sign-for">For ${escapeHtml(vendor.name)}</div>
            <div class="sign-line">Authorized Signatory</div>
          </div>
        </td>
      </tr>
    </table>

    <div class="footer-note">
      This is a computer-generated tax invoice issued via the Shree Maruti Authorized Vendor Portal.
      E-invoice (IRN/QR) can be added when applicable under GST e-invoicing provisions.
    </div>`;
}

function templateStyles(templateId: InvoiceTemplateId, accent: string): string {
  const shared = `
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      background: #e2e8f0;
      font-size: 12px;
      line-height: 1.45;
    }
    .invoice-container {
      max-width: 920px;
      margin: 0 auto;
      background: #fff;
      padding: 28px 30px;
    }
    .c { text-align: center; }
    .r { text-align: right; }
    .b { font-weight: 700; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
    table { border-collapse: collapse; width: 100%; }
    .label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .party-name { font-weight: 800; font-size: 14px; margin-bottom: 4px; }
    .party-addr { color: #475569; white-space: pre-line; }
    .party-meta { margin-top: 8px; color: #475569; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      margin: 12px 0 14px;
      font-size: 11px;
    }
    .meta-grid strong { color: #0f172a; }
    .party-table { margin-bottom: 14px; }
    .party-table td {
      width: 50%;
      vertical-align: top;
      border: 1px solid #cbd5e1;
      padding: 12px 14px;
    }
    .items-table th {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 8px 5px;
      border: 1px solid transparent;
    }
    .items-table td {
      padding: 7px 5px;
      border-bottom: 1px solid #e2e8f0;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      font-size: 11px;
      color: #334155;
      vertical-align: top;
    }
    .summary-wrap { margin-top: 14px; }
    .summary-left { width: 55%; vertical-align: top; padding-right: 18px; }
    .summary-right { width: 45%; vertical-align: top; }
    .words { font-weight: 700; margin-bottom: 10px; }
    .remarks { color: #475569; margin-bottom: 10px; }
    .declaration { margin-top: 12px; font-size: 10px; color: #64748b; }
    .totals td { padding: 5px 0; color: #64748b; }
    .totals .grand td {
      padding-top: 10px;
      border-top: 2px solid ${accent};
      font-weight: 800;
      color: #0f172a;
      font-size: 13px;
    }
    .sign { margin-top: 28px; text-align: right; }
    .sign-for { font-size: 10px; color: #64748b; margin-bottom: 34px; }
    .sign-line {
      font-weight: 700;
      border-top: 1px solid #94a3b8;
      display: inline-block;
      padding-top: 6px;
      min-width: 160px;
    }
    .footer-note {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #64748b;
    }
  `;

  if (templateId === "modern") {
    return (
      shared +
      `
      body { background: #ecfdf5; }
      .invoice-container {
        border: none;
        border-left: 6px solid ${accent};
        box-shadow: 0 8px 24px rgba(15, 118, 110, 0.08);
        border-radius: 4px;
      }
      .doc-title {
        text-align: left;
        font-size: 20px;
        font-weight: 800;
        color: ${accent};
        margin: 0;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .doc-sub { text-align: left; color: #64748b; font-size: 10px; margin: 4px 0 0; }
      .items-table th { background: ${accent}; color: #fff; }
      .party-table td { border-color: #99f6e4; background: #f0fdfa; border-radius: 0; }
    `
    );
  }

  if (templateId === "compact") {
    return (
      shared +
      `
      body { background: #f1f5f9; padding: 10px; }
      .invoice-container {
        border: 2px solid ${accent};
        padding: 18px 16px;
      }
      .doc-title {
        text-align: center;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin: 0;
        color: ${accent};
      }
      .doc-sub { text-align: center; font-size: 9px; color: #64748b; margin: 2px 0 8px; }
      .meta-grid { gap: 2px 12px; font-size: 10px; margin: 8px 0; }
      .party-table td { padding: 8px 10px; border-color: ${accent}; }
      .items-table th { background: ${accent}; color: #fff; padding: 5px 3px; }
      .items-table td { padding: 4px 3px; font-size: 10px; }
      .party-name { font-size: 12px; }
    `
    );
  }

  if (templateId === "formal") {
    return (
      shared +
      `
      body {
        background: #faf7f2;
        font-family: "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
      }
      .invoice-container {
        border: 3px double ${accent};
        padding: 26px 28px;
      }
      .title-block {
        border-bottom: 2px solid ${accent};
        padding-bottom: 10px;
        margin-bottom: 12px;
        text-align: center;
      }
      .doc-title {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin: 0;
        color: ${accent};
      }
      .doc-sub { margin: 4px 0 0; font-size: 10px; color: #78716c; }
      .items-table th {
        background: #fff7ed;
        color: ${accent};
        border: 1px solid ${accent};
      }
      .items-table td { border: 1px solid #e7e5e4; }
      .party-table td { border-color: #d6d3d1; }
      .totals .grand td { border-top-color: ${accent}; color: ${accent}; }
    `
    );
  }

  // classic
  return (
    shared +
    `
    body { background: #f1f5f9; }
    .invoice-container { border: 1px solid #cbd5e1; }
    .doc-title {
      text-align: center;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 0 4px;
      color: #0f172a;
    }
    .doc-sub { text-align: center; font-size: 10px; color: #64748b; margin: 0 0 14px; }
    .items-table th { background: #0f172a; color: #fff; border-color: #0f172a; }
  `
  );
}

function titleBlock(params: GenerateInvoiceParams, data: BuiltInvoice): string {
  const supplyLabel =
    data.supplyType === "intra"
      ? "Intra-State Supply (CGST + SGST)"
      : "Inter-State Supply (IGST)";

  if (data.templateId === "formal") {
    return `
    <div class="title-block">
      <h1 class="doc-title">Tax Invoice</h1>
      <p class="doc-sub">${supplyLabel} &nbsp;|&nbsp; ${escapeHtml(params.category)}</p>
    </div>`;
  }

  return `
    <h1 class="doc-title">Tax Invoice</h1>
    <p class="doc-sub">${supplyLabel} &nbsp;|&nbsp; Category: ${escapeHtml(params.category)}</p>`;
}

/** @deprecated Prefer generateGstInvoiceHtml with full params */
export function generateInvoiceHtml(
  vendor: Vendor,
  invNo: string,
  invDate: string,
  category: string,
  state: string,
  hubName: string,
  items: InvoiceLineItem[],
  remarks: string,
  companyAddress: string,
  paymentDetails?: KYCDetails | null,
  supplierGstNumber?: string,
  toPartyName?: string,
  toPartyAddress?: string,
  toPartyGstin?: string
): string {
  return generateGstInvoiceHtml({
    vendor,
    invNo,
    invDate,
    category,
    operatingState: state,
    hubName,
    items,
    remarks,
    companyAddress,
    paymentDetails,
    supplierGstin: supplierGstNumber || vendor.gstNumber || "",
    toPartyName: toPartyName || COMPANY_LEGAL_NAME,
    toPartyAddress: toPartyAddress || "",
    toPartyGstin: toPartyGstin || "",
    placeOfSupplyState: state,
    placeOfSupplyStateCode: "",
    supplierStateCode: null,
    reverseCharge: false,
  });
}

export function generateGstInvoiceHtml(params: GenerateInvoiceParams): string {
  const data = buildInvoiceData(params);
  const styles = templateStyles(data.templateId, data.accent);
  const body = partyAndTotalsBody(params, data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${escapeHtml(params.invNo || "DRAFT")}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="invoice-container" id="invoice-root">
    ${titleBlock(params, data)}
    ${body}
  </div>
</body>
</html>`;
}

export function calculateInvoiceGrandTotal(
  items: InvoiceLineItem[],
  supplierStateCode: string | null = null,
  placeOfSupplyStateCode: string | null = null
): number {
  return computeInvoiceGstTotals(items, supplierStateCode, placeOfSupplyStateCode)
    .grandTotal;
}

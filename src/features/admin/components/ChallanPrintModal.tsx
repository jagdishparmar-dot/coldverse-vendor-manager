"use client";

import { FileCheck, Printer, X } from "lucide-react";
import type { Invoice } from "@/src/types";
import { SmileLogo } from "@/src/components/Logo";
import {
  COMPANY_ACCOUNTS_DESK,
  COMPANY_LEGAL_NAME,
} from "@/src/constants/brand";
import { formatCurrency } from "@/src/features/admin/utils";
import {
  getChallanNumber,
  numberToWordsINR,
} from "@/src/features/admin/utils/challan";

type ChallanPrintModalProps = {
  invoice: Invoice;
  onClose: () => void;
};

function ChallanBarcode({ code }: { code: string }) {
  const bars = [1, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2];
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="h-7 w-40 bg-slate-950 flex items-end justify-between px-1 py-0.5">
        {bars.map((w, i) => (
          <div
            key={`${code}-${i}`}
            className="h-full bg-white"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <span className="font-mono text-[8px] text-slate-500 tracking-[0.2em]">{code}</span>
    </div>
  );
}

function ChallanDocument({
  invoice,
  density = "screen",
}: {
  invoice: Invoice;
  density?: "screen" | "print";
}) {
  const challanNumber = getChallanNumber(invoice);
  const amountInWords = numberToWordsINR(invoice.amount);
  const isPrint = density === "print";
  const generatedOn = new Date(invoice.uploadedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`bg-white text-slate-900 font-sans text-left leading-snug ${
        isPrint
          ? "p-8 max-w-[800px] mx-auto"
          : "p-5 sm:p-7 shadow-lg border border-slate-200 rounded-xl w-full max-w-[680px]"
      }`}
    >
      <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start gap-4">
        <div className="min-w-0">
          <SmileLogo className={isPrint ? "h-10 w-auto" : "h-8 w-auto"} showText={false} />
          <p
            className={`mt-2 font-bold tracking-wider uppercase text-slate-700 ${
              isPrint ? "text-[10px]" : "text-[9px]"
            }`}
          >
            {COMPANY_LEGAL_NAME}
          </p>
          <p className={`text-slate-500 ${isPrint ? "text-[9px] mt-1" : "text-[8px]"}`}>
            Vendor Billing & Accounts · Payment Processing Desk
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block text-[8px] font-bold uppercase tracking-widest text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 mb-1">
            Official Payment Challan
          </span>
          <h1
            className={`font-display font-bold text-slate-950 leading-tight ${
              isPrint ? "text-lg" : "text-base"
            }`}
          >
            CHALLAN COPY
          </h1>
          <p className="text-[10px] text-rose-600 font-bold font-mono mt-1">
            {challanNumber}
          </p>
          <p className="text-[8px] text-slate-400 mt-0.5">Generated: {generatedOn}</p>
        </div>
      </div>

      <div
        className={`mb-4 rounded-lg border border-amber-100 bg-amber-50/70 text-amber-900 ${
          isPrint ? "p-3 text-xs" : "p-2.5 text-[9px]"
        }`}
      >
        <strong>Payment directive:</strong> Remit the gross payable sum below and quote{" "}
        <strong className="font-mono">{challanNumber}</strong> in the transaction narration for
        automated reconciliation.
      </div>

      <div
        className={`grid grid-cols-2 gap-0 mb-4 rounded-lg border border-slate-200 overflow-hidden ${
          isPrint ? "text-xs" : "text-[10px]"
        }`}
      >
        <div className={`bg-slate-50 ${isPrint ? "p-4" : "p-3"}`}>
          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] mb-1.5">
            Vendor (Beneficiary)
          </p>
          <p className={`font-bold text-slate-900 ${isPrint ? "text-[13px]" : "text-[11px]"}`}>
            {invoice.vendorName}
          </p>
          <p className="text-slate-500 mt-1">Vendor ID: {invoice.vendorId}</p>
          <p className="text-slate-500">
            Category:{" "}
            <span className="font-semibold uppercase text-slate-700">{invoice.category}</span>
          </p>
          {(invoice.state || invoice.hubName) && (
            <p className="text-slate-500 mt-1">
              {[invoice.state, invoice.hubName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className={`border-l border-slate-200 bg-white ${isPrint ? "p-4" : "p-3"}`}>
          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] mb-1.5">
            Invoice Reference
          </p>
          <p className="font-bold text-slate-900">{invoice.invoiceNumber}</p>
          <p className="text-slate-500 mt-1">Invoice date: {invoice.date}</p>
          <p className="text-slate-500">
            Status:{" "}
            <span className="font-semibold text-slate-700">{invoice.status || "Pending"}</span>
          </p>
          <p className="text-slate-500 mt-1">
            Gross:{" "}
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(invoice.amount)}
            </span>
          </p>
        </div>
      </div>

      <div className="mb-4">
        <table
          className={`min-w-full border border-slate-200 overflow-hidden rounded-lg ${
            isPrint ? "text-xs" : "text-[10px]"
          }`}
        >
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">
                Particulars
              </th>
              <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">
                Amount (INR)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-2.5 text-slate-800 font-medium">
                Settlement of invoice {invoice.invoiceNumber} ({invoice.category})
                {invoice.remarks ? (
                  <span className="block text-slate-400 font-normal mt-0.5 italic">
                    Note: {invoice.remarks}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-950 align-top">
                {formatCurrency(invoice.amount)}
              </td>
            </tr>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-3 py-2 text-right text-slate-600 uppercase text-[9px] font-bold">
                Gross payable sum
              </td>
              <td
                className={`px-3 py-2 text-right font-mono font-black text-slate-950 ${
                  isPrint ? "text-base" : "text-sm"
                }`}
              >
                {formatCurrency(invoice.amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className={`mb-5 rounded-lg border border-slate-200 bg-slate-50 ${
          isPrint ? "p-3 text-xs" : "p-2.5 text-[10px]"
        }`}
      >
        <span className="text-slate-400 font-bold uppercase text-[8px] block mb-0.5">
          Amount in words
        </span>
        <span className="font-bold text-slate-800 italic">{amountInWords}</span>
      </div>

      <div
        className={`flex justify-between items-end border-t border-slate-200 ${
          isPrint ? "pt-6 mt-8 text-xs" : "pt-4 text-[9px]"
        }`}
      >
        <ChallanBarcode code={challanNumber} />
        <div className="text-right">
          <div
            className={`border-t border-dashed border-slate-300 inline-block ${
              isPrint ? "w-48 pt-1.5" : "w-40 pt-1"
            }`}
          >
            <p className="font-bold text-slate-700">Authorized Officer Stamp</p>
            <p className="text-slate-400">{COMPANY_ACCOUNTS_DESK}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChallanPrintModal({ invoice, onClose }: ChallanPrintModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto screen-only">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full flex flex-col my-auto animate-fade-in">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-slate-50/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-gray-950 leading-tight">
                  Payment Challan Copy
                </h2>
                <p className="text-[11px] text-gray-400 font-medium">
                  Official deposit challan for vendor payment processing
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-slate-100/80 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 bg-slate-100/40 border-b border-gray-100 max-h-[65vh] overflow-y-auto flex flex-col items-center">
            <ChallanDocument invoice={invoice} density="screen" />
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-6 py-4 border-t border-gray-100 bg-slate-50/50 rounded-b-2xl">
            <p className="text-[11px] text-gray-400 font-medium">
              Submit this challan with remittance or at the accounts cash counter.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Challan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="print-only">
        <ChallanDocument invoice={invoice} density="print" />
      </div>
    </>
  );
}

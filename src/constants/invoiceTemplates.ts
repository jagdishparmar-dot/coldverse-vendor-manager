export type InvoiceTemplateId = "classic" | "modern" | "compact" | "formal";

export type InvoiceTemplateMeta = {
  id: InvoiceTemplateId;
  name: string;
  description: string;
  accent: string;
};

export const INVOICE_TEMPLATES: InvoiceTemplateMeta[] = [
  {
    id: "classic",
    name: "Classic GST",
    description: "Standard tax invoice with dark header table — widely used for B2B GST filings.",
    accent: "#0f172a",
  },
  {
    id: "modern",
    name: "Modern Teal",
    description: "Clean layout with teal accent bar and soft section cards.",
    accent: "#0f766e",
  },
  {
    id: "compact",
    name: "Compact Ledger",
    description: "Dense bordered ledger style for multi-line service invoices.",
    accent: "#1e3a5f",
  },
  {
    id: "formal",
    name: "Formal Statement",
    description: "Formal double-border statement with centered title block.",
    accent: "#7c2d12",
  },
];

export function getInvoiceTemplate(id: InvoiceTemplateId | string | undefined): InvoiceTemplateMeta {
  return INVOICE_TEMPLATES.find((t) => t.id === id) || INVOICE_TEMPLATES[0];
}

import type { Hub, Invoice, Vendor } from "@/src/types";
import type { Hub as PrismaHub, Invoice as PrismaInvoice, Vendor as PrismaVendor } from "@/src/generated/prisma/client";

export function vendorToApi(vendor: PrismaVendor): Vendor {
  return {
    id: vendor.id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    token: vendor.token,
    status: vendor.status as Vendor["status"],
    categories: vendor.categories,
    createdAt: vendor.createdAt.toISOString(),
    gstNumber: vendor.gstNumber ?? undefined,
    state: vendor.state ?? undefined,
    states: vendor.states.length > 0 ? vendor.states : undefined,
    hubs: vendor.hubIds.length > 0 ? vendor.hubIds : undefined,
    archived: vendor.archived || undefined,
    deletionRemarks: vendor.deletionRemarks ?? undefined,
    archivedAt: vendor.archivedAt?.toISOString(),
  };
}

export function invoiceToApi(invoice: PrismaInvoice): Invoice {
  return {
    id: invoice.id,
    vendorId: invoice.vendorId,
    vendorName: invoice.vendorName,
    category: invoice.category,
    invoiceNumber: invoice.invoiceNumber,
    amount: Number(invoice.amount),
    date: invoice.date,
    fileName: invoice.fileName,
    fileType: invoice.fileType,
    filePath: invoice.filePath,
    uploadedAt: invoice.uploadedAt.toISOString(),
    status: invoice.status as Invoice["status"],
    remarks: invoice.remarks ?? undefined,
    state: invoice.state ?? undefined,
    hubId: invoice.hubId ?? undefined,
    hubName: invoice.hubName ?? undefined,
    archived: invoice.archived || undefined,
    deletionRemarks: invoice.deletionRemarks ?? undefined,
    archivedAt: invoice.archivedAt?.toISOString(),
  };
}

export function hubToApi(hub: PrismaHub): Hub {
  return {
    id: hub.id,
    name: hub.name,
    code: hub.code,
    state: hub.state,
    createdAt: hub.createdAt.toISOString(),
  };
}

export function portalInvoiceToApi(invoice: PrismaInvoice) {
  return {
    id: invoice.id,
    category: invoice.category,
    invoiceNumber: invoice.invoiceNumber,
    amount: Number(invoice.amount),
    date: invoice.date,
    fileName: invoice.fileName,
    uploadedAt: invoice.uploadedAt.toISOString(),
    status: invoice.status || "Pending",
    remarks: invoice.remarks || "",
    state: invoice.state || "",
    hubId: invoice.hubId || "",
    hubName: invoice.hubName || "",
  };
}

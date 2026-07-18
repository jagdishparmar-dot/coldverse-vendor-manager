import type { CompanyProfile, Hub, Invoice, KYCDetails, Vendor } from "@/src/types";
import type {
  CompanyProfile as PrismaCompanyProfile,
  Hub as PrismaHub,
  Invoice as PrismaInvoice,
  Vendor as PrismaVendor,
} from "@/src/generated/prisma/client";
import type { Prisma } from "@/src/generated/prisma/client";

function mapKycDetails(value: Prisma.JsonValue | null): KYCDetails | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as unknown as KYCDetails;
}

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
    kycStatus: (vendor.kycStatus as Vendor["kycStatus"]) || "pending_submission",
    kycDetails: mapKycDetails(vendor.kycDetails),
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
    hardCopySubmittedTo: invoice.hardCopySubmittedTo ?? undefined,
    hardCopySubmissionDate: invoice.hardCopySubmissionDate ?? undefined,
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
    stateCode: hub.stateCode ?? undefined,
    address: hub.address || undefined,
    city: hub.city || undefined,
    pincode: hub.pincode || undefined,
    gstin: hub.gstin ?? undefined,
    billingAddress: hub.billingAddress ?? undefined,
    createdAt: hub.createdAt.toISOString(),
    updatedAt: hub.updatedAt?.toISOString(),
  };
}

export function companyProfileToApi(profile: PrismaCompanyProfile): CompanyProfile {
  return {
    id: profile.id,
    legalName: profile.legalName,
    tradeName: profile.tradeName || undefined,
    pan: profile.pan || undefined,
    email: profile.email || undefined,
    phone: profile.phone || undefined,
    registeredAddress: profile.registeredAddress,
    registeredState: profile.registeredState,
    registeredStateCode: profile.registeredStateCode || undefined,
    registeredGstin: profile.registeredGstin,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
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
    hardCopySubmittedTo: invoice.hardCopySubmittedTo || "",
    hardCopySubmissionDate: invoice.hardCopySubmissionDate || "",
  };
}


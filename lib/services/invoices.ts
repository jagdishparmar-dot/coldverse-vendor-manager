import { prisma } from "@/lib/db";
import { invoiceToApi, portalInvoiceToApi, vendorToApi } from "@/lib/mappers";
import {
  buildInvoiceKey,
  uploadInvoiceFile,
} from "@/lib/storage/s3";
import { decodeAndValidateUpload } from "@/lib/upload-guards";
import { newSecureId, requirePortalSession } from "@/lib/auth-guards";
import { listCategories } from "@/lib/services/categories";
import { getCompanyProfile } from "@/lib/services/company";
import { notifyCompanyInvoiceUploaded, notifyVendorInvoiceStatusChanged } from "@/lib/services/notifications";
import { ServiceError } from "@/lib/services/utils";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  paginatedEnvelope,
} from "@/lib/pagination";
import type { Prisma } from "@/src/generated/prisma/client";

export async function listActiveInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: { archived: false },
    orderBy: { uploadedAt: "desc" },
  });
  return invoices.map(invoiceToApi);
}

export type ListInvoicesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  vendorId?: string;
  hubId?: string;
  month?: string;
  date?: string;
  hasRemarks?: boolean;
  archived?: boolean;
};

function buildInvoiceWhere(query: ListInvoicesQuery): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {
    archived: query.archived === true ? true : false,
  };

  if (query.category && query.category !== "All") {
    where.category = query.category;
  }
  if (query.status && query.status !== "All") {
    where.status = query.status;
  }
  if (query.vendorId && query.vendorId !== "All") {
    where.vendorId = query.vendorId;
  }
  if (query.hubId && query.hubId !== "All") {
    where.hubId = query.hubId;
  }
  if (query.date) {
    where.date = query.date;
  } else if (query.month && query.month !== "All") {
    // date stored as YYYY-MM-DD — match month segment
    where.date = { contains: `-${query.month}-` };
  }
  if (query.hasRemarks) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { remarks: { not: null } },
      { NOT: { remarks: "" } },
    ];
  }

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { vendorName: { contains: search, mode: "insensitive" } },
      { fileName: { contains: search, mode: "insensitive" } },
      { remarks: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listInvoicesPaginated(query: ListInvoicesQuery = {}) {
  const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
  const limit =
    query.limit && query.limit > 0
      ? Math.min(100, query.limit)
      : DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;
  const where = buildInvoiceWhere(query);

  // Status counts share filters except status itself
  const whereForCounts = buildInvoiceWhere({ ...query, status: undefined });

  const [rows, total, statusGroups] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: whereForCounts,
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    All: 0,
    Pending: 0,
    Paid: 0,
    Hold: 0,
    Rejected: 0,
  };
  for (const g of statusGroups) {
    const key = g.status || "Pending";
    statusCounts[key] = (statusCounts[key] || 0) + g._count._all;
    statusCounts.All += g._count._all;
  }

  return {
    ...paginatedEnvelope(rows.map(invoiceToApi), total, page, limit),
    statusCounts,
  };
}

export async function uploadInvoice(body: {
  vendorId?: string;
  category?: string;
  invoiceNumber?: string;
  amount?: number | string;
  date?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  state?: string;
  hubId?: string;
  hubName?: string;
  remarks?: string;
  hardCopySubmittedTo?: string;
  hardCopySubmissionDate?: string;
  token?: string;
}) {
  const {
    vendorId,
    category,
    invoiceNumber,
    amount,
    date,
    fileName,
    fileType,
    fileData,
    state,
    hubId,
    hubName,
    remarks,
    hardCopySubmittedTo,
    hardCopySubmissionDate,
    token,
  } = body;

  if (!vendorId || !category || !invoiceNumber || !amount || !date || !fileData) {
    throw new ServiceError(400, "Missing required invoice details or file.");
  }

  // Auth first — avoid leaking vendor/KYC existence to unauthenticated callers
  if (!token) {
    throw new ServiceError(401, "OTP Verification Required", { otpRequired: true });
  }
  const { vendor: sessionVendor } = await requirePortalSession(String(token));
  if (sessionVendor.id !== vendorId) {
    throw new ServiceError(403, "Token does not match vendor.");
  }

  const vendor = sessionVendor;

  if (vendor.kycStatus !== "verified") {
    throw new ServiceError(
      403,
      "KYC verification is required before submitting invoices."
    );
  }

  const { buffer, contentType } = decodeAndValidateUpload(fileData, {
    fileName,
    claimedType: fileType,
  });
  const uniqueFileName = buildInvoiceKey(vendorId, fileName);

  try {
    await uploadInvoiceFile(uniqueFileName, buffer, contentType);
  } catch (error) {
    console.error("[uploadInvoice] storage error", error);
    throw new ServiceError(503, "Failed to store invoice file.");
  }

  const invoice = await prisma.invoice.create({
    data: {
      id: newSecureId("inv"),
      vendorId,
      vendorName: vendor.name,
      category,
      invoiceNumber,
      amount: Number(amount),
      date,
      fileName: fileName || uniqueFileName,
      fileType: contentType,
      filePath: uniqueFileName,
      uploadedAt: new Date(),
      status: "Pending",
      remarks: remarks || "",
      state: state || "",
      hubId: hubId || "",
      hubName: hubName || "",
      hardCopySubmittedTo: hardCopySubmittedTo || "",
      hardCopySubmissionDate: hardCopySubmissionDate || "",
    },
  });

  void notifyCompanyInvoiceUploaded({
    vendorName: vendor.name,
    invoiceNumber: invoice.invoiceNumber,
    amount: Number(invoice.amount),
    category: invoice.category,
    invoiceDate: invoice.date,
  });

  return {
    message: "Invoice uploaded successfully!",
    invoice: invoiceToApi(invoice),
  };
}

export async function updateInvoice(
  id: string,
  body: {
    category?: string;
    invoiceNumber?: string;
    amount?: number | string;
    date?: string;
    state?: string;
    hubId?: string;
    hubName?: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
    hardCopySubmittedTo?: string;
    hardCopySubmissionDate?: string;
    /** Portal share token — required for portal edits */
    token?: string;
  },
  options?: { actor: "admin" | "portal"; portalVendorId?: string }
) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new ServiceError(404, "Invoice not found.");
  }

  if (options?.actor === "portal") {
    if (!options.portalVendorId || options.portalVendorId !== invoice.vendorId) {
      throw new ServiceError(403, "Forbidden");
    }
  }

  if (invoice.status === "Paid") {
    throw new ServiceError(400, "Paid invoices cannot be modified.");
  }

  const data: Record<string, unknown> = {};

  if (body.category) data.category = body.category;
  if (body.invoiceNumber) data.invoiceNumber = body.invoiceNumber;
  if (body.amount) data.amount = Number(body.amount);
  if (body.date) data.date = body.date;
  if (body.state !== undefined) data.state = body.state;
  if (body.hubId !== undefined) data.hubId = body.hubId;
  if (body.hubName !== undefined) data.hubName = body.hubName;
  if (body.hardCopySubmittedTo !== undefined) {
    data.hardCopySubmittedTo = body.hardCopySubmittedTo;
  }
  if (body.hardCopySubmissionDate !== undefined) {
    data.hardCopySubmissionDate = body.hardCopySubmissionDate;
  }

  if (body.fileData) {
    const { buffer, contentType } = decodeAndValidateUpload(body.fileData, {
      fileName: body.fileName,
      claimedType: body.fileType,
    });
    const uniqueFileName = buildInvoiceKey(invoice.vendorId, body.fileName);
    try {
      await uploadInvoiceFile(uniqueFileName, buffer, contentType);
    } catch (error) {
      console.error("[updateInvoice] storage error", error);
      throw new ServiceError(503, "Failed to store invoice file.");
    }
    data.fileName = body.fileName || uniqueFileName;
    data.fileType = contentType;
    data.filePath = uniqueFileName;
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data,
  });

  return {
    message: "Invoice updated successfully!",
    invoice: invoiceToApi(updated),
  };
}

export async function updateInvoiceStatus(
  id: string,
  status: string,
  remarks?: string
) {
  if (!status || !["Pending", "Paid", "Hold", "Rejected"].includes(status)) {
    throw new ServiceError(
      400,
      "Invalid status value. Must be Pending, Paid, Hold, or Rejected."
    );
  }

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new ServiceError(404, "Invoice not found.");
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status,
      remarks: remarks || "",
    },
  });

  const vendor = await prisma.vendor.findUnique({
    where: { id: updated.vendorId },
  });
  if (vendor) {
    void notifyVendorInvoiceStatusChanged({
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
      remarks: updated.remarks || undefined,
      amount: Number(updated.amount),
    });
  }

  return {
    message: `Invoice status updated to ${status}.`,
    invoice: invoiceToApi(updated),
  };
}

export async function archiveInvoice(id: string, remarks?: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new ServiceError(404, "Invoice not found.");
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      archived: true,
      deletionRemarks: remarks || "No remarks provided",
      archivedAt: new Date(),
    },
  });

  return {
    message: "Invoice archived successfully.",
    invoice: invoiceToApi(updated),
  };
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({ where: { id } });
}

export async function getVendorPortalInvoices(vendorId: string, limit = 100) {
  const invoices = await prisma.invoice.findMany({
    where: { vendorId, archived: false },
    orderBy: { uploadedAt: "desc" },
    take: Math.min(200, Math.max(1, limit)),
  });
  return invoices.map(portalInvoiceToApi);
}

export async function getPortalPayload(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new ServiceError(404, "Invalid vendor portal link. Please check with administrator.");
  }

  const hubFilter =
    vendor.hubIds.length > 0
      ? { id: { in: vendor.hubIds } }
      : vendor.states.length > 0
        ? { state: { in: vendor.states } }
        : undefined;

  const [invoices, categories, hubs, company] = await Promise.all([
    getVendorPortalInvoices(vendorId, 100),
    listCategories(),
    prisma.hub.findMany({
      where: hubFilter,
      orderBy: { name: "asc" },
      take: 500,
    }),
    getCompanyProfile(),
  ]);

  return {
    vendor: vendorToApi(vendor),
    invoices,
    categories,
    hubs: hubs.map((hub) => ({
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
    })),
    company,
  };
}

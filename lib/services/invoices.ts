import { prisma } from "@/lib/db";
import { invoiceToApi, portalInvoiceToApi, vendorToApi } from "@/lib/mappers";
import {
  buildInvoiceKey,
  decodeBase64File,
  uploadInvoiceFile,
} from "@/lib/storage/s3";
import { listCategories } from "@/lib/services/categories";
import { getCompanyProfile } from "@/lib/services/company";
import { listHubs } from "@/lib/services/hubs";
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

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new ServiceError(404, "Vendor not found.");
  }

  if (vendor.kycStatus !== "verified") {
    throw new ServiceError(
      403,
      "KYC verification is required before submitting invoices."
    );
  }

  if (token) {
    const session = await prisma.portalSession.findUnique({ where: { token } });
    if (!session || Date.now() > session.expiresAt.getTime()) {
      if (session) {
        await prisma.portalSession.delete({ where: { token } });
      }
      throw new ServiceError(401, "OTP Verification Required", { otpRequired: true });
    }
    if (vendor.token !== token) {
      throw new ServiceError(403, "Token does not match vendor.");
    }
  }

  const uniqueFileName = buildInvoiceKey(vendorId, fileName);
  const buffer = decodeBase64File(fileData);

  try {
    await uploadInvoiceFile(uniqueFileName, buffer, fileType || "application/octet-stream");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to store invoice file.";
    throw new ServiceError(503, message);
  }

  const invoice = await prisma.invoice.create({
    data: {
      id: `inv-${Date.now()}`,
      vendorId,
      vendorName: vendor.name,
      category,
      invoiceNumber,
      amount: Number(amount),
      date,
      fileName: fileName || uniqueFileName,
      fileType: fileType || "application/octet-stream",
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
  }
) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new ServiceError(404, "Invoice not found.");
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
    const uniqueFileName = buildInvoiceKey(invoice.vendorId, body.fileName);
    const buffer = decodeBase64File(body.fileData);
    try {
      await uploadInvoiceFile(
        uniqueFileName,
        buffer,
        body.fileType || "application/octet-stream"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to store invoice file.";
      throw new ServiceError(503, message);
    }
    data.fileName = body.fileName || uniqueFileName;
    data.fileType = body.fileType || "application/octet-stream";
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

export async function getVendorPortalInvoices(vendorId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { vendorId, archived: false },
    orderBy: { uploadedAt: "desc" },
  });
  return invoices.map(portalInvoiceToApi);
}

export async function getPortalPayload(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new ServiceError(404, "Invalid vendor portal link. Please check with administrator.");
  }

  const [invoices, categories, hubs, company] = await Promise.all([
    getVendorPortalInvoices(vendorId),
    listCategories(),
    listHubs(),
    getCompanyProfile(),
  ]);

  return {
    vendor: vendorToApi(vendor),
    invoices,
    categories,
    hubs,
    company,
  };
}

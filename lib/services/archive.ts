import { prisma } from "@/lib/db";
import { invoiceToApi, vendorToApi } from "@/lib/mappers";
import { ServiceError } from "@/lib/services/utils";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  paginatedEnvelope,
} from "@/lib/pagination";
import type { Prisma } from "@/src/generated/prisma/client";

export async function getArchivedItems() {
  const [archivedVendors, archivedInvoices] = await Promise.all([
    prisma.vendor.findMany({ where: { archived: true } }),
    prisma.invoice.findMany({ where: { archived: true } }),
  ]);

  return {
    archivedVendors: archivedVendors.map(vendorToApi),
    archivedInvoices: archivedInvoices.map(invoiceToApi),
  };
}

export type ArchiveListQuery = {
  type: "vendor" | "invoice";
  page?: number;
  limit?: number;
  search?: string;
};

export async function listArchivedPaginated(query: ArchiveListQuery) {
  const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
  const limit =
    query.limit && query.limit > 0
      ? Math.min(100, query.limit)
      : DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;
  const search = query.search?.trim();

  if (query.type === "vendor") {
    const where: Prisma.VendorWhereInput = { archived: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { deletionRemarks: { contains: search, mode: "insensitive" } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: { archivedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ]);
    return paginatedEnvelope(rows.map(vendorToApi), total, page, limit);
  }

  const where: Prisma.InvoiceWhereInput = { archived: true };
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { vendorName: { contains: search, mode: "insensitive" } },
      { fileName: { contains: search, mode: "insensitive" } },
      { deletionRemarks: { contains: search, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { archivedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);
  return paginatedEnvelope(rows.map(invoiceToApi), total, page, limit);
}

export async function restoreArchivedItem(type: string, id: string) {
  if (type === "vendor") {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new ServiceError(404, "Vendor not found.");
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        archived: false,
        deletionRemarks: null,
        archivedAt: null,
      },
    });

    return {
      message: "Vendor restored successfully.",
      vendor: vendorToApi(updated),
    };
  }

  if (type === "invoice") {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new ServiceError(404, "Invoice not found.");
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        archived: false,
        deletionRemarks: null,
        archivedAt: null,
      },
    });

    return {
      message: "Invoice restored successfully.",
      invoice: invoiceToApi(updated),
    };
  }

  throw new ServiceError(400, "Invalid archive type.");
}

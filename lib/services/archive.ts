import { prisma } from "@/lib/db";
import { invoiceToApi, vendorToApi } from "@/lib/mappers";
import { ServiceError } from "@/lib/services/utils";

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

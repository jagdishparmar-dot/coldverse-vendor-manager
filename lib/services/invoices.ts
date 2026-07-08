import { prisma } from "@/lib/db";
import { invoiceToApi, portalInvoiceToApi, vendorToApi } from "@/lib/mappers";
import {
  buildInvoiceKey,
  decodeBase64File,
  uploadInvoiceFile,
} from "@/lib/storage/s3";
import { listCategories } from "@/lib/services/categories";
import { listHubs } from "@/lib/services/hubs";
import { ServiceError } from "@/lib/services/utils";

export async function listActiveInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: { archived: false },
    orderBy: { uploadedAt: "desc" },
  });
  return invoices.map(invoiceToApi);
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
  } = body;

  if (!vendorId || !category || !invoiceNumber || !amount || !date || !fileData) {
    throw new ServiceError(400, "Missing required invoice details or file.");
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new ServiceError(404, "Vendor not found.");
  }

  const uniqueFileName = buildInvoiceKey(vendorId, fileName);
  const buffer = decodeBase64File(fileData);
  await uploadInvoiceFile(uniqueFileName, buffer, fileType || "application/octet-stream");

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
    },
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

  if (body.fileData) {
    const uniqueFileName = buildInvoiceKey(invoice.vendorId, body.fileName);
    const buffer = decodeBase64File(body.fileData);
    await uploadInvoiceFile(
      uniqueFileName,
      buffer,
      body.fileType || "application/octet-stream"
    );
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

  const [invoices, categories, hubs] = await Promise.all([
    getVendorPortalInvoices(vendorId),
    listCategories(),
    listHubs(),
  ]);

  return {
    vendor: vendorToApi(vendor),
    invoices,
    categories,
    hubs,
  };
}

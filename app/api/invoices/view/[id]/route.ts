import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdminOrInvoicePortalAccess } from "@/lib/auth-guards";
import { getInvoiceObject } from "@/lib/storage/s3";
import { getInvoiceById } from "@/lib/services/invoices";
import { ServiceError } from "@/lib/services/utils";
import { Readable } from "stream";

type RouteContext = { params: Promise<{ id: string }> };

const SAFE_INLINE = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      throw new ServiceError(404, "Invoice metadata not found.");
    }

    const portalToken = new URL(request.url).searchParams.get("token");
    await requireAdminOrInvoicePortalAccess({
      invoiceVendorId: invoice.vendorId,
      portalToken,
    });

    const { body, contentType } = await getInvoiceObject(invoice.filePath);
    const webStream = Readable.toWeb(body) as ReadableStream;
    const resolvedType =
      (invoice.fileType && SAFE_INLINE.has(invoice.fileType)
        ? invoice.fileType
        : null) ||
      (SAFE_INLINE.has(contentType) ? contentType : "application/octet-stream");

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": resolvedType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(invoice.fileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

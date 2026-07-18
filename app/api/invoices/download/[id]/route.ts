import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdminOrInvoicePortalAccess } from "@/lib/auth-guards";
import { getInvoiceObject } from "@/lib/storage/s3";
import { getInvoiceById } from "@/lib/services/invoices";
import { ServiceError } from "@/lib/services/utils";
import { Readable } from "stream";

type RouteContext = { params: Promise<{ id: string }> };

async function streamInvoice(
  request: Request,
  id: string,
  disposition: "attachment" | "inline"
) {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new ServiceError(404, "Invoice metadata not found.");
  }

  const portalToken = new URL(request.url).searchParams.get("token");
  await requireAdminOrInvoicePortalAccess({
    invoiceVendorId: invoice.vendorId,
    portalToken,
  });

  try {
    const { body, contentType } = await getInvoiceObject(invoice.filePath);
    const webStream = Readable.toWeb(body) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(invoice.fileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    throw new ServiceError(404, "Invoice file not found.");
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await streamInvoice(request, id, "attachment");
  } catch (error) {
    return handleServiceError(error);
  }
}

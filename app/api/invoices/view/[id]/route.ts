import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { getInvoiceObject } from "@/lib/storage/s3";
import { getInvoiceById } from "@/lib/services/invoices";
import { ServiceError } from "@/lib/services/utils";
import { Readable } from "stream";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      throw new ServiceError(404, "Invoice metadata not found.");
    }

    const { body, contentType } = await getInvoiceObject(invoice.filePath);
    const webStream = Readable.toWeb(body) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": invoice.fileType || contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(invoice.fileName)}"`,
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

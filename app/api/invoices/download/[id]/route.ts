import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { getInvoiceObject } from "@/lib/storage/s3";
import { getInvoiceById } from "@/lib/services/invoices";
import { ServiceError } from "@/lib/services/utils";
import { Readable } from "stream";

type RouteContext = { params: Promise<{ id: string }> };

async function streamInvoice(id: string, disposition: "attachment" | "inline") {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new ServiceError(404, "Invoice metadata not found.");
  }

  try {
    const { body, contentType } = await getInvoiceObject(invoice.filePath);
    const webStream = Readable.toWeb(body) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": invoice.fileType || contentType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(invoice.fileName)}"`,
      },
    });
  } catch {
    throw new ServiceError(404, "Invoice file not found on disk.");
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await streamInvoice(id, "attachment");
  } catch (error) {
    return handleServiceError(error);
  }
}

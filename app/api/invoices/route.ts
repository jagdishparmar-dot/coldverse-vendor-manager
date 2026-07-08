import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { listActiveInvoices } from "@/lib/services/invoices";

export async function GET() {
  try {
    const invoices = await listActiveInvoices();
    return NextResponse.json(invoices);
  } catch (error) {
    return handleServiceError(error);
  }
}

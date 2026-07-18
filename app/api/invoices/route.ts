import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { parsePageLimit } from "@/lib/pagination";
import { listInvoicesPaginated } from "@/lib/services/invoices";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePageLimit(searchParams);

    const result = await listInvoicesPaginated({
      page,
      limit,
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
      vendorId: searchParams.get("vendorId") || undefined,
      hubId: searchParams.get("hubId") || undefined,
      month: searchParams.get("month") || undefined,
      date: searchParams.get("date") || undefined,
      hasRemarks: searchParams.get("hasRemarks") === "1",
      archived: searchParams.get("archived") === "1",
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

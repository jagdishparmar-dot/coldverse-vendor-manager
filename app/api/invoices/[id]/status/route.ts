import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { updateInvoiceStatus } from "@/lib/services/invoices";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateInvoiceStatus(id, body.status, body.remarks);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

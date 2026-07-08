import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { archiveInvoice, updateInvoice } from "@/lib/services/invoices";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateInvoice(id, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await archiveInvoice(id, body.remarks);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

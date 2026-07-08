import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { archiveVendor, updateVendor } from "@/lib/services/vendors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const vendor = await updateVendor(id, body);
    return NextResponse.json(vendor);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await archiveVendor(id, body.remarks);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { deleteHub, updateHub } from "@/lib/services/hubs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateHub(id, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const result = await deleteHub(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { deleteHub } from "@/lib/services/hubs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteHub(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

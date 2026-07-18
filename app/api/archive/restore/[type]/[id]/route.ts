import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { restoreArchivedItem } from "@/lib/services/archive";

type RouteContext = { params: Promise<{ type: string; id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { type, id } = await context.params;
    const result = await restoreArchivedItem(type, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { verifyKyc } from "@/lib/services/kyc";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const result = await verifyKyc(id, body.status, body.remarks);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

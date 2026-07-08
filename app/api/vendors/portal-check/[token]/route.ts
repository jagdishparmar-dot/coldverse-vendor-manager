import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { portalCheck } from "@/lib/services/portal-auth";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const data = await portalCheck(token);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

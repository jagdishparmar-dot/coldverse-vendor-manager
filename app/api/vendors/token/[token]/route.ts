import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { getVerifiedPortalData } from "@/lib/services/portal-auth";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const data = await getVerifiedPortalData(token);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

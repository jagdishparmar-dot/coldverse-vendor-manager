import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { getDashboardStats } from "@/lib/services/stats";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stats = await getDashboardStats({
      hubId: searchParams.get("hubId") || undefined,
      vendorId: searchParams.get("vendorId") || undefined,
      category: searchParams.get("category") || undefined,
    });
    return NextResponse.json(stats);
  } catch (error) {
    return handleServiceError(error);
  }
}

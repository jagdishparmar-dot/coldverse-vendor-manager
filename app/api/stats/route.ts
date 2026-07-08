import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { getDashboardStats } from "@/lib/services/stats";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleServiceError(error);
  }
}

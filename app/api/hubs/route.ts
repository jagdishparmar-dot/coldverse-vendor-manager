import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { parsePageLimit } from "@/lib/pagination";
import { createHub, listHubOptions, listHubsPaginated } from "@/lib/services/hubs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);

    if (searchParams.get("options") === "1") {
      const limit = Number(searchParams.get("limit") || 500);
      const options = await listHubOptions(limit);
      return NextResponse.json(options);
    }

    const { page, limit } = parsePageLimit(searchParams);
    const result = await listHubsPaginated({
      page,
      limit,
      search: searchParams.get("search") || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const hub = await createHub(body);
    return NextResponse.json(hub, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

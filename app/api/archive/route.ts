import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { parsePageLimit } from "@/lib/pagination";
import { listArchivedPaginated } from "@/lib/services/archive";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const type =
      typeParam === "vendor" || typeParam === "invoice" ? typeParam : "invoice";
    const { page, limit } = parsePageLimit(searchParams);

    const result = await listArchivedPaginated({
      type,
      page,
      limit,
      search: searchParams.get("search") || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

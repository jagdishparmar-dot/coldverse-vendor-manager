import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { parsePageLimit } from "@/lib/pagination";
import {
  createVendor,
  listVendorOptions,
  listVendorsPaginated,
} from "@/lib/services/vendors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("options") === "1") {
      const limit = Number(searchParams.get("limit") || 500);
      const options = await listVendorOptions(limit);
      return NextResponse.json(options);
    }

    const { page, limit } = parsePageLimit(searchParams);
    const result = await listVendorsPaginated({
      page,
      limit,
      search: searchParams.get("search") || undefined,
      hubId: searchParams.get("hubId") || undefined,
      kycStatus: searchParams.get("kycStatus") || undefined,
      archived: searchParams.get("archived") === "1",
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
    const vendor = await createVendor(body);
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

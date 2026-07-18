import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { bulkCreateVendors } from "@/lib/services/vendors";
import { ServiceError } from "@/lib/services/utils";

const MAX_BULK_VENDORS = 200;

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const list = body.vendorsList;
    if (!Array.isArray(list)) {
      throw new ServiceError(400, "Invalid data format. Expected list of vendors.");
    }
    if (list.length > MAX_BULK_VENDORS) {
      throw new ServiceError(
        400,
        `Bulk import limited to ${MAX_BULK_VENDORS} vendors per request.`
      );
    }
    const result = await bulkCreateVendors(list);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth-guards";
import { bulkCreateHubs } from "@/lib/services/hubs";
import { ServiceError } from "@/lib/services/utils";

const MAX_BULK_HUBS = 200;

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const list = body.hubsList;
    if (!Array.isArray(list)) {
      throw new ServiceError(400, "Invalid data format. Expected list of hubs.");
    }
    if (list.length > MAX_BULK_HUBS) {
      throw new ServiceError(
        400,
        `Bulk import limited to ${MAX_BULK_HUBS} hubs per request.`
      );
    }
    const result = await bulkCreateHubs(list);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { bulkCreateVendors } from "@/lib/services/vendors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await bulkCreateVendors(body.vendorsList);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { createVendor, listActiveVendors } from "@/lib/services/vendors";

export async function GET() {
  try {
    const vendors = await listActiveVendors();
    return NextResponse.json(vendors);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vendor = await createVendor(body);
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

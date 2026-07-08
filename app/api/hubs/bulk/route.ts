import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { bulkCreateHubs } from "@/lib/services/hubs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await bulkCreateHubs(body.hubsList);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

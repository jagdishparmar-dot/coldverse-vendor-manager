import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { createHub, listHubs } from "@/lib/services/hubs";

export async function GET() {
  try {
    const hubs = await listHubs();
    return NextResponse.json(hubs);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const hub = await createHub(body);
    return NextResponse.json(hub, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

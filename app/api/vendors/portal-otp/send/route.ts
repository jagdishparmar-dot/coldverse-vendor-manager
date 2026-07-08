import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { sendPortalOtp } from "@/lib/services/portal-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await sendPortalOtp(body.token, body.phone);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

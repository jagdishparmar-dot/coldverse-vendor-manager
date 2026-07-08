import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { verifyPortalOtp } from "@/lib/services/portal-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await verifyPortalOtp(body.token, body.phone, body.otp);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { submitKyc } from "@/lib/services/kyc";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await submitKyc(body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/services/company";

export async function GET() {
  try {
    const company = await getCompanyProfile();
    return NextResponse.json(company);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const result = await updateCompanyProfile(body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

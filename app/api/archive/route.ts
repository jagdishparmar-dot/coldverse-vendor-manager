import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { getArchivedItems } from "@/lib/services/archive";

export async function GET() {
  try {
    const data = await getArchivedItems();
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

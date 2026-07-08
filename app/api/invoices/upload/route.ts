import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { uploadInvoice } from "@/lib/services/invoices";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await uploadInvoice(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

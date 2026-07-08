import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import { addCategory, listCategories } from "@/lib/services/categories";

export async function GET() {
  try {
    const categories = await listCategories();
    return NextResponse.json(categories);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await addCategory(body.name);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/services/utils";

export function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: error.message, ...error.details },
      { status: error.status }
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

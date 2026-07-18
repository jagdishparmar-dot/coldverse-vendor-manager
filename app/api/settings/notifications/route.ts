import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/lib/services/notifications";

export async function GET() {
  try {
    const settings = await getNotificationSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = await updateNotificationSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    return handleServiceError(error);
  }
}

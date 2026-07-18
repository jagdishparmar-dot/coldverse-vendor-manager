import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-utils";
import {
  getSessionOrNull,
  requireAdmin,
  requirePortalSession,
} from "@/lib/auth-guards";
import { archiveInvoice, updateInvoice } from "@/lib/services/invoices";
import { ServiceError } from "@/lib/services/utils";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const portalToken =
      typeof body.token === "string" ? body.token.trim() : "";

    const adminSession = await getSessionOrNull();
    if (adminSession) {
      if (adminSession.user.role !== "admin") {
        throw new ServiceError(403, "Admin access required.");
      }
      const result = await updateInvoice(id, body, { actor: "admin" });
      return NextResponse.json(result);
    }

    if (!portalToken) {
      throw new ServiceError(401, "Unauthorized");
    }

    const { vendor } = await requirePortalSession(portalToken);
    const result = await updateInvoice(id, body, {
      actor: "portal",
      portalVendorId: vendor.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const result = await archiveInvoice(id, body.remarks);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

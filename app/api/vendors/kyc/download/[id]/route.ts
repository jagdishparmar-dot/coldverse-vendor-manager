import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { handleServiceError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { getKycDocument } from "@/lib/services/kyc";
import { ServiceError } from "@/lib/services/utils";
import { Readable } from "stream";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get("docType") || undefined;
    const portalToken = searchParams.get("token");

    if (!portalToken) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session) {
        throw new ServiceError(401, "Unauthorized");
      }
    }

    const { body, contentType, fileName } = await getKycDocument(
      id,
      docType,
      portalToken
    );
    const webStream = Readable.toWeb(body) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}

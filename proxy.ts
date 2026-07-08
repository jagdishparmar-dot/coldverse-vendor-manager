import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

function isPublicApi(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/auth")) {
    return true;
  }

  if (pathname.startsWith("/api/vendors/portal-check/")) {
    return true;
  }

  if (pathname.startsWith("/api/vendors/portal-otp/")) {
    return true;
  }

  if (pathname.startsWith("/api/vendors/token/")) {
    return true;
  }

  if (pathname === "/api/invoices/upload" && method === "POST") {
    return true;
  }

  const invoiceIdMatch = pathname.match(/^\/api\/invoices\/([^/]+)$/);
  if (invoiceIdMatch && method === "PUT") {
    return true;
  }

  if (
    pathname.startsWith("/api/invoices/view/") ||
    pathname.startsWith("/api/invoices/download/")
  ) {
    return true;
  }

  return false;
}

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname, method)) {
      return NextResponse.next();
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  if (pathname === "/login") {
    const session = await getSession();
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/" && searchParams.has("token")) {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname === "/profile" || pathname === "/users") {
    const session = await getSession();
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/users" && session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/profile", "/users", "/api/:path*"],
};

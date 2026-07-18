import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ADMIN_DEFAULT_PATH, ADMIN_TABS } from "@/src/constants/adminRoutes";

const ADMIN_PAGE_PATHS = new Set([
  "/",
  "/profile",
  "/users",
  ...ADMIN_TABS.map((tab) => `/${tab}`),
]);

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

  if (pathname === "/api/vendors/kyc/submit" && method === "POST") {
    return true;
  }

  if (pathname.startsWith("/api/vendors/kyc/download/")) {
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
      return NextResponse.redirect(new URL(ADMIN_DEFAULT_PATH, request.url));
    }
    return NextResponse.next();
  }

  // Portal routes are public
  if (pathname.startsWith("/portal/")) {
    return NextResponse.next();
  }

  // Legacy vendor portal deep links: redirect /?token=x to /portal/x
  if (pathname === "/" && searchParams.has("token")) {
    const token = searchParams.get("token")!;
    const portalUrl = new URL(`/portal/${encodeURIComponent(token)}`, request.url);
    return NextResponse.redirect(portalUrl);
  }

  if (ADMIN_PAGE_PATHS.has(pathname)) {
    const session = await getSession();
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname === "/" ? ADMIN_DEFAULT_PATH : pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Users hub is admin-only; non-admins land on profile within Settings
    if (pathname === "/users" && session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/settings?tab=profile", request.url));
    }

    if (
      pathname === "/settings" &&
      session.user.role !== "admin" &&
      (searchParams.get("tab") === "users" ||
        searchParams.get("tab") === "workspace")
    ) {
      return NextResponse.redirect(new URL("/settings?tab=profile", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/profile",
    "/users",
    "/settings",
    "/dashboard",
    "/vendors",
    "/invoices",
    "/hubs",
    "/remarks",
    "/kyc",
    "/archive",
    "/portal/:path*",
    "/api/:path*",
  ],
};

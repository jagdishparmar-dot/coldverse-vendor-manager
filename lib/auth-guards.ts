import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/services/utils";

export type AppSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export async function getSessionOrNull(): Promise<AppSession | null> {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSessionOrNull();
  if (!session) {
    throw new ServiceError(401, "Unauthorized");
  }
  return session;
}

export async function requireAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    throw new ServiceError(403, "Admin access required.");
  }
  return session;
}

/** Valid portal OTP session for a vendor share token. */
export async function requirePortalSession(token: string) {
  if (!token?.trim()) {
    throw new ServiceError(401, "OTP Verification Required", { otpRequired: true });
  }

  const session = await prisma.portalSession.findUnique({
    where: { token: token.trim() },
  });

  if (!session || Date.now() > session.expiresAt.getTime()) {
    if (session) {
      await prisma.portalSession.delete({ where: { token: token.trim() } }).catch(() => undefined);
    }
    throw new ServiceError(401, "OTP Verification Required", { otpRequired: true });
  }

  const vendor = await prisma.vendor.findFirst({
    where: { token: token.trim(), archived: false },
  });
  if (!vendor) {
    await prisma.portalSession.delete({ where: { token: token.trim() } }).catch(() => undefined);
    throw new ServiceError(401, "OTP Verification Required", { otpRequired: true });
  }

  return { session, vendor };
}

/**
 * Admin cookie session OR portal token that owns the invoice's vendor.
 * Portal token may come from query (?token=) or JSON body.
 */
export async function requireAdminOrInvoicePortalAccess(options: {
  invoiceVendorId: string;
  portalToken?: string | null;
}) {
  const session = await getSessionOrNull();
  if (session) {
    return { kind: "admin" as const, session };
  }

  const token = options.portalToken?.trim();
  if (!token) {
    throw new ServiceError(401, "Unauthorized");
  }

  const { vendor } = await requirePortalSession(token);
  if (vendor.id !== options.invoiceVendorId) {
    throw new ServiceError(403, "Forbidden");
  }

  return { kind: "portal" as const, vendor };
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp.trim()).digest("hex");
}

export function generateNumericOtp(digits = 6): string {
  const max = 10 ** digits;
  const min = 10 ** (digits - 1);
  return String(randomInt(min, max));
}

export function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function newSecureId(prefix: string): string {
  return `${prefix}-${randomBytes(12).toString("hex")}`;
}

/** Simple in-memory rate limiter (per process). Good enough for single Coolify replica. */
type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = "Too many requests. Please try again later."
) {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (existing.count >= limit) {
    throw new ServiceError(429, message);
  }
  existing.count += 1;
}

export function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerList.get("x-real-ip") || "unknown";
}

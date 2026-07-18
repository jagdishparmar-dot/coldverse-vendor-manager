import { headers } from "next/headers";
import {
  assertRateLimit,
  clientIpFromHeaders,
  generateNumericOtp,
  hashOtp,
  requirePortalSession,
  safeEqualString,
} from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getPortalPayload } from "@/lib/services/invoices";
import { findVendorByToken } from "@/lib/services/vendors";
import { maskPhone, normalizePhone, ServiceError } from "@/lib/services/utils";

const OTP_FAIL_KEY = (token: string) => `otp-fail:${token}`;
const OTP_SEND_KEY = (token: string, ip: string) => `otp-send:${token}:${ip}`;

export async function portalCheck(token: string) {
  const vendor = await findVendorByToken(token);
  if (!vendor) {
    throw new ServiceError(
      404,
      "Invalid vendor portal link. Please check with administrator."
    );
  }

  // Do not expose full phone — masked only
  return {
    success: true,
    name: vendor.name,
    maskedPhone: maskPhone(vendor.phone),
  };
}

export async function sendPortalOtp(token: string, phone: string) {
  if (!token || !phone) {
    throw new ServiceError(400, "Token and phone number are required.");
  }

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList);
  assertRateLimit(
    OTP_SEND_KEY(token, ip),
    5,
    15 * 60 * 1000,
    "Too many OTP requests. Please wait before trying again."
  );

  const vendor = await findVendorByToken(token);
  if (!vendor) {
    throw new ServiceError(404, "Invalid vendor portal link.");
  }

  const normInput = normalizePhone(phone);
  const normRegistered = normalizePhone(vendor.phone);

  if (normInput !== normRegistered) {
    throw new ServiceError(
      400,
      "This mobile number is not registered for this vendor link. Please contact administrator."
    );
  }

  const generatedOtp = generateNumericOtp(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.portalOtp.upsert({
    where: { token },
    create: {
      token,
      otp: hashOtp(generatedOtp),
      phone: normInput,
      expiresAt,
    },
    update: {
      otp: hashOtp(generatedOtp),
      phone: normInput,
      expiresAt,
    },
  });

  // Never log plaintext OTP. Wire SMS/email provider here.
  console.log(
    `[OTP Portal Service] OTP issued for vendor ${vendor.id} (expires ${expiresAt.toISOString()})`
  );

  // Dev-only convenience: expose OTP when explicitly enabled
  if (process.env.PORTAL_OTP_DEV_ECHO === "true") {
    return {
      success: true,
      message: "OTP sent to registered mobile number.",
      devOtp: generatedOtp,
    };
  }

  return {
    success: true,
    message: "OTP sent to registered mobile number.",
  };
}

export async function verifyPortalOtp(token: string, phone: string, otp: string) {
  if (!token || !phone || !otp) {
    throw new ServiceError(400, "Token, phone number, and OTP are required.");
  }

  assertRateLimit(
    OTP_FAIL_KEY(token),
    8,
    15 * 60 * 1000,
    "Too many failed OTP attempts. Please request a new OTP later."
  );

  const vendor = await findVendorByToken(token);
  if (!vendor) {
    throw new ServiceError(404, "Invalid vendor portal link.");
  }

  const normInput = normalizePhone(phone);
  const stored = await prisma.portalOtp.findUnique({ where: { token } });

  if (!stored) {
    throw new ServiceError(400, "No active OTP request found. Please request a new OTP.");
  }

  if (Date.now() > stored.expiresAt.getTime()) {
    await prisma.portalOtp.delete({ where: { token } });
    throw new ServiceError(400, "OTP has expired. Please request a new OTP.");
  }

  const otpOk = safeEqualString(stored.otp, hashOtp(otp));
  const phoneOk = safeEqualString(stored.phone, normInput);
  if (!otpOk || !phoneOk) {
    throw new ServiceError(400, "Invalid OTP code. Please try again.");
  }

  await prisma.portalOtp.delete({ where: { token } });

  const sessionExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await prisma.portalSession.upsert({
    where: { token },
    create: {
      token,
      phone: normInput,
      expiresAt: sessionExpiresAt,
    },
    update: {
      phone: normInput,
      expiresAt: sessionExpiresAt,
    },
  });

  const payload = await getPortalPayload(vendor.id);

  return {
    success: true,
    message: "OTP verified successfully.",
    ...payload,
  };
}

export async function getVerifiedPortalData(token: string) {
  const { vendor } = await requirePortalSession(token);
  return getPortalPayload(vendor.id);
}

export async function logoutPortalSession(token: string) {
  if (!token) {
    throw new ServiceError(400, "Token is required.");
  }

  await prisma.portalSession.deleteMany({ where: { token } });
  await prisma.portalOtp.deleteMany({ where: { token } });

  return {
    success: true,
    message: "Logged out of vendor portal session.",
  };
}

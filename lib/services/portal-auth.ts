import { prisma } from "@/lib/db";
import { getPortalPayload } from "@/lib/services/invoices";
import { findVendorByToken } from "@/lib/services/vendors";
import { maskPhone, normalizePhone, ServiceError } from "@/lib/services/utils";

export async function portalCheck(token: string) {
  const vendor = await findVendorByToken(token);
  if (!vendor) {
    throw new ServiceError(
      404,
      "Invalid vendor portal link. Please check with administrator."
    );
  }

  return {
    success: true,
    name: vendor.name,
    phone: vendor.phone,
    maskedPhone: maskPhone(vendor.phone),
  };
}

export async function sendPortalOtp(token: string, phone: string) {
  if (!token || !phone) {
    throw new ServiceError(400, "Token and phone number are required.");
  }

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

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.portalOtp.upsert({
    where: { token },
    create: {
      token,
      otp: generatedOtp,
      phone: normInput,
      expiresAt,
    },
    update: {
      otp: generatedOtp,
      phone: normInput,
      expiresAt,
    },
  });

  console.log(
    `[OTP Portal Service] Generated OTP for ${vendor.name} (${phone}): ${generatedOtp}`
  );

  return {
    success: true,
    message: "OTP sent to registered mobile number.",
    otp: generatedOtp,
  };
}

export async function verifyPortalOtp(token: string, phone: string, otp: string) {
  if (!token || !phone || !otp) {
    throw new ServiceError(400, "Token, phone number, and OTP are required.");
  }

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

  if (stored.otp !== otp || stored.phone !== normInput) {
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
  const session = await prisma.portalSession.findUnique({ where: { token } });

  if (!session || Date.now() > session.expiresAt.getTime()) {
    if (session) {
      await prisma.portalSession.delete({ where: { token } });
    }
    throw new ServiceError(401, "OTP Verification Required", { otpRequired: true });
  }

  const vendor = await findVendorByToken(token);
  if (!vendor) {
    throw new ServiceError(
      404,
      "Invalid vendor portal link. Please check with administrator."
    );
  }

  return getPortalPayload(vendor.id);
}

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
import { isResendConfigured, sendMail } from "@/lib/email/resend";
import { vendorPortalOtpEmail } from "@/lib/email/templates";
import { sendOtpSms, isSmsConfigured } from "@/lib/sms";
import { getPortalPayload } from "@/lib/services/invoices";
import { findVendorByToken } from "@/lib/services/vendors";
import {
  maskEmail,
  maskPhone,
  normalizePhone,
  ServiceError,
} from "@/lib/services/utils";

const PORTAL_OTP_VALID_MINUTES = 5;

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

  const vendorEmail = vendor.email?.trim();

  // Do not expose full phone or email — masked only
  return {
    success: true,
    name: vendor.name,
    maskedPhone: maskPhone(vendor.phone),
    maskedEmail: vendorEmail ? maskEmail(vendorEmail) : undefined,
  };
}

function buildOtpDeliveryMessage(input: {
  smsSent: boolean;
  emailSent: boolean;
  maskedEmail?: string;
}): string {
  if (input.smsSent && input.emailSent && input.maskedEmail) {
    return `Verification code sent to your registered mobile number and email (${input.maskedEmail}).`;
  }
  if (input.emailSent && input.maskedEmail) {
    return `Verification code sent to your registered email (${input.maskedEmail}).`;
  }
  return "Verification code sent to your registered mobile number.";
}

async function sendPortalOtpEmail(vendorName: string, email: string, otp: string): Promise<void> {
  const { subject, html } = vendorPortalOtpEmail({
    vendorName,
    otp,
    validMinutes: PORTAL_OTP_VALID_MINUTES,
  });
  await sendMail({ to: email, subject, html });
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
  const expiresAt = new Date(Date.now() + PORTAL_OTP_VALID_MINUTES * 60 * 1000);
  const vendorEmail = vendor.email?.trim();
  const canSendEmail = Boolean(vendorEmail && isResendConfigured());

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

  const canSendSms = isSmsConfigured();

  if (!canSendSms && !canSendEmail) {
    await prisma.portalOtp.delete({ where: { token } }).catch(() => undefined);
    throw new ServiceError(
      503,
      "Verification delivery is not configured. Please contact administrator."
    );
  }

  let smsSent = false;
  let emailSent = false;

  if (canSendSms) {
    try {
      const sms = await sendOtpSms(normInput, generatedOtp);
      if (sms.ok) {
        smsSent = true;
        console.log(
          `[OTP Portal Service] SMS sent via ${sms.provider} for vendor ${vendor.id} (txn ${sms.transactionId ?? "n/a"})`
        );
      } else {
        console.error(
          `[OTP Portal Service] SMS rejected for vendor ${vendor.id}: ${sms.description ?? "unknown error"}`
        );
      }
    } catch (err) {
      console.error("[OTP Portal Service] SMS send failed:", err);
    }
  }

  if (canSendEmail && vendorEmail) {
    try {
      await sendPortalOtpEmail(vendor.name, vendorEmail, generatedOtp);
      emailSent = true;
      console.log(`[OTP Portal Service] OTP email sent for vendor ${vendor.id}`);
    } catch (err) {
      console.error("[OTP Portal Service] OTP email send failed:", err);
    }
  }

  if (!smsSent && !emailSent) {
    await prisma.portalOtp.delete({ where: { token } }).catch(() => undefined);
    throw new ServiceError(
      502,
      "Could not send verification code. Please try again later."
    );
  }

  const maskedEmail = vendorEmail ? maskEmail(vendorEmail) : undefined;
  const message = buildOtpDeliveryMessage({ smsSent, emailSent, maskedEmail });

  return {
    success: true,
    message,
    smsSent,
    emailSent,
    maskedEmail,
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

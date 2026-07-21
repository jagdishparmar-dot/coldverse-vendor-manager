/**
 * SmartPing (Omni) HTTP SMS — POST {baseUrl}/fe/api/v1/send
 * See docs/OMNI_API_MANUAL.docx
 */

import type { SmsSendResult } from "@/lib/sms/types";
import { normalizeIndiaMobile, renderOtpText } from "@/lib/sms/utils";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

/** Supports SMARTPING_* with legacy OMNI_SMS_* fallback. */
export function getSmartpingConfig() {
  const baseUrl = (env("SMARTPING_SMS_BASE_URL") || env("OMNI_SMS_BASE_URL")).replace(/\/+$/, "");
  const username = env("SMARTPING_SMS_USERNAME") || env("OMNI_SMS_USERNAME");
  const password = env("SMARTPING_SMS_PASSWORD") || env("OMNI_SMS_PASSWORD");
  const from = env("SMARTPING_SMS_FROM") || env("OMNI_SMS_FROM");
  const templateId = env("SMARTPING_SMS_TEMPLATE_ID") || env("OMNI_SMS_TEMPLATE_ID");
  const dltContentId = env("SMARTPING_SMS_DLT_CONTENT_ID") || env("OMNI_SMS_DLT_CONTENT_ID");
  const peId = env("SMARTPING_SMS_PE_ID") || env("OMNI_SMS_PE_ID");
  const unicodeRaw = env("SMARTPING_SMS_UNICODE") || env("OMNI_SMS_UNICODE") || "false";
  const textTemplate =
    env("SMARTPING_SMS_TEXT_TEMPLATE") ||
    env("OMNI_SMS_TEXT_TEMPLATE") ||
    env("SMS_OTP_TEXT_TEMPLATE");

  return {
    baseUrl,
    username,
    password,
    from,
    templateId,
    dltContentId,
    peId,
    unicode: unicodeRaw.toLowerCase() === "true",
    textTemplate,
    enabled: Boolean(baseUrl && username && password && from && templateId && textTemplate),
  };
}

export function assertSmartpingConfigReady() {
  const config = getSmartpingConfig();
  const missing: string[] = [];
  if (!config.baseUrl) missing.push("SMARTPING_SMS_BASE_URL (or OMNI_SMS_BASE_URL)");
  if (!config.username) missing.push("SMARTPING_SMS_USERNAME (or OMNI_SMS_USERNAME)");
  if (!config.password) missing.push("SMARTPING_SMS_PASSWORD (or OMNI_SMS_PASSWORD)");
  if (!config.from) missing.push("SMARTPING_SMS_FROM (or OMNI_SMS_FROM)");
  if (!config.templateId) missing.push("SMARTPING_SMS_TEMPLATE_ID (or OMNI_SMS_TEMPLATE_ID)");
  if (!config.textTemplate) {
    missing.push("SMARTPING_SMS_TEXT_TEMPLATE (or OMNI_SMS_TEXT_TEMPLATE / SMS_OTP_TEXT_TEMPLATE)");
  }
  if (missing.length) {
    throw new Error(`SmartPing SMS not configured: ${missing.join(", ")}`);
  }
}

export async function sendSmartpingOtpSms(to: string, otp: string): Promise<SmsSendResult> {
  assertSmartpingConfigReady();
  const config = getSmartpingConfig();
  const text = renderOtpText(otp, config.textTemplate);
  const msisdn = normalizeIndiaMobile(to);

  const body = new URLSearchParams();
  body.set("username", config.username);
  body.set("password", config.password);
  body.set("unicode", config.unicode ? "true" : "false");
  body.set("from", config.from);
  body.set("to", msisdn);
  body.set("text", text);
  body.set("templateId", config.templateId);
  if (config.dltContentId) body.set("dltContentId", config.dltContentId);
  if (config.peId) body.set("dltPrincipalEntityId", config.peId);

  const url = `${config.baseUrl}/fe/api/v1/send`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json, text/plain, */*",
    },
    body,
  });

  const rawText = await response.text();
  let raw: unknown = rawText;
  try {
    raw = JSON.parse(rawText);
  } catch {
    // plain-text errors
  }

  const payload = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const state = typeof payload.state === "string" ? payload.state : undefined;
  const description =
    typeof payload.description === "string"
      ? payload.description
      : typeof raw === "string"
        ? raw
        : undefined;

  return {
    ok: state === "SUBMIT_ACCEPTED",
    provider: "smartping",
    status: response.status,
    transactionId:
      (payload.transactionId as string | number | undefined) ??
      (payload.txid as string | number | undefined),
    state,
    description,
    raw,
  };
}

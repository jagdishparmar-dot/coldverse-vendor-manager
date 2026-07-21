import {
  sendSmartpingOtpSms,
  getSmartpingConfig,
  assertSmartpingConfigReady,
} from "@/lib/sms/smartping";
import type { SmsSendResult } from "@/lib/sms/types";

export type { SmsSendResult } from "@/lib/sms/types";
export { getSmartpingConfig };

export function isSmsConfigured(): boolean {
  return getSmartpingConfig().enabled;
}

export function assertActiveSmsConfigReady() {
  assertSmartpingConfigReady();
}

/** Send vendor portal OTP SMS via SmartPing. */
export async function sendOtpSms(to: string, otp: string): Promise<SmsSendResult> {
  return sendSmartpingOtpSms(to, otp);
}

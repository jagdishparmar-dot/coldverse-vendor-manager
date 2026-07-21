/** @deprecated Import from @/lib/sms/smartping */
export {
  getSmartpingConfig as getOmniSmsConfig,
  assertSmartpingConfigReady as assertOmniSmsEnvReady,
  sendSmartpingOtpSms as sendOmniSms,
} from "./smartping";

export { normalizeIndiaMobile as normalizeOmniMsisdn, renderOtpText as renderOmniOtpText } from "./utils";

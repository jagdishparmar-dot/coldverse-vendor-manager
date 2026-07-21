/**
 * SmartPing SMS smoke test.
 *
 *   npx tsx scripts/sms-smoke-test.ts 98XXXXXXXX
 *   npx tsx scripts/sms-smoke-test.ts              # uses SMS_TEST_TO from .env
 */
import "dotenv/config";
import {
  assertActiveSmsConfigReady,
  getSmartpingConfig,
  sendOtpSms,
} from "../lib/sms";

async function main() {
  assertActiveSmsConfigReady();

  const toArg = process.argv[2]?.trim() || process.env.SMS_TEST_TO?.trim();
  if (!toArg) {
    console.error("Usage: npx tsx scripts/sms-smoke-test.ts <10-digit-mobile>");
    console.error("   or set SMS_TEST_TO in .env");
    process.exit(1);
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const c = getSmartpingConfig();

  console.log("SMS smoke test (smartping)");
  console.log(`  To:       ${toArg}`);
  console.log(`  URL:      ${c.baseUrl}/fe/api/v1/send`);
  console.log(`  From:     ${c.from}`);
  console.log(`  Template: ${c.templateId}`);
  if (c.dltContentId) console.log(`  DLT ID:   ${c.dltContentId}`);
  if (c.peId) console.log(`  PE ID:    ${c.peId}`);
  console.log(`  OTP:      ${otp.replace(/\d/g, "*")}`);
  console.log("");

  let result;
  try {
    result = await sendOtpSms(toArg, otp);
  } catch (err) {
    console.error("Request failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("Response:");
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    console.error("\nSMS submit failed.");
    process.exit(1);
  }

  console.log("\nSMS accepted. Check the phone.");
  console.log(`Test OTP: ${otp}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * One-shot Sentry connectivity check.
 * Usage: npx tsx scripts/sentry-smoke-test.ts
 */
import "dotenv/config";
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (!dsn) {
  console.error("Missing NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN — aborting.");
  process.exit(1);
}

Sentry.init({
  dsn,
  tracesSampleRate: 1.0,
  enableLogs: true,
  environment: "smoke-test",
});

const marker = `vendor-manager-sentry-smoke-${Date.now()}`;

async function main() {
  Sentry.logger.info("Sentry smoke test log", { marker });
  Sentry.captureMessage(`Sentry smoke test OK: ${marker}`, "info");
  Sentry.captureException(new Error(`Sentry smoke test error: ${marker}`));

  const flushed = await Sentry.flush(10_000);
  if (!flushed) {
    console.error("Sentry.flush timed out — events may not have been sent.");
    process.exit(1);
  }

  console.log("Sent smoke events to Sentry.");
  console.log(`Marker: ${marker}`);
  console.log("Check Issues in smile-jg/vendor-manager-smile for the error event.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

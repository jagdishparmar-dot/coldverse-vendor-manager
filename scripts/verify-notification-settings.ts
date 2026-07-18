/**
 * Verifies email notification preference settings (DB + API).
 * Usage: npx tsx --tsconfig tsconfig.json scripts/verify-notification-settings.ts
 */
import "dotenv/config";
import {
  getNotificationSettings,
  notifyCompanyInvoiceUploaded,
  notifyVendorInvoiceStatusChanged,
  notifyVendorKycVerified,
  notifyVendorRegistered,
  updateNotificationSettings,
} from "../lib/services/notifications";
import { prisma } from "../lib/db";

const BASE = process.env.BETTER_AUTH_URL || "http://localhost:3000";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function testServiceLayer() {
  console.log("\n== Service layer ==");

  const before = await getNotificationSettings();
  if (before.id !== "default") {
    fail("getNotificationSettings id", `got ${before.id}`);
  } else {
    pass("getNotificationSettings returns default row");
  }

  const allTrue = await updateNotificationSettings({
    notifyCompanyOnInvoiceUpload: true,
    notifyVendorOnRegistration: true,
    notifyVendorOnKycVerified: true,
    notifyVendorOnInvoiceStatusChange: true,
  });
  if (
    allTrue.notifyCompanyOnInvoiceUpload &&
    allTrue.notifyVendorOnRegistration &&
    allTrue.notifyVendorOnKycVerified &&
    allTrue.notifyVendorOnInvoiceStatusChange
  ) {
    pass("enable all four toggles");
  } else {
    fail("enable all four toggles", JSON.stringify(allTrue));
  }

  const toggledOff = await updateNotificationSettings({
    notifyCompanyOnInvoiceUpload: false,
  });
  if (
    toggledOff.notifyCompanyOnInvoiceUpload === false &&
    toggledOff.notifyVendorOnRegistration === true &&
    toggledOff.notifyVendorOnKycVerified === true &&
    toggledOff.notifyVendorOnInvoiceStatusChange === true
  ) {
    pass("partial update only flips invoice-upload toggle");
  } else {
    fail("partial update", JSON.stringify(toggledOff));
  }

  const persisted = await getNotificationSettings();
  if (persisted.notifyCompanyOnInvoiceUpload === false) {
    pass("toggle persists across getNotificationSettings");
  } else {
    fail("toggle persistence");
  }

  // Notify helpers must not throw when disabled / missing recipients
  await updateNotificationSettings({
    notifyCompanyOnInvoiceUpload: false,
    notifyVendorOnRegistration: false,
    notifyVendorOnKycVerified: false,
    notifyVendorOnInvoiceStatusChange: false,
  });

  try {
    await notifyCompanyInvoiceUploaded({
      vendorName: "Test Vendor",
      invoiceNumber: "TEST-001",
      amount: 1000,
      category: "Rent",
      invoiceDate: "2026-07-01",
    });
    await notifyVendorRegistered({
      name: "Test Vendor",
      email: "vendor-test@example.com",
      token: "test-token",
    });
    await notifyVendorKycVerified({
      name: "Test Vendor",
      email: "vendor-test@example.com",
    });
    await notifyVendorInvoiceStatusChanged({
      vendorName: "Test Vendor",
      vendorEmail: "vendor-test@example.com",
      invoiceNumber: "TEST-001",
      status: "Paid",
      amount: 1000,
    });
    pass("notify helpers no-op safely when all toggles off");
  } catch (err) {
    fail(
      "notify helpers when disabled",
      err instanceof Error ? err.message : String(err)
    );
  }

  // Restore all enabled for normal ops
  await updateNotificationSettings({
    notifyCompanyOnInvoiceUpload: true,
    notifyVendorOnRegistration: true,
    notifyVendorOnKycVerified: true,
    notifyVendorOnInvoiceStatusChange: true,
  });
  pass("restore all toggles to enabled");
}

function extractCookies(res: Response): string {
  const headers = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : (() => {
          const single = res.headers.get("set-cookie");
          return single ? [single] : [];
        })();

  return setCookies
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function testHttpApi() {
  console.log("\n== HTTP API (authenticated) ==");

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    fail("admin credentials", "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD missing");
    return;
  }

  const unauth = await fetch(`${BASE}/api/settings/notifications`);
  if (unauth.status === 401) {
    pass("GET /api/settings/notifications requires auth", `status ${unauth.status}`);
  } else {
    fail("unauthenticated GET should be 401", `status ${unauth.status}`);
  }

  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!signIn.ok) {
    const body = await signIn.text();
    fail("admin sign-in", `${signIn.status} ${body.slice(0, 200)}`);
    return;
  }

  const cookie = extractCookies(signIn);
  if (!cookie) {
    fail("admin sign-in cookie", "no Set-Cookie returned");
    return;
  }
  pass("admin sign-in");

  const getRes = await fetch(`${BASE}/api/settings/notifications`, {
    headers: { Cookie: cookie },
  });
  if (!getRes.ok) {
    fail("authenticated GET settings", `${getRes.status}`);
    return;
  }
  const current = await getRes.json();
  pass(
    "authenticated GET settings",
    `upload=${current.notifyCompanyOnInvoiceUpload}`
  );

  const putRes = await fetch(`${BASE}/api/settings/notifications`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ notifyVendorOnKycVerified: false }),
  });
  if (!putRes.ok) {
    fail("authenticated PUT settings", `${putRes.status}`);
    return;
  }
  const afterPut = await putRes.json();
  if (afterPut.notifyVendorOnKycVerified === false) {
    pass("PUT flips KYC verified toggle to false");
  } else {
    fail("PUT KYC toggle", JSON.stringify(afterPut));
  }

  const getAgain = await fetch(`${BASE}/api/settings/notifications`, {
    headers: { Cookie: cookie },
  });
  const again = await getAgain.json();
  if (again.notifyVendorOnKycVerified === false) {
    pass("GET after PUT reflects saved preference");
  } else {
    fail("GET after PUT", JSON.stringify(again));
  }

  // Restore
  await fetch(`${BASE}/api/settings/notifications`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ notifyVendorOnKycVerified: true }),
  });
  pass("restore KYC verified toggle via API");
}

async function main() {
  console.log("Verifying email notification preferences…");
  console.log(`Base URL: ${BASE}`);

  try {
    await testServiceLayer();
    await testHttpApi();
  } finally {
    await prisma.$disconnect();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\nResult: ${checks.length - failed.length}/${checks.length} checks passed`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

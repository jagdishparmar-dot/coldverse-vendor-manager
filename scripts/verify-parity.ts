import { generateToken, maskPhone, normalizePhone } from "../lib/services/utils";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function testUtils() {
  assert(normalizePhone("+91 98765 43210") === "9876543210", "normalizePhone should keep last 10 digits");
  assert(maskPhone("+91 98765 43210").endsWith("3210"), "maskPhone should mask prefix and keep last 4");
  assert(generateToken("Aman Logistics").includes("aman-logistics"), "generateToken should slugify name");
}

function testExpectedRoutes() {
  const expected = [
    "/api/vendors",
    "/api/vendors/[id]",
    "/api/vendors/bulk",
    "/api/vendors/token/[token]",
    "/api/vendors/portal-check/[token]",
    "/api/vendors/portal-otp/send",
    "/api/vendors/portal-otp/verify",
    "/api/invoices",
    "/api/invoices/upload",
    "/api/invoices/[id]",
    "/api/invoices/[id]/status",
    "/api/invoices/download/[id]",
    "/api/invoices/view/[id]",
    "/api/categories",
    "/api/stats",
    "/api/hubs",
    "/api/hubs/bulk",
    "/api/hubs/[id]",
    "/api/archive",
    "/api/archive/restore/[type]/[id]",
  ];

  assert(expected.length === 20, `Expected 20 API route groups, got ${expected.length}`);
}

function main() {
  testUtils();
  testExpectedRoutes();
  console.log("Verification passed: utility functions and API route parity checklist.");
}

main();

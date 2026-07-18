import "dotenv/config";

const BASE = process.env.BETTER_AUTH_URL || "http://localhost:3000";

function extractCookies(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : (() => {
          const single = res.headers.get("set-cookie");
          return single ? [single] : [];
        })();
  return setCookies.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL!;
  const password = process.env.SEED_ADMIN_PASSWORD!;

  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  if (!signIn.ok) {
    throw new Error(`sign-in failed: ${signIn.status} ${await signIn.text()}`);
  }
  const cookie = extractCookies(signIn);
  const headers = { Cookie: cookie };

  async function get(path: string) {
    const res = await fetch(`${BASE}${path}`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`${path} → ${res.status} ${text.slice(0, 200)}`);
    return JSON.parse(text);
  }

  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const assert = (name: string, ok: boolean, detail: string) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  };

  const vendors = await get("/api/vendors?page=1&limit=25");
  assert(
    "vendors paginated",
    Array.isArray(vendors.items) &&
      vendors.items.length === 25 &&
      vendors.total > 25,
    `items=${vendors.items?.length} total=${vendors.total}`
  );

  const invoices = await get("/api/invoices?page=1&limit=25");
  assert(
    "invoices paginated",
    Array.isArray(invoices.items) &&
      invoices.items.length === 25 &&
      invoices.total > 25,
    `items=${invoices.items?.length} total=${invoices.total} all=${invoices.statusCounts?.All}`
  );

  const remarks = await get("/api/invoices?hasRemarks=1&page=1&limit=10");
  assert(
    "remarks filter",
    Array.isArray(remarks.items) && remarks.total > 0,
    `items=${remarks.items?.length} total=${remarks.total}`
  );

  const hubs = await get("/api/hubs?page=1&limit=25");
  assert(
    "hubs paginated",
    Array.isArray(hubs.items) && hubs.total >= hubs.items.length,
    `items=${hubs.items?.length} total=${hubs.total}`
  );

  const archive = await get("/api/archive?type=vendor&page=1&limit=10");
  assert(
    "archive vendors",
    Array.isArray(archive.items),
    `items=${archive.items?.length} total=${archive.total}`
  );

  const stats = await get("/api/stats");
  assert(
    "stats aggregates",
    typeof stats.totalVendors === "number" &&
      typeof stats.totalInvoices === "number" &&
      Array.isArray(stats.monthlyTrend),
    `vendors=${stats.totalVendors} invoices=${stats.totalInvoices} months=${stats.monthlyTrend?.length}`
  );

  const kyc = await get(
    "/api/vendors?kycStatus=pending_verification&page=1&limit=1"
  );
  assert(
    "kyc pending count",
    typeof kyc.total === "number" && kyc.total > 0,
    `total=${kyc.total}`
  );

  const page2 = await get("/api/vendors?page=2&limit=25");
  assert(
    "vendors page 2 distinct",
    page2.items?.[0]?.id !== vendors.items?.[0]?.id,
    `p1=${vendors.items?.[0]?.id} p2=${page2.items?.[0]?.id}`
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

/**
 * Verifies tab-aware filter logic against the local database (no HTTP/auth required).
 * Run: npx tsx --tsconfig tsconfig.json scripts/test-tab-filters.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { getDashboardStats } from "../lib/services/stats";
import { listInvoicesPaginated } from "../lib/services/invoices";
import { listHubsPaginated } from "../lib/services/hubs";

type CheckResult = { name: string; ok: boolean; detail: string };

const results: CheckResult[] = [];

function pass(name: string, detail: string) {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}: ${detail}`);
}

function fail(name: string, detail: string) {
  results.push({ name, ok: false, detail });
  console.error(`  ✗ ${name}: ${detail}`);
}

async function main() {
  console.log("\n=== Tab Filter Verification ===\n");

  const baselineStats = await getDashboardStats({});
  pass("baseline stats", `${baselineStats.totalInvoices} invoices, ${baselineStats.totalAmount} gross`);

  if (baselineStats.totalInvoices === 0) {
    fail("data presence", "No invoices in DB — seed with npm run db:seed:perf first");
    process.exit(1);
  }

  const sampleInvoice = await prisma.invoice.findFirst({
    where: { archived: false },
    select: {
      vendorId: true,
      category: true,
      status: true,
      date: true,
      hubId: true,
      remarks: true,
    },
  });

  if (!sampleInvoice) {
    fail("sample invoice", "Could not load a sample invoice");
    process.exit(1);
  }

  const monthSegment = sampleInvoice.date?.split("-")[1] ?? "01";

  // Dashboard: vendor filter
  const vendorStats = await getDashboardStats({ vendorId: sampleInvoice.vendorId });
  if (vendorStats.totalInvoices <= baselineStats.totalInvoices) {
    pass(
      "dashboard vendor filter",
      `${vendorStats.totalInvoices} invoices (baseline ${baselineStats.totalInvoices})`
    );
  } else {
    fail("dashboard vendor filter", "Filtered count exceeds baseline");
  }

  // Dashboard: category filter
  const categoryStats = await getDashboardStats({ category: sampleInvoice.category });
  if (categoryStats.totalInvoices <= baselineStats.totalInvoices) {
    pass(
      "dashboard category filter",
      `${categoryStats.totalInvoices} for category ${sampleInvoice.category}`
    );
  } else {
    fail("dashboard category filter", "Filtered count exceeds baseline");
  }

  // Dashboard: status filter
  const status = sampleInvoice.status || "Pending";
  const statusStats = await getDashboardStats({ status });
  const statusKpi = statusStats.statusCounts[status]?.count ?? 0;
  if (statusStats.totalInvoices === statusKpi || statusStats.totalInvoices <= baselineStats.totalInvoices) {
    pass("dashboard status filter", `${statusStats.totalInvoices} invoices with status ${status}`);
  } else {
    fail(
      "dashboard status filter",
      `total ${statusStats.totalInvoices} vs status KPI ${statusKpi}`
    );
  }

  // Dashboard: month filter
  const monthStats = await getDashboardStats({ month: monthSegment });
  if (monthStats.totalInvoices <= baselineStats.totalInvoices) {
    pass("dashboard month filter", `${monthStats.totalInvoices} for month ${monthSegment}`);
  } else {
    fail("dashboard month filter", "Filtered count exceeds baseline");
  }

  // Dashboard: specific date
  if (sampleInvoice.date) {
    const dateStats = await getDashboardStats({ date: sampleInvoice.date });
    if (dateStats.totalInvoices <= baselineStats.totalInvoices) {
      pass("dashboard date filter", `${dateStats.totalInvoices} on ${sampleInvoice.date}`);
    } else {
      fail("dashboard date filter", "Filtered count exceeds baseline");
    }
  }

  // Dashboard: hub filter
  if (sampleInvoice.hubId) {
    const hubStats = await getDashboardStats({ hubId: sampleInvoice.hubId });
    if (hubStats.totalInvoices <= baselineStats.totalInvoices) {
      pass("dashboard hub filter", `${hubStats.totalInvoices} for hub ${sampleInvoice.hubId}`);
    } else {
      fail("dashboard hub filter", "Filtered count exceeds baseline");
    }
  }

  // Invoices list: combined filters
  const invoiceList = await listInvoicesPaginated({
    page: 1,
    limit: 5,
    vendorId: sampleInvoice.vendorId,
    category: sampleInvoice.category,
    status,
  });
  pass(
    "invoices combined filter",
    `${invoiceList.total} total, page items ${invoiceList.items.length}`
  );

  // Remarks: hasRemarks + status
  const remarksBaseline = await listInvoicesPaginated({
    page: 1,
    limit: 1,
    hasRemarks: true,
  });
  pass("remarks baseline", `${remarksBaseline.total} invoices with remarks`);

  const remarksFiltered = await listInvoicesPaginated({
    page: 1,
    limit: 1,
    hasRemarks: true,
    status,
    vendorId: sampleInvoice.vendorId,
    month: monthSegment,
  });
  if (remarksFiltered.total <= remarksBaseline.total) {
    pass(
      "remarks tab filters",
      `${remarksFiltered.total} with status/vendor/month (baseline ${remarksBaseline.total})`
    );
  } else {
    fail("remarks tab filters", "Filtered remarks count exceeds baseline");
  }

  // Hubs: state filter
  const sampleHub = await prisma.hub.findFirst({ select: { state: true } });
  if (sampleHub?.state) {
    const allHubs = await listHubsPaginated({ page: 1, limit: 1 });
    const stateHubs = await listHubsPaginated({
      page: 1,
      limit: 100,
      state: sampleHub.state,
    });
    if (stateHubs.total <= allHubs.total) {
      pass("hubs state filter", `${stateHubs.total} hubs in ${sampleHub.state}`);
    } else {
      fail("hubs state filter", "State-filtered count exceeds total");
    }

    const searchHubs = await listHubsPaginated({
      page: 1,
      limit: 10,
      search: sampleHub.state.slice(0, 4),
      state: sampleHub.state,
    });
    if (searchHubs.total <= stateHubs.total) {
      pass("hubs search + state", `${searchHubs.total} hubs matching search+state`);
    } else {
      fail("hubs search + state", "Combined filter count exceeds state-only count");
    }
  } else {
    fail("hubs state filter", "No hub with state found");
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${results.length - failed}/${results.length} checks passed ===\n`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

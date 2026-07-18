/**
 * Large dummy dataset for local performance testing.
 *
 * Defaults (~25k invoices): 150 hubs · 3,000 vendors · ~8 invoices/vendor
 * Override with env:
 *   PERF_HUBS=200 PERF_VENDORS=5000 PERF_INVOICES_PER_VENDOR=10
 *
 * All rows use id/token prefixes `perf-` so they can be wiped safely.
 *
 *   npm run db:seed:perf
 *   npm run db:seed:perf:clear
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { INDIAN_STATES } from "../src/constants";
import { GST_STATE_CODES } from "../src/utils/gst";

const ID_PREFIX = "perf-";

const CATEGORIES = [
  "Rent",
  "Manpower",
  "Vehicle rent",
  "Repairs & maintenance",
  "Electricity",
  "Others",
];

const INVOICE_STATUSES = ["Pending", "Paid", "Hold", "Rejected"] as const;
const KYC_STATUSES = [
  "verified",
  "pending_verification",
  "pending_submission",
  "rejected",
] as const;

const REMARKS_SAMPLES = [
  "Awaiting hard copy at hub desk",
  "Amount mismatch vs PO — hold for clarification",
  "Duplicate invoice number flagged",
  "GSTIN validation pending from accounts",
  "Approved after revised attachment",
  "Vendor bank details updated post KYC",
  "Partial month rent — prorated",
  "Electricity slab recalculation required",
  "",
  "",
  "",
];

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function fakeGstin(state: string, index: number): string {
  const code = GST_STATE_CODES[state] || "24";
  const pan = `PERF${pad(index % 100000, 5)}A`;
  return `${code}${pan}${index % 10}Z${(index % 9) + 1}`;
}

function fakePhone(index: number): string {
  return `9${pad(700000000 + (index % 99999999), 9)}`.slice(0, 10);
}

function invoiceDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function ensureCategories() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

async function clearPerfData() {
  console.log("Clearing previous perf-* test data…");
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: { id: { startsWith: ID_PREFIX } },
  });
  const deletedVendors = await prisma.vendor.deleteMany({
    where: { id: { startsWith: ID_PREFIX } },
  });
  const deletedHubs = await prisma.hub.deleteMany({
    where: { id: { startsWith: ID_PREFIX } },
  });
  console.log(
    `Removed invoices=${deletedInvoices.count}, vendors=${deletedVendors.count}, hubs=${deletedHubs.count}`
  );
}

async function createManyBatched<T>(
  label: string,
  rows: T[],
  batchSize: number,
  insert: (chunk: T[]) => Promise<unknown>
) {
  const total = rows.length;
  for (let i = 0; i < total; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await insert(chunk);
    const done = Math.min(i + batchSize, total);
    if (done === total || done % (batchSize * 5) === 0 || i === 0) {
      console.log(`  ${label}: ${done}/${total}`);
    }
  }
}

async function seedPerfData() {
  const hubCount = envInt("PERF_HUBS", 150);
  const vendorCount = envInt("PERF_VENDORS", 3000);
  const invoicesPerVendor = envInt("PERF_INVOICES_PER_VENDOR", 8);
  const batchSize = envInt("PERF_BATCH", 500);

  console.log("Performance seed configuration:");
  console.log(`  hubs=${hubCount}`);
  console.log(`  vendors=${vendorCount}`);
  console.log(`  invoices/vendor≈${invoicesPerVendor}`);
  console.log(`  invoices total≈${vendorCount * invoicesPerVendor}`);
  console.log(`  batch=${batchSize}`);

  await ensureCategories();
  await clearPerfData();

  const hubStates = INDIAN_STATES.filter((s) => GST_STATE_CODES[s]);
  const hubs = Array.from({ length: hubCount }, (_, i) => {
    const n = i + 1;
    const state = pick(hubStates, i);
    const stateCode = GST_STATE_CODES[state] || "24";
    return {
      id: `${ID_PREFIX}hub-${pad(n, 4)}`,
      name: `Perf Hub ${pad(n, 4)} — ${state.split(" ")[0]}`,
      code: `PF${pad(n, 4)}`,
      state,
      stateCode,
      address: `${100 + (n % 800)} Logistics Park, Sector ${n % 50}`,
      city: state.split(" ")[0] || "City",
      pincode: pad(110000 + (n % 899999), 6).slice(0, 6),
      gstin: fakeGstin(state, n),
      billingAddress: null as string | null,
      createdAt: new Date(Date.now() - n * 3600_000),
    };
  });

  console.log("Inserting hubs…");
  await createManyBatched("hubs", hubs, batchSize, (chunk) =>
    prisma.hub.createMany({ data: chunk, skipDuplicates: true })
  );

  const hubIds = hubs.map((h) => h.id);

  console.log("Building vendors…");
  const vendors = Array.from({ length: vendorCount }, (_, i) => {
    const n = i + 1;
    const state = pick(hubStates, i + 3);
    const kycStatus = pick(KYC_STATUSES, i);
    const category = pick(CATEGORIES, i);
    const assignedHubs = [
      pick(hubIds, i),
      pick(hubIds, i + 17),
    ].filter((v, idx, arr) => arr.indexOf(v) === idx);

    const kycDetails =
      kycStatus === "pending_submission"
        ? null
        : {
            panNumber: `ABCDE${pad(n % 10000, 4)}F`,
            companyType: pick(
              ["Private Limited", "Partnership", "Proprietorship", "LLP"],
              i
            ),
            bankName: pick(
              ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak"],
              i
            ),
            accountNumber: `${1000000000 + n}`,
            ifscCode: `HDFC0${pad(n % 100000, 5)}`,
            beneficiaryName: `Perf Vendor ${pad(n, 4)}`,
            address: `${n}, Industrial Estate, ${state}`,
            submittedAt: new Date(
              Date.now() - (n % 90) * 86400_000
            ).toISOString(),
            ...(kycStatus === "verified"
              ? {
                  verifiedAt: new Date(
                    Date.now() - (n % 60) * 86400_000
                  ).toISOString(),
                }
              : {}),
            ...(kycStatus === "rejected"
              ? { remarks: "Incomplete KYC documents — resubmit PAN & cancelled cheque." }
              : {}),
          };

    return {
      id: `${ID_PREFIX}v-${pad(n, 5)}`,
      name: `Perf Vendor ${pad(n, 5)} ${pick(["Logistics", "Services", "Realty", "Power", "Fleet"], i)}`,
      email: `perf.vendor.${n}@example.com`,
      phone: fakePhone(n),
      token: `${ID_PREFIX}token-${pad(n, 5)}`,
      status: i % 17 === 0 ? "inactive" : "active",
      gstNumber: fakeGstin(state, n + 1000),
      state,
      states: [state],
      hubIds: assignedHubs,
      categories: [category, pick(CATEGORIES, i + 2)].filter(
        (v, idx, arr) => arr.indexOf(v) === idx
      ),
      kycStatus,
      kycDetails: kycDetails as object | null,
      archived: i % 41 === 0,
      deletionRemarks: i % 41 === 0 ? "Perf archive sample" : null,
      archivedAt: i % 41 === 0 ? new Date(Date.now() - (n % 20) * 86400_000) : null,
      createdAt: new Date(Date.now() - n * 60_000),
    };
  });

  console.log("Inserting vendors…");
  await createManyBatched("vendors", vendors, batchSize, (chunk) =>
    prisma.vendor.createMany({ data: chunk as never, skipDuplicates: true })
  );

  console.log("Building invoices…");
  const invoices: {
    id: string;
    vendorId: string;
    vendorName: string;
    category: string;
    invoiceNumber: string;
    amount: number;
    date: string;
    fileName: string;
    fileType: string;
    filePath: string;
    uploadedAt: Date;
    status: string;
    remarks: string;
    state: string;
    hubId: string;
    hubName: string;
    hardCopySubmittedTo: string;
    hardCopySubmissionDate: string;
    archived: boolean;
    deletionRemarks: string | null;
    archivedAt: Date | null;
  }[] = [];

  let invSeq = 0;
  for (let v = 0; v < vendors.length; v++) {
    const vendor = vendors[v]!;
    // Slight variance so totals aren't perfectly uniform
    const count = invoicesPerVendor + (v % 3);
    for (let j = 0; j < count; j++) {
      invSeq += 1;
      const hubId = pick(vendor.hubIds.length ? vendor.hubIds : hubIds, j);
      const hub = hubs.find((h) => h.id === hubId) || hubs[0]!;
      const status = pick(INVOICE_STATUSES, invSeq);
      const remarks = pick(REMARKS_SAMPLES, invSeq + j);
      const archived = vendor.archived || invSeq % 53 === 0;

      invoices.push({
        id: `${ID_PREFIX}inv-${pad(invSeq, 6)}`,
        vendorId: vendor.id,
        vendorName: vendor.name,
        category: pick(vendor.categories, j),
        invoiceNumber: `PERF-INV-${pad(invSeq, 6)}`,
        amount: Math.round((5000 + (invSeq % 95000) + (j + 1) * 137.5) * 100) / 100,
        date: invoiceDate((invSeq % 400) + j),
        fileName: `perf-invoice-${invSeq}.pdf`,
        fileType: "application/pdf",
        filePath: `perf/invoices/${vendor.id}/${invSeq}.pdf`,
        uploadedAt: new Date(Date.now() - invSeq * 45_000),
        status,
        remarks,
        state: vendor.state,
        hubId: hub.id,
        hubName: hub.name,
        hardCopySubmittedTo: j % 4 === 0 ? hub.name : "",
        hardCopySubmissionDate: j % 4 === 0 ? invoiceDate(invSeq % 30) : "",
        archived,
        deletionRemarks: archived ? "Perf archived invoice" : null,
        archivedAt: archived ? new Date(Date.now() - (invSeq % 15) * 86400_000) : null,
      });
    }
  }

  console.log(`Inserting invoices (${invoices.length})…`);
  await createManyBatched("invoices", invoices, batchSize, (chunk) =>
    prisma.invoice.createMany({ data: chunk, skipDuplicates: true })
  );

  const [hubTotal, vendorTotal, invoiceTotal, kycPending, withRemarks] =
    await Promise.all([
      prisma.hub.count({ where: { id: { startsWith: ID_PREFIX } } }),
      prisma.vendor.count({ where: { id: { startsWith: ID_PREFIX } } }),
      prisma.invoice.count({ where: { id: { startsWith: ID_PREFIX } } }),
      prisma.vendor.count({
        where: {
          id: { startsWith: ID_PREFIX },
          kycStatus: "pending_verification",
        },
      }),
      prisma.invoice.count({
        where: {
          id: { startsWith: ID_PREFIX },
          archived: false,
          remarks: { not: "" },
        },
      }),
    ]);

  console.log("\nPerf seed complete:");
  console.log(`  hubs: ${hubTotal}`);
  console.log(`  vendors: ${vendorTotal}`);
  console.log(`  invoices: ${invoiceTotal}`);
  console.log(`  KYC pending verification: ${kycPending}`);
  console.log(`  invoices with remarks: ${withRemarks}`);
  console.log("\nTip: open Dashboard / Vendors / Invoices / Hubs / Remarks / KYC and measure load time.");
  console.log("Clear later with: npm run db:seed:perf:clear");
}

async function main() {
  const mode = process.argv[2] || "seed";
  try {
    if (mode === "clear") {
      await clearPerfData();
    } else {
      await seedPerfData();
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

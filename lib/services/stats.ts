import { prisma } from "@/lib/db";
import { Prisma } from "@/src/generated/prisma/client";

export type DashboardStatsQuery = {
  hubId?: string;
  vendorId?: string;
  category?: string;
  status?: string;
  month?: string;
  date?: string;
};

function applyInvoiceFilters(
  query: DashboardStatsQuery,
  base: Prisma.InvoiceWhereInput = { archived: false }
): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = { ...base };

  if (query.hubId && query.hubId !== "All") {
    where.hubId = query.hubId;
  }
  if (query.vendorId && query.vendorId !== "All") {
    where.vendorId = query.vendorId;
  }
  if (query.category && query.category !== "All") {
    where.category = query.category;
  }
  if (query.status && query.status !== "All") {
    where.status = query.status;
  }
  if (query.date) {
    where.date = query.date;
  } else if (query.month && query.month !== "All") {
    where.date = { contains: `-${query.month}-` };
  }

  return where;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function getDashboardStats(query: DashboardStatsQuery = {}) {
  const invoiceWhere = applyInvoiceFilters(query);

  const vendorWhere: Prisma.VendorWhereInput = { archived: false };
  if (query.hubId && query.hubId !== "All") {
    vendorWhere.hubIds = { has: query.hubId };
  }
  if (query.vendorId && query.vendorId !== "All") {
    vendorWhere.id = query.vendorId;
  }

  const hubFilter =
    query.hubId && query.hubId !== "All"
      ? Prisma.sql`AND "hubId" = ${query.hubId}`
      : Prisma.empty;
  const vendorFilter =
    query.vendorId && query.vendorId !== "All"
      ? Prisma.sql`AND "vendorId" = ${query.vendorId}`
      : Prisma.empty;
  const categoryFilter =
    query.category && query.category !== "All"
      ? Prisma.sql`AND category = ${query.category}`
      : Prisma.empty;
  const statusFilter =
    query.status && query.status !== "All"
      ? Prisma.sql`AND status = ${query.status}`
      : Prisma.empty;
  const dateFilter = query.date
    ? Prisma.sql`AND date = ${query.date}`
    : query.month && query.month !== "All"
      ? Prisma.sql`AND date LIKE ${`%-${query.month}-%`}`
      : Prisma.empty;

  const [
    totalVendors,
    totalInvoices,
    amountAgg,
    categoryGroups,
    statusGroups,
    topVendors,
    monthlyRows,
  ] = await Promise.all([
    prisma.vendor.count({ where: vendorWhere }),
    prisma.invoice.count({ where: invoiceWhere }),
    prisma.invoice.aggregate({
      where: invoiceWhere,
      _sum: { amount: true },
    }),
    prisma.invoice.groupBy({
      by: ["category"],
      where: invoiceWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: invoiceWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.invoice.groupBy({
      by: ["vendorId", "vendorName"],
      where: invoiceWhere,
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 50,
    }),
    prisma.$queryRaw<{ month_key: string; count: bigint; total: Prisma.Decimal }[]>`
      SELECT substring(date, 1, 7) AS month_key,
             COUNT(*)::bigint AS count,
             COALESCE(SUM(amount), 0) AS total
      FROM "Invoice"
      WHERE archived = false
      ${hubFilter}
      ${vendorFilter}
      ${categoryFilter}
      ${statusFilter}
      ${dateFilter}
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 24
    `,
  ]);

  const statusCounts: Record<string, { count: number; total: number }> = {
    Pending: { count: 0, total: 0 },
    Paid: { count: 0, total: 0 },
    Hold: { count: 0, total: 0 },
    Rejected: { count: 0, total: 0 },
  };
  for (const g of statusGroups) {
    const key = g.status || "Pending";
    statusCounts[key] = {
      count: g._count._all,
      total: Number(g._sum.amount || 0),
    };
  }

  const monthlyTrend = monthlyRows.map((row) => {
    const [year, month] = row.month_key.split("-");
    const monthIdx = Number(month) - 1;
    return {
      monthKey: row.month_key,
      sortKey: row.month_key,
      label: `${MONTH_LABELS[monthIdx] || month} ${year}`,
      count: Number(row.count),
      total: Number(row.total),
    };
  });

  return {
    totalVendors,
    totalInvoices,
    totalAmount: Number(amountAgg._sum.amount || 0),
    categories: categoryGroups.map((g) => ({
      name: g.category,
      count: g._count._all,
      total: Number(g._sum.amount || 0),
    })),
    vendors: topVendors.map((g) => ({
      vendorId: g.vendorId,
      vendorName: g.vendorName,
      invoiceCount: g._count._all,
      totalAmount: Number(g._sum.amount || 0),
    })),
    statusCounts,
    monthlyTrend,
  };
}

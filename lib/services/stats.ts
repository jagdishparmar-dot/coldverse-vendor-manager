import { prisma } from "@/lib/db";

export async function getDashboardStats() {
  const [activeVendors, activeInvoices] = await Promise.all([
    prisma.vendor.findMany({ where: { archived: false } }),
    prisma.invoice.findMany({ where: { archived: false } }),
  ]);

  const totalVendors = activeVendors.length;
  const totalInvoices = activeInvoices.length;
  const totalAmount = activeInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0
  );

  const categoriesMap: Record<string, { count: number; total: number }> = {};
  activeInvoices.forEach((inv) => {
    if (!categoriesMap[inv.category]) {
      categoriesMap[inv.category] = { count: 0, total: 0 };
    }
    categoriesMap[inv.category].count += 1;
    categoriesMap[inv.category].total += Number(inv.amount);
  });

  const vendorStats: Record<string, { name: string; count: number; total: number }> = {};
  activeVendors.forEach((v) => {
    vendorStats[v.id] = { name: v.name, count: 0, total: 0 };
  });

  activeInvoices.forEach((inv) => {
    if (vendorStats[inv.vendorId]) {
      vendorStats[inv.vendorId].count += 1;
      vendorStats[inv.vendorId].total += Number(inv.amount);
    } else {
      vendorStats[inv.vendorId] = {
        name: `${inv.vendorName} (Archived)`,
        count: 1,
        total: Number(inv.amount),
      };
    }
  });

  return {
    totalVendors,
    totalInvoices,
    totalAmount,
    categories: Object.entries(categoriesMap).map(([name, stats]) => ({
      name,
      count: stats.count,
      total: stats.total,
    })),
    vendors: Object.entries(vendorStats).map(([id, stats]) => ({
      vendorId: id,
      vendorName: stats.name,
      invoiceCount: stats.count,
      totalAmount: stats.total,
    })),
  };
}

import "dotenv/config";
import { prisma } from "../lib/db";

const token = process.argv[2] ?? "Sq2VkBqSW4hnTOkuHBTYj6qDs_qtHYOI";

async function main() {
  const vendor = await prisma.vendor.findFirst({ where: { token } });
  const session = await prisma.portalSession.findUnique({ where: { token } });
  const otp = await prisma.portalOtp.findUnique({ where: { token } });

  console.log("Token:", token);
  console.log("Vendor:", vendor ? { id: vendor.id, name: vendor.name, archived: vendor.archived } : null);
  console.log("Portal session:", session);
  console.log("Portal OTP:", otp ? { expiresAt: otp.expiresAt.toISOString() } : null);

  const base = process.env.BETTER_AUTH_URL || "http://localhost:3001";
  for (const path of [
    `/api/vendors/token/${encodeURIComponent(token)}`,
    `/api/vendors/portal-check/${encodeURIComponent(token)}`,
  ]) {
    const res = await fetch(`${base}${path}`);
    const text = await res.text();
    console.log(`\n${path} -> ${res.status}`);
    console.log(text.slice(0, 300));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const result = await prisma.vendor.updateMany({
    where: { kycStatus: "pending_submission" },
    data: {
      kycStatus: "verified",
      kycDetails: {
        panNumber: "AAAPL1234C",
        companyType: "Private Limited Company (Pvt Ltd)",
        bankName: "HDFC Bank",
        accountNumber: "50100123456789",
        ifscCode: "HDFC0001234",
        beneficiaryName: "Seed Vendor",
        address: "Registered Office",
        submittedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        remarks: "Backfilled after KYC migration",
      },
    },
  });
  console.log(`Updated vendors: ${result.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

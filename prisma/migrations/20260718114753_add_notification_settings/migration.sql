-- AlterTable
ALTER TABLE "CompanyProfile" ALTER COLUMN "id" SET DEFAULT 'default';

-- AlterTable
ALTER TABLE "Hub" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "notifyCompanyOnInvoiceUpload" BOOLEAN NOT NULL DEFAULT true,
    "notifyVendorOnRegistration" BOOLEAN NOT NULL DEFAULT true,
    "notifyVendorOnKycVerified" BOOLEAN NOT NULL DEFAULT true,
    "notifyVendorOnInvoiceStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

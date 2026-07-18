-- Depends on 20260718120000_company_profile_hub_gst (CompanyProfile + Hub.updatedAt).
ALTER TABLE "CompanyProfile" ALTER COLUMN "id" SET DEFAULT 'default';

ALTER TABLE "Hub" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "NotificationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "notifyCompanyOnInvoiceUpload" BOOLEAN NOT NULL DEFAULT true,
    "notifyVendorOnRegistration" BOOLEAN NOT NULL DEFAULT true,
    "notifyVendorOnKycVerified" BOOLEAN NOT NULL DEFAULT true,
    "notifyVendorOnInvoiceStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

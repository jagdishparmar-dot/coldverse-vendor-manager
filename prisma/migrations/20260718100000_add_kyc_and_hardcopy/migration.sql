-- AlterTable Vendor: add KYC fields
ALTER TABLE "Vendor" ADD COLUMN "kycStatus" TEXT NOT NULL DEFAULT 'pending_submission';
ALTER TABLE "Vendor" ADD COLUMN "kycDetails" JSONB;

-- AlterTable Invoice: add hard-copy tracking fields
ALTER TABLE "Invoice" ADD COLUMN "hardCopySubmittedTo" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "hardCopySubmissionDate" TEXT;

-- CreateIndex
CREATE INDEX "Vendor_kycStatus_idx" ON "Vendor"("kycStatus");

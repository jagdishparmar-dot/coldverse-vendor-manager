-- AlterTable Hub: GST / address fields for tax invoices
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "stateCode" TEXT;
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "pincode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Hub_state_idx" ON "Hub"("state");
CREATE INDEX IF NOT EXISTS "Hub_gstin_idx" ON "Hub"("gstin");

-- CompanyProfile singleton (buyer / Coldverse billing master)
CREATE TABLE IF NOT EXISTS "CompanyProfile" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL DEFAULT '',
    "pan" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "registeredAddress" TEXT NOT NULL,
    "registeredState" TEXT NOT NULL,
    "registeredStateCode" TEXT NOT NULL DEFAULT '',
    "registeredGstin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CompanyProfile" (
  "id",
  "legalName",
  "tradeName",
  "pan",
  "email",
  "phone",
  "registeredAddress",
  "registeredState",
  "registeredStateCode",
  "registeredGstin",
  "createdAt",
  "updatedAt"
)
VALUES (
  'default',
  'Coldverse Supply Chain Pvt. Ltd.',
  'Coldverse',
  '',
  'accounts@coldverse.in',
  '',
  'Corporate Billing & Logistics Compliance Desk',
  'Gujarat',
  '24',
  '24AABCC0000A1Z5',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

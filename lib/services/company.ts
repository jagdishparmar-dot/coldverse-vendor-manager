import { prisma } from "@/lib/db";
import { companyProfileToApi } from "@/lib/mappers";
import { ServiceError } from "@/lib/services/utils";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_TRADE_NAME,
} from "@/src/constants/brand";
import {
  getStateCodeFromGstin,
  getStateCodeFromName,
  isValidGstin,
  normalizeGstin,
} from "@/src/utils/gst";

const COMPANY_ID = "default";

export async function getCompanyProfile() {
  let profile = await prisma.companyProfile.findUnique({ where: { id: COMPANY_ID } });

  if (!profile) {
    profile = await prisma.companyProfile.create({
      data: {
        id: COMPANY_ID,
        legalName: COMPANY_LEGAL_NAME,
        tradeName: COMPANY_TRADE_NAME,
        registeredAddress: "Corporate Billing & Logistics Compliance Desk",
        registeredState: "Gujarat",
        registeredStateCode: "24",
        registeredGstin: "24AABCC0000A1Z5",
        email: "",
      },
    });
  }

  return companyProfileToApi(profile);
}

export async function updateCompanyProfile(body: {
  legalName?: string;
  tradeName?: string;
  pan?: string;
  email?: string;
  phone?: string;
  registeredAddress?: string;
  registeredState?: string;
  registeredGstin?: string;
}) {
  const legalName = body.legalName?.trim();
  const registeredAddress = body.registeredAddress?.trim();
  const registeredState = body.registeredState?.trim();
  const registeredGstin = body.registeredGstin
    ? normalizeGstin(body.registeredGstin)
    : undefined;

  if (!legalName || !registeredAddress || !registeredState || !registeredGstin) {
    throw new ServiceError(
      400,
      "Legal name, registered address, state, and GSTIN are required."
    );
  }

  if (!isValidGstin(registeredGstin)) {
    throw new ServiceError(400, "Registered GSTIN is invalid. Enter a valid 15-character GSTIN.");
  }

  const gstinStateCode = getStateCodeFromGstin(registeredGstin);
  const stateCode =
    getStateCodeFromName(registeredState) || gstinStateCode || "";

  if (gstinStateCode && stateCode && gstinStateCode !== stateCode) {
    throw new ServiceError(
      400,
      `GSTIN state code (${gstinStateCode}) does not match selected state (${registeredState} / ${stateCode}).`
    );
  }

  const pan = body.pan?.trim().toUpperCase() || registeredGstin.slice(2, 12);

  const profile = await prisma.companyProfile.upsert({
    where: { id: COMPANY_ID },
    create: {
      id: COMPANY_ID,
      legalName,
      tradeName: body.tradeName?.trim() || "",
      pan,
      email: body.email?.trim() || "",
      phone: body.phone?.trim() || "",
      registeredAddress,
      registeredState,
      registeredStateCode: stateCode,
      registeredGstin,
    },
    update: {
      legalName,
      tradeName: body.tradeName?.trim() || "",
      pan,
      email: body.email?.trim() || "",
      phone: body.phone?.trim() || "",
      registeredAddress,
      registeredState,
      registeredStateCode: stateCode,
      registeredGstin,
    },
  });

  return {
    message: "Company billing profile updated successfully.",
    company: companyProfileToApi(profile),
  };
}

import { prisma } from "@/lib/db";
import { vendorToApi } from "@/lib/mappers";
import type { KYCDetails } from "@/src/types";
import {
  buildKycKey,
  decodeBase64File,
  getKycObject,
  uploadKycFile,
} from "@/lib/storage/s3";
import { notifyVendorKycVerified } from "@/lib/services/notifications";
import { ServiceError } from "@/lib/services/utils";
import type { Prisma } from "@/src/generated/prisma/client";

type KycDocType = "kyc" | "pan" | "gst" | "msme" | "other";

async function requirePortalSession(token: string) {
  const session = await prisma.portalSession.findUnique({ where: { token } });
  if (!session || Date.now() > session.expiresAt.getTime()) {
    if (session) {
      await prisma.portalSession.delete({ where: { token } });
    }
    throw new ServiceError(401, "OTP Verification Required", { otpRequired: true });
  }
  return session;
}

async function saveOptionalDoc(
  vendorId: string,
  docType: Exclude<KycDocType, "kyc">,
  fileName?: string,
  fileType?: string,
  fileData?: string
): Promise<{ name?: string; type?: string; path?: string }> {
  if (!fileData) {
    return {};
  }

  const key = buildKycKey(vendorId, docType, fileName);
  const buffer = decodeBase64File(fileData);
  try {
    await uploadKycFile(key, buffer, fileType || "application/pdf");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to store KYC document.";
    throw new ServiceError(503, message);
  }

  return {
    name: fileName || `${docType}_document.pdf`,
    type: fileType || "application/pdf",
    path: key,
  };
}

export async function submitKyc(body: {
  token?: string;
  panNumber?: string;
  companyType?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  beneficiaryName?: string;
  address?: string;
  gstNumber?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  panDocName?: string;
  panDocType?: string;
  panDocData?: string;
  gstDocName?: string;
  gstDocType?: string;
  gstDocData?: string;
  msmeDocName?: string;
  msmeDocType?: string;
  msmeDocData?: string;
  otherDocName?: string;
  otherDocType?: string;
  otherDocData?: string;
}) {
  const {
    token,
    panNumber,
    companyType,
    bankName,
    accountNumber,
    ifscCode,
    beneficiaryName,
    address,
    gstNumber,
    fileName,
    fileType,
    fileData,
    panDocName,
    panDocType,
    panDocData,
    gstDocName,
    gstDocType,
    gstDocData,
    msmeDocName,
    msmeDocType,
    msmeDocData,
    otherDocName,
    otherDocType,
    otherDocData,
  } = body;

  if (!token) {
    throw new ServiceError(400, "Token is required.");
  }

  if (
    !panNumber ||
    !companyType ||
    !bankName ||
    !accountNumber ||
    !ifscCode ||
    !beneficiaryName ||
    !address
  ) {
    throw new ServiceError(400, "Missing required KYC fields.");
  }

  if (!fileData && !fileName) {
    throw new ServiceError(400, "Please upload a scanned copy of your KYC document.");
  }

  await requirePortalSession(token);

  const vendor = await prisma.vendor.findFirst({
    where: { token, archived: false },
  });
  if (!vendor) {
    throw new ServiceError(404, "Vendor not found.");
  }

  let kycDocPath = "";
  let kycDocName = fileName || "kyc_document.pdf";
  let kycDocType = fileType || "application/pdf";

  if (fileData) {
    kycDocPath = buildKycKey(vendor.id, "kyc", fileName);
    const buffer = decodeBase64File(fileData);
    try {
      await uploadKycFile(kycDocPath, buffer, kycDocType);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to store KYC document.";
      throw new ServiceError(503, message);
    }
  }

  const panDoc = await saveOptionalDoc(vendor.id, "pan", panDocName, panDocType, panDocData);
  const gstDoc = await saveOptionalDoc(vendor.id, "gst", gstDocName, gstDocType, gstDocData);
  const msmeDoc = await saveOptionalDoc(vendor.id, "msme", msmeDocName, msmeDocType, msmeDocData);
  const otherDoc = await saveOptionalDoc(
    vendor.id,
    "other",
    otherDocName,
    otherDocType,
    otherDocData
  );

  const kycDetails: KYCDetails = {
    panNumber: String(panNumber).trim().toUpperCase(),
    companyType: String(companyType).trim(),
    bankName: String(bankName).trim(),
    accountNumber: String(accountNumber).trim(),
    ifscCode: String(ifscCode).trim().toUpperCase(),
    beneficiaryName: String(beneficiaryName).trim(),
    address: String(address).trim(),
    kycDocName,
    kycDocType,
    kycDocPath: kycDocPath || undefined,
    panDocName: panDoc.name,
    panDocType: panDoc.type,
    panDocPath: panDoc.path,
    gstDocName: gstDoc.name,
    gstDocType: gstDoc.type,
    gstDocPath: gstDoc.path,
    msmeDocName: msmeDoc.name,
    msmeDocType: msmeDoc.type,
    msmeDocPath: msmeDoc.path,
    otherDocName: otherDoc.name,
    otherDocType: otherDoc.type,
    otherDocPath: otherDoc.path,
    submittedAt: new Date().toISOString(),
    remarks: "",
  };

  const updated = await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      gstNumber: gstNumber || vendor.gstNumber || "",
      kycStatus: "pending_verification",
      kycDetails: kycDetails as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    success: true,
    message: "KYC details submitted successfully!",
    vendor: vendorToApi(updated),
  };
}

export async function verifyKyc(
  vendorId: string,
  status?: string,
  remarks?: string
) {
  if (!status || !["verified", "rejected"].includes(status)) {
    throw new ServiceError(
      400,
      "Invalid status value. Must be 'verified' or 'rejected'."
    );
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new ServiceError(404, "Vendor not found.");
  }

  const existingDetails = (vendor.kycDetails &&
  typeof vendor.kycDetails === "object" &&
  !Array.isArray(vendor.kycDetails)
    ? (vendor.kycDetails as unknown as KYCDetails)
    : {}) as KYCDetails;

  const nextDetails: KYCDetails = {
    ...existingDetails,
    remarks: remarks || "",
    ...(status === "verified" ? { verifiedAt: new Date().toISOString() } : {}),
  };

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      kycStatus: status,
      kycDetails: nextDetails as unknown as Prisma.InputJsonValue,
    },
  });

  if (status === "verified") {
    void notifyVendorKycVerified({
      name: updated.name,
      email: updated.email,
    });
  }

  return {
    success: true,
    message: `KYC has been ${status === "verified" ? "verified" : "rejected"} successfully.`,
    vendor: vendorToApi(updated),
  };
}

export async function getKycDocument(
  vendorId: string,
  docType?: string,
  portalToken?: string | null
) {
  if (portalToken) {
    await requirePortalSession(portalToken);
    const sessionVendor = await prisma.vendor.findFirst({
      where: { token: portalToken, archived: false },
    });
    if (!sessionVendor || sessionVendor.id !== vendorId) {
      throw new ServiceError(403, "Not authorized to view this KYC document.");
    }
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || !vendor.kycDetails || typeof vendor.kycDetails !== "object") {
    throw new ServiceError(404, "KYC details not found.");
  }

  const details = vendor.kycDetails as unknown as KYCDetails;

  let docPath = "";
  let docName = "";
  let docMimeType = "";

  if (docType === "pan") {
    docPath = details.panDocPath || "";
    docName = details.panDocName || "pan_card.pdf";
    docMimeType = details.panDocType || "application/pdf";
  } else if (docType === "gst") {
    docPath = details.gstDocPath || "";
    docName = details.gstDocName || "gst_certificate.pdf";
    docMimeType = details.gstDocType || "application/pdf";
  } else if (docType === "msme") {
    docPath = details.msmeDocPath || "";
    docName = details.msmeDocName || "msme_registration.pdf";
    docMimeType = details.msmeDocType || "application/pdf";
  } else if (docType === "other") {
    docPath = details.otherDocPath || "";
    docName = details.otherDocName || "other_document.pdf";
    docMimeType = details.otherDocType || "application/pdf";
  } else {
    docPath = details.kycDocPath || "";
    docName = details.kycDocName || "kyc_document.pdf";
    docMimeType = details.kycDocType || "application/pdf";
  }

  if (!docPath) {
    throw new ServiceError(
      404,
      `Requested document (${docType || "kyc"}) was not uploaded.`
    );
  }

  try {
    const { body, contentType } = await getKycObject(docPath);
    return {
      body,
      contentType: docMimeType || contentType,
      fileName: docName,
    };
  } catch {
    throw new ServiceError(404, "Document file not found in storage.");
  }
}

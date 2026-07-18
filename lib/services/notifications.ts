import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/resend";
import {
  companyInvoiceUploadedEmail,
  vendorInvoiceStatusChangedEmail,
  vendorKycVerifiedEmail,
  vendorRegisteredEmail,
} from "@/lib/email/templates";
import { portalShareUrl } from "@/src/constants/portalRoutes";
import { formatCurrency } from "@/src/features/admin/utils";

export type NotificationSettingsDto = {
  id: string;
  notifyCompanyOnInvoiceUpload: boolean;
  notifyVendorOnRegistration: boolean;
  notifyVendorOnKycVerified: boolean;
  notifyVendorOnInvoiceStatusChange: boolean;
  updatedAt: string;
};

function toDto(row: {
  id: string;
  notifyCompanyOnInvoiceUpload: boolean;
  notifyVendorOnRegistration: boolean;
  notifyVendorOnKycVerified: boolean;
  notifyVendorOnInvoiceStatusChange: boolean;
  updatedAt: Date;
}): NotificationSettingsDto {
  return {
    id: row.id,
    notifyCompanyOnInvoiceUpload: row.notifyCompanyOnInvoiceUpload,
    notifyVendorOnRegistration: row.notifyVendorOnRegistration,
    notifyVendorOnKycVerified: row.notifyVendorOnKycVerified,
    notifyVendorOnInvoiceStatusChange: row.notifyVendorOnInvoiceStatusChange,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getNotificationSettings(): Promise<NotificationSettingsDto> {
  const existing = await prisma.notificationSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return toDto(existing);

  const created = await prisma.notificationSettings.create({
    data: { id: "default" },
  });
  return toDto(created);
}

export async function updateNotificationSettings(body: {
  notifyCompanyOnInvoiceUpload?: boolean;
  notifyVendorOnRegistration?: boolean;
  notifyVendorOnKycVerified?: boolean;
  notifyVendorOnInvoiceStatusChange?: boolean;
}): Promise<NotificationSettingsDto> {
  await getNotificationSettings();

  const updated = await prisma.notificationSettings.update({
    where: { id: "default" },
    data: {
      ...(typeof body.notifyCompanyOnInvoiceUpload === "boolean"
        ? { notifyCompanyOnInvoiceUpload: body.notifyCompanyOnInvoiceUpload }
        : {}),
      ...(typeof body.notifyVendorOnRegistration === "boolean"
        ? { notifyVendorOnRegistration: body.notifyVendorOnRegistration }
        : {}),
      ...(typeof body.notifyVendorOnKycVerified === "boolean"
        ? { notifyVendorOnKycVerified: body.notifyVendorOnKycVerified }
        : {}),
      ...(typeof body.notifyVendorOnInvoiceStatusChange === "boolean"
        ? {
            notifyVendorOnInvoiceStatusChange:
              body.notifyVendorOnInvoiceStatusChange,
          }
        : {}),
    },
  });

  return toDto(updated);
}

function appOrigin(): string {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function logNotifyError(event: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[notifications] ${event} failed:`, message);
}

export async function notifyCompanyInvoiceUploaded(input: {
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  category: string;
  invoiceDate: string;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.notifyCompanyOnInvoiceUpload) return;

    const company = await prisma.companyProfile.findUnique({
      where: { id: "default" },
    });
    const to = company?.email?.trim();
    if (!to) return;

    const { subject, html } = companyInvoiceUploadedEmail({
      vendorName: input.vendorName,
      invoiceNumber: input.invoiceNumber,
      amountLabel: formatCurrency(input.amount),
      category: input.category,
      invoiceDate: input.invoiceDate,
    });
    await sendMail({ to, subject, html });
  } catch (error) {
    logNotifyError("companyInvoiceUploaded", error);
  }
}

export async function notifyVendorRegistered(input: {
  name: string;
  email: string;
  token: string;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.notifyVendorOnRegistration) return;

    const to = input.email?.trim();
    if (!to) return;

    const portalUrl = portalShareUrl(appOrigin(), input.token);
    const { subject, html } = vendorRegisteredEmail({
      vendorName: input.name,
      portalUrl,
    });
    await sendMail({ to, subject, html });
  } catch (error) {
    logNotifyError("vendorRegistered", error);
  }
}

export async function notifyVendorKycVerified(input: {
  name: string;
  email: string;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.notifyVendorOnKycVerified) return;

    const to = input.email?.trim();
    if (!to) return;

    const { subject, html } = vendorKycVerifiedEmail({
      vendorName: input.name,
    });
    await sendMail({ to, subject, html });
  } catch (error) {
    logNotifyError("vendorKycVerified", error);
  }
}

export async function notifyVendorInvoiceStatusChanged(input: {
  vendorName: string;
  vendorEmail: string;
  invoiceNumber: string;
  status: string;
  remarks?: string;
  amount: number;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.notifyVendorOnInvoiceStatusChange) return;

    const to = input.vendorEmail?.trim();
    if (!to) return;

    const { subject, html } = vendorInvoiceStatusChangedEmail({
      vendorName: input.vendorName,
      invoiceNumber: input.invoiceNumber,
      status: input.status,
      remarks: input.remarks,
      amountLabel: formatCurrency(input.amount),
    });
    await sendMail({ to, subject, html });
  } catch (error) {
    logNotifyError("vendorInvoiceStatusChanged", error);
  }
}

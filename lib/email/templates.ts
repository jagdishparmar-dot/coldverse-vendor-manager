import { COMPANY_LEGAL_NAME, COMPANY_SHORT_NAME } from "@/src/constants/brand";

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#0f172a;padding:18px 24px;">
              <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;font-weight:700;">${COMPANY_SHORT_NAME}</div>
              <div style="font-size:16px;font-weight:800;color:#ffffff;margin-top:4px;">${COMPANY_LEGAL_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 12px;font-size:18px;line-height:1.35;color:#0f172a;">${title}</h1>
              ${bodyHtml}
              <p style="margin:24px 0 0;font-size:12px;color:#64748b;line-height:1.5;">
                This is an automated message from the ${COMPANY_SHORT_NAME} vendor billing portal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:12px;color:#64748b;width:38%;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#0f172a;font-weight:600;">${value}</td>
  </tr>`;
}

export function companyInvoiceUploadedEmail(input: {
  vendorName: string;
  invoiceNumber: string;
  amountLabel: string;
  category: string;
  invoiceDate: string;
}): { subject: string; html: string } {
  const subject = `New invoice uploaded: ${input.invoiceNumber}`;
  const html = layout(
    "New vendor invoice received",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
      A vendor submitted an invoice through the secure billing portal.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:4px 0;">
      ${row("Vendor", input.vendorName)}
      ${row("Invoice No", input.invoiceNumber)}
      ${row("Category", input.category)}
      ${row("Invoice date", input.invoiceDate)}
      ${row("Amount", input.amountLabel)}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#334155;">Review it in the admin Invoice logs console.</p>`
  );
  return { subject, html };
}

export function vendorRegisteredEmail(input: {
  vendorName: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const subject = `Welcome to ${COMPANY_SHORT_NAME} vendor billing portal`;
  const html = layout(
    "Your vendor account is ready",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
      Hello ${input.vendorName}, your vendor profile has been registered with ${COMPANY_LEGAL_NAME}.
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
      Use your secure portal link to complete KYC (if required) and upload monthly invoices:
    </p>
    <p style="margin:0 0 8px;">
      <a href="${input.portalUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 16px;border-radius:10px;">
        Open vendor portal
      </a>
    </p>
    <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${input.portalUrl}</p>`
  );
  return { subject, html };
}

export function vendorKycVerifiedEmail(input: {
  vendorName: string;
}): { subject: string; html: string } {
  const subject = "KYC verified — you can upload invoices";
  const html = layout(
    "KYC verification complete",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
      Hello ${input.vendorName}, your KYC details have been verified by ${COMPANY_SHORT_NAME} accounts.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#334155;">
      You can now submit invoices through your secure vendor portal link.
    </p>`
  );
  return { subject, html };
}

export function vendorPortalOtpEmail(input: {
  vendorName: string;
  otp: string;
  validMinutes: number;
}): { subject: string; html: string } {
  const subject = "Your vendor portal sign-in code";
  const html = layout(
    "Sign-in verification code",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
      Hello ${input.vendorName}, use this one-time code to sign in to the ${COMPANY_SHORT_NAME} vendor billing portal:
    </p>
    <p style="margin:0 0 16px;font-size:28px;font-weight:800;letter-spacing:0.28em;color:#0f172a;font-family:Consolas,Monaco,monospace;">
      ${input.otp}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
      This code expires in ${input.validMinutes} minutes. If you did not request it, you can ignore this email.
    </p>`
  );
  return { subject, html };
}

export function vendorInvoiceStatusChangedEmail(input: {
  vendorName: string;
  invoiceNumber: string;
  status: string;
  remarks?: string;
  amountLabel: string;
}): { subject: string; html: string } {
  const subject = `Invoice ${input.invoiceNumber} marked ${input.status}`;
  const remarksBlock = input.remarks?.trim()
    ? row("Remarks", input.remarks.trim())
    : "";
  const html = layout(
    "Invoice status updated",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
      Hello ${input.vendorName}, the status of your submitted invoice has been updated.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:4px 0;">
      ${row("Invoice No", input.invoiceNumber)}
      ${row("Amount", input.amountLabel)}
      ${row("New status", input.status)}
      ${remarksBlock}
    </table>`
  );
  return { subject, html };
}

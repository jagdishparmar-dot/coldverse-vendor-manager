import { Resend } from "resend";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Shree Maruti Billing <onboarding@resend.dev>"
  );
}

export async function sendMail({ to, subject, html }: SendMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = to.trim();

  if (!recipient) {
    console.warn("[email] Skipping send — empty recipient.");
    return;
  }

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipped "${subject}" → ${recipient}`
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: recipient,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || "Resend email send failed.");
  }
}

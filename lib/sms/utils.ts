/** Normalize to digits with country code (default India 91). */
export function normalizeIndiaMobile(phone: string, defaultCountry = "91"): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.startsWith("0") && digits.length === 11) {
    return `${defaultCountry}${digits.slice(1)}`;
  }
  return digits;
}

export function renderOtpText(otp: string, template: string): string {
  if (!template.includes("{otp}")) {
    throw new Error(
      "SMS text template must include `{otp}` placeholder and match your DLT-approved wording."
    );
  }
  return template.replaceAll("{otp}", otp);
}

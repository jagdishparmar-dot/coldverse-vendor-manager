import { randomBytes } from "crypto";

/** Cryptographically strong portal share token (not name-derived). */
export function generateToken(_name?: string): string {
  return randomBytes(24).toString("base64url");
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function maskPhone(phone: string): string {
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  const prefix = clean.slice(0, -4).replace(/[a-zA-Z0-9]/g, "*");
  return prefix + last4;
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***@***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const localMasked = local.length <= 2 ? `${local[0] ?? "*"}*` : `${local.slice(0, 2)}***`;
  return `${localMasked}@${domain}`;
}

export class ServiceError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

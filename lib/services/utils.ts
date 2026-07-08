export function generateToken(name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 15);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${cleanName}-${rand}`;
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

export class ServiceError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

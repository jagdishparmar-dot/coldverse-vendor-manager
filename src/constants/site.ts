import {
  COMPANY_LEGAL_NAME,
  COMPANY_SHORT_NAME,
} from "@/src/constants/brand";

/** Browser tab / SEO product name */
export const APP_NAME = `${COMPANY_SHORT_NAME} Billing`;

export const APP_NAME_LONG = `${COMPANY_LEGAL_NAME} — Vendor Billing`;

export const APP_DESCRIPTION =
  "Vendor billing, KYC, and invoice management console for Shree Maruti Integrated Logistics Limited.";

export const APP_TITLE_TEMPLATE = `%s · ${APP_NAME}`;

/** Absolute site origin for Open Graph / icons (build-time). */
export function getSiteOrigin(): string {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

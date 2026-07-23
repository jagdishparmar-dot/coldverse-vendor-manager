import en from "@/messages/portal/en.json";
import hi from "@/messages/portal/hi.json";
import gu from "@/messages/portal/gu.json";
import bn from "@/messages/portal/bn.json";
import mr from "@/messages/portal/mr.json";
import te from "@/messages/portal/te.json";
import ta from "@/messages/portal/ta.json";
import kn from "@/messages/portal/kn.json";
import ml from "@/messages/portal/ml.json";
import pa from "@/messages/portal/pa.json";
import or from "@/messages/portal/or.json";
import asMessages from "@/messages/portal/as.json";

export const PORTAL_LOCALE_STORAGE_KEY = "portal-locale";

export const PORTAL_LOCALES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "as", label: "Assamese", nativeLabel: "অসমীয়া" },
  { code: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
] as const;

export type PortalLocale = (typeof PORTAL_LOCALES)[number]["code"];

export const DEFAULT_PORTAL_LOCALE: PortalLocale = "en";

const portalMessages = {
  en,
  hi,
  pa,
  gu,
  bn,
  as: asMessages,
  or,
  mr,
  te,
  ta,
  kn,
  ml,
} as const satisfies Record<PortalLocale, typeof en>;

export type PortalMessages = (typeof portalMessages)[PortalLocale];

export function isPortalLocale(value: string): value is PortalLocale {
  return value in portalMessages;
}

export function getPortalMessages(locale: PortalLocale): PortalMessages {
  return portalMessages[locale] ?? portalMessages[DEFAULT_PORTAL_LOCALE];
}

export function resolvePortalLocale(value: string | null | undefined): PortalLocale {
  if (value && isPortalLocale(value)) return value;
  return DEFAULT_PORTAL_LOCALE;
}

/** Prefer a saved portal locale; otherwise map common browser languages. */
export function detectPortalLocale(): PortalLocale {
  if (typeof window === "undefined") return DEFAULT_PORTAL_LOCALE;

  try {
    const stored = window.localStorage.getItem(PORTAL_LOCALE_STORAGE_KEY);
    if (stored && isPortalLocale(stored)) return stored;
  } catch {
    // Ignore storage access errors (private mode, etc.)
  }

  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);

  for (const tag of candidates) {
    const base = tag.toLowerCase().split("-")[0];
    if (isPortalLocale(base)) return base;
  }

  return DEFAULT_PORTAL_LOCALE;
}

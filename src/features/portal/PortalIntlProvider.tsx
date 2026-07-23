"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  DEFAULT_PORTAL_LOCALE,
  detectPortalLocale,
  getPortalMessages,
  PORTAL_LOCALE_STORAGE_KEY,
  resolvePortalLocale,
  type PortalLocale,
} from "@/src/i18n/portal";

type PortalLocaleContextValue = {
  locale: PortalLocale;
  setLocale: (locale: PortalLocale) => void;
};

const PortalLocaleContext = createContext<PortalLocaleContextValue | null>(null);

export function usePortalLocale() {
  const ctx = useContext(PortalLocaleContext);
  if (!ctx) {
    throw new Error("usePortalLocale must be used within PortalIntlProvider");
  }
  return ctx;
}

export function PortalIntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<PortalLocale>(DEFAULT_PORTAL_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const detected = detectPortalLocale();
    setLocaleState(detected);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
  }, [locale, ready]);

  const setLocale = useCallback((next: PortalLocale) => {
    const resolved = resolvePortalLocale(next);
    setLocaleState(resolved);
    try {
      window.localStorage.setItem(PORTAL_LOCALE_STORAGE_KEY, resolved);
    } catch {
      // Ignore storage write failures
    }
  }, []);

  const messages = useMemo(() => getPortalMessages(locale), [locale]);

  const localeContext = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale]
  );

  // Avoid flashing the wrong language before localStorage is read.
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50/50" aria-busy="true" aria-live="polite" />
    );
  }

  return (
    <PortalLocaleContext.Provider value={localeContext}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
        {children}
      </NextIntlClientProvider>
    </PortalLocaleContext.Provider>
  );
}

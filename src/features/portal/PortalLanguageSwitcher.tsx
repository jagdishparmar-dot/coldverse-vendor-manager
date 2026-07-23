"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { ColdverseSelect } from "@/src/components/coldverse-select";
import { PORTAL_LOCALES, type PortalLocale } from "@/src/i18n/portal";
import { usePortalLocale } from "@/src/features/portal/PortalIntlProvider";
import { cn } from "@/lib/utils";

type PortalLanguageSwitcherProps = {
  className?: string;
  /** Compact control for nav bars; larger for auth screens */
  size?: "nav" | "auth";
};

const localeOptions = PORTAL_LOCALES.map((locale) => ({
  value: locale.code,
  label: `${locale.nativeLabel} (${locale.label})`,
}));

export default function PortalLanguageSwitcher({
  className,
  size = "nav",
}: PortalLanguageSwitcherProps) {
  const t = useTranslations("common");
  const { locale, setLocale } = usePortalLocale();

  const selected = PORTAL_LOCALES.find((item) => item.code === locale);

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        size === "auth" && "w-full justify-center",
        className
      )}
    >
      <Languages
        className={cn(
          "shrink-0 text-slate-400",
          size === "auth" ? "w-4 h-4" : "w-3.5 h-3.5"
        )}
        aria-hidden
      />
      <span className="sr-only">{t("language")}</span>
      <ColdverseSelect
        value={locale}
        onValueChange={(value) => setLocale(value as PortalLocale)}
        options={localeOptions}
        selectedLabel={selected?.nativeLabel}
        placeholder={t("language")}
        variant={size === "auth" ? "compact" : "inline"}
        className={cn(size === "auth" ? "min-w-44" : "min-w-30")}
      />
    </div>
  );
}

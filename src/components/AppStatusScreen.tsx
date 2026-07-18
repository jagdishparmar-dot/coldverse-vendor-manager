"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  FileQuestion,
  Home,
  RefreshCw,
} from "lucide-react";
import { SmileLogo } from "@/src/components/Logo";
import { COMPANY_LEGAL_NAME } from "@/src/constants/brand";

type StatusVariant = "not-found" | "error";

type AppStatusScreenProps = {
  variant: StatusVariant;
  title?: string;
  description?: string;
  errorDigest?: string;
  onRetry?: () => void;
};

const COPY: Record<
  StatusVariant,
  { code: string; title: string; description: string }
> = {
  "not-found": {
    code: "404",
    title: "Page not found",
    description:
      "This page does not exist or may have moved. Check the URL, or head back to a working part of the console.",
  },
  error: {
    code: "500",
    title: "Something went wrong",
    description:
      "We hit an unexpected error while loading this page. You can try again, or return to the dashboard.",
  },
};

export function AppStatusScreen({
  variant,
  title,
  description,
  errorDigest,
  onRetry,
}: AppStatusScreenProps) {
  const copy = COPY[variant];
  const Icon = variant === "not-found" ? FileQuestion : AlertTriangle;
  const accent =
    variant === "not-found"
      ? {
          badge: "bg-orange-50 text-orange-700 ring-orange-100",
          iconWrap: "bg-orange-50 text-orange-600 ring-orange-100",
          glow: "from-orange-200/40 via-transparent to-brand-100/50",
          primary: "bg-orange-600 hover:bg-orange-700",
        }
      : {
          badge: "bg-rose-50 text-rose-700 ring-rose-100",
          iconWrap: "bg-rose-50 text-rose-600 ring-rose-100",
          glow: "from-rose-200/35 via-transparent to-brand-100/45",
          primary: "bg-orange-600 hover:bg-orange-700",
        };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f7f8fb] px-4 py-12">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] ${accent.glow}`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      <div className="status-screen-rise relative z-10 w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <SmileLogo />
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_-28px_rgba(15,39,90,0.35)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div
              className={`status-screen-soft mb-5 flex size-14 items-center justify-center rounded-2xl ring-1 ${accent.iconWrap}`}
            >
              <Icon className="size-7" strokeWidth={1.75} />
            </div>

            <span
              className={`mb-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.14em] uppercase ring-1 ${accent.badge}`}
            >
              {copy.code}
            </span>

            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
              {title ?? copy.title}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              {description ?? copy.description}
            </p>

            {errorDigest ? (
              <p className="mt-3 font-mono text-[11px] text-slate-400">
                Ref: {errorDigest}
              </p>
            ) : null}

            <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold tracking-wide text-white transition-colors ${accent.primary}`}
                >
                  <RefreshCw className="size-4" />
                  Try again
                </button>
              ) : null}

              <Link
                href="/dashboard"
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold tracking-wide transition-colors ${
                  onRetry
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : `${accent.primary} text-white`
                }`}
              >
                <Home className="size-4" />
                Go to dashboard
              </Link>
            </div>

            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          {COMPANY_LEGAL_NAME}
        </p>
      </div>
    </div>
  );
}

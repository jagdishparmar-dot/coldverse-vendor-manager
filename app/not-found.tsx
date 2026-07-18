import type { Metadata } from "next";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_LOGO_PATH,
  COMPANY_SHORT_NAME,
} from "@/src/constants/brand";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Keep this file free of client-component imports.
 * Next.js 16.2 + Turbopack can break the route graph when not-found
 * pulls in a heavy client module tree (valid routes then 404).
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f7f8fb] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(253,186,116,0.35),transparent_55%,rgba(224,234,255,0.45))]"
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={COMPANY_LOGO_PATH}
              alt={COMPANY_LEGAL_NAME}
              className="h-10 w-auto object-contain md:h-12"
            />
            <div className="hidden min-w-0 leading-tight sm:block">
              <p className="truncate font-display text-sm font-bold tracking-tight text-slate-900 md:text-base">
                {COMPANY_SHORT_NAME}
              </p>
              <p className="truncate text-[10px] font-medium text-slate-500 md:text-[11px]">
                Integrated Logistics Limited
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_-28px_rgba(15,39,90,0.35)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-bold text-orange-600 ring-1 ring-orange-100">
              ?
            </div>

            <span className="mb-3 inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 ring-1 ring-orange-100">
              404
            </span>

            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
              Page not found
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              This page does not exist or may have moved. Check the URL, or head
              back to a working part of the console.
            </p>

            <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              <a
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-extrabold tracking-wide text-white transition-colors hover:bg-orange-700"
              >
                Go to dashboard
              </a>
            </div>

            <a
              href="/login"
              className="mt-4 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              Back to sign in
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          {COMPANY_LEGAL_NAME}
        </p>
      </div>
    </div>
  );
}

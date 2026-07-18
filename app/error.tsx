"use client";

import { useEffect } from "react";

/**
 * Keep imports minimal — root error boundaries that pull large client trees
 * have caused Turbopack route-discovery issues in Next.js 16.2.x.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f7f8fb] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(254,205,211,0.4),transparent_55%,rgba(224,234,255,0.4))]"
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_-28px_rgba(15,39,90,0.35)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl font-bold text-rose-600 ring-1 ring-rose-100">
              !
            </div>

            <span className="mb-3 inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700 ring-1 ring-rose-100">
              500
            </span>

            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
              Something went wrong
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              We hit an unexpected error while loading this page. You can try
              again, or return to the dashboard.
            </p>

            {error.digest ? (
              <p className="mt-3 font-mono text-[11px] text-slate-400">
                Ref: {error.digest}
              </p>
            ) : null}

            <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-extrabold tracking-wide text-white transition-colors hover:bg-orange-700"
              >
                Try again
              </button>
              <a
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold tracking-wide text-slate-700 transition-colors hover:bg-slate-50"
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
      </div>
    </div>
  );
}

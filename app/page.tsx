"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import App from "@/src/App";

function PortalBootFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      <p className="text-sm font-medium text-slate-500 mt-4">
        Loading secure vendor portal...
      </p>
    </div>
  );
}

function HomePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  return <App initialVendorToken={token} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PortalBootFallback />}>
      <HomePage />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ADMIN_DEFAULT_PATH } from "@/src/constants/adminRoutes";
import { portalPath } from "@/src/constants/portalRoutes";

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
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      router.replace(portalPath(token));
    } else {
      router.replace(ADMIN_DEFAULT_PATH);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      <p className="text-sm font-medium text-slate-500 mt-4">
        {token ? "Redirecting to vendor portal..." : "Opening admin console..."}
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PortalBootFallback />}>
      <HomePage />
    </Suspense>
  );
}

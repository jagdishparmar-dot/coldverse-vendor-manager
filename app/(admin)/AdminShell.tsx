"use client";

import App from "@/src/App";

/**
 * Stable client shell for admin routes. Kept in a dedicated client module so the
 * parent server layout can remount route children without remounting App
 * (avoids loading-skeleton flicker on tab changes).
 */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <App />
      <div className="sr-only" aria-hidden>
        {children}
      </div>
    </>
  );
}

"use client";

import App from "@/src/App";

/**
 * Phase 1 admin shell: mount App once in the layout so soft navigations
 * between /dashboard, /vendors, etc. keep client state and avoid refetch storms.
 * Page segments exist for URL/routing; App derives the active tab from pathname.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <App />
      {/* Keep route segment mounted for Next.js App Router */}
      <div className="sr-only" aria-hidden>
        {children}
      </div>
    </>
  );
}

import type { Metadata } from "next";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: "Console",
  description: "Shree Maruti vendor billing administration console.",
};

/**
 * Server layout: route segment changes update `children` only.
 * App stays mounted inside the client AdminShell across /dashboard, /vendors, etc.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}

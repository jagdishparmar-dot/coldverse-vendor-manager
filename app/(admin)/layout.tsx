import AdminShell from "./AdminShell";

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

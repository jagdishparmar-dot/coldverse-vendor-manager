"use client";

import DashboardStats from "@/src/components/DashboardStats";

type DashboardViewProps = React.ComponentProps<typeof DashboardStats>;

export default function DashboardView(props: DashboardViewProps) {
  return <DashboardStats {...props} />;
}

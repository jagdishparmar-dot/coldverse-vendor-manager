"use client";

import AdminKycTab from "@/src/components/AdminKycTab";

type KycViewProps = {
  refreshKey: number | string;
  onRefresh: () => void;
};

export default function KycView({ refreshKey, onRefresh }: KycViewProps) {
  return <AdminKycTab refreshKey={refreshKey} onRefresh={onRefresh} />;
}

"use client";

import AdminKycTab from "@/src/components/AdminKycTab";
import type { Vendor } from "@/src/types";

type KycViewProps = {
  vendors: Vendor[];
  onRefresh: () => void;
};

export default function KycView({ vendors, onRefresh }: KycViewProps) {
  return <AdminKycTab vendors={vendors} onRefresh={onRefresh} />;
}

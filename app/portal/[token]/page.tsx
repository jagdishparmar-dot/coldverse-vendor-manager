"use client";

import { use } from "react";
import VendorPortal from "@/src/features/portal/VendorPortal";

export default function PortalTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const decoded = decodeURIComponent(token);
  return <VendorPortal token={decoded} />;
}

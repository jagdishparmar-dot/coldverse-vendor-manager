"use client";

import HubsManagement from "@/src/components/HubsManagement";
import type { Vendor } from "@/src/types";

type HubsViewProps = {
  /** Optional — only used for hub vendor-count column. */
  vendors?: Vendor[];
  onHubsUpdated: () => void;
};

export default function HubsView({ vendors = [], onHubsUpdated }: HubsViewProps) {
  return <HubsManagement vendors={vendors} onHubsUpdated={onHubsUpdated} />;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendor Portal",
  description:
    "Secure vendor portal for KYC submission and invoice uploads.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

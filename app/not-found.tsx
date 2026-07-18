import type { Metadata } from "next";
import { AppStatusScreen } from "@/src/components/AppStatusScreen";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return <AppStatusScreen variant="not-found" />;
}

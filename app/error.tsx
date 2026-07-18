"use client";

import { useEffect } from "react";
import { AppStatusScreen } from "@/src/components/AppStatusScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <AppStatusScreen
      variant="error"
      errorDigest={error.digest}
      onRetry={reset}
    />
  );
}

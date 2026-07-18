"use client";

import { useEffect } from "react";
import { Geist, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { AppStatusScreen } from "@/src/components/AppStatusScreen";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        geistSans.variable,
        spaceGrotesk.variable,
        jetbrainsMono.variable
      )}
    >
      <body className="min-h-full font-sans antialiased">
        <AppStatusScreen
          variant="error"
          title="Application error"
          description="A critical error stopped the page from loading. Try again, or return to the dashboard once the issue clears."
          errorDigest={error.digest}
          onRetry={reset}
        />
      </body>
    </html>
  );
}

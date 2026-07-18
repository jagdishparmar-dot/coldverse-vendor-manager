"use client";

import { useEffect } from "react";

/**
 * Root layout failure boundary. Must define its own <html>/<body>.
 * Avoid next/font, globals.css, and shared client trees here — they can
 * destabilize Turbopack route discovery in Next.js 16.2.x.
 */
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          background: "#f7f8fb",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              boxShadow: "0 20px 50px -28px rgba(15,39,90,0.35)",
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#be123c",
              }}
            >
              Application error
            </p>
            <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700 }}>
              Something went wrong
            </h1>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
              A critical error stopped the page from loading. Try again, or
              return to the dashboard once the issue clears.
            </p>
            {error.digest ? (
              <p
                style={{
                  margin: "0 0 20px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  color: "#94a3b8",
                }}
              >
                Ref: {error.digest}
              </p>
            ) : (
              <div style={{ height: 12 }} />
            )}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  height: 44,
                  padding: "0 20px",
                  border: 0,
                  borderRadius: 12,
                  background: "#ea580c",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <a
                href="/dashboard"
                style={{
                  height: 44,
                  padding: "0 20px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#334155",
                  fontWeight: 800,
                  fontSize: 14,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Go to dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

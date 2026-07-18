import { ImageResponse } from "next/og";
import { COMPANY_LEGAL_NAME, COMPANY_SHORT_NAME } from "@/src/constants/brand";

export const alt = `${COMPANY_SHORT_NAME} Vendor Billing`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #ea580c 160%)",
          color: "#ffffff",
          padding: 64,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            SM
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.9 }}>
            {COMPANY_SHORT_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            Vendor Billing Console
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: "#cbd5e1",
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            {COMPANY_LEGAL_NAME}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

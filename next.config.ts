import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

/** Absolute path to this Next app package (next-app/), not the monorepo parent. */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folder also has lockfiles (pnpm-lock.yaml / package-lock.json).
  // Pin tracing to this package so Next does not infer the monorepo root.
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "smile-jg",
  project: process.env.SENTRY_PROJECT ?? "vendor-manager-smile",
  // EU data residency (smile-jg is on de.sentry.io)
  sentryUrl: process.env.SENTRY_URL ?? "https://de.sentry.io",

  // Auth token for source map uploads (CI / Coolify build). Keep secret.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Route browser events through Next.js to reduce ad-blocker drops
  tunnelRoute: "/sentry-tunnel",

  silent: !process.env.CI,
  widenClientFileUpload: true,
});

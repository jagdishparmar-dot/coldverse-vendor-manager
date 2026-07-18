import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

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

export default nextConfig;

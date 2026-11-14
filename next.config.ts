import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Mastra loads Node-only native modules; keep them external to the bundler.
  serverExternalPackages: ["@mastra/*", "mastra"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

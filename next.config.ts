import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Cover uploads go through a Server Action; Vercel caps function bodies at 4.5 MB
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

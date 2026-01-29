import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'eslint' is removed. Next.js 16 handles linting via the CLI, not the config.
  
  typescript: {
    // This property still exists in Next.js 16 for now
    ignoreBuildErrors: true,
  },
};

const withSerwist = withSerwistInit({
  disable: process.env.NODE_ENV !== "production",
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withSerwist(nextConfig);
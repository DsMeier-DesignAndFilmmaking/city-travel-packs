import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// Define config as a standard object first to bypass the strict type mismatch
const nextConfig = {
  // These properties are still used by the Vercel build engine
  // but may be missing from the latest NextConfig type definition
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
} as NextConfig; // Force cast to NextConfig

const withSerwist = withSerwistInit({
  disable: process.env.NODE_ENV !== "production",
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withSerwist(nextConfig);
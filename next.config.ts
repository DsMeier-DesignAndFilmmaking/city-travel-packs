import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // ADD THIS SECTION:
  async rewrites() {
    return [
      {
        // Matches /sw-seoul.js or /sw-tokyo.js
        source: "/sw-:city.js",
        destination: "/api/sw/:city",
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  disable: process.env.NODE_ENV !== "production",
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withSerwist(nextConfig);
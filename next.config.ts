import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

// Empty turbopack config lets `next dev` (Turbopack) coexist with the PWA
// plugin's webpack config; production builds use --webpack so the service
// worker is generated.
const nextConfig: NextConfig = {
  turbopack: {},
};

module.exports = withPWA(nextConfig);

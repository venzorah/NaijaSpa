import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  // The bottom-left development badge otherwise overlaps mobile Home navigation.
  devIndicators: false,
  experimental: {
    ...(process.env.NAIJASPA_BUILD_CPUS ? { cpus: Math.max(1, Number(process.env.NAIJASPA_BUILD_CPUS) || 1) } : {}),
    optimizePackageImports: ["lucide-react"]
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "naijaspa.com" }]
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache" }]
    }
  ]
};

export default nextConfig;

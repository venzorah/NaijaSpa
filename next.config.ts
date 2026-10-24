import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
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
